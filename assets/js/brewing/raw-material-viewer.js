(function (global) {
  'use strict';

  const renderApi = global.BrewingHydrometerRender;
  const normalizeUiText = typeof global.normalizeUiText === 'function'
    ? global.normalizeUiText
    : function (value) { return String(value == null ? '' : value); };

  function escapeHtml(value) {
    return renderApi.escapeHtml(value);
  }

  function normalizeToken(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function formatRange(low, high, suffix) {
    const min = Number(low);
    const max = Number(high);
    if (Number.isFinite(min) && Number.isFinite(max)) {
      return min === max ? (String(min) + suffix) : (String(min) + '-' + String(max) + suffix);
    }
    if (Number.isFinite(min)) return String(min) + suffix;
    if (Number.isFinite(max)) return String(max) + suffix;
    return '--';
  }

  function uniqueByKey(items) {
    const map = new Map();
    (Array.isArray(items) ? items : []).forEach(function (item) {
      const key = String(item && item.key || '');
      if (!key || map.has(key)) return;
      map.set(key, item);
    });
    return Array.from(map.values());
  }

  function getCatalogItems(state, type) {
    const catalogs = state && state.recipeCatalogs ? state.recipeCatalogs : {};
    const shop = catalogs.shop || {};
    const hopDatabase = catalogs.hopDatabase || {};

    if (type === 'hop') {
      const shopHops = Array.isArray(shop.hops) ? shop.hops : [];
      const dbHops = Array.isArray(hopDatabase.hops) ? hopDatabase.hops : [];
      const dbMap = new Map(dbHops.map(function (item) {
        return [String(item && item.key || ''), item];
      }));

      return uniqueByKey(shopHops.concat(dbHops).map(function (item) {
        const key = String(item && item.key || '');
        const dbItem = dbMap.get(key) || null;
        return Object.assign({}, dbItem || {}, item || {}, {
          type: 'hop',
          key: key || normalizeToken(item && item.name),
          name: (item && (item.displayName || item.name)) || (dbItem && dbItem.name) || 'Humle',
          aroma: item && item.aroma ? item.aroma : (dbItem && dbItem.aroma) || '',
          country: item && item.country ? item.country : (dbItem && dbItem.country) || '',
          provider: (item && item.url) ? 'Ølbrygging' : 'HopDatabase',
          url: (item && item.url) || (dbItem && dbItem.url) || '',
          brewhouse: (dbItem && dbItem.brewhouse) || [],
          dryHopping: (dbItem && dbItem.dryHopping) || []
        });
      })).sort(function (a, b) {
        return String(a.name || '').localeCompare(String(b.name || ''), 'nb');
      });
    }

    return uniqueByKey((Array.isArray(shop.malts) ? shop.malts : []).map(function (item) {
      return Object.assign({}, item, {
        type: 'malt',
        provider: 'Ølbrygging'
      });
    })).sort(function (a, b) {
      return String(a.name || '').localeCompare(String(b.name || ''), 'nb');
    });
  }

  function findByKey(items, key) {
    const target = String(key || '');
    return (Array.isArray(items) ? items : []).find(function (item) {
      return String(item && item.key || '') === target;
    }) || null;
  }

  function filterItems(items, query) {
    const needle = normalizeToken(query);
    if (!needle) return items;
    return (Array.isArray(items) ? items : []).filter(function (item) {
      const haystack = normalizeToken([
        item && item.name,
        item && item.baseName,
        item && item.country,
        item && item.aroma,
        Array.isArray(item && item.variants) ? item.variants.join(' ') : ''
      ].join(' '));
      return haystack.indexOf(needle) !== -1;
    });
  }

  function buildCompareOptions(select, items, selectedKey, compareKey) {
    if (!select) return;
    select.innerHTML = '<option value="">Ingen valgt</option>' + (Array.isArray(items) ? items : []).map(function (item) {
      const key = String(item && item.key || '');
      if (!key || key === selectedKey) return '';
      const selected = key === compareKey ? ' selected' : '';
      return '<option value="' + escapeHtml(key) + '"' + selected + '>' + escapeHtml(normalizeUiText(item.name || 'Råvare')) + '</option>';
    }).join('');
  }

  function renderList(els, state, items) {
    const filteredItems = filterItems(items, state.rawMaterialQuery);
    if (!filteredItems.length) {
      els.rawMaterialList.innerHTML = '<div class="empty-state">Ingen råvarer matcher søket ennå.</div>';
      return filteredItems;
    }

    if (!findByKey(filteredItems, state.selectedRawMaterialKey)) {
      state.selectedRawMaterialKey = String(filteredItems[0].key || '');
    }

    els.rawMaterialList.innerHTML = filteredItems.map(function (item) {
      const isActive = String(item.key || '') === String(state.selectedRawMaterialKey || '');
      const statText = item.type === 'malt'
        ? ('EBC ' + formatRange(item.ebcLow, item.ebcHigh, ''))
        : ('AA ' + formatRange(item.alphaLow, item.alphaHigh, '%'));
      const secondaryText = item.type === 'malt'
        ? normalizeUiText((item.variants && item.variants[0]) || item.provider || '')
        : normalizeUiText(item.country || item.aroma || item.provider || '');
      return ''
        + '<button class="list-tab raw-material-tab ' + (isActive ? 'active' : '') + '" type="button" data-raw-key="' + escapeHtml(item.key) + '">'
        + '<strong>' + escapeHtml(normalizeUiText(item.name || 'Råvare')) + '</strong>'
        + '<span>' + escapeHtml(statText) + '</span>'
        + '<small>' + escapeHtml(secondaryText) + '</small>'
        + '</button>';
    }).join('');

    return filteredItems;
  }

  function renderPills(els, item, compareItem) {
    if (!item) {
      els.rawMaterialPills.innerHTML = '';
      return;
    }

    const primaryStat = item.type === 'malt'
      ? ('EBC: ' + formatRange(item.ebcLow, item.ebcHigh, ''))
      : ('AA: ' + formatRange(item.alphaLow, item.alphaHigh, '%'));

    els.rawMaterialPills.innerHTML = ''
      + '<div class="info-pill subtle">Type: ' + escapeHtml(item.type === 'malt' ? 'Malt' : 'Humle') + '</div>'
      + '<div class="info-pill subtle">' + escapeHtml(primaryStat) + '</div>'
      + (item.country ? '<div class="info-pill subtle">Land: ' + escapeHtml(normalizeUiText(item.country)) + '</div>' : '')
      + (compareItem ? '<div class="info-pill subtle">Sammenlignes med: ' + escapeHtml(normalizeUiText(compareItem.name || 'Råvare')) + '</div>' : '');
  }

  function renderVariants(item) {
    const variants = Array.isArray(item && item.variants) ? item.variants.filter(Boolean) : [];
    if (!variants.length) return '<div class="empty-state">Ingen variantliste lagret.</div>';
    return '<div class="recipe-ingredients">' + variants.slice(0, 8).map(function (variant) {
      return '<article class="ingredient-row"><strong>' + escapeHtml(normalizeUiText(variant)) + '</strong></article>';
    }).join('') + '</div>';
  }

  function renderSuggestions(title, values) {
    const safeValues = (Array.isArray(values) ? values : []).filter(Boolean);
    if (!safeValues.length) return '';
    return ''
      + '<section class="detail-section"><h3>' + escapeHtml(title) + '</h3>'
      + '<div class="recipe-ingredients">' + safeValues.slice(0, 8).map(function (value) {
        return '<article class="ingredient-row"><strong>' + escapeHtml(normalizeUiText(value)) + '</strong></article>';
      }).join('') + '</div></section>';
  }

  function renderDetail(els, item, compareItem) {
    if (!item) {
      els.rawMaterialTitle.textContent = 'Velg en råvare';
      els.rawMaterialSubtitle.textContent = 'Sammenligning og kjøpsinfo vises her.';
      els.rawMaterialDetail.innerHTML = '<div class="empty-state">Ingen råvare valgt ennå.</div>';
      els.rawMaterialCompareMeta.textContent = 'Velg en råvare til for å se side om side.';
      els.rawMaterialCompareGrid.innerHTML = '<div class="empty-state">Ingen sammenligning aktiv ennå.</div>';
      return;
    }

    const primaryMetric = item.type === 'malt'
      ? ('EBC ' + formatRange(item.ebcLow, item.ebcHigh, ''))
      : ('AA ' + formatRange(item.alphaLow, item.alphaHigh, '%'));
    const providerText = item.url ? 'Kjøpslenke tilgjengelig' : (item.provider || 'Referanse');

    els.rawMaterialTitle.textContent = normalizeUiText(item.name || 'Råvare');
    els.rawMaterialSubtitle.textContent = normalizeUiText(providerText);
    renderPills(els, item, compareItem);

    els.rawMaterialDetail.innerHTML = ''
      + '<section class="detail-section"><h3>Oversikt</h3>'
      + '<p><span class="log-label">Primærdata</span>' + escapeHtml(primaryMetric) + '</p>'
      + '<p><span class="log-label">Kilde</span>' + escapeHtml(normalizeUiText(item.provider || '--')) + '</p>'
      + (item.country ? '<p><span class="log-label">Land</span>' + escapeHtml(normalizeUiText(item.country)) + '</p>' : '')
      + (item.aroma ? '<p><span class="log-label">Aroma</span>' + escapeHtml(normalizeUiText(item.aroma)) + '</p>' : '')
      + (item.url ? '<p><a class="reference-action" href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener noreferrer">Åpne vare hos Ølbrygging</a></p>' : '')
      + '</section>'
      + '<section class="detail-section"><h3>Varianter</h3>' + renderVariants(item) + '</section>'
      + renderSuggestions('Substitusjon i kok', item.brewhouse)
      + renderSuggestions('Substitusjon i tørrhumling', item.dryHopping);

    if (!compareItem) {
      els.rawMaterialCompareMeta.textContent = 'Velg en råvare til for å se side om side.';
      els.rawMaterialCompareGrid.innerHTML = '<div class="empty-state">Ingen sammenligning aktiv ennå.</div>';
      return;
    }

    els.rawMaterialCompareMeta.textContent = 'Sammenligner ' + normalizeUiText(item.name || 'råvare') + ' mot ' + normalizeUiText(compareItem.name || 'råvare') + '.';
    els.rawMaterialCompareGrid.innerHTML = [item, compareItem].map(function (entry) {
      const metricText = entry.type === 'malt'
        ? ('EBC ' + formatRange(entry.ebcLow, entry.ebcHigh, ''))
        : ('AA ' + formatRange(entry.alphaLow, entry.alphaHigh, '%'));
      return ''
        + '<article class="reference-card">'
        + '<div class="reference-body">'
        + '<strong>' + escapeHtml(normalizeUiText(entry.name || 'Råvare')) + '</strong>'
        + '<span>' + escapeHtml(metricText) + '</span>'
        + '<span>' + escapeHtml(normalizeUiText(entry.country || entry.aroma || entry.provider || '')) + '</span>'
        + (entry.url ? '<a class="reference-action" href="' + escapeHtml(entry.url) + '" target="_blank" rel="noopener noreferrer">Åpne vare</a>' : '')
        + '</div></article>';
    }).join('');
  }

  function createModule(config) {
    const els = config.elements;
    const state = config.state;
    const ensureCatalogs = typeof config.ensureCatalogs === 'function' ? config.ensureCatalogs : async function () {};

    function wireList(items) {
      Array.from(els.rawMaterialList.querySelectorAll('[data-raw-key]')).forEach(function (button) {
        button.addEventListener('click', function () {
          state.selectedRawMaterialKey = button.getAttribute('data-raw-key') || '';
          refreshFromState(items);
        });
      });
    }

    function refreshFromState(items) {
      const filteredItems = renderList(els, state, items);
      const selected = findByKey(filteredItems, state.selectedRawMaterialKey) || filteredItems[0] || null;
      if (selected) {
        state.selectedRawMaterialKey = String(selected.key || '');
      }
      if (state.compareRawMaterialKey && state.compareRawMaterialKey === state.selectedRawMaterialKey) {
        state.compareRawMaterialKey = '';
      }
      buildCompareOptions(els.rawMaterialCompareSelect, filteredItems, state.selectedRawMaterialKey, state.compareRawMaterialKey);
      renderDetail(els, selected, findByKey(filteredItems, state.compareRawMaterialKey));
      wireList(filteredItems);
      if (els.rawMaterialMeta) {
        els.rawMaterialMeta.textContent = filteredItems.length + ' ' + (state.rawMaterialType === 'malt' ? 'malter' : 'humler') + ' i visningen.';
      }
    }

    async function refresh() {
      els.rawMaterialList.innerHTML = '<div class="loading">Laster råvarer...</div>';
      if (els.rawMaterialTypeSelect) els.rawMaterialTypeSelect.value = state.rawMaterialType || 'malt';
      if (els.rawMaterialSearchInput && els.rawMaterialSearchInput.value !== state.rawMaterialQuery) {
        els.rawMaterialSearchInput.value = state.rawMaterialQuery || '';
      }
      await ensureCatalogs();
      const items = getCatalogItems(state, state.rawMaterialType);
      refreshFromState(items);
    }

    if (els.rawMaterialTypeSelect) {
      els.rawMaterialTypeSelect.addEventListener('change', function () {
        state.rawMaterialType = els.rawMaterialTypeSelect.value || 'malt';
        state.selectedRawMaterialKey = '';
        state.compareRawMaterialKey = '';
        refresh();
      });
    }

    if (els.rawMaterialSearchInput) {
      els.rawMaterialSearchInput.addEventListener('input', function () {
        state.rawMaterialQuery = els.rawMaterialSearchInput.value || '';
        refresh();
      });
    }

    if (els.rawMaterialCompareSelect) {
      els.rawMaterialCompareSelect.addEventListener('change', function () {
        state.compareRawMaterialKey = els.rawMaterialCompareSelect.value || '';
        refresh();
      });
    }

    return {
      refresh: refresh
    };
  }

  global.BrewingRawMaterialViewer = {
    createModule: createModule
  };
}(window));
