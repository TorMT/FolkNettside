(function () {
  function applyThemePayload(payload) {
    try {
      const root = document.documentElement;
      if (payload && payload.themeAttr) root.setAttribute("data-theme", payload.themeAttr);
      const vars = payload?.vars || {};
      Object.keys(vars).forEach((k) => root.style.setProperty(k, vars[k]));
    } catch {}
  }

  function syncFromParentTheme() {
    try {
      if (!window.parent || window.parent === window) return;
      const parentRoot = window.parent.document.documentElement;
      const parentStyle = getComputedStyle(parentRoot);
      const vars = {};
      for (let i = 0; i < parentStyle.length; i++) {
        const name = parentStyle[i];
        if (name.startsWith("--")) vars[name] = parentStyle.getPropertyValue(name).trim();
      }
      applyThemePayload({ themeAttr: parentRoot.getAttribute("data-theme"), vars });
    } catch {}
  }

  window.addEventListener("message", (e) => {
    if (e?.data?.type === "theme-sync") applyThemePayload(e.data);
  });
  syncFromParentTheme();

  const qs = new URLSearchParams(location.search);
  const file = qs.get("file");
  const viewerFrame = document.getElementById("viewerFrame");
  const viewerLoading = document.getElementById("viewerLoading");
  const viewerTitle = document.getElementById("viewerTitle");
  const btnToggleDrawer = document.getElementById("btnToggleDrawer");
  const drawer = document.getElementById("drawer");
  const drawerBackdrop = document.getElementById("drawerBackdrop");
  const headline = document.getElementById("headline");
  const metaGrid = document.getElementById("metaGrid");
  const checks = document.getElementById("checks");
  const timeline = document.getElementById("timeline");
  const details = document.getElementById("details");
  const components = document.getElementById("components");
  const componentFilter = document.getElementById("componentFilter");
  const inpExplode = document.getElementById("inpExplode");
  const txtExplodePct = document.getElementById("txtExplodePct");
  const txtExplodeHint = document.getElementById("txtExplodeHint");
  const btnExplodeReset = document.getElementById("btnExplodeReset");

  const btnRaw = document.getElementById("btnRaw");
  const btnFusion = document.getElementById("btnFusion");
  const btnBambu = document.getElementById("btnBambu");
  const btnBambuSelected = document.getElementById("btnBambuSelected");
  const btnStl = document.getElementById("btnStl");
  const btnComponentView = document.getElementById("btnComponentView");
  const btnSelectionExplode = document.getElementById("btnSelectionExplode");
  const btnExportSelected = document.getElementById("btnExportSelected");
  const btnToggleTools = document.getElementById("btnToggleTools");
  const btnToggleInfo = document.getElementById("btnToggleInfo");
  const btnTabOverview = document.getElementById("btnTabOverview");
  const btnTabHydro = document.getElementById("btnTabHydro");
  const infoCard = document.getElementById("infoCard");
  const toolsCard = document.getElementById("toolsCard");
  const hydroCard = document.getElementById("hydroCard");
  const componentsCard = document.getElementById("componentsCard");
  const chosenMuted = document.getElementById("chosenMuted");
  const chosenSet = new Set();
  const mutedSet = new Set();
  const expandedGroupSet = new Set();
  const viewerVisualState = {
    explode: 0,
    explodeSupported: false,
    explodeCount: 0,
  };
  const selectionToolState = {
    isolateChosen: false,
    explodeChosen: false,
    pendingSelectedExport: "",
  };
  const hydroControlState = {
    markers: true,
    waterline: true,
    contour: true,
  };
  const analysisState = {
    bbox: null,
    solidVolumeM3: null,
    source: "none",
    units: "m",
    geometrySource: "",
    materialHint: null,
    materialHintSource: "",
    viewerAnalysis: null,
    latestViewerMassProperties: null,
    latestHydroEstimate: null,
    latestViewerHydro: null,
    latestViewerReport: null,
  };
  const reportState = {
    payload: null,
    isGenerating: false,
    cacheKey: "",
    requestKey: "",
    detailSignature: "",
    startedAt: 0,
    lastDurationMs: null,
  };
  const hydroTaskState = {
    active: false,
    title: "",
    text: "",
    kind: "hydro",
    progress: null,
    etaMs: null,
    startedAt: 0,
    etaUpdatedAt: 0,
    progressUpdatedAt: 0,
  };
  let currentSidebarTab = "overview";
  const DRAWER_PREF_KEY = "fusionDrawerOpen.v20260410f";
  const REPORT_CACHE_VERSION = "20260521b";
  const MATERIAL_OVERRIDE_STORAGE_VERSION = "20260412g";

  function invalidateHydroReportState() {
    reportState.payload = null;
    reportState.cacheKey = "";
    reportState.requestKey = "";
    reportState.detailSignature = "";
  }

  function describeBlockCoefficientUsage(active, estimate = analysisState.latestHydroEstimate) {
    const cbValue = Number.isFinite(active?.blockCoefficient)
      ? active.blockCoefficient
      : Number.isFinite(estimate?.blockCoefficient)
        ? estimate.blockCoefficient
        : clampNumber(inpCb?.value, 0.1, 1, 0.6);
    const valueLabel = Number.isFinite(cbValue) ? Number(cbValue).toFixed(2) : "N/A";
    if (active?.isEstimate) {
      return {
        value: valueLabel,
        note: "Cb brukes aktivt i sidebar-estimatet for deplasement, vannlinjeareal og seksjonsareal-fallback.",
        isUsed: true,
        shouldShow: true,
      };
    }
    return {
      value: valueLabel,
      note: "Cb-feltet er kun fallback her. Live viewer-hydro bygger pa modellgeometri sa lenge viewerdata finnes.",
      isUsed: false,
      shouldShow: false,
    };
  }
  const REPORT_SESSION_PREFIX = `fusionHydroReport.${REPORT_CACHE_VERSION}`;
  const MATERIAL_OVERRIDE_STORAGE_PREFIX = "fusionMaterialOverrides";
  const headResultCache = new Map();
  const jsonResultCache = new Map();
  const arrayBufferResultCache = new Map();
  const MATERIAL_DENSITY = { steel: 7850, aluminum: 2700, pla: 1240, petg: 1270, abs: 1040, nylon: 1150, titanium: 4500, brass: 8500, grfp: 1850, wood: 600 };
  const MATERIAL_LIBRARY = {
    steel: { slug: "steel", label: "Stål", density: 7850, supportsInfill: false },
    aluminum: { slug: "aluminum", label: "Aluminium", density: 2700, supportsInfill: false },
    titanium: { slug: "titanium", label: "Titan", density: 4500, supportsInfill: false },
    brass: { slug: "brass", label: "Messing", density: 8500, supportsInfill: false },
    grfp: { slug: "grfp", label: "GRP", density: 1850, supportsInfill: false },
    wood: { slug: "wood", label: "Tre", density: 600, supportsInfill: false },
    pla: { slug: "pla", label: "PLA", density: 1240, supportsInfill: true },
    petg: { slug: "petg", label: "PETG", density: 1270, supportsInfill: true },
    abs: { slug: "abs", label: "ABS", density: 1040, supportsInfill: true },
    nylon: { slug: "nylon", label: "Nylon", density: 1150, supportsInfill: true },
    custom: { slug: "custom", label: "Custom", density: 1240, supportsInfill: true },
  };
  const MATERIAL_PROFILES = [
    { slug: "steel", label: "Stål", density: 7850, patterns: [/\bsteel\b/i, /\bstål\b/i, /\bstainless\b/i, /\binox\b/i] },
    { slug: "aluminum", label: "Aluminium", density: 2700, patterns: [/\balum(?:inium|inum)?\b/i, /\balu\b/i] },
    { slug: "grfp", label: "GRP / kompositt", density: 1850, patterns: [/\bgrp\b/i, /\bgfrp\b/i, /\bfiberglass\b/i, /\bglass\s*fiber\b/i, /\bkompositt\b/i] },
    { slug: "wood", label: "Tre", density: 600, patterns: [/\bwood\b/i, /\btimber\b/i, /\btre\b/i] },
    { slug: "custom", label: "Plast / polymer", density: 1240, patterns: [/\bpla\b/i, /\bpetg\b/i, /\babs\b/i, /\bnylon\b/i, /\bplastic\b/i, /\bpolymer\b/i, /\bplast\b/i] },
  ];
  MATERIAL_PROFILES[0]?.patterns?.push(/\baisi\b/i, /\bs355\b/i);
  MATERIAL_PROFILES.splice(2, 0,
    { slug: "pla", label: "PLA", density: 1240, patterns: [/\bpla\b/i, /\bpolylactic\b/i] },
    { slug: "petg", label: "PETG", density: 1270, patterns: [/\bpetg\b/i, /\bpet-g\b/i] },
    { slug: "abs", label: "ABS", density: 1040, patterns: [/\babs\b/i, /\bacrylonitrile\b/i] },
    { slug: "nylon", label: "Nylon", density: 1150, patterns: [/\bnylon\b/i, /\bpa6\b/i, /\bpa12\b/i, /\bpolyamide\b/i] },
    { slug: "titanium", label: "Titan", density: 4500, patterns: [/\btitan(?:ium)?\b/i, /\bti-?6al-?4v\b/i] },
    { slug: "brass", label: "Messing", density: 8500, patterns: [/\bbrass\b/i, /\bmessing\b/i] },
  );
  const CAD_EXT = new Set(["stl", "obj", "step", "stp", "iges", "igs", "3mf", "3fm", "f3d", "f3z", "fbm", "fm3", "sat", "smt", "x_t", "x_b", "sldprt", "sldasm"]);
  const BAMBU_EXT = new Set(["stl", "3mf", "3fm", "obj"]);
  const inpRhoWater = document.getElementById("inpRhoWater");
  const selMaterial = document.getElementById("selMaterial");
  const inpRhoMat = document.getElementById("inpRhoMat");
  const inpCb = document.getElementById("inpCb");
  const inpThicknessMm = document.getElementById("inpThicknessMm");
  const btnHydroCalc = document.getElementById("btnHydroCalc");
  const btnHydroApply = document.getElementById("btnHydroApply");
  const btnHydroResetPose = document.getElementById("btnHydroResetPose");
  const btnHydroReport = document.getElementById("btnHydroReport");
  const btnHydroRecalc = document.getElementById("btnHydroRecalc");
  const inpHydroDraft = document.getElementById("inpHydroDraft");
  const inpHydroTrim = document.getElementById("inpHydroTrim");
  const inpHydroHeel = document.getElementById("inpHydroHeel");
  const selHydroQuality = document.getElementById("selHydroQuality");
  const chkHydroPerfMode = document.getElementById("chkHydroPerfMode");
  const chkHydroMarkers = document.getElementById("chkHydroMarkers");
  const chkHydroWaterline = document.getElementById("chkHydroWaterline");
  const chkHydroContour = document.getElementById("chkHydroContour");
  const hydroProgress = document.getElementById("hydroProgress");
  const hydroProgressTitle = document.getElementById("hydroProgressTitle");
  const hydroProgressText = document.getElementById("hydroProgressText");
  const hydroProgressBar = hydroProgress?.querySelector(".hydro-progress-bar");
  const hydroLiveDraft = document.getElementById("hydroLiveDraft");
  const hydroLiveDraftSource = document.getElementById("hydroLiveDraftSource");
  const hydroLiveDisp = document.getElementById("hydroLiveDisp");
  const hydroLiveVolume = document.getElementById("hydroLiveVolume");
  const hydroLiveGM = document.getElementById("hydroLiveGM");
  const hydroLiveBM = document.getElementById("hydroLiveBM");
  const hydroLiveWaterline = document.getElementById("hydroLiveWaterline");
  const hydroLiveAttitude = document.getElementById("hydroLiveAttitude");
  const hydroQuickSummary = document.getElementById("hydroQuickSummary");
  const hydroSource = document.getElementById("hydroSource");
  const hydroMaterialHint = document.getElementById("hydroMaterialHint");
  const hydroWarn = document.getElementById("hydroWarn");
  const hydroReport = document.getElementById("hydroReport");
  const hydroReportModal = document.getElementById("hydroReportModal");
  const btnHydroReportClose = document.getElementById("btnHydroReportClose");
  const btnHydroReportPrint = document.getElementById("btnHydroReportPrint");
  const btnHydroReportJson = document.getElementById("btnHydroReportJson");
  const hydroReportTitle = document.getElementById("hydroReportTitle");
  const hydroReportMeta = document.getElementById("hydroReportMeta");
  const hydroSheetTitle = document.getElementById("hydroSheetTitle");
  const hydroSheetSubtitle = document.getElementById("hydroSheetSubtitle");
  const hydroSheetSource = document.getElementById("hydroSheetSource");
  const hydroReportSummary = document.getElementById("hydroReportSummary");
  const hydroReportCurve = document.getElementById("hydroReportCurve");
  const hydroReportDraftCurve = document.getElementById("hydroReportDraftCurve");
  const hydroReportSakCurve = document.getElementById("hydroReportSakCurve");
  const hydroReportAwpCurve = document.getElementById("hydroReportAwpCurve");
  const hydroReportTable = document.getElementById("hydroReportTable");
  const hydroReportComponentsWrap = document.getElementById("hydroReportComponentsWrap");
  const hydroReportComponentsBody = document.getElementById("hydroReportComponentsBody");
  const hydroReportComponentsNote = document.getElementById("hydroReportComponentsNote");
  const hydroCurveCaption = document.getElementById("hydroCurveCaption");
  const hydroDraftCaption = document.getElementById("hydroDraftCaption");
  const hydroSakCaption = document.getElementById("hydroSakCaption");
  const hydroAwpCaption = document.getElementById("hydroAwpCaption");
  const hydroReportPointNote = document.getElementById("hydroReportPointNote");
  const hydroReportEquilibrium = document.getElementById("hydroReportEquilibrium");
  const hydroReportEquilibriumNote = document.getElementById("hydroReportEquilibriumNote");
  const hydroReportMethodNote = document.getElementById("hydroReportMethodNote");
  const hydroReportSheet = document.getElementById("hydroReportSheet");
  const txtKgMode = document.getElementById("txtKgMode");

  if (!file) {
    headline.textContent = "Mangler ?file= parameter.";
    checks.innerHTML = "<span class='warn'>Ingen fil valgt.</span>";
    btnFusion.disabled = true;
    btnBambu.disabled = true;
    btnStl.disabled = true;
    throw new Error("Missing ?file=");
  }

  const decodedFile = file;
  const clean = decodedFile.split("?")[0].split("#")[0];
  const ext = (clean.split(".").pop() || "").toLowerCase();
  const fileName = clean.split("/").pop();
  const displayFileName = decodeDisplayText(fileName);
  const FUSION_ARCHIVE_EXTS = new Set(["f3d", "f3z", "3fz", "fbm"]);
  const MESH_PREVIEW_EXTS = new Set(["3mf", "3fm", "fm3", "stl"]);
  const CAD_PREVIEW_EXTS = new Set(["step", "stp", "iges", "igs", "obj", "ply", "fbx", "gltf", "glb", "sat", "smt", "x_t", "x_b", "sldprt", "sldasm", "slddrw"]);
  const FUSION_HEAVY_ANALYSIS_LIMIT_BYTES = 24 * 1024 * 1024;
  let stlCandidate = (() => {
    const m = decodedFile.match(/^([^?#]+)([?#].*)?$/);
    const base = m?.[1] || decodedFile;
    const tail = m?.[2] || "";
    return `${base.replace(/\.[^.\/]+$/i, ".stl")}${tail}`;
  })();
  let resolvedStlCandidate = "";
  let resolvedStepCandidate = "";
  let resolvedPreviewCandidate = "";
  let sourceFileSizeBytes = null;

  btnRaw.href = decodedFile;
  headline.textContent = `Fil: ${displayFileName || fileName} (.${ext || "ukjent"})`;
  if (viewerTitle) viewerTitle.textContent = displayFileName || fileName || "3D-modell";

  function cleanUrlPath(value) {
    return String(value || "").split("?")[0].split("#")[0];
  }
  function decodeDisplayText(value) {
    const source = String(value || "").trim();
    if (!source) return "";
    try {
      return decodeURIComponent(source);
    } catch {
      return source;
    }
  }
  function basenameFromUrl(value) {
    return decodeDisplayText(cleanUrlPath(value).split("/").pop() || "");
  }
  async function fetchHeadCached(url) {
    const key = String(url || "");
    if (!key) return null;
    if (!headResultCache.has(key)) {
      headResultCache.set(key, fetch(key, { method: "HEAD", cache: "default" })
        .then((res) => ({
          ok: res.ok,
          status: res.status,
          headers: {
            contentLength: res.headers.get("content-length"),
            contentType: res.headers.get("content-type"),
            lastModified: res.headers.get("last-modified"),
          },
        }))
        .catch(() => null));
    }
    return headResultCache.get(key);
  }
  async function headExists(url) {
    const head = await fetchHeadCached(url);
    return !!head?.ok;
  }
  async function fetchJsonCached(url) {
    const key = String(url || "");
    if (!key) return null;
    if (!jsonResultCache.has(key)) {
      jsonResultCache.set(key, fetch(key, { cache: "default" })
        .then(async (res) => res.ok ? res.json() : null)
        .catch(() => null));
    }
    return jsonResultCache.get(key);
  }
  async function fetchArrayBufferCached(url) {
    const key = String(url || "");
    if (!key) return null;
    if (!arrayBufferResultCache.has(key)) {
      arrayBufferResultCache.set(key, fetch(key, { cache: "default" })
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.arrayBuffer();
        })
        .catch((error) => {
          arrayBufferResultCache.delete(key);
          throw error;
        }));
    }
    return arrayBufferResultCache.get(key);
  }
  function fileExtFromUrl(value) {
    return (cleanUrlPath(value).match(/\.([^.\/]+)$/)?.[1] || "").toLowerCase();
  }
  function indexedDirPrefix(value) {
    const dir = String(value || "").trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
    return dir ? `${dir}/` : "";
  }
  function buildIndexedEntryUrl(basePath, dirName, entry) {
    const raw = String(entry || "").trim();
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) return raw;
    const rel = raw.split("|")[0].replace(/^\.?\//, "");
    return `${basePath}${indexedDirPrefix(dirName)}${rel}`;
  }
  function indexedDirNamesFromData(data) {
    return [...new Set(Object.values(data || {})
      .map((value) => typeof value?.dir === "string" ? value.dir : "")
      .filter(Boolean))];
  }
  function previewExtWeight(name) {
    const lower = String(name || "").toLowerCase();
    return (
      (/\.3mf(?:$|[?#])/.test(lower) ? 500 :
      /\.3fm(?:$|[?#])/.test(lower) ? 490 :
      /\.fm3(?:$|[?#])/.test(lower) ? 480 :
      /\.(step|stp)(?:$|[?#])/.test(lower) ? 420 :
      /\.(iges|igs)(?:$|[?#])/.test(lower) ? 390 :
      /\.(obj|glb|gltf|fbx|ply)(?:$|[?#])/.test(lower) ? 340 :
      /\.stl(?:$|[?#])/.test(lower) ? 300 :
      /\.(sat|smt|x_t|x_b|sldprt|sldasm|slddrw)(?:$|[?#])/.test(lower) ? 260 : 0)
    );
  }
  function sameStemCandidates(url) {
    const cleanUrl = cleanUrlPath(url);
    const match = cleanUrl.match(/^(.*?)(\.[^./?#]+)$/);
    if (!match) return [];
    const stem = match[1];
    const suffix = String(url || "").slice(cleanUrl.length);
    return [
      `${stem}.3mf${suffix}`,
      `${stem}.3fm${suffix}`,
      `${stem}.fm3${suffix}`,
      `${stem}.step${suffix}`,
      `${stem}.stp${suffix}`,
      `${stem}.iges${suffix}`,
      `${stem}.igs${suffix}`,
      `${stem}.obj${suffix}`,
      `${stem}.glb${suffix}`,
      `${stem}.gltf${suffix}`,
      `${stem}.fbx${suffix}`,
      `${stem}.ply${suffix}`,
      `${stem}.stl${suffix}`
    ];
  }
  function sameStemMeshPreviewCandidates(url) {
    return sameStemCandidates(url).filter((candidate) => MESH_PREVIEW_EXTS.has(fileExtFromUrl(candidate)));
  }
  function sameStemCandidatesInIndexedDirs(url, dirNames, extNames = [".3mf", ".3fm", ".fm3", ".stl"]) {
    const cleanUrl = cleanUrlPath(url);
    const slash = cleanUrl.lastIndexOf("/");
    if (slash < 0) return [];
    const basePath = cleanUrl.slice(0, slash + 1);
    const fileBase = cleanUrl.slice(slash + 1).replace(/\.[^.\/?#]+$/i, "");
    const suffix = String(url || "").slice(cleanUrl.length);
    const candidates = [];
    [...new Set((dirNames || []).map(indexedDirPrefix).filter(Boolean))].forEach((dirPrefix) => {
      extNames.forEach((extName) => {
        candidates.push(`${basePath}${dirPrefix}${fileBase}${extName}${suffix}`);
      });
    });
    return candidates;
  }
  async function firstExistingCandidateByOrder(candidates) {
    const unique = [...new Set((candidates || []).filter(Boolean))];
    if (!unique.length) return "";
    const results = await Promise.all(unique.map(async (candidate) => {
      try {
        return { candidate, ok: await headExists(candidate) };
      } catch {
        return { candidate, ok: false };
      }
    }));
    return results.find((entry) => entry.ok)?.candidate || "";
  }
  function getActiveStlCandidate() {
    return resolvedStlCandidate || "";
  }
  function getActiveStepCandidate() {
    return resolvedStepCandidate || "";
  }
  function getActivePreviewCandidate() {
    return resolvedPreviewCandidate || "";
  }
  function getActiveBambuCandidate() {
    const previewCandidate = getActivePreviewCandidate();
    if (BAMBU_EXT.has(fileExtFromUrl(previewCandidate))) return previewCandidate;
    if (BAMBU_EXT.has(ext)) return decodedFile;
    const stl = getActiveStlCandidate();
    if (BAMBU_EXT.has(fileExtFromUrl(stl))) return stl;
    return "";
  }
  function getResolvedChosenKeys() {
    return [...chosenSet]
      .map((token) => findComponentItem(token)?.key || "")
      .filter(Boolean);
  }
  function getSelectionScopeKeys() {
    return selectionToolState.explodeChosen ? getResolvedChosenKeys() : [];
  }
  function getSelectedComponentItems() {
    const keys = new Set(getResolvedChosenKeys());
    if (!keys.size) return [];
    return componentState.items.filter((item) => keys.has(item.key));
  }
  function collectComponentCandidateTerms(keys = getResolvedChosenKeys()) {
    const selectedItems = componentState.items.filter((item) => keys.includes(item.key));
    const values = [];
    selectedItems.forEach((item) => {
      values.push(
        item.label,
        item.subtitle,
        item.description,
        item.file,
        item.rootFileName,
        item.sourceName,
        item.nodePath
      );
    });
    return [...new Set(values
      .map((value) => stripExt(basename(decodeDisplayText(String(value || "").trim()))))
      .map((value) => value.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .filter((value) => !looksGuidish(value))
      .map((value) => value.toLowerCase()))];
  }
  async function resolveSelectionExportCandidate(allowedExts = BAMBU_EXT) {
    const keys = getResolvedChosenKeys();
    if (!keys.length) return "";
    const stems = collectComponentCandidateTerms(keys);
    if (!stems.length) return "";
    try {
      const basePath = clean.replace(/[^\/]+$/, "");
      if (!basePath) return "";
      const data = await fetchJsonCached(`${basePath}index.json`);
      if (!data) return "";
      const candidates = [];
      Object.values(data || {}).forEach((value) => {
        if (!value || !Array.isArray(value.files)) return;
        const dirName = typeof value?.dir === "string" ? value.dir : "";
        value.files.forEach((file) => {
          if (typeof file !== "string") return;
          const fullUrl = buildIndexedEntryUrl(basePath, dirName, file);
          if (!fullUrl) return;
          const extName = fileExtFromUrl(fullUrl);
          if (!allowedExts.has(extName)) return;
          const lowerBase = stripExt(basename(decodeDisplayText(fullUrl))).toLowerCase();
          let score = previewExtWeight(fullUrl);
          stems.forEach((stem) => {
            score += candidateScore(lowerBase, stem);
          });
          if (score > 120) candidates.push({ url: fullUrl, score });
        });
      });
      candidates.sort((a, b) => b.score - a.score || a.url.localeCompare(b.url, "nb"));
      return candidates[0]?.url || "";
    } catch {
      return "";
    }
  }
  function updateBambuButtonState({ canRead = true } = {}) {
    if (!btnBambu) return;
    const target = getActiveBambuCandidate();
    setDisabled(
      btnBambu,
      !canRead || !target,
      !canRead
        ? "Filen kunne ikke leses fra nettleseren."
        : "Fant ingen STL/3MF/OBJ-kandidat for Bambu Studio."
    );
    if (target) btnBambu.title = `Apner ${basenameFromUrl(target)} i Bambu Studio.`;
  }
  function sourceStemTokens(sourceStem) {
    return [...new Set(String(sourceStem || "").toLowerCase().split(/[_\-\s]+/).filter(Boolean))];
  }
  function candidateStem(name) {
    return cleanUrlPath(name).split("/").pop()?.replace(/\.[^.]+$/i, "").toLowerCase() || "";
  }
  function candidateTokenMatchCount(name, sourceStem) {
    const stem = candidateStem(name);
    return sourceStemTokens(sourceStem)
      .filter((token) => token.length >= 3)
      .filter((token) => stem.includes(token)).length;
  }
  function hasStrongFusionStemMatch(name, sourceStem) {
    const stem = candidateStem(name);
    if (!stem || !sourceStem) return false;
    if (stem === sourceStem) return true;
    if (stem.includes(sourceStem) || sourceStem.includes(stem)) return true;
    const tokens = sourceStemTokens(sourceStem).filter((token) => token.length >= 3);
    if (!tokens.length) return false;
    const matches = tokens.filter((token) => stem.includes(token)).length;
    return tokens.length >= 3 ? matches >= 3 : matches === tokens.length;
  }
  function candidateScore(name, sourceStem) {
    const stem = candidateStem(name);
    const tokens = sourceStemTokens(sourceStem);
    return (
      (stem === sourceStem ? 100 : 0) +
      ((sourceStem && (stem.includes(sourceStem) || sourceStem.includes(stem))) ? 80 : 0) +
      tokens.filter((token) => stem.includes(token)).length
    );
  }

  async function resolveSiblingStlCandidate() {
    const preferred = stlCandidate;
    try {
      if (await headExists(preferred)) {
        resolvedStlCandidate = preferred;
        return resolvedStlCandidate;
      }
    } catch {}

    try {
      const basePath = clean.replace(/[^\/]+$/, "");
      if (!basePath) return preferred;
      const indexUrl = `${basePath}index.json`;
      const data = await fetchJsonCached(indexUrl);
      if (!data) return preferred;
      const siblingFiles = [];
      Object.entries(data || {}).forEach(([, value]) => {
        if (!value || !Array.isArray(value.files)) return;
        const dirName = typeof value?.dir === "string" ? value.dir : "";
        value.files.forEach((file) => {
          if (typeof file !== "string") return;
          const fullUrl = buildIndexedEntryUrl(basePath, dirName, file);
          if (fullUrl && /\.stl(?:$|[?#])/i.test(fullUrl)) siblingFiles.push(fullUrl);
        });
      });
      const unique = [...new Set(siblingFiles)];
      if (!unique.length) return preferred;

      const sourceStem = (fileName || "").replace(/\.[^.]+$/i, "").toLowerCase();
      const normalized = unique.map((name) => {
        const stem = candidateStem(name);
        const score =
          stem === sourceStem ? 100 :
          stem.includes(sourceStem) || sourceStem.includes(stem) ? 80 :
          [...new Set(sourceStem.split(/[_\-\s]+/).filter(Boolean))].filter((token) => stem.includes(token)).length;
        return { name, stem, score };
      }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "nb"));

      const chosen = normalized[0];
      if (!chosen) return preferred;
      if (FUSION_ARCHIVE_EXTS.has(ext) && !hasStrongFusionStemMatch(chosen.name, sourceStem)) {
        return getActiveStlCandidate();
      }
      if (chosen.score > 0 || (!FUSION_ARCHIVE_EXTS.has(ext) && unique.length === 1)) {
        resolvedStlCandidate = chosen.name;
      }
    } catch {}
    return getActiveStlCandidate();
  }

  async function resolveSiblingStepCandidate() {
    const sameStem = sameStemCandidates(decodedFile).filter((candidate) => /\.(step|stp)(?:$|[?#])/i.test(candidate));
    const existingSameStem = await firstExistingCandidateByOrder(sameStem);
    if (existingSameStem) {
      resolvedStepCandidate = existingSameStem;
      return resolvedStepCandidate;
    }

    try {
      const basePath = clean.replace(/[^\/]+$/, "");
      if (!basePath) return getActiveStepCandidate();
      const indexUrl = `${basePath}index.json`;
      const data = await fetchJsonCached(indexUrl);
      if (!data) return getActiveStepCandidate();
      const siblingFiles = [];
      Object.entries(data || {}).forEach(([, value]) => {
        if (!value || !Array.isArray(value.files)) return;
        const dirName = typeof value?.dir === "string" ? value.dir : "";
        value.files.forEach((file) => {
          if (typeof file !== "string") return;
          const fullUrl = buildIndexedEntryUrl(basePath, dirName, file);
          if (fullUrl && /\.(step|stp)(?:$|[?#])/i.test(fullUrl)) siblingFiles.push(fullUrl);
        });
      });
      const unique = [...new Set(siblingFiles)];
      if (!unique.length) return getActiveStepCandidate();

      const sourceStem = (fileName || "").replace(/\.[^.]+$/i, "").toLowerCase();
      const ranked = unique.map((name) => ({
        name,
        score: candidateScore(name, sourceStem) + (/\.(step)(?:$|[?#])/i.test(name) ? 5 : 0),
      })).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "nb"));

      const chosen = ranked[0];
      if (!chosen || chosen.score <= 0) return getActiveStepCandidate();
      resolvedStepCandidate = chosen.name;
    } catch {}
    return getActiveStepCandidate();
  }
  async function resolveSiblingPreviewCandidate() {
    const probeCandidates = FUSION_ARCHIVE_EXTS.has(ext)
      ? sameStemMeshPreviewCandidates(decodedFile)
      : sameStemCandidates(decodedFile);
    const existingSameStem = await firstExistingCandidateByOrder(probeCandidates);
    if (existingSameStem) {
      resolvedPreviewCandidate = existingSameStem;
      if (/\.stl(?:$|[?#])/i.test(existingSameStem)) resolvedStlCandidate = existingSameStem;
      return resolvedPreviewCandidate;
    }
    try {
      const basePath = clean.replace(/[^\/]+$/, "");
      if (!basePath) return getActivePreviewCandidate();
      const indexUrl = `${basePath}index.json`;
      const data = await fetchJsonCached(indexUrl);
      if (!data) return getActivePreviewCandidate();
      if (FUSION_ARCHIVE_EXTS.has(ext)) {
        const nestedSameStem = await firstExistingCandidateByOrder(
          sameStemCandidatesInIndexedDirs(decodedFile, indexedDirNamesFromData(data), [".3mf", ".3fm", ".fm3", ".stl"])
        );
        if (nestedSameStem) {
          resolvedPreviewCandidate = nestedSameStem;
          if (/\.stl(?:$|[?#])/i.test(nestedSameStem)) resolvedStlCandidate = nestedSameStem;
          return resolvedPreviewCandidate;
        }
      }
      const siblingFiles = [];
      Object.entries(data || {}).forEach(([, value]) => {
        if (!value || !Array.isArray(value.files)) return;
        const dirName = typeof value?.dir === "string" ? value.dir : "";
        value.files.forEach((file) => {
          if (typeof file !== "string") return;
          const fullUrl = buildIndexedEntryUrl(basePath, dirName, file);
          if (fullUrl && /\.(3mf|3fm|fm3|step|stp|iges|igs|obj|glb|gltf|fbx|ply|stl|sat|smt|x_t|x_b|sldprt|sldasm|slddrw)(?:$|[?#])/i.test(fullUrl)) siblingFiles.push(fullUrl);
        });
      });
      const unique = [...new Set(siblingFiles)];
      if (!unique.length) return getActivePreviewCandidate();

      const sourceStem = (fileName || "").replace(/\.[^.]+$/i, "").toLowerCase();
      const ranked = unique.map((name) => {
        const extName = fileExtFromUrl(name);
        const matchScore = candidateScore(name, sourceStem);
        return { name, extName, matchScore, score: previewExtWeight(name) + matchScore };
      }).filter((entry) => {
        if (!FUSION_ARCHIVE_EXTS.has(ext)) return true;
        if (!MESH_PREVIEW_EXTS.has(entry.extName)) return false;
        return hasStrongFusionStemMatch(entry.name, sourceStem);
      }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "nb"));

      const chosen = ranked[0];
      if (!chosen || chosen.score <= 0) return getActivePreviewCandidate();
      resolvedPreviewCandidate = chosen.name;
      if (/\.stl(?:$|[?#])/i.test(chosen.name)) resolvedStlCandidate = resolvedPreviewCandidate;
    } catch {}
    return getActivePreviewCandidate();
  }

  function buildViewerTarget() {
    const lowerExt = String(ext || "").toLowerCase();
    let targetUrl = decodedFile;
    let viewerPath = "/includes/kodeLesere/stlview.html";
    const cacheBust = REPORT_CACHE_VERSION;
    const previewCandidate = getActivePreviewCandidate();
    const previewExt = fileExtFromUrl(previewCandidate);
    const isFusionArchiveExt = FUSION_ARCHIVE_EXTS.has(lowerExt);

    if (["3mf", "3fm", "fm3"].includes(lowerExt)) {
      viewerPath = "/includes/kodeLesere/3mfhydro.html";
    } else if (isFusionArchiveExt) {
      if (MESH_PREVIEW_EXTS.has(previewExt)) {
        targetUrl = previewCandidate;
        viewerPath = previewExt === "stl" ? "/includes/kodeLesere/stlview.html" : "/includes/kodeLesere/3mfhydro.html";
      } else {
        targetUrl = previewCandidate || decodedFile;
        viewerPath = "/includes/kodeLesere/f3dview.html";
      }
    } else if (CAD_PREVIEW_EXTS.has(lowerExt)) {
      viewerPath = "/includes/kodeLesere/f3dview.html";
    } else if (!["stl"].includes(lowerExt)) {
      targetUrl = getActiveStlCandidate() || decodedFile;
    }

    const extras = [`v=${cacheBust}`, "host=fusion"];
    if (viewerPath.endsWith("/f3dview.html")) {
      extras.push(`sourceFile=${encodeURIComponent(decodedFile)}`);
      extras.push(`stlCandidate=${encodeURIComponent(getActiveStlCandidate())}`);
      extras.push(`stepCandidate=${encodeURIComponent(getActiveStepCandidate())}`);
      extras.push(`previewFile=${encodeURIComponent(previewCandidate)}`);
      extras.push(`sourceExt=${encodeURIComponent(lowerExt)}`);
    }

    return `${viewerPath}?file=${encodeURIComponent(targetUrl)}&embedded=1${extras.length ? `&${extras.join("&")}` : ""}`;
  }

  function isCompactViewport() {
    return window.matchMedia("(max-width: 980px)").matches;
  }

  function getStoredDrawerPreference() {
    try {
      const raw = window.localStorage?.getItem(DRAWER_PREF_KEY);
      if (raw === "open") return true;
      if (raw === "closed") return false;
    } catch {}
    return null;
  }

  function storeDrawerPreference(open) {
    try {
      window.localStorage?.setItem(DRAWER_PREF_KEY, open ? "open" : "closed");
    } catch {}
  }

  function postThemeToViewer() {
    try {
      if (!viewerFrame?.contentWindow) return;
      const root = document.documentElement;
      const style = getComputedStyle(root);
      const vars = {};
      for (let i = 0; i < style.length; i++) {
        const name = style[i];
        if (name.startsWith("--")) vars[name] = style.getPropertyValue(name).trim();
      }
      viewerFrame.contentWindow.postMessage({
        type: "theme-sync",
        themeAttr: root.getAttribute("data-theme"),
        vars
      }, "*");
    } catch {}
  }

  function postComponentStateToViewer() {
    try {
      if (!viewerFrame?.contentWindow) return;
      viewerFrame.contentWindow.postMessage({
        type: "viewer-component-state",
        chosen: [...chosenSet],
        muted: [...mutedSet],
        isolateChosen: selectionToolState.isolateChosen,
      }, "*");
    } catch {}
  }
  function postExplodeScopeToViewer() {
    postViewerCommandToViewer("set-explode-scope", {
      enabled: selectionToolState.explodeChosen,
      keys: getSelectionScopeKeys(),
      amount: viewerVisualState.explode || 0,
    });
  }

  function updateExplodeUi() {
    if (inpExplode) {
      inpExplode.value = String(viewerVisualState.explode || 0);
      inpExplode.disabled = !viewerVisualState.explodeSupported;
    }
    if (txtExplodePct) {
      txtExplodePct.textContent = viewerVisualState.explodeSupported
        ? `${Math.round((viewerVisualState.explode || 0) * 100)}%`
        : "av";
    }
    if (txtExplodeHint) {
      txtExplodeHint.textContent = viewerVisualState.explodeSupported
        ? `${viewerVisualState.explodeCount} deler kan separeres visuelt. Nullstill explode før hydrojusteringer hvis du vil være på den sikre siden.`
        : "Explode krever minst 2 separate deler i modellen.";
    }
    if (btnExplodeReset) {
      btnExplodeReset.disabled = !viewerVisualState.explodeSupported && (viewerVisualState.explode || 0) <= 0;
    }
  }
  function updateSelectionActionUi() {
    const chosenKeys = getResolvedChosenKeys();
    const hasChosen = chosenKeys.length > 0;
    if (!hasChosen) {
      selectionToolState.isolateChosen = false;
      selectionToolState.explodeChosen = false;
    }
    if (btnComponentView) {
      btnComponentView.disabled = !hasChosen;
      btnComponentView.textContent = selectionToolState.isolateChosen ? "Component view p\u00e5" : "Component view av";
    }
    if (btnSelectionExplode) {
      btnSelectionExplode.disabled = !hasChosen || !viewerVisualState.explodeSupported;
      btnSelectionExplode.textContent = selectionToolState.explodeChosen ? "Explode valgt p\u00e5" : "Explode valgt av";
    }
    if (btnExportSelected) {
      btnExportSelected.disabled = !hasChosen;
    }
    if (btnBambuSelected) {
      btnBambuSelected.disabled = !hasChosen;
      btnBambuSelected.textContent = selectionToolState.pendingSelectedExport === "bambu"
        ? "Forbereder valgt..."
        : "Bambu valgt";
    }
  }

  function postViewerCommandToViewer(action, payload = {}) {
    try {
      if (!viewerFrame?.contentWindow) return;
      viewerFrame.contentWindow.postMessage({
        type: "viewer-command",
        action,
        ...payload,
      }, "*");
    } catch {}
  }

  function setDrawerOpen(open, { persist = true } = {}) {
    if (!drawer || !btnToggleDrawer) return;
    drawer.classList.toggle("is-open", !!open);
    if (drawerBackdrop) drawerBackdrop.hidden = !(!!open && isCompactViewport());
    if (persist) storeDrawerPreference(!!open);
    btnToggleDrawer.textContent = open ? "Skjul filbehandler ☰" : "Vis filbehandler ☰";
  }

  function syncDrawerForViewport() {
    if (!drawer || !btnToggleDrawer) return;
    if (isCompactViewport()) {
      setDrawerOpen(getStoredDrawerPreference() === true, { persist: false });
      return;
    }
    setDrawerOpen(true, { persist: false });
  }

  function loadIntegratedViewer() {
    if (!viewerFrame) return;
    setHydroTaskState(true, "Laster 3D-viewer...", "Starter viewer og henter geometri/kandidater.");
    updateHydroProgressUi();
    if (viewerLoading) viewerLoading.classList.remove("is-hidden");
    viewerFrame.onload = () => {
      if (viewerLoading) viewerLoading.classList.add("is-hidden");
      setHydroTaskState(true, "Regner hydrostatikk fra modellen...", "Modellen er lastet; volum, deplasement og stabilitet oppdateres i bakgrunnen.");
      postThemeToViewer();
      postComponentStateToViewer();
      postViewerCommandToViewer("set-explode", { amount: viewerVisualState.explode || 0 });
      postHydroVisibilityToViewer();
      applyHydroControlsToViewer({ includeDraftPose: true, silentEstimate: true });
    };
      viewerFrame.src = buildViewerTarget();
  }

  function renderDeferredViewerState(message = "3D-viewer er klar til å åpnes manuelt.") {
    if (viewerLoading) viewerLoading.classList.add("is-hidden");
    if (!viewerFrame) return;
    viewerFrame.removeAttribute("src");
    viewerFrame.srcdoc = `<!doctype html><html lang="no"><meta charset="utf-8"><style>body{margin:0;display:grid;place-items:center;min-height:100vh;background:#f5f7fb;color:#162033;font:16px/1.5 Segoe UI,Arial,sans-serif}.card{max-width:640px;margin:24px;padding:24px;border:1px solid rgba(15,35,75,.14);border-radius:18px;background:#fff;box-shadow:0 16px 38px rgba(14,30,58,.10)}h2{margin:0 0 10px;font-size:24px}p{margin:0;color:#51607a}</style><body><div class="card"><h2>Viewer pa vent</h2><p>${String(message).replace(/[&<>"]/g, (ch) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;" }[ch]))}</p></div></body></html>`;
  }

  function canAutoLoadIntegratedViewer() {
    if (!FUSION_ARCHIVE_EXTS.has(ext)) return true;
    const previewCandidate = getActivePreviewCandidate();
    return MESH_PREVIEW_EXTS.has(fileExtFromUrl(previewCandidate));
  }

  function setDisabled(el, disabled, titleWhenDisabled = "") {
    if (!el) return;
    el.disabled = !!disabled;
    if (el.tagName === "A") {
      if (disabled) el.classList.add("disabled");
      else el.classList.remove("disabled");
    }
    if (disabled && titleWhenDisabled) el.title = titleWhenDisabled;
    else el.removeAttribute("title");
  }

  setDisabled(btnFusion, !CAD_EXT.has(ext), "Aktiveres for CAD/Fusion-relaterte filer.");
  updateBambuButtonState();
  setDisabled(btnStl, !CAD_EXT.has(ext), "3D-viewer er kun relevant for CAD-relaterte filer.");

  btnStl && (btnStl.onclick = () => loadIntegratedViewer());
  btnToggleDrawer && (btnToggleDrawer.onclick = () => setDrawerOpen(!drawer?.classList.contains("is-open")));
  drawerBackdrop && drawerBackdrop.addEventListener("click", () => setDrawerOpen(false));
  window.addEventListener("resize", () => syncDrawerForViewport());

  function setTab(tabName, { toggle = false } = {}) {
    const requested = tabName === "hydro" ? "hydro" : "overview";
    currentSidebarTab = toggle && currentSidebarTab === requested
      ? (requested === "hydro" ? "overview" : "hydro")
      : requested;
    const showOverview = currentSidebarTab !== "hydro";
    if (infoCard) infoCard.style.display = showOverview ? "" : "none";
    if (toolsCard) toolsCard.style.display = showOverview ? "" : "none";
    if (componentsCard) componentsCard.style.display = showOverview ? "" : "none";
    if (hydroCard) hydroCard.style.display = showOverview ? "none" : "";
    btnTabOverview?.classList.toggle("active", showOverview);
    btnTabHydro?.classList.toggle("active", !showOverview);
  }
  btnTabOverview && (btnTabOverview.onclick = () => setTab("overview", { toggle: true }));
  btnTabHydro && (btnTabHydro.onclick = () => setTab("hydro", { toggle: true }));
  setTab("overview");

  btnFusion && (btnFusion.onclick = () => window.open("https://myhub.autodesk360.com/", "_blank", "noopener"));

  function buildSelectedExportName() {
    const items = getSelectedComponentItems();
    if (!items.length) return `${stripExt(displayFileName || fileName || "selection")}-selection.stl`;
    if (items.length === 1) return `${stripExt(items[0].label || "component")}.stl`;
    return `${stripExt(displayFileName || fileName || "selection")}-selection-${items.length}.stl`;
  }

  async function openBambuUrl(url) {
    if (!url) return false;
    const schemeUrl = `bambustudio://open?url=${encodeURIComponent(url)}`;
    const startedAt = Date.now();
    let lostFocus = false;
    const onBlur = () => {
      lostFocus = true;
    };
    window.addEventListener("blur", onBlur, { once: true });
    try {
      window.location.href = schemeUrl;
    } catch {}
    return new Promise((resolve) => {
      setTimeout(() => {
        window.removeEventListener("blur", onBlur);
        resolve(lostFocus || (document.visibilityState !== "visible" && Date.now() - startedAt >= 800));
      }, 900);
    });
  }

  async function requestSelectedExport(kind = "download") {
    const keys = getResolvedChosenKeys();
    if (!keys.length) return;
    const suggestedFileName = buildSelectedExportName();
    if (kind === "bambu") {
      const candidate = await resolveSelectionExportCandidate(BAMBU_EXT);
      if (candidate) {
        const opened = await openBambuUrl(candidate);
        if (!opened) window.open("https://bambulab.com/en/download/studio", "_blank", "noopener");
        return;
      }
      selectionToolState.pendingSelectedExport = "bambu";
      updateSelectionActionUi();
    }
    postViewerCommandToViewer("download-selected-stl", {
      keys,
      fileName: suggestedFileName,
      originFileName: displayFileName || fileName || "selection",
    });
  }

  btnBambu && (btnBambu.onclick = () => {
    const url = getActiveBambuCandidate();
    if (!url) {
      window.open("https://bambulab.com/en/download/studio", "_blank", "noopener");
      return;
    }
    const schemeUrl = `bambustudio://open?url=${encodeURIComponent(url)}`;
    const startedAt = Date.now();
    let lostFocus = false;
    const onBlur = () => {
      lostFocus = true;
    };
    window.addEventListener("blur", onBlur, { once: true });
    try {
      window.location.href = schemeUrl;
    } catch {}
    setTimeout(() => {
      window.removeEventListener("blur", onBlur);
      if (!lostFocus && document.visibilityState === "visible" && Date.now() - startedAt >= 800) {
        window.open("https://bambulab.com/en/download/studio", "_blank", "noopener");
      }
    }, 900);
  });
  btnComponentView && (btnComponentView.onclick = () => {
    if (!getResolvedChosenKeys().length) return;
    selectionToolState.isolateChosen = !selectionToolState.isolateChosen;
    postComponentStateToViewer();
    updateSelectionActionUi();
  });
  btnSelectionExplode && (btnSelectionExplode.onclick = () => {
    if (!getResolvedChosenKeys().length || !viewerVisualState.explodeSupported) return;
    selectionToolState.explodeChosen = !selectionToolState.explodeChosen;
    if (selectionToolState.explodeChosen && (viewerVisualState.explode || 0) <= 0.001) {
      viewerVisualState.explode = 0.12;
      updateExplodeUi();
      postViewerCommandToViewer("set-explode", { amount: viewerVisualState.explode });
    }
    postExplodeScopeToViewer();
    updateSelectionActionUi();
  });
  btnExportSelected && (btnExportSelected.onclick = () => {
    requestSelectedExport("download");
  });
  btnBambuSelected && (btnBambuSelected.onclick = () => {
    requestSelectedExport("bambu");
  });

  btnToggleInfo && (btnToggleInfo.onclick = () => {
    if (!infoCard) return;
    infoCard.style.display = infoCard.style.display === "none" ? "" : "none";
  });
  btnToggleTools && (btnToggleTools.onclick = () => {
    if (!toolsCard) return;
    toolsCard.style.display = toolsCard.style.display === "none" ? "" : "none";
  });
  inpExplode?.addEventListener("input", () => {
    viewerVisualState.explode = Math.max(0, Math.min(1, Number(inpExplode.value) || 0));
    updateExplodeUi();
    postViewerCommandToViewer("set-explode", { amount: viewerVisualState.explode });
    postExplodeScopeToViewer();
  });
  btnExplodeReset?.addEventListener("click", () => {
    viewerVisualState.explode = 0;
    updateExplodeUi();
    postViewerCommandToViewer("set-explode", { amount: 0 });
    postExplodeScopeToViewer();
  });
  selMaterial && (selMaterial.onchange = () => {
    if (selMaterial.value !== "custom") inpRhoMat.value = String(MATERIAL_DENSITY[selMaterial.value] || 7850);
    applyHydroControlsToViewer({ includeDraftPose: false });
  });
  [inpRhoMat, inpCb, inpThicknessMm].forEach((input) => {
    input?.addEventListener("input", () => buildHydroReport());
  });
  inpRhoMat?.addEventListener("change", () => {
    applyHydroControlsToViewer({ includeDraftPose: false });
  });
  inpRhoWater?.addEventListener("change", () => {
    applyHydroControlsToViewer({ includeDraftPose: false });
  });
  [chkHydroMarkers, chkHydroWaterline, chkHydroContour].forEach((input) => {
    input?.addEventListener("change", () => {
      hydroControlState.markers = chkHydroMarkers?.checked !== false;
      hydroControlState.waterline = chkHydroWaterline?.checked !== false;
      hydroControlState.contour = chkHydroContour?.checked !== false;
      postHydroVisibilityToViewer();
      buildHydroReport();
    });
  });
  btnHydroApply?.addEventListener("click", () => applyHydroControlsToViewer({ includeDraftPose: true }));
  btnHydroResetPose?.addEventListener("click", () => {
    if (inpHydroTrim) inpHydroTrim.value = "0";
    if (inpHydroHeel) inpHydroHeel.value = "0";
    postViewerCommandToViewer("reset-hydro-pose", collectHydroCommandPayload({ includeDraftPose: true }));
    buildHydroReport();
  });
  btnHydroReport?.addEventListener("click", () => requestHydroReport());
  btnHydroRecalc?.addEventListener("click", () => requestHydroReport({ force: true }));
  chkHydroPerfMode?.addEventListener("change", () => {
    invalidateHydroReportState();
    buildHydroReport();
    updateHydroProgressUi();
  });
  btnHydroReportClose?.addEventListener("click", () => closeHydroReportModal());
  hydroReportModal?.querySelector("[data-close-report='1']")?.addEventListener("click", () => closeHydroReportModal());
  btnHydroReportPrint?.addEventListener("click", () => {
    openHydroReportModal();
    document.body.classList.add("printing-hydro-report");
    requestAnimationFrame(() => window.print());
  });
  btnHydroReportJson?.addEventListener("click", () => downloadHydroReportJson());
  window.addEventListener("afterprint", () => document.body.classList.remove("printing-hydro-report"));

  function addMeta(label, value) {
    const el = document.createElement("div");
    el.className = "kv";
    const labelEl = document.createElement("span");
    labelEl.className = "muted";
    labelEl.textContent = label;
    const valueEl = document.createElement("span");
    valueEl.textContent = value;
    el.appendChild(labelEl);
    el.appendChild(valueEl);
    metaGrid.appendChild(el);
  }
  const fmtBytes = (n) => (!Number.isFinite(n) || n < 0) ? "ukjent" : n < 1024 ? `${n} B` : n < 1024 ** 2 ? `${(n / 1024).toFixed(1)} KB` : n < 1024 ** 3 ? `${(n / 1024 ** 2).toFixed(1)} MB` : `${(n / 1024 ** 3).toFixed(2)} GB`;
  const decodeText = (ab, maxBytes = 2_000_000) => new TextDecoder("utf-8", { fatal: false }).decode(ab.byteLength > maxBytes ? ab.slice(0, maxBytes) : ab);
  const listToHtml = (items) => `<ul>${items.map(i => `<li>${i}</li>`).join("")}</ul>`;

  function parseZipCentralDirectory(ab) {
    const dv = new DataView(ab);
    const arr = new Uint8Array(ab);
    const entries = [];
    let eocdOffset = -1;
    const min = Math.max(0, dv.byteLength - 65557);
    for (let i = dv.byteLength - 22; i >= min; i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocdOffset = i; break; }
    }
    if (eocdOffset < 0) return { entries, error: "Fant ikke ZIP EOCD." };

    const cdSize = dv.getUint32(eocdOffset + 12, true);
    const cdOffset = dv.getUint32(eocdOffset + 16, true);
    let p = cdOffset;
    while (p < cdOffset + cdSize && p + 46 <= dv.byteLength) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const compSize = dv.getUint32(p + 20, true);
      const uncompSize = dv.getUint32(p + 24, true);
      const nameLen = dv.getUint16(p + 28, true);
      const extraLen = dv.getUint16(p + 30, true);
      const commentLen = dv.getUint16(p + 32, true);
      const dosTime = dv.getUint16(p + 12, true);
      const dosDate = dv.getUint16(p + 14, true);
      const nameStart = p + 46;
      const nameEnd = nameStart + nameLen;
      const name = new TextDecoder("utf-8").decode(arr.slice(nameStart, nameEnd));
      entries.push({ name, compSize, uncompSize, dosTime, dosDate });
      p = nameEnd + extraLen + commentLen;
    }
    return { entries };
  }

  function dosToIso(dosDate, dosTime) {
    const day = dosDate & 0x1f;
    const month = (dosDate >> 5) & 0x0f;
    const year = ((dosDate >> 9) & 0x7f) + 1980;
    const sec = (dosTime & 0x1f) * 2;
    const min = (dosTime >> 5) & 0x3f;
    const hour = (dosTime >> 11) & 0x1f;
    if (!year || !month || !day) return "ukjent";
    return new Date(year, month - 1, day, hour, min, sec).toLocaleString("nb-NO");
  }

  async function ensureJsZip() {
    if (window.JSZip) return window.JSZip;
    const candidates = ["/jszip.min.js", "/includes/three/jszip.min.js"];
    for (const src of candidates) {
      try {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = src;
          script.async = true;
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
        if (window.JSZip) return window.JSZip;
      } catch {}
    }
    throw new Error("Kunne ikke laste JSZip.");
  }

  function stripExt(name) {
    return String(name || "").replace(/\.[^.]+$/i, "");
  }

  function basename(path) {
    const parts = String(path || "").split(/[\\/]/);
    return parts[parts.length - 1] || String(path || "");
  }

  function looksGuidish(value) {
    const base = stripExt(basename(value)).trim();
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(base)
      || /^[0-9a-f]{32}$/i.test(base);
  }

  function prettyFusionName(raw) {
    const source = String(raw || "").trim();
    if (!source) return "";
    const base = stripExt(decodeDisplayText(basename(source)));
    if (!base || looksGuidish(base)) return "";
    return base.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  }

  function normalizeComponentItem(item, index = 0) {
    if (typeof item === "string") {
      const label = String(item);
      return {
        key: label || `component-${index}`,
        label,
        subtitle: "",
        description: "",
        center: null,
        size: null,
        search: label.toLowerCase()
      };
    }

    const label =
      prettyFusionName(item.label) ||
      prettyFusionName(item.name) ||
      prettyFusionName(item.displayName) ||
      prettyFusionName(item.friendlyName) ||
      prettyFusionName(item.rootFileName) ||
      prettyFusionName(item.file) ||
      `Komponent ${index + 1}`;

    const subtitleParts = [];
    if (item.type) subtitleParts.push(String(item.type).replace(/^application\//i, ""));
    const fileHint = prettyFusionName(item.rootFileName) || prettyFusionName(item.file);
    if (fileHint && fileHint.toLowerCase() !== String(label).toLowerCase()) subtitleParts.push(fileHint);

    return {
      key: String(item.key || item.file || label || `component-${index}`),
      label,
      subtitle: subtitleParts.join(" | "),
      description: String(item.description || "").trim(),
      file: String(item.file || "").trim(),
      rootFileName: String(item.rootFileName || "").trim(),
      sourceName: String(item.sourceName || "").trim(),
      nodePath: String(item.nodePath || "").trim(),
      center: item.center && Number.isFinite(Number(item.center.x)) && Number.isFinite(Number(item.center.y)) && Number.isFinite(Number(item.center.z))
        ? { x: Number(item.center.x), y: Number(item.center.y), z: Number(item.center.z) }
        : null,
      size: item.size && Number.isFinite(Number(item.size.x)) && Number.isFinite(Number(item.size.y)) && Number.isFinite(Number(item.size.z))
        ? { x: Number(item.size.x), y: Number(item.size.y), z: Number(item.size.z) }
        : null,
      search: [
        label,
        item.name,
        item.displayName,
        item.friendlyName,
        item.file,
        item.rootFileName,
        item.sourceName,
        item.nodePath,
        item.description,
        item.type
      ].filter(Boolean).join(" ").toLowerCase()
    };
  }

  async function extractFusionComponentData(ab) {
    const JSZip = await ensureJsZip();
    const outer = await JSZip.loadAsync(ab);
    const ddEntry = outer.file("DesignDescription.json");
    const manifestEntry = outer.file("Manifest.json");
    if (!ddEntry) return null;

    const designDescription = JSON.parse(await ddEntry.async("string"));
    const manifest = manifestEntry ? JSON.parse(await manifestEntry.async("string")) : null;
    const designObjects = designDescription?.designDescription?.designGraphs?.[0]?.designObjects || [];
    const rootFile = manifest?.root || null;
    const rootObject = designObjects.find((obj) => obj.relativePath === rootFile) || designObjects[0] || null;
    const rootMetadata = rootObject?.metadata || {};
    const seen = new Set();
    const components = [];
    const contentTypeCounts = {};

    for (const obj of designObjects) {
      const contentType = String(obj.contentType || "").trim() || "ukjent";
      contentTypeCounts[contentType] = (contentTypeCounts[contentType] || 0) + 1;
      const normalized = normalizeComponentItem({
        key: obj.relativePath || obj.displayName || obj.friendlyName,
        label: obj.displayName || obj.friendlyName || obj.metadata?.rootFileName || obj.relativePath,
        type: obj.contentType || "",
        file: obj.relativePath || "",
        rootFileName: obj.metadata?.rootFileName || "",
        description: obj.metadata?.description || ""
      }, components.length);
      const key = `${normalized.label}::${normalized.subtitle}`;
      if (seen.has(key)) continue;
      seen.add(key);
      components.push(normalized);
    }

    const simulationStudyIds = [
      ...new Set([
        ...String(rootMetadata.SimulationStudies || "")
          .replace(/^\[|\]$/g, "")
          .split(",")
          .map((value) => String(value || "").trim())
          .filter(Boolean),
        ...Object.keys(rootMetadata)
          .filter((key) => /^SIM_STUDY_/i.test(key))
          .map((key) => key.replace(/^SIM_STUDY_/i, "")),
      ]),
    ];

    return {
      components,
      rootName: rootObject?.displayName || rootObject?.friendlyName || prettyFusionName(rootObject?.metadata?.rootFileName) || "",
      rootFileName: prettyFusionName(rootMetadata?.rootFileName) || "",
      entryCount: Object.keys(outer.files || {}).length,
      contentTypeCounts,
      simulationStudyCount: simulationStudyIds.length,
      simulationStudyIds,
    };
  }

  function parseObj(text) {
    const lines = text.split(/\r?\n/);
    let v = 0, vt = 0, vn = 0, f = 0, o = 0, g = 0;
    const materials = new Set();
    const objectNames = new Set();
    const groupNames = new Set();
    for (const line of lines) {
      if (line.startsWith("v ")) v++;
      else if (line.startsWith("vt ")) vt++;
      else if (line.startsWith("vn ")) vn++;
      else if (line.startsWith("f ")) f++;
      else if (line.startsWith("o ")) { o++; objectNames.add(line.slice(2).trim()); }
      else if (line.startsWith("g ")) { g++; groupNames.add(line.slice(2).trim()); }
      else if (line.startsWith("usemtl ")) materials.add(line.slice(7).trim());
    }
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (const line of lines) {
      if (!line.startsWith("v ")) continue;
      const p = line.trim().split(/\s+/);
      const x = Number(p[1]), y = Number(p[2]), z = Number(p[3]);
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
      minX = Math.min(minX, x); minY = Math.min(minY, y); minZ = Math.min(minZ, z);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); maxZ = Math.max(maxZ, z);
    }
    const bbox = Number.isFinite(minX) ? { minX, minY, minZ, maxX, maxY, maxZ } : null;
    return { v, vt, vn, f, o, g, materials: [...materials], objectNames: [...objectNames], groupNames: [...groupNames], bbox };
  }

  function uniqueTextValues(values) {
    return [...new Set((values || []).map((value) => String(value || "").trim()).filter(Boolean))];
  }

  function normalizeDensityKgM3(rawValue) {
    const value = Number(rawValue);
    if (!Number.isFinite(value) || value <= 0) return null;
    if (value >= 100 && value <= 50000) return value;
    if (value >= 0.05 && value <= 60) return value * 1000;
    return null;
  }

  function inferMaterialProfile(text) {
    const source = String(text || "");
    if (!source.trim()) return null;
    return MATERIAL_PROFILES.find((profile) => profile.patterns.some((pattern) => pattern.test(source))) || null;
  }

  function describeMaterialHint(hint) {
    if (!hint) return "Ingen materialhint funnet.";
    const label = hint.label || hint.profile?.label || "Ukjent materiale";
    const density = Number.isFinite(hint.densityKgM3) ? `, ${Math.round(hint.densityKgM3)} kg/m³` : "";
    return `${label}${density}`;
  }

  function updateHydroSourceTextLegacy_DoNotUse() {
    if (hydroSource) {
      const geometrySource = analysisState.geometrySource || analysisState.source || "Ingen geometri ennå";
      hydroSource.textContent = `Geometri: ${geometrySource}. Enheter: ${analysisState.units || "m"}.`;
    }
    if (hydroMaterialHint) {
      hydroMaterialHint.textContent = analysisState.materialHint
        ? `Materialhint: ${describeMaterialHint(analysisState.materialHint)}${analysisState.materialHintSource ? ` (${analysisState.materialHintSource})` : ""}. Tetthet i panelet brukes i viewer/mesh-masse der det er mulig.`
        : "Materiale: bruker valgt tetthet i panelet.";
    }
  }

  function applyMaterialHint(hint, sourceLabel = "") {
    if (!hint) {
      updateHydroSourceText();
      updateHydroPanels();
      return;
    }
    analysisState.materialHint = hint;
    analysisState.materialHintSource = sourceLabel || hint.source || "";
    const density = Number.isFinite(hint.densityKgM3)
      ? hint.densityKgM3
      : Number.isFinite(hint.profile?.density)
        ? hint.profile.density
        : null;
    const slug = hint.profile?.slug || hint.slug || "custom";
    if (selMaterial) selMaterial.value = slug in MATERIAL_DENSITY ? slug : "custom";
    let pushedDensityToUi = false;
    if (Number.isFinite(density) && inpRhoMat) {
      const rounded = Math.round(density);
      if (safeNumber(inpRhoMat.value) !== rounded) {
        inpRhoMat.value = String(rounded);
        pushedDensityToUi = true;
      }
    }
    updateHydroSourceText();
    updateHydroPanels();
    if (pushedDensityToUi) {
      applyHydroControlsToViewer({ includeDraftPose: false, silentEstimate: true });
    }
  }

  function parseStep(text) {
    const fileNameMatch = text.match(/FILE_NAME\s*\(([\s\S]*?)\)\s*;/i);
    const schemaMatch = text.match(/FILE_SCHEMA\s*\(([\s\S]*?)\)\s*;/i);
    const productMatches = text.match(/PRODUCT\s*\(/gi) || [];
    const advancedFaceMatches = text.match(/ADVANCED_FACE\s*\(/gi) || [];
    const productNameMatches = [...text.matchAll(/PRODUCT\s*\(\s*'([^']*)'/gi)].map(m => m[1]).filter(Boolean);
    const materialRepresentationIds = [...text.matchAll(/REPRESENTATION\s*\(\s*'material name'\s*,\s*\(#(\d+)\)\s*,/gi)].map((m) => m[1]);
    const descriptiveMaterialNames = materialRepresentationIds.flatMap((id) =>
      [...text.matchAll(new RegExp(`#${id}\\s*=\\s*DESCRIPTIVE_REPRESENTATION_ITEM\\s*\\(\\s*'([^']+)'`, "gi"))].map((m) => m[1])
    );
    const materialNames = uniqueTextValues([
      ...descriptiveMaterialNames,
      ...[...text.matchAll(/MATERIAL[A-Z_]*\s*\(\s*'([^']+)'/gi)].map((m) => m[1]),
      ...[...text.matchAll(/PROPERTY_DEFINITION\s*\(\s*'([^']*material[^']*)'/gi)].map((m) => m[1]),
    ]).filter((value) => !/^material property$/i.test(String(value || "").trim()));
    const densityCandidates = uniqueTextValues([
      ...[...text.matchAll(/(?:MASS_DENSITY_MEASURE|DENSITY_MEASURE)\s*\(\s*([+\-]?\d+(?:\.\d+)?(?:E[+\-]?\d+)?)\s*\)/gi)].map((m) => m[1]),
      ...[...text.matchAll(/density[^;#]{0,160}?([+\-]?\d+(?:\.\d+)?(?:E[+\-]?\d+)?)/gi)].map((m) => m[1]),
    ]).map(normalizeDensityKgM3).filter((value) => Number.isFinite(value));
    const lengthUnit =
      /\.MILLI\.\s*,\s*\.METRE\./i.test(text) ? "mm" :
      /\.CENTI\.\s*,\s*\.METRE\./i.test(text) ? "cm" :
      /\.DECI\.\s*,\s*\.METRE\./i.test(text) ? "dm" :
      /\.METRE\./i.test(text) ? "m" : null;
    const inferredProfile = inferMaterialProfile(`${materialNames.join(" ")} ${productNameMatches.join(" ")}`);
    return {
      fileName: fileNameMatch ? fileNameMatch[1].replace(/\s+/g, " ").slice(0, 250) : null,
      schema: schemaMatch ? schemaMatch[1].replace(/\s+/g, " ").slice(0, 200) : null,
      products: productMatches.length,
      faces: advancedFaceMatches.length,
      productNames: productNameMatches,
      materialNames,
      densityKgM3: densityCandidates[0] || inferredProfile?.density || null,
      lengthUnit,
      materialHint: materialNames[0] || inferredProfile
        ? {
            label: materialNames[0] || inferredProfile?.label || "",
            profile: inferredProfile || null,
            densityKgM3: densityCandidates[0] || inferredProfile?.density || null,
            defaultedFromProfile: !densityCandidates[0] && !!inferredProfile,
            source: "STEP-fil",
          }
        : null,
    };
  }

  function parseBinaryStlBboxAndVolume(ab) {
    const dv = new DataView(ab);
    if (dv.byteLength < 84) return null;
    const triCount = dv.getUint32(80, true);
    if (84 + triCount * 50 !== dv.byteLength) return null;
    let p = 84;
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    let vol6 = 0;
    for (let i = 0; i < triCount; i++) {
      p += 12;
      const ax = dv.getFloat32(p, true), ay = dv.getFloat32(p + 4, true), az = dv.getFloat32(p + 8, true); p += 12;
      const bx = dv.getFloat32(p, true), by = dv.getFloat32(p + 4, true), bz = dv.getFloat32(p + 8, true); p += 12;
      const cx = dv.getFloat32(p, true), cy = dv.getFloat32(p + 4, true), cz = dv.getFloat32(p + 8, true); p += 12;
      p += 2;
      minX = Math.min(minX, ax, bx, cx); minY = Math.min(minY, ay, by, cy); minZ = Math.min(minZ, az, bz, cz);
      maxX = Math.max(maxX, ax, bx, cx); maxY = Math.max(maxY, ay, by, cy); maxZ = Math.max(maxZ, az, bz, cz);
      vol6 += ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx);
    }
    return { bbox: { minX, minY, minZ, maxX, maxY, maxZ }, solidVolume: Math.abs(vol6 / 6), triCount };
  }

  const fmt = (n, d = 3) => Number.isFinite(n) ? Number(n).toFixed(d) : "–";

  async function tryHydroFromResolvedStl() {
    const candidate = getActiveStlCandidate();
    if (!candidate) return false;
    try {
      const ab = await fetchArrayBufferCached(candidate);
      const parsed = parseBinaryStlBboxAndVolume(ab);
      if (!parsed?.bbox) return false;
      analysisState.bbox = parsed.bbox;
      analysisState.solidVolumeM3 = parsed.solidVolume;
      analysisState.source = "STL-kandidat (binary mesh)";
      analysisState.geometrySource = analysisState.source;
      return true;
    } catch {
      return false;
    }
  }

  async function applyStepHintsFromUrl(url, sourceLabel = "STEP-kandidat") {
    if (!url) return null;
    try {
      const text = decodeText(await fetchArrayBufferCached(url), 3_000_000);
      const step = parseStep(text);
      if (step.lengthUnit) analysisState.units = step.lengthUnit;
      if (step.materialHint) applyMaterialHint(step.materialHint, sourceLabel);
      return step;
    } catch {
      return null;
    }
  }

  function buildHydroReport() {
    analysisState.latestHydroEstimate = buildHydroEstimateFromBbox();
    updateHydroPanels();
    return analysisState.latestHydroEstimate;
  }

  function syncHydroControlsFromViewer(hydro) {
    if (!hydro?.supported) return;
    const setInputValue = (input, value, digits = 3) => {
      if (!input || document.activeElement === input || !Number.isFinite(value)) return;
      input.value = Number(value).toFixed(digits);
    };
    setInputValue(inpHydroDraft, hydro.draftZWorld, 3);
    setInputValue(inpHydroTrim, hydro.trimDeg, 2);
    setInputValue(inpHydroHeel, hydro.heelDeg, 2);
    if (inpRhoWater && document.activeElement !== inpRhoWater && Number.isFinite(hydro.waterDensity)) {
      inpRhoWater.value = String(Math.round(hydro.waterDensity));
    }
  }

  function renderHydroQuickCards(hydro, estimate) {
    const active = hydro || estimate;
    const viewerPending = !!hydro?.supported && !hasResolvedViewerHydro(hydro);
    const allowEstimateFallback = !hydro || hydro.isEstimate;
    const draftMeters = getDraftMetersFromHydro(active) ?? (allowEstimateFallback ? estimate?.draftMeters : null);
    const displacementTonnes = Number.isFinite(active?.displacementTonnes) ? active.displacementTonnes : (allowEstimateFallback ? estimate?.displacementTonnes : null);
    const submergedVolume = Number.isFinite(active?.submergedVolume) ? active.submergedVolume : (allowEstimateFallback ? estimate?.submergedVolume : null);
    const gmRoll = Number.isFinite(active?.gm?.roll) ? active.gm.roll : (allowEstimateFallback ? estimate?.gm?.roll : null);
    const bmRoll = Number.isFinite(active?.bm?.roll) ? active.bm.roll : (allowEstimateFallback ? estimate?.bm?.roll : null);
    const bmPitch = Number.isFinite(active?.bm?.pitch) ? active.bm.pitch : (allowEstimateFallback ? estimate?.bm?.pitch : null);
    const trimDeg = Number.isFinite(active?.trimDeg) ? active.trimDeg : (allowEstimateFallback ? estimate?.trimDeg : null);
    const heelDeg = Number.isFinite(active?.heelDeg) ? active.heelDeg : (allowEstimateFallback ? estimate?.heelDeg : null);

    if (hydroLiveDraft) hydroLiveDraft.textContent = fmtUnitValue(draftMeters, 3, "m");
    if (hydroLiveDraftSource) {
      hydroLiveDraftSource.textContent = active?.isEstimate
        ? "Bbox-estimat"
        : viewerPending && Number.isFinite(active?.draftZWorld)
          ? `Viewer world Z ${Number(active.draftZWorld).toFixed(3)} | beregner fra modell`
        : viewerPending
          ? "Beregner hydro fra modell"
        : Number.isFinite(active?.draftZWorld)
          ? `Viewer world Z ${Number(active.draftZWorld).toFixed(3)}`
          : "Aktiv viewer";
    }
    if (hydroLiveDisp) hydroLiveDisp.textContent = fmtTonnes(displacementTonnes, 2);
    if (hydroLiveVolume) {
      hydroLiveVolume.textContent = viewerPending
        ? "Regner submerged volum fra modellen..."
        : `Submerged volum: ${fmtUnitValue(submergedVolume, 3, "m^3")}`;
    }
    if (hydroLiveGM) hydroLiveGM.textContent = Number.isFinite(gmRoll) ? `GM roll ${Number(gmRoll).toFixed(3)} m` : "GM roll –";
    if (hydroLiveBM) {
      hydroLiveBM.textContent = Number.isFinite(bmRoll)
        ? `BM roll ${Number(bmRoll).toFixed(3)} m${Number.isFinite(bmPitch) ? ` | pitch ${Number(bmPitch).toFixed(3)} m` : ""}`
        : "BM: –";
    }
    if (hydroLiveWaterline) hydroLiveWaterline.textContent = getHydroVisibilityLabel(active);
    if (hydroLiveAttitude) {
      hydroLiveAttitude.textContent = `Trim: ${fmtUnitValue(trimDeg, 1, "deg")} | Heel: ${fmtUnitValue(heelDeg, 1, "deg")}`;
    }
  }

  function renderHydroSummaryGrid(hydro, estimate) {
    if (!hydroQuickSummary) return;
    const active = hydro || estimate;
    const bounds = active?.referenceBounds || estimate?.referenceBounds || null;
    const draftMeters = getDraftMetersFromHydro(active) ?? estimate?.draftMeters;
    const massSummary = getMassSourceSummary(active?.massProperties || getViewerMassProperties());
    const cbUsage = describeBlockCoefficientUsage(active, estimate);
    const cards = [
      {
        title: "Geometri",
        value: active?.length && active?.beam && active?.depth
          ? `${fmtUnitValue(active.length, 2, "m")} x ${fmtUnitValue(active.beam, 2, "m")} x ${fmtUnitValue(active.depth, 2, "m")}`
          : "Live bbox i viewer",
        note: bounds ? `Z-ref: ${fmtUnitValue(bounds.min?.z, 3, "m")} til ${fmtUnitValue(bounds.max?.z, 3, "m")}` : "Ingen referansebbox",
      },
      {
        title: "Draft brukt",
        value: fmtUnitValue(draftMeters, 3, "m"),
        note: Number.isFinite(active?.draftFraction)
          ? `Nedsenkning ${fmtPercent(active.draftFraction * 100, 0)} av hoyden`
          : Number.isFinite(active?.draftZWorld)
            ? `World Z ${fmtUnitValue(active.draftZWorld, 3, "m")}`
            : "Viewer world Z ikke rapportert",
      },
      {
        title: "Sentre",
        value: `CB ${fmtVector(active?.cb, 3)}`,
        note: `CG ${fmtVector(active?.cg, 3)}`,
      },
      {
        title: "Stabilitet",
        value: `KB ${fmtUnitValue(active?.kb, 3, "m")} | KG ${fmtUnitValue(active?.kg, 3, "m")}`,
        note: `GM roll ${fmtUnitValue(active?.gm?.roll, 3, "m")} | pitch ${fmtUnitValue(active?.gm?.pitch, 3, "m")}`,
      },
      {
        title: "Vannlinje",
        value: `Awp ${fmtUnitValue(active?.wpArea, 3, "m^2")}`,
        note: `Rho vann ${Number.isFinite(active?.waterDensity) ? `${Math.round(active.waterDensity)} kg/m^3` : "–"}`,
      },
      {
        title: "Materiale",
        value: analysisState.materialHint ? describeMaterialHint(analysisState.materialHint) : `${Math.round(clampNumber(inpRhoMat?.value, 100, 50000, 7850))} kg/m^3`,
        note: Number.isFinite(active?.modelMassTonnes)
          ? `Mesh-masse ${fmtTonnes(active.modelMassTonnes, 2)}${Number.isFinite(active?.massGapTonnes) ? ` | delta ${fmtTonnes(active.massGapTonnes, 2)}` : ""}`
          : estimate?.shellThicknessMm > 0
            ? `Skall ${Number(estimate.shellThicknessMm).toFixed(1)} mm | masseestimat ${fmtTonnes(estimate.materialMassTonnes, 2)}`
            : Number.isFinite(estimate?.materialMassTonnes)
            ? `Solid-/volumestimat ${fmtTonnes(estimate.materialMassTonnes, 2)}`
              : "Massetall brukes primart i sidebar-estimatet",
      },
      {
        title: "Massegrunnlag",
        value: massSummary.title,
        note: massSummary.detail,
      },
    ];
    if (cbUsage.shouldShow) {
      cards.push({
        title: "Blokk-koeff.",
        value: `Cb ${cbUsage.value}`,
        note: cbUsage.note,
      });
    }

    hydroQuickSummary.innerHTML = cards.map((card) => `
      <article class="hydro-stat-card">
        <div class="hydro-stat-title">${escapeHtml(card.title)}</div>
        <div class="hydro-stat-value">${escapeHtml(card.value)}</div>
        <div class="muted">${escapeHtml(card.note)}</div>
      </article>
    `).join("");
  }

  function renderHydroTextReport(hydro, estimate) {
    if (!hydroReport) return;
    const active = hydro || estimate;
    const viewerPending = !!hydro?.supported && !hasResolvedViewerHydro(hydro);
    const allowEstimateFallback = !hydro || hydro.isEstimate;
    const displacementTonnes = Number.isFinite(active?.displacementTonnes) ? active.displacementTonnes : (allowEstimateFallback ? estimate?.displacementTonnes : null);
    const submergedVolume = Number.isFinite(active?.submergedVolume) ? active.submergedVolume : (allowEstimateFallback ? estimate?.submergedVolume : null);
    const draftMeters = getDraftMetersFromHydro(active) ?? (allowEstimateFallback ? estimate?.draftMeters : null);
    const massSummary = getMassSourceSummary(active?.massProperties || getViewerMassProperties());
    const cbUsage = describeBlockCoefficientUsage(active, estimate);
    const summaryBlocks = [
      {
        title: "Kilde",
        value: active?.isEstimate ? "Sidebar-estimat" : viewerPending ? "Viewer-data (beregner)" : "Live viewer-data",
        note: active?.source || analysisState.geometrySource || analysisState.source || "Ingen geometri",
      },
      {
        title: "Deplasement",
        value: viewerPending ? "Beregner..." : fmtTonnes(displacementTonnes, 2),
        note: viewerPending ? "Regner fra modellgeometri ved aktiv world-Z." : `Volum ${fmtUnitValue(submergedVolume, 3, "m^3")}`,
      },
      {
        title: "Draft",
        value: fmtUnitValue(draftMeters, 3, "m"),
        note: reportState.payload?.generatedAt
          ? `Rapport oppdatert ${new Date(reportState.payload.generatedAt).toLocaleString("nb-NO")}`
          : "Bruk rapportknappen for kurver og PDF/JSON.",
      },
      {
        title: "Massegrunnlag",
        value: massSummary.title,
        note: massSummary.detail,
      },
    ];
    if (cbUsage.shouldShow) {
      summaryBlocks.push({
        title: "Blokk-koeff.",
        value: `Cb ${cbUsage.value}`,
        note: cbUsage.note,
      });
    }

    if (reportState.isGenerating) {
      hydroReport.innerHTML = `<div class="muted-box">Genererer hydro-rapport fra aktiv viewer...</div>`;
      return;
    }

    hydroReport.innerHTML = `
      <div class="report-summary-grid">
        ${summaryBlocks.map((block) => `
          <article class="report-summary-card">
            <span class="muted">${escapeHtml(block.title)}</span>
            <strong>${escapeHtml(block.value)}</strong>
            <span class="muted">${escapeHtml(block.note)}</span>
          </article>
        `).join("")}
      </div>
    `;
  }

  function updateHydroPanels() {
    const snapshot = getActiveHydroSnapshot();
    renderHydroQuickCards(snapshot.hydro, snapshot.estimate);
    renderHydroSummaryGrid(snapshot.hydro, snapshot.estimate);
    renderHydroTextReport(snapshot.hydro, snapshot.estimate);
    const cbRow = inpCb?.closest(".kv");
    if (cbRow) cbRow.hidden = snapshot.mode !== "estimate";
    updateHydroSourceText();
    updateHydroProgressUi(snapshot);

    if (hydroWarn) {
      const warnings = [];
      if (!analysisState.bbox) warnings.push("Hydrostatikk venter pa lesbar geometri/bbox.");
      if (snapshot.mode === "estimate") warnings.push("Tallene er forelopig bbox-baserte til live hydro kommer fra vieweren.");
      if (snapshot.mode === "viewer-pending") warnings.push("Draft er satt fra aktiv viewer, men deplasement og hydrodata regnes fortsatt fra modellgeometrien.");
      if (snapshot.mode === "estimate" && snapshot.estimate?.isEstimate) warnings.push(`Blokk-koeffisient ${describeBlockCoefficientUsage(snapshot.estimate, snapshot.estimate).value} brukes i sidebar-estimatet.`);
      if (reportState.payload?.note) warnings.push(reportState.payload.note);
      hydroWarn.textContent = warnings.join(" ");
    }
  }

  function buildEstimatedReportPayload(estimate) {
    if (!estimate) return null;
    const angles = [];
    const rollGz = [];
    const pitchGz = [];
    for (let deg = -60; deg <= 60; deg += 5) {
      const rad = (deg * Math.PI) / 180;
      angles.push(deg);
      rollGz.push(Number.isFinite(estimate.gm?.roll) ? estimate.gm.roll * Math.sin(rad) : null);
      pitchGz.push(Number.isFinite(estimate.gm?.pitch) ? estimate.gm.pitch * Math.sin(rad) : null);
    }

    const steps = 24;
    const drafts = [];
    const volumes = [];
    const displacements = [];
    const kbs = [];
    const awps = [];
    const saks = [];
    const sectionXs = [];
    const sectionAreas = [];
    const zMin = estimate.referenceBounds?.min?.z ?? 0;
    const xMin = estimate.referenceBounds?.min?.x ?? 0;
    const xMax = estimate.referenceBounds?.max?.x ?? (xMin + (estimate.length || 0));
    for (let i = 0; i < steps; i++) {
      const immersion = estimate.depth * (i / (steps - 1));
      drafts.push(zMin + immersion);
      volumes.push(estimate.length * estimate.beam * immersion * estimate.blockCoefficient);
      displacements.push(volumes[i] * estimate.waterDensity / 1000);
      kbs.push(immersion * 0.53);
      awps.push(estimate.length * estimate.beam * Math.max(0.58, Math.min(0.98, estimate.blockCoefficient + 0.18)));
      saks.push(null);
    }
    const sectionSteps = 28;
    const maxSectionArea = Math.max(0, (estimate.beam || 0) * (estimate.draftMeters || 0) * Math.max(0.22, Math.min(1, (estimate.blockCoefficient || 0.6) * 0.95)));
    for (let i = 0; i < sectionSteps; i++) {
      const t = i / Math.max(1, sectionSteps - 1);
      const bell = Math.pow(Math.max(0, Math.sin(Math.PI * t)), 1.2);
      sectionXs.push(xMin + (xMax - xMin) * t);
      sectionAreas.push(maxSectionArea * bell);
    }

    return {
      generatedAt: new Date().toISOString(),
      fileName: displayFileName || fileName || "Hydro-modell",
      sourceLabel: "Sidebar-estimat",
      quality: "estimate",
      units: "m",
      sourceUnits: analysisState.units || "m",
      unitNote: "Sidebar-estimat bruker tilgjengelig geometrihint og rapporterer i meter.",
      currentHydro: estimate,
      rollReport: {
        meta: { mode: "roll", draftZWorld: estimate.draftZWorld, qualityUsed: "estimate", includeSAK: false },
        now: {
          subV: estimate.submergedVolume,
          cbW: estimate.cb,
          cgW: estimate.cg,
          wp: { A: estimate.wpArea },
          kb: estimate.kb,
          kg: estimate.kg,
          bm: estimate.bm,
          gm: estimate.gm,
          gz_now: {
            roll: Number.isFinite(estimate.gm?.roll) ? estimate.gm.roll * Math.sin((estimate.heelDeg || 0) * Math.PI / 180) : null,
            pitch: Number.isFinite(estimate.gm?.pitch) ? estimate.gm.pitch * Math.sin((estimate.trimDeg || 0) * Math.PI / 180) : null,
          },
        },
        curve: { anglesDeg: angles, gz: rollGz, displacedVolume: angles.map(() => estimate.submergedVolume), sak: angles.map(() => null) },
        stability: computeCurveMetrics(angles, rollGz),
      },
      pitchReport: {
        meta: { mode: "pitch", draftZWorld: estimate.draftZWorld, qualityUsed: "estimate", includeSAK: false },
        now: {
          subV: estimate.submergedVolume,
          cbW: estimate.cb,
          cgW: estimate.cg,
          wp: { A: estimate.wpArea },
          kb: estimate.kb,
          kg: estimate.kg,
          bm: estimate.bm,
          gm: estimate.gm,
          gz_now: {
            roll: Number.isFinite(estimate.gm?.roll) ? estimate.gm.roll * Math.sin((estimate.heelDeg || 0) * Math.PI / 180) : null,
            pitch: Number.isFinite(estimate.gm?.pitch) ? estimate.gm.pitch * Math.sin((estimate.trimDeg || 0) * Math.PI / 180) : null,
          },
        },
        curve: { anglesDeg: angles, gz: pitchGz, displacedVolume: angles.map(() => estimate.submergedVolume), sak: angles.map(() => null) },
        stability: computeCurveMetrics(angles, pitchGz),
      },
      draftScan: {
        meta: { draftCount: drafts.length, qualityUsed: "estimate", rho: estimate.waterDensity, includeAwp: true, includeSAK: false },
        data: { drafts, volumes, displacements, kbs, awps, saks },
      },
      sectionCurve: {
        meta: {
          stationCount: sectionXs.length,
          qualityUsed: "estimate",
          draftZWorld: estimate.draftZWorld,
          note: "For estimate brukes en forenklet seksjonsfordeling fra bbox og blokkkoeffisient.",
        },
        data: {
          xStations: sectionXs,
          sectionAreas,
          activeX: Number.isFinite(estimate.cb?.x) ? estimate.cb.x : (xMin + xMax) * 0.5,
        },
      },
      equilibriumState: null,
      note: "Kurver, draft-scan og seksjonsareal er beregnet som teoretisk fallback fra bbox/geometrihint.",
    };
  }

  function drawLineChart(canvas, { title = "", xLabel = "", yLabel = "", series = [], activePoint = null } = {}) {
    if (!canvas?.getContext) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    const points = [];
    series.forEach((item) => {
      (item?.x || []).forEach((x, index) => {
        const y = item.y?.[index];
        if (Number.isFinite(x) && Number.isFinite(y)) points.push({ x, y });
      });
    });
    if (!points.length) {
      ctx.fillStyle = "#64748b";
      ctx.font = "600 16px Segoe UI, Arial, sans-serif";
      ctx.fillText("Ingen kurvedata tilgjengelig.", 24, 44);
      return;
    }

    const margin = { top: 44, right: 28, bottom: 44, left: 64 };
    const plotW = width - margin.left - margin.right;
    const plotH = height - margin.top - margin.bottom;
    let xMin = Math.min(...points.map((p) => p.x));
    let xMax = Math.max(...points.map((p) => p.x));
    let yMin = Math.min(...points.map((p) => p.y));
    let yMax = Math.max(...points.map((p) => p.y));
    if (xMin === xMax) { xMin -= 1; xMax += 1; }
    if (yMin === yMax) { yMin -= 1; yMax += 1; }
    const yPad = Math.max((yMax - yMin) * 0.14, 0.05);
    yMin -= yPad;
    yMax += yPad;

    const sx = (value) => margin.left + ((value - xMin) / (xMax - xMin)) * plotW;
    const sy = (value) => height - margin.bottom - ((value - yMin) / (yMax - yMin)) * plotH;

    ctx.strokeStyle = "#dbe5f0";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 6; i++) {
      const x = margin.left + (plotW * i) / 6;
      const y = margin.top + (plotH * i) / 6;
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, height - margin.bottom);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(width - margin.right, y);
      ctx.stroke();
    }

    ctx.strokeStyle = "#a8b9cf";
    ctx.beginPath();
    ctx.moveTo(margin.left, height - margin.bottom);
    ctx.lineTo(width - margin.right, height - margin.bottom);
    ctx.lineTo(width - margin.right, margin.top);
    ctx.stroke();

    series.forEach((item) => {
      const color = item.color || "#2563eb";
      let started = false;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      (item.x || []).forEach((x, index) => {
        const y = item.y?.[index];
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        const px = sx(x);
        const py = sy(y);
        if (!started) {
          ctx.moveTo(px, py);
          started = true;
        } else {
          ctx.lineTo(px, py);
        }
      });
      ctx.stroke();
    });

    if (activePoint && Number.isFinite(activePoint.x) && Number.isFinite(activePoint.y)) {
      ctx.fillStyle = "#111827";
      ctx.beginPath();
      ctx.arc(sx(activePoint.x), sy(activePoint.y), 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#152033";
    ctx.font = "700 16px Segoe UI, Arial, sans-serif";
    ctx.fillText(title, margin.left, 24);
    ctx.font = "600 12px Segoe UI, Arial, sans-serif";
    ctx.fillStyle = "#66758c";
    ctx.fillText(xLabel, width / 2 - 36, height - 12);
    ctx.save();
    ctx.translate(18, height / 2 + 28);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();

    ctx.font = "600 11px Consolas, Menlo, monospace";
    ctx.fillStyle = "#516175";
    for (let i = 0; i <= 4; i++) {
      const xValue = xMin + ((xMax - xMin) * i) / 4;
      const yValue = yMin + ((yMax - yMin) * (4 - i)) / 4;
      ctx.fillText(xValue.toFixed(1), margin.left + (plotW * i) / 4 - 10, height - margin.bottom + 18);
      ctx.fillText(yValue.toFixed(2), 8, margin.top + (plotH * i) / 4 + 4);
    }

    let legendX = width - margin.right - 150;
    const legendY = 18;
    series.forEach((item, index) => {
      const y = legendY + index * 18;
      ctx.fillStyle = item.color || "#2563eb";
      ctx.fillRect(legendX, y - 8, 12, 12);
      ctx.fillStyle = "#334155";
      ctx.fillText(item.label || `Serie ${index + 1}`, legendX + 18, y + 2);
    });
  }

  function interpolateSeriesValue(xs = [], ys = [], targetX = null) {
    if (!Number.isFinite(targetX)) return null;
    let previous = null;
    for (let i = 0; i < xs.length; i++) {
      const x = Number(xs[i]);
      const y = Number(ys[i]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      if (x === targetX) return y;
      if (x > targetX) {
        if (!previous) return y;
        const dx = x - previous.x;
        if (!Number.isFinite(dx) || Math.abs(dx) < 1e-9) return y;
        const t = (targetX - previous.x) / dx;
        return previous.y + (y - previous.y) * t;
      }
      previous = { x, y };
    }
    return previous?.y ?? null;
  }

  function drawHydroCurveChart(canvas, payload) {
    const rollReport = payload?.rollReport;
    const pitchReport = payload?.pitchReport;
    const currentHydro = payload?.currentHydro || payload?.hydro || null;
    drawLineChart(canvas, {
      title: "GZ / stabilitetskurver",
      xLabel: "Vinkel (deg)",
      yLabel: "GZ (m)",
      activePoint: {
        x: safeNumber(currentHydro?.heelDeg) ?? 0,
        y: safeNumber(rollReport?.now?.gz_now?.roll),
      },
      series: [
        {
          label: "Roll",
          color: "#1d4ed8",
          x: rollReport?.curve?.anglesDeg || [],
          y: rollReport?.curve?.gz || [],
        },
        {
          label: "Pitch",
          color: "#f97316",
          x: pitchReport?.curve?.anglesDeg || [],
          y: pitchReport?.curve?.gz || [],
        },
      ],
    });
  }

  function drawDraftScanChart(canvas, payload) {
    const scan = payload?.draftScan;
    const data = scan?.data || {};
    const currentHydro = payload?.currentHydro || payload?.hydro || null;
    const refMinZ = safeNumber(currentHydro?.referenceBounds?.min?.z) || 0;
    const draftXs = (data.drafts || []).map((draft) => Number.isFinite(draft) ? draft - refMinZ : null);
    drawLineChart(canvas, {
      title: "Draft / deplasement",
      xLabel: "Draft fra referanse-bunn (m)",
      yLabel: "Deplasement (t)",
      activePoint: {
        x: getDraftMetersFromHydro(currentHydro),
        y: safeNumber(currentHydro?.displacementTonnes),
      },
      series: [
        {
          label: "Deplasement",
          color: "#0f766e",
          x: draftXs,
          y: data.displacements || [],
        },
      ],
    });
  }

  function drawSakCurveChart(canvas, payload) {
    const currentHydro = payload?.currentHydro || payload?.hydro || null;
    const sectionData = payload?.sectionCurve?.data || {};
    const xStations = Array.isArray(sectionData?.xStations) ? sectionData.xStations : [];
    const sectionAreas = Array.isArray(sectionData?.sectionAreas) ? sectionData.sectionAreas : [];
    const refMinX = safeNumber(currentHydro?.referenceBounds?.min?.x)
      ?? safeNumber(Math.min(...xStations.filter((value) => Number.isFinite(value))))
      ?? 0;
    const xs = xStations.map((x) => Number.isFinite(x) ? x - refMinX : null);
    const activeX = Number.isFinite(sectionData?.activeX)
      ? sectionData.activeX - refMinX
      : Number.isFinite(currentHydro?.cb?.x)
        ? currentHydro.cb.x - refMinX
        : null;
    drawLineChart(canvas, {
      title: "Seksjonsareal langs lengden",
      xLabel: "Lengde fra akterreferanse (m)",
      yLabel: "Undervanns seksjonsareal (m^2)",
      activePoint: {
        x: activeX,
        y: interpolateSeriesValue(xs, sectionAreas, activeX),
      },
      series: [
        {
          label: "Seksjonsareal",
          color: "#7c3aed",
          x: xs,
          y: sectionAreas,
        },
      ],
    });
  }

  function drawAwpDraftChart(canvas, payload) {
    const scan = payload?.draftScan;
    const data = scan?.data || {};
    const currentHydro = payload?.currentHydro || payload?.hydro || null;
    const refMinZ = safeNumber(currentHydro?.referenceBounds?.min?.z) || 0;
    const draftXs = (data.drafts || []).map((draft) => Number.isFinite(draft) ? draft - refMinZ : null);
    drawLineChart(canvas, {
      title: "Vannlinjeareal / draft",
      xLabel: "Draft fra referanse-bunn (m)",
      yLabel: "Awp (m^2)",
      activePoint: {
        x: getDraftMetersFromHydro(currentHydro),
        y: safeNumber(currentHydro?.wpArea ?? payload?.rollReport?.now?.wp?.A),
      },
      series: [
        {
          label: "Awp",
          color: "#d97706",
          x: draftXs,
          y: data.awps || [],
        },
      ],
    });
  }

  function buildHydroMethodNoteHtml(currentHydro, massSummary, componentMassRows = []) {
    const massProps = currentHydro?.massProperties || getViewerMassProperties() || null;
    const cbUsage = describeBlockCoefficientUsage(currentHydro, analysisState.latestHydroEstimate);
    const kb = safeNumber(currentHydro?.kb);
    const kg = safeNumber(currentHydro?.kg);
    const bmRoll = safeNumber(currentHydro?.bm?.roll);
    const bmPitch = safeNumber(currentHydro?.bm?.pitch);
    const gmRoll = safeNumber(currentHydro?.gm?.roll);
    const gmPitch = safeNumber(currentHydro?.gm?.pitch);
    const totalMassTonnes = safeNumber(currentHydro?.modelMassTonnes ?? massProps?.totalMassTonnes);
    const totalVolume = safeNumber(massProps?.totalVolumeM3);
    const perComponentCount = Array.isArray(componentMassRows) ? componentMassRows.length : 0;
    const directMassCount = Array.isArray(componentMassRows)
      ? componentMassRows.filter((entry) => entry?.massMode === "direct" && Number.isFinite(entry?.massKg)).length
      : 0;
    const densityMode = String(massProps?.densityMode || "unresolved");
    const usesUniformDensity = densityMode === "uniform";
    const usesMixedDensity = densityMode === "mixed";
    const usesPerComponentDensity = densityMode === "per-component";
    const hasResolvedMass = Number.isFinite(totalMassTonnes) && totalMassTonnes > 0;

    let kgMethodText = "KG kunne ikke bestemmes sikkert fordi massegrunnlaget fortsatt er ufullstendig.";
    if (hasResolvedMass) {
      if (directMassCount > 0) {
        kgMethodText = `KG beregnes som masseveid tyngdepunkt for ${perComponentCount || "modellens"} komponenter. Deler med direkte oppgitt masse bruker den massen direkte, mens volum brukes til a plassere massen i komponentens centroid. Dersom en hel gruppe/familie har felles totalmasse, fordeles den internt proporsjonalt med komponentvolum nar volum finnes, ellers likt per del.`;
      } else if (usesPerComponentDensity) {
        kgMethodText = `KG beregnes numerisk fra komponentmeshene: hvert komponentvolum multipliseres med egen tetthet/materialdata, og samlet tyngdepunkt blir det masseveide gjennomsnittet av alle komponentcentroider.`;
      } else if (usesMixedDensity) {
        kgMethodText = `KG beregnes numerisk fra komponentmeshene med blandet massegrunnlag: noen komponenter bruker egne materialdata eller manuelle overstyringer, mens resterende deler bruker felles tetthet.`;
      } else if (usesUniformDensity) {
        kgMethodText = `KG beregnes numerisk fra komponentmeshene, men alle deler antas a ha samme tetthet. Da blir massefordelingen i praksis styrt av volum og plassering til hver komponent.`;
      } else {
        kgMethodText = "KG beregnes fra tilgjengelig komponentgeometri, men deler av massegrunnlaget er fortsatt estimert eller mangler.";
      }
    }

    const assumptionItems = [
      `BM beregnes numerisk fra aktiv vannlinjeflate som BM = Iwp / nabla. For roll brukes vannlinjens andre arealmoment om lengdeaksen, og for pitch brukes momentet om tverraksen.`,
      `GM rapporteres som smaavinkel-GM rundt aktiv draft/trim/heel: GM_roll = KB + BM_roll - KG og GM_pitch = KB + BM_pitch - KG.`,
      `KB hentes numerisk fra oppdriftssenteret til det neddykkede volumet, mens KG/GK i rapporten er avstanden fra referanseplanet opp til tyngdepunktet G. Dersom du leser dette som GK er det samme maal som vanligvis skrives KG.`,
      `Volum, centroid og andre masseegenskaper kommer fra triangulert viewer-geometri importert fra STEP/3MF/STL, ikke fra eksakte NURBS- eller klassegodkjente hydroflater. Resultatene er derfor best egnet som ingeniorestimat og iterasjon.`,
      cbUsage.isUsed
        ? `Blokk-koeffisienten Cb = ${cbUsage.value} brukes i denne fallback-beregningen fordi live hydrogrunnlag fra viewer ikke er fullt tilgjengelig.`
        : `Blokk-koeffisienten Cb = ${cbUsage.value} er ikke styrende i denne live-beregningen; den beholdes bare som fallback hvis viewer-hydroen mangler.`,
    ];
    if (directMassCount > 0) {
      assumptionItems.push(`Rapporten bruker ${directMassCount} direkte masseoverstyringer. Der bare total masse er kjent for en gruppe, estimeres intern massefordeling fra komponentvolum dersom det finnes, ellers med lik fordeling per del.`);
    } else if (usesUniformDensity) {
      assumptionItems.push("Alle komponenter bruker felles tetthet i denne beregningen. Det er raskt og konsistent, men mindre presist hvis modellen faktisk bestar av ulike materialer eller ulik infill.");
    } else if (usesMixedDensity || usesPerComponentDensity) {
      assumptionItems.push("Der STEP/Fusion-materialinfo finnes brukes den komponentvis. Resten kan bruke standardprofil, manuell tetthet eller infill-overstyring fra sidebaren.");
    } else {
      assumptionItems.push("Nar tetthet eller masse mangler settes rapportverdier til N/A eller behandles som estimat til bedre massegrunnlag er gitt.");
    }

    const formulaRows = [
      `KB = ${fmtUnitValue(kb, 3, "m")} fra oppdriftssenteret til det neddykkede volumet.`,
      `KG/GK = ${fmtUnitValue(kg, 3, "m")} fra modellens massegrunnlag (${massSummary.modeLabel || "N/A"}).`,
      `BM roll = ${fmtUnitValue(bmRoll, 3, "m")} og BM pitch = ${fmtUnitValue(bmPitch, 3, "m")} fra vannlinjens arealmomenter.`,
      `GM roll = ${fmtUnitValue(gmRoll, 3, "m")} og GM pitch = ${fmtUnitValue(gmPitch, 3, "m")} etter smaavinkel-formelen over.`,
    ];
    if (Number.isFinite(totalMassTonnes) || Number.isFinite(totalVolume)) {
      formulaRows.push(`Massegrunnlaget bygger pa ${fmtTonnes(totalMassTonnes, 2)} og volum ${fmtUnitValue(totalVolume, 3, "m^3")} fordelt over ${perComponentCount || "modellens"} komponenter.`);
    }

    return `
      <h3>Hvordan GM, KG/GK og BM er beregnet</h3>
      <p class="muted">
        Hydrostatikken i denne rapporten er hovedsakelig numerisk. Viewer-en skjarer den triangulerte modellen med aktiv vannlinje, finner neddykket volum og vannlinjeflate, og bygger derfra KB, BM, GM og stabilitetskurver.
      </p>
      <p class="muted"><strong>KG/GK:</strong> ${escapeHtml(kgMethodText)}</p>
      <p class="muted"><strong>BM:</strong> BM kommer fra vannlinjens andre arealmoment dividert pa fortrengt volum. Derfor endrer BM seg nar draft, trim eller heel endres.</p>
      <p class="muted"><strong>GM:</strong> GM er her rapportert som smaavinkelstabilitet rundt aktiv tilstand, ikke som en separat handregnet tabellverdi.</p>
      <ul class="report-note-list">
        ${formulaRows.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
      </ul>
      <ul class="report-note-list">
        ${assumptionItems.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
      </ul>
    `;
  }

  function renderHydroReportModal(payload) {
    if (!payload) return;
    const currentHydro = payload.currentHydro || payload.hydro || getViewerHydroData() || analysisState.latestHydroEstimate;
    const rollStability = payload.rollReport?.stability || null;
    const pitchStability = payload.pitchReport?.stability || null;
    const massSummary = getMassSourceSummary(currentHydro?.massProperties || getViewerMassProperties());
    const cbUsage = describeBlockCoefficientUsage(currentHydro, analysisState.latestHydroEstimate);

    if (hydroReportTitle) hydroReportTitle.textContent = `${payload.fileName || displayFileName || fileName || "Modell"} - hydrostatikk`;
    if (hydroReportMeta) {
      hydroReportMeta.textContent = `${payload.sourceLabel || "Viewer-data"} | generert ${new Date(payload.generatedAt || Date.now()).toLocaleString("nb-NO")} | kvalitet ${getHydroQualityLabel(payload.quality || payload.rollReport?.meta?.qualityUsed)}${payload.cached ? " | gjenbrukt rapport" : ""}`;
    }
    if (hydroSheetTitle) hydroSheetTitle.textContent = payload.fileName || displayFileName || fileName || "Hydrostatikk-rapport";
    if (hydroSheetSubtitle) hydroSheetSubtitle.textContent = payload.note || "Kurver og sammendrag fra aktiv hydrostatikktilstand.";
    if (hydroSheetSource) hydroSheetSource.textContent = payload.sourceLabel || "Viewer-data";

    if (hydroReportSummary) {
      const eqDraft = payload?.equilibriumState?.draftMeters;
      const cards = [
        { title: "Draft", value: fmtUnitValue(getDraftMetersFromHydro(currentHydro), 3, "m"), note: Number.isFinite(currentHydro?.draftZWorld) ? `World Z ${Number(currentHydro.draftZWorld).toFixed(3)}` : "Ingen world-Z oppgitt" },
        { title: "Deplasement", value: fmtTonnes(currentHydro?.displacementTonnes, 2), note: `Volum ${fmtUnitValue(currentHydro?.submergedVolume, 3, "m^3")}` },
        { title: "Modellvekt", value: fmtTonnes(currentHydro?.modelMassTonnes, 2), note: Number.isFinite(currentHydro?.massGapTonnes) ? `Delta ${fmtTonnes(currentHydro.massGapTonnes, 2)}` : "Mesh + materialtetthet" },
        { title: "GM", value: `Roll ${fmtUnitValue(currentHydro?.gm?.roll, 3, "m")}`, note: `Pitch ${fmtUnitValue(currentHydro?.gm?.pitch, 3, "m")}` },
        { title: "Max GZ", value: `Roll ${fmtUnitValue(rollStability?.maxGZ, 3, "m")}`, note: `Pitch ${fmtUnitValue(pitchStability?.maxGZ, 3, "m")}` },
        { title: "Massegrunnlag", value: massSummary.title, note: massSummary.modeLabel },
        { title: "Likevektsdraft", value: fmtUnitValue(eqDraft, 3, "m"), note: describeDraftDirection(payload?.equilibriumState?.draftDirection) },
      ];
      hydroReportSummary.innerHTML = cards.map((card) => `
        <article class="report-summary-card">
          <span class="muted">${escapeHtml(card.title)}</span>
          <strong>${escapeHtml(card.value)}</strong>
          <span class="muted">${escapeHtml(card.note)}</span>
        </article>
      `).join("");
    }

    if (hydroCurveCaption) hydroCurveCaption.textContent = `Roll og pitch for gjeldende draft ${fmtUnitValue(getDraftMetersFromHydro(currentHydro), 3, "m")}. Mork prikk viser aktiv tilstand.`;
    if (hydroDraftCaption) hydroDraftCaption.textContent = "Mork prikk viser aktiv draft og deplasement i modellen.";
    if (hydroSakCaption) hydroSakCaption.textContent = "Seksjonsarealkurven viser hvor mye undervannsareal modellen har langs lengdeaksen ved aktiv draft.";
    if (hydroAwpCaption) hydroAwpCaption.textContent = "Awp-kurven viser totalt vannlinjeareal mot draft. Dette er en rask hydro-oversikt fra aktiv geometri, ikke en full stasjonsvis Bonjean-tabell.";

    if (hydroReportTable) {
      const rows = [
        ["Geometri-kilde", currentHydro?.source || analysisState.geometrySource || analysisState.source || "Ukjent"],
        ["Skala / enheter", describeReportScale(payload, currentHydro)],
        ["Vann-tetthet", Number.isFinite(currentHydro?.waterDensity) ? `${Math.round(currentHydro.waterDensity)} kg/m^3` : "–"],
        ["Materialhint", analysisState.materialHint ? describeMaterialHint(analysisState.materialHint) : "Ingen"],
        ["Materialprofil", analysisState.materialHint?.defaultedFromProfile ? "Standardprofil fra materialnavn (kan overstyres)" : analysisState.materialHint ? "Eksplisitt hint eller brukerfelt" : "Manuell / N/A"],
        ["Blokk-koeffisient", `Cb ${cbUsage.value}`],
        ["Cb brukt i beregningen", cbUsage.note],
        ["Massegrunnlag", massSummary.title],
        ["Tetthetmodus", massSummary.modeLabel],
        ["Tetthetskilder", massSummary.countsLabel],
        ["Massemetode", massSummary.methodLabel],
        ["Modellvekt", fmtTonnes(currentHydro?.modelMassTonnes, 2)],
        ["Delta deplasement-vekt", fmtTonnes(currentHydro?.massGapTonnes, 2)],
        ["CB", fmtVector(currentHydro?.cb, 3)],
        ["CG", fmtVector(currentHydro?.cg, 3)],
        ["KB / KG", `${fmtUnitValue(currentHydro?.kb, 3, "m")} / ${fmtUnitValue(currentHydro?.kg, 3, "m")}`],
        ["Awp", fmtUnitValue(currentHydro?.wpArea ?? payload.rollReport?.now?.wp?.A, 3, "m^2")],
        ["Trim / Heel", `${fmtUnitValue(currentHydro?.trimDeg, 1, "deg")} / ${fmtUnitValue(currentHydro?.heelDeg, 1, "deg")}`],
        ["Max GZ roll", `${fmtUnitValue(rollStability?.maxGZ, 3, "m")} ved ${fmtUnitValue(rollStability?.angleAtMaxGZ, 1, "deg")}`],
        ["Max GZ pitch", `${fmtUnitValue(pitchStability?.maxGZ, 3, "m")} ved ${fmtUnitValue(pitchStability?.angleAtMaxGZ, 1, "deg")}`],
        ["AVS roll", fmtUnitValue(rollStability?.avs, 1, "deg")],
        ["Omrade 0-30", fmtUnitValue(rollStability?.area_0_30, 3, "deg*m")],
      ];
      hydroReportTable.innerHTML = rows.map(([label, value]) => `
        <tr>
          <th>${escapeHtml(label)}</th>
          <td>${escapeHtml(value)}</td>
        </tr>
      `).join("");
    }

    const componentMassRows = Array.isArray(currentHydro?.massProperties?.components)
      ? currentHydro.massProperties.components
          .slice()
          .sort((a, b) => (Number(b?.massKg) || Number(b?.volumeM3) || 0) - (Number(a?.massKg) || Number(a?.volumeM3) || 0))
      : [];
    if (hydroReportComponentsWrap && hydroReportComponentsBody) {
      const hasRows = componentMassRows.length > 0;
      hydroReportComponentsWrap.hidden = !hasRows;
      if (hasRows) {
        const previewRows = componentMassRows;
        const materialProfiles = [...new Set(componentMassRows
          .map((entry) => {
            const materialLabel = String(entry?.materialLabel || "").trim();
            const densityLabel = Number.isFinite(entry?.densityKgM3) ? `${Math.round(entry.densityKgM3)} kg/m^3` : "";
            return materialLabel ? `${materialLabel}${densityLabel ? ` (${densityLabel})` : ""}` : "";
          })
          .filter(Boolean))];
        hydroReportComponentsBody.innerHTML = previewRows.map((entry) => `
          <tr>
            <th>${escapeHtml(entry.name || entry.key || "Komponent")}</th>
            <td>${escapeHtml(fmtUnitValue(entry.volumeM3, 4, "m^3"))}</td>
            <td>${escapeHtml([
              entry.materialLabel || "N/A",
              Number.isFinite(entry.infillPercent) && Number(entry.infillPercent) < 100 ? `${Math.round(entry.infillPercent)}% infill` : "",
            ].filter(Boolean).join(" · "))}</td>
            <td>${escapeHtml(Number.isFinite(entry.baseDensityKgM3) ? `${Math.round(entry.baseDensityKgM3)} kg/m^3` : "N/A")}</td>
            <td>${escapeHtml(Number.isFinite(entry.densityKgM3) ? `${Math.round(entry.densityKgM3)} kg/m^3` : "N/A")}</td>
            <td>${escapeHtml(Number.isFinite(entry.massKg) ? `${Number(entry.massKg).toFixed(entry.massKg >= 10 ? 2 : 3)} kg` : "N/A")}</td>
            <td>${escapeHtml(entry.sourceLabel || describeDensitySource(entry.densitySource))}</td>
          </tr>
        `).join("");
        if (hydroReportComponentsNote) {
          const totalCount = componentMassRows.length;
          const shownCount = previewRows.length;
          const truncationText = totalCount > shownCount ? ` Viser ${shownCount} av ${totalCount} komponenter.` : "";
          const profileText = materialProfiles.length
            ? ` Materialprofiler i rapporten: ${materialProfiles.slice(0, 8).join(", ")}${materialProfiles.length > 8 ? ` +${materialProfiles.length - 8} flere` : ""}.`
            : "";
          hydroReportComponentsNote.textContent = `${massSummary.detail}${profileText}${truncationText}`;
        }
      } else {
        hydroReportComponentsBody.innerHTML = "";
        if (hydroReportComponentsNote) hydroReportComponentsNote.textContent = "";
      }
    }

    if (hydroReportPointNote) {
      hydroReportPointNote.innerHTML = `
        <h3>Hva markerer punktene?</h3>
        <p class="muted">
          Morke punkter viser aktiv tilstand i modellen akkurat na.
          Stabilitetskurven markerer aktiv heel og GZ, draftkurven markerer aktiv draft og deplasement, og seksjonsarealkurven markerer stasjonen ved aktivt oppdriftssenter langs lengden.
          Resten av linjene er beregnede scenarier fra samme geometri og massegrunnlag.
        </p>
      `;
    }

    if (hydroReportEquilibrium) {
      const eq = payload?.equilibriumState || {};
      const eqRows = [
        ["Masse brukt i estimatet", fmtTonnes(eq.assumedMassTonnes, 2)],
        ["Likevektsdraft", fmtUnitValue(eq.draftMeters, 3, "m")],
        ["Likevekts world Z", fmtUnitValue(eq.draftZWorld, 3, "m")],
        ["Deplasement ved likevekt", fmtTonnes(eq.displacementTonnes, 2)],
        ["Massefeil ved likevekt", fmtTonnes(eq.errorTonnes, 3)],
        ["Forskjell mot innsatt draft", fmtUnitValue(eq.deltaDraftMeters, 3, "m")],
        ["Vurdering", describeDraftDirection(eq.draftDirection)],
        ["Estimert trim", Number.isFinite(eq.trimDeg) ? fmtUnitValue(eq.trimDeg, 2, "deg") : "N/A"],
        ["Estimert heel", Number.isFinite(eq.heelDeg) ? fmtUnitValue(eq.heelDeg, 2, "deg") : "N/A"],
        ["Estimat-notat", eq.note || "N/A"],
      ];
      hydroReportEquilibrium.innerHTML = eqRows.map(([label, value]) => `
        <tr>
          <th>${escapeHtml(label)}</th>
          <td>${escapeHtml(value)}</td>
        </tr>
      `).join("");
    }
    if (hydroReportEquilibriumNote) {
      hydroReportEquilibriumNote.textContent = payload?.equilibriumState?.note || "N/A - likevektsdraft kunne ikke bestemmes for denne rapporten.";
    }

    if (hydroReportMethodNote) {
      hydroReportMethodNote.innerHTML = buildHydroMethodNoteHtml(currentHydro, massSummary, componentMassRows);
    }

    drawHydroCurveChart(hydroReportCurve, payload);
    drawDraftScanChart(hydroReportDraftCurve, payload);
    drawSakCurveChart(hydroReportSakCurve, payload);
    drawAwpDraftChart(hydroReportAwpCurve, payload);
    renderHydroTextReport(currentHydro, analysisState.latestHydroEstimate);
  }

  function openHydroReportModal() {
    if (!hydroReportModal) return;
    hydroReportModal.hidden = false;
  }

  function closeHydroReportModal() {
    if (!hydroReportModal) return;
    hydroReportModal.hidden = true;
  }

  function buildHydroDetailSignature() {
    return JSON.stringify({
      v: REPORT_CACHE_VERSION,
      file: cleanUrlPath(decodedFile),
      command: collectHydroCommandPayload({ includeDraftPose: true }),
    });
  }

  function getHydroReportSessionKey() {
    return `${REPORT_SESSION_PREFIX}:${cleanUrlPath(decodedFile)}`;
  }

  function saveHydroReportCache(
    payload,
    detailSignature = buildHydroDetailSignature(),
    requestKey = detailSignature
  ) {
    if (!payload) return;
    reportState.payload = payload;
    reportState.detailSignature = detailSignature;
    reportState.cacheKey = detailSignature;
    try {
      sessionStorage.setItem(getHydroReportSessionKey(), JSON.stringify({
        detailSignature,
        payload,
      }));
    } catch {}
  }

  function loadHydroReportCache(
    detailSignature = buildHydroDetailSignature()
  ) {
    if (
      reportState.payload &&
      reportState.detailSignature === detailSignature
    ) {
      return reportState.payload;
    }
    try {
      const raw = sessionStorage.getItem(getHydroReportSessionKey());
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (
        parsed?.detailSignature !== detailSignature ||
        !parsed?.payload
      ) return null;
      reportState.payload = parsed.payload;
      reportState.detailSignature = detailSignature;
      reportState.cacheKey = detailSignature;
      return parsed.payload;
    } catch {
      return null;
    }
  }

  function downloadHydroReportJson() {
    if (!reportState.payload) return;
    const blob = new Blob([JSON.stringify(reportState.payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(displayFileName || fileName || "hydro").replace(/\.[^.]+$/i, "")}-hydro.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function collectHydroCommandPayload({ includeDraftPose = true } = {}) {
    const payload = {
      waterDensity: clampNumber(inpRhoWater?.value, 900, 1100, 1025),
      materialDensity: clampNumber(inpRhoMat?.value, 100, 50000, 7850),
      quality: selHydroQuality?.value || "low",
      performanceMode: chkHydroPerfMode?.checked === true,
      componentDensityOverrides: buildComponentDensityOverridePayload(),
    };
    if (includeDraftPose) {
      const draftZWorld = safeNumber(inpHydroDraft?.value);
      const trim = safeNumber(inpHydroTrim?.value);
      const heel = safeNumber(inpHydroHeel?.value);
      if (Number.isFinite(draftZWorld)) payload.draftZWorld = draftZWorld;
      if (Number.isFinite(trim)) payload.trim = trim;
      if (Number.isFinite(heel)) payload.heel = heel;
    }
    return payload;
  }

  function buildHydroReportRequestKey() {
    return buildHydroDetailSignature();
  }

  function describeDraftDirection(direction) {
    if (direction === "down") return "Maa synke dypere enn innsatt draft.";
    if (direction === "up") return "Maa ligge grunnere enn innsatt draft.";
    if (direction === "same") return "Ligger omtrent pa innsatt draft.";
    return "N/A";
  }

  function describeReportScale(payload, currentHydro) {
    const viewerUnits = payload?.units || currentHydro?.units || "m";
    const sourceUnits = payload?.sourceUnits || currentHydro?.sourceUnits || analysisState.units || viewerUnits;
    const note = payload?.unitNote || currentHydro?.unitNote || "";
    if (viewerUnits === sourceUnits || !sourceUnits) {
      return note || `Viewer beregner i ${viewerUnits}.`;
    }
    return `${note || ""} Kildeenhet: ${sourceUnits}. Viewer-enhet: ${viewerUnits}.`.trim();
  }

  function postHydroVisibilityToViewer() {
    postViewerCommandToViewer("set-hydro-visibility", {
      waterline: chkHydroWaterline?.checked !== false,
      contour: chkHydroContour?.checked !== false,
      markers: { cg: chkHydroMarkers?.checked !== false, cb: chkHydroMarkers?.checked !== false },
    });
  }

  function applyHydroControlsToViewer({ includeDraftPose = true, silentEstimate = false } = {}) {
    setHydroTaskState(true, "Oppdaterer hydrostatikk...", "Bruker aktiv draft, trim og heel fra modellen.");
    postHydroVisibilityToViewer();
    postViewerCommandToViewer("set-hydro-state", collectHydroCommandPayload({ includeDraftPose }));
    if (!silentEstimate) buildHydroReport();
    updateHydroProgressUi();
  }

  function requestHydroReport({ force = false } = {}) {
    const requestKey = buildHydroReportRequestKey();
    const detailSignature = buildHydroDetailSignature();
    const cachedPayload = force ? null : loadHydroReportCache(detailSignature);
    if (!force && cachedPayload && !reportState.isGenerating) {
      if (btnHydroReport) {
        btnHydroReport.disabled = false;
        btnHydroReport.textContent = "Vis rapport";
      }
      if (btnHydroRecalc) {
        btnHydroRecalc.disabled = false;
        btnHydroRecalc.textContent = "Recalc rapport";
      }
      renderHydroReportModal({ ...cachedPayload, cached: true });
      openHydroReportModal();
      return;
    }

    const viewerHydro = getViewerHydroData();
    if (viewerHydro?.supported) {
      reportState.isGenerating = true;
      reportState.requestKey = requestKey;
      reportState.detailSignature = detailSignature;
      reportState.startedAt = Date.now();
      setHydroTaskState(true, "Genererer hydro-rapport...", "Kjører draftscan, seksjonsareal og stabilitetskurver i aktiv viewer.", {
        kind: "report",
        progress: 0.02,
      });
      if (btnHydroReport) {
        btnHydroReport.disabled = true;
        btnHydroReport.textContent = "Genererer rapport...";
      }
      if (btnHydroRecalc) {
        btnHydroRecalc.disabled = true;
        btnHydroRecalc.textContent = "Regner pa nytt...";
      }
      updateHydroPanels();
      postViewerCommandToViewer("generate-hydro-report", {
        ...collectHydroCommandPayload({ includeDraftPose: true }),
        forceRecalc: !!force,
        fileName: displayFileName || fileName || "Hydro-modell",
      });
      return;
    }

    const estimate = analysisState.latestHydroEstimate || buildHydroEstimateFromBbox();
    const payload = buildEstimatedReportPayload(estimate);
    if (!payload) return;
    saveHydroReportCache(payload, detailSignature, requestKey);
    renderHydroReportModal(payload);
    openHydroReportModal();
  }

  function updateHydroSourceText() {
    const snapshot = getActiveHydroSnapshot();
    const active = snapshot.hydro;
    const massSummary = getMassSourceSummary(active?.massProperties || getViewerMassProperties());
    const geometrySource = active?.source || analysisState.geometrySource || analysisState.source || "Ingen geometri enda";
    const viewerScaleNote = active?.unitNote || snapshot.hydro?.unitNote || "";
    const liveLabel = snapshot.mode === "viewer" ? "Live hydro fra aktiv viewer." : "Hydro bygger forelopig pa sidebar-estimat.";
    const waterlineLabel = snapshot.mode === "viewer"
      ? `Vannlinje/markorer styres i ${geometrySource}.`
      : "Vannlinje i sidebaren trenger en viewer med hydrostotte for live oppdatering.";
    if (hydroSource) {
      hydroSource.textContent = `Geometri: ${geometrySource}. Enheter: ${active?.units || analysisState.units || "m"}. ${viewerScaleNote ? `${viewerScaleNote} ` : ""}${liveLabel} ${waterlineLabel}`;
    }
    if (hydroMaterialHint) {
      const materialText = analysisState.materialHint
        ? `Materialhint: ${describeMaterialHint(analysisState.materialHint)}${analysisState.materialHintSource ? ` (${analysisState.materialHintSource})` : ""}.${analysisState.materialHint.defaultedFromProfile ? " Standardprofil fra materialnavn brukes til du eventuelt overstyrer tettheten." : ""}`
        : "Materiale: bruker valgt tetthet i panelet.";
      hydroMaterialHint.textContent = `${materialText} Massegrunnlag: ${massSummary.detail}`;
    }
    if (txtKgMode) {
      txtKgMode.textContent = massSummary.title === "Masse ikke fullt bestemt"
        ? "Fallback fra geometriens centroid brukes til mer masse er kjent."
        : "KG hentes automatisk fra komponentgeometri og massegrunnlag.";
    }
  }

  let componentState = { items: [], mode: "cad", source: "metadata" };
  const componentCatalog = {
    viewerItems: [],
    metadataItems: [],
  };
  const componentMaterialOverrides = new Map();
  restoreMaterialOverrideState();

  function escapeHtml(str) {
    return String(str || "").replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));
  }

  function escapeAttr(str) {
    return String(str || "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;" }[c]));
  }

  function safeNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function clampNumber(value, min, max, fallback = null) {
    const n = safeNumber(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function unitScaleToMeters(unit) {
    if (unit === "mm") return 0.001;
    if (unit === "cm") return 0.01;
    if (unit === "dm") return 0.1;
    return 1;
  }

  function fmtUnitValue(value, digits = 3, unit = "m") {
    return Number.isFinite(value) ? `${Number(value).toFixed(digits)} ${unit}` : "–";
  }

  function fmtTonnes(value, digits = 2) {
    return Number.isFinite(value) ? `${Number(value).toFixed(digits)} t` : "–";
  }

  function fmtPercent(value, digits = 0) {
    return Number.isFinite(value) ? `${Number(value).toFixed(digits)} %` : "–";
  }

  function buildExtraDetailsHtml(lines = []) {
    const values = Array.isArray(lines) ? lines.filter(Boolean) : [];
    if (!values.length) return "";
    return values.map((line) => {
      const text = String(line || "").trim();
      if (!text) return "";
      if (/^Filer i container \(f[øo]rste \d+\):/i.test(text)) {
        const fullText = text.replace(/^Filer i container \(f[øo]rste \d+\):\s*/i, "");
        const preview = fullText.length > 120 ? `${fullText.slice(0, 120).trim()}...` : fullText;
        return `
          <details class="meta-expand">
            <summary>
              <span class="meta-expand-title">Filer i container</span>
              <span class="meta-expand-preview">${escapeHtml(preview)}</span>
            </summary>
            <div class="meta-expand-content">${escapeHtml(fullText)}</div>
          </details>
        `;
      }
      return `<div class="meta-line">${escapeHtml(text)}</div>`;
    }).join("");
  }

  function fmtVector(vec, digits = 3) {
    if (!vec || !Number.isFinite(vec.x) || !Number.isFinite(vec.y) || !Number.isFinite(vec.z)) return "–";
    return `${Number(vec.x).toFixed(digits)}, ${Number(vec.y).toFixed(digits)}, ${Number(vec.z).toFixed(digits)}`;
  }

  function getViewerHydroData() {
    const direct = analysisState.latestViewerHydro;
    if (direct?.supported) return direct;
    const nested = analysisState.viewerAnalysis?.hydro;
    return nested?.supported ? nested : null;
  }

  function getViewerMassProperties() {
    const direct = analysisState.latestViewerMassProperties;
    if (direct?.source || Number.isFinite(direct?.totalMassTonnes) || Number.isFinite(direct?.totalVolumeM3)) return direct;
    const hydroMass = analysisState.latestViewerHydro?.massProperties;
    if (hydroMass?.source || Number.isFinite(hydroMass?.totalMassTonnes) || Number.isFinite(hydroMass?.totalVolumeM3)) return hydroMass;
    const nested = analysisState.viewerAnalysis?.massProperties;
    return nested?.source || Number.isFinite(nested?.totalMassTonnes) || Number.isFinite(nested?.totalVolumeM3) ? nested : null;
  }

  function describeDensitySource(source) {
    if (source === "override-item") return "manuell komponentoverstyring";
    if (source === "override-group") return "manuell gruppeoverstyring";
    if (source === "override-family") return "manuell familieoverstyring";
    if (source === "component-density") return "eksplisitt komponenttetthet";
    if (source === "component-material-hint") return "komponenthint";
    if (source === "uniform-panel") return "lik tetthet fra hydro-panelet";
    if (source === "uniform-model-hint") return "lik tetthet fra modellhint";
    if (source === "uniform-fallback") return "lik tetthet (fallback)";
    return "ukjent";
  }

  function summarizeDensitySourceCounts(counts) {
    if (!counts || typeof counts !== "object") return "N/A";
    const parts = Object.entries(counts)
      .filter(([, count]) => Number(count) > 0)
      .sort((a, b) => Number(b[1]) - Number(a[1]) || String(a[0]).localeCompare(String(b[0]), "nb"))
      .map(([source, count]) => `${count} x ${describeDensitySource(source)}`);
    return parts.length ? parts.join(", ") : "N/A";
  }

  function getMassSourceSummary(massProps = getViewerMassProperties()) {
    if (!massProps) {
      return {
        title: "N/A",
        detail: "Ingen masseegenskaper mottatt fra viewer ennå.",
        modeLabel: "N/A",
        countsLabel: "N/A",
        methodLabel: "N/A",
      };
    }
    const componentCount = Number.isFinite(massProps.componentCount)
      ? massProps.componentCount
      : Array.isArray(massProps.components)
        ? massProps.components.length
        : 0;
    const densityLabel = Number.isFinite(massProps.densityKgM3)
      ? `${Math.round(massProps.densityKgM3)} kg/m^3`
      : "N/A";
    const prefillSource = analysisState.materialHintSource
      ? ` Forhandsutfylt fra ${analysisState.materialHintSource}.`
      : "";
    const profileDefaultText = analysisState.materialHint?.defaultedFromProfile
      ? " Standardprofil fra materialnavn brukes til du eventuelt overstyrer tettheten."
      : "";
    const countsLabel = summarizeDensitySourceCounts(massProps.densitySourceCounts);
    const methodLabel = massProps.massMethodLabel || "Komponentmesh kombinert med Steiner/parallellakseteorem";
    const manualOverrideCount = Object.entries(massProps.densitySourceCounts || {})
      .filter(([source, count]) => String(source || "").startsWith("override-") && Number(count) > 0)
      .reduce((sum, [, count]) => sum + Number(count), 0);
    const manualOverrideText = manualOverrideCount
      ? ` ${manualOverrideCount} komponenter bruker manuell materiale/infill-overstyring fra sidebaren.`
      : "";

    if (massProps.densityMode === "per-component") {
      return {
        title: "Komponentvis masse",
        detail: `${componentCount} komponenter bruker egne meshvolumer og individuelle tettheter/materialhint.${manualOverrideText} ${methodLabel}. ${countsLabel}.`,
        modeLabel: "Per komponent",
        countsLabel,
        methodLabel,
      };
    }
    if (massProps.densityMode === "mixed") {
      return {
        title: "Blandet massegrunnlag",
        detail: `${componentCount} komponenter kombineres fra mesh. Noen bruker egne materialdata eller manuelle overstyringer, resten bruker felles tetthet ${densityLabel}.${prefillSource}${profileDefaultText}${manualOverrideText} ${methodLabel}. ${countsLabel}.`,
        modeLabel: "Blandet",
        countsLabel,
        methodLabel,
      };
    }
    if (massProps.densityMode === "uniform") {
      return {
        title: "Lik tetthet pa alle",
        detail: `${componentCount} komponentmesh kombineres med samme tetthet ${densityLabel} for alle deler.${prefillSource}${profileDefaultText} ${methodLabel}. ${countsLabel}.`,
        modeLabel: "Lik tetthet",
        countsLabel,
        methodLabel,
      };
    }
    return {
      title: "Volumbasert fallback",
      detail: `${componentCount} komponenter har volum/centroid, men ikke komplett tetthetsgrunnlag. Masse er derfor N/A eller delvis estimert.`,
      modeLabel: "N/A",
      countsLabel,
      methodLabel,
    };
  }

  function getHydroComponentCount(snapshot = getActiveHydroSnapshot()) {
    const massProps = snapshot?.hydro?.massProperties || getViewerMassProperties();
    const directCount = Number(massProps?.componentCount);
    if (Number.isFinite(directCount) && directCount > 0) return directCount;
    if (Array.isArray(massProps?.components) && massProps.components.length) return massProps.components.length;
    if (Array.isArray(componentState?.items) && componentState.items.length) return componentState.items.length;
    return 1;
  }

  function formatEtaRangeSeconds(minSeconds, maxSeconds) {
    const safeMin = Math.max(1, Math.round(minSeconds || 1));
    const safeMax = Math.max(safeMin, Math.round(maxSeconds || safeMin));
    if (safeMax < 60) return `Est: ${safeMin}-${safeMax} s`;
    const minMin = Math.max(1, Math.round(safeMin / 60));
    const maxMin = Math.max(minMin, Math.round(safeMax / 60));
    return `Est: ${minMin}-${maxMin} min`;
  }

  function formatEtaMs(ms) {
    const seconds = Math.max(1, Math.round((Number(ms) || 0) / 1000));
    if (seconds < 60) return `Est: ${seconds} s`;
    const minutes = Math.floor(seconds / 60);
    const remain = seconds % 60;
    return remain > 0 ? `Est: ${minutes}m ${remain}s` : `Est: ${minutes} min`;
  }

  function getLiveEtaMs() {
    if (!Number.isFinite(hydroTaskState.etaMs)) return null;
    const updatedAt = Number(hydroTaskState.etaUpdatedAt) || Date.now();
    return Math.max(0, hydroTaskState.etaMs - (Date.now() - updatedAt));
  }

  function getAnimatedHydroProgress() {
    if (!Number.isFinite(hydroTaskState.progress)) return null;
    const baseProgress = Math.max(0, Math.min(1, Number(hydroTaskState.progress)));
    const liveEta = getLiveEtaMs();
    if (!Number.isFinite(liveEta) || liveEta <= 0 || !Number.isFinite(hydroTaskState.etaMs) || hydroTaskState.etaMs <= 0) {
      return baseProgress;
    }
    const elapsed = Math.max(0, Date.now() - (Number(hydroTaskState.progressUpdatedAt) || Date.now()));
    const progressWindow = Math.min(0.08, (1 - baseProgress) * 0.35);
    const fraction = Math.max(0, Math.min(1, elapsed / hydroTaskState.etaMs));
    return Math.min(0.985, baseProgress + progressWindow * fraction);
  }

  function getHydroEtaLabel(kind = "hydro", snapshot = getActiveHydroSnapshot()) {
    const quality = selHydroQuality?.value || snapshot?.hydro?.quality || "low";
    const performanceMode = chkHydroPerfMode?.checked === true;
    const componentCount = getHydroComponentCount(snapshot);
    const measuredSeconds = kind === "report" && Number.isFinite(reportState.lastDurationMs) && reportState.lastDurationMs > 500
      ? reportState.lastDurationMs / 1000
      : null;
    const baseSeconds = kind === "report"
      ? measuredSeconds || ({ low: 35, med: 95, high: 260 }[quality] || 95)
      : { low: 6, med: 18, high: 45 }[quality] || 18;
    const performanceFactor = performanceMode ? 0.58 : 1;
    const complexityFactor = componentCount <= 8
      ? 1
      : componentCount <= 24
        ? 1.25
        : componentCount <= 60
          ? 1.7
          : componentCount <= 120
          ? 2.2
            : 3;
    const minSeconds = baseSeconds * performanceFactor * Math.max(0.85, complexityFactor * 0.75);
    const maxSeconds = baseSeconds * performanceFactor * Math.max(1.2, complexityFactor * 1.2);
    return formatEtaRangeSeconds(minSeconds, maxSeconds);
  }

  function setHydroTaskState(active, title = "", text = "", options = {}) {
    const wasActive = hydroTaskState.active;
    hydroTaskState.active = !!active;
    hydroTaskState.title = title || "";
    hydroTaskState.text = text || "";
    hydroTaskState.kind = options.kind || hydroTaskState.kind || "hydro";
    if (Number.isFinite(options.progress)) {
      hydroTaskState.progress = Math.max(0, Math.min(1, Number(options.progress)));
      hydroTaskState.progressUpdatedAt = Date.now();
    } else if (!active) {
      hydroTaskState.progress = null;
      hydroTaskState.progressUpdatedAt = 0;
    }
    if (Number.isFinite(options.etaMs)) {
      hydroTaskState.etaMs = Math.max(0, Number(options.etaMs));
      hydroTaskState.etaUpdatedAt = Date.now();
    } else if (!active) {
      hydroTaskState.etaMs = null;
      hydroTaskState.etaUpdatedAt = 0;
    }
    if (active && !wasActive) hydroTaskState.startedAt = Date.now();
    if (!active) {
      hydroTaskState.progress = null;
      hydroTaskState.etaMs = null;
      hydroTaskState.startedAt = 0;
      hydroTaskState.etaUpdatedAt = 0;
      hydroTaskState.progressUpdatedAt = 0;
      hydroTaskState.kind = "hydro";
    }
  }

  function updateHydroProgressUi(snapshot = getActiveHydroSnapshot()) {
    if (!hydroProgress) return;
    let active = false;
    let title = "";
    let text = "";

    if (reportState.isGenerating) {
      active = true;
      title = "Genererer hydro-rapport...";
      text = "Kjører draftscan og stabilitetskurver i aktiv viewer. Spinneren vises mens beregningen deles opp i mindre pass for å holde UI-et responsivt.";
    } else if (snapshot.mode === "viewer-pending") {
      active = true;
      title = hydroTaskState.title || "Regner hydrostatikk fra modellen...";
      text = hydroTaskState.text || "Volum, deplasement og GM oppdateres straks mesh-analysen er ferdig. Spinneren betyr bare at beregningen fortsatt går.";
    } else if (hydroTaskState.active) {
      active = true;
      title = hydroTaskState.title || "Oppdaterer hydrostatikk...";
      text = hydroTaskState.text || "Bruker aktiv draft, trim og heel fra modellen.";
    }

    hydroProgress.hidden = !active;
    if (active) {
      if (hydroProgressTitle) hydroProgressTitle.textContent = title;
      const liveProgress = getAnimatedHydroProgress();
      const liveEtaMs = getLiveEtaMs();
      const progressLabel = Number.isFinite(liveProgress)
        ? ` ${Math.round(liveProgress * 100)}% ferdig.`
        : "";
      const etaLabel = Number.isFinite(liveEtaMs)
        ? formatEtaMs(liveEtaMs)
        : getHydroEtaLabel(reportState.isGenerating ? "report" : hydroTaskState.kind || "hydro", snapshot);
      if (hydroProgressText) hydroProgressText.textContent = `${text}${progressLabel} ${etaLabel}.`.trim();
      if (hydroProgressBar) {
        if (Number.isFinite(liveProgress)) {
          hydroProgressBar.style.animation = "none";
          hydroProgressBar.style.inset = "0 auto 0 0";
          hydroProgressBar.style.width = `${Math.max(8, Math.min(100, liveProgress * 100))}%`;
          hydroProgressBar.style.transform = "none";
        } else {
          hydroProgressBar.style.removeProperty("width");
          hydroProgressBar.style.removeProperty("inset");
          hydroProgressBar.style.removeProperty("transform");
          hydroProgressBar.style.removeProperty("animation");
        }
      }
    } else if (hydroProgressBar) {
      hydroProgressBar.style.removeProperty("width");
      hydroProgressBar.style.removeProperty("inset");
      hydroProgressBar.style.removeProperty("transform");
      hydroProgressBar.style.removeProperty("animation");
    }
  }

  function hasResolvedViewerHydro(hydro) {
    return !!hydro?.supported && (
      hydro.hasHydroSolution === true ||
      Number.isFinite(hydro?.submergedVolume) ||
      Number.isFinite(hydro?.displacementTonnes)
    );
  }

  function getDraftMetersFromHydro(hydro) {
    if (!hydro) return null;
    if (Number.isFinite(hydro.draftMeters)) return hydro.draftMeters;
    const z = safeNumber(hydro.draftZWorld);
    const minZ = safeNumber(hydro.referenceBounds?.min?.z);
    if (Number.isFinite(z) && Number.isFinite(minZ)) return Math.max(0, z - minZ);
    return null;
  }

  function getHydroQualityLabel(value) {
    if (value === "high") return "Hoy";
    if (value === "med") return "Balansert";
    if (value === "low") return "Rask";
    return value || "Standard";
  }

  function getHydroVisibilityLabel(hydro) {
    const labels = [];
    if (hydro?.visibility?.waterline) labels.push("flate");
    if (hydro?.visibility?.waterlineContour) labels.push("kontur");
    if (hydro?.visibility?.markers?.cg || hydro?.visibility?.markers?.cb) labels.push("markorer");
    return labels.length ? labels.join(" + ") : "skjult";
  }

  function computeCurveMetrics(angles = [], values = []) {
    if (!angles.length || !values.length) return null;
    let maxValue = -Infinity;
    let angleAtMax = null;
    let avs = null;
    for (let i = 0; i < angles.length; i++) {
      const value = values[i];
      if (!Number.isFinite(value)) continue;
      if (value > maxValue) {
        maxValue = value;
        angleAtMax = angles[i];
      }
      if (avs == null && angles[i] > 0 && value < 0) avs = angles[i];
    }
    const areaBetween = (fromDeg, toDeg) => {
      let total = 0;
      for (let i = 0; i < angles.length - 1; i++) {
        const x0 = angles[i];
        const x1 = angles[i + 1];
        const y0 = values[i];
        const y1 = values[i + 1];
        if (!Number.isFinite(y0) || !Number.isFinite(y1)) continue;
        if (x0 < fromDeg || x1 > toDeg) continue;
        total += 0.5 * (y0 + y1) * (x1 - x0);
      }
      return total;
    };
    const maxAngle = Math.max(...angles);
    return {
      maxGZ: Number.isFinite(maxValue) ? maxValue : null,
      angleAtMaxGZ: angleAtMax,
      avs,
      area_0_30: areaBetween(0, 30),
      area_0_40: areaBetween(0, 40),
      area_0_max: areaBetween(0, maxAngle),
    };
  }

  function buildHydroEstimateFromBbox() {
    const bbox = analysisState.bbox;
    if (!bbox) return null;

    const scale = unitScaleToMeters(analysisState.units);
    const length = Math.abs((bbox.maxX - bbox.minX) * scale);
    const beam = Math.abs((bbox.maxY - bbox.minY) * scale);
    const depth = Math.abs((bbox.maxZ - bbox.minZ) * scale);
    const minZ = bbox.minZ * scale;

    const rhoWater = clampNumber(inpRhoWater?.value, 900, 1100, 1025);
    const rhoMat = clampNumber(inpRhoMat?.value, 100, 50000, 7850);
    const cb = clampNumber(inpCb?.value, 0.1, 1, 0.6);
    const thicknessMm = Math.max(0, safeNumber(inpThicknessMm?.value) || 0);
    const thicknessM = thicknessMm / 1000;

    const typedDraftRaw = safeNumber(inpHydroDraft?.value);
    const draftZWorldMeters = Number.isFinite(typedDraftRaw)
      ? typedDraftRaw * scale
      : 0;
    const draftMeters = Math.max(0, Math.min(depth, draftZWorldMeters - minZ));
    const draftFraction = depth > 0 ? Math.max(0, Math.min(1, draftMeters / depth)) : 0;

    const displacedVolume = length * beam * draftMeters * cb;
    const displacementTonnes = displacedVolume * rhoWater / 1000;
    const waterplaneArea = length * beam * Math.max(0.58, Math.min(0.98, cb + 0.18));
    const kb = draftMeters > 0 ? minZ + draftMeters * 0.53 : null;
    const bmRoll = draftMeters > 0 && displacedVolume > 0 ? (length * (beam ** 3) / 12) / displacedVolume : null;
    const bmPitch = draftMeters > 0 && displacedVolume > 0 ? (beam * (length ** 3) / 12) / displacedVolume : null;

    const viewerMass = getViewerMassProperties();
    const centroidLocal = analysisState.viewerAnalysis?.centroidLocal;
    const solidVolumeM3 = Number.isFinite(viewerMass?.totalVolumeM3)
      ? viewerMass.totalVolumeM3
      : Number.isFinite(analysisState.solidVolumeM3)
        ? analysisState.solidVolumeM3
        : null;
    const shellAreaApprox = 2 * (length * beam + length * depth + beam * depth) * 0.72;
    const shellVolume = thicknessM > 0 ? shellAreaApprox * thicknessM : null;
    const fallbackMaterialMassTonnes = Number.isFinite(shellVolume)
      ? shellVolume * rhoMat / 1000
      : solidVolumeM3 && solidVolumeM3 > 0
        ? solidVolumeM3 * rhoMat / 1000
        : null;
    const materialMassTonnes = Number.isFinite(viewerMass?.totalMassTonnes)
      ? viewerMass.totalMassTonnes
      : fallbackMaterialMassTonnes;
    const viewerCg = viewerMass?.centerOfMassWorld || viewerMass?.centerOfMassLocal || null;
    const bboxCenterZ = Number.isFinite(bbox?.minZ) && Number.isFinite(bbox?.maxZ)
      ? ((bbox.minZ + bbox.maxZ) * 0.5) * scale
      : null;
    const centroidFallbackZ = centroidLocal && Number.isFinite(centroidLocal.z)
      ? centroidLocal.z * scale
      : null;
    const kg = Number.isFinite(viewerMass?.kgWorld)
      ? viewerMass.kgWorld
      : viewerCg && Number.isFinite(viewerCg.z)
        ? viewerCg.z
        : Number.isFinite(centroidFallbackZ)
          ? centroidFallbackZ
          : bboxCenterZ;
    const gmRoll = Number.isFinite(kb) && Number.isFinite(kg) && Number.isFinite(bmRoll) ? kb + bmRoll - kg : null;
    const gmPitch = Number.isFinite(kb) && Number.isFinite(kg) && Number.isFinite(bmPitch) ? kb + bmPitch - kg : null;
    const cg = viewerCg && Number.isFinite(viewerCg.x) && Number.isFinite(viewerCg.y) && Number.isFinite(viewerCg.z)
      ? { x: viewerCg.x, y: viewerCg.y, z: viewerCg.z }
      : centroidLocal && Number.isFinite(centroidLocal.x) && Number.isFinite(centroidLocal.y) && Number.isFinite(centroidLocal.z)
        ? { x: centroidLocal.x * scale, y: centroidLocal.y * scale, z: centroidLocal.z * scale }
        : { x: 0, y: 0, z: Number.isFinite(kg) ? kg : minZ + depth * 0.55 };

    const notes = [];
    if (!Number.isFinite(typedDraftRaw)) notes.push("Draft faller tilbake til world Z = 0 til viewer er synket.");
    if (getActiveStepCandidate()) notes.push("STEP-kandidat brukes som material-/enhetshint der det finnes.");
    if (Number.isFinite(viewerMass?.totalMassTonnes)) {
      notes.push("Masse/CG er kombinert fra komponentmesh og materialtetthet.");
    } else if (!solidVolumeM3) {
      notes.push("Volum bygger pa blokkkoeffisient og bbox, ikke meshintegrasjon.");
    }

    return {
      supported: true,
      isEstimate: true,
      source: "Sidebar-estimat",
      geometrySource: analysisState.geometrySource || analysisState.source || "Ingen geometri",
      units: "m",
      referenceBounds: {
        min: { x: bbox.minX * scale, y: bbox.minY * scale, z: bbox.minZ * scale },
        max: { x: bbox.maxX * scale, y: bbox.maxY * scale, z: bbox.maxZ * scale },
      },
      length,
      beam,
      depth,
      draftZWorld: draftZWorldMeters,
      draftMeters,
      draftFraction,
      submergedVolume: displacedVolume,
      displacementTonnes,
      modelMassTonnes: materialMassTonnes,
      massGapTonnes: Number.isFinite(displacementTonnes) && Number.isFinite(materialMassTonnes)
        ? displacementTonnes - materialMassTonnes
        : null,
      waterDensity: rhoWater,
      materialDensity: Number.isFinite(viewerMass?.densityKgM3) ? viewerMass.densityKgM3 : rhoMat,
      blockCoefficient: cb,
      shellThicknessMm: thicknessMm,
      shellVolume,
      materialMassTonnes,
      wpArea: waterplaneArea,
      kb,
      kg,
      bm: { roll: bmRoll, pitch: bmPitch },
      gm: { roll: gmRoll, pitch: gmPitch },
      cb: Number.isFinite(draftMeters)
        ? { x: 0, y: 0, z: minZ + draftMeters * 0.53 }
        : null,
      cg,
      trimDeg: safeNumber(inpHydroTrim?.value) || 0,
      heelDeg: safeNumber(inpHydroHeel?.value) || 0,
      massProperties: viewerMass || null,
      visibility: {
        waterline: chkHydroWaterline?.checked !== false,
        waterlineContour: chkHydroContour?.checked !== false,
        markers: { cg: chkHydroMarkers?.checked !== false, cb: chkHydroMarkers?.checked !== false },
      },
      notes,
    };
  }

  function getActiveHydroSnapshot() {
    const viewerHydro = getViewerHydroData();
    const estimate = analysisState.latestHydroEstimate || buildHydroEstimateFromBbox();
    if (viewerHydro?.supported) {
      return {
        mode: hasResolvedViewerHydro(viewerHydro) ? "viewer" : "viewer-pending",
        hydro: viewerHydro,
        estimate,
      };
    }
    return { mode: "estimate", hydro: estimate, estimate };
  }

  function normalizeComponentToken(value) {
    return String(value || "").trim().toLowerCase();
  }

  function getMaterialLibraryEntry(slug) {
    return MATERIAL_LIBRARY[String(slug || "").trim().toLowerCase()] || MATERIAL_LIBRARY.custom;
  }

  function clampInfillPercent(value, fallback = 100) {
    const num = safeNumber(value);
    if (!Number.isFinite(num)) return fallback;
    return Math.min(100, Math.max(1, Math.round(num)));
  }

  function formatMaterialOverrideLabel(entry) {
    if (!entry) return "Ingen overstyring";
    const profile = getMaterialLibraryEntry(entry.materialSlug);
    const baseLabel = entry.materialLabel || profile.label || "Custom";
    const directMassValue = entry.massKg;
    const directMassPart = entry.massMode === "direct" && Number.isFinite(directMassValue)
      ? ` | ${Number(directMassValue).toFixed(directMassValue >= 10 ? 2 : 3)} kg direkte${entry.massDistribution === "volume" ? " (volumfordelt)" : ""}`
      : "";
    const infillPart = entry.supportsInfill && Number.isFinite(entry.infillPercent) && Number(entry.infillPercent) < 100
      ? ` ${Math.round(entry.infillPercent)}% infill`
      : "";
    const densityPart = Number.isFinite(entry.densityKgM3)
      ? ` · ${Math.round(entry.densityKgM3)} kg/m^3`
      : "";
    return `${baseLabel}${infillPart}${directMassPart}${densityPart}`;
  }

  function getMaterialOverrideStorageKey() {
    return `${MATERIAL_OVERRIDE_STORAGE_PREFIX}:${cleanUrlPath(decodedFile)}`;
  }

  function getLegacyMaterialOverrideStorageKeys() {
    try {
      if (!window.localStorage) return [];
      const suffix = `:${cleanUrlPath(decodedFile)}`;
      const keys = [];
      for (let index = 0; index < window.localStorage.length; index++) {
        const key = window.localStorage.key(index);
        if (!key || key === getMaterialOverrideStorageKey()) continue;
        if (!key.endsWith(suffix)) continue;
        if (!key.startsWith("fusionMaterialOverrides.")) continue;
        keys.push(key);
      }
      return keys.sort();
    } catch {
      return [];
    }
  }

  function clearLegacyMaterialOverrideStorageKeys() {
    try {
      if (!window.localStorage) return;
      getLegacyMaterialOverrideStorageKeys().forEach((key) => {
        try {
          window.localStorage.removeItem(key);
        } catch {}
      });
    } catch {}
  }

  function normalizeStoredMaterialOverride(entry) {
    if (!entry || typeof entry !== "object") return null;
    const profile = getMaterialLibraryEntry(entry.materialSlug || "custom");
    const supportsInfill = entry.supportsInfill !== false && profile.supportsInfill !== false;
    const baseDensity = clampNumber(entry.baseDensityKgM3 ?? entry.densityKgM3, 50, 50000, profile.density);
    const density = clampNumber(entry.densityKgM3 ?? baseDensity, 50, 50000, baseDensity);
    const infillPercent = supportsInfill ? clampInfillPercent(entry.infillPercent, 100) : 100;
    const massKg = safeNumber(entry.massKg);
    const groupMassKg = safeNumber(entry.groupMassKg);
    const directMassActive = String(entry.massMode || "density") === "direct"
      && (Number.isFinite(massKg) || Number.isFinite(groupMassKg));
    return {
      materialSlug: profile.slug,
      materialLabel: String(entry.materialLabel || profile.label || "Custom"),
      baseDensityKgM3: baseDensity,
      densityKgM3: density,
      infillPercent,
      supportsInfill,
      massMode: directMassActive ? "direct" : "density",
      massKg: Number.isFinite(massKg) ? massKg : null,
      groupMassKg: Number.isFinite(groupMassKg) ? groupMassKg : null,
      massDistribution: String(entry.massDistribution || "").trim() || null,
      source: String(entry.source || "").trim() || null,
      sourceLabel: String(entry.sourceLabel || "").trim() || "Manuell overstyring",
      note: String(entry.note || "").trim(),
    };
  }

  function saveMaterialOverrideState() {
    try {
      if (!window.localStorage) return;
      if (!componentMaterialOverrides.size) {
        window.localStorage.removeItem(getMaterialOverrideStorageKey());
        clearLegacyMaterialOverrideStorageKeys();
        return;
      }
      const overrides = {};
      [...componentMaterialOverrides.entries()]
        .sort(([left], [right]) => String(left).localeCompare(String(right), "nb"))
        .forEach(([key, entry]) => {
          const normalizedKey = normalizeComponentToken(key);
          const normalizedEntry = normalizeStoredMaterialOverride(entry);
          if (normalizedKey && normalizedEntry) overrides[normalizedKey] = normalizedEntry;
        });
      if (!Object.keys(overrides).length) {
        window.localStorage.removeItem(getMaterialOverrideStorageKey());
        clearLegacyMaterialOverrideStorageKeys();
        return;
      }
      window.localStorage.setItem(getMaterialOverrideStorageKey(), JSON.stringify({
        v: MATERIAL_OVERRIDE_STORAGE_VERSION,
        file: cleanUrlPath(decodedFile),
        savedAt: Date.now(),
        overrides,
      }));
      clearLegacyMaterialOverrideStorageKeys();
    } catch {}
  }

  function restoreMaterialOverrideState() {
    try {
      if (!window.localStorage) return false;
      const storageKey = getMaterialOverrideStorageKey();
      let raw = window.localStorage.getItem(storageKey);
      let migrated = false;
      if (!raw) {
        for (const legacyKey of getLegacyMaterialOverrideStorageKeys()) {
          raw = window.localStorage.getItem(legacyKey);
          if (raw) {
            migrated = true;
            break;
          }
        }
      }
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      const overrides = parsed?.overrides;
      if (!overrides || typeof overrides !== "object") return false;
      componentMaterialOverrides.clear();
      Object.entries(overrides).forEach(([key, entry]) => {
        const normalizedKey = normalizeComponentToken(key);
        const normalizedEntry = normalizeStoredMaterialOverride(entry);
        if (normalizedKey && normalizedEntry) componentMaterialOverrides.set(normalizedKey, normalizedEntry);
      });
      if (componentMaterialOverrides.size && migrated) saveMaterialOverrideState();
      return componentMaterialOverrides.size > 0;
    } catch {
      return false;
    }
  }

  function buildMaterialSelectOptions(selectedSlug = "custom") {
    return Object.values(MATERIAL_LIBRARY).map((entry) => `
      <option value="${escapeAttr(entry.slug)}" ${entry.slug === selectedSlug ? "selected" : ""}>${escapeHtml(entry.label)}</option>
    `).join("");
  }

  function createMaterialOverrideFromInput({ materialSlug, densityKgM3, infillPercent, scope = "item" } = {}) {
    const profile = getMaterialLibraryEntry(materialSlug);
    const baseDensity = clampNumber(densityKgM3, 50, 50000, profile.density);
    const supportsInfill = profile.supportsInfill !== false;
    const resolvedInfill = supportsInfill ? clampInfillPercent(infillPercent, 100) : 100;
    const effectiveDensity = supportsInfill
      ? Math.max(1, Math.round(baseDensity * (resolvedInfill / 100)))
      : Math.round(baseDensity);
    const scopeLabel = scope === "family" ? "familieoverstyring" : scope === "group" ? "gruppeoverstyring" : "komponentoverstyring";
    return {
      materialSlug: profile.slug,
      materialLabel: profile.label,
      baseDensityKgM3: Math.round(baseDensity),
      infillPercent: resolvedInfill,
      supportsInfill,
      densityKgM3: effectiveDensity,
      source: `override-${scope}`,
      sourceLabel: `Manuell ${scopeLabel}`,
      note: supportsInfill
        ? `${profile.label} med ${resolvedInfill}% infill, beregnet effektiv tetthet ${effectiveDensity} kg/m^3.`
        : `${profile.label} med massiv tetthet ${effectiveDensity} kg/m^3.`,
    };
  }

  function buildScopedMaterialOverrides(keys, { materialSlug, densityKgM3, infillPercent, directMassKg, scope = "item" } = {}) {
    const resolvedKeys = [...new Set((keys || []).map((key) => String(key || "").trim()).filter(Boolean))];
    if (!resolvedKeys.length) return [];
    const baseOverride = createMaterialOverrideFromInput({ materialSlug, densityKgM3, infillPercent, scope });
    const directMass = safeNumber(directMassKg);
    if (!Number.isFinite(directMass) || directMass <= 0) {
      return resolvedKeys.map((key) => ({
        key,
        override: {
          ...baseOverride,
          massMode: "density",
          massKg: null,
          groupMassKg: null,
          massDistribution: null,
        },
      }));
    }

    const volumeEntries = resolvedKeys.map((key) => {
      const massInfo = getMassComponentInfo({ key }) || {};
      return {
        key,
        volumeM3: safeNumber(massInfo.volumeM3),
      };
    });
    const totalVolume = volumeEntries.reduce((sum, entry) => sum + (Number.isFinite(entry.volumeM3) && entry.volumeM3 > 0 ? entry.volumeM3 : 0), 0);
    const useVolumeDistribution = totalVolume > 1e-9 && volumeEntries.every((entry) => Number.isFinite(entry.volumeM3) && entry.volumeM3 > 0);
    const perPartFallback = directMass / resolvedKeys.length;
    const scopeLabel = scope === "family" ? "familie" : scope === "group" ? "gruppe" : "komponent";
    return volumeEntries.map((entry) => {
      const allocatedMass = useVolumeDistribution
        ? directMass * (entry.volumeM3 / totalVolume)
        : perPartFallback;
      const derivedDensity = Number.isFinite(entry.volumeM3) && entry.volumeM3 > 1e-9
        ? allocatedMass / entry.volumeM3
        : baseOverride.densityKgM3;
      return {
        key: entry.key,
        override: {
          ...baseOverride,
          massMode: "direct",
          massKg: allocatedMass,
          groupMassKg: directMass,
          massDistribution: useVolumeDistribution ? "volume" : "equal",
          densityKgM3: Number.isFinite(derivedDensity) && derivedDensity > 0 ? derivedDensity : baseOverride.densityKgM3,
          sourceLabel: `Manuell ${scopeLabel} (direkte masse)`,
          note: scope === "item"
            ? `${baseOverride.materialLabel} med direkte masse ${allocatedMass.toFixed(allocatedMass >= 10 ? 2 : 3)} kg. Volum brukes til massesenter og treghetsmomenter.`
            : `${baseOverride.materialLabel} med total masse ${directMass.toFixed(directMass >= 10 ? 2 : 3)} kg fordelt ${useVolumeDistribution ? "etter komponentvolum" : "likt mellom delene"} i ${scopeLabel}.`,
        },
      };
    });
  }

  function getComponentMaterialOverride(key) {
    return componentMaterialOverrides.get(normalizeComponentToken(key)) || null;
  }

  function setComponentMaterialOverride(key, override) {
    const token = normalizeComponentToken(key);
    if (!token) return;
    if (override) componentMaterialOverrides.set(token, override);
    else componentMaterialOverrides.delete(token);
  }

  function setComponentMaterialOverrides(keys, override) {
    (keys || []).forEach((key) => setComponentMaterialOverride(key, override));
  }

  function buildComponentDensityOverridePayload() {
    const payload = {};
    [...componentMaterialOverrides.entries()]
      .sort(([left], [right]) => String(left).localeCompare(String(right), "nb"))
      .forEach(([key, entry]) => {
        if (!entry || !Number.isFinite(entry.densityKgM3)) return;
        payload[key] = {
          densityKgM3: Number(entry.densityKgM3),
          materialSlug: entry.materialSlug || "custom",
          materialLabel: entry.materialLabel || getMaterialLibraryEntry(entry.materialSlug).label,
          baseDensityKgM3: Number.isFinite(entry.baseDensityKgM3) ? Number(entry.baseDensityKgM3) : Number(entry.densityKgM3),
          infillPercent: Number.isFinite(entry.infillPercent) ? Number(entry.infillPercent) : 100,
          supportsInfill: entry.supportsInfill !== false,
          massMode: entry.massMode || "density",
          massKg: Number.isFinite(entry.massKg) ? Number(entry.massKg) : null,
          groupMassKg: Number.isFinite(entry.groupMassKg) ? Number(entry.groupMassKg) : null,
          massDistribution: entry.massDistribution || null,
          source: entry.source || "override-item",
          sourceLabel: entry.sourceLabel || "Manuell overstyring",
          note: entry.note || "",
        };
      });
    return payload;
  }

  function getMassComponentInfo(item) {
    const components = getViewerMassProperties()?.components || [];
    const aliases = [
      item?.key,
      item?.label,
      item?.subtitle,
    ].map(normalizeComponentToken).filter(Boolean);
    for (const entry of components) {
      const candidateAliases = [
        entry?.key,
        entry?.name,
        entry?.nodePath,
        entry?.sourceName,
      ].map(normalizeComponentToken).filter(Boolean);
      if (candidateAliases.some((alias) => aliases.includes(alias))) return entry;
    }
    return null;
  }

  function getMaterialEditorSnapshot(keys = []) {
    const normalizedKeys = [...new Set((keys || []).map(normalizeComponentToken).filter(Boolean))];
    if (!normalizedKeys.length) {
      const fallbackProfile = getMaterialLibraryEntry(selMaterial?.value || "steel");
      return {
        state: "default",
        override: createMaterialOverrideFromInput({
          materialSlug: fallbackProfile.slug,
          densityKgM3: clampNumber(inpRhoMat?.value, 50, 50000, fallbackProfile.density),
          infillPercent: 100,
          scope: "item",
        }),
      };
    }
    const overrides = normalizedKeys.map((key) => getComponentMaterialOverride(key)).filter(Boolean);
    if (!overrides.length) {
      const fallbackProfile = getMaterialLibraryEntry(selMaterial?.value || "steel");
      return {
        state: "default",
        override: createMaterialOverrideFromInput({
          materialSlug: fallbackProfile.slug,
          densityKgM3: clampNumber(inpRhoMat?.value, 50, 50000, fallbackProfile.density),
          infillPercent: fallbackProfile.supportsInfill ? 100 : 100,
          scope: "item",
        }),
      };
    }
    const signature = JSON.stringify({
      materialSlug: overrides[0].materialSlug,
      baseDensityKgM3: overrides[0].baseDensityKgM3,
      infillPercent: overrides[0].infillPercent,
      densityKgM3: overrides[0].densityKgM3,
      supportsInfill: overrides[0].supportsInfill !== false,
      massMode: overrides[0].massMode || "density",
      groupMassKg: Number.isFinite(overrides[0].groupMassKg) ? overrides[0].groupMassKg : null,
      massDistribution: overrides[0].massDistribution || null,
    });
    const allSame = overrides.length === normalizedKeys.length && overrides.every((entry) => JSON.stringify({
      materialSlug: entry.materialSlug,
      baseDensityKgM3: entry.baseDensityKgM3,
      infillPercent: entry.infillPercent,
      densityKgM3: entry.densityKgM3,
      supportsInfill: entry.supportsInfill !== false,
      massMode: entry.massMode || "density",
      groupMassKg: Number.isFinite(entry.groupMassKg) ? entry.groupMassKg : null,
      massDistribution: entry.massDistribution || null,
    }) === signature);
    return {
      state: allSame ? "uniform" : "mixed",
      override: overrides[0],
    };
  }

  function renderMaterialEditor(scope, token, keys) {
    const snapshot = getMaterialEditorSnapshot(keys);
    const override = snapshot.override;
    const editorToken = escapeAttr(token);
    const title = scope === "family" ? "Materiale / vekt for familie" : scope === "group" ? "Materiale / vekt for gruppe" : "Materiale / vekt for del";
    const summaryOverride = snapshot.state === "uniform" && override?.massMode === "direct" && keys.length > 1 && Number.isFinite(override?.groupMassKg)
      ? { ...override, massKg: override.groupMassKg }
      : override;
    const summaryText = snapshot.state === "mixed"
      ? "Varierende overstyringer i denne samlingen"
      : snapshot.state === "uniform"
        ? formatMaterialOverrideLabel(summaryOverride)
        : "Ingen manuell overstyring. Bruker modellhint eller global tetthet.";
    return `
      <details class="comp-material-editor" data-editor-scope="${escapeAttr(scope)}" data-editor-token="${editorToken}">
        <summary>${escapeHtml(title)}<span class="comp-material-summary">${escapeHtml(summaryText)}</span></summary>
        <div class="comp-material-grid">
          <label class="comp-material-field">
            <span>Materiale</span>
            <select data-material-select="1">
              ${buildMaterialSelectOptions(override?.materialSlug || "custom")}
            </select>
          </label>
          <label class="comp-material-field">
            <span>Basis-tetthet</span>
            <input data-density-input="1" type="number" min="50" max="50000" step="1" value="${escapeAttr(String(Math.round(override?.baseDensityKgM3 || override?.densityKgM3 || clampNumber(inpRhoMat?.value, 50, 50000, 7850) || 7850)))}">
          </label>
          <label class="comp-material-field">
            <span>Infill %</span>
            <input data-infill-input="1" type="number" min="1" max="100" step="1" value="${escapeAttr(String(clampInfillPercent(override?.infillPercent, 100)))}" ${override?.supportsInfill === false ? "disabled" : ""}>
          </label>
          <label class="comp-material-field">
            <span>Direkte vekt (kg, valgfri)</span>
            <input data-mass-input="1" type="number" min="0" max="50000" step="0.01" placeholder="Tom = bruk tetthet/infill" value="${escapeAttr(Number.isFinite(override?.groupMassKg) ? String(override.groupMassKg) : Number.isFinite(override?.massKg) && override?.massMode === "direct" ? String(override.massKg) : "")}">
          </label>
          <div class="comp-material-actions">
            <button class="btn" data-apply-material="${editorToken}" data-apply-scope="${escapeAttr(scope)}" type="button">Bruk</button>
            <button class="btn" data-clear-material="${editorToken}" data-clear-scope="${escapeAttr(scope)}" type="button">Nullstill</button>
          </div>
        </div>
      </details>
    `;
  }

  function mergeComponentText(left, right) {
    const a = String(left || "").trim();
    const b = String(right || "").trim();
    if (!a) return b;
    if (!b) return a;
    return normalizeComponentToken(a) === normalizeComponentToken(b) ? a : `${a} | ${b}`;
  }

  function findMetadataMatchForViewerItem(item, metadataItems = []) {
    const wantedKey = normalizeComponentToken(item?.key);
    const wantedLabel = normalizeComponentToken(item?.label);
    const wantedFamily = buildFamilySignature(item?.label);
    return metadataItems.find((candidate) => {
      const candidateKey = normalizeComponentToken(candidate?.key);
      const candidateLabel = normalizeComponentToken(candidate?.label);
      if (wantedKey && candidateKey === wantedKey) return true;
      if (wantedLabel && candidateLabel === wantedLabel) return true;
      return wantedFamily && buildFamilySignature(candidate?.label) === wantedFamily;
    }) || null;
  }

  function buildEffectiveComponentItems() {
    if (!componentCatalog.viewerItems.length) return componentCatalog.metadataItems.slice();
    return componentCatalog.viewerItems.map((item) => {
      const meta = findMetadataMatchForViewerItem(item, componentCatalog.metadataItems);
      if (!meta) return item;
      const subtitle = mergeComponentText(item.subtitle, meta.subtitle);
      const description = item.description || meta.description || "";
      return {
        ...item,
        subtitle,
        description,
        search: [
          item.search,
          meta.search,
          subtitle,
          description,
        ].filter(Boolean).join(" ").toLowerCase(),
      };
    });
  }

  function normalizeFamilyToken(value) {
    return String(value || "")
      .replace(/\s*\((\d+)\)\s*$/i, "")
      .replace(/\s*copy\s*\d+$/i, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function tokenizeComponentLabel(value) {
    return String(value || "")
      .replace(/\([^)]*\)/g, " ")
      .replace(/[_/\\|]+/g, " ")
      .replace(/[^a-zA-Z0-9.+-]+/g, " ")
      .toLowerCase()
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean)
      .filter((token) => !/^(copy|part|delen?|component|mesh|solid|group|gruppe|family|instance|inst|assy|assembly)$/.test(token))
      .filter((token) => !/^(cw|ccw|lh|rh|port|starboard|left|right|ps|sb|bb|stb)$/.test(token))
      .filter((token) => !/^\d+$/.test(token));
  }

  function buildFamilySignature(label) {
    const tokens = tokenizeComponentLabel(label);
    if (!tokens.length) return normalizeFamilyToken(label);
    return tokens.slice(0, Math.min(6, tokens.length)).join(" ");
  }

  function titleCaseToken(token) {
    if (!token) return "";
    if (/[0-9]/.test(token)) return token.toUpperCase();
    return token.charAt(0).toUpperCase() + token.slice(1);
  }

  function familyLabelFromItems(items) {
    const tokenLists = (items || []).map((item) => tokenizeComponentLabel(item.label)).filter((tokens) => tokens.length);
    if (!tokenLists.length) return String(items?.[0]?.label || "Komponent");
    const limit = Math.min(...tokenLists.map((tokens) => tokens.length), 6);
    const common = [];
    for (let i = 0; i < limit; i++) {
      const token = tokenLists[0][i];
      if (!token) break;
      if (tokenLists.every((tokens) => tokens[i] === token)) common.push(token);
      else break;
    }
    if (!common.length) return String(items?.[0]?.label || "Komponent");
    return common.map(titleCaseToken).join(" ");
  }

  function getItemCenter(item) {
    if (!item?.center) return null;
    const x = Number(item.center.x);
    const y = Number(item.center.y);
    const z = Number(item.center.z);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;
    return { x, y, z };
  }

  function getItemSizeMax(item) {
    if (!item?.size) return 0;
    const sx = Number(item.size.x);
    const sy = Number(item.size.y);
    const sz = Number(item.size.z);
    return Math.max(
      Number.isFinite(sx) ? Math.abs(sx) : 0,
      Number.isFinite(sy) ? Math.abs(sy) : 0,
      Number.isFinite(sz) ? Math.abs(sz) : 0,
      0
    );
  }

  function distanceBetweenCenters(a, b) {
    const ac = getItemCenter(a);
    const bc = getItemCenter(b);
    if (!ac || !bc) return Infinity;
    const dx = ac.x - bc.x;
    const dy = ac.y - bc.y;
    const dz = ac.z - bc.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  function clusterFamilyByLocation(items) {
    const centered = (items || []).filter((item) => getItemCenter(item));
    if (centered.length < 2) return [{ items: items.slice(), center: null }];

    const sizeValues = centered.map(getItemSizeMax).filter((value) => value > 0).sort((a, b) => a - b);
    const medianSize = sizeValues.length ? sizeValues[Math.floor(sizeValues.length / 2)] : 0;
    const nearestDistances = centered
      .map((item, index) => {
        let best = Infinity;
        for (let i = 0; i < centered.length; i++) {
          if (i === index) continue;
          best = Math.min(best, distanceBetweenCenters(item, centered[i]));
        }
        return Number.isFinite(best) ? best : 0;
      })
      .filter((value) => value > 0)
      .sort((a, b) => a - b);
    const medianNearest = nearestDistances.length ? nearestDistances[Math.floor(nearestDistances.length / 2)] : 0;

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    centered.forEach((item) => {
      const center = getItemCenter(item);
      if (!center) return;
      minX = Math.min(minX, center.x); minY = Math.min(minY, center.y); minZ = Math.min(minZ, center.z);
      maxX = Math.max(maxX, center.x); maxY = Math.max(maxY, center.y); maxZ = Math.max(maxZ, center.z);
    });
    const familyMaxDim = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 0);
    const threshold = Math.max(
      medianSize * 3.2,
      medianNearest > 0 ? medianNearest * 1.7 : 0,
      Math.min(familyMaxDim * 0.08, familyMaxDim > 0 ? familyMaxDim * 0.25 : 0),
      0.06
    );

    const clusters = [];
    const visited = new Set();
    for (let i = 0; i < centered.length; i++) {
      if (visited.has(i)) continue;
      const queue = [i];
      visited.add(i);
      const members = [];

      while (queue.length) {
        const idx = queue.shift();
        const current = centered[idx];
        members.push(current);

        for (let j = 0; j < centered.length; j++) {
          if (visited.has(j)) continue;
          const candidate = centered[j];
          const distance = distanceBetweenCenters(current, candidate);
          const pairThreshold = Math.max(
            threshold,
            Math.max(getItemSizeMax(current), getItemSizeMax(candidate)) * 3.4
          );
          if (distance <= pairThreshold) {
            visited.add(j);
            queue.push(j);
          }
        }
      }

      const clusterCenter = members.reduce((acc, item) => {
        const center = getItemCenter(item);
        if (!center) return acc;
        acc.x += center.x;
        acc.y += center.y;
        acc.z += center.z;
        acc.count += 1;
        return acc;
      }, { x: 0, y: 0, z: 0, count: 0 });

      clusters.push({
        items: members,
        center: clusterCenter.count
          ? {
              x: clusterCenter.x / clusterCenter.count,
              y: clusterCenter.y / clusterCenter.count,
              z: clusterCenter.z / clusterCenter.count,
            }
          : null,
      });
    }

    const withoutCenter = (items || []).filter((item) => !getItemCenter(item));
    if (withoutCenter.length) {
      if (clusters.length) clusters[0].items.push(...withoutCenter);
      else clusters.push({ items: withoutCenter, center: null });
    }

    return clusters.sort((a, b) => {
      const ac = a.center || { x: 0, y: 0, z: 0 };
      const bc = b.center || { x: 0, y: 0, z: 0 };
      return bc.x - ac.x || bc.y - ac.y || bc.z - ac.z;
    });
  }

  function findComponentItem(token) {
    const wanted = normalizeComponentToken(token);
    if (!wanted) return null;
    return componentState.items.find((item) => {
      const itemKey = normalizeComponentToken(item?.key);
      const itemLabel = normalizeComponentToken(item?.label);
      return itemKey === wanted || itemLabel === wanted;
    }) || null;
  }

  function syncSelectionSetToCurrentItems(setRef) {
    if (!setRef?.size) return;
    const next = new Set();
    setRef.forEach((token) => {
      const match = findComponentItem(token);
      next.add(match?.key || token);
    });
    setRef.clear();
    next.forEach((token) => setRef.add(token));
  }

  function getComponentDisplayName(token) {
    return findComponentItem(token)?.label || String(token || "").trim();
  }

  function renderChosenMuted() {
    const total = componentState.items.length;
    const chosenCount = [...chosenSet].filter((token) => findComponentItem(token)).length;
    const mutedCount = [...mutedSet].filter((token) => findComponentItem(token)).length;
    const visibleCount = Math.max(0, total - mutedCount);
    const chosen = [...chosenSet].slice(0, 8).map(getComponentDisplayName).join(", ") || "ingen valgt";
    const muted = [...mutedSet].slice(0, 8).map(getComponentDisplayName).join(", ") || "ingen dempet";
    chosenMuted.innerHTML = `
      <div class="component-summary">
        <span class="status-chip visible"><strong>${visibleCount}</strong> synlige</span>
        <span class="status-chip chosen"><strong>${chosenCount}</strong> valgt</span>
        <span class="status-chip muted"><strong>${mutedCount}</strong> dempet</span>
        <span class="muted chosen-muted-detail">Valgt: ${escapeHtml(chosen)}. Dempet: ${escapeHtml(muted)}.</span>
      </div>
    `;
    postComponentStateToViewer();
    updateSelectionActionUi();
    postExplodeScopeToViewer();
  }

  function getComponentState(item) {
    if (mutedSet.has(item.key)) return "muted";
    if (chosenSet.has(item.key)) return "chosen";
    return "visible";
  }

  function getGroupState(keys) {
    if (!Array.isArray(keys) || !keys.length) return "visible";
    const chosenCount = keys.filter((key) => chosenSet.has(key)).length;
    const mutedCount = keys.filter((key) => mutedSet.has(key)).length;
    if (mutedCount === keys.length) return "muted";
    if (chosenCount === keys.length) return "chosen";
    if (chosenCount > 0 || mutedCount > 0) return "mixed";
    return "visible";
  }

  function getGroupStateLabel(state) {
    if (state === "chosen") return "Markert";
    if (state === "muted") return "Dempet";
    if (state === "mixed") return "Delvis";
    return "Vises";
  }

  function getMaterialStatusTextForKeys(keys = [], fallbackItem = null) {
    const snapshot = getMaterialEditorSnapshot(keys);
    if (snapshot.state === "uniform") {
      const override = snapshot.override;
      const labelOverride = override?.massMode === "direct" && keys.length > 1 && Number.isFinite(override?.groupMassKg)
        ? { ...override, massKg: override.groupMassKg }
        : override;
      return override?.sourceLabel
        ? `${formatMaterialOverrideLabel(override)} · ${override.sourceLabel}`
        : formatMaterialOverrideLabel(labelOverride);
    }
    if (snapshot.state === "mixed") {
      return "Varierende materiale/infill-overstyringer";
    }
    const massInfo = fallbackItem ? getMassComponentInfo(fallbackItem) : null;
    if (massInfo?.materialLabel) {
      const infillPart = Number.isFinite(massInfo.infillPercent) && Number(massInfo.infillPercent) < 100
        ? ` ${Math.round(massInfo.infillPercent)}% infill`
        : "";
      const directMassValue = keys.length > 1 && Number.isFinite(massInfo.groupMassKg) ? massInfo.groupMassKg : massInfo.massKg;
      const directMassPart = massInfo.massMode === "direct" && Number.isFinite(directMassValue)
        ? ` · ${Number(directMassValue).toFixed(directMassValue >= 10 ? 2 : 3)} kg direkte`
        : "";
      const densityPart = Number.isFinite(massInfo.densityKgM3) ? ` · ${Math.round(massInfo.densityKgM3)} kg/m^3` : "";
      return `${massInfo.materialLabel}${infillPart}${directMassPart}${densityPart} · ${describeDensitySource(massInfo.densitySource)}`;
    }
    return "Bruker modellhint eller felles tetthet";
  }

  function getCollectionMaterialStatusText(keys = []) {
    const snapshot = getMaterialEditorSnapshot(keys);
    if (snapshot.state !== "uniform") return getMaterialStatusTextForKeys(keys);
    const override = snapshot.override;
    const labelOverride = override?.massMode === "direct" && Number.isFinite(override?.groupMassKg)
      ? { ...override, massKg: override.groupMassKg }
      : override;
    return override?.sourceLabel
      ? `${formatMaterialOverrideLabel(labelOverride)} · ${override.sourceLabel}`
      : formatMaterialOverrideLabel(labelOverride);
  }

  function setChosenForKeys(keys, shouldChoose) {
    (keys || []).forEach((key) => {
      if (!key) return;
      if (shouldChoose) {
        chosenSet.add(key);
        mutedSet.delete(key);
      } else {
        chosenSet.delete(key);
      }
    });
  }

  function setMutedForKeys(keys, shouldMute) {
    (keys || []).forEach((key) => {
      if (!key) return;
      if (shouldMute) {
        mutedSet.add(key);
        chosenSet.delete(key);
      } else {
        mutedSet.delete(key);
      }
    });
  }

  function isGroupExpanded(group, filterValue = "") {
    if (!group) return false;
    if ((group.items || []).length <= 1) return true;
    if (String(filterValue || "").trim()) return true;
    return expandedGroupSet.has(group.key);
  }

  function toggleExpandedGroup(key) {
    if (!key) return;
    if (expandedGroupSet.has(key)) expandedGroupSet.delete(key);
    else expandedGroupSet.add(key);
  }

  function componentIntroText(mode) {
    if (mode === "mesh") return "Komponentlisten er koblet direkte til scenen. Gruppene vises sammenlagt; åpne en gruppe ved behov og bruk gruppeknappene for å markere eller dempe hele gruppen.";
    if (mode === "fusion") return "Komponentnavn er hentet fra Fusion-metadata og vises gruppert etter familier, kopier og nærliggende deler. Åpne en gruppe for detaljdeler.";
    return "Komponentnavn er hentet fra filstruktur eller STEP/IGES-data. Viewer-kobling avhenger av scenegrafen.";
  }

  function buildComponentFamilies(items) {
    const families = new Map();
    items.forEach((item) => {
      const familyKey = buildFamilySignature(item.label) || normalizeFamilyToken(item.label) || item.key;
      if (!families.has(familyKey)) families.set(familyKey, []);
      families.get(familyKey).push(item);
    });

    return [...families.entries()]
      .map(([familyKey, familyItems]) => {
        const familyLabel = familyLabelFromItems(familyItems);
        const clusters = clusterFamilyByLocation(familyItems).map((cluster, clusterIndex) => ({
          key: `${familyKey}::cluster-${clusterIndex + 1}`,
          label: `Gruppe ${clusterIndex + 1}`,
          longLabel: `${familyLabel} · gruppe ${clusterIndex + 1}`,
          familyLabel,
          center: cluster.center || null,
          items: cluster.items.slice().sort((a, b) => a.label.localeCompare(b.label, "nb")),
        }));
        return {
          key: familyKey,
          label: familyLabel,
          familyLabel,
          items: familyItems.slice().sort((a, b) => a.label.localeCompare(b.label, "nb")),
          groups: clusters,
        };
      })
      .sort((a, b) => {
        const sizeDiff = b.items.length - a.items.length;
        if (sizeDiff) return sizeDiff;
        return a.label.localeCompare(b.label, "nb");
      });
  }

  function renderComponentRow(item) {
    const state = getComponentState(item);
    const materialStatus = getMaterialStatusTextForKeys([item.key], item);
    return `
      <li class="comp-row" data-state="${state}">
        <button data-comp="${escapeAttr(item.key)}" class="btn comp-main" type="button">
          <span class="comp-title">${escapeHtml(item.label)}</span>
          ${item.subtitle ? `<span class="comp-sub">${escapeHtml(item.subtitle)}</span>` : ""}
          ${item.description ? `<span class="comp-sub">${escapeHtml(item.description)}</span>` : ""}
          <span class="comp-sub comp-material-status">${escapeHtml(materialStatus)}</span>
        </button>
        <span class="comp-state comp-state-${state}">${state === "chosen" ? "Valgt" : state === "muted" ? "Dempet" : "Vises"}</span>
        <div class="comp-actions">
          <button class="btn comp-toggle ${chosenSet.has(item.key) ? "is-active" : ""}" data-choose="${escapeAttr(item.key)}" type="button">${chosenSet.has(item.key) ? "Valgt" : "Velg"}</button>
          <button class="btn comp-toggle ${mutedSet.has(item.key) ? "is-muted" : ""}" data-mute="${escapeAttr(item.key)}" type="button">${mutedSet.has(item.key) ? "Vis" : "Demp"}</button>
        </div>
        <div class="comp-row-editor">
          ${renderMaterialEditor("item", item.key, [item.key])}
        </div>
      </li>
    `;
  }

  function renderComponentGroup(group, filter, { nested = false } = {}) {
    const keys = group.items.map((item) => item.key);
    const chosenCount = keys.filter((key) => chosenSet.has(key)).length;
    const mutedCount = keys.filter((key) => mutedSet.has(key)).length;
    const visibleCount = group.items.length - mutedCount;
    const groupState = getGroupState(keys);
    const materialStatus = getCollectionMaterialStatusText(keys);
    const allChosen = chosenCount === group.items.length && group.items.length > 0;
    const allMuted = mutedCount === group.items.length && group.items.length > 0;
    const isExpanded = isGroupExpanded(group, filter);
    const canCollapse = group.items.length > 1;
    const expandLabel = !canCollapse
      ? "En del"
      : String(filter || "").trim()
        ? "Detaljer vist"
        : isExpanded
          ? "Skjul deler"
          : `Vis ${group.items.length} deler`;
    const groupItems = group.items.map((item) => renderComponentRow(item)).join("");

    return `
      <section class="comp-group${nested ? " comp-subgroup" : ""}" data-group-state="${groupState}" data-expanded="${isExpanded ? "true" : "false"}">
        <div class="comp-group-head">
          ${canCollapse ? `
            <button
              class="btn comp-group-main ${isExpanded ? "is-open" : ""}"
              data-toggle-group="${escapeAttr(group.key)}"
              type="button"
              ${String(filter || "").trim() ? "disabled" : ""}
              aria-expanded="${isExpanded ? "true" : "false"}"
            >
              <span class="comp-group-chevron" aria-hidden="true">${isExpanded ? "-" : "+"}</span>
              <span class="comp-group-heading">
                <span class="comp-group-title">${escapeHtml(group.label)}</span>
                <span class="comp-group-meta">${group.items.length} deler | ${visibleCount} synlige | ${chosenCount} valgt | ${mutedCount} dempet</span>
              </span>
              <span class="comp-group-expand-label">${escapeHtml(expandLabel)}</span>
            </button>
          ` : `
            <div class="comp-group-main is-static">
              <span class="comp-group-chevron" aria-hidden="true">=</span>
              <span class="comp-group-heading">
                <span class="comp-group-title">${escapeHtml(group.label)}</span>
                <span class="comp-group-meta">${group.items.length} deler | ${visibleCount} synlige | ${chosenCount} valgt | ${mutedCount} dempet</span>
              </span>
              <span class="comp-group-expand-label">${escapeHtml(expandLabel)}</span>
            </div>
          `}
          <div class="comp-group-side">
            <span class="comp-state comp-state-${groupState === "mixed" ? "mixed" : groupState}">${getGroupStateLabel(groupState)}</span>
            <div class="comp-group-actions">
              <button class="btn comp-group-toggle ${allChosen ? "is-active" : ""}" data-choose-group="${escapeAttr(group.key)}" type="button">${allChosen ? "Fjern markering" : "Marker gruppe"}</button>
              <button class="btn comp-group-toggle ${allMuted ? "is-active" : ""}" data-mute-group="${escapeAttr(group.key)}" type="button">${allMuted ? "Vis gruppe" : "Demp gruppe"}</button>
            </div>
          </div>
        </div>
        <div class="comp-group-material">
          <span class="comp-sub comp-material-status">${escapeHtml(materialStatus)}</span>
          ${renderMaterialEditor("group", group.key, keys)}
        </div>
        ${isExpanded
          ? `<ul class="comp-group-list">${groupItems}</ul>`
          : `<div class="comp-group-collapsed-note">${group.items.length} detaljdeler er skjult. Åpne gruppen for å se enkeltdelene.</div>`}
      </section>
    `;
  }

  function renderComponentFamily(family, filter) {
    const keys = family.items.map((item) => item.key);
    const chosenCount = keys.filter((key) => chosenSet.has(key)).length;
    const mutedCount = keys.filter((key) => mutedSet.has(key)).length;
    const visibleCount = family.items.length - mutedCount;
    const familyState = getGroupState(keys);
    const materialStatus = getCollectionMaterialStatusText(keys);
    const allChosen = chosenCount === family.items.length && family.items.length > 0;
    const allMuted = mutedCount === family.items.length && family.items.length > 0;
    const isExpanded = isGroupExpanded(family, filter);
    const canCollapse = family.items.length > 1;
    const hasSubgroups = family.groups.length > 1;
    const expandLabel = !canCollapse
      ? "En del"
      : String(filter || "").trim()
        ? "Detaljer vist"
        : isExpanded
          ? "Skjul familie"
          : hasSubgroups
            ? `Vis ${family.groups.length} grupper`
            : `Vis ${family.items.length} deler`;
    const body = hasSubgroups
      ? `<div class="comp-subgroup-stack">${family.groups.map((group) => renderComponentGroup(group, filter, { nested: true })).join("")}</div>`
      : `<ul class="comp-group-list">${family.items.map((item) => renderComponentRow(item)).join("")}</ul>`;

    return `
      <section class="comp-family" data-group-state="${familyState}" data-expanded="${isExpanded ? "true" : "false"}">
        <div class="comp-family-head">
          ${canCollapse ? `
            <button
              class="btn comp-family-main ${isExpanded ? "is-open" : ""}"
              data-toggle-group="${escapeAttr(family.key)}"
              type="button"
              ${String(filter || "").trim() ? "disabled" : ""}
              aria-expanded="${isExpanded ? "true" : "false"}"
            >
              <span class="comp-group-chevron" aria-hidden="true">${isExpanded ? "-" : "+"}</span>
              <span class="comp-family-heading">
                <span class="comp-family-title">${escapeHtml(family.label)}</span>
                <span class="comp-family-meta">${family.items.length} deler | ${family.groups.length} grupper | ${visibleCount} synlige | ${chosenCount} valgt | ${mutedCount} dempet</span>
              </span>
              <span class="comp-group-expand-label">${escapeHtml(expandLabel)}</span>
            </button>
          ` : `
            <div class="comp-family-main is-static">
              <span class="comp-group-chevron" aria-hidden="true">=</span>
              <span class="comp-family-heading">
                <span class="comp-family-title">${escapeHtml(family.label)}</span>
                <span class="comp-family-meta">${family.items.length} deler | ${visibleCount} synlige | ${chosenCount} valgt | ${mutedCount} dempet</span>
              </span>
              <span class="comp-group-expand-label">${escapeHtml(expandLabel)}</span>
            </div>
          `}
          <div class="comp-family-side">
            <span class="comp-state comp-state-${familyState === "mixed" ? "mixed" : familyState}">${getGroupStateLabel(familyState)}</span>
            <div class="comp-family-actions">
              <button class="btn comp-group-toggle ${allChosen ? "is-active" : ""}" data-choose-group="${escapeAttr(family.key)}" type="button">${allChosen ? "Fjern markering" : "Marker familie"}</button>
              <button class="btn comp-group-toggle ${allMuted ? "is-active" : ""}" data-mute-group="${escapeAttr(family.key)}" type="button">${allMuted ? "Vis familie" : "Demp familie"}</button>
            </div>
          </div>
        </div>
        <div class="comp-family-material">
          <span class="comp-sub comp-material-status">${escapeHtml(materialStatus)}</span>
          ${renderMaterialEditor("family", family.key, keys)}
        </div>
        ${isExpanded
          ? `<div class="comp-family-body">${body}</div>`
          : `<div class="comp-group-collapsed-note">${family.items.length} deler er skjult i familien. Åpne familien for å se undergrupper og enkeltdeler.</div>`}
      </section>
    `;
  }

  function groupComponentItems(items) {
    const families = new Map();
    items.forEach((item) => {
      const familyKey = buildFamilySignature(item.label) || normalizeFamilyToken(item.label) || item.key;
      if (!families.has(familyKey)) families.set(familyKey, []);
      families.get(familyKey).push(item);
    });

    return [...families.entries()]
      .flatMap(([familyKey, familyItems]) => {
        const familyLabel = familyLabelFromItems(familyItems);
        const clusters = clusterFamilyByLocation(familyItems);
        return clusters.map((cluster, clusterIndex) => ({
          key: clusters.length > 1 ? `${familyKey}::cluster-${clusterIndex + 1}` : familyKey,
          label: clusters.length > 1 ? `${familyLabel} · gruppe ${clusterIndex + 1}` : familyLabel,
          familyLabel,
          center: cluster.center || null,
          items: cluster.items.slice().sort((a, b) => a.label.localeCompare(b.label, "nb")),
        }));
      })
      .sort((a, b) => {
        const sizeDiff = b.items.length - a.items.length;
        if (sizeDiff) return sizeDiff;
        return a.label.localeCompare(b.label, "nb");
      });
  }

  function renderComponentList(items, mode, { source = "metadata" } = {}) {
    const normalizedItems = (items || []).slice(0, 200).map((item, idx) => normalizeComponentItem(item, idx));
    if (source === "viewer") {
      componentCatalog.viewerItems = normalizedItems;
    } else {
      componentCatalog.metadataItems = normalizedItems;
    }
    componentState = {
      items: buildEffectiveComponentItems(),
      mode: componentCatalog.viewerItems.length ? "mesh" : mode,
      source,
    };
    syncSelectionSetToCurrentItems(chosenSet);
    syncSelectionSetToCurrentItems(mutedSet);
    renderFilteredComponents();
  }

  function renderFilteredComponents() {
    const filter = (componentFilter?.value || "").trim().toLowerCase();
    const filtered = componentState.items.filter((item) => !filter || item.search.includes(filter));
    if (!filtered.length) {
      components.textContent = filter ? "Ingen komponenter matcher filteret." : "Ingen komponentnavn funnet i denne filtypen.";
      renderChosenMuted();
      return;
    }

    const familyGroups = buildComponentFamilies(filtered);
    const groupLookup = new Map();
    familyGroups.forEach((family) => {
      groupLookup.set(family.key, family);
      family.groups.forEach((group) => groupLookup.set(group.key, group));
    });

    function resolveMaterialEditorKeys(scope, token) {
      if (!token) return [];
      if (scope === "item") return [token];
      const group = groupLookup.get(token);
      if (group?.items?.length) return group.items.map((item) => item.key).filter(Boolean);
      return componentState.items
        .filter((item) => item.key === token)
        .map((item) => item.key);
    }

    components.innerHTML = `
      <div class="muted muted-box" style="margin-bottom:8px;">
        ${componentIntroText(componentState.mode)}
      </div>
      <div class="comp-list">${familyGroups.map((family) => renderComponentFamily(family, filter)).join("")}</div>
    `;

    components.querySelectorAll("button[data-comp]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-comp");
        if (!key) return;
        setChosenForKeys([key], !chosenSet.has(key));
        renderFilteredComponents();
      });
    });
    components.querySelectorAll("button[data-choose]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-choose");
        if (!key) return;
        setChosenForKeys([key], !chosenSet.has(key));
        renderFilteredComponents();
      });
    });
    components.querySelectorAll("button[data-mute]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-mute");
        if (!key) return;
        setMutedForKeys([key], !mutedSet.has(key));
        renderFilteredComponents();
      });
    });
    components.querySelectorAll("button[data-toggle-group]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        const token = btn.getAttribute("data-toggle-group");
        if (!token) return;
        toggleExpandedGroup(token);
        renderFilteredComponents();
      });
    });
    components.querySelectorAll("button[data-choose-group]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const token = btn.getAttribute("data-choose-group");
        const group = groupLookup.get(token);
        if (!group) return;
        const keys = group.items.map((item) => item.key);
        const allChosen = keys.length > 0 && keys.every((key) => chosenSet.has(key));
        setChosenForKeys(keys, !allChosen);
        renderFilteredComponents();
      });
    });
    components.querySelectorAll("button[data-mute-group]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const token = btn.getAttribute("data-mute-group");
        const group = groupLookup.get(token);
        if (!group) return;
        const keys = group.items.map((item) => item.key);
        const allMuted = keys.length > 0 && keys.every((key) => mutedSet.has(key));
        setMutedForKeys(keys, !allMuted);
        renderFilteredComponents();
      });
    });
    components.querySelectorAll("select[data-material-select]").forEach((select) => {
      select.addEventListener("change", () => {
        const editor = select.closest(".comp-material-editor");
        if (!editor) return;
        const densityInput = editor.querySelector("input[data-density-input]");
        const infillInput = editor.querySelector("input[data-infill-input]");
        const profile = getMaterialLibraryEntry(select.value);
        if (densityInput) densityInput.value = String(Math.round(profile.density || 7850));
        if (infillInput) {
          const supportsInfill = profile.supportsInfill !== false;
          infillInput.disabled = !supportsInfill;
          infillInput.value = supportsInfill ? String(clampInfillPercent(infillInput.value, 100)) : "100";
        }
      });
    });
    components.querySelectorAll("button[data-apply-material]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const editor = btn.closest(".comp-material-editor");
        if (!editor) return;
        const scope = editor.getAttribute("data-editor-scope") || btn.getAttribute("data-apply-scope") || "item";
        const token = editor.getAttribute("data-editor-token") || btn.getAttribute("data-apply-material") || "";
        const keys = resolveMaterialEditorKeys(scope, token);
        if (!keys.length) return;
        const materialSlug = editor.querySelector("select[data-material-select]")?.value || "custom";
        const densityValue = editor.querySelector("input[data-density-input]")?.value;
        const infillValue = editor.querySelector("input[data-infill-input]")?.value;
        const massValue = editor.querySelector("input[data-mass-input]")?.value;
        const overrides = buildScopedMaterialOverrides(keys, {
          materialSlug,
          densityKgM3: densityValue,
          infillPercent: infillValue,
          directMassKg: massValue,
          scope,
        });
        overrides.forEach(({ key, override }) => setComponentMaterialOverride(key, override));
        saveMaterialOverrideState();
        invalidateHydroReportState();
        applyHydroControlsToViewer({ includeDraftPose: false, silentEstimate: true });
        renderFilteredComponents();
      });
    });
    components.querySelectorAll("button[data-clear-material]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const editor = btn.closest(".comp-material-editor");
        if (!editor) return;
        const scope = editor.getAttribute("data-editor-scope") || btn.getAttribute("data-clear-scope") || "item";
        const token = editor.getAttribute("data-editor-token") || btn.getAttribute("data-clear-material") || "";
        const keys = resolveMaterialEditorKeys(scope, token);
        if (!keys.length) return;
        setComponentMaterialOverrides(keys, null);
        saveMaterialOverrideState();
        invalidateHydroReportState();
        applyHydroControlsToViewer({ includeDraftPose: false, silentEstimate: true });
        renderFilteredComponents();
      });
    });
    renderChosenMuted();
    return;

    const groups = groupComponentItems(filtered);
    const lis = groups.map((group) => {
      const keys = group.items.map((item) => item.key);
      const chosenCount = keys.filter((key) => chosenSet.has(key)).length;
      const mutedCount = keys.filter((key) => mutedSet.has(key)).length;
      const visibleCount = group.items.length - mutedCount;
      const groupState = getGroupState(keys);
      const allChosen = chosenCount === group.items.length && group.items.length > 0;
      const allMuted = mutedCount === group.items.length && group.items.length > 0;
      const isExpanded = isGroupExpanded(group, filter);
      const canCollapse = group.items.length > 1;
      const expandLabel = !canCollapse
        ? "En del"
        : String(filter || "").trim()
          ? "Detaljer vist"
          : isExpanded
            ? "Skjul deler"
            : `Vis ${group.items.length} deler`;
      const groupItems = group.items.map((item) => {
        const state = getComponentState(item);
        return `
          <li class="comp-row" data-state="${state}">
            <button data-comp="${escapeAttr(item.key)}" class="btn comp-main" type="button">
              <span class="comp-title">${escapeHtml(item.label)}</span>
              ${item.subtitle ? `<span class="comp-sub">${escapeHtml(item.subtitle)}</span>` : ""}
              ${item.description ? `<span class="comp-sub">${escapeHtml(item.description)}</span>` : ""}
            </button>
            <span class="comp-state comp-state-${state}">${state === "chosen" ? "Valgt" : state === "muted" ? "Dempet" : "Vises"}</span>
            <div class="comp-actions">
              <button class="btn comp-toggle ${chosenSet.has(item.key) ? "is-active" : ""}" data-choose="${escapeAttr(item.key)}" type="button">${chosenSet.has(item.key) ? "Valgt" : "Velg"}</button>
              <button class="btn comp-toggle ${mutedSet.has(item.key) ? "is-muted" : ""}" data-mute="${escapeAttr(item.key)}" type="button">${mutedSet.has(item.key) ? "Vis" : "Demp"}</button>
            </div>
          </li>
        `;
      }).join("");

      return `
        <section class="comp-group" data-group-state="${groupState}" data-expanded="${isExpanded ? "true" : "false"}">
          <div class="comp-group-head">
            ${canCollapse ? `
              <button
                class="btn comp-group-main ${isExpanded ? "is-open" : ""}"
                data-toggle-group="${escapeAttr(group.key)}"
                type="button"
                ${String(filter || "").trim() ? "disabled" : ""}
                aria-expanded="${isExpanded ? "true" : "false"}"
              >
                <span class="comp-group-chevron" aria-hidden="true">${isExpanded ? "-" : "+"}</span>
                <span class="comp-group-heading">
                  <span class="comp-group-title">${escapeHtml(group.label)}</span>
                  <span class="comp-group-meta">${group.items.length} deler | ${visibleCount} synlige | ${chosenCount} valgt | ${mutedCount} dempet</span>
                </span>
                <span class="comp-group-expand-label">${escapeHtml(expandLabel)}</span>
              </button>
            ` : `
              <div class="comp-group-main is-static">
                <span class="comp-group-chevron" aria-hidden="true">=</span>
                <span class="comp-group-heading">
                  <span class="comp-group-title">${escapeHtml(group.label)}</span>
                  <span class="comp-group-meta">${group.items.length} deler | ${visibleCount} synlige | ${chosenCount} valgt | ${mutedCount} dempet</span>
                </span>
                <span class="comp-group-expand-label">${escapeHtml(expandLabel)}</span>
              </div>
            `}
            <div class="comp-group-side">
              <span class="comp-state comp-state-${groupState === "mixed" ? "mixed" : groupState}">${getGroupStateLabel(groupState)}</span>
              <div class="comp-group-actions">
                <button class="btn comp-group-toggle ${allChosen ? "is-active" : ""}" data-choose-group="${escapeAttr(group.key)}" type="button">${allChosen ? "Fjern markering" : "Marker gruppe"}</button>
                <button class="btn comp-group-toggle ${allMuted ? "is-active" : ""}" data-mute-group="${escapeAttr(group.key)}" type="button">${allMuted ? "Vis gruppe" : "Demp gruppe"}</button>
              </div>
            </div>
          </div>
          ${isExpanded
            ? `<ul class="comp-group-list">${groupItems}</ul>`
            : `<div class="comp-group-collapsed-note">${group.items.length} detaljdeler er skjult. Åpne gruppen for å se enkeltdelene.</div>`}
        </section>
      `;
    }).join("");

    components.innerHTML = `
      <div class="muted muted-box" style="margin-bottom:8px;">
        ${componentIntroText(componentState.mode)}
      </div>
      <div class="comp-list">${lis}</div>
    `;

    components.querySelectorAll("button[data-comp]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-comp");
        if (!key) return;
        setChosenForKeys([key], !chosenSet.has(key));
        renderFilteredComponents();
      });
    });
    components.querySelectorAll("button[data-choose]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-choose");
        if (!key) return;
        setChosenForKeys([key], !chosenSet.has(key));
        renderFilteredComponents();
      });
    });
    components.querySelectorAll("button[data-mute]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-mute");
        if (!key) return;
        setMutedForKeys([key], !mutedSet.has(key));
        renderFilteredComponents();
      });
    });
    components.querySelectorAll("button[data-toggle-group]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        const token = btn.getAttribute("data-toggle-group");
        if (!token) return;
        toggleExpandedGroup(token);
        renderFilteredComponents();
      });
    });
    components.querySelectorAll("button[data-choose-group]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const token = btn.getAttribute("data-choose-group");
        const group = groups.find((entry) => entry.key === token);
        if (!group) return;
        const keys = group.items.map((item) => item.key);
        const allChosen = keys.length > 0 && keys.every((key) => chosenSet.has(key));
        setChosenForKeys(keys, !allChosen);
        renderFilteredComponents();
      });
    });
    components.querySelectorAll("button[data-mute-group]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const token = btn.getAttribute("data-mute-group");
        const group = groups.find((entry) => entry.key === token);
        if (!group) return;
        const keys = group.items.map((item) => item.key);
        const allMuted = keys.length > 0 && keys.every((key) => mutedSet.has(key));
        setMutedForKeys(keys, !allMuted);
        renderFilteredComponents();
      });
    });
    renderChosenMuted();
  }

  function parseIges(text) {
    const lines = text.split(/\r?\n/);
    let s = 0, g = 0, d = 0, p = 0, t = 0;
    for (const line of lines) {
      const section = line.slice(72, 73);
      if (section === "S") s++;
      else if (section === "G") g++;
      else if (section === "D") d++;
      else if (section === "P") p++;
      else if (section === "T") t++;
    }
    return { s, g, d, p, t };
  }

  async function runGeometryChecks() {
    const items = [];
    const extra = [];
    items.push(`<li>Formatstøtte: <span class="ok">${["stl", "step", "stp", "iges", "igs", "obj", "3mf", "3fm", "f3d", "f3z", "fbm", "fm3", "sat", "smt", "x_t", "x_b", "sldprt", "sldasm"].includes(ext) ? "Forventet CAD/mesh-format" : "Ukjent format"}</span></li>`);

    const isHeavyFusionArchive =
      FUSION_ARCHIVE_EXTS.has(ext) &&
      Number.isFinite(sourceFileSizeBytes) &&
      sourceFileSizeBytes >= FUSION_HEAVY_ANALYSIS_LIMIT_BYTES;
    if (isHeavyFusionArchive) {
      items.push(`<li>Stor Fusion-container oppdaget: <b>${fmtBytes(sourceFileSizeBytes)}</b>.</li>`);
      items.push("<li>Dyp containeranalyse er hoppet over ved første lasting for å unngå at siden fryser.</li>");
      items.push("<li>Åpne 3D-viewer manuelt hvis du faktisk vil laste tung modellvisning.</li>");
      if (getActivePreviewCandidate()) items.push(`<li>3D-kandidat: ${escapeHtml(basenameFromUrl(getActivePreviewCandidate()))}</li>`);
      if (getActiveStepCandidate()) items.push(`<li>STEP-kandidat: ${escapeHtml(basenameFromUrl(getActiveStepCandidate()))}</li>`);
      if (getActiveStlCandidate()) items.push(`<li>STL-kandidat: ${escapeHtml(basenameFromUrl(getActiveStlCandidate()))}</li>`);
      renderComponentList([], "cad");
      checks.innerHTML = listToHtml(items);
      details.innerHTML = buildExtraDetailsHtml(extra);
      buildHydroReport();
      return;
    }

    let ab = null;
    try {
      ab = await fetchArrayBufferCached(decodedFile);
      addMeta("Bytes lastet", fmtBytes(ab.byteLength));
    } catch (e) {
      checks.innerHTML = `<span class="warn">Kunne ikke lese fil for analyse: ${String(e)}</span>`;
      setDisabled(btnStl, true, "Filen kan ikke leses fra nettleseren.");
      setDisabled(btnBambu, true, "Filen kan ikke leses fra nettleseren.");
      return;
    }

    if (ext === "stl") {
      try {
        const dv = new DataView(ab);
        const triCount = dv.byteLength >= 84 ? dv.getUint32(80, true) : 0;
        const expected = 84 + triCount * 50;
        const looksBinary = expected === dv.byteLength && triCount > 0;
        const textProbe = decodeText(ab, 200_000).trimStart();
        const looksAscii = /^solid\b/i.test(textProbe);
        items.push(`<li>STL-type: <b>${looksBinary ? "Binary STL" : "ASCII/ukjent STL"}</b></li>`);
        if (!looksBinary && looksAscii) {
          const solids = (textProbe.match(/\bsolid\b/gi) || []).length;
          const facets = (textProbe.match(/\bfacet normal\b/gi) || []).length;
          items.push(`<li>ASCII indikator: solid=${solids}, facet normal=${facets}</li>`);
        }
        if (looksBinary) items.push(`<li>Trekant-antall (beregnet): <b>${triCount.toLocaleString("nb-NO")}</b></li>`);
        items.push("<li>Komponent-sjekk: STL inneholder normalt ett mesh-objekt; bruk Fusion for komponent-hierarki.</li>");
        if (looksBinary) {
          const bin = parseBinaryStlBboxAndVolume(ab);
          if (bin?.bbox) {
            analysisState.bbox = bin.bbox;
            analysisState.solidVolumeM3 = bin.solidVolume;
            analysisState.source = "STL (binary mesh)";
            analysisState.geometrySource = analysisState.source;
          }
        }
        renderComponentList(["STL_Mesh_01"], "mesh");
      } catch (e) {
        items.push(`<li class="warn">Kunne ikke lese STL for geometri-sjekk: ${String(e)}</li>`);
        renderComponentList([], "mesh");
      }
    } else if (ext === "obj") {
      const obj = parseObj(decodeText(ab));
      items.push(`<li>OBJ: vertices=${obj.v.toLocaleString("nb-NO")}, UV=${obj.vt.toLocaleString("nb-NO")}, normaler=${obj.vn.toLocaleString("nb-NO")}, faces=${obj.f.toLocaleString("nb-NO")}</li>`);
      items.push(`<li>Objekt/grupper: o=${obj.o}, g=${obj.g}</li>`);
      items.push(`<li>Materialer i bruk: ${obj.materials.length ? obj.materials.slice(0, 20).join(", ") : "ingen registrert"}</li>`);
      const compNames = [...new Set([...obj.objectNames, ...obj.groupNames].filter(Boolean))];
      if (obj.bbox) {
        analysisState.bbox = obj.bbox;
        analysisState.solidVolumeM3 = null;
        analysisState.source = "OBJ (bbox from vertices)";
        analysisState.geometrySource = analysisState.source;
      }
      renderComponentList(compNames, "mesh");
    } else if (ext === "step" || ext === "stp") {
      const step = parseStep(decodeText(ab));
      items.push(`<li>STEP entities: PRODUCT=${step.products.toLocaleString("nb-NO")}, ADVANCED_FACE=${step.faces.toLocaleString("nb-NO")}</li>`);
      if (step.schema) items.push(`<li>Schema: ${step.schema}</li>`);
      if (step.fileName) items.push(`<li>FILE_NAME-data: ${step.fileName}</li>`);
      if (step.lengthUnit) {
        analysisState.units = step.lengthUnit;
        items.push(`<li>Lengdeenhet (tolket): ${step.lengthUnit}</li>`);
      }
      if (step.materialHint) {
        applyMaterialHint(step.materialHint, "STEP-fil");
        items.push(`<li>Materialhint: ${escapeHtml(describeMaterialHint(step.materialHint))}</li>`);
      }
      if (step.lengthUnit) {
        items.push(`<li>Skalahint fra STEP: ${escapeHtml(step.lengthUnit)} (viewer regner videre i meter).</li>`);
      }
      renderComponentList(step.productNames, "cad");
    } else if (ext === "iges" || ext === "igs") {
      const iges = parseIges(decodeText(ab));
      items.push(`<li>IGES seksjoner: S=${iges.s}, G=${iges.g}, D=${iges.d}, P=${iges.p}, T=${iges.t}</li>`);
      renderComponentList([], "cad");
    } else if (["3mf", "3fm", "f3d", "f3z", "3fz", "fbm", "fm3"].includes(ext)) {
      const zip = parseZipCentralDirectory(ab);
      if (zip.error) {
        items.push(`<li class="warn">Kunne ikke lese ZIP-struktur: ${zip.error}</li>`);
      } else {
        items.push(`<li>Container entries: ${zip.entries.length.toLocaleString("nb-NO")}</li>`);
        const top = zip.entries.slice(0, 30);
        const names = top.map(e => `${e.name} (${fmtBytes(e.uncompSize)})`);
        extra.push(`Filer i container (første ${top.length}): ${names.join(" | ")}`);
        const dated = top.find(e => e.dosDate && e.dosTime);
          if (dated) items.push(`<li>Intern container-timestamp: ${dosToIso(dated.dosDate, dated.dosTime)}</li>`);
        if (ext === "3mf" || ext === "3fm") {
          const modelFiles = zip.entries.filter(e => /(^|\/)3d\/.*\.model$/i.test(e.name));
          items.push(`<li>3MF model-filer funnet: ${modelFiles.length}</li>`);
        }
        if (["f3d", "f3z", "3fz", "fbm"].includes(ext)) {
          try {
            const fusionMeta = await extractFusionComponentData(ab);
            if (fusionMeta?.components?.length) {
              analysisState.fusionArchiveMeta = fusionMeta;
              items.push(`<li>Fusion-komponenter fra metadata: ${fusionMeta.components.length.toLocaleString("nb-NO")}</li>`);
              if (fusionMeta.rootName) items.push(`<li>Rotdesign: <b>${escapeHtml(fusionMeta.rootName)}</b></li>`);
              items.push(`<li>${ext.toUpperCase()}-type: ${ext === "f3z" || ext === "3fz" ? "sammensatt Fusion-arkiv med referanser" : "native Fusion-designfil / delarkiv"}</li>`);
              if (fusionMeta.entryCount) items.push(`<li>Arkiv-entries lest: ${fusionMeta.entryCount.toLocaleString("nb-NO")}</li>`);
              const contentTypeSummary = Object.entries(fusionMeta.contentTypeCounts || {})
                .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "nb"))
                .map(([type, count]) => `${type}: ${count}`)
                .join(" | ");
              if (contentTypeSummary) extra.push(`Fusion innholdstyper: ${contentTypeSummary}`);
              if (fusionMeta.simulationStudyCount) {
                items.push(`<li>Simulation studies i metadata: ${fusionMeta.simulationStudyCount}</li>`);
                extra.push(`Study-ID-er i Fusion-metadata: ${fusionMeta.simulationStudyIds.join(" | ")}`);
              }
              items.push("<li>F3D/F3Z kan inneholde materialer, utseende og studiespor, men nettleserparseren leser foreløpig åpen metadata/komponentgraf og ikke alle proprietære Fusion-segmenter.</li>");
              renderComponentList(fusionMeta.components, "fusion");
            } else {
              renderComponentList(zip.entries.map(e => e.name), "cad");
            }
          } catch (e) {
            items.push(`<li class="warn">Kunne ikke lese Fusion-metadata: ${escapeHtml(String(e))}</li>`);
            renderComponentList(zip.entries.map(e => e.name), "cad");
          }
        } else {
          renderComponentList(zip.entries.map(e => e.name), "cad");
        }
      }
    } else {
      items.push("<li>Komponent-sjekk: full struktur/timeline for Fusion krever Autodesk API eller eksport til STL/STEP.</li>");
      renderComponentList([], "cad");
    }

    if (!(ext === "step" || ext === "stp") && getActiveStepCandidate()) {
      const stepHint = await applyStepHintsFromUrl(getActiveStepCandidate(), "STEP-kandidat");
      if (stepHint?.materialHint) {
        items.push(`<li>Materialhint fra STEP-kandidat: ${escapeHtml(describeMaterialHint(stepHint.materialHint))}</li>`);
      }
      if (stepHint?.lengthUnit) {
        items.push(`<li>Skalahint fra STEP-kandidat: ${escapeHtml(stepHint.lengthUnit)} (viewer regner videre i meter).</li>`);
      }
      if (stepHint?.lengthUnit && !analysisState.viewerAnalysis && !analysisState.latestViewerHydro) {
        analysisState.units = stepHint.lengthUnit;
      }
    }

    if (!analysisState.bbox && ["f3d", "f3z", "3fz", "fbm", "fm3", "step", "stp", "iges", "igs", "sat", "smt", "x_t", "x_b", "sldprt", "sldasm"].includes(ext)) {
      const recovered = await tryHydroFromResolvedStl();
      if (recovered) {
        items.push("<li>Hydro-fallback: bruker matchende STL-eksport for bbox og volumestimat.</li>");
      }
    }

    if (["fbm", "fm3", "3fm"].includes(ext)) {
      items.push("<li>Tips: eksporter til STL/3MF for slicing i Bambu Studio og visning i nettleser.</li>");
    }

    checks.innerHTML = listToHtml(items);
    details.innerHTML = buildExtraDetailsHtml(extra);
    buildHydroReport();
  }

  async function run() {
    addMeta("Filnavn", displayFileName || fileName || "ukjent");
    addMeta("Filtype", ext || "ukjent");
    await Promise.all([
      resolveSiblingPreviewCandidate(),
      resolveSiblingStlCandidate(),
      resolveSiblingStepCandidate(),
    ]);
    updateBambuButtonState();
    addMeta("3D-kandidat", basenameFromUrl(getActivePreviewCandidate()) || "Ingen kandidat funnet");
    if (getActiveStlCandidate()) addMeta("STL-kandidat", basenameFromUrl(getActiveStlCandidate()));
    if (getActiveStepCandidate()) addMeta("STEP-kandidat", basenameFromUrl(getActiveStepCandidate()));
    if (getActiveBambuCandidate()) addMeta("Bambu-kandidat", basenameFromUrl(getActiveBambuCandidate()));

    const headRes = await fetchHeadCached(decodedFile);
    if (headRes && headRes.ok) {
      const size = Number(headRes.headers.contentLength);
      sourceFileSizeBytes = Number.isFinite(size) ? size : null;
      const type = headRes.headers.contentType || "ukjent";
      const mod = headRes.headers.lastModified;
      addMeta("Størrelse", fmtBytes(size));
      addMeta("Content-Type", type);
      addMeta("Sist endret", mod ? new Date(mod).toLocaleString("nb-NO") : "ukjent");
      timeline.textContent = mod
        ? `Timeline: siste registrerte endring ${new Date(mod).toLocaleString("nb-NO")} (fra HTTP Last-Modified).`
        : "Timeline: ingen Last-Modified tilgjengelig for denne filen.";
    } else {
      sourceFileSizeBytes = null;
      addMeta("Metadata", "HEAD ikke tilgjengelig");
      timeline.textContent = "Timeline: serveren ga ikke metadata via HEAD.";
    }

    const canRead = !!(headRes && headRes.ok);
    setDisabled(btnStl, !canRead || !CAD_EXT.has(ext), !canRead ? "Filen kunne ikke hentes (HEAD feilet)." : "Ikke relevant for denne filtypen.");
    updateBambuButtonState({ canRead });
    await runGeometryChecks();
  }

  componentFilter?.addEventListener("input", renderFilteredComponents);
  btnHydroCalc && (btnHydroCalc.onclick = () => applyHydroControlsToViewer({ includeDraftPose: true }));
  window.addEventListener("message", (ev) => {
    const data = ev?.data;
    if (!data) return;
    if (data.type === "viewer-components") {
      const items = Array.isArray(data.items) ? data.items.filter(Boolean) : [];
      if (!items.length) return;
      renderComponentList(items, data.mode || "mesh", { source: "viewer" });
      return;
    }
    if (data.type === "viewer-analysis" && data.payload) {
      const payload = data.payload || {};
      analysisState.viewerAnalysis = payload;
      if (payload.bbox) analysisState.bbox = payload.bbox;
      if (Number.isFinite(payload.volume)) analysisState.solidVolumeM3 = payload.volume;
      if (Number.isFinite(payload.massProperties?.totalVolumeM3)) analysisState.solidVolumeM3 = payload.massProperties.totalVolumeM3;
      if (payload.units) analysisState.units = payload.units;
      analysisState.latestViewerMassProperties = payload.massProperties || payload.hydro?.massProperties || null;
      if (payload.hydro?.supported) {
        analysisState.latestViewerHydro = payload.hydro;
        syncHydroControlsFromViewer(payload.hydro);
        if (hasResolvedViewerHydro(payload.hydro)) {
          setHydroTaskState(false);
        } else {
          setHydroTaskState(true, "Regner hydrostatikk fra modellen...", "Volum, deplasement og GM oppdateres straks mesh-analysen er ferdig.");
        }
      } else {
        analysisState.latestViewerHydro = null;
        setHydroTaskState(true, "Tolker geometri...", "Viewer laster modell og forbereder hydrodata.");
      }
      if (payload.source) {
        analysisState.source = payload.source;
        analysisState.geometrySource = payload.source;
      }
      if (payload.materialHint) applyMaterialHint(payload.materialHint, payload.materialHintSource || "Viewer");
      buildHydroReport();
      return;
    }
    if (data.type === "viewer-hydro-report" && data.payload) {
      reportState.isGenerating = false;
      reportState.lastDurationMs = reportState.startedAt ? (Date.now() - reportState.startedAt) : reportState.lastDurationMs;
      reportState.startedAt = 0;
      setHydroTaskState(false);
      analysisState.latestViewerReport = data.payload;
      analysisState.latestViewerMassProperties = data.payload.currentHydro?.massProperties || analysisState.latestViewerMassProperties;
      if (data.payload.currentHydro?.supported) {
        analysisState.latestViewerHydro = data.payload.currentHydro;
        syncHydroControlsFromViewer(data.payload.currentHydro);
      }
      const resolvedDetailSignature = buildHydroDetailSignature();
      saveHydroReportCache(
        data.payload,
        resolvedDetailSignature,
        resolvedDetailSignature
      );
      reportState.cacheKey = resolvedDetailSignature;
      reportState.requestKey = "";
      if (btnHydroReport) {
        btnHydroReport.disabled = false;
        btnHydroReport.textContent = "Vis rapport";
      }
      if (btnHydroRecalc) {
        btnHydroRecalc.disabled = false;
        btnHydroRecalc.textContent = "Recalc rapport";
      }
      renderHydroReportModal(data.payload);
      openHydroReportModal();
      updateHydroPanels();
      return;
    }
    if (data.type === "viewer-hydro-progress" && data.payload) {
      const payload = data.payload || {};
      setHydroTaskState(true, payload.title || "Genererer hydro-rapport...", payload.text || "Kjører hydroberegninger i aktiv viewer.", {
        kind: payload.kind || "report",
        progress: safeNumber(payload.progress),
        etaMs: safeNumber(payload.etaMs),
      });
      updateHydroProgressUi();
      return;
    }
    if (data.type === "viewer-explode-info" && data.payload) {
      const payload = data.payload || {};
      viewerVisualState.explodeSupported = !!payload.supported;
      viewerVisualState.explodeCount = Number(payload.count) || 0;
      viewerVisualState.explode = Math.max(0, Math.min(1, Number(payload.amount) || 0));
      updateExplodeUi();
    }
  });
  try {
    if (window.parent && window.parent !== window) {
      const pr = window.parent.document.documentElement;
      const mo = new MutationObserver(() => syncFromParentTheme());
      mo.observe(pr, { attributes: true, attributeFilter: ["data-theme", "style", "class"] });
    }
  } catch {}
  setInterval(() => {
    syncFromParentTheme();
    postThemeToViewer();
  }, 1000);
  setInterval(() => {
    if (reportState.isGenerating || hydroTaskState.active) {
      updateHydroProgressUi();
    }
  }, 1000);
  syncDrawerForViewport();
  updateHydroPanels();
  updateExplodeUi();
  Promise.all([
    resolveSiblingPreviewCandidate(),
    resolveSiblingStlCandidate(),
    resolveSiblingStepCandidate(),
  ]).finally(() => {
    if (canAutoLoadIntegratedViewer()) {
      loadIntegratedViewer();
      return;
    }
    renderDeferredViewerState("Denne Fusion-containeren autolastes ikke fordi det kan låse hele siden. Bruk 'Åpne i 3D-viewer' når du faktisk vil laste den.");
  });
  run();
})();
