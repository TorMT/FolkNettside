// /includes/three/STLViewerCore.js

import * as THREE from "./three.module.js";
import { OrbitControls } from "./OrbitControls.js";

export class STLViewerCore {
  constructor(container = document.body) {
    this.container = container;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.localClippingEnabled = true;
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    // =========================
    // Z-UP (kritisk for HydroStatikk)
    // =========================
    this.scene.up.set(0, 0, 1);

    const amb = new THREE.AmbientLight(0xffffff, 0.75);
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(7, 10, 6);
    this.scene.add(amb, dir);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.01,
      5000
    );
    this.camera.up.set(0, 0, 1);
    this.camera.position.set(3, 3, 2.4);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.screenSpacePanning = true;
    this.controls.autoRotate = false;
    this.controls.autoRotateSpeed = 1.0;

    this.controls.object.up.set(0, 0, 1);
    this.controls.update();

    // --- Modellhierarki ---
    // modelGroup
    //   └─ importFixGroup (ingen fast rotasjon)
    //        └─ baseAlign
    //             └─ userRotGroup
    //                  └─ hydroRotGroup
    //                       └─ mesh
    this.modelGroup = new THREE.Group();
    this.importFixGroup = new THREE.Group();
    this.baseAlign = new THREE.Group();
    this.userRotGroup = new THREE.Group();
    this.hydroRotGroup = new THREE.Group();

    this.scene.add(this.modelGroup);
    this.modelGroup.add(this.importFixGroup);
    this.importFixGroup.add(this.baseAlign);
    this.baseAlign.add(this.userRotGroup);
    this.userRotGroup.add(this.hydroRotGroup);

    // ✅ IKKE auto-roter på import (ingen -90° X)
    this.importFixGroup.rotation.set(0, 0, 0);

    this.mesh = null;

    // Units scale: meters per STL-unit
    this.unitsScale = 1.0;
    this.modelGroup.scale.setScalar(this.unitsScale);

    this._baseCameraPos = this.camera.position.clone();
    this._baseTarget = this.controls.target.clone();

    this._axesHelper = null;
    this._edgesLine = null;
    this._bboxHelper = null;
    this._bboxLineWidth = 1;
    this._bboxColor = "#111111";

    this._frameListeners = new Set();

