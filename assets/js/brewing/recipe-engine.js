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
    if (unit === 'hg' || unit === 'hektogram') return 'hg';
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
      return amount >= 1 ? amount.toFixed(1).replace(/\.0$/, '') + ' L' : Math.round(amount * 1000) + ' ml';
    }
    return amount >= 1000
      ? (amount / 1000).toFixed(2).replace(/\.?0+$/, '') + ' kg'
      : Math.round(amount) + ' g';
  }

  function formatNumberCompact(value, decimals) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '';
    return numeric.toFixed(decimals).replace(/\.?0+$/, '');
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

  function inferAmountKind(unit) {
    const normalizedUnit = normalizeUnit(unit, '');
    if (normalizedUnit === 'kg' || normalizedUnit === 'hg' || normalizedUnit === 'g' || normalizedUnit === 'oz' || normalizedUnit === 'lb') {
      return 'solid';
    }
    if (normalizedUnit === 'l' || normalizedUnit === 'ml') {
      return 'volume';
    }
    return 'generic';
  }

  function formatScaledAmount(rawAmount, unit, scaleFactor) {
    const numeric = Number(rawAmount);
    const safeScale = Number.isFinite(scaleFactor) && scaleFactor > 0 ? scaleFactor : 1;
    const kind = inferAmountKind(unit);
    const normalizedUnit = normalizeUnit(unit, '');
    const scaledNumeric = Number.isFinite(numeric) ? numeric * safeScale : NaN;

    if (kind === 'solid' || kind === 'volume') {
      const baseAmount = convertToBaseAmount(scaledNumeric, normalizedUnit, kind);
      if (Number.isFinite(baseAmount)) {
        return formatBaseAmount(baseAmount, kind);
      }
    }

    if (Number.isFinite(scaledNumeric)) {
      const decimals = Math.abs(scaledNumeric) >= 10 ? 1 : 2;
      const suffix = unit ? (' ' + String(unit).trim()) : '';
      return formatNumberCompact(scaledNumeric, decimals) + suffix;
    }

    return [rawAmount, unit].filter(Boolean).join(' ').trim() || 'ukjent mengde';
  }

  function buildScaledAmountMeta(item, scaleFactor) {
    const safeScale = Number.isFinite(scaleFactor) && scaleFactor > 0 ? scaleFactor : 1;
    const originalText = formatScaledAmount(item && item.amount, item && item.unit, 1);
    const scaledText = formatScaledAmount(item && item.amount, item && item.unit, safeScale);
    const changed = Math.abs(safeScale - 1) >= 0.01;

    return {
      originalText: originalText,
      scaledText: scaledText,
      changed: changed
    };
  }

  function extractRange(value, suffix) {
    const match = String(value || '').match(new RegExp('(\\d+(?:[.,]\\d+)?)(?:\\s*-\\s*(\\d+(?:[.,]\\d+)?))?\\s*' + suffix, 'i'));
    if (!match) return { low: NaN, high: NaN };
    const low = parseDecimal(match[1]);
    const high = match[2] ? parseDecimal(match[2]) : low;
    return { low: low, high: high };
  }

  function averageRange(range) {
    if (!range) return NaN;
    if (Number.isFinite(range.low) && Number.isFinite(range.high)) {
      return (range.low + range.high) / 2;
    }
    if (Number.isFinite(range.low)) return range.low;
    if (Number.isFinite(range.high)) return range.high;
    return NaN;
  }

  function matchesName(needle, candidate) {
    if (!needle || !candidate) return false;
    return needle === candidate || needle.indexOf(candidate) !== -1 || candidate.indexOf(needle) !== -1;
  }

  function uniqueByKey(items, keyName) {
    const map = new Map();
    (Array.isArray(items) ? items : []).forEach(function (item) {
      if (!item) return;
      const key = item[keyName];
      if (!key || map.has(key)) return;
      map.set(key, item);
    });
    return Array.from(map.values());
  }

  function stateCatalog(state) {
    return state && state.recipeCatalogs ? state.recipeCatalogs : {};
  }

  function shopEntries(state, kind) {
    const catalog = stateCatalog(state);
    const shop = catalog.shop || {};
    return Array.isArray(shop[kind]) ? shop[kind] : [];
  }

  function hopDatabaseEntries(state) {
    const catalog = stateCatalog(state);
    return Array.isArray(catalog.hopDatabase && catalog.hopDatabase.hops) ? catalog.hopDatabase.hops : [];
  }

  function shopCatalogCounts(state) {
    const malts = shopEntries(state, 'malts');
    const hops = shopEntries(state, 'hops');
    return {
      malts: malts.length,
      hops: hops.length,
      total: malts.length + hops.length
    };
  }

  function findBestInventoryMatch(name, inventoryItems, catalogItems) {
    const key = normalizeToken(name);
    if (!key) return null;

    const items = Array.isArray(inventoryItems) ? inventoryItems : [];
    for (let i = 0; i < items.length; i += 1) {
      if (items[i] && items[i].key === key) return items[i];
    }

    for (let j = 0; j < items.length; j += 1) {
      if (items[j] && matchesName(key, items[j].key)) return items[j];
    }

    const catalogMatch = (Array.isArray(catalogItems) ? catalogItems : []).find(function (entry) {
      return entry && entry.key && (entry.key === key || matchesName(key, entry.key));
    }) || null;
    if (!catalogMatch) return null;

    const mapped = items.find(function (entry) {
      return entry && entry.key && matchesName(catalogMatch.key, entry.key);
    }) || null;
    return mapped;
  }

  function classifyMalt(name) {
    const key = normalizeToken(name);
    if (/(pils|lager|bohemian pilsner)/.test(key)) return 'pilsner';
    if (/(pale ale|maris otter|golden promise|pale malt)/.test(key)) return 'pale';
    if (/(vienna)/.test(key)) return 'vienna';
    if (/(munich|munchner)/.test(key)) return 'munich';
    if (/(wheat|hvete|weizen)/.test(key)) return 'wheat';
    if (/(rye)/.test(key)) return 'rye';
    if (/(mais|corn|maize)/.test(key)) return 'corn';
    if (/(oat|havre)/.test(key)) return 'oat';
    if (/(cara|caramel|crystal)/.test(key)) return 'crystal';
    if (/(carafa|chocolate|black|roast|barley)/.test(key)) return 'roast';
    if (/(sukker|dextrose|candi|sirup)/.test(key)) return 'sugar';
    return 'other';
  }

  function chooseClosestByEbc(candidates, targetEbc) {
    if (!Array.isArray(candidates) || !candidates.length) return null;
    const scored = candidates.map(function (item) {
      const range = {
        low: Number(item && item.ebcLow),
        high: Number(item && item.ebcHigh)
      };
      return {
        item: item,
        score: Number.isFinite(targetEbc) && Number.isFinite(averageRange(range))
          ? Math.abs(targetEbc - averageRange(range))
          : 9999
      };
    }).sort(function (a, b) {
      return a.score - b.score;
    });
    return scored[0] ? scored[0].item : null;
  }

  function findCatalogItem(name, items) {
    const key = normalizeToken(name);
    return (Array.isArray(items) ? items : []).find(function (entry) {
      return entry && entry.key && (entry.key === key || matchesName(key, entry.key));
    }) || null;
  }

  function buildMaltSubstitutions(name, inventoryItems, shopMalts) {
    const targetType = classifyMalt(name);
    const targetEbc = averageRange(extractRange(name, 'EBC'));
    const inventoryCandidates = uniqueByKey((inventoryItems || []).map(function (item) {
      return {
        name: item.name || item.raw,
        key: item.key,
        ebcLow: Number(findCatalogItem(item.name || item.raw, shopMalts) && findCatalogItem(item.name || item.raw, shopMalts).ebcLow),
        ebcHigh: Number(findCatalogItem(item.name || item.raw, shopMalts) && findCatalogItem(item.name || item.raw, shopMalts).ebcHigh),
        type: classifyMalt(item.name || item.raw)
      };
    }).filter(function (item) {
      return item.type === targetType && item.key !== normalizeToken(name);
    }), 'key');

    const inventoryHit = chooseClosestByEbc(inventoryCandidates, targetEbc);
    if (inventoryHit) {
      return [{
        mode: 'substitute',
        source: 'lager',
        title: inventoryHit.name,
        detail: 'Ser ut som nærmeste malt fra lageret ditt i samme maltfamilie.'
      }];
    }

    const shopCandidates = uniqueByKey((shopMalts || []).filter(function (item) {
      return classifyMalt(item.baseName || item.name) === targetType && item.key !== normalizeToken(name);
    }), 'key');
    const shopHit = chooseClosestByEbc(shopCandidates, targetEbc);
    if (shopHit) {
      return [{
        mode: 'buy',
        source: 'shop',
        title: shopHit.displayName || shopHit.name,
        detail: 'Nærmeste butikkmalt i samme familie hos Ølbrygging.',
        url: shopHit.url || ''
      }];
    }

    return [];
  }

  function splitCsv(value) {
    return String(value || '')
      .split(/[,/]+/)
      .map(function (part) { return part.trim(); })
      .filter(Boolean);
  }

  function findHopProfile(name, hopEntries) {
    const key = normalizeToken(name);
    return (Array.isArray(hopEntries) ? hopEntries : []).find(function (entry) {
      return entry && entry.key && (entry.key === key || matchesName(key, entry.key));
    }) || null;
  }

  function findInventoryByName(name, inventoryItems) {
    const key = normalizeToken(name);
    return (Array.isArray(inventoryItems) ? inventoryItems : []).find(function (item) {
      return item && item.key && (item.key === key || matchesName(key, item.key));
    }) || null;
  }

  function findShopHopByName(name, shopHops) {
    return findCatalogItem(name, shopHops);
  }

  function buildHopSubstitutions(name, inventoryItems, shopHops, hopEntries) {
    const profile = findHopProfile(name, hopEntries);
    const suggestions = [];

    if (profile) {
      const preferred = splitCsv((profile.brewhouse || []).join(',') + ',' + (profile.dryHopping || []).join(','));
      preferred.forEach(function (candidateName) {
        const inventoryHit = findInventoryByName(candidateName, inventoryItems);
        if (inventoryHit) {
          suggestions.push({
            mode: 'substitute',
            source: 'lager',
            title: inventoryHit.name || inventoryHit.raw,
            detail: 'Foreslått av HopDatabase som nærliggende humleerstatning.'
          });
          return;
        }

        const shopHit = findShopHopByName(candidateName, shopHops);
        if (shopHit) {
          suggestions.push({
            mode: 'buy',
            source: 'shop',
            title: shopHit.displayName || shopHit.name,
            detail: 'Foreslått av HopDatabase og tilgjengelig i butikkatalogen.',
            url: shopHit.url || ''
          });
        }
      });
    }

    if (!suggestions.length) {
      const recipeRange = extractRange(name, '%');
      const recipeAlpha = averageRange(recipeRange);
      const inventoryFallback = uniqueByKey((inventoryItems || []).map(function (item) {
        const shopHit = findShopHopByName(item.name || item.raw, shopHops);
        return {
          name: item.name || item.raw,
          key: item.key,
          alphaLow: shopHit ? Number(shopHit.alphaLow) : NaN,
          alphaHigh: shopHit ? Number(shopHit.alphaHigh) : NaN
        };
      }), 'key').sort(function (a, b) {
        const aAlpha = averageRange({ low: a.alphaLow, high: a.alphaHigh });
        const bAlpha = averageRange({ low: b.alphaLow, high: b.alphaHigh });
        const aScore = Number.isFinite(aAlpha) ? Math.abs(aAlpha - recipeAlpha) : 9999;
        const bScore = Number.isFinite(bAlpha) ? Math.abs(bAlpha - recipeAlpha) : 9999;
        return aScore - bScore;
      });

      if (inventoryFallback[0] && Number.isFinite(recipeAlpha)) {
        suggestions.push({
          mode: 'substitute',
          source: 'lager',
          title: inventoryFallback[0].name,
          detail: 'Nærmeste lagerhumle basert på alfasyre når direkte substitution ikke ble funnet.'
        });
      }
    }

    return uniqueByKey(suggestions, 'title').slice(0, 3);
  }

  function buildReplacementSuggestions(kind, itemName, filters, state) {
    if (kind === 'hop') {
      return buildHopSubstitutions(itemName, filters.hops, shopEntries(state, 'hops'), hopDatabaseEntries(state));
    }
    if (kind === 'malt') {
      return buildMaltSubstitutions(itemName, filters.malts, shopEntries(state, 'malts'));
    }
    return [];
  }

  function buildInventoryFilters(els) {
    return {
      malts: parseInventoryList(els.recipeMaltInput && els.recipeMaltInput.value, 'solid'),
      hops: parseInventoryList(els.recipeHopInput && els.recipeHopInput.value, 'solid'),
      miscQuery: String((els.recipeIngredientInput && els.recipeIngredientInput.value) || '').trim(),
      desiredVolumeLiters: parseVolumeLiters(els.recipeVolumeInput && els.recipeVolumeInput.value)
    };
  }

  function summarizeInventoryGroup(groupName, recipeItems, inventoryItems, scaleFactor, filters, state) {
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

    const missing = [];
    const matched = [];
    let matchedCount = 0;
    let sufficientCount = 0;

    safeRecipeItems.forEach(function (item) {
      const inventoryMatch = findBestInventoryMatch(item.name, activeInventory, shopEntries(state, groupName === 'malt' ? 'malts' : 'hops'));
      const neededBase = parseRecipeItemAmount(item, 'solid');
      const scaledNeededBase = Number.isFinite(neededBase) && Number.isFinite(scaleFactor) ? neededBase * scaleFactor : neededBase;

      if (!inventoryMatch) {
        missing.push({
          name: item.name || 'Ingrediens',
          needed: formatBaseAmount(scaledNeededBase, 'solid'),
          group: groupName,
          suggestions: buildReplacementSuggestions(groupName, item.name || '', filters, state)
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
          group: groupName,
          suggestions: buildReplacementSuggestions(groupName, item.name || '', filters, state)
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
      active: activeInventory.length > 0,
      requiredCount: safeRecipeItems.length,
      matchedCount: matchedCount,
      sufficientCount: sufficientCount,
      ratio: safeRecipeItems.length ? (sufficientCount / safeRecipeItems.length) : 1,
      missing: missing,
      matched: matched
    };
  }

  function buildInventoryFit(recipe, filters, state) {
    const recipeVolumeLiters = parseVolumeLiters(recipe && recipe.batchVolume);
    const desiredVolumeLiters = filters && Number.isFinite(filters.desiredVolumeLiters) ? filters.desiredVolumeLiters : NaN;
    const scaleFactor = Number.isFinite(desiredVolumeLiters) && Number.isFinite(recipeVolumeLiters) && recipeVolumeLiters > 0
      ? desiredVolumeLiters / recipeVolumeLiters
      : 1;

    const maltFit = summarizeInventoryGroup('malt', recipe && recipe.ingredients && recipe.ingredients.malts, filters && filters.malts, scaleFactor, filters, state);
    const hopFit = summarizeInventoryGroup('hop', recipe && recipe.ingredients && recipe.ingredients.hops, filters && filters.hops, scaleFactor, filters, state);
    const activeGroups = [maltFit, hopFit].filter(function (group) {
      return group.active || group.requiredCount > 0;
    });
    const requiredCount = activeGroups.reduce(function (sum, group) { return sum + group.requiredCount; }, 0);
    const sufficientCount = activeGroups.reduce(function (sum, group) { return sum + group.sufficientCount; }, 0);
    const matchedCount = activeGroups.reduce(function (sum, group) { return sum + group.matchedCount; }, 0);
    const missing = activeGroups.reduce(function (list, group) { return list.concat(group.missing); }, []);
    const ratio = requiredCount ? (sufficientCount / requiredCount) : NaN;
    const matchRatio = requiredCount ? (matchedCount / requiredCount) : NaN;

    let label = 'Ingen lagerfilter aktivt';
    if (requiredCount) {
      if (sufficientCount === requiredCount) {
        label = Number.isFinite(scaleFactor) && Math.abs(scaleFactor - 1) > 0.08
          ? 'Passer etter skalering'
          : 'Passer med lageret ditt';
      } else if (matchedCount > 0) {
        label = 'Nærmest tilgjengelige match';
      } else {
        label = 'Krever innkjøp eller erstatninger';
      }
    } else if (Number.isFinite(desiredVolumeLiters)) {
      label = Number.isFinite(recipeVolumeLiters)
        ? 'Volum klar for skalering'
        : 'Volum oppgitt, men oppskriften mangler grunnbatch';
    }

    return {
      active: (filters && (filters.malts.length > 0 || filters.hops.length > 0 || Number.isFinite(filters.desiredVolumeLiters))) || false,
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

  function renderProviderPills(container, providers, state) {
    const counts = shopCatalogCounts(state);
    const hopCount = hopDatabaseEntries(state).length;
    container.innerHTML = (Array.isArray(providers) ? providers : []).map(function (provider) {
      let suffix = provider.active ? 'aktiv' : 'ikke konfigurert';
      if (provider.id === 'olbrygging' && counts.total) {
        suffix += ' · ' + counts.malts + ' malter / ' + counts.hops + ' humler';
      }
      if (provider.id === 'hopdatabase' && hopCount) {
        suffix += ' · ' + hopCount + ' humleprofiler';
      }
      return '<div class="provider-pill ' + (provider.active ? '' : 'off') + '">'
        + escapeHtml(provider.label) + ' · ' + escapeHtml(suffix)
        + '</div>';
    }).join('');
  }

  function renderRecipeSearchMeta(els, recipes) {
    if (!els.recipeSearchMeta) return;
    const safeRecipes = Array.isArray(recipes) ? recipes : [];
    const activeFits = safeRecipes.filter(function (recipe) {
      return recipe && recipe.inventoryFit && recipe.inventoryFit.active;
    });

    if (!activeFits.length) {
      els.recipeSearchMeta.textContent = 'Viser oppskrifter fra den lokale basen, med eksterne stil- og bryggerireferanser i høyre kolonne.';
      return;
    }

    const fullMatches = activeFits.filter(function (recipe) {
      const fit = recipe.inventoryFit || {};
      return Number.isFinite(fit.ratio) && fit.requiredCount > 0 && fit.sufficientCount === fit.requiredCount;
    });

    if (fullMatches.length) {
      els.recipeSearchMeta.textContent = fullMatches.length + ' oppskrift(er) passer fullt med lageret ditt akkurat nå. Resten er sortert etter minst mangler.';
      return;
    }

    els.recipeSearchMeta.textContent = 'Ingen fulltreff akkurat nå. Viser nærmeste oppskrifter først, med mangelliste, innkjøpsforslag og mulige erstatninger.';
  }

  function renderRecipeList(els, state) {
    const recipes = Array.isArray(state.recipeResults) ? state.recipeResults : (Array.isArray(state.recipes) ? state.recipes : []);
    if (!recipes.length) {
      renderRecipeSearchMeta(els, recipes);
      els.recipeList.innerHTML = '<div class="empty-state">Ingen oppskrifter fant match ennå.</div>';
      return;
    }

    renderRecipeSearchMeta(els, recipes);

    els.recipeList.innerHTML = recipes.map(function (recipe) {
      const inventoryFit = recipe.inventoryFit || null;
      const fitRatio = Number.isFinite(inventoryFit && inventoryFit.ratio)
        ? inventoryFit.ratio
        : (inventoryFit && Number.isFinite(inventoryFit.matchRatio) ? inventoryFit.matchRatio : Number(recipe.matchRatio || 0));
      const fitPct = Number.isFinite(fitRatio) ? String(Math.round(fitRatio * 100)) + '%' : '--';
      const missingCount = inventoryFit && Array.isArray(inventoryFit.missing) ? inventoryFit.missing.length : 0;
      const recipeVolume = Number.isFinite(inventoryFit && inventoryFit.recipeVolumeLiters)
        ? inventoryFit.recipeVolumeLiters
        : parseVolumeLiters(recipe && recipe.batchVolume);
      const desiredVolume = Number.isFinite(inventoryFit && inventoryFit.desiredVolumeLiters)
        ? inventoryFit.desiredVolumeLiters
        : NaN;
      const volumeText = Number.isFinite(recipeVolume)
        ? (' · ' + formatBaseAmount(recipeVolume, 'volume') + (Number.isFinite(desiredVolume) && Math.abs((inventoryFit && inventoryFit.scaleFactor) - 1) >= 0.01 ? (' → ' + formatBaseAmount(desiredVolume, 'volume')) : ''))
        : '';

      return ''
        + '<button class="list-tab ' + (recipe.id === state.selectedRecipeId ? 'active' : '') + '" type="button" data-id="' + escapeHtml(recipe.id) + '">'
        + '<strong>' + escapeHtml(recipe.name || 'Oppskrift') + '</strong>'
        + '<span>' + escapeHtml(recipe.style || 'Ukjent stil') + ' · rating ' + escapeHtml(String(recipe.rating || 0)) + escapeHtml(volumeText) + '</span>'
        + '<small>' + escapeHtml(inventoryFit && inventoryFit.active ? (inventoryFit.label + ' · ' + fitPct) : ('Match ' + String(Math.round((recipe.matchRatio || 0) * 100)) + '%'))
        + (missingCount ? (' · mangler ' + missingCount) : '')
        + ' · ' + escapeHtml(recipe.providerLabel || recipe.source || '') + '</small>'
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

  function renderScalingSection(recipe) {
    const fit = recipe && recipe.inventoryFit ? recipe.inventoryFit : null;
    const recipeVolume = Number.isFinite(fit && fit.recipeVolumeLiters)
      ? fit.recipeVolumeLiters
      : parseVolumeLiters(recipe && recipe.batchVolume);
    const desiredVolume = Number.isFinite(fit && fit.desiredVolumeLiters) ? fit.desiredVolumeLiters : NaN;
    const scaleFactor = Number.isFinite(fit && fit.scaleFactor) && fit.scaleFactor > 0 ? fit.scaleFactor : 1;
    const hasRecipeVolume = Number.isFinite(recipeVolume);
    const hasDesiredVolume = Number.isFinite(desiredVolume);
    const isScaled = hasRecipeVolume && hasDesiredVolume && Math.abs(scaleFactor - 1) >= 0.01;

    if (!hasRecipeVolume && !hasDesiredVolume) {
      return '<section class="detail-section"><h3>Batch og skalering</h3><div class="empty-state">Oppskriften mangler batchstørrelse, så ingrediensene vises i grunnformat uten sikker skalering.</div></section>';
    }

    return ''
      + '<section class="detail-section"><h3>Batch og skalering</h3>'
      + '<div class="metric-mini-grid">'
      + (hasRecipeVolume ? '<article class="metric-mini"><strong>Laget for</strong><span>' + escapeHtml(formatBaseAmount(recipeVolume, 'volume')) + '</span></article>' : '')
      + (hasDesiredVolume ? '<article class="metric-mini"><strong>Vises som</strong><span>' + escapeHtml(formatBaseAmount(desiredVolume, 'volume')) + '</span></article>' : '')
      + '<article class="metric-mini"><strong>Skalering</strong><span>' + escapeHtml(formatNumberCompact(scaleFactor, 2) + 'x') + '</span></article>'
      + '</div>'
      + '<p>' + escapeHtml(
        isScaled
          ? ('Ingrediensmengdene under er automatisk skalert fra ' + formatBaseAmount(recipeVolume, 'volume') + ' til ' + formatBaseAmount(desiredVolume, 'volume') + '.')
          : (hasRecipeVolume
            ? ('Ingrediensmengdene under vises for oppskriftens grunnbatch på ' + formatBaseAmount(recipeVolume, 'volume') + '.')
            : 'Ingrediensmengdene under vises uten bekreftet grunnbatchvolum.')
      ) + '</p>'
      + '</section>';
  }

  function renderIngredientGroup(title, items, recipe) {
    const safeItems = Array.isArray(items) ? items : [];
    if (!safeItems.length) return '';
    const fit = recipe && recipe.inventoryFit ? recipe.inventoryFit : null;
    const scaleFactor = Number.isFinite(fit && fit.scaleFactor) && fit.scaleFactor > 0 ? fit.scaleFactor : 1;
    return ''
      + '<section class="detail-section">'
      + '<h3>' + escapeHtml(title) + '</h3>'
      + '<div class="recipe-ingredients">'
      + safeItems.map(function (item) {
        const amountMeta = buildScaledAmountMeta(item, scaleFactor);
        return ''
          + '<article class="ingredient-row">'
          + '<strong>' + escapeHtml(item.name || '') + '</strong>'
          + '<span class="ingredient-amount">' + escapeHtml(amountMeta.scaledText) + '</span>'
          + '<small>' + escapeHtml(
            amountMeta.changed
              ? ('Grunnoppskrift: ' + amountMeta.originalText)
              : 'Grunnoppskrift'
          ) + '</small>'
          + '</article>';
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

  function renderLinkedLogCards(logs) {
    if (!Array.isArray(logs) || !logs.length) {
      return '<div class="empty-state">Ingen bryggelogger er knyttet til denne oppskriften ennå.</div>';
    }

    return '<div class="relation-list">' + logs.map(function (entry) {
      const storageLabel = entry && entry.storage && entry.storage.label ? entry.storage.label : 'Lokal';
      return ''
        + '<button class="list-tab relation-link" type="button" data-log-slug="' + escapeHtml(entry.slug || '') + '">'
        + '<strong>' + escapeHtml(entry.folderName || entry.batchName || 'Bryggelogg') + '</strong>'
        + '<span>' + escapeHtml(entry.styleName || 'Ukjent stil') + '</span>'
        + '<small>' + escapeHtml(entry.exportedAt ? renderApi.fmtTime(entry.exportedAt) : 'Ukjent eksporttid') + ' · ' + escapeHtml(storageLabel) + '</small>'
        + '</button>';
    }).join('') + '</div>';
  }

  function renderInventorySummaryLine(groupLabel, fit) {
    if (!fit || (!fit.active && !fit.requiredCount)) {
      return '<p><span class="log-label">' + escapeHtml(groupLabel) + '</span>Ingen lagerliste oppgitt for denne gruppen.</p>';
    }

    return '<p><span class="log-label">' + escapeHtml(groupLabel) + '</span>'
      + escapeHtml(String(fit.sufficientCount || 0) + ' av ' + String(fit.requiredCount || 0) + ' ingredienser dekkes av lageret ditt.')
      + '</p>';
  }

  function renderSuggestionList(suggestions) {
    const safeSuggestions = Array.isArray(suggestions) ? suggestions : [];
    if (!safeSuggestions.length) return '';

    return '<div class="recipe-ingredients">' + safeSuggestions.map(function (suggestion) {
      const prefix = suggestion.mode === 'buy' ? 'Kjøp' : 'Bruk';
      const suffix = suggestion.url
        ? ' <a href="' + escapeHtml(suggestion.url) + '" target="_blank" rel="noopener noreferrer">åpne vare</a>'
        : '';
      return '<p><strong>' + escapeHtml(prefix + ': ' + suggestion.title) + '</strong><br>' + escapeHtml(suggestion.detail || '') + suffix + '</p>';
    }).join('') + '</div>';
  }

  function renderMissingInventoryList(items) {
    const safeItems = Array.isArray(items) ? items : [];
    if (!safeItems.length) {
      return '<p>Ingen tydelige mangler beregnet for valgt batchstørrelse.</p>';
    }

    return safeItems.map(function (item) {
      const details = item.available
        ? ('trenger ' + item.needed + ', har ' + item.available)
        : ('trenger ' + item.needed);
      return ''
        + '<article class="recipe-step">'
        + '<strong>' + escapeHtml(item.name || 'Ingrediens') + '</strong>'
        + '<p>' + escapeHtml(details) + '</p>'
        + renderSuggestionList(item.suggestions)
        + '</article>';
    }).join('');
  }

  function renderInventoryFitSection(recipe) {
    const fit = recipe && recipe.inventoryFit ? recipe.inventoryFit : null;
    if (!fit || !fit.active) {
      return '<section class="detail-section"><h3>Lagerfit</h3><div class="empty-state">Legg inn malter, humler og ønsket batchstørrelse for å se hvilke oppskrifter som faktisk passer lageret ditt.</div></section>';
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
      + '<div class="detail-section"><h3>Mangler, innkjøp og erstatninger</h3>' + renderMissingInventoryList(fit.missing) + '</div>'
      + '</section>';
  }

  function renderStorageOptions(options) {
    const safeOptions = Array.isArray(options) ? options : [];
    if (!safeOptions.length) return '';
    return '<section class="detail-section"><h3>Lagringsforslag</h3>'
      + '<div class="recipe-steps">' + safeOptions.map(function (option) {
        const link = option.shareUrl
          ? '<p><a href="' + escapeHtml(option.shareUrl) + '" target="_blank" rel="noopener noreferrer">Åpne lagringsmappe</a></p>'
          : '';
        return '<article class="recipe-step"><strong>' + escapeHtml(option.label || 'Lagring') + '</strong><p>' + escapeHtml(option.summary || '') + '</p><p>' + escapeHtml('Status: ' + (option.status || 'ukjent')) + '</p>' + link + '</article>';
      }).join('') + '</div></section>';
  }

  function renderActiveBrewLinkSection(recipe, isLinkedSelection) {
    const title = isLinkedSelection
      ? 'Denne oppskriften er koblet til aktivt brygg.'
      : 'Koble denne oppskriften til aktivt brygg før du lagrer loggen.';
    const detail = isLinkedSelection
      ? 'Neste bryggelogg som eksporteres vil bruke denne oppskriften som referanse.'
      : 'Når du klikker knappen under, brukes denne oppskriften i hydrometerdelen og følger med inn i neste bryggeloggeksport.';
    const buttonLabel = isLinkedSelection ? 'Brukes for neste logg' : 'Bruk for neste logg';

    return ''
      + '<section class="detail-section"><h3>Kobling til aktivt brygg</h3>'
      + '<article class="relation-card">'
      + '<strong>' + escapeHtml(title) + '</strong>'
      + '<span>' + escapeHtml(detail) + '</span>'
      + '<button class="action-btn subtle-action relation-action" type="button" data-link-active-recipe="' + escapeHtml(String(recipe && recipe.id || '')) + '">' + escapeHtml(buttonLabel) + '</button>'
      + '</article></section>';
  }

  function renderRecipeDetail(els, recipe, linkedLogs, isLinkedSelection, storageOptions) {
    if (!recipe) {
      els.recipeTitle.textContent = 'Velg en oppskrift';
      els.recipeSubtitle.textContent = 'Ingen oppskrift er valgt ennå.';
      els.recipePills.innerHTML = '';
      els.recipeText.innerHTML = '<div class="empty-state">Ingen oppskrift valgt ennå.</div>';
      return;
    }

    const inventoryFit = recipe.inventoryFit || null;
    const inventoryFitPct = Number.isFinite(inventoryFit && inventoryFit.ratio)
      ? Math.round(inventoryFit.ratio * 100)
      : (inventoryFit && Number.isFinite(inventoryFit.matchRatio) ? Math.round(inventoryFit.matchRatio * 100) : null);
    const recipeVolume = Number.isFinite(inventoryFit && inventoryFit.recipeVolumeLiters)
      ? inventoryFit.recipeVolumeLiters
      : parseVolumeLiters(recipe && recipe.batchVolume);
    const desiredVolume = Number.isFinite(inventoryFit && inventoryFit.desiredVolumeLiters)
      ? inventoryFit.desiredVolumeLiters
      : NaN;
    const scaleFactor = Number.isFinite(inventoryFit && inventoryFit.scaleFactor) && inventoryFit.scaleFactor > 0
      ? inventoryFit.scaleFactor
      : 1;
    const scaled = Number.isFinite(recipeVolume) && Number.isFinite(desiredVolume) && Math.abs(scaleFactor - 1) >= 0.01;

    els.recipeTitle.textContent = recipe.name || 'Oppskrift';
    els.recipeSubtitle.textContent = (recipe.style || 'Ukjent stil') + ' · ' + (recipe.providerLabel || recipe.source || 'Lokal kilde');
    els.recipePills.innerHTML = ''
      + '<div class="info-pill subtle">Rating: ' + escapeHtml(String(recipe.rating || 0)) + '</div>'
      + '<div class="info-pill subtle">Match: ' + escapeHtml(String(Math.round((recipe.matchRatio || 0) * 100))) + '%</div>'
      + (Number.isFinite(recipeVolume) ? '<div class="info-pill subtle">Laget for: ' + escapeHtml(formatBaseAmount(recipeVolume, "volume")) + '</div>' : (recipe.batchVolume ? '<div class="info-pill subtle">Batch: ' + escapeHtml(String(recipe.batchVolume)) + '</div>' : ''))
      + (scaled ? '<div class="info-pill subtle">Skalert til: ' + escapeHtml(formatBaseAmount(desiredVolume, "volume")) + '</div>' : '')
      + '<div class="info-pill subtle">Skala: ' + escapeHtml(formatNumberCompact(scaleFactor, 2) + 'x') + '</div>'
      + (isLinkedSelection ? '<div class="info-pill subtle">Brukes for neste logg</div>' : '')
      + (inventoryFit && inventoryFit.active ? '<div class="info-pill subtle">Lagerfit: ' + escapeHtml(String(inventoryFitPct)) + '%</div>' : '')
      + '<div class="info-pill subtle">Brygget som: ' + escapeHtml(String((linkedLogs || []).length)) + ' logg(er)</div>';
    els.recipeText.innerHTML = ''
      + renderActiveBrewLinkSection(recipe, isLinkedSelection)
      + '<section class="detail-section"><h3>Knyttede bryggelogger</h3>' + renderLinkedLogCards(linkedLogs) + '</section>'
      + renderScalingSection(recipe)
      + renderInventoryFitSection(recipe)
      + '<section class="detail-section"><h3>Målverdier</h3>' + renderTargets(recipe.targets) + '</section>'
      + renderIngredientGroup('Malter', recipe.ingredients && recipe.ingredients.malts, recipe)
      + renderIngredientGroup('Humle', recipe.ingredients && recipe.ingredients.hops, recipe)
      + renderIngredientGroup('Gjær', recipe.ingredients && recipe.ingredients.yeast, recipe)
      + renderIngredientGroup('Annet', recipe.ingredients && recipe.ingredients.misc, recipe)
      + '<section class="detail-section"><h3>Steg for steg</h3>' + renderSteps(recipe.steps) + '</section>'
      + (recipe.notes ? '<section class="detail-section"><h3>Notater</h3><p>' + escapeHtml(recipe.notes) + '</p></section>' : '')
      + renderStorageOptions(storageOptions);
  }

  function renderReferenceMetaChips(entry) {
    const chips = [];
    const meta = entry && entry.meta ? entry.meta : {};
    if (meta.kind) chips.push(meta.kind);
    if (meta.abv != null) chips.push('ABV ' + meta.abv);
    if (meta.ibu != null) chips.push('IBU ' + meta.ibu);
    if (meta.ebc != null) chips.push('EBC ' + meta.ebc);
    if (meta.og != null) chips.push('OG ' + meta.og);
    if (meta.fg != null) chips.push('FG ' + meta.fg);
    if (meta.volume != null) chips.push('Batch ' + meta.volume + ' L');
    if (meta.breweryType) chips.push(meta.breweryType);

    if (!chips.length) return '';
    return '<div class="reference-chip-row">' + chips.map(function (chip) {
      return '<span class="meta-chip">' + escapeHtml(chip) + '</span>';
    }).join('') + '</div>';
  }

  function renderReferenceListSection(title, items) {
    const safeItems = (Array.isArray(items) ? items : []).filter(Boolean);
    if (!safeItems.length) return '';
    return ''
      + '<section class="reference-section">'
      + '<strong>' + escapeHtml(title) + '</strong>'
      + '<ul>' + safeItems.slice(0, 8).map(function (item) {
        return '<li>' + escapeHtml(String(item)) + '</li>';
      }).join('') + '</ul>'
      + '</section>';
  }

  function renderReferenceTextSection(title, text) {
    const value = String(text || '').trim();
    if (!value) return '';
    return ''
      + '<section class="reference-section">'
      + '<strong>' + escapeHtml(title) + '</strong>'
      + '<p>' + escapeHtml(value) + '</p>'
      + '</section>';
  }

  function renderReferenceDetails(entry) {
    const meta = entry && entry.meta ? entry.meta : {};
    const bits = [];

    if (entry && entry.description) {
      bits.push(renderReferenceTextSection('Beskrivelse', entry.description));
    }
    if (meta.brewer) {
      bits.push(renderReferenceTextSection('Bryggeri', meta.brewer));
    }
    if (meta.country || meta.city || meta.state) {
      bits.push(renderReferenceTextSection('Sted', [meta.city, meta.state, meta.country].filter(Boolean).join(', ')));
    }
    if (meta.yeast) {
      bits.push(renderReferenceTextSection('Gjær', meta.yeast));
    }
    if (meta.mashTemp != null || meta.fermentationTemp != null) {
      const processBits = [];
      if (meta.mashTemp != null) {
        processBits.push('Mesk ' + meta.mashTemp + ' C' + (meta.mashDuration != null ? (' i ' + meta.mashDuration + ' min') : ''));
      }
      if (meta.fermentationTemp != null) {
        processBits.push('Gjæring rundt ' + meta.fermentationTemp + ' C');
      }
      bits.push(renderReferenceTextSection('Prosess', processBits.join(' · ')));
    }
    if (meta.brewersTips) {
      bits.push(renderReferenceTextSection('Bryggertips', meta.brewersTips));
    }
    if (Array.isArray(meta.variants) && meta.variants.length) {
      bits.push(renderReferenceListSection('Varianter', meta.variants.map(function (variant) {
        return variant && variant.name ? variant.name : '';
      })));
    }
    if (Array.isArray(meta.malt) && meta.malt.length) {
      bits.push(renderReferenceListSection('Malt', meta.malt));
    }
    if (Array.isArray(meta.hops) && meta.hops.length) {
      bits.push(renderReferenceListSection('Humle', meta.hops));
    }
    if (Array.isArray(meta.foodPairing) && meta.foodPairing.length) {
      bits.push(renderReferenceListSection('Passer til', meta.foodPairing));
    }
    if (Array.isArray(meta.brewhouse) && meta.brewhouse.length) {
      bits.push(renderReferenceListSection('Substitusjon i kok', meta.brewhouse));
    }
    if (Array.isArray(meta.dryHopping) && meta.dryHopping.length) {
      bits.push(renderReferenceListSection('Substitusjon i tørrhumling', meta.dryHopping));
    }
    if (meta.docs) {
      bits.push(renderReferenceTextSection('Dokumentasjon', meta.docs));
    }

    return bits.join('');
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
        + renderReferenceMetaChips(entry)
        + renderReferenceDetails(entry)
        + (entry.url ? '<a class="reference-action" href="' + escapeHtml(entry.url) + '" target="_blank" rel="noopener noreferrer">Åpne kilde</a>' : '')
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

    function resolveRecipeById(recipeId) {
      const id = String(recipeId || '');
      return (state.recipeResults || []).find(function (entry) { return entry.id === id; })
        || (state.recipes || []).find(function (entry) { return entry.id === id; })
        || null;
    }

    function setLinkedRecipe(recipe) {
      if (!recipe) {
        state.linkedRecipe = null;
        return;
      }
      const canonical = (state.recipes || []).find(function (entry) {
        return recipeMatchesRef(entry, recipe);
      }) || recipe;
      state.selectedRecipeId = canonical.id || recipe.id || '';
      state.linkedRecipe = canonical;
    }

    function wireRecipeButtons() {
      Array.from(els.recipeList.querySelectorAll('[data-id]')).forEach(function (button) {
        button.addEventListener('click', function () {
          const recipe = resolveRecipeById(button.getAttribute('data-id') || '');
          setLinkedRecipe(recipe);
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

    function wireActiveRecipeLinkButton() {
      const button = els.recipeText.querySelector('[data-link-active-recipe]');
      if (!button) return;
      button.addEventListener('click', function () {
        const recipe = resolveRecipeById(button.getAttribute('data-link-active-recipe') || state.selectedRecipeId);
        setLinkedRecipe(recipe);
        renderRecipeList(els, state);
        loadSelectedRecipe();
        onRecipeChange();
      });
    }

    function buildServerQuery(filters) {
      const tokens = [];
      (filters.malts || []).forEach(function (item) { tokens.push(item.name || item.raw || ''); });
      (filters.hops || []).forEach(function (item) { tokens.push(item.name || item.raw || ''); });
      if (filters.miscQuery) tokens.push(filters.miscQuery);
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
        return Object.assign({}, recipe, {
          inventoryFit: buildInventoryFit(recipe, filters, state)
        });
      }).filter(function (recipe) {
        return !hasTextQuery || recipeContainsQuery(recipe, filters.miscQuery);
      }).sort(function (a, b) {
        const aFit = a.inventoryFit || {};
        const bFit = b.inventoryFit || {};
        const aRatio = Number.isFinite(aFit.ratio) ? aFit.ratio : (Number.isFinite(aFit.matchRatio) ? aFit.matchRatio : -1);
        const bRatio = Number.isFinite(bFit.ratio) ? bFit.ratio : (Number.isFinite(bFit.matchRatio) ? bFit.matchRatio : -1);
        if (hasInventory && bRatio !== aRatio) return bRatio - aRatio;
        if ((bFit.sufficientCount || 0) !== (aFit.sufficientCount || 0)) return (bFit.sufficientCount || 0) - (aFit.sufficientCount || 0);
        if ((aFit.missing || []).length !== (bFit.missing || []).length) return (aFit.missing || []).length - (bFit.missing || []).length;
        if ((b.matchRatio || 0) !== (a.matchRatio || 0)) return (b.matchRatio || 0) - (a.matchRatio || 0);
        if ((a.sortIndex || 999999) !== (b.sortIndex || 999999)) return (a.sortIndex || 999999) - (b.sortIndex || 999999);
        if ((b.rating || 0) !== (a.rating || 0)) return (b.rating || 0) - (a.rating || 0);
        return String(a.name || '').localeCompare(String(b.name || ''), 'nb');
      });

      if (!state.recipeResults.length) {
        state.selectedRecipeId = '';
      } else if (state.selectedRecipeId && !state.recipeResults.some(function (recipe) { return recipe.id === state.selectedRecipeId; })) {
        state.selectedRecipeId = state.recipeResults[0] ? state.recipeResults[0].id : '';
      } else if (!state.selectedRecipeId && state.recipeResults[0]) {
        state.selectedRecipeId = state.recipeResults[0].id;
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
        state.recipeCatalogs = payload.catalogs || null;
        state.storageOptions = Array.isArray(payload.storageOptions) ? payload.storageOptions : [];

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
        renderProviderPills(els.recipeProviderPills, state.recipeProviders, state);
        renderRecipeList(els, state);
        wireRecipeButtons();
        await loadSelectedRecipe();
        onRecipeChange();
      } catch (error) {
        if (els.recipeSearchMeta) {
          els.recipeSearchMeta.textContent = 'Oppskriftsvisningen kunne ikke lastes akkurat nå.';
        }
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
          // keep recipe rendering even if linked logs could not be loaded
        }
      }

      const linkedLogs = recipe ? findLinkedLogs(state.logs, recipe) : [];
      const linkedToActiveBatch = recipe && state.linkedRecipe ? recipeMatchesRef(recipe, state.linkedRecipe) : false;
      renderRecipeDetail(els, recipe, linkedLogs, linkedToActiveBatch, state.storageOptions);
      wireLinkedLogButtons();
      wireActiveRecipeLinkButton();
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
        renderProviderPills(els.recipeProviderPills, referencePayload.providers || state.recipeProviders, state);
        if (Array.isArray(referencePayload.storageOptions) && referencePayload.storageOptions.length) {
          state.storageOptions = referencePayload.storageOptions;
        }
        els.referenceMeta.textContent = query
          ? ('Eksterne treff for ' + query + ' vises under som innebygde kort.')
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

    async function rerenderScaledRecipeView() {
      if (!Array.isArray(state.recipes) || !state.recipes.length) {
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
    els.recipeVolumeInput.addEventListener('input', function () {
      rerenderScaledRecipeView();
    });

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
