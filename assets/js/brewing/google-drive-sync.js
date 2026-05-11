(function (global) {
  'use strict';

  const GOOGLE_GIS_SRC = 'https://accounts.google.com/gsi/client';
  const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
  const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
  const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';
  const FOLDER_MIME = 'application/vnd.google-apps.folder';
  const BREWING_LIBRARY_FOLDER = 'Brygging';
  const DRIVE_SESSION_KEY = 'brewingGoogleDriveSession:v1';

  function safeTrim(value) {
    return String(value == null ? '' : value).trim();
  }

  function formatTimestamp(value) {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return new Intl.DateTimeFormat('nb-NO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  function buildDriveFolderUrl(folderId) {
    return folderId ? 'https://drive.google.com/drive/folders/' + encodeURIComponent(folderId) : '';
  }

  function extractDriveId(value) {
    const input = safeTrim(value);
    if (!input) return '';
    let match = input.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) return match[1];
    match = input.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) return match[1];
    match = input.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) return match[1];
    return /^[a-zA-Z0-9_-]{10,}$/.test(input) ? input : '';
  }

  function escapeDriveQueryValue(value) {
    return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  function loadScriptOnce(src, readyCheck) {
    if (typeof readyCheck === 'function' && readyCheck()) {
      return Promise.resolve();
    }

    const existing = document.querySelector('script[data-codex-src="' + src + '"]');
    if (existing) {
      return new Promise(function (resolve, reject) {
        if (typeof readyCheck === 'function' && readyCheck()) {
          resolve();
          return;
        }
        existing.addEventListener('load', function () { resolve(); }, { once: true });
        existing.addEventListener('error', function () { reject(new Error('Kunne ikke laste ' + src)); }, { once: true });
      });
    }

    return new Promise(function (resolve, reject) {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.dataset.codexSrc = src;
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error('Kunne ikke laste ' + src)); };
      document.head.appendChild(script);
    });
  }

  function readSavedSession() {
    try {
      const raw = global.localStorage ? global.localStorage.getItem(DRIVE_SESSION_KEY) : '';
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function writeSavedSession(payload) {
    try {
      if (!global.localStorage) return;
      global.localStorage.setItem(DRIVE_SESSION_KEY, JSON.stringify(payload || {}));
    } catch (error) {
    }
  }

  function clearSavedSession() {
    try {
      if (!global.localStorage) return;
      global.localStorage.removeItem(DRIVE_SESSION_KEY);
    } catch (error) {
    }
  }

  function createModule(config) {
    const els = config.elements || {};
    const state = config.state || {};
    const tools = config.tools;
    const moduleState = {
      authConfig: null,
      storageConfig: null,
      tokenClient: null,
      accessToken: '',
      accessTokenExpiresAt: 0,
      accessPromise: null,
      accountLabel: '',
      autoReconnectAttempted: false,
      statusText: 'Google Drive: ikke satt opp ennå',
      busy: false,
      connected: false
    };

    function updateUi() {
      if (els.driveAuthPill) {
        els.driveAuthPill.textContent = moduleState.statusText;
        els.driveAuthPill.classList.toggle('offline', !moduleState.connected);
      }
      if (els.connectGoogleDriveBtn) {
        els.connectGoogleDriveBtn.disabled = !isConfigured() || moduleState.busy;
        els.connectGoogleDriveBtn.textContent = moduleState.connected ? 'Bytt Google-konto' : 'Koble Google-konto';
      }
      if (els.syncSelectedDriveBtn) {
        els.syncSelectedDriveBtn.disabled = moduleState.busy || !isConfigured();
      }
    }

    function setStatus(text, connected) {
      moduleState.statusText = text;
      moduleState.connected = !!connected;
      updateUi();
    }

    function setBusy(isBusy, message) {
      moduleState.busy = !!isBusy;
      if (message) {
        setStatus(message, moduleState.connected);
      } else {
        updateUi();
      }
    }

    function isConfigured() {
      return !!(moduleState.authConfig
        && safeTrim(moduleState.authConfig.clientId)
        && safeTrim(moduleState.authConfig.projectNumber));
    }

    function hasFreshToken() {
      return !!moduleState.accessToken && Date.now() < (moduleState.accessTokenExpiresAt - 60 * 1000);
    }

    function setConfig(authConfig, storageConfig) {
      moduleState.authConfig = authConfig || moduleState.authConfig;
      moduleState.storageConfig = storageConfig || moduleState.storageConfig;
      const savedSession = readSavedSession();
      if (savedSession && safeTrim(savedSession.accountLabel) && !safeTrim(moduleState.accountLabel)) {
        moduleState.accountLabel = safeTrim(savedSession.accountLabel);
      }

      if (!isConfigured()) {
        setStatus('Google Drive: mangler OAuth-oppsett', false);
        return;
      }

      if (moduleState.connected) {
        setStatus('Google Drive: konto koblet', true);
        return;
      }

      const rootFolderId = extractDriveId(
        (moduleState.storageConfig && moduleState.storageConfig.googleDrive && moduleState.storageConfig.googleDrive.folderId)
          || (moduleState.authConfig && moduleState.authConfig.folderId)
      );
      setStatus(
        rootFolderId
          ? 'Google Drive: klar til innlogging og synk'
          : 'Google Drive: OAuth klart, men standardmappe mangler',
        false
      );

      if (savedSession
        && safeTrim(savedSession.clientId) === safeTrim(moduleState.authConfig.clientId)
        && !moduleState.autoReconnectAttempted) {
        moduleState.autoReconnectAttempted = true;
        setTimeout(function () {
          silentReconnect();
        }, 0);
      }
    }

    async function ensureGoogleIdentity() {
      await loadScriptOnce(GOOGLE_GIS_SRC, function () {
        return !!(global.google && global.google.accounts && global.google.accounts.oauth2);
      });

      if (!(global.google && global.google.accounts && global.google.accounts.oauth2)) {
        throw new Error('Google Identity Services er ikke tilgjengelig i nettleseren.');
      }

      if (!moduleState.tokenClient) {
        moduleState.tokenClient = global.google.accounts.oauth2.initTokenClient({
          client_id: moduleState.authConfig.clientId,
          scope: moduleState.authConfig.scope || DRIVE_FILE_SCOPE,
          callback: function () {}
        });
      }
    }

    async function ensureAccessToken(interactive) {
      if (!isConfigured()) {
        throw new Error('Google Drive OAuth er ikke konfigurert ennå.');
      }

      if (hasFreshToken()) {
        return moduleState.accessToken;
      }

      if (moduleState.accessPromise) {
        return moduleState.accessPromise;
      }

      moduleState.accessPromise = (async function () {
        await ensureGoogleIdentity();
        return new Promise(function (resolve, reject) {
          moduleState.tokenClient.callback = function (response) {
            moduleState.accessPromise = null;
            if (response && response.error) {
              if (!interactive) {
                reject(new Error(response.error));
                return;
              }
              reject(new Error(response.error_description || response.error));
              return;
            }
            if (!response || !response.access_token) {
              reject(new Error('Google svarte uten access token.'));
              return;
            }
            moduleState.accessToken = response.access_token;
            moduleState.accessTokenExpiresAt = Date.now() + (Number(response.expires_in || 3600) * 1000);
            writeSavedSession({
              clientId: safeTrim(moduleState.authConfig && moduleState.authConfig.clientId),
              accountLabel: safeTrim(moduleState.accountLabel),
              savedAt: new Date().toISOString()
            });
            setStatus('Google Drive: konto koblet', true);
            resolve(moduleState.accessToken);
          };

          moduleState.tokenClient.requestAccessToken({
            prompt: interactive ? 'consent' : ''
          });
        });
      }());

      return moduleState.accessPromise;
    }

    async function authorizedFetch(url, options, retryOnce) {
      const requestOptions = options || {};
      const token = await ensureAccessToken(false);
      const headers = new Headers(requestOptions.headers || {});
      headers.set('Authorization', 'Bearer ' + token);
      const response = await fetch(url, Object.assign({}, requestOptions, { headers: headers }));
      if (response.status === 401 && retryOnce !== false) {
        moduleState.accessToken = '';
        moduleState.accessTokenExpiresAt = 0;
        const retryToken = await ensureAccessToken(false);
        const retryHeaders = new Headers(requestOptions.headers || {});
        retryHeaders.set('Authorization', 'Bearer ' + retryToken);
        return fetch(url, Object.assign({}, requestOptions, { headers: retryHeaders }));
      }
      return response;
    }

    async function driveJson(url, options) {
      const response = await authorizedFetch(url, options);
      const text = await response.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (error) {
        data = null;
      }
      if (!response.ok) {
        throw new Error((data && data.error && data.error.message) || ('Google Drive svarte med HTTP ' + response.status));
      }
      return data || {};
    }

    async function searchChild(parentId, name, mimeType) {
      const parts = [
        "trashed = false",
        "'" + escapeDriveQueryValue(parentId) + "' in parents",
        "name = '" + escapeDriveQueryValue(name) + "'"
      ];
      if (mimeType) {
        parts.push("mimeType = '" + escapeDriveQueryValue(mimeType) + "'");
      }
      const url = DRIVE_API_BASE + '/files'
        + '?supportsAllDrives=true'
        + '&includeItemsFromAllDrives=true'
        + '&pageSize=10'
        + '&fields=files(id,name,mimeType,webViewLink,parents)'
        + '&q=' + encodeURIComponent(parts.join(' and '));
      const payload = await driveJson(url, { method: 'GET' });
      return Array.isArray(payload.files) && payload.files.length ? payload.files[0] : null;
    }

    async function ensureFolder(parentId, folderName) {
      const existing = await searchChild(parentId, folderName, FOLDER_MIME);
      if (existing && existing.id) {
        return {
          id: existing.id,
          name: existing.name || folderName,
          webViewLink: existing.webViewLink || buildDriveFolderUrl(existing.id)
        };
      }

      const metadata = {
        name: folderName,
        mimeType: FOLDER_MIME,
        parents: parentId ? [parentId] : undefined
      };
      const created = await driveJson(
        DRIVE_API_BASE + '/files?supportsAllDrives=true&fields=id,name,webViewLink',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(metadata)
        }
      );

      return {
        id: created.id,
        name: created.name || folderName,
        webViewLink: created.webViewLink || buildDriveFolderUrl(created.id)
      };
    }

    async function createOrUpdateFile(parentId, name, mimeType, blob) {
      const existing = await searchChild(parentId, name, null);
      const boundary = 'brygging-' + Math.random().toString(16).slice(2);
      const metadata = existing && existing.id
        ? { name: name, mimeType: mimeType }
        : { name: name, mimeType: mimeType, parents: parentId ? [parentId] : undefined };
      const body = new Blob([
        '--' + boundary + '\r\n',
        'Content-Type: application/json; charset=UTF-8\r\n\r\n',
        JSON.stringify(metadata),
        '\r\n--' + boundary + '\r\n',
        'Content-Type: ' + mimeType + '\r\n\r\n',
        blob,
        '\r\n--' + boundary + '--'
      ], {
        type: 'multipart/related; boundary=' + boundary
      });

      const baseUrl = DRIVE_UPLOAD_BASE + '/files' + (existing && existing.id ? '/' + encodeURIComponent(existing.id) : '');
      const payload = await driveJson(
        baseUrl + '?uploadType=multipart&supportsAllDrives=true&fields=id,name,mimeType,webViewLink,webContentLink,thumbnailLink,parents',
        {
          method: existing && existing.id ? 'PATCH' : 'POST',
          body: body
        }
      );

      return {
        id: payload.id,
        name: payload.name || name,
        mimeType: payload.mimeType || mimeType,
        webViewLink: payload.webViewLink || '',
        webContentLink: payload.webContentLink || '',
        thumbnailLink: payload.thumbnailLink || '',
        parentId: parentId
      };
    }

    function pickRootFolderId(logDetail) {
      const storageConfig = moduleState.storageConfig || {};
      const logStorage = logDetail && logDetail.log && logDetail.log.storage && logDetail.log.storage.googleDrive
        ? logDetail.log.storage.googleDrive
        : {};
      const rootFolderId = extractDriveId(
        (storageConfig.googleDrive && storageConfig.googleDrive.folderId)
          || (storageConfig.googleDrive && storageConfig.googleDrive.shareUrl)
          || (moduleState.authConfig && moduleState.authConfig.folderId)
          || (moduleState.authConfig && moduleState.authConfig.shareUrl)
      );
      const rootShareUrl = safeTrim(
        (storageConfig.googleDrive && storageConfig.googleDrive.shareUrl)
          || (moduleState.authConfig && moduleState.authConfig.shareUrl)
      );
      const logFolderId = extractDriveId(logStorage.folderId || logStorage.shareUrl);
      const logShareUrl = safeTrim(logStorage.shareUrl);
      const hasDedicatedFolder = !!logFolderId && (
        !rootFolderId
        || logFolderId !== rootFolderId
        || (logShareUrl && rootShareUrl && logShareUrl !== rootShareUrl)
      );

      return {
        rootFolderId: rootFolderId,
        rootShareUrl: rootShareUrl,
        logFolderId: logFolderId,
        hasDedicatedFolder: hasDedicatedFolder
      };
    }

    async function resolveLogFolder(logDetail) {
      const ids = pickRootFolderId(logDetail);
      const folderName = safeTrim(logDetail && logDetail.log && logDetail.log.folderName) || 'Brygglogg';

      if (ids.hasDedicatedFolder) {
        return {
          id: ids.logFolderId,
          name: folderName,
          webViewLink: buildDriveFolderUrl(ids.logFolderId),
          pathLabel: BREWING_LIBRARY_FOLDER + '/' + folderName
        };
      }

      if (!ids.rootFolderId) {
        throw new Error('Ingen standardmappe er satt for Google Drive ennå.');
      }

      const brewingFolder = await ensureFolder(ids.rootFolderId, BREWING_LIBRARY_FOLDER);
      const logFolder = await ensureFolder(brewingFolder.id, folderName);
      return {
        id: logFolder.id,
        name: logFolder.name || folderName,
        webViewLink: logFolder.webViewLink || buildDriveFolderUrl(logFolder.id),
        pathLabel: BREWING_LIBRARY_FOLDER + '/' + (logFolder.name || folderName)
      };
    }

    async function syncPackageFiles(folderId, packageFiles) {
      const uploaded = [];
      for (let index = 0; index < packageFiles.length; index += 1) {
        const file = packageFiles[index];
        const blob = new Blob([String(file.content || '')], {
          type: (file.mimeType || 'text/plain') + ';charset=utf-8'
        });
        uploaded.push(await createOrUpdateFile(folderId, file.name, file.mimeType || 'text/plain', blob));
      }
      return uploaded;
    }

    async function syncLocalImages(imageFolderId, images) {
      const uploaded = [];
      const safeImages = Array.isArray(images) ? images : [];
      for (let index = 0; index < safeImages.length; index += 1) {
        const image = safeImages[index];
        if (!image || !image.url || !image.name) continue;
        const response = await fetch(image.url, { cache: 'no-store' });
        if (!response.ok) continue;
        const blob = await response.blob();
        uploaded.push(await createOrUpdateFile(
          imageFolderId,
          image.name,
          blob.type || 'application/octet-stream',
          blob
        ));
      }
      return uploaded;
    }

    async function listFolderImages(parentId) {
      if (!parentId) return [];
      const query = [
        "trashed = false",
        "'" + escapeDriveQueryValue(parentId) + "' in parents",
        "(mimeType contains 'image/' or name contains '.jpg' or name contains '.jpeg' or name contains '.png' or name contains '.webp' or name contains '.gif' or name contains '.bmp' or name contains '.avif' or name contains '.svg')"
      ].join(' and ');
      const url = DRIVE_API_BASE + '/files'
        + '?supportsAllDrives=true'
        + '&includeItemsFromAllDrives=true'
        + '&pageSize=200'
        + '&fields=files(id,name,mimeType,webViewLink,webContentLink,thumbnailLink,parents)'
        + '&orderBy=createdTime desc'
        + '&q=' + encodeURIComponent(query);
      const payload = await driveJson(url, { method: 'GET' });
      return Array.isArray(payload.files) ? payload.files : [];
    }

    async function fetchLogImages(log) {
      const drive = log && log.storage && log.storage.googleDrive ? log.storage.googleDrive : null;
      const logFolderId = extractDriveId(drive && (drive.folderId || drive.shareUrl));
      if (!logFolderId) return [];
      if (!moduleState.connected && !hasFreshToken()) return [];

      await ensureAccessToken(false);
      const images = await listFolderImages(logFolderId);
      const imageFolder = await searchChild(logFolderId, 'bilder', FOLDER_MIME);
      if (imageFolder && imageFolder.id) {
        const childImages = await listFolderImages(imageFolder.id);
        childImages.forEach(function (entry) {
          images.push(entry);
        });
      }
      return images;
    }

    async function fetchAccountLabel() {
      if (safeTrim(moduleState.accountLabel)) {
        return moduleState.accountLabel;
      }

      try {
        const payload = await driveJson(
          DRIVE_API_BASE + '/about?fields=user(displayName,emailAddress)',
          { method: 'GET' }
        );
        const user = payload && payload.user ? payload.user : {};
        const label = safeTrim(user.emailAddress) || safeTrim(user.displayName);
        if (label) {
          moduleState.accountLabel = label;
        }
      } catch (error) {
      }

      return safeTrim(moduleState.accountLabel) || 'Google Drive OAuth';
    }

    function buildStoragePayload(log, folderMeta, fileRecords) {
      const currentStorage = log && log.storage ? log.storage : {};
      const currentDrive = currentStorage.googleDrive || {};
      const mode = safeTrim(currentStorage.mode) === 'google-drive'
        ? 'google-drive'
        : 'hybrid';
      const storageConfig = moduleState.storageConfig || {};
      const rootLabel = safeTrim(
        (storageConfig.googleDrive && storageConfig.googleDrive.folderLabel)
          || currentDrive.folderLabel
      );
      const normalizedRootLabel = rootLabel
        ? rootLabel.replace(/\/?Bryggelogger$/i, '').replace(/\/+$/, '')
        : '';
      const resolvedFolderLabel = normalizedRootLabel
        ? normalizedRootLabel + '/' + (folderMeta.pathLabel || folderMeta.name || 'Brygglogg')
        : (folderMeta.pathLabel || folderMeta.name || 'Brygglogg');
      return {
        mode: mode,
        googleDrive: {
          folderId: folderMeta.id,
          shareUrl: folderMeta.webViewLink || buildDriveFolderUrl(folderMeta.id),
          folderLabel: resolvedFolderLabel,
          note: safeTrim(currentDrive.note),
          accountLabel: safeTrim(moduleState.accountLabel) || safeTrim(currentDrive.accountLabel) || 'Google Drive OAuth',
          lastSyncedAt: new Date().toISOString(),
          files: Array.isArray(fileRecords) ? fileRecords : []
        }
      };
    }

    async function connect(interactive) {
      try {
        setBusy(true, 'Google Drive: kobler til konto...');
        await ensureAccessToken(interactive !== false);
        const accountLabel = await fetchAccountLabel();
        writeSavedSession({
          clientId: safeTrim(moduleState.authConfig && moduleState.authConfig.clientId),
          accountLabel: safeTrim(accountLabel),
          savedAt: new Date().toISOString()
        });
        setStatus('Google Drive: konto koblet' + (accountLabel ? ' som ' + accountLabel : ''), true);
        return true;
      } catch (error) {
        if (interactive) {
          clearSavedSession();
        }
        setStatus('Google Drive: tilkobling feilet (' + error.message + ')', false);
        throw error;
      } finally {
        setBusy(false);
      }
    }

    async function silentReconnect() {
      if (!isConfigured() || moduleState.connected || moduleState.busy) {
        return false;
      }

      const savedSession = readSavedSession();
      if (!savedSession || safeTrim(savedSession.clientId) !== safeTrim(moduleState.authConfig && moduleState.authConfig.clientId)) {
        return false;
      }

      try {
        setStatus(
          'Google Drive: gjenopptar kobling' + (moduleState.accountLabel ? ' for ' + moduleState.accountLabel : '') + '...',
          false
        );
        await ensureAccessToken(false);
        const accountLabel = await fetchAccountLabel();
        writeSavedSession({
          clientId: safeTrim(moduleState.authConfig && moduleState.authConfig.clientId),
          accountLabel: safeTrim(accountLabel),
          savedAt: new Date().toISOString()
        });
        setStatus('Google Drive: konto koblet' + (accountLabel ? ' som ' + accountLabel : ''), true);
        return true;
      } catch (error) {
        clearSavedSession();
        const rootFolderId = extractDriveId(
          (moduleState.storageConfig && moduleState.storageConfig.googleDrive && moduleState.storageConfig.googleDrive.folderId)
            || (moduleState.authConfig && moduleState.authConfig.folderId)
        );
        setStatus(
          rootFolderId
            ? 'Google Drive: klar til innlogging og synk'
            : 'Google Drive: OAuth klart, men standardmappe mangler',
          false
        );
        return false;
      }
    }

    async function syncLogBySlug(slug, options) {
      const targetSlug = safeTrim(slug);
      if (!targetSlug) {
        throw new Error('Velg en bryggelogg før synk.');
      }

      const syncOptions = options || {};
      try {
        setBusy(true, 'Google Drive: forbereder synk...');
        await ensureAccessToken(syncOptions.interactive !== false);
        await fetchAccountLabel();

        const detail = await tools.fetchLogDetail(targetSlug);
        const logFolder = await resolveLogFolder(detail);
        const initialStorage = buildStoragePayload(detail.log, logFolder, []);
        await tools.saveLogStorage({
          action: 'save-log-storage',
          slug: targetSlug,
          storage: initialStorage
        });

        setStatus('Google Drive: bygger filer for opplasting...', true);
        const prepared = await tools.prepareDriveSyncPackage(targetSlug);
        const rootFiles = Array.isArray(prepared.package && prepared.package.files) ? prepared.package.files : [];
        const subfolders = Array.isArray(prepared.package && prepared.package.subfolders) ? prepared.package.subfolders : [];
        const fileRecords = await syncPackageFiles(logFolder.id, rootFiles);

        for (let index = 0; index < subfolders.length; index += 1) {
          const subfolder = subfolders[index];
          const childFolder = await ensureFolder(logFolder.id, subfolder.name || 'bilder');
          const childFiles = await syncPackageFiles(childFolder.id, Array.isArray(subfolder.files) ? subfolder.files : []);
          childFiles.forEach(function (entry) {
            fileRecords.push(entry);
          });
          if ((subfolder.name || '') === 'bilder') {
            const imageUploads = await syncLocalImages(childFolder.id, prepared.images || []);
            imageUploads.forEach(function (entry) {
              fileRecords.push(entry);
            });
          }
        }

        const finalStorage = buildStoragePayload(prepared.log, logFolder, fileRecords);
        const saved = await tools.saveLogStorage({
          action: 'save-log-storage',
          slug: targetSlug,
          storage: finalStorage
        });

        setStatus(
          'Google Drive: synket ' + (prepared.log && prepared.log.folderName ? prepared.log.folderName : targetSlug)
            + ' · ' + formatTimestamp(finalStorage.googleDrive.lastSyncedAt)
            + (finalStorage.googleDrive.accountLabel ? ' · ' + finalStorage.googleDrive.accountLabel : ''),
          true
        );

        return {
          saved: saved,
          folder: logFolder,
          files: fileRecords
        };
      } catch (error) {
        setStatus('Google Drive: synk feilet (' + error.message + ')', moduleState.connected);
        throw error;
      } finally {
        setBusy(false);
      }
    }

    function shouldAutoSync(mode) {
      const normalized = safeTrim(mode);
      return isConfigured() && (normalized === 'hybrid' || normalized === 'google-drive');
    }

    setConfig(config.authConfig || null, config.storageConfig || null);

    return {
      connect: connect,
      fetchLogImages: fetchLogImages,
      silentReconnect: silentReconnect,
      setConfig: setConfig,
      shouldAutoSync: shouldAutoSync,
      syncLogBySlug: syncLogBySlug
    };
  }

  global.BrewingGoogleDrive = {
    createModule: createModule
  };
}(window));