    this._animId = null;
    this._onResize = this._onResize.bind(this);
    window.addEventListener("resize", this._onResize);
  }

  // ---------- helpers Hydro/Measure forventer ----------

  getModelRoot() {
    return this.modelGroup;
  }

  getUnitsScale() {
    return this.unitsScale;
  }

  localToWorldPoint(v) {
    if (!this.mesh) return v.clone ? v.clone() : new THREE.Vector3();
    const out = v.clone();
    this.mesh.updateMatrixWorld(true);
    return out.applyMatrix4(this.mesh.matrixWorld);
  }

  worldToLocalPoint(v) {
    if (!this.mesh) return v.clone ? v.clone() : new THREE.Vector3();
    const out = v.clone();
    this.mesh.updateMatrixWorld(true);
    const inv = this.mesh.matrixWorld.clone().invert();
    return out.applyMatrix4(inv);
  }

  localToWorldDir(v) {
    if (!this.mesh) return v.clone ? v.clone() : new THREE.Vector3();
    const out = v.clone().normalize();
    this.mesh.updateMatrixWorld(true);
    const m3 = new THREE.Matrix3().setFromMatrix4(this.mesh.matrixWorld);
    return out.applyMatrix3(m3).normalize();
  }

  worldToLocalDir(v) {
    if (!this.mesh) return v.clone ? v.clone() : new THREE.Vector3();
    const out = v.clone().normalize();
    this.mesh.updateMatrixWorld(true);
    const inv = this.mesh.matrixWorld.clone().invert();
    const m3 = new THREE.Matrix3().setFromMatrix4(inv);
    return out.applyMatrix3(m3).normalize();
  }

  // ---------- livssyklus ----------

  start() {
    if (this._animId) return;

    const loop = () => {
      this._animId = requestAnimationFrame(loop);

      this.controls.update();

      if (this._bboxHelper) {
        try {
          this._bboxHelper.box.setFromObject(this.modelGroup);
          this._bboxHelper.updateMatrixWorld(true);
        } catch {}
      }

      for (const fn of this._frameListeners) {
        try {
          fn();
        } catch {}
      }

      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  stop() {
    if (this._animId) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }
  }

  addFrameListener(fn) {
    this._frameListeners.add(fn);
  }
  removeFrameListener(fn) {
    this._frameListeners.delete(fn);
  }

  // ---------- bakgrunn ----------

  setBackground(colorOrHex) {
    try {
      if (colorOrHex == null) this.scene.background = null;
      else this.scene.background = new THREE.Color(colorOrHex);
    } catch {
      this.scene.background = null;
    }
  }

  // ---------- mesh / bounds ----------

  setMesh(mesh) {
    if (this.mesh && this.mesh.parent) this.mesh.parent.remove(this.mesh);
    this.mesh = mesh || null;

    if (this.mesh) this.hydroRotGroup.add(this.mesh);

    if (this._edgesLine) this.setEdgesVisible(false);
    if (this._bboxHelper)
      this.setBBoxVisible(true, {
        color: this._bboxColor,
        lineWidth: this._bboxLineWidth,
      });
  }

  computeBoundsWorld(object) {
    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    return { box, size, center, maxDim };
  }

  // ---------- kamera ----------

  fitToModel() {
    if (!this.mesh) return;

    const { center, maxDim } = this.computeBoundsWorld(this.modelGroup);
    const d = maxDim * 1.6;

    this.controls.target.copy(center);
    this.camera.position.set(
      center.x + d * 0.75,
      center.y + d * 0.75,
      center.z + d * 0.55
    );

    this.camera.near = maxDim / 1000;
    this.camera.far = maxDim * 1000;
    this.camera.updateProjectionMatrix();
    this.controls.update();

    this._baseCameraPos = this.camera.position.clone();
    this._baseTarget = this.controls.target.clone();
  }

  resetView() {
    this.controls.target.copy(this._baseTarget);
    this.camera.position.copy(this._baseCameraPos);
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  setPresetView(name = "iso") {
    if (!this.mesh) return;

    const { center, maxDim } = this.computeBoundsWorld(this.modelGroup);
    const d = maxDim * 1.7;

    const dirMap = {
      iso: new THREE.Vector3(1, 1, 0.8),
      front: new THREE.Vector3(1, 0, 0),
      back: new THREE.Vector3(-1, 0, 0),
      right: new THREE.Vector3(0, 1, 0),
      left: new THREE.Vector3(0, -1, 0),
      top: new THREE.Vector3(0, 0, 1),
      bottom: new THREE.Vector3(0, 0, -1),
    };

    const v = (dirMap[name] || dirMap.iso).clone().normalize();

    this.controls.target.copy(center);
    this.camera.position.copy(center).addScaledVector(v, d);

    this.camera.near = maxDim / 1000;
    this.camera.far = maxDim * 1000;
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  zoomBy(factor = 1.1) {
    factor = Number(factor) || 1.1;
    const tgt = this.controls.target.clone();
    const dir = this.camera.position.clone().sub(tgt);
    dir.multiplyScalar(1 / factor);
    this.camera.position.copy(tgt.add(dir));
    this.controls.update();
  }

  setAutoRotate(on) {
    this.controls.autoRotate = !!on;
  }

  setAutoRotateSpeed(speed) {
    const map = { slow: 0.5, med: 1.0, fast: 2.0 };
    this.controls.autoRotateSpeed = map[speed] ?? Number(speed) ?? 1.0;
  }

  // ---------- align / user rot ----------

  applyAlignQuaternion(q) {
    if (!q) return;
    this.baseAlign.quaternion.copy(q);
    this.baseAlign.updateMatrixWorld(true);
  }

  rotateUser(axis = "z", rad = 0) {
    if (axis === "x") this.userRotGroup.rotation.x += rad;
    else if (axis === "y") this.userRotGroup.rotation.y += rad;
    else this.userRotGroup.rotation.z += rad;
    this.userRotGroup.updateMatrixWorld(true);
  }

  zeroUserRotation() {
    this.userRotGroup.rotation.set(0, 0, 0);
    this.userRotGroup.updateMatrixWorld(true);
  }

  // ---------- render props ----------

  _getMeshMaterial() {
    if (!this.mesh) return null;
    const mat = this.mesh.material;
    return Array.isArray(mat) ? mat : mat || null;
  }

  setWireframe(on) {
    if (!this.mesh) return;
    const mat = this._getMeshMaterial();
    const apply = (m) => {
      if (m) {
        m.wireframe = !!on;
        m.needsUpdate = true;
      }
    };
    if (Array.isArray(mat)) mat.forEach(apply);
    else apply(mat);
  }

  setFlatShading(on) {
    if (!this.mesh) return;
    const mat = this._getMeshMaterial();
    const apply = (m) => {
      if (m) {
        m.flatShading = !!on;
        m.needsUpdate = true;
      }
    };
    if (Array.isArray(mat)) mat.forEach(apply);
    else apply(mat);
  }

  setOpacity(alpha = 1) {
    if (!this.mesh) return;
    const a = Math.max(0.0, Math.min(1.0, Number(alpha)));
    const mat = this._getMeshMaterial();
    const apply = (m) => {
      if (!m) return;
      m.opacity = a;
      m.transparent = a < 0.999;
      m.depthWrite = a >= 0.999;
      m.needsUpdate = true;
    };
    if (Array.isArray(mat)) mat.forEach(apply);
    else apply(mat);
  }

  setModelColor(cssColor) {
    if (!this.mesh) return;
    const mat = this._getMeshMaterial();
    const color = new THREE.Color(cssColor || "#5da9ff");
    const apply = (m) => {
      if (m?.color) {
        m.color.copy(color);
        m.needsUpdate = true;
      }
    };
    if (Array.isArray(mat)) mat.forEach(apply);
    else apply(mat);
  }

  // ---------- edges ----------

  setEdgesVisible(on) {
    if (!this.mesh) return;

    if (this._edgesLine && this._edgesLine.parent)
      this._edgesLine.parent.remove(this._edgesLine);
    this._edgesLine = null;

    if (!on) return;

    const geom = this.mesh.geometry;
    if (!geom) return;

    const edgesGeom = new THREE.EdgesGeometry(geom, 12);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.75,
    });
    const lines = new THREE.LineSegments(edgesGeom, lineMat);
    lines.renderOrder = 3;

    this.mesh.add(lines);
    this._edgesLine = lines;
  }

  // ---------- bbox ----------

  setBBoxVisible(on, opts = {}) {
    if (this._bboxHelper && this._bboxHelper.parent)
      this._bboxHelper.parent.remove(this._bboxHelper);
    this._bboxHelper = null;

    if (!on) return;

    this._bboxColor = opts.color || this._bboxColor;
    this._bboxLineWidth = Number(opts.lineWidth || this._bboxLineWidth) || 1;

    const box = new THREE.Box3().setFromObject(this.modelGroup);
    const helper = new THREE.Box3Helper(box, new THREE.Color(this._bboxColor));
    helper.material.linewidth = this._bboxLineWidth;
    this.scene.add(helper);
    this._bboxHelper = helper;
  }

  // ---------- axes ----------

  setAxesVisible(on) {
    if (!on) {
      if (this._axesHelper?.parent) this._axesHelper.parent.remove(this._axesHelper);
      this._axesHelper = null;
      return;
    }

    const size = this.mesh ? this.computeBoundsWorld(this.modelGroup).maxDim : 1;
    const s = Math.max(1e-6, size * 0.6);

    if (this._axesHelper?.parent) this._axesHelper.parent.remove(this._axesHelper);
    this._axesHelper = new THREE.AxesHelper(s);
    this.scene.add(this._axesHelper);
  }

  // ---------- units scaling ----------

  setUnitsScale(metersPerUnit = 1.0) {
    const s = Number(metersPerUnit);
    if (!Number.isFinite(s) || s <= 0) return;

    this.unitsScale = s;
    this.modelGroup.scale.setScalar(this.unitsScale);
    this.modelGroup.updateMatrixWorld(true);

    if (this._bboxHelper) {
      try {
        this._bboxHelper.box.setFromObject(this.modelGroup);
      } catch {}
    }
    if (this._axesHelper) this.setAxesVisible(true);
  }

  // ---------- resize ----------

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}
