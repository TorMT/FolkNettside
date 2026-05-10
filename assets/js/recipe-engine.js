(function (global) {
  'use strict';

  const renderApi = global.BrewingHydrometerRender;

  function escapeHtml(value) {
    return renderApi.escapeHtml(value);
  }

  function fetchJson(url) {
    return fetch(url, { cache: 'no-store' }).then(async function (response) {
      const data = await response.json();
      if (!response.ok) {
        throw new Error((data && data.error) || ('HTTP ' + response.status));
      }
      return data;
    });
  }

  function normalizeToken(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function parseDecimal(value) {
    const normalized = String(value || '').replace(',', '.').trim();
    const number = Number(normalized);
    return Number.isFinite(number) ? number : NaN;
  }

  function normalizeUnit(value, fallback) {
    const unit = normalizeToken(value);
    if (!unit) return fallback || '';
    if (unit === 'kg' || unit === 'kilo' || unit === 'kilos' || unit === 'kilogram' || unit === 'kilograms') return 'kg';
    if (unit === 'g' || unit === 'gram' || unit === 'grams') return 'g';
    if (unit === 'hg' || unit === 'hecto' || unit === 'hektogram') return 'hg';
    if (unit === 'oz') return 'oz';
    if (unit === 'lb' || unit === 'lbs') return 'lb';
    if (unit === 'l' || unit === 'liter' || unit === 'liters') return 'l';
    if (unit === 'ml') return 'ml';
    return unit;
  }

  function convertToBaseAmount(amount, unit, kind) {
    if (!Number.isFinite(amount)) return NaN;
    const normalizedUnit = normalizeUnit(unit, kind === 'volume' ? 'l' : 'g');
    if (kind === 'volume') {
      if (normalizedUnit === 'l') return amount;
      if (normalizedUnit === 'ml') return amount / 1000;
      return NaN;
    }

    if (normalizedUnit === 'kg') return amount * 1000;
    if (normalizedUnit === 'hg') return amount * 100;
    if (normalizedUnit === 'g') return amount;
    if (normalizedUnit === 'oz') return amount * 28.3495;
    if (normalizedUnit === 'lb') return amount * 453.592;
    return NaN;
  }

  function formatBaseAmount(amount, kind) {
    if (!Number.isFinite(amount)) return 'ukjent mengde';
    if (kind === 'volume') {
      return amount >= 1 ? amount.toFixed(1) + ' L' : Math.round(amount * 1000) + ' ml';
    }
    return amount >= 1000
      ? (amount / 1000).toFixed(2).replace(/\.?0+$/, '') + ' kg'
      : Math.round(amount) + ' g';
  }

  function parseVolumeLiters(value) {
    if (Number.isFinite(value)) return value;
    const match = String(value || '').trim().match(/(\d+(?:[.,]\d+)?)/);
    if (!match) return NaN;
    const amount = parseDecimal(match[1]);
    const unitMatch = String(value || '').trim().match(/[a-zA-Z]+$/);
    return convertToBaseAmount(amount, unitMatch ? unitMatch[0] : 'l', 'volume');
  }

  function parseInventoryList(text, kind) {
    return String(text || '')
      .split(/\r?\n|;/)
      .map(function (rawLine) {
        return rawLine.trim();
      })
      .filter(Boolean)
      .map(function (line) {
        const match = line.match(/^(.*?)(?:\s+(\d+(?:[.,]\d+)?))\s*([A-Za-z]+)?\s*$/);
        const name = match ? String(match[1] || '').trim() : line;
        const amount = match ? parseDecimal(match[2]) : NaN;
        const unit = match ? normalizeUnit(match[3], kind === 'volume' ? 'l' : '') : '';
        return {
          raw: line,
          name: name,
          key: normalizeToken(name),
          amount: amount,
          unit: unit,
          baseAmount: convertToBaseAmount(amount, unit, kind)
        };
      })
      .filter(function (entry) {
        return entry.key !== '';
      });
  }

  function parseRecipeItemAmount(item, kind) {
    const amount = Number(item && item.amount);
    const unit = normalizeUnit(item && item.unit, kind === 'volume' ? 'l' : '');
    return convertToBaseAmount(amount, unit, kind);
  }

  function matchesName(needle, candidate) {
    if (!needle || !candidate) return false;
    return needle === candidate || needle.indexOf(candidate) !== -1 || candidate.indexOf(needle) !== -1;
  }

  function findBestInventoryMatch(name, inventoryItems) {
    const key = normalizeToken(name);
    if (!key) return null;

    let exact = null;
    let fuzzy = null;
    (Array.isArray(inventoryItems) ? inventoryItems : []).forEach(function (item) {
      if (!item || !item.key) return;
      if (item.key === key) {
        exact = exact || item;
        return;
      }
      if (!fuzzy && matchesName(key, item.key)) {
        fuzzy = item;
      }
    });

    return exact || fuzzy;
  }

  function buildInventoryFilters(els) {
    return {
      malts: parseInventoryList(els.recipeMaltInput && els.recipeMaltInput.value, 'solid'),
      hops: parseInventoryList(els.recipeHopInput && els.recipeHopInput.value, 'solid'),
      miscQuery: String((els.recipeIngredientInput && els.recipeIngredientInput.value) || '').trim(),
      desiredVolumeLiters: parseVolumeLiters(els.recipeVolumeInput && els.recipeVolumeInput.value)
    };
  }

  function summarizeInventoryGroup(groupName, recipeItems, inventoryItems, scaleFactor) {
    const safeRecipeItems = (Array.isArray(recipeItems) ? recipeItems : []).filter(function (item) {
      return normalizeToken(item && item.name) !== '';
    });
    const activeInventory = Array.isArray(inventoryItems) ? inventoryItems : [];

    if (!safeRecipeItems.length) {
      return {
        group: groupName,
        active: activeInventory.length > 0,
        requiredCount: 0,
        matchedCount: 0,
        sufficientCount: 0,
        ratio: activeInventory.length > 0 ? 1 : NaN,
        missing: [],
        matched: []
      };
    }

    if (!activeInventory.length) {
      return {
        group: groupName,
        active: false,
        requiredCount: safeRecipeItems.length,
        matchedCount: 0,
        sufficientCount: 0,
        ratio: NaN,
        missing: [],
        matched: []
      };
    }

    const missing = [];
    const matched = [];
    let matchedCount = 0;
    let sufficientCount = 0;

    safeRecipeItems.forEach(function (item) {
      const inventoryMatch = findBestInventoryMatch(item.name, activeInventory);
      const neededBase = parseRecipeItemAmount(item, 'solid');
      const scaledNeededBase = Number.isFinite(neededBase) && Number.isFinite(scaleFactor) ? neededBase * scaleFactor : neededBase;

      if (!inventoryMatch) {
        missing.push({
          name: item.name || 'Ingrediens',
          needed: formatBaseAmount(scaledNeededBase, 'solid'),
          group: groupName
        });
        return;
      }

      matchedCount += 1;
      const amountKnown = Number.isFinite(scaledNeededBase) && Number.isFinite(inventoryMatch.baseAmount);
      const sufficient = !amountKnown || inventoryMatch.baseAmount + 0.001 >= scaledNeededBase;

      if (sufficient) {
        sufficientCount += 1;
      } else {
        missing.push({
          name: item.name || 'Ingrediens',
          needed: formatBaseAmount(scaledNeededBase, 'solid'),
          available: formatBaseAmount(inventoryMatch.baseAmount, 'solid'),
          group: groupName
        });
      }

      matched.push({
        name: item.name || 'Ingrediens',
        available: inventoryMatch.name || inventoryMatch.raw,
        needed: formatBaseAmount(scaledNeededBase, 'solid'),
        availableAmount: Number.isFinite(inventoryMatch.baseAmount) ? formatBaseAmount(inventoryMatch.baseAmount, 'solid') : 'oppgitt uten mengde',
        sufficient: sufficient
      });
    });

    return {
      group: groupName,
      active: true,
      requiredCount: safeRecipeItems.length,
      matchedCount: matchedCount,
      sufficientCount: sufficientCount,
      ratio: safeRecipeItems.length ? (sufficientCount / safeRecipeItems.length) : 1,
      missing: missing,
      matched: matched
    };
  }

  function buildInventoryFit(recipe, filters) {
    const recipeVolumeLiters = parseVolumeLiters(recipe && recipe.batchVolume);
    const desiredVolumeLiters = filters && Number.isFinite(filters.desiredVolumeLiters) ? filters.desiredVolumeLiters : NaN;
    const scaleFactor = Number.isFinite(desiredVolumeLiters) && Number.isFinite(recipeVolumeLiters) && recipeVolumeLiters > 0
      ? desiredVolumeLiters / recipeVolumeLiters
      : 1;
    const maltFit = summarizeInventoryGroup('malt', recipe && recipe.ingredients && recipe.ingredients.malts, filters && filters.malts, scaleFactor);
    const hopFit = summarizeInventoryGroup('hop', recipe && recipe.ingredients && recipe.ingredients.hops, filters && filters.hops, scaleFactor);
    const activeGroups = [maltFit, hopFit].filter(function (group) { return group.active; });
    const requiredCount = activeGroups.reduce(function (sum, group) { return sum + group.requiredCount; }, 0);
    const sufficientCount = activeGroups.reduce(function (sum, group) { return sum + group.sufficientCount; }, 0);
    const matchedCount = activeGroups.reduce(function (sum, group) { return sum + group.matchedCount; }, 0);
    const missing = activeGroups.reduce(function (list, group) {
      return list.concat(group.missing);
    }, []);
    const ratio = requiredCount ? (sufficientCount / requiredCount) : NaN;
    const matchRatio = requiredCount ? (matchedCount / requiredCount) : NaN;
    const scalable = Number.isFinite(desiredVolumeLiters) && Number.isFinite(recipeVolumeLiters) && recipeVolumeLiters > 0;

    let label = 'Ingen lagerfilter aktivt';
    if (requiredCount) {
      if (sufficientCount === requiredCount) {
        label = scalable && Math.abs(scaleFactor - 1) > 0.08
          ? 'Passer etter skalering'
          : 'Passer med lageret ditt';
      } else if (matchedCount > 0) {
        label = 'Nesten, men mangler noe';
      } else {
        label = 'Lav lagerfit';
      }
    } else if (Number.isFinite(desiredVolumeLiters)) {
      label = Number.isFinite(recipeVolumeLiters)
        ? 'Volum klar for skalering'
        : 'Volum oppgitt, men oppskriften mangler grunnbatch';
    }

    return {
      active: activeGroups.length > 0 || !!(filters && Number.isFinite(filters.desiredVolumeLiters)),
      label: label,
      requiredCount: requiredCount,
      sufficientCount: sufficientCount,
      matchedCount: matchedCount,
      ratio: ratio,
      matchRatio: matchRatio,
      scaleFactor: scaleFactor,
      recipeVolumeLiters: recipeVolumeLiters,
      desiredVolumeLiters: desiredVolumeLiters,
      missing: missing,
      maltFit: maltFit,
      hopFit: hopFit
    };
  }

  function renderProviderPills(container, providers) {
    container.innerHTML = (Array.isArray(providers) ? providers : []).map(function (provider) {
      return '<div class="provider-pill ' + (provider.active ? '' : 'off') + '">'
        + escapeHtml(provider.label) + ' · ' + escapeHtml(provider.active ? 'aktiv' : 'ikke konfigurert')
        + '</div>';
    }).join('');
  }

  function renderRecipeListLegacy(els, state) {
    if (!Array.isArray(state.recipes) || !state.recipes.length) {
      els.recipeList.innerHTML = '<div class="empty-state">Ingen oppskrifter fant match ennå.</div>';
      return;
    }

    els.recipeList.innerHTML = state.recipes.map(function (recipe) {
      return ''
        + '<button class="list-tab ' + (recipe.id === state.selectedRecipeId ? 'active' : '') + '" type="button" data-id="' + escapeHtml(recipe.id) + '">'
        + '<strong>' + escapeHtml(recipe.name || 'Oppskrift') + '</strong>'
        + '<span>' + escapeHtml(recipe.style || 'Ukjent stil') + ' · rating ' + escapeHtml(String(recipe.rating || 0)) + '</span>'
        + '<small>Match ' + escapeHtml(String(Math.round((recipe.matchRatio || 0) * 100))) + '% · ' + escapeHtml(recipe.providerLabel || recipe.source || '') + '</small>'
        + '</button>';
    }).join('');
  }

  function renderRecipeList(els, state) {
    const recipes = Array.isArray(state.recipeResults)
      ? state.recipeResults
      : (Array.isArray(state.recipes) ? state.recipes : []);
    if (!recipes.length) {
      els.recipeList.innerHTML = '<div class="empty-state">Ingen oppskrifter fant match enna.</div>';
      return;
    }

    els.recipeList.innerHTML = recipes.map(function (recipe) {
      const inventoryFit = recipe.inventoryFit || null;
      const fitRatio = Number.isFinite(inventoryFit && inventoryFit.ratio)
        ? inventoryFit.ratio
        : (inventoryFit && Number.isFinite(inventoryFit.matchRatio) ? inventoryFit.matchRatio : Number(recipe.matchRatio || 0));
      const fitPct = Number.isFinite(fitRatio) ? String(Math.round(fitRatio * 100)) + '%' : '';
      const fitText = inventoryFit && inventoryFit.active
        ? (inventoryFit.label + (fitPct ? (' - ' + fitPct) : ''))
        : ('Match ' + String(Math.round((recipe.matchRatio || 0) * 100)) + '%');

      return ''
        + '<button class="list-tab ' + (recipe.id === state.selectedRecipeId ? 'active' : '') + '" type="button" data-id="' + escapeHtml(recipe.id) + '">'
        + '<strong>' + escapeHtml(recipe.name || 'Oppskrift') + '</strong>'
        + '<span>' + escapeHtml(recipe.style || 'Ukjent stil') + ' - rating ' + escapeHtml(String(recipe.rating || 0)) + '</span>'
        + '<small>' + escapeHtml(fitText) + ' - ' + escapeHtml(recipe.providerLabel || recipe.source || '') + '</small>'
        + '</button>';
    }).join('');
  }

  function renderTargets(targets) {
    const entries = Object.entries(targets || {}).filter(function (entry) {
      return entry[1] !== null && entry[1] !== '';
    });
    if (!entries.length) {
      return '<div class="empty-state">Ingen målverdier er lagret i oppskriften.</div>';
    }

    return '<div class="metric-mini-grid">' + entries.map(function (entry) {
      return '<article class="metric-mini"><strong>' + escapeHtml(entry[0]) + '</strong><span>' + escapeHtml(String(entry[1])) + '</span></article>';
    }).join('') + '</div>';
  }

  function renderIngredientGroup(title, items) {
    const safeItems = Array.isArray(items) ? items : [];
    if (!safeItems.length) return '';
    return ''
      + '<section class="detail-section">'
      + '<h3>' + escapeHtml(title) + '</h3>'
      + '<div class="recipe-ingredients">'
      + safeItems.map(function (item) {
        return '<p>' + escapeHtml(item.name || '') + ' · ' + escapeHtml(String(item.amount || '')) + ' ' + escapeHtml(item.unit || '') + '</p>';
      }).join('')
      + '</div></section>';
  }

  function renderSteps(steps) {
    const safeSteps = Array.isArray(steps) ? steps : [];
    if (!safeSteps.length) {
      return '<div class="empty-state">Ingen steg er lagret i oppskriften.</div>';
    }

    return '<div class="recipe-steps">' + safeSteps.map(function (step, index) {
      return '<article class="recipe-step"><strong>' + escapeHtml(step.title || ('Steg ' + (index + 1))) + '</strong><p>' + escapeHtml(step.details || '') + '</p></article>';
    }).join('') + '</div>';
  }

  function recipeMatchesRef(recipe, recipeRef) {
    if (!recipe || !recipeRef) return false;
    if (String(recipe.id || '') !== String(recipeRef.id || '')) return false;
    if (!recipeRef.source) return true;
    return String(recipe.source || '') === String(recipeRef.source || '');
  }

  function findLinkedLogs(logs, recipe) {
    if (!recipe || !Array.isArray(logs)) return [];
    return logs.filter(function (entry) {
      return recipeMatchesRef(entry && entry.recipeRef, {
        id: recipe.id,
        source: recipe.source
      });
    });
  }

  function renderLinkedLogs(logs) {
    if (!Array.isArray(logs) || !logs.length) {
      return '<div class="empty-state">Ingen bryggelogger er knyttet til denne oppskriften ennÃ¥.</div>';
    }

    return '<div class="relation-list">' + logs.map(function (entry) {
      return ''
        + '<button class="list-tab relation-link" type="button" data-log-slug="' + escapeHtml(entry.slug || '') + '">'
        + '<strong>' + escapeHtml(entry.folderName || entry.batchName || 'Bryggelogg') + '</strong>'
        + '<span>' + escapeHtml(entry.styleName || 'Ukjent stil') + '</span>'
        + '<small>' + escapeHtml(entry.exportedAt ? renderApi.fmtTime(entry.exportedAt) : 'Ukjent eksporttid') + '</small>'
        + '</button>';
    }).join('') + '</div>';
  }

  function renderLinkedLogCards(logs) {
    if (!Array.isArray(logs) || !logs.length) {
      return '<div class="empty-state">Ingen bryggelogger er knyttet til denne oppskriften enna.</div>';
    }

    return '<div class="relation-list">' + logs.map(function (entry) {
      return ''
        + '<button class="list-tab relation-link" type="button" data-log-slug="' + escapeHtml(entry.slug || '') + '">'
        + '<strong>' + escapeHtml(entry.folderName || entry.batchName || 'Bryggelogg') + '</strong>'
        + '<span>' + escapeHtml(entry.styleName || 'Ukjent stil') + '</span>'
        + '<small>' + escapeHtml(entry.exportedAt ? renderApi.fmtTime(entry.exportedAt) : 'Ukjent eksporttid') + '</small>'
        + '</button>';
    }).join('') + '</div>';
  }

  function renderInventorySummaryLine(groupLabel, fit) {
    if (!fit || !fit.active) {
      return '<p><span class="log-label">' + escapeHtml(groupLabel) + '</span>Ingen lagerliste oppgitt for denne gruppen.</p>';
    }

    return '<p><span class="log-label">' + escapeHtml(groupLabel) + '</span>'
      + escapeHtml(String(fit.sufficientCount || 0) + ' av ' + String(fit.requiredCount || 0) + ' ingredienser dekkes av lageret ditt.')
      + '</p>';
  }

  function renderMissingInventoryList(items) {
    const safeItems = Array.isArray(items) ? items : [];
    if (!safeItems.length) {
      return '<p>Ingen tydelige mangler beregnet for valgt batchstorrelse.</p>';
    }

    return '<div class="recipe-ingredients">' + safeItems.map(function (item) {
      const details = item.available
        ? ('trenger ' + item.needed + ', har ' + item.available)
        : ('trenger ' + item.needed);
      return '<p>' + escapeHtml(item.name || 'Ingrediens') + ' - ' + escapeHtml(details) + '</p>';
    }).join('') + '</div>';
  }

  function renderInventoryFitSection(recipe) {
    const fit = recipe && recipe.inventoryFit ? recipe.inventoryFit : null;
    if (!fit || !fit.active) {
      return '<section class="detail-section"><h3>Lagerfit</h3><div class="empty-state">Legg inn malter, humler og onsket batchstorrelse for a se hvilke oppskrifter som faktisk passer lageret ditt.</div></section>';
    }

    const volumeLine = Number.isFinite(fit.desiredVolumeLiters)
      ? ('<p><span class="log-label">Volum</span>' + escapeHtml('Oppskriften skaleres mot ' + formatBaseAmount(fit.desiredVolumeLiters, 'volume') + (Number.isFinite(fit.recipeVolumeLiters) ? (' fra grunnbatch ' + formatBaseAmount(fit.recipeVolumeLiters, 'volume')) : '') + '.') + '</p>')
      : '';
    const overallRatio = Number.isFinite(fit.ratio)
      ? Math.round(fit.ratio * 100)
      : (Number.isFinite(fit.matchRatio) ? Math.round(fit.matchRatio * 100) : null);

    return ''
      + '<section class="detail-section"><h3>Lagerfit</h3>'
      + '<p><span class="log-label">Status</span>' + escapeHtml(fit.label + (overallRatio === null ? '' : (' (' + overallRatio + '%)'))) + '</p>'
      + volumeLine
      + renderInventorySummaryLine('Malter', fit.maltFit)
      + renderInventorySummaryLine('Humle', fit.hopFit)
      + '<div class="detail-section"><h3>Mangler for denne batchen</h3>' + renderMissingInventoryList(fit.missing) + '</div>'
      + '</section>';
  }

  function renderRecipeDetail(els, recipe, linkedLogs, isLinkedSelection) {
    if (!recipe) {
      els.recipeTitle.textContent = 'Velg en oppskrift';
      els.recipeSubtitle.textContent = 'Ingen oppskrift er valgt ennå.';
      els.recipePills.innerHTML = '';
      els.recipeText.innerHTML = '<div class="empty-state">Ingen oppskrift valgt ennå.</div>';
      return;
    }

    els.recipeTitle.textContent = recipe.name || 'Oppskrift';
    const inventoryFit = recipe.inventoryFit || null;
    const inventoryFitPct = Number.isFinite(inventoryFit && inventoryFit.ratio)
      ? Math.round(inventoryFit.ratio * 100)
      : (inventoryFit && Number.isFinite(inventoryFit.matchRatio) ? Math.round(inventoryFit.matchRatio * 100) : null);
    els.recipeSubtitle.textContent = (recipe.style || 'Ukjent stil') + ' · ' + (recipe.providerLabel || recipe.source || 'Lokal kilde');
    els.recipePills.innerHTML = ''
      + '<div class="info-pill subtle">Rating: ' + escapeHtml(String(recipe.rating || 0)) + '</div>'
      + '<div class="info-pill subtle">Match: ' + escapeHtml(String(Math.round((recipe.matchRatio || 0) * 100))) + '%</div>'
      + (recipe.batchVolume ? '<div class="info-pill subtle">Batch: ' + escapeHtml(String(recipe.batchVolume)) + '</div>' : '')
      + (isLinkedSelection ? '<div class="info-pill subtle">Brukes for neste logg</div>' : '')
      + (inventoryFit && inventoryFit.active ? '<div class="info-pill subtle">Lagerfit: ' + escapeHtml(String(inventoryFitPct)) + '%</div>' : '')
      + '<div class="info-pill subtle">Brygget som: ' + escapeHtml(String((linkedLogs || []).length)) + ' logg(er)</div>';
    els.recipeText.innerHTML = ''
      + '<section class="detail-section"><h3>Knyttede bryggelogger</h3>' + renderLinkedLogCards(linkedLogs) + '</section>'
      + renderInventoryFitSection(recipe)
      + '<section class="detail-section"><h3>Målverdier</h3>' + renderTargets(recipe.targets) + '</section>'
      + renderIngredientGroup('Malter', recipe.ingredients && recipe.ingredients.malts)
      + renderIngredientGroup('Humle', recipe.ingredients && recipe.ingredients.hops)
      + renderIngredientGroup('Gjær', recipe.ingredients && recipe.ingredients.yeast)
      + renderIngredientGroup('Annet', recipe.ingredients && recipe.ingredients.misc)
      + '<section class="detail-section"><h3>Steg for steg</h3>' + renderSteps(recipe.steps) + '</section>'
      + (recipe.notes ? '<section class="detail-section"><h3>Notater</h3><p>' + escapeHtml(recipe.notes) + '</p></section>' : '');
  }

  function renderReferences(els, references) {
    if (!Array.isArray(references) || !references.length) {
      els.referenceList.innerHTML = '<div class="empty-state">Ingen eksterne treff ennå.</div>';
      return;
    }

    els.referenceList.innerHTML = references.map(function (entry) {
      return ''
        + '<article class="reference-card">'
        + '<div class="reference-body">'
        + '<strong>' + escapeHtml(entry.title || 'Treff') + '</strong>'
        + '<span>' + escapeHtml(entry.provider || '') + '</span>'
        + '<span>' + escapeHtml(entry.subtitle || '') + '</span>'
        + (entry.url ? '<a href="' + escapeHtml(entry.url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(entry.url) + '</a>' : '')
        + '</div></article>';
    }).join('');
  }

  function createTemplatePayload() {
    return {
      schemaVersion: 1,
      name: 'Ny oppskrift',
      style: '',
      rating: 0,
      batchVolume: '20 L',
      ingredients: {
        malts: [],
        hops: [],
        yeast: [],
        misc: []
      },
      steps: [
        { title: 'Mesk', details: '' },
        { title: 'Kok', details: '' },
        { title: 'Gjæring', details: '' }
      ],
      targets: {
        og: '',
        fg: '',
        abv: '',
        ibu: '',
        srm: ''
      },
      nutritionOverrides: {
        kcalPer400ml: '',
        carbsGPer400ml: '',
        proteinGPer400ml: '',
        fatGPer400ml: ''
      },
      notes: ''
    };
  }

  function downloadRecipeTemplate() {
    const blob = new Blob([JSON.stringify(createTemplatePayload(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'oppskriftsmal.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function createModule(config) {
    const els = config.elements;
    const state = config.state;
    const onRecipeChange = typeof config.onRecipeChange === 'function' ? config.onRecipeChange : function () {};
    const onLogNavigate = typeof config.onLogNavigate === 'function' ? config.onLogNavigate : null;
    const ensureLogsLoaded = typeof config.ensureLogsLoaded === 'function' ? config.ensureLogsLoaded : null;

    function wireRecipeButtons() {
      Array.from(els.recipeList.querySelectorAll('[data-id]')).forEach(function (button) {
        button.addEventListener('click', function () {
          state.selectedRecipeId = button.getAttribute('data-id') || '';
          state.linkedRecipe = (state.recipes || []).find(function (entry) {
            return entry.id === state.selectedRecipeId;
          }) || null;
          renderRecipeList(els, state);
          loadSelectedRecipe();
        });
      });
    }

    function wireLinkedLogButtons() {
      if (!onLogNavigate) return;
      Array.from(els.recipeText.querySelectorAll('[data-log-slug]')).forEach(function (button) {
        button.addEventListener('click', function () {
          onLogNavigate(button.getAttribute('data-log-slug') || '');
        });
      });
    }

    function buildServerQuery(filters) {
      const tokens = [];
      (filters.malts || []).forEach(function (item) { tokens.push(item.name || item.raw || ''); });
      (filters.hops || []).forEach(function (item) { tokens.push(item.name || item.raw || ''); });
      if (filters.miscQuery) {
        tokens.push(filters.miscQuery);
      }
      return tokens.map(function (value) { return String(value || '').trim(); }).filter(Boolean).join(', ');
    }

    function recipeContainsQuery(recipe, query) {
      const needles = String(query || '')
        .split(/[,;\n]+/)
        .map(normalizeToken)
        .filter(Boolean);
      if (!needles.length) return true;
      const haystack = [
        recipe && recipe.name,
        recipe && recipe.style,
        recipe && recipe.notes
      ].concat(
        ((recipe && recipe.ingredients && recipe.ingredients.malts) || []).map(function (item) { return item.name; }),
        ((recipe && recipe.ingredients && recipe.ingredients.hops) || []).map(function (item) { return item.name; }),
        ((recipe && recipe.ingredients && recipe.ingredients.yeast) || []).map(function (item) { return item.name; }),
        ((recipe && recipe.ingredients && recipe.ingredients.misc) || []).map(function (item) { return item.name; })
      ).map(normalizeToken).join(' ');
      return needles.every(function (needle) {
        return haystack.indexOf(needle) !== -1;
      });
    }

    function applyRecipeFilters() {
      const filters = buildInventoryFilters(els);
      const hasInventory = filters.malts.length > 0 || filters.hops.length > 0 || Number.isFinite(filters.desiredVolumeLiters);
      const hasTextQuery = filters.miscQuery !== '';

      state.recipeResults = (state.recipes || []).map(function (recipe) {
        const inventoryFit = buildInventoryFit(recipe, filters);
        return Object.assign({}, recipe, {
          inventoryFit: inventoryFit
        });
      }).filter(function (recipe) {
        const inventoryFit = recipe.inventoryFit;
        const inventoryPass = !hasInventory
          || !inventoryFit.active
          || inventoryFit.matchedCount > 0
          || inventoryFit.requiredCount === 0;
        const textPass = !hasTextQuery || recipeContainsQuery(recipe, filters.miscQuery);
        return inventoryPass && textPass;
      }).sort(function (a, b) {
        const aFit = a.inventoryFit || {};
        const bFit = b.inventoryFit || {};
        const aRatio = Number.isFinite(aFit.ratio) ? aFit.ratio : (Number.isFinite(aFit.matchRatio) ? aFit.matchRatio : -1);
        const bRatio = Number.isFinite(bFit.ratio) ? bFit.ratio : (Number.isFinite(bFit.matchRatio) ? bFit.matchRatio : -1);
        if (bRatio !== aRatio) return bRatio - aRatio;
        if ((bFit.sufficientCount || 0) !== (aFit.sufficientCount || 0)) return (bFit.sufficientCount || 0) - (aFit.sufficientCount || 0);
        if ((b.matchRatio || 0) !== (a.matchRatio || 0)) return (b.matchRatio || 0) - (a.matchRatio || 0);
        if ((b.rating || 0) !== (a.rating || 0)) return (b.rating || 0) - (a.rating || 0);
        return String(a.name || '').localeCompare(String(b.name || ''), 'nb');
      });

      if (!state.recipeResults.length) {
        state.selectedRecipeId = '';
      } else if (state.selectedRecipeId && !state.recipeResults.some(function (recipe) { return recipe.id === state.selectedRecipeId; })) {
        state.selectedRecipeId = state.recipeResults[0] ? state.recipeResults[0].id : state.selectedRecipeId;
      }

      return filters;
    }

    async function refreshRecipes(forceSearch) {
      const options = (typeof forceSearch === 'object' && forceSearch !== null)
        ? forceSearch
        : { forceSearch: !!forceSearch };
      const currentFilters = buildInventoryFilters(els);
      const query = Object.prototype.hasOwnProperty.call(options, 'queryOverride')
        ? String(options.queryOverride || '')
        : (options.forceSearch ? buildServerQuery(currentFilters) : (state.recipeQuery || ''));
      state.recipeQuery = query;
      els.recipeList.innerHTML = '<div class="loading">Laster oppskrifter...</div>';

      try {
        const payload = await fetchJson('/includes/brewing/api/recipes.php?ingredients=' + encodeURIComponent(query));
        state.recipeProviders = Array.isArray(payload.providers) ? payload.providers : [];
        state.recipes = Array.isArray(payload.recipes) ? payload.recipes : [];
        if (state.linkedRecipe) {
          const refreshedLinkedRecipe = state.recipes.find(function (recipe) {
            return recipeMatchesRef(recipe, state.linkedRecipe);
          }) || null;
          if (refreshedLinkedRecipe) {
            state.linkedRecipe = refreshedLinkedRecipe;
          }
        }
        if (options.selectRecipeRef) {
          const matchedRecipe = state.recipes.find(function (recipe) {
            return recipeMatchesRef(recipe, options.selectRecipeRef);
          }) || null;
          state.selectedRecipeId = matchedRecipe ? matchedRecipe.id : (state.recipes[0] ? state.recipes[0].id : '');
        } else if (!state.recipes.some(function (recipe) { return recipe.id === state.selectedRecipeId; })) {
          state.selectedRecipeId = state.recipes[0] ? state.recipes[0].id : '';
        }

        applyRecipeFilters();
        renderProviderPills(els.recipeProviderPills, state.recipeProviders);
        renderRecipeList(els, state);
        wireRecipeButtons();
        await loadSelectedRecipe();
        onRecipeChange();
      } catch (error) {
        els.recipeList.innerHTML = '<div class="empty-state">Klarte ikke lese oppskrifter: ' + escapeHtml(error.message) + '</div>';
      }
    }

    async function loadSelectedRecipe() {
      const recipe = (state.recipeResults || []).find(function (entry) { return entry.id === state.selectedRecipeId; })
        || (state.recipes || []).find(function (entry) { return entry.id === state.selectedRecipeId; })
        || null;
      if (recipe && !state.logs.length && ensureLogsLoaded) {
        try {
          await ensureLogsLoaded();
        } catch (error) {
          // Keep recipe rendering even if linked logs could not be loaded.
        }
      }

      const linkedLogs = recipe ? findLinkedLogs(state.logs, recipe) : [];
      const linkedToActiveBatch = recipe && state.linkedRecipe
        ? recipeMatchesRef(recipe, state.linkedRecipe)
        : false;
      renderRecipeDetail(els, recipe, linkedLogs, linkedToActiveBatch);
      wireLinkedLogButtons();
      onRecipeChange();
      if (!recipe) {
        els.referenceMeta.textContent = 'Ingen eksterne treff ennå.';
        els.referenceList.innerHTML = '<div class="empty-state">Ingen eksterne treff ennå.</div>';
        return;
      }

      const query = (recipe.style || recipe.name || '').trim();
      try {
        const referencePayload = await fetchJson('/includes/brewing/api/reference.php?q=' + encodeURIComponent(query));
        renderReferences(els, referencePayload.references || []);
        renderProviderPills(els.recipeProviderPills, referencePayload.providers || state.recipeProviders);
        els.referenceMeta.textContent = query
          ? ('Eksterne treff for ' + query + '.')
          : 'Ingen eksterne treff ennå.';
      } catch (error) {
        els.referenceMeta.textContent = 'Klarte ikke laste eksterne treff: ' + error.message;
        els.referenceList.innerHTML = '<div class="empty-state">Ingen eksterne treff ennå.</div>';
      }
    }

    async function selectRecipeByRef(recipeRef) {
      if (!recipeRef || !recipeRef.id) return false;
      let recipe = (state.recipes || []).find(function (entry) {
        return recipeMatchesRef(entry, recipeRef);
      }) || null;

      if (!recipe) {
        await refreshRecipes({
          queryOverride: '',
          selectRecipeRef: recipeRef
        });
        recipe = (state.recipes || []).find(function (entry) {
          return recipeMatchesRef(entry, recipeRef);
        }) || null;
      } else {
        state.selectedRecipeId = recipe.id;
        renderRecipeList(els, state);
        wireRecipeButtons();
        await loadSelectedRecipe();
      }

      return !!recipe;
    }

    async function runInventorySearch() {
      if (!Array.isArray(state.recipes) || !state.recipes.length) {
        await refreshRecipes({ forceSearch: true });
        return;
      }

      applyRecipeFilters();
      renderRecipeList(els, state);
      wireRecipeButtons();
      await loadSelectedRecipe();
    }

    els.searchRecipesBtn.addEventListener('click', function () {
      runInventorySearch();
    });
    els.refreshRecipesBtn.addEventListener('click', function () {
      refreshRecipes(true);
    });
    els.downloadRecipeTemplateBtn.addEventListener('click', downloadRecipeTemplate);

    return {
      refreshRecipes: refreshRecipes,
      loadSelectedRecipe: loadSelectedRecipe,
      selectRecipeByRef: selectRecipeByRef
    };
  }

  global.BrewingRecipeEngine = {
    createModule: createModule
  };
}(window));
