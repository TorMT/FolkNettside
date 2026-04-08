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
  const analysisState = { bbox: null, solidVolumeM3: null, source: "none", units: "m" };
  const MATERIAL_DENSITY = { steel: 7850, aluminum: 2700, grfp: 1850, wood: 600 };
  const CAD_EXT = new Set(["stl", "obj", "step", "stp", "iges", "igs", "3mf", "3fm", "f3d", "f3z", "fbm", "fm3", "sat", "smt", "x_t", "x_b", "sldprt", "sldasm"]);
  const BAMBU_EXT = new Set(["stl", "3mf", "3fm", "obj"]);
  const inpRhoWater = document.getElementById("inpRhoWater");
  const selMaterial = document.getElementById("selMaterial");
  const inpRhoMat = document.getElementById("inpRhoMat");
  const inpKgFrac = document.getElementById("inpKgFrac");
  const inpCb = document.getElementById("inpCb");
  const inpThicknessMm = document.getElementById("inpThicknessMm");
  const btnHydroCalc = document.getElementById("btnHydroCalc");
  const hydroWarn = document.getElementById("hydroWarn");
  const hydroReport = document.getElementById("hydroReport");

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
  let stlCandidate = (() => {
    const m = decodedFile.match(/^([^?#]+)([?#].*)?$/);
    const base = m?.[1] || decodedFile;
    const tail = m?.[2] || "";
    return `${base.replace(/\.[^.\/]+$/i, ".stl")}${tail}`;
  })();
  let resolvedStlCandidate = stlCandidate;
  let resolvedPreviewCandidate = "";

  btnRaw.href = decodedFile;
  headline.textContent = `Fil: ${fileName} (.${ext || "ukjent"})`;
  if (viewerTitle) viewerTitle.textContent = fileName || "3D-modell";

  function getActiveStlCandidate() {
    return resolvedStlCandidate || stlCandidate;
  }
  function getActivePreviewCandidate() {
    return resolvedPreviewCandidate || getActiveStlCandidate() || decodedFile;
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
    const preferred = getActiveStlCandidate();
    try {
      const exact = await fetch(preferred, { method: "HEAD", cache: "no-store" });
      if (exact.ok) {
        resolvedStlCandidate = preferred;
        return resolvedStlCandidate;
      }
    } catch {}

    try {
      const basePath = clean.replace(/[^\/]+$/, "");
      if (!basePath) return preferred;
      const indexUrl = `${basePath}index.json`;
      const res = await fetch(indexUrl, { cache: "no-store" });
      if (!res.ok) return preferred;
      const data = await res.json();
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
  async function resolveSiblingPreviewCandidate() {
    try {
      const basePath = clean.replace(/[^\/]+$/, "");
      if (!basePath) return getActivePreviewCandidate();
      const indexUrl = `${basePath}index.json`;
      const res = await fetch(indexUrl, { cache: "no-store" });
      if (!res.ok) return getActivePreviewCandidate();
      const data = await res.json();
      const siblingFiles = [];
      Object.entries(data || {}).forEach(([, value]) => {
        if (!value || !Array.isArray(value.files)) return;
        value.files.forEach((file) => {
          if (typeof file !== "string") return;
          if (/\.(3mf|3fm|fm3|stl)(?:$|[?#])/i.test(file)) siblingFiles.push(file);
        });
      });
      const unique = [...new Set(siblingFiles)];
      if (!unique.length) return getActivePreviewCandidate();

      const sourceStem = (fileName || "").replace(/\.[^.]+$/i, "").toLowerCase();
      const ranked = unique.map((name) => {
        const lower = String(name).toLowerCase();
        const extWeight =
          /\.3mf(?:$|[?#])/.test(lower) ? 400 :
          /\.3fm(?:$|[?#])/.test(lower) ? 390 :
          /\.fm3(?:$|[?#])/.test(lower) ? 380 :
          /\.stl(?:$|[?#])/.test(lower) ? 300 : 0;
        return { name, score: extWeight + candidateScore(name, sourceStem) };
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
    const cacheBust = "20260408e";
    const hasConfirmedStlPreview = analysisState.source === "STL-kandidat (binary mesh)";
    const previewCandidate = getActivePreviewCandidate();
    if (["3mf", "3fm", "fm3"].includes(lowerExt)) viewerPath = "/includes/kodeLesere/3mfhydro.html";
    else if (["fbm"].includes(lowerExt)) viewerPath = "/includes/kodeLesere/fbmview.html";
    else if (["f3d", "f3z", "3fz"].includes(lowerExt)) {
      if (/\.(3mf|3fm|fm3)(?:$|[?#])/i.test(previewCandidate)) {
        viewerPath = "/includes/kodeLesere/3mfhydro.html";
        targetUrl = previewCandidate;
      } else if (/\.(stl)(?:$|[?#])/i.test(previewCandidate) || hasConfirmedStlPreview) {
        viewerPath = "/includes/kodeLesere/stlview.html";
        targetUrl = /\.(stl)(?:$|[?#])/i.test(previewCandidate) ? previewCandidate : getActiveStlCandidate();
      } else {
        viewerPath = "/includes/kodeLesere/f3dview.html";
      }
    }
    else if (["step", "stp", "iges", "igs", "obj", "ply", "fbx", "gltf", "glb", "sat", "smt", "x_t", "x_b", "sldprt", "sldasm", "slddrw"].includes(lowerExt)) viewerPath = "/includes/kodeLesere/f3dview.html";
    else if (!["stl"].includes(lowerExt)) targetUrl = getActiveStlCandidate();
    const extras = [];
    extras.push(`v=${cacheBust}`);
    if (viewerPath.endsWith("/f3dview.html")) {
      extras.push(`sourceFile=${encodeURIComponent(decodedFile)}`);
      extras.push(`stlCandidate=${encodeURIComponent(getActiveStlCandidate())}`);
      extras.push(`sourceExt=${encodeURIComponent(lowerExt)}`);
    }
    return `${viewerPath}?file=${encodeURIComponent(targetUrl)}&embedded=1${extras.length ? `&${extras.join("&")}` : ""}`;
  }

  function isCompactViewport() {
    return window.matchMedia("(max-width: 1180px)").matches;
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

  function setDrawerOpen(open) {
    if (!drawer || !btnToggleDrawer) return;
    drawer.classList.toggle("is-open", !!open);
    if (drawerBackdrop) drawerBackdrop.hidden = !(!!open && isCompactViewport());
    btnToggleDrawer.textContent = open ? "Skjul filbehandler ☰" : "Vis filbehandler ☰";
  }

  function loadIntegratedViewer() {
    if (!viewerFrame) return;
    if (viewerLoading) viewerLoading.classList.remove("is-hidden");
    viewerFrame.onload = () => {
      if (viewerLoading) viewerLoading.classList.add("is-hidden");
      postThemeToViewer();
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

  btnStl.onclick = () => loadIntegratedViewer();
  btnToggleDrawer && (btnToggleDrawer.onclick = () => setDrawerOpen(!drawer?.classList.contains("is-open")));
  drawerBackdrop && drawerBackdrop.addEventListener("click", () => setDrawerOpen(false));
  window.addEventListener("resize", () => {
    if (!isCompactViewport()) setDrawerOpen(true);
    else if (drawerBackdrop) drawerBackdrop.hidden = !drawer?.classList.contains("is-open");
  });

  function setTab(tabName) {
    const showOverview = tabName !== "hydro";
    infoCard.style.display = showOverview ? "" : "none";
    toolsCard.style.display = showOverview ? "" : "none";
    componentsCard.style.display = showOverview ? "" : "none";
    hydroCard.style.display = showOverview ? "none" : "";
    btnTabOverview.classList.toggle("active", showOverview);
    btnTabHydro.classList.toggle("active", !showOverview);
  }
  btnTabOverview.onclick = () => setTab("overview");
  btnTabHydro.onclick = () => setTab("hydro");
  setTab("overview");

  btnFusion.onclick = () => window.open("https://myhub.autodesk360.com/", "_blank", "noopener");

  btnBambu.onclick = () => {
    const url = decodedFile;
    const schemeUrl = `bambustudio://open?url=${encodeURIComponent(url)}`;
    const win = window.open(schemeUrl, "_self");
    setTimeout(() => {
      if (!win) window.open("https://bambulab.com/en/download/studio", "_blank", "noopener");
    }, 350);
  };

  btnToggleInfo.onclick = () => {
    infoCard.style.display = infoCard.style.display === "none" ? "" : "none";
  };
  btnToggleTools.onclick = () => {
    toolsCard.style.display = toolsCard.style.display === "none" ? "" : "none";
  };
  selMaterial.onchange = () => {
    if (selMaterial.value !== "custom") inpRhoMat.value = String(MATERIAL_DENSITY[selMaterial.value] || 7850);
  };

  function addMeta(label, value) {
    const el = document.createElement("div");
    el.className = "kv";
    el.innerHTML = `<span class="muted">${label}</span><span>${value}</span>`;
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

  function parseStep(text) {
    const fileNameMatch = text.match(/FILE_NAME\s*\(([\s\S]*?)\)\s*;/i);
    const schemaMatch = text.match(/FILE_SCHEMA\s*\(([\s\S]*?)\)\s*;/i);
    const productMatches = text.match(/PRODUCT\s*\(/gi) || [];
    const advancedFaceMatches = text.match(/ADVANCED_FACE\s*\(/gi) || [];
    const productNameMatches = [...text.matchAll(/PRODUCT\s*\(\s*'([^']*)'/gi)].map(m => m[1]).filter(Boolean);
    return {
      fileName: fileNameMatch ? fileNameMatch[1].replace(/\s+/g, " ").slice(0, 250) : null,
      schema: schemaMatch ? schemaMatch[1].replace(/\s+/g, " ").slice(0, 200) : null,
      products: productMatches.length,
      faces: advancedFaceMatches.length,
      productNames: productNameMatches
    };
  }

  function renderChosenMuted() {
    const chosen = [...chosenSet].slice(0, 12).join(", ") || "–";
    const muted = [...mutedSet].slice(0, 12).join(", ") || "–";
    chosenMuted.textContent = `Chosen: ${chosen} | Muted: ${muted}`;
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
      const res = await fetch(candidate, { cache: "no-store" });
      if (!res.ok) return false;
      const ab = await res.arrayBuffer();
      const parsed = parseBinaryStlBboxAndVolume(ab);
      if (!parsed?.bbox) return false;
      analysisState.bbox = parsed.bbox;
      analysisState.solidVolumeM3 = parsed.solidVolume;
      analysisState.source = "STL-kandidat (binary mesh)";
      return true;
    } catch {
      return false;
    }
  }

  function buildHydroReport() {
    const b = analysisState.bbox;
    if (!b) {
      hydroWarn.textContent = "Hydrostatikk krever minst bbox-data (f.eks. STL/OBJ med lesbar geometri).";
      hydroReport.textContent = "Ingen hydrostatikk beregnet.";
      return;
    }
    const L = Math.max(0, b.maxX - b.minX);
    const B = Math.max(0, b.maxY - b.minY);
    const D = Math.max(0, b.maxZ - b.minZ);
    const rhoW = Number(inpRhoWater.value || 1025);
    const rhoM = Number(inpRhoMat.value || 7850);
    const kgFrac = Math.min(1, Math.max(0, Number(inpKgFrac.value || 0.55)));
    const Cb = Math.min(1, Math.max(0.1, Number(inpCb.value || 0.6)));
    const t = Math.max(0, Number(inpThicknessMm.value || 0)) / 1000;
    const shellArea = 2 * (L * B + L * D + B * D);
    const shellVol = t > 0 ? shellArea * t : 0;
    const estSolidVol = analysisState.solidVolumeM3 ?? (L * B * D * Cb);
    const massKg = rhoM * (shellVol > 0 ? shellVol : estSolidVol);
    const dispVol = massKg / Math.max(1e-9, rhoW);
    const draft = Math.min(D, dispVol / Math.max(1e-9, L * B));
    const Awp = L * B;
    const It = (L * Math.pow(B, 3)) / 12;
    const Il = (B * Math.pow(L, 3)) / 12;
    const BMt = It / Math.max(1e-9, dispVol);
    const BMl = Il / Math.max(1e-9, dispVol);
    const KB = draft / 2;
    const KG = kgFrac * D;
    const GMT = KB + BMt - KG;
    const GML = KB + BMl - KG;
    hydroWarn.textContent = "Merknad: Beregningene antar homogen geometri og samme stofftype i hele modellen (med mindre du eksplisitt modellerer skall-tykkelse).";
    hydroReport.textContent =
`HydroStat-rapport (estimat)
Kilde: ${analysisState.source}
Enhetsantakelse: ${analysisState.units} (ikke auto-verifisert)

Dimensjoner:
L=${fmt(L)}  B=${fmt(B)}  D=${fmt(D)}

Input:
rho_vann=${fmt(rhoW,1)} kg/m3
rho_material=${fmt(rhoM,1)} kg/m3
KG-fraksjon=${fmt(kgFrac,2)}
Cb(fallback)=${fmt(Cb,2)}
skall-tykkelse=${fmt(t*1000,2)} mm

Volum/masser:
solid_volum_est=${fmt(estSolidVol,6)} m3
skall_volum_est=${fmt(shellVol,6)} m3
masse_est=${fmt(massKg,2)} kg
deplasement_volum=${fmt(dispVol,6)} m3
draft_est=${fmt(draft,3)} m

Stabilitet:
KB=${fmt(KB,3)} m
BMt=${fmt(BMt,3)} m
BMl=${fmt(BMl,3)} m
KG=${fmt(KG,3)} m
GMT=${fmt(GMT,3)} m
GML=${fmt(GML,3)} m`;
  }

  let componentState = { items: [], mode: "cad" };

  function escapeHtml(str) {
    return String(str || "").replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));
  }

  function renderComponentList(items, mode) {
    componentState = { items: (items || []).slice(0, 200), mode };
    renderFilteredComponents();
  }

  function renderFilteredComponents() {
    const filter = (componentFilter?.value || "").trim().toLowerCase();
    const filtered = componentState.items.filter((name) => String(name).toLowerCase().includes(filter));
    if (!filtered.length) {
      components.textContent = filter ? "Ingen komponenter matcher filteret." : "Ingen komponentnavn funnet i denne filtypen.";
      renderChosenMuted();
      return;
    }

    const safe = filtered.map(escapeHtml);
    const lis = safe.map((name, idx) => `<li class="comp-row"><button data-comp="${idx}" class="btn comp-main">${name}</button><button class="btn" data-choose="${idx}">Chosen</button><button class="btn" data-mute="${idx}">Muted</button></li>`).join("");
    components.innerHTML = `
      <div class="muted muted-box" style="margin-bottom:8px;">
        ${componentState.mode === "mesh"
          ? "Komponent-highlighting i 3D er mulig når filen åpnes i en mesh-viewer som støtter separate grupper/materialer."
          : "Komponentnavn hentet fra filstruktur. Full 3D-highlighting krever viewer med scenegraph-støtte."}
      </div>
      <ul class="comp-list">${lis}</ul>
    `;

    components.querySelectorAll("button[data-choose]").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-choose"));
        const name = safe[idx];
        if (chosenSet.has(name)) chosenSet.delete(name); else chosenSet.add(name);
        mutedSet.delete(name);
        renderChosenMuted();
      });
    });
    components.querySelectorAll("button[data-mute]").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-mute"));
        const name = safe[idx];
        if (mutedSet.has(name)) mutedSet.delete(name); else mutedSet.add(name);
        chosenSet.delete(name);
        renderChosenMuted();
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
      const res = await fetch(decodedFile, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      ab = await res.arrayBuffer();
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
      }
      renderComponentList(compNames, "mesh");
    } else if (ext === "step" || ext === "stp") {
      const step = parseStep(decodeText(ab));
      items.push(`<li>STEP entities: PRODUCT=${step.products.toLocaleString("nb-NO")}, ADVANCED_FACE=${step.faces.toLocaleString("nb-NO")}</li>`);
      if (step.schema) items.push(`<li>Schema: ${step.schema}</li>`);
      if (step.fileName) items.push(`<li>FILE_NAME-data: ${step.fileName}</li>`);
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
        renderComponentList(zip.entries.map(e => e.name), "cad");
      }
    } else {
      items.push("<li>Komponent-sjekk: full struktur/timeline for Fusion krever Autodesk API eller eksport til STL/STEP.</li>");
      renderComponentList([], "cad");
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
    addMeta("Filnavn", fileName || "ukjent");
    addMeta("Filtype", ext || "ukjent");
    await resolveSiblingPreviewCandidate();
    await resolveSiblingStlCandidate();
    addMeta("3D-preview", getActivePreviewCandidate().split("/").pop());
    addMeta("STL-kandidat", getActiveStlCandidate().split("/").pop());

    let headRes = null;
    try { headRes = await fetch(decodedFile, { method: "HEAD", cache: "no-store" }); } catch {}
    if (headRes && headRes.ok) {
      const size = Number(headRes.headers.get("content-length"));
      const type = headRes.headers.get("content-type") || "ukjent";
      const mod = headRes.headers.get("last-modified");
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
  btnHydroCalc.onclick = () => buildHydroReport();
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
  setDrawerOpen(!isCompactViewport());
  run().finally(() => loadIntegratedViewer());
})();
