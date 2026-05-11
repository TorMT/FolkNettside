(function (global) {
  'use strict';

  const CACHE_KEY = 'brewingDashboardCache:v7';
  const CACHE_MAX_AGE_MS = 2 * 60 * 60 * 1000;
  const renderApi = global.BrewingHydrometerRender;
  const logApi = global.BrewingLogViewer;
  const recipeApi = global.BrewingRecipeEngine;
  const toolsApi = global.SandalenToolsViewer;
  const filterApi = global.BrewingHydrometerFilter;

  const state = {
    activeView: 'hydrometer',
    days: 'max',
    fromDate: '',
    toDate: '',
    dateOverrides: {},
    devices: [],
    selectedId: '',
    username: '',
    generatedAt: '',
    usedCache: false,
    cacheAgeMs: null,
    maxDaysLoaded: 'max',
    batchName: '',
    batchNameTouched: false,
    folderName: '',
    exportDeviceId: '',
    currentAnalysis: null,
    logs: [],
    selectedLogSlug: '',
    recipes: [],
    recipeResults: null,
    recipeProviders: [],
    recipeCatalogs: null,
    storageOptions: [],
    storageConfig: null,
    linkedRecipe: null,
    selectedRecipeId: '',
    recipeQuery: ''
  };

  const els = {
    viewTabs: Array.from(document.querySelectorAll('#viewTabs [data-view]')),
    panels: Array.from(document.querySelectorAll('.view-panel')),
    hydrometerControls: document.getElementById('hydrometerControls'),
    rangeButtons: Array.from(document.querySelectorAll('#rangeRow .range-btn')),
    refreshBtn: document.getElementById('refreshBtn'),
    fromDateInput: document.getElementById('fromDateInput'),
    toDateInput: document.getElementById('toDateInput'),
    clearDateBtn: document.getElementById('clearDateBtn'),
    accountPill: document.getElementById('accountPill'),
    updatedPill: document.getElementById('updatedPill'),
    sourcePill: document.getElementById('sourcePill'),
    windowPill: document.getElementById('windowPill'),
    topStats: document.getElementById('topStats'),
    deviceList: document.getElementById('deviceList'),
    deviceTitle: document.getElementById('deviceTitle'),
    deviceSubtitle: document.getElementById('deviceSubtitle'),
    devicePills: document.getElementById('devicePills'),
    metricsGrid: document.getElementById('metricsGrid'),
    beerOverviewGrid: document.getElementById('beerOverviewGrid'),
    alertStack: document.getElementById('alertStack'),
    chartGrid: document.getElementById('chartGrid'),
    fermentationLog: document.getElementById('fermentationLog'),
    exportDeviceSelect: document.getElementById('exportDeviceSelect'),
    batchNameInput: document.getElementById('batchNameInput'),
    storageModeSelect: document.getElementById('storageModeSelect'),
    driveRootUrlInput: document.getElementById('driveRootUrlInput'),
    logDriveUrlInput: document.getElementById('logDriveUrlInput'),
    downloadLogBtn: document.getElementById('downloadLogBtn'),
    startDraftLogBtn: document.getElementById('startDraftLogBtn'),
    updateSelectedLogBtn: document.getElementById('updateSelectedLogBtn'),
    connectGoogleDriveBtn: document.getElementById('connectGoogleDriveBtn'),
    syncSelectedDriveBtn: document.getElementById('syncSelectedDriveBtn'),
    refreshLogsBtn: document.getElementById('refreshLogsBtn'),
    saveStorageConfigBtn: document.getElementById('saveStorageConfigBtn'),
    saveLogDriveBtn: document.getElementById('saveLogDriveBtn'),
    openDriveLibraryBtn: document.getElementById('openDriveLibraryBtn'),
    exportHintPill: document.getElementById('exportHintPill'),
    driveAuthPill: document.getElementById('driveAuthPill'),
    storageHintPill: document.getElementById('storageHintPill'),
    logStorageOptions: document.getElementById('logStorageOptions'),
    brewLogList: document.getElementById('brewLogList'),
    brewLogTitle: document.getElementById('brewLogTitle'),
    brewLogSubtitle: document.getElementById('brewLogSubtitle'),
    brewLogPills: document.getElementById('brewLogPills'),
    brewLogText: document.getElementById('brewLogText'),
    brewLogImages: document.getElementById('brewLogImages'),
    brewLogImageMeta: document.getElementById('brewLogImageMeta'),
    recipeMaltInput: document.getElementById('recipeMaltInput'),
    recipeHopInput: document.getElementById('recipeHopInput'),
    recipeIngredientInput: document.getElementById('recipeIngredientInput'),
    recipeVolumeInput: document.getElementById('recipeVolumeInput'),
    searchRecipesBtn: document.getElementById('searchRecipesBtn'),
    refreshRecipesBtn: document.getElementById('refreshRecipesBtn'),
    downloadRecipeTemplateBtn: document.getElementById('downloadRecipeTemplateBtn'),
    recipeProviderPills: document.getElementById('recipeProviderPills'),
    recipeList: document.getElementById('recipeList'),
    recipeTitle: document.getElementById('recipeTitle'),
    recipeSubtitle: document.getElementById('recipeSubtitle'),
    recipePills: document.getElementById('recipePills'),
    recipeText: document.getElementById('recipeText'),
    referenceList: document.getElementById('referenceList'),
    referenceMeta: document.getElementById('referenceMeta'),
    recipeSearchMeta: document.getElementById('recipeSearchMeta'),
    openToolsBtn: document.getElementById('openToolsBtn'),
    toolsViewerSlot: document.getElementById('toolsViewerSlot')
  };

  let logModule;
  let recipeModule;

  async function ensureLogsLoaded() {
    if (Array.isArray(state.logs) && state.logs.length) {
      return state.logs;
    }
    if (logModule) {
      await logModule.refreshList();
    }
    return state.logs;
  }

  async function navigateToRecipe(recipeRef) {
    if (!recipeRef || !recipeRef.id || !recipeModule) return false;
    setActiveView('recipes');
    return recipeModule.selectRecipeByRef ? recipeModule.selectRecipeByRef(recipeRef) : false;
  }

  async function navigateToLog(slug) {
    if (!slug || !logModule) return false;
    setActiveView('logs');
    return logModule.selectLog ? logModule.selectLog(slug) : false;
  }

  logModule = logApi.createModule({
    elements: els,
    state: state,
    onRecipeNavigate: navigateToRecipe,
    getExportPayload: function () {
      const exportDevice = state.devices.find(function (device) {
        return device.id === state.exportDeviceId;
      }) || state.devices.find(function (device) {
        return device.id === state.selectedId;
      }) || state.devices[0] || null;
      const exportAnalysis = exportDevice ? renderApi.buildAnalysis(exportDevice, state) : state.currentAnalysis;
      const payload = renderApi.buildExportPayload(exportAnalysis, state);
      return payload;
    }
  });

  recipeModule = recipeApi.createModule({
    elements: els,
    state: state,
    ensureLogsLoaded: ensureLogsLoaded,
    onLogNavigate: navigateToLog,
    onRecipeChange: function () {
      if (state.devices.length) {
        renderHydrometer();
      }
    }
  });

  const toolsModule = toolsApi.createModule({
    button: els.openToolsBtn,
    slot: els.toolsViewerSlot
  });

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !parsed.savedAt || !parsed.payload) return null;
      const ageMs = Date.now() - Number(parsed.savedAt);
      if (!Number.isFinite(ageMs) || ageMs < 0) return null;
      return { payload: parsed.payload, ageMs: ageMs };
    } catch (error) {
      return null;
    }
  }

  function writeCache(payload) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        savedAt: Date.now(),
        payload: payload
      }));
    } catch (error) {
      console.warn('[brygging] Kunne ikke lagre cache:', error);
    }
  }

  function cacheFresh(entry) {
    return !!entry && entry.ageMs <= CACHE_MAX_AGE_MS;
  }

  function setActiveView(view) {
    state.activeView = view;
    els.viewTabs.forEach(function (button) {
      const isActive = button.getAttribute('data-view') === view;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    els.panels.forEach(function (panel) {
      panel.classList.toggle('active', panel.getAttribute('data-view') === view);
    });
    els.hydrometerControls.classList.toggle('hidden', view !== 'hydrometer');
  }

  function syncDateInputs(analysis) {
    if (!analysis) return;
    if (document.activeElement !== els.fromDateInput) {
      els.fromDateInput.value = state.fromDate || filterApi.formatDateInputValue(analysis.windowMeta.effectiveStart);
    }
    if (document.activeElement !== els.toDateInput) {
      els.toDateInput.value = state.toDate || filterApi.formatDateInputValue(analysis.windowMeta.effectiveEnd);
    }
    els.windowPill.textContent = 'Tidsvindu: ' + analysis.windowMeta.label;
  }

  function syncBatchName(analysis) {
    if (state.batchNameTouched) return;
    const exportDevice = state.devices.find(function (device) {
      return device.id === state.exportDeviceId;
    }) || (analysis && analysis.device) || null;
    const defaultName = (exportDevice && (exportDevice.activeProfileName || exportDevice.name)) || 'Brygg';
    state.batchName = defaultName;
    els.batchNameInput.value = defaultName;
    logModule.updateExportHint();
  }

  function loadDateOverrideForSelectedDevice() {
    const override = state.selectedId ? state.dateOverrides[state.selectedId] : null;
    state.fromDate = override && override.fromDate ? override.fromDate : '';
    state.toDate = override && override.toDate ? override.toDate : '';
  }

  function storeDateOverrideForSelectedDevice() {
    if (!state.selectedId) return;
    if (!state.fromDate && !state.toDate) {
      delete state.dateOverrides[state.selectedId];
      return;
    }
    state.dateOverrides[state.selectedId] = {
      fromDate: state.fromDate || '',
      toDate: state.toDate || ''
    };
  }

  function applyPayload(payload, options) {
    state.devices = Array.isArray(payload.devices) ? payload.devices : [];
    state.username = payload.username || '';
    state.generatedAt = payload.generatedAt || '';
    state.usedCache = !!(options && options.usedCache);
    state.cacheAgeMs = options && Number.isFinite(options.cacheAgeMs) ? options.cacheAgeMs : null;
    if (!state.devices.some(function (device) { return device.id === state.selectedId; })) {
      state.selectedId = state.devices[0] ? state.devices[0].id : '';
    }
    loadDateOverrideForSelectedDevice();
    if (!state.devices.some(function (device) { return device.id === state.exportDeviceId; })) {
      state.exportDeviceId = state.selectedId || (state.devices[0] ? state.devices[0].id : '');
    }
    renderHydrometer();
  }

  function syncExportDeviceSelect() {
    if (!els.exportDeviceSelect) return;
    const devices = Array.isArray(state.devices) ? state.devices : [];
    if (!devices.length) {
      els.exportDeviceSelect.innerHTML = '<option value="">Ingen hydrometere funnet</option>';
      return;
    }

    els.exportDeviceSelect.innerHTML = devices.map(function (device) {
      const label = (device.name || 'Uten navn') + (device.activeProfileName ? (' - ' + device.activeProfileName) : '');
      const selected = device.id === state.exportDeviceId ? ' selected' : '';
      return '<option value="' + renderApi.escapeHtml(device.id) + '"' + selected + '>' + renderApi.escapeHtml(label) + '</option>';
    }).join('');
  }

  function wireDeviceList() {
    Array.from(els.deviceList.querySelectorAll('[data-id]')).forEach(function (button) {
      button.addEventListener('click', function () {
        state.selectedId = button.getAttribute('data-id') || '';
        if (!state.exportDeviceId) {
          state.exportDeviceId = state.selectedId;
        }
        loadDateOverrideForSelectedDevice();
        renderHydrometer();
      });
    });
  }

  function renderMetaPills(analysis) {
    els.accountPill.textContent = 'Konto: ' + (state.username || '--');
    if (state.usedCache && Number.isFinite(state.cacheAgeMs)) {
      const cacheMinutes = Math.max(1, Math.round(state.cacheAgeMs / 60000));
      els.updatedPill.textContent = 'Cache: ' + cacheMinutes + ' min gammel';
      els.sourcePill.textContent = 'Datakilde: lokal cache';
      els.sourcePill.classList.add('offline');
    } else {
      els.updatedPill.textContent = 'Oppdatert: ' + (analysis ? renderApi.fmtTime(state.generatedAt) : '--');
      els.sourcePill.textContent = 'Datakilde: live henting';
      els.sourcePill.classList.remove('offline');
    }
  }

  function renderHydrometer() {
    state.currentAnalysis = renderApi.renderHydrometerView(els, state);
    renderMetaPills(state.currentAnalysis);
    syncExportDeviceSelect();
    syncDateInputs(state.currentAnalysis);
    syncBatchName(state.currentAnalysis);
    els.rangeButtons.forEach(function (button) {
      const isActive = button.getAttribute('data-days') === String(state.days);
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    wireDeviceList();
  }

  async function loadDashboard(options) {
    const force = !!(options && options.force);
    if (!force) {
      const cacheEntry = readCache();
      if (cacheFresh(cacheEntry)) {
        applyPayload(cacheEntry.payload, {
          usedCache: true,
          cacheAgeMs: cacheEntry.ageMs
        });
        return;
      }
    }

    els.refreshBtn.disabled = true;
    els.refreshBtn.textContent = 'Henter live...';
    els.deviceList.innerHTML = '<div class="loading">Henter hydrometerdata...</div>';

    try {
      const response = await fetch('/includes/rapt/api/dashboard.php?days=' + encodeURIComponent(state.maxDaysLoaded), { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error((payload && payload.error) || ('HTTP ' + response.status));
      writeCache(payload);
      applyPayload(payload, {
        usedCache: false,
        cacheAgeMs: 0
      });
    } catch (error) {
      els.deviceList.innerHTML = '<div class="empty-state">Klarte ikke hente hydrometerdata: ' + renderApi.escapeHtml(error.message) + '</div>';
      els.deviceTitle.textContent = 'Kunne ikke laste dashboard';
      els.deviceSubtitle.textContent = 'Sjekk RAPT-oppsettet eller prøv igjen.';
      els.metricsGrid.innerHTML = '';
      els.beerOverviewGrid.innerHTML = '';
      els.chartGrid.innerHTML = '';
      els.alertStack.innerHTML = '<div class="empty-state">Ingen varsler kunne genereres.</div>';
      els.sourcePill.textContent = 'Datakilde: utilgjengelig';
      els.fermentationLog.innerHTML = '<h3>Gjæringslogg</h3><p>Dashboardet kunne ikke hente data, så ingen logg ble generert.</p>';
    } finally {
      els.refreshBtn.disabled = false;
      els.refreshBtn.textContent = 'Tving ny henting';
    }
  }

  els.viewTabs.forEach(function (button) {
    button.addEventListener('click', function () {
      setActiveView(button.getAttribute('data-view') || 'hydrometer');
      if (state.activeView === 'logs') {
        logModule.refreshList();
      }
      if (state.activeView === 'recipes') {
        recipeModule.refreshRecipes(false);
      }
    });
  });

  els.rangeButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      state.days = button.getAttribute('data-days') || '7';
      state.fromDate = '';
      state.toDate = '';
      storeDateOverrideForSelectedDevice();
      renderHydrometer();
    });
  });

  els.fromDateInput.addEventListener('change', function () {
    state.fromDate = els.fromDateInput.value || '';
    storeDateOverrideForSelectedDevice();
    renderHydrometer();
  });

  els.toDateInput.addEventListener('change', function () {
    state.toDate = els.toDateInput.value || '';
    storeDateOverrideForSelectedDevice();
    renderHydrometer();
  });

  els.clearDateBtn.addEventListener('click', function () {
    state.fromDate = '';
    state.toDate = '';
    storeDateOverrideForSelectedDevice();
    renderHydrometer();
  });

  els.batchNameInput.addEventListener('input', function () {
    state.batchNameTouched = true;
    state.batchName = els.batchNameInput.value || '';
  });

  if (els.exportDeviceSelect) {
    els.exportDeviceSelect.addEventListener('change', function () {
      state.exportDeviceId = els.exportDeviceSelect.value || '';
      state.batchNameTouched = false;
      syncBatchName(state.currentAnalysis);
      logModule.updateExportHint();
    });
  }

  els.refreshBtn.addEventListener('click', function () {
    loadDashboard({ force: true });
  });

  const forceFromQuery = new URLSearchParams(window.location.search).get('refresh') === '1';
  setActiveView('hydrometer');
  loadDashboard({ force: forceFromQuery });
  recipeModule.refreshRecipes(false);
  logModule.refreshList();

  global.BrewingApp = {
    state: state,
    toolsModule: toolsModule
  };
}(window));
