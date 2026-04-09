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
    this._explodeFactor = 0;
    this._explodeItems = [];
    this._explodeBaseMaxDim = 1;

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
    this._explodeFactor = 0;
    this._explodeItems = [];
    this._explodeBaseMaxDim = 1;

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

  _ensureExplodeItems() {
    if (!this.mesh) {
      this._explodeItems = [];
      return this._explodeItems;
    }
    if (this._explodeItems.length) return this._explodeItems;

    const targets = this._getRenderableMeshes().filter((target) => target && target !== this.mesh);
    if (targets.length <= 1) {
      this._explodeItems = [];
      this._explodeBaseMaxDim = 1;
      return this._explodeItems;
    }

    this.modelGroup.updateMatrixWorld(true);
    this.mesh.updateMatrixWorld(true);
    this._explodeBaseMaxDim = this.computeBoundsWorld(this.mesh).maxDim || 1;

    const meshCenterBox = new THREE.Box3();
    const meshCenters = targets.map((target) => {
      if (target.geometry?.computeBoundingBox) target.geometry.computeBoundingBox();
      const localCenter = target.geometry?.boundingBox?.getCenter(new THREE.Vector3()) || new THREE.Vector3();
      const worldCenter = target.localToWorld(localCenter.clone());
      const meshCenter = this.mesh.worldToLocal(worldCenter.clone());
      meshCenterBox.expandByPoint(meshCenter);
      return meshCenter;
    });

    const modelCenter = meshCenterBox.isEmpty()
      ? new THREE.Vector3()
      : meshCenterBox.getCenter(new THREE.Vector3());

    this._explodeItems = targets.map((target, index) => {
      const dirMesh = meshCenters[index].clone().sub(modelCenter);
      if (dirMesh.lengthSq() < 1e-9) {
        const angle = (index / Math.max(1, targets.length)) * Math.PI * 2;
        dirMesh.set(Math.cos(angle), Math.sin(angle), ((index % 3) - 1) * 0.24);
      }
      dirMesh.normalize();
      return {
        target,
        basePosition: target.position.clone(),
        centerMesh: meshCenters[index].clone(),
        dirMesh,
      };
    });

    return this._explodeItems;
  }

  getExplodablePartCount() {
    return this._ensureExplodeItems().length;
  }

  canExplode() {
    return this.getExplodablePartCount() > 1;
  }

  getExplodeFactor() {
    return this._explodeFactor || 0;
  }

  setExplodeFactor(amount = 0) {
    const items = this._ensureExplodeItems();
    const clamped = Math.max(0, Math.min(1, Number(amount) || 0));
    this._explodeFactor = items.length > 1 ? clamped : 0;

    if (!items.length) return this._explodeFactor;

    this.modelGroup.updateMatrixWorld(true);
    this.mesh.updateMatrixWorld(true);

    const spreadDistance = (this._explodeBaseMaxDim || 1) * 0.42 * this._explodeFactor;

    items.forEach((item) => {
      const parent = item.target.parent;
      if (!parent) return;

      const fromWorld = this.mesh.localToWorld(item.centerMesh.clone());
      const toWorld = this.mesh.localToWorld(
        item.centerMesh.clone().addScaledVector(item.dirMesh, spreadDistance)
      );

      const fromParent = parent.worldToLocal(fromWorld.clone());
      const toParent = parent.worldToLocal(toWorld.clone());
      const deltaParent = toParent.sub(fromParent);

      item.target.position.copy(item.basePosition).add(deltaParent);
      item.target.updateMatrixWorld(true);
    });

    this.modelGroup.updateMatrixWorld(true);

    if (this._bboxHelper) {
      try {
        this._bboxHelper.box.setFromObject(this.modelGroup);
      } catch {}
    }
    if (this._axesHelper) this.setAxesVisible(true);

    return this._explodeFactor;
  }

  resetExplode() {
    return this.setExplodeFactor(0);
  }

  // ---------- kamera ----------

  fitToModel() {
    if (!this.mesh) return;

    const { center, size, maxDim } = this.computeBoundsWorld(this.modelGroup);
    const radius = Math.max(size.length() * 0.5, maxDim * 0.5, 0.01);
    const aspect = Math.max(0.1, this.camera.aspect || (window.innerWidth / Math.max(window.innerHeight, 1)));
    const vFov = THREE.MathUtils.degToRad(this.camera.fov || 60);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    const limitingFov = Math.max(0.15, Math.min(vFov, hFov));
    const padding = 1.14;
    const distance = (radius / Math.sin(limitingFov / 2)) * padding;
    const direction = new THREE.Vector3(1, 1, 0.82).normalize();

    this.controls.target.copy(center);
    this.camera.position.copy(center).addScaledVector(direction, distance);

    this.camera.near = Math.max(0.01, distance / 150);
    this.camera.far = Math.max(distance * 20, maxDim * 1000);
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

    const { center, size, maxDim } = this.computeBoundsWorld(this.modelGroup);
    const radius = Math.max(size.length() * 0.5, maxDim * 0.5, 0.01);
    const aspect = Math.max(0.1, this.camera.aspect || (window.innerWidth / Math.max(window.innerHeight, 1)));
    const vFov = THREE.MathUtils.degToRad(this.camera.fov || 60);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    const limitingFov = Math.max(0.15, Math.min(vFov, hFov));
    const distance = (radius / Math.sin(limitingFov / 2)) * 1.16;

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
    this.camera.position.copy(center).addScaledVector(v, distance);

    this.camera.near = Math.max(0.01, distance / 150);
    this.camera.far = Math.max(distance * 20, maxDim * 1000);
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

  _getRenderableMeshes() {
    if (!this.mesh) return [];

    const targets = [];
    const seen = new Set();
    const visit = (obj) => {
      if (!obj || seen.has(obj)) return;
      seen.add(obj);
      if (obj.isMesh && obj.geometry && obj.material) targets.push(obj);
    };

    if (this.mesh.isMesh) visit(this.mesh);
    if (typeof this.mesh.traverse === "function") {
      this.mesh.traverse((child) => {
        if (child === this.mesh && !this.mesh.isMesh) return;
        visit(child);
      });
    }

    return targets;
  }

  _applyToRenderableMaterials(fn) {
    const meshes = this._getRenderableMeshes();
    for (const target of meshes) {
      const mats = Array.isArray(target.material) ? target.material : [target.material];
      mats.forEach((mat) => fn(mat, target));
    }
  }

  setWireframe(on) {
    if (!this.mesh) return;
    this._applyToRenderableMaterials((mat) => {
      if (!mat) return;
      mat.wireframe = !!on;
      mat.needsUpdate = true;
    });
  }

  setFlatShading(on) {
    if (!this.mesh) return;
    this._applyToRenderableMaterials((mat) => {
      if (!mat) return;
      mat.flatShading = !!on;
      mat.needsUpdate = true;
    });
  }

  setOpacity(alpha = 1) {
    if (!this.mesh) return;
    const a = Math.max(0.0, Math.min(1.0, Number(alpha)));
    this._applyToRenderableMaterials((mat) => {
      if (!mat) return;
      mat.opacity = a;
      mat.transparent = a < 0.999;
      mat.depthWrite = a >= 0.999;
      mat.needsUpdate = true;
    });
  }

  setModelColor(cssColor) {
    if (!this.mesh) return;
    const color = new THREE.Color(cssColor || "#5da9ff");
    this._applyToRenderableMaterials((mat) => {
      if (!mat?.color) return;
      mat.color.copy(color);
      mat.needsUpdate = true;
    });
  }

  _clearEdgeHelpers() {
    if (!this.mesh || typeof this.mesh.traverse !== "function") return;
    this.mesh.traverse((obj) => {
      const stale = (obj.children || []).filter((child) => child?.userData?.viewerEdgeHelper);
      stale.forEach((child) => obj.remove(child));
    });
  }

  // ---------- edges ----------

  setEdgesVisible(on) {
    if (!this.mesh) return;
    this._clearEdgeHelpers();
    this._edgesLine = null;

    if (!on) return;

    const targets = this._getRenderableMeshes();
    if (!targets.length) return;

    let added = 0;
    for (const target of targets) {
      if (!target.geometry) continue;
      const edgesGeom = new THREE.EdgesGeometry(target.geometry, 12);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.75,
      });
      const lines = new THREE.LineSegments(edgesGeom, lineMat);
      lines.renderOrder = 3;
      lines.userData.viewerEdgeHelper = true;
      target.add(lines);
      added += 1;
    }
    this._edgesLine = added > 0 ? { count: added } : null;
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
