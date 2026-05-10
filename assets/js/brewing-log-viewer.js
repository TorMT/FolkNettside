(function (global) {
  'use strict';

  const tools = global.BrewingLogTools;
  const renderApi = global.BrewingHydrometerRender;

  function escapeHtml(value) {
    return renderApi.escapeHtml(value);
  }

  function fmtTime(value) {
    return renderApi.fmtTime(value);
  }

  function buildMetricCards(metrics) {
    const entries = Object.entries(metrics || {});
    if (!entries.length) {
      return '<div class="empty-state">Ingen lagrede metrics i denne loggen.</div>';
    }

    return '<div class="metric-mini-grid">' + entries.map(function (entry) {
      return '<article class="metric-mini"><strong>' + escapeHtml(entry[0]) + '</strong><span>' + escapeHtml(entry[1]) + '</span></article>';
    }).join('') + '</div>';
  }

  function buildSummarySection(summary) {
    const entries = Object.entries(summary || {});
    if (!entries.length) {
      return '<div class="empty-state">Ingen oppsummering lagret i denne loggen.</div>';
    }

    return entries.map(function (entry) {
      return '<p><span class="log-label">' + escapeHtml(entry[0]) + '</span>' + escapeHtml(entry[1]) + '</p>';
    }).join('');
  }

  function buildAlertSection(alerts) {
    if (!Array.isArray(alerts) || !alerts.length) {
      return '<div class="empty-state">Ingen varsler lagret i denne loggen.</div>';
    }

    return alerts.map(function (alert) {
      return ''
        + '<article class="alert-card ' + escapeHtml(alert.severity || 'info') + '">'
        + '<strong>' + escapeHtml(alert.title || 'Varsel') + '</strong>'
        + '<p>' + escapeHtml(alert.summary || '') + '</p>'
        + (alert.actionSummary ? '<p><span class="log-label">Tiltak</span>' + escapeHtml(alert.actionSummary) + '</p>' : '')
        + '</article>';
    }).join('');
  }

  function buildRecipeSection(recipeRef) {
    if (!recipeRef || (!recipeRef.id && !recipeRef.name)) {
      return '<div class="empty-state">Ingen oppskrift er knyttet til denne loggen ennÃ¥.</div>';
    }

    return ''
      + '<article class="relation-card">'
      + '<strong>' + escapeHtml(recipeRef.name || 'Oppskrift') + '</strong>'
      + '<span>' + escapeHtml(recipeRef.style || 'Ukjent stil') + ' Â· ' + escapeHtml(recipeRef.providerLabel || recipeRef.source || 'Lokal') + '</span>'
      + '<button class="action-btn subtle-action relation-action" type="button" data-recipe-nav="1">Aapne oppskrift</button>'
      + '</article>';
  }

  function buildRecipeRelationCard(recipeRef) {
    if (!recipeRef || (!recipeRef.id && !recipeRef.name)) {
      return '<div class="empty-state">Ingen oppskrift er knyttet til denne loggen enna.</div>';
    }

    return ''
      + '<article class="relation-card">'
      + '<strong>' + escapeHtml(recipeRef.name || 'Oppskrift') + '</strong>'
      + '<span>' + escapeHtml(recipeRef.style || 'Ukjent stil') + ' - ' + escapeHtml(recipeRef.providerLabel || recipeRef.source || 'Lokal') + '</span>'
      + '<button class="action-btn subtle-action relation-action" type="button" data-recipe-nav="1">Aapne oppskrift</button>'
      + '</article>';
  }

  function buildImageGrid(images) {
    if (!Array.isArray(images) || !images.length) {
      return '<div class="empty-state">Ingen bilder funnet ennå.</div>';
    }

    return images.map(function (image) {
      return ''
        + '<figure class="image-card">'
        + '<img src="' + escapeHtml(image.url || '') + '" alt="' + escapeHtml(image.name || 'Bryggebilde') + '" loading="lazy">'
        + '<figcaption>' + escapeHtml(image.name || '') + '</figcaption>'
        + '</figure>';
    }).join('');
  }

  function renderLogList(els, state, logs) {
    if (!Array.isArray(logs) || !logs.length) {
      els.brewLogList.innerHTML = '<div class="empty-state">Ingen lagrede bryggelogger funnet i mappen ennå.</div>';
      return;
    }

    els.brewLogList.innerHTML = logs.map(function (entry) {
      return ''
        + '<button class="list-tab ' + (entry.slug === state.selectedLogSlug ? 'active' : '') + '" type="button" data-slug="' + escapeHtml(entry.slug) + '">'
        + '<strong>' + escapeHtml(entry.folderName || entry.batchName || 'Bryggelogg') + '</strong>'
        + '<span>' + escapeHtml(entry.styleName || 'Ukjent stil') + '</span>'
        + '<small>' + escapeHtml(entry.exportedAt ? fmtTime(entry.exportedAt) : 'Ukjent eksporttid') + ' · ' + Number(entry.imageCount || 0) + ' bilder</small>'
        + '</button>';
    }).join('');
  }

  function renderLogDetail(els, data) {
    const log = data && data.log ? data.log : null;
    const images = Array.isArray(data && data.images) ? data.images : [];
    if (!log) {
      els.brewLogTitle.textContent = 'Velg en bryggelogg';
      els.brewLogSubtitle.textContent = 'Ingen logg er valgt ennå.';
      els.brewLogPills.innerHTML = '';
      els.brewLogText.innerHTML = '<div class="empty-state">Ingen bryggelogg valgt ennå.</div>';
      els.brewLogImages.innerHTML = '<div class="empty-state">Ingen bilder funnet ennå.</div>';
      els.brewLogImageMeta.textContent = 'Legg bilder i samme bryggemappe for å få dem vist her.';
      return;
    }

    els.brewLogTitle.textContent = log.folderName || log.batchName || 'Bryggelogg';
    els.brewLogSubtitle.textContent = (log.styleName || 'Ukjent stil') + ' · eksportert ' + fmtTime(log.exportedAt);
    els.brewLogPills.innerHTML = ''
      + (log.deviceName ? '<div class="info-pill subtle">Enhet: ' + escapeHtml(log.deviceName) + '</div>' : '')
      + (log.profileName ? '<div class="info-pill subtle">Profil: ' + escapeHtml(log.profileName) + '</div>' : '')
      + (log.periodLabel ? '<div class="info-pill subtle">Vindu: ' + escapeHtml(log.periodLabel) + '</div>' : '')
      + (log.recipeRef && (log.recipeRef.name || log.recipeRef.id) ? '<div class="info-pill subtle">Oppskrift: ' + escapeHtml(log.recipeRef.name || 'Koblet oppskrift') + '</div>' : '');
    els.brewLogText.innerHTML = ''
      + '<section class="detail-section"><h3>Koblet oppskrift</h3>' + buildRecipeRelationCard(log.recipeRef) + '</section>'
      + '<section class="detail-section"><h3>Lagrede metrics</h3>' + buildMetricCards(log.metrics) + '</section>'
      + '<section class="detail-section"><h3>Gjæringslogg</h3>' + buildSummarySection(log.summary) + '</section>'
      + '<section class="detail-section"><h3>Varsler</h3>' + buildAlertSection(log.alerts) + '</section>';
    els.brewLogImages.innerHTML = buildImageGrid(images);
    els.brewLogImageMeta.textContent = images.length ? (images.length + ' bilder funnet i bryggemappen.') : 'Ingen bilder funnet i bryggemappen.';
  }

  function createModule(config) {
    const els = config.elements;
    const state = config.state;
    const onRecipeNavigate = typeof config.onRecipeNavigate === 'function' ? config.onRecipeNavigate : null;

    function wireRelationActions(recipeRef) {
      const recipeButton = els.brewLogText.querySelector('[data-recipe-nav]');
      if (recipeButton && onRecipeNavigate && recipeRef) {
        recipeButton.addEventListener('click', function () {
          onRecipeNavigate(recipeRef);
        });
      }
    }

    async function refreshList() {
      els.brewLogList.innerHTML = '<div class="loading">Laster lokale bryggelogger...</div>';
      try {
        const payload = await tools.fetchLogIndex();
        state.logs = Array.isArray(payload.logs) ? payload.logs : [];
        if (!state.selectedLogSlug && state.logs[0]) {
          state.selectedLogSlug = state.logs[0].slug || '';
        }
        renderLogList(els, state, state.logs);
        Array.from(els.brewLogList.querySelectorAll('[data-slug]')).forEach(function (button) {
          button.addEventListener('click', function () {
            state.selectedLogSlug = button.getAttribute('data-slug') || '';
            renderLogList(els, state, state.logs);
            loadSelectedLog();
          });
        });
        await loadSelectedLog();
      } catch (error) {
        els.brewLogList.innerHTML = '<div class="empty-state">Klarte ikke lese bryggelogger: ' + escapeHtml(error.message) + '</div>';
      }
    }

    async function loadSelectedLog() {
      if (!state.selectedLogSlug) {
        renderLogDetail(els, null);
        return null;
      }

      try {
        const detail = await tools.fetchLogDetail(state.selectedLogSlug);
        renderLogDetail(els, detail);
        wireRelationActions(detail && detail.log ? detail.log.recipeRef : null);
        return detail;
      } catch (error) {
        els.brewLogText.innerHTML = '<div class="empty-state">Klarte ikke åpne loggen: ' + escapeHtml(error.message) + '</div>';
      }
    }

    async function selectLog(slug) {
      const targetSlug = String(slug || '').trim();
      if (!targetSlug) return false;
      state.selectedLogSlug = targetSlug;

      if (!Array.isArray(state.logs) || !state.logs.length || !state.logs.some(function (entry) { return entry.slug === targetSlug; })) {
        await refreshList();
      } else {
        renderLogList(els, state, state.logs);
        await loadSelectedLog();
      }

      return Array.isArray(state.logs) && state.logs.some(function (entry) { return entry.slug === targetSlug; });
    }

    function updateExportHint() {
      const batchName = (els.batchNameInput.value || state.batchName || 'Brygg').trim();
      const folder = tools.buildFolderName(batchName, new Date());
      state.batchName = batchName;
      state.folderName = folder;
      els.exportHintPill.textContent = 'Eksportmappe: ' + folder;
    }

    async function exportCurrent() {
      const payload = config.getExportPayload();
      if (!payload) {
        els.exportHintPill.textContent = 'Eksportmappe: ingen aktiv hydrometeranalyse å lagre';
        return;
      }

      updateExportHint();
      payload.batchName = state.batchName;
      payload.folderName = state.folderName;

      try {
        els.downloadLogBtn.disabled = true;
        els.downloadLogBtn.textContent = 'Pakker eksport...';
        const filename = await tools.exportLog(payload);
        els.exportHintPill.textContent = 'Eksportert: ' + filename;
        refreshList();
      } catch (error) {
        els.exportHintPill.textContent = 'Eksport feilet: ' + error.message;
      } finally {
        els.downloadLogBtn.disabled = false;
        els.downloadLogBtn.textContent = 'Lagre bryggelogg';
      }
    }

    els.batchNameInput.addEventListener('input', updateExportHint);
    els.downloadLogBtn.addEventListener('click', exportCurrent);
    els.refreshLogsBtn.addEventListener('click', refreshList);
    updateExportHint();

    return {
      loadSelectedLog: loadSelectedLog,
      refreshList: refreshList,
      selectLog: selectLog,
      updateExportHint: updateExportHint,
    };
  }

  global.BrewingLogViewer = {
    createModule: createModule
  };
}(window));
