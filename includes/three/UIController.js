
// /includes/three/UIController.js
// Kobler HTML-UI til modulene: STLViewerCore, HydroStatikk, ClippingController, MeasureController, AlignHelpers.
// Bruk: 
//   const ui = new UIController();
//   ui.init(core, hydro, clipper, measure, alignHelpers); // alignHelpers = AlignHelpers-klassen
//   // deretter kaller du ui.afterModelLoaded({ mesh, geometry, volume, centroidLocal, modelUrl });
//
// Forutsetter at stlViewer.html har ID-ene under (samme som i stor-fila).

import * as THREE from "./three.module.js";
import { AlignHelpers } from "./AlignHelpers.js";

export class UIController {
  constructor() {
    // Element-lager (id -> element)
    this.el = {};

    // HUD
    this.hud = null;
    this._hudTimer = null;

    // Moduler
    this.core = null;
    this.hydro = null;
    this.clipper = null;
    this.measure = null;

    // i18n / help
    this.helpData = null;
    this.lang = "no";

    // Chips
    this.chips = {};

    // State for units (kun visning)
    this.unitLabel = "units";

    // Snapshot skala
    this.snapshotScaleSel = null;

    // Bindere
    this._bindMenuToggles = this._bindMenuToggles.bind(this);
  }

  // ---------- Init og wiring ----------

  /**
   * @param {any} core
   * @param {any} hydro
   * @param {any} clipper
   * @param {any} measure
   * @param {{helpData?: any, lang?: string}} [options]
   */
  init(core, hydro, clipper, measure, options = {}) {
    this.core = core;
    this.hydro = hydro;
    this.clipper = clipper;
    this.measure = measure;

    this.helpData = options.helpData || null;
    this.lang = options.lang || "no";

    // Registrer alle UI elementer
    const IDS = {
      // toppbar
      hud: "hud",
      btnMobileMenu: "btnMobileMenu",
      btnFit: "btnFit",
      btnReset: "btnReset",
      btnZoomIn: "btnZoomIn",
      btnZoomOut: "btnZoomOut",
      btnDownload: "btnDownload",

      // Align
      btnAutoAlign: "btnAutoAlign",
      btnAlignReset: "btnAlignReset",
      btnSwapYZ: "btnSwapYZ",
      btnSwapXZ: "btnSwapXZ",
      btnSwapXY: "btnSwapXY",

      // View
      selView: "selView",
      chkAuto: "chkAuto",
      selAutoSpeed: "selAutoSpeed",
      selRotAxis: "selRotAxis",
      selRotStep: "selRotStep",
      numRotDeg: "numRotDeg",
      btnRotApply: "btnRotApply",
      btnRotApplyFree: "btnRotApplyFree",
      btnRotZero: "btnRotZero",
      chkAxes: "chkAxes",

      // Render
      chkWire: "chkWire",
      chkEdges: "chkEdges",
      selShade: "selShade",
      rngOpacity: "rngOpacity",
      txtOpacity: "txtOpacity",
      chkBBox: "chkBBox",
      colBBox: "colBBox",
      rngBBoxW: "rngBBoxW",
      txtBBoxW: "txtBBoxW",

      // Look
      colBg: "colBg",
      colModel: "colModel",
      btnUseThemeColor: "btnUseThemeColor",

      // Tools / Clipping
      chkClip: "chkClip",
      chkClipInv: "chkClipInv",
      selClipAxis: "selClipAxis",
      rngClip: "rngClip",
      txtClip: "txtClip",

      // Tools / Measure
      chkMeasure: "chkMeasure",
      btnClearMeasure: "btnClearMeasure",
      selSnap: "selSnap",
      rngSnapTol: "rngSnapTol",
      txtSnapTol: "txtSnapTol",

      // Units
      selUnits: "selUnits",

      // Hydro (world)
      chkWL: "chkWL",
      rngDraft: "rngDraft",
      txtDraft: "txtDraft",
      rngTrim: "rngTrim",
      txtTrim: "txtTrim",
      rngHeel: "rngHeel",
      txtHeel: "txtHeel",
      btnHydroZero: "btnHydroZero",
      selHydroQ: "selHydroQ",
      btnRecalc: "btnRecalc",
      txtHydroStatus: "txtHydroStatus",

      // Info
      txtDims: "txtDims",
      txtDims2: "txtDims2",
      txtVol: "txtVol",
      txtCG: "txtCG",
      txtSubV: "txtSubV",
      txtDisp: "txtDisp",
      txtCB: "txtCB",

      chkShowCG: "chkShowCG",
      chkShowCB: "chkShowCB",

      // Export
      btnSnap: "btnSnap",
      selSnapScale: "selSnapScale",

      // Help (ny struktur)
      helpNav: "helpNav",
      helpContent: "helpContent",

      // Chips
      chipRender: "chipRender",
      chipLook: "chipLook",
      chipView: "chipView",
      chipExport: "chipExport",
      chipHydro: "chipHydro",
    };
    Object.entries(IDS).forEach(([k, id]) => (this.el[k] = document.getElementById(id)));

    // Chips cache (kan mangle dersom HTML ikke har dem)
    this.chips = {
      render: this.el.chipRender,
      look: this.el.chipLook,
      view: this.el.chipView,
      export: this.el.chipExport,
      hydro: this.el.chipHydro,
    };

    this.hud = this.el.hud;
    this.snapshotScaleSel = this.el.selSnapScale;

    // Menyer (dropdowns)
    this._bindMenuToggles();
    this._bindMobileToolbarToggle();

    // Help (i18n)
    this._bindHelpMenu();

    // Knapper og kontroller
    this._wireCoreView();
    this._wireRenderLook();
    this._wireClipping();
    this._wireMeasure();
    this._wireUnits();
    this._wireHydro();

    // Align-knapper (krever geometry etter load; selve click-binding her)
    this._wireAlign();

    // Snapshot / download
    this._wireExport();

    // Tastatursnarvei for zoom
    window.addEventListener("keydown", (e) => {
      if (e.key === "+" || e.key === "=") this.core.zoomBy(1.12);
      if (e.key === "-" || e.key === "_") this.core.zoomBy(1 / 1.12);
    });
  }

