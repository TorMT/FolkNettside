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
  const btnStl = document.getElementById("btnStl");
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
  };
  const DRAWER_PREF_KEY = "fusionDrawerOpen.v20260410d";
  const headResultCache = new Map();
  const jsonResultCache = new Map();
  const arrayBufferResultCache = new Map();
  const MATERIAL_DENSITY = { steel: 7850, aluminum: 2700, grfp: 1850, wood: 600 };
  const MATERIAL_PROFILES = [
    { slug: "steel", label: "Stål", density: 7850, patterns: [/\bsteel\b/i, /\bstål\b/i, /\bstainless\b/i, /\binox\b/i] },
    { slug: "aluminum", label: "Aluminium", density: 2700, patterns: [/\balum(?:inium|inum)?\b/i, /\balu\b/i] },
    { slug: "grfp", label: "GRP / kompositt", density: 1850, patterns: [/\bgrp\b/i, /\bgfrp\b/i, /\bfiberglass\b/i, /\bglass\s*fiber\b/i, /\bkompositt\b/i] },
    { slug: "wood", label: "Tre", density: 600, patterns: [/\bwood\b/i, /\btimber\b/i, /\btre\b/i] },
    { slug: "custom", label: "Plast / polymer", density: 1240, patterns: [/\bpla\b/i, /\bpetg\b/i, /\babs\b/i, /\bnylon\b/i, /\bplastic\b/i, /\bpolymer\b/i, /\bplast\b/i] },
  ];
  const CAD_EXT = new Set(["stl", "obj", "step", "stp", "iges", "igs", "3mf", "3fm", "f3d", "f3z", "fbm", "fm3", "sat", "smt", "x_t", "x_b", "sldprt", "sldasm"]);
  const BAMBU_EXT = new Set(["stl", "3mf", "3fm", "obj"]);
  const inpRhoWater = document.getElementById("inpRhoWater");
  const selMaterial = document.getElementById("selMaterial");
  const inpRhoMat = document.getElementById("inpRhoMat");
  const inpKgFrac = document.getElementById("inpKgFrac");
  const inpCb = document.getElementById("inpCb");
  const inpThicknessMm = document.getElementById("inpThicknessMm");
  const btnHydroCalc = document.getElementById("btnHydroCalc");
  const btnHydroApply = document.getElementById("btnHydroApply");
  const btnHydroResetPose = document.getElementById("btnHydroResetPose");
  const btnHydroReport = document.getElementById("btnHydroReport");
  const inpHydroDraft = document.getElementById("inpHydroDraft");
  const inpHydroTrim = document.getElementById("inpHydroTrim");
  const inpHydroHeel = document.getElementById("inpHydroHeel");
  const selHydroQuality = document.getElementById("selHydroQuality");
  const chkHydroMarkers = document.getElementById("chkHydroMarkers");
  const chkHydroWaterline = document.getElementById("chkHydroWaterline");
  const chkHydroContour = document.getElementById("chkHydroContour");
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
  const hydroReportTable = document.getElementById("hydroReportTable");
  const hydroCurveCaption = document.getElementById("hydroCurveCaption");
  const hydroDraftCaption = document.getElementById("hydroDraftCaption");
  const hydroReportSheet = document.getElementById("hydroReportSheet");

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
  let stlCandidate = (() => {
    const m = decodedFile.match(/^([^?#]+)([?#].*)?$/);
    const base = m?.[1] || decodedFile;
    const tail = m?.[2] || "";
    return `${base.replace(/\.[^.\/]+$/i, ".stl")}${tail}`;
  })();
  let resolvedStlCandidate = "";
  let resolvedStepCandidate = "";
  let resolvedPreviewCandidate = "";

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
  function getActiveStlCandidate() {
    return resolvedStlCandidate || "";
  }
  function getActiveStepCandidate() {
    return resolvedStepCandidate || "";
  }
  function getActivePreviewCandidate() {
    return resolvedPreviewCandidate || "";
  }
  function candidateScore(name, sourceStem) {
    const stem = String(name).replace(/\.[^.]+$/i, "").toLowerCase();
    const tokens = [...new Set(sourceStem.split(/[_\-\s]+/).filter(Boolean))];
    return (
      (stem === sourceStem ? 100 : 0) +
      ((stem.includes(sourceStem) || sourceStem.includes(stem)) ? 80 : 0) +
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
      Object.entries(data || {}).forEach(([key, value]) => {
        if (!value || !Array.isArray(value.files)) return;
        value.files.forEach((file) => {
          if (typeof file === "string" && /\.stl(?:$|[?#])/i.test(file)) siblingFiles.push(file);
        });
      });
      const unique = [...new Set(siblingFiles)];
      if (!unique.length) return preferred;

      const sourceStem = (fileName || "").replace(/\.[^.]+$/i, "").toLowerCase();
      const normalized = unique.map((name) => {
        const stem = String(name).replace(/\.[^.]+$/i, "").toLowerCase();
        const score =
          stem === sourceStem ? 100 :
          stem.includes(sourceStem) || sourceStem.includes(stem) ? 80 :
          [...new Set(sourceStem.split(/[_\-\s]+/).filter(Boolean))].filter((token) => stem.includes(token)).length;
        return { name, stem, score };
      }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "nb"));

      const chosen = normalized[0];
      if (!chosen) return preferred;
      if (chosen.score > 0 || unique.length === 1) {
        resolvedStlCandidate = `${basePath}${chosen.name}`;
      }
    } catch {}
    return getActiveStlCandidate();
  }

  async function resolveSiblingStepCandidate() {
    const sameStem = sameStemCandidates(decodedFile).filter((candidate) => /\.(step|stp)(?:$|[?#])/i.test(candidate));
    for (const candidate of sameStem) {
      try {
        if (await headExists(candidate)) {
          resolvedStepCandidate = candidate;
          return resolvedStepCandidate;
        }
      } catch {}
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
        value.files.forEach((file) => {
          if (typeof file === "string" && /\.(step|stp)(?:$|[?#])/i.test(file)) siblingFiles.push(file);
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
      resolvedStepCandidate = `${basePath}${chosen.name}`;
    } catch {}
    return getActiveStepCandidate();
  }
  async function resolveSiblingPreviewCandidate() {
    for (const candidate of sameStemCandidates(decodedFile)) {
      try {
        if (await headExists(candidate)) {
          resolvedPreviewCandidate = candidate;
          if (/\.stl(?:$|[?#])/i.test(candidate)) resolvedStlCandidate = candidate;
          return resolvedPreviewCandidate;
        }
      } catch {}
    }
    try {
      const basePath = clean.replace(/[^\/]+$/, "");
      if (!basePath) return getActivePreviewCandidate();
      const indexUrl = `${basePath}index.json`;
      const data = await fetchJsonCached(indexUrl);
      if (!data) return getActivePreviewCandidate();
      const siblingFiles = [];
      Object.entries(data || {}).forEach(([, value]) => {
        if (!value || !Array.isArray(value.files)) return;
        value.files.forEach((file) => {
          if (typeof file !== "string") return;
          if (/\.(3mf|3fm|fm3|step|stp|iges|igs|obj|glb|gltf|fbx|ply|stl|sat|smt|x_t|x_b|sldprt|sldasm|slddrw)(?:$|[?#])/i.test(file)) siblingFiles.push(file);
        });
      });
      const unique = [...new Set(siblingFiles)];
      if (!unique.length) return getActivePreviewCandidate();

      const sourceStem = (fileName || "").replace(/\.[^.]+$/i, "").toLowerCase();
      const ranked = unique.map((name) => {
        return { name, score: previewExtWeight(name) + candidateScore(name, sourceStem) };
      }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "nb"));

      const chosen = ranked[0];
      if (!chosen || chosen.score <= 0) return getActivePreviewCandidate();
      resolvedPreviewCandidate = `${basePath}${chosen.name}`;
      if (/\.stl(?:$|[?#])/i.test(chosen.name)) resolvedStlCandidate = resolvedPreviewCandidate;
    } catch {}
    return getActivePreviewCandidate();
  }

  function buildViewerTarget() {
    const lowerExt = String(ext || "").toLowerCase();
    let targetUrl = decodedFile;
    let viewerPath = "/includes/kodeLesere/stlview.html";
    const cacheBust = "20260410d";
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
      }, "*");
    } catch {}
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
    if (viewerLoading) viewerLoading.classList.remove("is-hidden");
    viewerFrame.onload = () => {
      if (viewerLoading) viewerLoading.classList.add("is-hidden");
      postThemeToViewer();
      postComponentStateToViewer();
      postViewerCommandToViewer("set-explode", { amount: viewerVisualState.explode || 0 });
      postHydroVisibilityToViewer();
      applyHydroControlsToViewer({ includeDraftPose: true, silentEstimate: true });
    };
      viewerFrame.src = buildViewerTarget();
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
  setDisabled(btnBambu, !BAMBU_EXT.has(ext), "Bambu-knapp støttes best for STL/3MF/OBJ.");
  setDisabled(btnStl, !CAD_EXT.has(ext), "3D-viewer er kun relevant for CAD-relaterte filer.");

  btnStl && (btnStl.onclick = () => loadIntegratedViewer());
  btnToggleDrawer && (btnToggleDrawer.onclick = () => setDrawerOpen(!drawer?.classList.contains("is-open")));
  drawerBackdrop && drawerBackdrop.addEventListener("click", () => setDrawerOpen(false));
  window.addEventListener("resize", () => syncDrawerForViewport());

  function setTab(tabName) {
    const showOverview = tabName !== "hydro";
    if (infoCard) infoCard.style.display = showOverview ? "" : "none";
    if (toolsCard) toolsCard.style.display = showOverview ? "" : "none";
    if (componentsCard) componentsCard.style.display = showOverview ? "" : "none";
    if (hydroCard) hydroCard.style.display = showOverview ? "none" : "";
    btnTabOverview?.classList.toggle("active", showOverview);
    btnTabHydro?.classList.toggle("active", !showOverview);
  }
  btnTabOverview && (btnTabOverview.onclick = () => setTab("overview"));
  btnTabHydro && (btnTabHydro.onclick = () => setTab("hydro"));
  setTab("overview");

  btnFusion && (btnFusion.onclick = () => window.open("https://myhub.autodesk360.com/", "_blank", "noopener"));

  btnBambu && (btnBambu.onclick = () => {
    const url = decodedFile;
    const schemeUrl = `bambustudio://open?url=${encodeURIComponent(url)}`;
    const win = window.open(schemeUrl, "_self");
    setTimeout(() => {
      if (!win) window.open("https://bambulab.com/en/download/studio", "_blank", "noopener");
    }, 350);
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
  });
  btnExplodeReset?.addEventListener("click", () => {
    viewerVisualState.explode = 0;
    updateExplodeUi();
    postViewerCommandToViewer("set-explode", { amount: 0 });
  });
  selMaterial && (selMaterial.onchange = () => {
    if (selMaterial.value !== "custom") inpRhoMat.value = String(MATERIAL_DENSITY[selMaterial.value] || 7850);
    applyHydroControlsToViewer({ includeDraftPose: false });
  });
  [inpRhoMat, inpKgFrac, inpCb, inpThicknessMm].forEach((input) => {
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
  btnHydroReportClose?.addEventListener("click", () => closeHydroReportModal());
  hydroReportModal?.querySelector("[data-close-report='1']")?.addEventListener("click", () => closeHydroReportModal());
  btnHydroReportPrint?.addEventListener("click", () => {
    openHydroReportModal();
    window.print();
  });
  btnHydroReportJson?.addEventListener("click", () => downloadHydroReportJson());

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
    const seen = new Set();
    const components = [];

    for (const obj of designObjects) {
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

    return {
      components,
      rootName: rootObject?.displayName || rootObject?.friendlyName || prettyFusionName(rootObject?.metadata?.rootFileName) || "",
      entryCount: Object.keys(outer.files || {}).length
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

  function updateHydroSourceText() {
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
    const materialNames = uniqueTextValues([
      ...[...text.matchAll(/MATERIAL[A-Z_]*\s*\(\s*'([^']+)'/gi)].map((m) => m[1]),
      ...[...text.matchAll(/PROPERTY_DEFINITION\s*\(\s*'([^']*material[^']*)'/gi)].map((m) => m[1]),
    ]);
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
    ];

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
    ];

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
    updateHydroSourceText();

    if (hydroWarn) {
      const warnings = [];
      if (!analysisState.bbox) warnings.push("Hydrostatikk venter pa lesbar geometri/bbox.");
    if (snapshot.mode === "estimate") warnings.push("Tallene er forelopig bbox-baserte til live hydro kommer fra vieweren.");
    if (snapshot.mode === "viewer-pending") warnings.push("Draft er satt fra aktiv viewer, men deplasement og hydrodata regnes fortsatt fra modellgeometrien.");
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
    const zMin = estimate.referenceBounds?.min?.z ?? 0;
    for (let i = 0; i < steps; i++) {
      const immersion = estimate.depth * (i / (steps - 1));
      drafts.push(zMin + immersion);
      volumes.push(estimate.length * estimate.beam * immersion * estimate.blockCoefficient);
      displacements.push(volumes[i] * estimate.waterDensity / 1000);
      kbs.push(immersion * 0.53);
      awps.push(estimate.length * estimate.beam * Math.max(0.58, Math.min(0.98, estimate.blockCoefficient + 0.18)));
      saks.push(null);
    }

    return {
      generatedAt: new Date().toISOString(),
      fileName: displayFileName || fileName || "Hydro-modell",
      sourceLabel: "Sidebar-estimat",
      quality: "estimate",
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
      note: "Kurver og draft-scan er beregnet som teoretisk fallback fra bbox/geometrihint.",
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

  function renderHydroReportModal(payload) {
    if (!payload) return;
    const currentHydro = payload.currentHydro || payload.hydro || getViewerHydroData() || analysisState.latestHydroEstimate;
    const rollStability = payload.rollReport?.stability || null;
    const pitchStability = payload.pitchReport?.stability || null;

    if (hydroReportTitle) hydroReportTitle.textContent = `${payload.fileName || displayFileName || fileName || "Modell"} - hydrostatikk`;
    if (hydroReportMeta) {
      hydroReportMeta.textContent = `${payload.sourceLabel || "Viewer-data"} | generert ${new Date(payload.generatedAt || Date.now()).toLocaleString("nb-NO")} | kvalitet ${getHydroQualityLabel(payload.quality || payload.rollReport?.meta?.qualityUsed)}`;
    }
    if (hydroSheetTitle) hydroSheetTitle.textContent = payload.fileName || displayFileName || fileName || "Hydrostatikk-rapport";
    if (hydroSheetSubtitle) hydroSheetSubtitle.textContent = payload.note || "Kurver og sammendrag fra aktiv hydrostatikktilstand.";
    if (hydroSheetSource) hydroSheetSource.textContent = payload.sourceLabel || "Viewer-data";

    if (hydroReportSummary) {
      const cards = [
        { title: "Draft", value: fmtUnitValue(getDraftMetersFromHydro(currentHydro), 3, "m"), note: Number.isFinite(currentHydro?.draftZWorld) ? `World Z ${Number(currentHydro.draftZWorld).toFixed(3)}` : "Ingen world-Z oppgitt" },
        { title: "Deplasement", value: fmtTonnes(currentHydro?.displacementTonnes, 2), note: `Volum ${fmtUnitValue(currentHydro?.submergedVolume, 3, "m^3")}` },
        { title: "Modellvekt", value: fmtTonnes(currentHydro?.modelMassTonnes, 2), note: Number.isFinite(currentHydro?.massGapTonnes) ? `Delta ${fmtTonnes(currentHydro.massGapTonnes, 2)}` : "Mesh + materialtetthet" },
        { title: "GM", value: `Roll ${fmtUnitValue(currentHydro?.gm?.roll, 3, "m")}`, note: `Pitch ${fmtUnitValue(currentHydro?.gm?.pitch, 3, "m")}` },
        { title: "Max GZ", value: `Roll ${fmtUnitValue(rollStability?.maxGZ, 3, "m")}`, note: `Pitch ${fmtUnitValue(pitchStability?.maxGZ, 3, "m")}` },
      ];
      hydroReportSummary.innerHTML = cards.map((card) => `
        <article class="report-summary-card">
          <span class="muted">${escapeHtml(card.title)}</span>
          <strong>${escapeHtml(card.value)}</strong>
          <span class="muted">${escapeHtml(card.note)}</span>
        </article>
      `).join("");
    }

    if (hydroCurveCaption) hydroCurveCaption.textContent = `Roll og pitch for gjeldende draft ${fmtUnitValue(getDraftMetersFromHydro(currentHydro), 3, "m")}.`;
    if (hydroDraftCaption) hydroDraftCaption.textContent = "Deplasement som funksjon av draft fra referansebunn.";

    if (hydroReportTable) {
      const rows = [
        ["Geometri-kilde", currentHydro?.source || analysisState.geometrySource || analysisState.source || "Ukjent"],
        ["Vann-tetthet", Number.isFinite(currentHydro?.waterDensity) ? `${Math.round(currentHydro.waterDensity)} kg/m^3` : "–"],
        ["Materialhint", analysisState.materialHint ? describeMaterialHint(analysisState.materialHint) : "Ingen"],
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

    drawHydroCurveChart(hydroReportCurve, payload);
    drawDraftScanChart(hydroReportDraftCurve, payload);
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

  function postHydroVisibilityToViewer() {
    postViewerCommandToViewer("set-hydro-visibility", {
      waterline: chkHydroWaterline?.checked !== false,
      contour: chkHydroContour?.checked !== false,
      markers: { cg: chkHydroMarkers?.checked !== false, cb: chkHydroMarkers?.checked !== false },
    });
  }

  function applyHydroControlsToViewer({ includeDraftPose = true, silentEstimate = false } = {}) {
    postHydroVisibilityToViewer();
    postViewerCommandToViewer("set-hydro-state", collectHydroCommandPayload({ includeDraftPose }));
    if (!silentEstimate) buildHydroReport();
  }

  function requestHydroReport() {
    const viewerHydro = getViewerHydroData();
    if (viewerHydro?.supported) {
      reportState.isGenerating = true;
      if (btnHydroReport) {
        btnHydroReport.disabled = true;
        btnHydroReport.textContent = "Genererer rapport...";
      }
      updateHydroPanels();
      postViewerCommandToViewer("generate-hydro-report", {
        ...collectHydroCommandPayload({ includeDraftPose: true }),
        fileName: displayFileName || fileName || "Hydro-modell",
      });
      return;
    }

    const estimate = analysisState.latestHydroEstimate || buildHydroEstimateFromBbox();
    const payload = buildEstimatedReportPayload(estimate);
    if (!payload) return;
    reportState.payload = payload;
    renderHydroReportModal(payload);
    openHydroReportModal();
  }

  function updateHydroSourceText() {
    const snapshot = getActiveHydroSnapshot();
    const active = snapshot.hydro;
    const geometrySource = active?.source || analysisState.geometrySource || analysisState.source || "Ingen geometri enda";
    const liveLabel = snapshot.mode === "viewer" ? "Live hydro fra aktiv viewer." : "Hydro bygger forelopig pa sidebar-estimat.";
    const waterlineLabel = snapshot.mode === "viewer"
      ? `Vannlinje/markorer styres i ${geometrySource}.`
      : "Vannlinje i sidebaren trenger en viewer med hydrostotte for live oppdatering.";
    if (hydroSource) {
      hydroSource.textContent = `Geometri: ${geometrySource}. Enheter: ${analysisState.units || "m"}. ${liveLabel} ${waterlineLabel}`;
    }
    if (hydroMaterialHint) {
      hydroMaterialHint.textContent = analysisState.materialHint
        ? `Materialhint: ${describeMaterialHint(analysisState.materialHint)}${analysisState.materialHintSource ? ` (${analysisState.materialHintSource})` : ""}. Tetthet i panelet brukes i viewer/mesh-masse der det er mulig.`
        : "Materiale: bruker valgt tetthet i panelet.";
    }
  }

  let componentState = { items: [], mode: "cad" };

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
    const kgFrac = clampNumber(inpKgFrac?.value, 0, 1, 0.55);
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
    const kg = Number.isFinite(viewerMass?.kgWorld)
      ? viewerMass.kgWorld
      : viewerCg && Number.isFinite(viewerCg.z)
        ? viewerCg.z
        : draftMeters > 0
          ? minZ + draftMeters * kgFrac
          : null;
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
      .filter((token) => !/^(copy|part|delen?|component|mesh|solid)$/.test(token))
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

  function renderComponentList(items, mode) {
    componentState = {
      items: (items || []).slice(0, 200).map((item, idx) => normalizeComponentItem(item, idx)),
      mode
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
        if (dated) items.push(`<li>Intern container-timestamp (eksempel): ${dosToIso(dated.dosDate, dated.dosTime)}</li>`);
        if (ext === "3mf" || ext === "3fm") {
          const modelFiles = zip.entries.filter(e => /(^|\/)3d\/.*\.model$/i.test(e.name));
          items.push(`<li>3MF model-filer funnet: ${modelFiles.length}</li>`);
        }
        if (["f3d", "f3z", "3fz", "fbm"].includes(ext)) {
          try {
            const fusionMeta = await extractFusionComponentData(ab);
            if (fusionMeta?.components?.length) {
              items.push(`<li>Fusion-komponenter fra metadata: ${fusionMeta.components.length.toLocaleString("nb-NO")}</li>`);
              if (fusionMeta.rootName) items.push(`<li>Rotdesign: <b>${escapeHtml(fusionMeta.rootName)}</b></li>`);
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
      if (stepHint?.lengthUnit && !["mm", "cm", "dm"].includes(analysisState.units)) {
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
    details.textContent = extra.join("\n");
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
    addMeta("3D-kandidat", basenameFromUrl(getActivePreviewCandidate()) || "Ingen kandidat funnet");
    if (getActiveStlCandidate()) addMeta("STL-kandidat", basenameFromUrl(getActiveStlCandidate()));
    if (getActiveStepCandidate()) addMeta("STEP-kandidat", basenameFromUrl(getActiveStepCandidate()));

    const headRes = await fetchHeadCached(decodedFile);
    if (headRes && headRes.ok) {
      const size = Number(headRes.headers.contentLength);
      const type = headRes.headers.contentType || "ukjent";
      const mod = headRes.headers.lastModified;
      addMeta("Størrelse", fmtBytes(size));
      addMeta("Content-Type", type);
      addMeta("Sist endret", mod ? new Date(mod).toLocaleString("nb-NO") : "ukjent");
      timeline.textContent = mod
        ? `Timeline: siste registrerte endring ${new Date(mod).toLocaleString("nb-NO")} (fra HTTP Last-Modified).`
        : "Timeline: ingen Last-Modified tilgjengelig for denne filen.";
    } else {
      addMeta("Metadata", "HEAD ikke tilgjengelig");
      timeline.textContent = "Timeline: serveren ga ikke metadata via HEAD.";
    }

    const canRead = !!(headRes && headRes.ok);
    setDisabled(btnStl, !canRead || !CAD_EXT.has(ext), !canRead ? "Filen kunne ikke hentes (HEAD feilet)." : "Ikke relevant for denne filtypen.");
    setDisabled(btnBambu, !canRead || !BAMBU_EXT.has(ext), !canRead ? "Filen kunne ikke hentes (HEAD feilet)." : "Bambu støtter primært STL/3MF/OBJ.");
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
      renderComponentList(items, data.mode || "mesh");
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
      } else {
        analysisState.latestViewerHydro = null;
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
      reportState.payload = data.payload;
      analysisState.latestViewerReport = data.payload;
      analysisState.latestViewerMassProperties = data.payload.currentHydro?.massProperties || analysisState.latestViewerMassProperties;
      if (data.payload.currentHydro?.supported) {
        analysisState.latestViewerHydro = data.payload.currentHydro;
        syncHydroControlsFromViewer(data.payload.currentHydro);
      }
      if (btnHydroReport) {
        btnHydroReport.disabled = false;
        btnHydroReport.textContent = "Vis rapport";
      }
      renderHydroReportModal(data.payload);
      openHydroReportModal();
      updateHydroPanels();
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
  syncDrawerForViewport();
  updateHydroPanels();
  updateExplodeUi();
  run().finally(() => loadIntegratedViewer());
})();
