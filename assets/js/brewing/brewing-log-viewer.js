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
  function normalizeLegacyNorwegianText(value) {
    return String(value || '')
      .replace(/??/g, '\u00E6')
      .replace(/??/g, '\u00F8')
      .replace(/??/g, '\u00E5')
      .replace(/??/g, '\u00C6')
      .replace(/??/g, '\u00D8')
      .replace(/??/g, '\u00C5')
      .replace(/??/g, '\u00B7')
      .replace(/?/g, '')
      .replace(/\bStoy\b/g, 'St\\u00F8y')
      .replace(/\bmaaleutliggere\b/g, 'm\\u00E5leutliggere')
      .replace(/\bboer\b/g, 'b\\u00F8r')
      .replace(/\bVaer\b/g, 'V\\u00E6r')
      .replace(/\bforelopige\b/g, 'forel\\u00F8pige')
      .replace(/\bsluttomraade\b/g, 'sluttomr\\u00E5de')
      .replace(/\brestsodme\b/g, 'rests\\u00F8dme')
      .replace(/\bgravitymaaling\b/g, 'gravitym\\u00E5ling')
      .replace(/\bnaar\b/g, 'n\\u00E5r')
      .replace(/\bmaalrettet\b/g, 'm\\u00E5lrettet')
      .replace(/\bunnga\b/g, 'unng\\u00E5')
      .replace(/\bennaa\b/g, 'enn\\u00E5')
      .replace(/\bogsaa\b/g, 'ogs\\u00E5');
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

  function exportButtonLabel(mode) {
    if (mode === 'google-drive') return 'Lagre til Google Drive';
    if (mode === 'hybrid') return 'Lagre og synk';
    return 'Lagre bryggelogg';
  }

  function buildRecipeReferenceFromState(state) {
    const recipe = state && state.linkedRecipe ? state.linkedRecipe : null;
    if (!recipe) return null;
    return {
      id: recipe.id || '',
      slug: recipe.slug || recipe.id || '',
      source: recipe.source || 'local',
      providerLabel: recipe.providerLabel || (recipe.source === 'brewfather' ? 'Brewfather' : 'Lokal'),
      name: recipe.name || 'Oppskrift',
      style: recipe.style || '',
      batchVolume: recipe.batchVolume || null
    };
  }

  function buildMetricCards(metrics) {
    const entries = Object.entries(metrics || {});
    if (!entries.length) {
      return '<div class="empty-state">Ingen lagrede n\u00F8kkeltall i denne loggen.</div>';
    }

    return '<div class="metric-mini-grid">' + entries.map(function (entry) {
      return '<article class="metric-mini"><strong>' + escapeHtml(normalizeLegacyNorwegianText(entry[0])) + '</strong><span>' + escapeHtml(normalizeLegacyNorwegianText(entry[1])) + '</span></article>';
    }).join('') + '</div>';
  }

  function buildSummarySection(summary) {
    const entries = Object.entries(summary || {});
    if (!entries.length) {
      return '<div class="empty-state">Ingen oppsummering lagret i denne loggen.</div>';
    }

    return entries.map(function (entry) {
      return '<p><span class="log-label">' + escapeHtml(normalizeLegacyNorwegianText(entry[0])) + '</span>' + escapeHtml(normalizeLegacyNorwegianText(entry[1])) + '</p>';
    }).join('');
  }

  function buildAlertSection(alerts) {
    if (!Array.isArray(alerts) || !alerts.length) {
      return '<div class="empty-state">Ingen varsler lagret i denne loggen.</div>';
    }

    return alerts.map(function (alert) {
      return ''
        + '<article class="alert-card ' + escapeHtml(alert.severity || 'info') + '">'
        + '<strong>' + escapeHtml(normalizeLegacyNorwegianText(alert.title || 'Varsel')) + '</strong>'
        + '<p>' + escapeHtml(normalizeLegacyNorwegianText(alert.summary || '')) + '</p>'
        + (alert.actionSummary ? '<p><span class="log-label">Tiltak</span>' + escapeHtml(normalizeLegacyNorwegianText(alert.actionSummary)) + '</p>' : '')
        + '</article>';
    }).join('');
  }

  function buildRecipeRelationCard(recipeRef) {
    if (!recipeRef || (!recipeRef.id && !recipeRef.name)) {
      return '<div class="empty-state">Ingen oppskrift er knyttet til denne loggen enn\u00E5.</div>';
    }

    return ''
      + '<article class="relation-card">'
      + '<strong>' + escapeHtml(recipeRef.name || 'Oppskrift') + '</strong>'
      + '<span>' + escapeHtml(normalizeLegacyNorwegianText(recipeRef.style || 'Ukjent stil')) + ' \u00B7 ' + escapeHtml(normalizeLegacyNorwegianText(recipeRef.providerLabel || recipeRef.source || 'Lokal')) + '</span>'
      + '<button class="action-btn subtle-action relation-action" type="button" data-recipe-nav="1">\u00C5pne oppskrift</button>'
      + '</article>';
  }

  function buildStorageSection(log, folderUrl) {
    const storage = log && log.storage ? log.storage : null;
    if (!storage) {
      return '<div class="empty-state">Ingen lagringsmetadata er lagret enn\u00E5.</div>';
    }

    const driveUrl = storage.googleDrive && storage.googleDrive.shareUrl ? storage.googleDrive.shareUrl : '';
    const localUrl = storage.local && storage.local.folderUrl ? storage.local.folderUrl : folderUrl;
    const lastSyncedAt = storage.googleDrive && storage.googleDrive.lastSyncedAt ? storage.googleDrive.lastSyncedAt : '';
    const syncedBy = storage.googleDrive && storage.googleDrive.accountLabel ? storage.googleDrive.accountLabel : '';
    const syncLine = lastSyncedAt
      ? '<p><span class="log-label">Sist synket</span>' + escapeHtml(fmtTime(lastSyncedAt)) + '</p>'
      : '';
    const syncedByLine = syncedBy
      ? '<p><span class="log-label">Synket av</span>' + escapeHtml(syncedBy) + '</p>'
      : '';

    return ''
      + '<article class="relation-card">'
      + '<strong>' + escapeHtml(normalizeLegacyNorwegianText(storage.label || storageModeLabel(storage.mode))) + '</strong>'
      + '<span>' + escapeHtml(normalizeLegacyNorwegianText(storage.summary || '')) + '</span>'
      + syncLine
      + syncedByLine
      + (localUrl ? '<a class="action-btn subtle-action relation-action" href="' + escapeHtml(localUrl) + '" target="_blank" rel="noopener noreferrer">&Aring;pne lokal mappe</a>' : '')
      + (driveUrl ? '<a class="action-btn subtle-action relation-action" href="' + escapeHtml(driveUrl) + '" target="_blank" rel="noopener noreferrer">&Aring;pne Drive-mappe</a>' : '')
      + '</article>';
  }

  function isImageName(name) {
    return /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(String(name || ''));
  }

  function isDriveImageFile(file) {
    if (!file) return false;
    return /^image\//i.test(String(file.mimeType || '')) || isImageName(file.name || '');
  }

  function drivePreviewUrl(file) {
    if (!file) return '';
    const mimeType = String(file.mimeType || '').toLowerCase();
    if ((mimeType === 'image/svg+xml' || /\.svg$/i.test(String(file.name || ''))) && file.webContentLink) {
      return String(file.webContentLink);
    }
    if (file.thumbnailLink) return String(file.thumbnailLink);
    if (file.id) return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(file.id) + '&sz=w1600';
    return file.webContentLink || file.webViewLink || '';
  }

  function buildDriveImagesFromFiles(files) {
    const safeFiles = Array.isArray(files) ? files : [];
    return safeFiles.filter(isDriveImageFile).map(function (file) {
      return {
        name: file.name || 'Drive-bilde',
        url: drivePreviewUrl(file),
        href: file.webViewLink || file.webContentLink || '',
        source: 'drive'
      };
    }).filter(function (image) {
      return !!image.url;
    });
  }

  function buildDriveImages(storage) {
    const drive = storage && storage.googleDrive ? storage.googleDrive : null;
    const files = Array.isArray(drive && drive.files) ? drive.files : [];
    return buildDriveImagesFromFiles(files);
  }

  function mergeImages(localImages, driveImages) {
    const safeLocalImages = Array.isArray(localImages) ? localImages : [];
    const safeDriveImages = Array.isArray(driveImages) ? driveImages : [];
    return safeLocalImages.concat(
      safeDriveImages.filter(function (driveImage) {
        return !safeLocalImages.some(function (localImage) {
          return String(localImage && localImage.name || '').toLowerCase() === String(driveImage.name || '').toLowerCase();
        });
      })
    );
  }

  function buildImageGrid(images, storage, liveDriveImages) {
    const localImages = Array.isArray(images) ? images : [];
    const driveImages = Array.isArray(liveDriveImages) && liveDriveImages.length
      ? buildDriveImagesFromFiles(liveDriveImages)
      : buildDriveImages(storage);
    const mergedImages = mergeImages(localImages, driveImages);
    const driveUrl = storage && storage.googleDrive && storage.googleDrive.shareUrl ? storage.googleDrive.shareUrl : '';

    if (!mergedImages.length) {
      if (driveUrl) {
        return ''
          + '<article class="relation-card">'
          + '<strong>Ingen bilder funnet enn\u00E5</strong>'
          + '<span>Loggen er koblet til Google Drive, men det ligger ingen bildefiler i bilder-mappen enn\u00E5.</span>'
          + '<a class="action-btn subtle-action relation-action" href="' + escapeHtml(driveUrl) + '" target="_blank" rel="noopener noreferrer">&Aring;pne Drive-mappe</a>'
          + '</article>';
      }
      return '<div class="empty-state">Ingen bilder funnet enn\u00E5.</div>';
    }

    const gallery = mergedImages.map(function (image) {
      const imageUrl = image.url || '';
      const href = image.href || imageUrl;
      const sourceLabel = image.source === 'drive' ? ' \u00B7 Drive' : '';
      return ''
        + '<figure class="image-card">'
        + (href ? '<a href="' + escapeHtml(href) + '" target="_blank" rel="noopener noreferrer">' : '')
        + '<img src="' + escapeHtml(imageUrl) + '" alt="' + escapeHtml(image.name || 'Bryggebilde') + '" loading="lazy">'
        + (href ? '</a>' : '')
        + '<figcaption>' + escapeHtml(image.name || '') + sourceLabel + '</figcaption>'
        + '</figure>';
    }).join('');

    if (!driveUrl) {
      return gallery;
    }

    return gallery + ''
      + '<article class="relation-card image-link-card">'
      + '<strong>Ekstern bildemappe</strong>'
      + '<span>Du kan ogs\u00E5 holde tunge bildefiler i Google Drive og bruke denne siden som lett viewer og metadata-speil.</span>'
      + '<a class="action-btn subtle-action relation-action" href="' + escapeHtml(driveUrl) + '" target="_blank" rel="noopener noreferrer">&Aring;pne Drive-mappe</a>'
      + '</article>';
  }

  function renderStorageOptionsNote(els, options) {
    if (!els.logStorageOptions) return;
    const safeOptions = Array.isArray(options) ? options : [];
    if (!safeOptions.length) {
      els.logStorageOptions.textContent = 'Lagringsvalg: ingen anbefalinger lastet enn\u00E5.';
      return;
    }

    const activeOption = safeOptions.find(function (option) {
      return option && option.status && option.status !== 'ikke konfigurert';
    }) || safeOptions[0];

    els.logStorageOptions.textContent = 'Lagringsvalg: '
      + (activeOption && activeOption.label ? activeOption.label : 'Lagring')
      + ' &middot; '
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
    const suffix = driveUrl ? ' \u00B7 Drive koblet' : ' \u00B7 uten Drive-lenke';
    els.storageHintPill.textContent = 'Lagringsmodus: ' + storageModeLabel(mode) + suffix;
  }

  function updateExportButtonLabel(els) {
    if (!els.downloadLogBtn) return;
    const mode = els.storageModeSelect ? normalizeStorageMode(els.storageModeSelect.value) : 'local';
    els.downloadLogBtn.textContent = exportButtonLabel(mode);
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
    renderStorageHint(els, state.storageConfig, log);
  }

  function buildStoragePayloadFromControls(els, state) {
    const globalDriveUrl = els.driveRootUrlInput ? String(els.driveRootUrlInput.value || '').trim() : '';

    return {
      mode: els.storageModeSelect ? normalizeStorageMode(els.storageModeSelect.value) : normalizeStorageMode(state.storageConfig && state.storageConfig.defaultMode),
      googleDrive: {
        shareUrl: globalDriveUrl || ((state.storageConfig && state.storageConfig.googleDrive && state.storageConfig.googleDrive.shareUrl) || '')
      }
    };
  }

  function renderLogList(els, state, logs) {
    if (!Array.isArray(logs) || !logs.length) {
      els.brewLogList.innerHTML = '<div class="empty-state">Ingen lagrede bryggelogger funnet i mappen enn\u00E5.</div>';
      return;
    }

    els.brewLogList.innerHTML = logs.map(function (entry) {
      const storage = entry && entry.storage ? entry.storage : null;
      const storageLabel = storage ? storageModeLabel(storage.mode) : 'Lokal';
      const statusLabel = entry && entry.statusLabel ? entry.statusLabel : ((entry && entry.hasRaptData) ? 'Ferdig' : 'Mangler RAPT-logg');
      const whenLabel = entry && (entry.updatedAt || entry.exportedAt) ? fmtTime(entry.updatedAt || entry.exportedAt) : 'Ukjent eksporttid';
      return ''
        + '<button class="list-tab ' + (entry.slug === state.selectedLogSlug ? 'active' : '') + '" type="button" data-slug="' + escapeHtml(entry.slug) + '">'
        + '<strong>' + escapeHtml(entry.folderName || entry.batchName || 'Bryggelogg') + '</strong>'
        + '<span>' + escapeHtml(normalizeLegacyNorwegianText(entry.styleName || 'Ukjent stil')) + ' \u00B7 ' + escapeHtml(normalizeLegacyNorwegianText(statusLabel)) + '</span>'
        + '<small>' + escapeHtml(whenLabel) + ' \u00B7 ' + Number(entry.imageCount || 0) + ' bilder \u00B7 ' + normalizeLegacyNorwegianText(storageLabel) + '</small>'
        + '</button>';
    }).join('');
  }

  function renderLogDetail(els, data) {
    const log = data && data.log ? data.log : null;
    const images = Array.isArray(data && data.images) ? data.images : [];
    const liveDriveImages = Array.isArray(data && data.driveImages) ? data.driveImages : [];
    const folderUrl = data && data.folderUrl ? data.folderUrl : '';

    if (!log) {
      els.brewLogTitle.textContent = 'Velg en bryggelogg';
      els.brewLogSubtitle.textContent = 'Ingen logg er valgt enn\u00E5.';
      els.brewLogPills.innerHTML = '';
      els.brewLogText.innerHTML = '<div class="empty-state">Ingen bryggelogg valgt enn\u00E5.</div>';
      els.brewLogImages.innerHTML = '<div class="empty-state">Ingen bilder funnet enn?.</div>';
      els.brewLogImageMeta.textContent = 'Legg bilder i samme bryggemappe for \u00E5 f\u00E5 dem vist her.';
      return;
    }

    const storage = log.storage || null;
    const driveUrl = storage && storage.googleDrive && storage.googleDrive.shareUrl ? storage.googleDrive.shareUrl : '';
    const raptWindow = log.raptWindow && typeof log.raptWindow === 'object' ? log.raptWindow : null;
    const hasRaptData = (log.logMode || (Array.isArray(log.history) && log.history.length ? 'hydrometer' : 'draft')) !== 'draft';
    const updatedAt = log.updatedAt || log.exportedAt || '';

    els.brewLogTitle.textContent = log.folderName || log.batchName || 'Bryggelogg';
    els.brewLogSubtitle.textContent = normalizeLegacyNorwegianText(log.styleName || 'Ukjent stil') + ' \u00B7 sist endret ' + fmtTime(updatedAt);
    els.brewLogPills.innerHTML = ''
      + '<div class="info-pill subtle">' + escapeHtml(hasRaptData ? 'Status: ferdig' : 'Status: mangler RAPT-logg') + '</div>'
      + (log.deviceName ? '<div class="info-pill subtle">Enhet: ' + escapeHtml(log.deviceName) + '</div>' : '')
      + (log.profileName ? '<div class="info-pill subtle">Profil: ' + escapeHtml(log.profileName) + '</div>' : '')
      + (log.periodLabel ? '<div class="info-pill subtle">Vindu: ' + escapeHtml(log.periodLabel) + '</div>' : '')
      + (raptWindow && raptWindow.historyStart ? '<div class="info-pill subtle">RAPT start: ' + escapeHtml(fmtTime(raptWindow.historyStart)) + '</div>' : '')
      + (raptWindow && raptWindow.historyEnd ? '<div class="info-pill subtle">RAPT slutt: ' + escapeHtml(fmtTime(raptWindow.historyEnd)) + '</div>' : '')
      + '<strong>' + escapeHtml(normalizeLegacyNorwegianText(storage.label || storageModeLabel(storage.mode))) + '</strong>'
      + (log.recipeRef && (log.recipeRef.name || log.recipeRef.id) ? '<div class="info-pill subtle">Oppskrift: ' + escapeHtml(log.recipeRef.name || 'Koblet oppskrift') + '</div>' : '');

    els.brewLogText.innerHTML = ''
      + '<section class="detail-section"><h3>Koblet oppskrift</h3>' + buildRecipeRelationCard(log.recipeRef) + '</section>'
      + '<section class="detail-section"><h3>Lagring</h3>' + buildStorageSection(log, folderUrl) + '</section>'
      + '<section class="detail-section"><h3>Lagrede metrics</h3>' + buildMetricCards(log.metrics) + '</section>'
      + '<section class="detail-section"><h3>Gj\u00E6ringslogg</h3>' + buildSummarySection(log.summary) + '</section>'
      + '<section class="detail-section"><h3>Varsler</h3>' + buildAlertSection(log.alerts) + '</section>';
    els.brewLogImages.innerHTML = buildImageGrid(images, storage, liveDriveImages);

    const driveImageCount = (Array.isArray(liveDriveImages) && liveDriveImages.length)
      ? buildDriveImagesFromFiles(liveDriveImages).length
      : buildDriveImages(storage).length;
    const totalImageCount = images.length + driveImageCount;
    if (totalImageCount) {
      els.brewLogImageMeta.textContent = totalImageCount + ' bilder funnet'
        + (images.length ? (' lokalt: ' + images.length + '.') : '.')
        + (driveImageCount ? (' Drive: ' + driveImageCount + '.') : '')
        + (driveUrl ? ' Drive-mappe er ogs\u00E5 koblet.' : '');
    } else if (driveUrl) {
      els.brewLogImageMeta.textContent = 'Ingen bilder funnet enn?. Denne loggen er koblet til Google Drive for media.';
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
        if (driveModule && detail && detail.log) {
          try {
            const liveDriveImages = await driveModule.fetchLogImages(detail.log);
            if (Array.isArray(liveDriveImages) && liveDriveImages.length) {
              detail.driveImages = liveDriveImages;
              if (detail.log && detail.log.storage && detail.log.storage.googleDrive) {
                detail.log.storage.googleDrive.files = liveDriveImages.slice();
              }
              const matchedEntry = Array.isArray(state.logs)
                ? state.logs.find(function (entry) { return entry.slug === state.selectedLogSlug; })
                : null;
              if (matchedEntry) {
                matchedEntry.imageCount = (Array.isArray(detail.images) ? detail.images.length : 0) + liveDriveImages.length;
                renderLogList(els, state, state.logs);
                Array.from(els.brewLogList.querySelectorAll('[data-slug]')).forEach(function (button) {
                  button.addEventListener('click', function () {
                    state.selectedLogSlug = button.getAttribute('data-slug') || '';
                    renderLogList(els, state, state.logs);
                    loadSelectedLog();
                  });
                });
              }
              state.currentLogDetail = detail;
              renderLogDetail(els, detail);
              wireRelationActions(detail.log.recipeRef);
            }
          } catch (error) {
          }
        }
        return detail;
      } catch (error) {
        els.brewLogText.innerHTML = '<div class="empty-state">Klarte ikke &aring;pne loggen: ' + escapeHtml(error.message) + '</div>';
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
      const driveTarget = (els.driveRootUrlInput && els.driveRootUrlInput.value)
        ? ' \u00B7 delt Drive-bibliotek satt'
        : '';

      state.batchName = batchName;
      state.folderName = folder;
      els.exportHintPill.textContent = 'Eksportmappe: ' + folder
        + (exportDevice ? (' \u00B7 ' + (exportDevice.name || 'Uten navn')) : '')
        + ' ? ' + mode
        + driveTarget;
      updateExportButtonLabel(els);
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
        els.storageHintPill.textContent = 'Lagringsmodus: velg en bryggelogg f?rst';
        return;
      }

      try {
        els.saveLogDriveBtn.disabled = true;
        els.saveLogDriveBtn.textContent = 'Lagrer...';
        const payload = await tools.saveLogStorage({
          action: 'save-log-storage',
          slug: state.selectedLogSlug,
          storage: buildStoragePayloadFromControls(els, state)
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
          els.driveAuthPill.textContent = 'Google Drive: velg en bryggelogg f?rst';
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

    function draftBatchName() {
      const selectedLogName = state.currentLogDetail && state.currentLogDetail.log
        ? String(state.currentLogDetail.log.batchName || '').trim()
        : '';
      return String((els.batchNameInput && els.batchNameInput.value) || state.batchName || selectedLogName || 'Brygg').trim();
    }

    function buildDraftPayload() {
      const batchName = draftBatchName();
      const recipeRef = buildRecipeReferenceFromState(state);
      const recipeStyle = recipeRef && recipeRef.style ? recipeRef.style : '';
      const nowIso = new Date().toISOString();

      return {
        batchName: batchName,
        folderName: tools.buildFolderName(batchName, new Date()),
        styleName: recipeStyle,
        deviceId: '',
        deviceName: '',
        profileName: '',
        periodLabel: 'Ingen hydrometer koblet enn\u00E5',
        recipeRef: recipeRef,
        createdAt: nowIso,
        exportedAt: nowIso,
        logMode: 'draft',
        summary: {
          'Prosessbilde': 'Bryggeloggen er startet f\u00F8r RAPT Pill er koblet til denne batchen.',
          'Risikobilde': 'Ingen hydrometerdata er lagt til enn\u00E5, s\u00E5 fermenteringsrisiko vurderes senere n\u00E5r m\u00E5leserien er koblet inn.',
          'Stilvurdering': recipeRef && recipeRef.style
            ? ('Oppskriften er koblet til loggen som ' + recipeRef.style + '.')
            : 'Ingen oppskrift er koblet til loggen enn\u00E5.',
          'Modellprognose': 'Numerisk prognose aktiveres n\u00E5r filtrerte hydrometerdata er koblet til denne loggen.',
          'Tidsvindu': 'Bryggeloggen er startet uten hydrometervindu enn\u00E5.',
          'Filtrering': 'Ingen hydrometerfiltrering kj\u00F8rt enn\u00E5.'
        },
        metrics: {
          'Status': 'Startet uten hydrometer',
          'Oppskrift': recipeRef ? (recipeRef.name || 'Koblet oppskrift') : 'Ingen koblet oppskrift'
        },
        alerts: [],
        history: [],
        source: {
          usedCache: false,
          generatedAt: nowIso,
          draftOnly: true
        }
      };
    }

    async function persistPayload(payload, options) {
      const settings = options || {};
      const normalizedMode = normalizeStorageMode(payload && payload.storage && payload.storage.mode);
      const shouldDownload = !!settings.forceDownload || (!settings.forceNoDownload && normalizedMode === 'local');
      const busyLabel = settings.busyLabel || (shouldDownload ? 'Pakker eksport...' : 'Lagrer...');
      const successPrefix = settings.successPrefix || (shouldDownload ? 'Eksportert' : 'Lagret');

      els.downloadLogBtn.disabled = true;
      if (els.startDraftLogBtn) els.startDraftLogBtn.disabled = true;
      if (els.updateSelectedLogBtn) els.updateSelectedLogBtn.disabled = true;
      els.downloadLogBtn.textContent = busyLabel;

      try {
        const result = await tools.exportLog(payload, {
          download: shouldDownload
        });
        const filename = result && result.filename ? result.filename : 'brygglogg.zip';
        state.selectedLogSlug = result && result.logSlug ? result.logSlug : (payload.targetSlug || payload.folderName || state.selectedLogSlug);
        els.exportHintPill.textContent = shouldDownload
          ? (successPrefix + ': ' + filename + (result && result.updatedExisting ? ' ? eksisterende logg ble oppdatert' : ' ? lokal metadata ble oppdatert'))
          : (successPrefix + ': ' + (payload.targetSlug || payload.folderName || filename) + (result && result.updatedExisting ? ' ? eksisterende logg ble oppdatert' : ''));
        await refreshList();
        if (driveModule && state.selectedLogSlug && driveModule.shouldAutoSync(payload.storage && payload.storage.mode)) {
          await driveModule.syncLogBySlug(state.selectedLogSlug, {
            interactive: true
          });
          els.exportHintPill.textContent = 'Lagret og synket til Google Drive: ' + (payload.targetSlug || payload.folderName || filename);
          await refreshList();
        }
        if (state.selectedLogSlug) {
          await selectLog(state.selectedLogSlug);
        }
        return result;
      } finally {
        els.downloadLogBtn.disabled = false;
        if (els.startDraftLogBtn) els.startDraftLogBtn.disabled = false;
        if (els.updateSelectedLogBtn) els.updateSelectedLogBtn.disabled = false;
        updateExportButtonLabel(els);
      }
    }

    async function startDraftLog() {
      updateExportHint();
      const payload = buildDraftPayload();
      payload.batchName = draftBatchName();
      payload.folderName = tools.buildFolderName(payload.batchName, new Date());
      payload.storage = buildStoragePayloadFromControls(els, state);

      try {
        await persistPayload(payload, {
          forceNoDownload: true,
          busyLabel: 'Starter logg...',
          successPrefix: 'Bryggeloggen er startet'
        });
      } catch (error) {
        els.exportHintPill.textContent = 'Kunne ikke starte loggen: ' + error.message;
      }
    }

    async function updateSelectedLogWithHydrometer() {
      if (!state.selectedLogSlug) {
        els.exportHintPill.textContent = 'Velg en eksisterende bryggelogg f\u00F8rst.';
        return;
      }

      const payload = config.getExportPayload();
      if (!payload) {
        els.exportHintPill.textContent = 'Velg en hydrometeranalyse f\u00F8r du oppdaterer loggen.';
        return;
      }

      const currentLog = state.currentLogDetail && state.currentLogDetail.log ? state.currentLogDetail.log : null;
      updateExportHint();
      payload.targetSlug = state.selectedLogSlug;
      payload.batchName = currentLog && currentLog.batchName ? currentLog.batchName : draftBatchName();
      payload.folderName = state.selectedLogSlug;
      payload.createdAt = currentLog && currentLog.createdAt ? currentLog.createdAt : '';
      payload.recipeRef = payload.recipeRef || (currentLog && currentLog.recipeRef ? currentLog.recipeRef : null);
      payload.storage = buildStoragePayloadFromControls(els, state);

      try {
        await persistPayload(payload, {
          forceNoDownload: true,
          busyLabel: 'Oppdaterer logg...',
          successPrefix: 'Loggen ble oppdatert'
        });
      } catch (error) {
        els.exportHintPill.textContent = 'Kunne ikke oppdatere loggen: ' + error.message;
      }
    }

    async function exportCurrent() {
      const payload = config.getExportPayload();
      if (!payload) {
        els.exportHintPill.textContent = 'Eksportmappe: ingen aktiv hydrometeranalyse \u00E5 lagre';
        return;
      }

      updateExportHint();
      payload.batchName = state.batchName;
      payload.folderName = state.folderName;
      payload.storage = buildStoragePayloadFromControls(els, state);

      try {
        await persistPayload(payload, {
          busyLabel: normalizeStorageMode(payload.storage && payload.storage.mode) === 'local'
            ? 'Pakker eksport...'
            : (normalizeStorageMode(payload.storage && payload.storage.mode) === 'google-drive' ? 'Lagrer til Drive...' : 'Lagrer og synker...')
        });
      } catch (error) {
        els.exportHintPill.textContent = 'Eksport feilet: ' + error.message;
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
    if (els.startDraftLogBtn) {
      els.startDraftLogBtn.addEventListener('click', startDraftLog);
    }
    if (els.updateSelectedLogBtn) {
      els.updateSelectedLogBtn.addEventListener('click', updateSelectedLogWithHydrometer);
    }
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
          els.storageHintPill.textContent = 'Lagringsmodus: ingen Drive-biblioteklenke er satt enn\u00E5';
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