  // Kalles etter at modellen er lastet (for å oppdatere info og init-state)
  afterModelLoaded({ mesh, geometry, volume, centroidLocal, modelUrl }) {
    // Info-panel
    this._updateDimsUI();
    this._updateTotalVolUI(volume);
    this._updateCGUI(centroidLocal);

    // Hydro
    this.hydro.setCGLocal(centroidLocal);
    this.hydro.setWaterlineVisible(false);
    this.hydro.initDraftAtBottom();
    this._updateDraftText(this.hydro.draftZWorld);
    this._updateHydroUI();

    // Clipper
    this.clipper.setMesh(mesh);
    this.clipper.setEnabled(this.el.chkClip?.checked);
    this.clipper.setAxis(this.el.selClipAxis?.value || "x");
    this.clipper.setInvert(this.el.chkClipInv?.checked);
    this.clipper.setSlider(parseFloat(this.el.rngClip?.value || "0"));

    // Measure
    this.measure.setMesh(mesh);
    this.measure.setEnabled(this.el.chkMeasure?.checked);
    this.measure.setSnapMode(this.el.selSnap?.value || "none");
    this.measure.setSnapTolerance(parseFloat(this.el.rngSnapTol?.value || "0.010"));

    // Farger / opacity
    this._applyBg(this.el.colBg?.value || "#ffffff");
    this._applyModelColor(this.el.colModel?.value || "#5da9ff");
    this._applyOpacity(this.el.rngOpacity?.value || "1");

    // View
    this.core.setPresetView("iso");
    this.core.fitToModel();
    this.core.setAxesVisible(this.el.chkAxes?.checked);

    // HUD
    this.setHud(`STL lastet ✅<br><small>Drag=roter, scroll=zoom, høyre=pan</small>`, 2500);

    // Last ned-knappen trenger URL
    this._modelUrl = modelUrl;
  }

  // ---------- Kjerne-wiring: View ----------

