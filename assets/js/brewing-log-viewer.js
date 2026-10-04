(function (global) {
  'use strict';

  const tools = global.BrewingLogTools;
  const renderApi = global.BrewingHydrometerRender;
  const driveApi = global.BrewingGoogleDrive;

  function escapeHtml(value) {
    return renderApi.escapeHtml(value);
  }

  function fmtTime(value) {
    return renderApi.fmtTime(value);
  }

  function normalizeStorageMode(mode) {
    return ['local', 'hybrid', 'google-drive'].indexOf(String(mode || '')) !== -1
      ? String(mode || '')
      : 'local';
  }

  function storageModeLabel(mode) {
    if (mode === 'google-drive') return 'Google Drive';
    if (mode === 'hybrid') return 'Hybrid';
    return 'Lokal';
  }

  function buildMetricCards(metrics) {
    const entries = Object.entries(metrics || {});
    if (!entries.length) {
      return '<div class="empty-state">Ingen lagrede nøkkeltall i denne loggen.</div>';
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

  function buildRecipeRelationCard(recipeRef) {
    if (!recipeRef || (!recipeRef.id && !recipeRef.name)) {
      return '<div class="empty-state">Ingen oppskrift er knyttet til denne loggen ennå.</div>';
    }

    return ''
      + '<article class="relation-card">'
      + '<strong>' + escapeHtml(recipeRef.name || 'Oppskrift') + '</strong>'
      + '<span>' + escapeHtml(recipeRef.style || 'Ukjent stil') + ' · ' + escapeHtml(recipeRef.providerLabel || recipeRef.source || 'Lokal') + '</span>'
      + '<button class="action-btn subtle-action relation-action" type="button" data-recipe-nav="1">Åpne oppskrift</button>'
      + '</article>';
  }

  function buildStorageSection(log, folderUrl) {
    const storage = log && log.storage ? log.storage : null;
    if (!storage) {
      return '<div class="empty-state">Ingen lagringsmetadata er lagret ennå.</div>';
    }

    const driveUrl = storage.googleDrive && storage.googleDrive.shareUrl ? storage.googleDrive.shareUrl : '';
    const localUrl = storage.local && storage.local.folderUrl ? storage.local.folderUrl : folderUrl;
    const lastSyncedAt = storage.googleDrive && storage.googleDrive.lastSyncedAt ? storage.googleDrive.lastSyncedAt : '';
    const syncLine = lastSyncedAt
      ? '<p><span class="log-label">Sist synket</span>' + escapeHtml(fmtTime(lastSyncedAt)) + '</p>'
      : '';

    return ''
      + '<article class="relation-card">'
      + '<strong>' + escapeHtml(storage.label || storageModeLabel(storage.mode)) + '</strong>'
      + '<span>' + escapeHtml(storage.summary || '') + '</span>'
      + syncLine
      + (localUrl ? '<a class="action-btn subtle-action relation-action" href="' + escapeHtml(localUrl) + '" target="_blank" rel="noopener noreferrer">Åpne lokal mappe</a>' : '')
      + (driveUrl ? '<a class="action-btn subtle-action relation-action" href="' + escapeHtml(driveUrl) + '" target="_blank" rel="noopener noreferrer">Åpne Drive-mappe</a>' : '')
      + '</article>';
  }

  function buildImageGrid(images, storage) {
    const safeImages = Array.isArray(images) ? images : [];
    const driveUrl = storage && storage.googleDrive && storage.googleDrive.shareUrl ? storage.googleDrive.shareUrl : '';

    if (!safeImages.length) {
      if (driveUrl) {
        return ''
          + '<article class="relation-card">'
          + '<strong>Ingen lokale bilder funnet</strong>'
          + '<span>Bildene ser ut til å ligge i Google Drive eller er ikke lagret lokalt ennå.</span>'
          + '<a class="action-btn subtle-action relation-action" href="' + escapeHtml(driveUrl) + '" target="_blank" rel="noopener noreferrer">Åpne Drive-mappe</a>'
          + '</article>';
      }
      return '<div class="empty-state">Ingen bilder funnet ennå.</div>';
    }

    const gallery = safeImages.map(function (image) {
      return ''
        + '<figure class="image-card">'
        + '<img src="' + escapeHtml(image.url || '') + '" alt="' + escapeHtml(image.name || 'Bryggebilde') + '" loading="lazy">'
        + '<figcaption>' + escapeHtml(image.name || '') + '</figcaption>'
        + '</figure>';
    }).join('');

    if (!driveUrl) {
      return gallery;
    }

    return gallery + ''
      + '<article class="relation-card image-link-card">'
      + '<strong>Ekstern bildemappe</strong>'
      + '<span>Du kan også holde tunge bildefiler i Google Drive og bruke denne siden som lett viewer og metadata-speil.</span>'
      + '<a class="action-btn subtle-action relation-action" href="' + escapeHtml(driveUrl) + '" target="_blank" rel="noopener noreferrer">Åpne Drive-mappe</a>'
      + '</article>';
  }

  function renderStorageOptionsNote(els, options) {
    if (!els.logStorageOptions) return;
    const safeOptions = Array.isArray(options) ? options : [];
    if (!safeOptions.length) {
      els.logStorageOptions.textContent = 'Lagringsvalg: ingen anbefalinger lastet ennå.';
      return;
    }

    const activeOption = safeOptions.find(function (option) {
      return option && option.status && option.status !== 'ikke konfigurert';
    }) || safeOptions[0];

    els.logStorageOptions.textContent = 'Lagringsvalg: '
      + (activeOption && activeOption.label ? activeOption.label : 'Lagring')
      + ' · '
      + (activeOption && activeOption.summary ? activeOption.summary : '');
  }

  function renderStorageHint(els, config, selectedLog) {
    if (!els.storageHintPill) return;
    const mode = normalizeStorageMode(
      selectedLog && selectedLog.storage && selectedLog.storage.mode
        ? selectedLog.storage.mode
        : (config && config.defaultMode)
    );
    const driveUrl = (selectedLog && selectedLog.storage && selectedLog.storage.googleDrive && selectedLog.storage.googleDrive.shareUrl)
      || (config && config.googleDrive && config.googleDrive.shareUrl)
      || '';
    const suffix = driveUrl ? ' · Drive koblet' : ' · uten Drive-lenke';
    els.storageHintPill.textContent = 'Lagringsmodus: ' + storageModeLabel(mode) + suffix;
  }

  function applyStorageConfigToControls(els, state, config) {
    state.storageConfig = config || null;
    if (els.storageModeSelect) {
      els.storageModeSelect.value = normalizeStorageMode(config && config.defaultMode);
    }
    if (els.driveRootUrlInput) {
      els.driveRootUrlInput.value = config && config.googleDrive && config.googleDrive.shareUrl
        ? config.googleDrive.shareUrl
        : '';
    }
    renderStorageHint(els, state.storageConfig, state.currentLogDetail && state.currentLogDetail.log);
  }

  function applyLogStorageToControls(els, log, state) {
    if (!log || !log.storage) {
      if (els.logDriveUrlInput) {
        els.logDriveUrlInput.value = '';
      }
      renderStorageHint(els, state.storageConfig, null);
      return;
    }

    if (els.storageModeSelect) {
      els.storageModeSelect.value = normalizeStorageMode(log.storage.mode);
    }
    if (els.logDriveUrlInput) {
      els.logDriveUrlInput.value = log.storage.googleDrive && log.storage.googleDrive.shareUrl
        ? log.storage.googleDrive.shareUrl
        : '';
    }
    renderStorageHint(els, state.storageConfig, log);
  }

  function buildStoragePayloadFromControls(els, state, useLogSpecificUrl) {
    const globalDriveUrl = els.driveRootUrlInput ? String(els.driveRootUrlInput.value || '').trim() : '';
    const logDriveUrl = (useLogSpecificUrl && els.logDriveUrlInput)
      ? String(els.logDriveUrlInput.value || '').trim()
      : '';

    return {
      mode: els.storageModeSelect ? normalizeStorageMode(els.storageModeSelect.value) : normalizeStorageMode(state.storageConfig && state.storageConfig.defaultMode),
      googleDrive: {
        shareUrl: logDriveUrl || globalDriveUrl || ((state.storageConfig && state.storageConfig.googleDrive && state.storageConfig.googleDrive.shareUrl) || '')
      }
    };
  }

  function renderLogList(els, state, logs) {
    if (!Array.isArray(logs) || !logs.length) {
      els.brewLogList.innerHTML = '<div class="empty-state">Ingen lagrede bryggelogger funnet i mappen ennå.</div>';
      return;
    }

    els.brewLogList.innerHTML = logs.map(function (entry) {
      const storage = entry && entry.storage ? entry.storage : null;
      const storageLabel = storage ? storageModeLabel(storage.mode) : 'Lokal';
      return ''
        + '<button class="list-tab ' + (entry.slug === state.selectedLogSlug ? 'active' : '') + '" type="button" data-slug="' + escapeHtml(entry.slug) + '">'
        + '<strong>' + escapeHtml(entry.folderName || entry.batchName || 'Bryggelogg') + '</strong>'
        + '<span>' + escapeHtml(entry.styleName || 'Ukjent stil') + '</span>'
        + '<small>' + escapeHtml(entry.exportedAt ? fmtTime(entry.exportedAt) : 'Ukjent eksporttid') + ' · ' + Number(entry.imageCount || 0) + ' bilder · ' + storageLabel + '</small>'
        + '</button>';
    }).join('');
  }

  function renderLogDetail(els, data) {
    const log = data && data.log ? data.log : null;
    const images = Array.isArray(data && data.images) ? data.images : [];
    const folderUrl = data && data.folderUrl ? data.folderUrl : '';

    if (!log) {
      els.brewLogTitle.textContent = 'Velg en bryggelogg';
      els.brewLogSubtitle.textContent = 'Ingen logg er valgt ennå.';
      els.brewLogPills.innerHTML = '';
      els.brewLogText.innerHTML = '<div class="empty-state">Ingen bryggelogg valgt ennå.</div>';
      els.brewLogImages.innerHTML = '<div class="empty-state">Ingen bilder funnet ennå.</div>';
      els.brewLogImageMeta.textContent = 'Legg bilder i samme bryggemappe for å få dem vist her.';
      return;
    }

    const storage = log.storage || null;
    const driveUrl = storage && storage.googleDrive && storage.googleDrive.shareUrl ? storage.googleDrive.shareUrl : '';

    els.brewLogTitle.textContent = log.folderName || log.batchName || 'Bryggelogg';
    els.brewLogSubtitle.textContent = (log.styleName || 'Ukjent stil') + ' · eksportert ' + fmtTime(log.exportedAt);
    els.brewLogPills.innerHTML = ''
      + (log.deviceName ? '<div class="info-pill subtle">Enhet: ' + escapeHtml(log.deviceName) + '</div>' : '')
      + (log.profileName ? '<div class="info-pill subtle">Profil: ' + escapeHtml(log.profileName) + '</div>' : '')
      + (log.periodLabel ? '<div class="info-pill subtle">Vindu: ' + escapeHtml(log.periodLabel) + '</div>' : '')
      + (storage ? '<div class="info-pill subtle">Lagring: ' + escapeHtml(storage.label || storageModeLabel(storage.mode)) + '</div>' : '')
      + (log.recipeRef && (log.recipeRef.name || log.recipeRef.id) ? '<div class="info-pill subtle">Oppskrift: ' + escapeHtml(log.recipeRef.name || 'Koblet oppskrift') + '</div>' : '');

    els.brewLogText.innerHTML = ''
      + '<section class="detail-section"><h3>Koblet oppskrift</h3>' + buildRecipeRelationCard(log.recipeRef) + '</section>'
      + '<section class="detail-section"><h3>Lagring</h3>' + buildStorageSection(log, folderUrl) + '</section>'
      + '<section class="detail-section"><h3>Lagrede metrics</h3>' + buildMetricCards(log.metrics) + '</section>'
      + '<section class="detail-section"><h3>Gjæringslogg</h3>' + buildSummarySection(log.summary) + '</section>'
      + '<section class="detail-section"><h3>Varsler</h3>' + buildAlertSection(log.alerts) + '</section>';
    els.brewLogImages.innerHTML = buildImageGrid(images, storage);

    if (images.length) {
      els.brewLogImageMeta.textContent = images.length + ' bilder funnet i bryggemappen.' + (driveUrl ? ' Drive-mappe er også koblet.' : '');
    } else if (driveUrl) {
      els.brewLogImageMeta.textContent = 'Ingen lokale bilder funnet. Denne loggen er koblet til Google Drive for media.';
    } else {
      els.brewLogImageMeta.textContent = 'Ingen bilder funnet i bryggemappen.';
    }
  }

  function createModule(config) {
    const els = config.elements;
    const state = config.state;
    const onRecipeNavigate = typeof config.onRecipeNavigate === 'function' ? config.onRecipeNavigate : null;
    const driveModule = driveApi && typeof driveApi.createModule === 'function'
      ? driveApi.createModule({
        elements: els,
        state: state,
        tools: tools
      })
      : null;

    function wireRelationActions(recipeRef) {
      const recipeButton = els.brewLogText.querySelector('[data-recipe-nav]');
      if (recipeButton && onRecipeNavigate && recipeRef) {
        recipeButton.addEventListener('click', function () {
          onRecipeNavigate(recipeRef);
        });
      }
    }

    function applyDriveConfig(payload, storageConfig) {
      if (!driveModule) return;
      driveModule.setConfig(
        payload && payload.googleDriveAuth ? payload.googleDriveAuth : null,
        storageConfig || (payload && payload.storageConfig ? payload.storageConfig : null)
      );
    }

    async function loadStorageConfig() {
      try {
        const payload = await tools.fetchStorageConfig();
        applyStorageConfigToControls(els, state, payload.config || null);
        renderStorageOptionsNote(els, payload.storageOptions);
        applyDriveConfig(payload, payload.config || null);
        return payload;
      } catch (error) {
        if (els.storageHintPill) {
          els.storageHintPill.textContent = 'Lagringsmodus: kunne ikke laste';
        }
        return null;
      }
    }

    async function refreshList() {
      els.brewLogList.innerHTML = '<div class="loading">Laster lokale bryggelogger...</div>';
      try {
        const payload = await tools.fetchLogIndex();
        state.logs = Array.isArray(payload.logs) ? payload.logs : [];
        if (payload.storageConfig) {
          applyStorageConfigToControls(els, state, payload.storageConfig);
        }
        renderStorageOptionsNote(els, payload.storageOptions);
        applyDriveConfig(payload, payload.storageConfig || state.storageConfig);
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
        state.currentLogDetail = detail;
        if (detail.storageConfig) {
          applyStorageConfigToControls(els, state, detail.storageConfig);
        }
        renderStorageOptionsNote(els, detail.storageOptions);
        applyDriveConfig(detail, detail.storageConfig || state.storageConfig);
        renderLogDetail(els, detail);
        applyLogStorageToControls(els, detail.log, state);
        wireRelationActions(detail && detail.log ? detail.log.recipeRef : null);
        return detail;
      } catch (error) {
        els.brewLogText.innerHTML = '<div class="empty-state">Klarte ikke åpne loggen: ' + escapeHtml(error.message) + '</div>';
        return null;
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
      const exportDevice = (state.devices || []).find(function (device) {
        return device.id === state.exportDeviceId;
      }) || null;
      const mode = els.storageModeSelect ? storageModeLabel(normalizeStorageMode(els.storageModeSelect.value)) : 'Lokal';
      const driveTarget = els.logDriveUrlInput && els.logDriveUrlInput.value
        ? ' · egen Drive-mappe'
        : ((els.driveRootUrlInput && els.driveRootUrlInput.value) ? ' · Drive-standard satt' : '');

      state.batchName = batchName;
      state.folderName = folder;
      els.exportHintPill.textContent = 'Eksportmappe: ' + folder
        + (exportDevice ? (' · ' + (exportDevice.name || 'Uten navn')) : '')
        + ' · ' + mode
        + driveTarget;
      renderStorageHint(els, state.storageConfig, state.currentLogDetail && state.currentLogDetail.log);
    }

    async function saveStorageConfig() {
      try {
        els.saveStorageConfigBtn.disabled = true;
        els.saveStorageConfigBtn.textContent = 'Lagrer...';
        const payload = await tools.saveStorageConfig({
          action: 'save-config',
          defaultMode: els.storageModeSelect ? els.storageModeSelect.value : 'local',
          googleDrive: {
            shareUrl: els.driveRootUrlInput ? els.driveRootUrlInput.value : ''
          }
        });
        applyStorageConfigToControls(els, state, payload.config || null);
        renderStorageOptionsNote(els, payload.storageOptions);
        applyDriveConfig(payload, payload.config || null);
        updateExportHint();
      } catch (error) {
        els.storageHintPill.textContent = 'Lagringsmodus: kunne ikke lagre (' + error.message + ')';
      } finally {
        els.saveStorageConfigBtn.disabled = false;
        els.saveStorageConfigBtn.textContent = 'Lagre lagringsoppsett';
      }
    }

    async function saveSelectedLogStorage() {
      if (!state.selectedLogSlug) {
        els.storageHintPill.textContent = 'Lagringsmodus: velg en bryggelogg først';
        return;
      }

      try {
        els.saveLogDriveBtn.disabled = true;
        els.saveLogDriveBtn.textContent = 'Lagrer...';
        const payload = await tools.saveLogStorage({
          action: 'save-log-storage',
          slug: state.selectedLogSlug,
          storage: buildStoragePayloadFromControls(els, state, true)
        });
        state.currentLogDetail = payload;
        renderStorageOptionsNote(els, payload.storageOptions);
        if (payload.storageConfig) {
          applyStorageConfigToControls(els, state, payload.storageConfig);
        }
        applyDriveConfig(payload, payload.storageConfig || state.storageConfig);
        await refreshList();
        await selectLog(state.selectedLogSlug);
      } catch (error) {
        els.storageHintPill.textContent = 'Lagringsmodus: kunne ikke koble loggen (' + error.message + ')';
      } finally {
        els.saveLogDriveBtn.disabled = false;
        els.saveLogDriveBtn.textContent = 'Koble valgt logg til Drive';
      }
    }

    async function connectGoogleDrive() {
      if (!driveModule) {
        if (els.driveAuthPill) {
          els.driveAuthPill.textContent = 'Google Drive: modul mangler';
        }
        return;
      }

      try {
        await driveModule.connect(true);
      } catch (error) {
        if (els.driveAuthPill) {
          els.driveAuthPill.textContent = 'Google Drive: kunne ikke koble (' + error.message + ')';
        }
      }
    }

    async function syncSelectedLogToDrive() {
      if (!state.selectedLogSlug) {
        if (els.driveAuthPill) {
          els.driveAuthPill.textContent = 'Google Drive: velg en bryggelogg først';
        }
        return;
      }
      if (!driveModule) {
        if (els.driveAuthPill) {
          els.driveAuthPill.textContent = 'Google Drive: modul mangler';
        }
        return;
      }

      try {
        await driveModule.syncLogBySlug(state.selectedLogSlug, {
          interactive: true
        });
        await refreshList();
        await selectLog(state.selectedLogSlug);
      } catch (error) {
        if (els.driveAuthPill) {
          els.driveAuthPill.textContent = 'Google Drive: synk feilet (' + error.message + ')';
        }
      }
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
      payload.storage = buildStoragePayloadFromControls(els, state, true);

      try {
        els.downloadLogBtn.disabled = true;
        els.downloadLogBtn.textContent = 'Pakker eksport...';
        const result = await tools.exportLog(payload);
        const filename = result && result.filename ? result.filename : 'brygglogg.zip';
        state.selectedLogSlug = result && result.logSlug ? result.logSlug : (payload.folderName || state.selectedLogSlug);
        els.exportHintPill.textContent = 'Eksportert: ' + filename + (result && result.updatedExisting ? ' · eksisterende logg ble oppdatert' : ' · lokal metadata ble oppdatert');
        await refreshList();
        if (driveModule && state.selectedLogSlug && driveModule.shouldAutoSync(payload.storage && payload.storage.mode)) {
          await driveModule.syncLogBySlug(state.selectedLogSlug, {
            interactive: true
          });
          await refreshList();
          await selectLog(state.selectedLogSlug);
        }
      } catch (error) {
        els.exportHintPill.textContent = 'Eksport feilet: ' + error.message;
      } finally {
        els.downloadLogBtn.disabled = false;
        els.downloadLogBtn.textContent = 'Lagre bryggelogg';
      }
    }

    els.batchNameInput.addEventListener('input', updateExportHint);
    if (els.storageModeSelect) {
      els.storageModeSelect.addEventListener('change', updateExportHint);
    }
    if (els.driveRootUrlInput) {
      els.driveRootUrlInput.addEventListener('input', updateExportHint);
    }
    if (els.logDriveUrlInput) {
      els.logDriveUrlInput.addEventListener('input', updateExportHint);
    }
    els.downloadLogBtn.addEventListener('click', exportCurrent);
    els.refreshLogsBtn.addEventListener('click', refreshList);
    if (els.saveStorageConfigBtn) {
      els.saveStorageConfigBtn.addEventListener('click', saveStorageConfig);
    }
    if (els.saveLogDriveBtn) {
      els.saveLogDriveBtn.addEventListener('click', saveSelectedLogStorage);
    }
    if (els.connectGoogleDriveBtn) {
      els.connectGoogleDriveBtn.addEventListener('click', connectGoogleDrive);
    }
    if (els.syncSelectedDriveBtn) {
      els.syncSelectedDriveBtn.addEventListener('click', syncSelectedLogToDrive);
    }
    if (els.openDriveLibraryBtn) {
      els.openDriveLibraryBtn.addEventListener('click', function () {
        const url = els.driveRootUrlInput ? String(els.driveRootUrlInput.value || '').trim() : '';
        if (!url) {
          els.storageHintPill.textContent = 'Lagringsmodus: ingen Drive-biblioteklenke er satt ennå';
          return;
        }
        window.open(url, '_blank', 'noopener,noreferrer');
      });
    }

    loadStorageConfig();
    updateExportHint();

    return {
      loadSelectedLog: loadSelectedLog,
      refreshList: refreshList,
      selectLog: selectLog,
      updateExportHint: updateExportHint,
      loadStorageConfig: loadStorageConfig
    };
  }

  global.BrewingLogViewer = {
    createModule: createModule
  };
}(window));