  _wireCoreView() {
    const el = this.el;

    el.btnFit?.addEventListener("click", () => this.core.fitToModel());
    el.btnReset?.addEventListener("click", () => this.core.resetView());
    el.btnZoomIn?.addEventListener("click", () => this.core.zoomBy(1.20));
    el.btnZoomOut?.addEventListener("click", () => this.core.zoomBy(1 / 1.20));

    el.selView?.addEventListener("change", (e) => this.core.setPresetView(e.target.value));
    el.chkAuto?.addEventListener("change", (e) => this.core.setAutoRotate(e.target.checked));
    el.selAutoSpeed?.addEventListener("change", (e) => this.core.setAutoRotateSpeed(e.target.value));

    // Roter modell (bruker-rotasjon – ikke hydro)
    el.btnRotApply?.addEventListener("click", () => {
      const axis = el.selRotAxis?.value || "z";
      const deg = parseFloat(el.selRotStep?.value || "90");
      this._applyUserRotate(axis, deg);
      this.setHud("Roterte modellen", 1000);
    });
    el.btnRotApplyFree?.addEventListener("click", () => {
      const axis = el.selRotAxis?.value || "z";
      const deg = parseFloat(el.numRotDeg?.value || "0");
      this._applyUserRotate(axis, deg);
      this.setHud("Roterte modellen", 1000);
    });
    el.btnRotZero?.addEventListener("click", () => {
      this.core.userRotGroup.rotation.set(0, 0, 0);
      this.core.hydroRotGroup.rotation.set(0, 0, 0);
      this.hydro.updateWaterPlane();
      this.hydro.scheduleRecalc();
      this.core.fitToModel();
      this.setHud("Rotasjon nullstilt", 1200);
    });

    el.chkAxes?.addEventListener("change", (e) => this.core.setAxesVisible(e.target.checked));
  }

  _applyUserRotate(axis, deg) {
    const rad = THREE.MathUtils.degToRad(Number(deg) || 0);
    if (axis === "x") this.core.userRotGroup.rotation.x += rad;
    if (axis === "y") this.core.userRotGroup.rotation.y += rad;
    if (axis === "z") this.core.userRotGroup.rotation.z += rad;
    this.hydro.updateWaterPlane();  // WL er world, men må re-sentrere x/y
    this.hydro.scheduleRecalc();
    this.core.fitToModel();
  }

  // ---------- Render/Look ----------

  _wireRenderLook() {
    const el = this.el;

    el.chkWire?.addEventListener("change", (e) => {
      const m = this.core.mesh?.material;
      if (!m) return;
      const mats = Array.isArray(m) ? m : [m];
      for (const mat of mats) { mat.wireframe = !!e.target.checked; mat.needsUpdate = true; }
    });

    el.chkEdges?.addEventListener("change", (e) => this._rebuildEdges(e.target.checked));

    el.selShade?.addEventListener("change", (e) => {
      const flat = e.target.value === "flat";
      const m = this.core.mesh?.material;
      if (!m || !this.core.mesh?.geometry) return;
      const mats = Array.isArray(m) ? m : [m];
      for (const mat of mats) { mat.flatShading = flat; mat.needsUpdate = true; }
      this.core.mesh.geometry.computeVertexNormals();
      this.core.mesh.geometry.attributes.normal.needsUpdate = true;
      this._rebuildEdges(this.el.chkEdges?.checked);
    });

    el.colBg?.addEventListener("input", (e) => this._applyBg(e.target.value));
    el.colModel?.addEventListener("input", (e) => this._applyModelColor(e.target.value));
    el.rngOpacity?.addEventListener("input", (e) => this._applyOpacity(e.target.value));

    el.chkBBox?.addEventListener("change", (e) => this._rebuildBBox(e.target.checked));
    el.colBBox?.addEventListener("input", (e) => {
      if (this._bbox) this._bbox.material.color = new THREE.Color(e.target.value);
    });
    el.rngBBoxW?.addEventListener("input", (e) => {
      el.txtBBoxW.textContent = e.target.value;
      this._rebuildBBox(el.chkBBox?.checked);
    });

    el.btnUseThemeColor?.addEventListener("click", () => {
      const primary = this._cssVar("--primary", "#2f6fed");
      el.colModel.value = primary;
      this._applyModelColor(primary);
      this.setHud("Modellfarge = theme primary", 1300);
    });
  }

  _applyBg(hex) { this.core.setBackground(hex); }

  _applyModelColor(hex) {
    const m = this.core.mesh?.material;
    if (!m) return;
    const mats = Array.isArray(m) ? m : [m];
    for (const mat of mats) mat.color = new THREE.Color(hex);
  }

  _applyOpacity(a) {
    const op = Math.max(0.05, Math.min(1, Number(a)));
    const m = this.core.mesh?.material;
    if (!m) return;
    const mats = Array.isArray(m) ? m : [m];
    for (const mat of mats) { mat.opacity = op; mat.transparent = op < 1; mat.needsUpdate = true; }
    if (this.el.txtOpacity) this.el.txtOpacity.textContent = op.toFixed(2);
  }

  _rebuildEdges(show) {
    // Sletter og genererer Edge overlay som i originalen
    if (this._edges) {
      this.core.hydroRotGroup.remove(this._edges);
      this._edges.geometry.dispose?.();
      this._edges.material.dispose?.();
      this._edges = null;
    }
    if (!show || !this.core.mesh) return;
    const eg = new THREE.EdgesGeometry(this.core.mesh.geometry, 25);
    const col = new THREE.Color(this._cssVar("--text-main", "#111111"));
    const lm = new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.55 });
    this._edges = new THREE.LineSegments(eg, lm);
    this.core.hydroRotGroup.add(this._edges);
  }

  _rebuildBBox(show) {
    if (this._bbox) {
      this.core.hydroRotGroup.remove(this._bbox);
      this._bbox.geometry.dispose?.();
      this._bbox.material.dispose?.();
      this._bbox = null;
    }
    if (!show || !this.core.mesh) return;

    const g = this.core.mesh.geometry;
    g.computeBoundingBox();
    const box = g.boundingBox;
    const min = box.min, max = box.max;

    const pts = [];
    const add = (a, b) => pts.push(a.x, a.y, a.z, b.x, b.y, b.z);

    const v000 = new THREE.Vector3(min.x, min.y, min.z);
    const v001 = new THREE.Vector3(min.x, min.y, max.z);
    const v010 = new THREE.Vector3(min.x, max.y, min.z);
    const v011 = new THREE.Vector3(min.x, max.y, max.z);
    const v100 = new THREE.Vector3(max.x, min.y, min.z);
    const v101 = new THREE.Vector3(max.x, min.y, max.z);
    const v110 = new THREE.Vector3(max.x, max.y, min.z);
    const v111 = new THREE.Vector3(max.x, max.y, max.z);

    add(v000, v100); add(v100, v101); add(v101, v001); add(v001, v000);
    add(v010, v110); add(v110, v111); add(v111, v011); add(v011, v010);
    add(v000, v010); add(v100, v110); add(v101, v111); add(v001, v011);

    const gg = new THREE.BufferGeometry();
    gg.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));

    const col = this.el.colBBox?.value || "#111111";
    const m = new THREE.LineBasicMaterial({ color: new THREE.Color(col) });

    this._bbox = new THREE.LineSegments(gg, m);
    this.core.hydroRotGroup.add(this._bbox);
  }

  // ---------- Clipping ----------

  _wireClipping() {
    const el = this.el;

    el.chkClip?.addEventListener("change", (e) => {
      this.clipper.setEnabled(e.target.checked);
      this.setHud(e.target.checked ? "Cutaway aktiv" : "Cutaway av", 1200);
    });

    el.selClipAxis?.addEventListener("change", (e) => {
      this.clipper.setAxis(e.target.value);
      // behold samme sliderverdi
      this.clipper.setSlider(parseFloat(el.rngClip?.value || "0"));
    });

    el.chkClipInv?.addEventListener("change", (e) => this.clipper.setInvert(e.target.checked));

    el.rngClip?.addEventListener("input", (e) => {
      const t = parseFloat(e.target.value);
      this.clipper.setSlider(t);
      if (el.txtClip) el.txtClip.textContent = t.toFixed(2);
    });
  }

  // ---------- Measure ----------

  _wireMeasure() {
    const el = this.el;

    el.chkMeasure?.addEventListener("change", (e) => this.measure.setEnabled(e.target.checked));
    el.btnClearMeasure?.addEventListener("click", () => this.measure.clear());
    el.selSnap?.addEventListener("change", (e) => this.measure.setSnapMode(e.target.value));

    el.rngSnapTol?.addEventListener("input", (e) => {
      const v = parseFloat(e.target.value);
      this.measure.setSnapTolerance(v);
      if (el.txtSnapTol) el.txtSnapTol.textContent = v.toFixed(3);
    });
  }

  // ---------- Units ----------

  _wireUnits() {
    this._updateUnitLabel();
    this.el.selUnits?.addEventListener("change", () => {
      this._updateUnitLabel();
      this._updateDimsUI();
      this._updateHydroUI();
      this._updateDraftText(this.hydro?.draftZWorld ?? 0);
    });
  }

  _unitFactor() {
    const sel = this.el.selUnits?.value;
    if (sel === "mm") return 1000;
    if (sel === "cm") return 100;
    if (sel === "m")  return 1;
    if (sel === "inch") return 39.3700787;
    return 1;
  }

  _updateUnitLabel() {
    const sel = this.el.selUnits?.value;
    this.unitLabel = (sel === "units") ? "units" : sel;
  }

  // ---------- Hydro ----------

  _wireHydro() {
    const el = this.el;

    el.chkWL?.addEventListener("change", (e) => {
      this.hydro.setWaterlineVisible(e.target.checked);
    });

    el.rngDraft?.addEventListener("input", (e) => {
      const z = this.hydro.setDraftFromSlider(e.target.value);
      this._updateDraftText(z);
    });

    el.rngTrim?.addEventListener("input", (e) => {
      const deg = parseFloat(e.target.value);
      this.hydro.setTrim(deg);
      el.txtTrim.textContent = `${deg.toFixed(1)}°`;
    });

    el.rngHeel?.addEventListener("input", (e) => {
      const deg = parseFloat(e.target.value);
      this.hydro.setHeel(deg);
      el.txtHeel.textContent = `${deg.toFixed(1)}°`;
    });

    el.btnHydroZero?.addEventListener("click", () => {
      el.rngTrim.value = "0";
      el.rngHeel.value = "0";
      this.hydro.zeroTrimHeel();
      el.txtTrim.textContent = "0.0°";
      el.txtHeel.textContent = "0.0°";
      this.setHud("Trim/heel nullstilt", 1200);
    });

    el.selHydroQ?.addEventListener("change", (e) => {
      this.hydro.setQuality(e.target.value);
      this.hydro.scheduleRecalc();
    });

    el.btnRecalc?.addEventListener("click", async () => {
      el.txtHydroStatus.textContent = "beregner…";
      await this.hydro.recompute();
      this._updateHydroUI();
    });

    // Marker toggles
    el.chkShowCG?.addEventListener("change", () => {
      this.hydro.setMarkersVisible(el.chkShowCG.checked, el.chkShowCB.checked);
    });
    el.chkShowCB?.addEventListener("change", () => {
      this.hydro.setMarkersVisible(el.chkShowCG.checked, el.chkShowCB.checked);
    });
  }

  _updateDraftText(zWorld) {
    const f = this._unitFactor();
    if (this.el.txtDraft) this.el.txtDraft.textContent = `${(zWorld * f).toFixed(2)} ${this.unitLabel}`;
  }

  _updateHydroUI() {
    const res = this.hydro.getLastResults() || {};
    const f = this._unitFactor();
    const Vu = (this.unitLabel === "mm") ? "mm³" :
               (this.unitLabel === "cm") ? "cm³" :
               (this.unitLabel === "inch") ? "in³" :
               (this.unitLabel === "m") ? "m³" : "u³";

    if (res.subV != null) {
      const Vdisp = res.subV * Math.pow(f, 3);
      if (this.el.txtSubV) this.el.txtSubV.textContent = `${Vdisp.toExponential(3)} ${Vu}`;
      if (this.el.txtDisp) this.el.txtDisp.textContent = `${Vdisp.toExponential(3)} ${Vu}`;
    } else {
      if (this.el.txtSubV) this.el.txtSubV.textContent = "–";
      if (this.el.txtDisp) this.el.txtDisp.textContent = "–";
    }

    if (res.cbW) {
      if (this.el.txtCB) this.el.txtCB.textContent = this._formatVector(res.cbW, f, this.unitLabel);
    } else {
      if (this.el.txtCB) this.el.txtCB.textContent = "–";
    }

    if (this.el.txtHydroStatus) this.el.txtHydroStatus.textContent = this.hydro.isBusy() ? "beregner…" : "ok";
  }

  // ---------- Align ----------

  _wireAlign() {
    const el = this.el;

    el.btnAutoAlign?.addEventListener("click", () => {
      const geo = this.core.mesh?.geometry;
      if (!geo) return;
      const qA = AlignHelpers.bestBoatAlignQuaternion(geo);
      this._applyAlignQuaternion(qA);
      this.setHud("Auto Align (Boat) brukt", 1800);
    });

    el.btnAlignReset?.addEventListener("click", () => {
      const qId = new THREE.Quaternion(); // identity
      this._applyAlignQuaternion(qId);
      this.setHud("Align reset", 1400);
    });

    el.btnSwapYZ?.addEventListener("click", () => {
      this._applySimpleSwap("yz");
      this.setHud("Swap Y/Z", 1200);
    });
    el.btnSwapXZ?.addEventListener("click", () => {
      this._applySimpleSwap("xz");
      this.setHud("Swap X/Z", 1200);
    });
    el.btnSwapXY?.addEventListener("click", () => {
      this._applySimpleSwap("xy");
      this.setHud("Swap X/Y", 1200);
    });
  }

  _applyAlignQuaternion(qAlign) {
    this.core.applyAlignQuaternion(qAlign);
    // Etter align må vi: oppdatere clip-bounds, edges/bbox, info, WL og hydro.
    this.clipper.refreshBounds();
    this.clipper.setSlider(parseFloat(this.el.rngClip?.value || "0"));
    this._rebuildEdges(this.el.chkEdges?.checked);
    this._rebuildBBox(this.el.chkBBox?.checked);
    this._updateDimsUI();
    this.hydro.initDraftAtBottom();
    this.hydro.updateWaterPlane();
    this.hydro.scheduleRecalc();
    this.core.setPresetView("iso");
    this.core.fitToModel();
  }

  _applySimpleSwap(type) {
    const qRot = AlignHelpers.createSwapQuaternion(type);
    const qNew = qRot.clone().multiply(this.core.baseAlign?.quaternion || new THREE.Quaternion());
    // siden baseAlign.quaternion ikke eksponeres direkte, premultipliser via apply:
    // enklest: bare premultiply på baseAlign og så applyAlignQuaternion med dens quaternion
    // men vi har ikke direkte handle til baseAlign.quaternion – så vi gjør:
    // hent dagens world quaternions og kombiner:
    const qNow = new THREE.Quaternion();
    this.core.baseAlign.getWorldQuaternion(qNow);
    const qApply = qRot.clone().multiply(qNow);
    this._applyAlignQuaternion(qApply);
  }

  // ---------- Export / Snapshot / Download ----------

  _wireExport() {
    const el = this.el;

    el.btnSnap?.addEventListener("click", () => this._snapshotToPNG());
    el.btnDownload?.addEventListener("click", () => this._downloadSTL());
  }

  _snapshotToPNG() {
    try {
      const scale = parseFloat(this.snapshotScaleSel?.value || "1");
      const w = window.innerWidth;
      const h = window.innerHeight;

      const prevPR = this.core.renderer.getPixelRatio();
      const prevSize = this.core.renderer.getSize(new THREE.Vector2());

      this.core.renderer.setPixelRatio(1);
      this.core.renderer.setSize(Math.round(w * scale), Math.round(h * scale), false);
      this.core.renderer.render(this.core.scene, this.core.camera);

      const dataURL = this.core.renderer.domElement.toDataURL("image/png");

      // tilbakestill
      this.core.renderer.setPixelRatio(prevPR);
      this.core.renderer.setSize(prevSize.x, prevSize.y, false);

      const a = document.createElement("a");
      a.href = dataURL;

      const base = (this._modelUrl?.split("/")?.pop() || "model.stl").replace(/\.(stl)$/i, "");
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      a.download = `${base}-snapshot-${scale}x-${ts}.png`;

      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error(e);
      this.setHud("Snapshot feilet.", 2500);
    }
  }

  _downloadSTL() {
    if (!this._modelUrl) { this.setHud("Ukjent STL-url", 1500); return; }
    const a = document.createElement("a");
    a.href = this._modelUrl;
    a.download = (this._modelUrl.split("/").pop() || "model.stl");
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // ---------- Info-panel (dims/vol/CG) ----------

  _updateDimsUI() {
    if (!this.core.mesh) return;
    const { size } = this.core.computeBoundsWorld(this.core.modelGroup);
    const f = this._unitFactor();

    if (this.el.txtDims) {
      this.el.txtDims.textContent =
        `${(size.x * f).toFixed(2)} / ${(size.y * f).toFixed(2)} / ${(size.z * f).toFixed(2)} ${this.unitLabel}`;
    }
    if (this.el.txtDims2) {
      this.el.txtDims2.textContent =
        `ΔX=${(size.x * f).toFixed(2)}, ΔY=${(size.y * f).toFixed(2)}, ΔZ=${(size.z * f).toFixed(2)} (${this.unitLabel})`;
    }
  }

  _updateTotalVolUI(totalVolume) {
    if (totalVolume == null) { if (this.el.txtVol) this.el.txtVol.textContent = "–"; return; }

    const f = this._unitFactor();
    const Vdisp = totalVolume * Math.pow(f, 3);
    const Vu = (this.unitLabel === "mm") ? "mm³" :
               (this.unitLabel === "cm") ? "cm³" :
               (this.unitLabel === "inch") ? "in³" :
               (this.unitLabel === "m") ? "m³" : "u³";
    if (this.el.txtVol) this.el.txtVol.textContent = `${Vdisp.toExponential(3)} ${Vu}`;
  }

  _updateCGUI(cgLocal) {
    if (!cgLocal || !this.core.mesh) { if (this.el.txtCG) this.el.txtCG.textContent = "–"; return; }
    const cgW = this.core.localToWorldPoint(cgLocal, this.core.mesh);
    const f = this._unitFactor();
    if (this.el.txtCG) this.el.txtCG.textContent = this._formatVector(cgW, f, this.unitLabel);
  }

  // ---------- Meny/Help/HUD ----------

  _bindMenuToggles() {
    const menus = [...document.querySelectorAll(".menu")];
    const ddHolders = [...document.querySelectorAll(".dd")];
    let openMenu = null;

    function closeAll() { menus.forEach(m => m.classList.remove("open")); openMenu = null; }

    ddHolders.forEach(dd => {
      const menuId = dd.getAttribute("data-menu");
      const btn = dd.querySelector(".ddBtn");
      if (!btn) return;
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const m = document.getElementById(menuId);
        if (!m) return;
        if (openMenu && openMenu !== m) openMenu.classList.remove("open");
        const willOpen = !m.classList.contains("open");
        closeAll();
        if (willOpen) { m.classList.add("open"); openMenu = m; }
      });
    });

    document.addEventListener("click", (ev) => {
      const inside = ev.target.closest(".menu") || ev.target.closest(".ddBtn");
      if (!inside) {
        menus.forEach(m => m.classList.remove("open"));
        openMenu = null;
      }
    });
  }

  _bindMobileToolbarToggle() {
    const btn = this.el.btnMobileMenu;
    if (!btn) return;
    let hidden = false;
    btn.addEventListener("click", () => {
      hidden = !hidden;
      document.querySelectorAll("#toolbar > :not(#btnMobileMenu)").forEach(el => {
        el.style.display = hidden ? "none" : "";
      });
      // Lukk eventuelle åpne menyer
      document.querySelectorAll(".menu.open").forEach(m => m.classList.remove("open"));
    });
  }

  _setChip(which, text) {
    const el = this.chips?.[which];
    if (!el) return;
    el.textContent = String(text ?? "");
  }

  _bindHelpMenu() {
    const nav = this.el.helpNav;
    const content = this.el.helpContent;
    const helpData = this.helpData;
    if (!nav || !content || !helpData) return;

    const sections = Array.isArray(helpData.sections) ? helpData.sections : [];
    const htmlMap = helpData.content || {};

    const setPage = (key) => {
      const html = htmlMap[key] ?? htmlMap.basic ?? "";
      content.innerHTML = html;
      nav.querySelectorAll("button[data-help]").forEach((b) => {
        b.classList.toggle("active", b.dataset.help === key);
      });
    };

    // Bygg venstremeny
    nav.innerHTML = "";
    for (const s of sections) {
      const key = s?.key;
      const label = s?.label ?? s?.key;
      if (!key) continue;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn ghost";
      btn.dataset.help = key;
      btn.textContent = label;
      btn.addEventListener("click", () => setPage(key));
      nav.appendChild(btn);
    }

    // Default side
    const defaultKey = sections.find(s => s?.key === "basic")?.key || sections[0]?.key || "basic";
    setPage(defaultKey);
  }

  // ---------- Diverse hjelpefunksjoner ----------

  setHud(html, ms = 0) {
    if (!this.hud) return;
    this.hud.innerHTML = html;
    this.hud.style.display = "block";
    if (this._hudTimer) clearTimeout(this._hudTimer);
    if (ms > 0) this._hudTimer = setTimeout(() => (this.hud.style.display = "none"), ms);
  }

  _cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  _formatVector(v, f, unit) {
    return `(${(v.x * f).toFixed(2)}, ${(v.y * f).toFixed(2)}, ${(v.z * f).toFixed(2)}) ${unit}`;
  }
}
