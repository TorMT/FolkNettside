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
    this._explodeScope = "all";
    this._explodeSelectionTokens = null;

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
    this._explodeScope = "all";
    this._explodeSelectionTokens = null;

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

  _normalizeExplodeToken(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  _normalizeExplodeScope(value) {
    const scope = String(value || "all").trim().toLowerCase();
    if (scope === "selected") return "selected";
    if (scope === "none") return "none";
    return "all";
  }

  _tokenizeExplodeLabel(value) {
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

  _resolveExplodeFamilyKey(target) {
    const direct = this._normalizeExplodeToken(target?.userData?.componentFamilyKey);
    if (direct) return direct;
    const sources = [
      target?.userData?.componentName,
      target?.name,
      target?.userData?.sourceName,
      target?.userData?.nodePath,
    ];
    for (const source of sources) {
      const tokens = this._tokenizeExplodeLabel(source);
      if (tokens.length) return tokens.slice(0, Math.min(6, tokens.length)).join(" ");
      const normalized = this._normalizeExplodeToken(source);
      if (normalized) return normalized;
    }
    return "component";
  }

  _explodeVectorFromPlain(value) {
    if (!value) return null;
    if (value.isVector3) return value.clone();
    const x = Number(value.x);
    const y = Number(value.y);
    const z = Number(value.z);
    if (![x, y, z].every(Number.isFinite)) return null;
    return new THREE.Vector3(x, y, z);
  }

  _resolveExplodeLocalCenter(target) {
    const centroid =
      this._explodeVectorFromPlain(target?.userData?.centroidLocal) ||
      this._explodeVectorFromPlain(target?.userData?.geometryMassProps?.centroidLocal);
    if (centroid) return centroid;

    if (target?.geometry?.computeBoundingBox) target.geometry.computeBoundingBox();
    return target?.geometry?.boundingBox?.getCenter(new THREE.Vector3()) || new THREE.Vector3();
  }

  _resolveExplodeWeight(target, fallbackSize = 0) {
    const directMass = Number(
      target?.userData?.massKg ??
      target?.userData?.directMassKg ??
      target?.userData?.geometryMassProps?.massKg
    );
    if (Number.isFinite(directMass) && directMass > 1e-9) return directMass;

    const volume = Number(target?.userData?.volume ?? target?.userData?.geometryMassProps?.volume);
    const density =
      Number(target?.userData?.densityKgM3) ||
      Number(target?.userData?.geometryMassProps?.densityKgM3) ||
      Number(target?.userData?.materialHint?.densityKgM3) ||
      Number(target?.userData?.materialHint?.profile?.density);

    if (Number.isFinite(volume) && volume > 1e-12 && Number.isFinite(density) && density > 0) {
      return volume * density;
    }
    if (Number.isFinite(volume) && volume > 1e-12) {
      return volume;
    }
    return Math.max(Number(fallbackSize) || 0, 1e-6);
  }

  _resolveExplodeLongAxis(target) {
    const box = target?.geometry?.boundingBox || null;
    if (!box) return null;
    const size = box.getSize(new THREE.Vector3());
    const ranked = [
      { axis: new THREE.Vector3(1, 0, 0), length: size.x },
      { axis: new THREE.Vector3(0, 1, 0), length: size.y },
      { axis: new THREE.Vector3(0, 0, 1), length: size.z },
    ].sort((a, b) => b.length - a.length);
    if (!Number.isFinite(ranked[0]?.length) || ranked[0].length <= 1e-9) return null;

    const worldQuat = new THREE.Quaternion();
    target.getWorldQuaternion(worldQuat);
    const worldAxis = ranked[0].axis.clone().applyQuaternion(worldQuat).normalize();
    const meshAxis = this.worldToLocalDir(worldAxis);
    return meshAxis.lengthSq() > 1e-9 ? meshAxis.normalize() : null;
  }

  _getExplodeTargetAliases(target) {
    if (!target) return [];
    return [...new Set([
      target?.userData?.componentKey,
      target?.userData?.componentName,
      target?.name,
      target?.userData?.nodePath,
      target?.userData?.sourceName,
    ].map((value) => this._normalizeExplodeToken(value)).filter(Boolean))];
  }

  _matchesExplodeSelection(target) {
    if (!this._explodeSelectionTokens?.size) return false;
    const aliases = this._getExplodeTargetAliases(target);
    return aliases.some((alias) => this._explodeSelectionTokens.has(alias));
  }

  _getSelectableExplodeMeshes() {
    return this._getRenderableMeshes().filter((target) => target && target !== this.mesh);
  }

  _getExplodableMeshes() {
    const allTargets = this._getSelectableExplodeMeshes();
    if (this._explodeScope === "none") return [];
    if (this._explodeScope !== "selected") return allTargets;
    return allTargets.filter((target) => this._matchesExplodeSelection(target));
  }

  _restoreExplodeBasePositions(items = this._explodeItems) {
    if (!Array.isArray(items) || !items.length) return;
    items.forEach((item) => {
      if (!item?.target || !item.basePosition) return;
      item.target.position.copy(item.basePosition);
      item.target.updateMatrixWorld?.(true);
    });
    this.modelGroup?.updateMatrixWorld?.(true);
  }

  _canExplodeTargetCounts(activeCount = 0, totalCount = 0, scope = this._explodeScope) {
    const normalizedScope = this._normalizeExplodeScope(scope);
    if (normalizedScope === "none") return false;
    if (normalizedScope === "selected") {
      return totalCount > 1 && activeCount > 0;
    }
    return activeCount > 1;
  }

  setExplodeScope({ scope = "all", tokens = [] } = {}) {
    const normalizedScope = this._normalizeExplodeScope(scope);
    const normalizedTokens = [...new Set((Array.isArray(tokens) ? tokens : [])
      .map((value) => this._normalizeExplodeToken(value))
      .filter(Boolean))];
    const nextTokens = normalizedTokens.length ? new Set(normalizedTokens) : null;
    const prevTokens = this._explodeSelectionTokens ? [...this._explodeSelectionTokens].sort() : [];
    const nextTokenList = nextTokens ? [...nextTokens].sort() : [];
    const sameTokens = prevTokens.length === nextTokenList.length
      && prevTokens.every((value, index) => value === nextTokenList[index]);
    if (sameTokens && this._explodeScope === normalizedScope) return;

    this._restoreExplodeBasePositions(this._explodeItems);
    this._explodeItems = [];
    this._explodeScope = normalizedScope;
    this._explodeSelectionTokens = nextTokens;

    if (this.mesh && this._explodeFactor > 0) {
      this.setExplodeFactor(this._explodeFactor);
    } else {
      this.modelGroup?.updateMatrixWorld?.(true);
      if (this._bboxHelper) {
        try {
          this._bboxHelper.box.setFromObject(this.modelGroup);
        } catch {}
      }
    }
  }

  setExplodeSelection(tokens = []) {
    const normalized = [...new Set((Array.isArray(tokens) ? tokens : [])
      .map((value) => this._normalizeExplodeToken(value))
      .filter(Boolean))];
    this.setExplodeScope({
      scope: normalized.length ? "selected" : "all",
      tokens: normalized,
    });
  }

  _createDeterministicDirection(index = 0, total = 1) {
    const phi = Math.PI * (3 - Math.sqrt(5));
    const t = (index + 0.5) / Math.max(1, total);
    const z = 1 - 2 * t;
    const r = Math.sqrt(Math.max(0, 1 - z * z));
    return new THREE.Vector3(
      Math.cos(phi * index) * r,
      Math.sin(phi * index) * r,
      z || 0.25
    ).normalize();
  }

  _buildOrthogonalVector(direction, index = 0) {
    const dir = direction?.clone?.().normalize?.() || new THREE.Vector3(1, 0, 0);
    const up = Math.abs(dir.z) < 0.85 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
    const tangent = new THREE.Vector3().crossVectors(dir, up).normalize();
    if (tangent.lengthSq() < 1e-9) {
      return this._createDeterministicDirection(index + 1, 8);
    }
    const bitangent = new THREE.Vector3().crossVectors(dir, tangent).normalize();
    const angle = ((index % 12) / 12) * Math.PI * 2;
    return tangent.multiplyScalar(Math.cos(angle)).add(bitangent.multiplyScalar(Math.sin(angle))).normalize();
  }

  _resolveAxisSign(primaryValue, secondaryValue = 0, index = 0) {
    if (Math.abs(primaryValue) > 1e-6) return Math.sign(primaryValue);
    if (Math.abs(secondaryValue) > 1e-6) return Math.sign(secondaryValue);
    return index % 2 === 0 ? 1 : -1;
  }

  _quantizeExplodeValue(value, step = 0.01) {
    const safeStep = Math.max(Number(step) || 0.01, 1e-6);
    const safeValue = Number.isFinite(value) ? value : 0;
    return (Math.round(safeValue / safeStep) * safeStep).toFixed(4);
  }

  _clusterExplodeEntries(entries = []) {
    if (!entries.length) return [];

    const families = new Map();
    entries.forEach((entry) => {
      const familyKey = entry.familyKey || "component";
      if (!families.has(familyKey)) families.set(familyKey, []);
      families.get(familyKey).push(entry);
    });

    const clusters = [];
    families.forEach((familyEntries) => {
      if (familyEntries.length <= 1) {
        familyEntries.forEach((entry) => {
          clusters.push({ familyKey: entry.familyKey, entries: [entry], center: entry.centerMesh.clone() });
        });
        return;
      }

      const sizeValues = familyEntries.map((entry) => entry.sizeMax).filter((value) => value > 0).sort((a, b) => a - b);
      const medianSize = sizeValues.length ? sizeValues[Math.floor(sizeValues.length / 2)] : 0;
      const nearestDistances = familyEntries
        .map((entry, index) => {
          let best = Infinity;
          for (let i = 0; i < familyEntries.length; i++) {
            if (i === index) continue;
            best = Math.min(best, entry.centerMesh.distanceTo(familyEntries[i].centerMesh));
          }
          return Number.isFinite(best) ? best : 0;
        })
        .filter((value) => value > 0)
        .sort((a, b) => a - b);
      const medianNearest = nearestDistances.length ? nearestDistances[Math.floor(nearestDistances.length / 2)] : 0;
      const familyBox = new THREE.Box3();
      familyEntries.forEach((entry) => familyBox.expandByPoint(entry.centerMesh));
      const familySize = familyBox.getSize(new THREE.Vector3());
      const familyMaxDim = Math.max(familySize.x, familySize.y, familySize.z, 0);
      const threshold = Math.max(
        medianSize * 1.85,
        medianNearest > 0 ? medianNearest * 1.05 : 0,
        Math.min(familyMaxDim * 0.04, familyMaxDim > 0 ? familyMaxDim * 0.12 : 0),
        0.025
      );

      const visited = new Set();
      for (let i = 0; i < familyEntries.length; i++) {
        if (visited.has(i)) continue;
        const queue = [i];
        visited.add(i);
        const members = [];

        while (queue.length) {
          const idx = queue.shift();
          const current = familyEntries[idx];
          members.push(current);

          for (let j = 0; j < familyEntries.length; j++) {
            if (visited.has(j)) continue;
            const candidate = familyEntries[j];
            const distance = current.centerMesh.distanceTo(candidate.centerMesh);
            const pairThreshold = Math.max(
              threshold,
              Math.max(current.sizeMax, candidate.sizeMax) * 2.0
            );
            if (distance <= pairThreshold) {
              visited.add(j);
              queue.push(j);
            }
          }
        }

        const totalWeight = members.reduce((sum, member) => sum + (Number(member.explodeWeight) || 0), 0);
        const center = members.reduce((acc, member) => {
          const weight = Number(member.explodeWeight) || 0;
          return totalWeight > 1e-9
            ? acc.addScaledVector(member.centerMesh, weight)
            : acc.add(member.centerMesh);
        }, new THREE.Vector3());
        if (totalWeight > 1e-9) center.divideScalar(totalWeight);
        else center.divideScalar(Math.max(1, members.length));
        clusters.push({ familyKey: members[0]?.familyKey || "component", entries: members, center });
      }
    });

    return clusters.sort((a, b) => {
      return b.center.x - a.center.x || b.center.y - a.center.y || b.center.z - a.center.z;
    });
  }

  _computeExplodeCenter(entries = []) {
    if (!Array.isArray(entries) || !entries.length) return new THREE.Vector3();
    const weightedCenter = new THREE.Vector3();
    let totalWeight = 0;
    const bounds = new THREE.Box3();
    entries.forEach((entry) => {
      const point = entry?.centerMesh;
      if (!point) return;
      bounds.expandByPoint(point);
      const weight = Number(entry.explodeWeight);
      if (Number.isFinite(weight) && weight > 1e-9) {
        weightedCenter.addScaledVector(point, weight);
        totalWeight += weight;
      }
    });
    if (totalWeight > 1e-9) return weightedCenter.divideScalar(totalWeight);
    return bounds.isEmpty() ? new THREE.Vector3() : bounds.getCenter(new THREE.Vector3());
  }

  _averageExplodeAxis(entries = []) {
    const axis = entries.reduce((acc, entry) => {
      if (entry?.longAxisMesh?.lengthSq?.() > 1e-9) acc.add(entry.longAxisMesh);
      return acc;
    }, new THREE.Vector3());
    return axis.lengthSq() > 1e-9 ? axis.normalize() : null;
  }

  _resolveExplodeDirection(point, primaryCenter, secondaryCenter, fallbackDir = null, index = 0, total = 1) {
    if (point?.clone) {
      const primaryOffset = primaryCenter?.clone ? point.clone().sub(primaryCenter) : point.clone();
      if (primaryOffset.lengthSq() > 1e-9) return primaryOffset.normalize();
      if (secondaryCenter?.clone) {
        const secondaryOffset = point.clone().sub(secondaryCenter);
        if (secondaryOffset.lengthSq() > 1e-9) return secondaryOffset.normalize();
      }
    }
    if (fallbackDir?.clone && fallbackDir.lengthSq() > 1e-9) return fallbackDir.clone().normalize();
    return this._createDeterministicDirection(index, total);
  }

  _ensureExplodeItems() {
    if (!this.mesh) {
      this._explodeItems = [];
      return this._explodeItems;
    }
    if (this._explodeItems.length) return this._explodeItems;

    const allTargets = this._getSelectableExplodeMeshes();
    const targets = this._getExplodableMeshes();
    if (!this._canExplodeTargetCounts(targets.length, allTargets.length, this._explodeScope)) {
      this._explodeItems = [];
      this._explodeBaseMaxDim = 1;
      return this._explodeItems;
    }

    this.modelGroup.updateMatrixWorld(true);
    this.mesh.updateMatrixWorld(true);
    this._explodeBaseMaxDim = this.computeBoundsWorld(this.mesh).maxDim || 1;

    const meshCenterBox = new THREE.Box3();
    const allEntries = allTargets.map((target) => {
      if (target.geometry?.computeBoundingBox) target.geometry.computeBoundingBox();
      const localBox = target.geometry?.boundingBox || null;
      const localCenter = this._resolveExplodeLocalCenter(target);
      const worldCenter = target.localToWorld(localCenter.clone());
      const meshCenter = this.mesh.worldToLocal(worldCenter.clone());
      meshCenterBox.expandByPoint(meshCenter);
      const boxSize = localBox?.getSize(new THREE.Vector3()) || new THREE.Vector3();
      const explodeWeight = this._resolveExplodeWeight(target, Math.max(boxSize.x, boxSize.y, boxSize.z, 0));
      const sortedDims = [boxSize.x, boxSize.y, boxSize.z].filter((value) => Number.isFinite(value)).sort((a, b) => b - a);
      const parallelWeight = sortedDims.length >= 2 && sortedDims[0] > 1e-9
        ? Math.max(0, Math.min(1, (sortedDims[0] - sortedDims[1]) / sortedDims[0]))
        : 0;
      return {
        target,
        basePosition: target.position.clone(),
        centerMesh: meshCenter,
        familyKey: this._resolveExplodeFamilyKey(target),
        sizeMax: Math.max(boxSize.x, boxSize.y, boxSize.z, 0),
        explodeWeight,
        longAxisMesh: this._resolveExplodeLongAxis(target),
        parallelWeight,
      };
    });

    const activeTargetSet = new Set(targets);
    const entries = allEntries.filter((entry) => activeTargetSet.has(entry.target));
    if (!this._canExplodeTargetCounts(entries.length, allEntries.length, this._explodeScope)) {
      this._explodeItems = [];
      this._explodeBaseMaxDim = 1;
      return this._explodeItems;
    }

    const assemblyCenter = this._computeExplodeCenter(allEntries);
    const scopeCenter = this._explodeScope === "selected"
      ? this._computeExplodeCenter(entries)
      : assemblyCenter.clone();
    const meshSpan = meshCenterBox.getSize(new THREE.Vector3());
    const modelLongAxisMesh = meshSpan.x >= meshSpan.y
      ? new THREE.Vector3(1, 0, 0)
      : new THREE.Vector3(0, 1, 0);
    const modelTransverseAxisMesh = meshSpan.x >= meshSpan.y
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(1, 0, 0);
    const modelVerticalAxisMesh = new THREE.Vector3(0, 0, 1);
    const symmetryStep = Math.max((this._explodeBaseMaxDim || 1) * 0.04, 0.016);
    const sizeStep = Math.max((this._explodeBaseMaxDim || 1) * 0.03, 0.008);
    const clusters = this._clusterExplodeEntries(entries);
    const baseDistance = (this._explodeBaseMaxDim || 1) * (this._explodeScope === "selected" ? 0.44 : 0.32);
    const maxClusterRadius = Math.max(
      1e-6,
      ...clusters.map((cluster) => cluster.center.distanceTo(scopeCenter))
    );

    this._explodeItems = [];
    clusters.forEach((cluster, clusterIndex) => {
      const clusterCenter = cluster.center?.clone ? cluster.center.clone() : this._computeExplodeCenter(cluster.entries);
      const clusterAxis = this._averageExplodeAxis(cluster.entries);
      const clusterDir = this._resolveExplodeDirection(
        clusterCenter,
        scopeCenter,
        assemblyCenter,
        clusterAxis,
        clusterIndex,
        clusters.length
      );
      const clusterRadius = clusterCenter.distanceTo(scopeCenter);
      const normalizedClusterRadius = maxClusterRadius > 1e-9
        ? Math.min(1, clusterRadius / maxClusterRadius)
        : 0;
      const localMaxDistance = Math.max(
        1e-6,
        ...cluster.entries.map((entry) => entry.centerMesh.distanceTo(clusterCenter))
      );
      const clusterDistanceBase = baseDistance * (
        this._explodeScope === "selected"
          ? 0.88 + 0.42 * normalizedClusterRadius
          : 0.68 + 0.56 * normalizedClusterRadius
      );

      cluster.entries.forEach((entry, entryIndex) => {
        const centerOffset = entry.centerMesh.clone().sub(scopeCenter);
        const localOffset = entry.centerMesh.clone().sub(clusterCenter);
        const localDistance = localOffset.length();
        let localDir = localDistance > 1e-9
          ? localOffset.clone().normalize()
          : this._buildOrthogonalVector(clusterDir, entryIndex);
        if (localDir.lengthSq() < 1e-9) localDir = clusterDir.clone();

        const itemDir = this._resolveExplodeDirection(
          entry.centerMesh,
          scopeCenter,
          assemblyCenter,
          entry.longAxisMesh || clusterDir,
          clusterIndex * 17 + entryIndex,
          Math.max(1, entries.length)
        );
        const blendedDir = cluster.entries.length > 1
          ? clusterDir.clone().multiplyScalar(0.74).add(itemDir.clone().multiplyScalar(0.34))
          : itemDir.clone();
        if (blendedDir.lengthSq() < 1e-9) blendedDir.copy(clusterDir);
        blendedDir.normalize();

        const sizeNormalized = this._explodeBaseMaxDim > 1e-9
          ? Math.min(1, entry.sizeMax / this._explodeBaseMaxDim)
          : 0;
        const clusterDistance = clusterDistanceBase * (0.86 + sizeNormalized * 0.34);
        const localDistanceFactor = cluster.entries.length > 1
          ? Math.min(1, localDistance / localMaxDistance)
          : 0;
        const localDistanceBase = cluster.entries.length > 1
          ? baseDistance * 0.18 * localDistanceFactor
          : 0;

        let fullOffsetMesh = blendedDir.clone().multiplyScalar(clusterDistance);
        if (localDistanceBase > 0) {
          fullOffsetMesh.addScaledVector(localDir, localDistanceBase);
        }
        if (entry.longAxisMesh?.lengthSq?.() > 1e-9 && fullOffsetMesh.dot(entry.longAxisMesh) < 0) {
          fullOffsetMesh.addScaledVector(
            entry.longAxisMesh.clone().normalize(),
            baseDistance * 0.06 * Math.max(0.2, Math.min(1, Number(entry.parallelWeight) || 0.2))
          );
        }
        if (fullOffsetMesh.lengthSq() < 1e-9) {
          fullOffsetMesh = clusterDir.clone().multiplyScalar(baseDistance);
        }

        const longitudinalValue = centerOffset.dot(modelLongAxisMesh);
        const centerTransverseValue = centerOffset.dot(modelTransverseAxisMesh);
        const centerVerticalValue = centerOffset.dot(modelVerticalAxisMesh);
        const longitudinalSign = this._resolveAxisSign(
          fullOffsetMesh.dot(modelLongAxisMesh),
          longitudinalValue,
          clusterIndex + entryIndex + 11
        );
        const transverseSign = this._resolveAxisSign(
          fullOffsetMesh.dot(modelTransverseAxisMesh),
          centerTransverseValue,
          clusterIndex + entryIndex
        );
        const verticalSign = this._resolveAxisSign(
          fullOffsetMesh.dot(modelVerticalAxisMesh),
          centerVerticalValue,
          clusterIndex + entryIndex + 37
        );
        const symmetryKey = [
          entry.familyKey || "component",
          this._quantizeExplodeValue(Math.abs(longitudinalValue), symmetryStep),
          this._quantizeExplodeValue(Math.abs(centerTransverseValue), symmetryStep),
          this._quantizeExplodeValue(Math.abs(centerVerticalValue), symmetryStep),
          this._quantizeExplodeValue(entry.sizeMax, sizeStep),
        ].join("|");
        const mirrorKey = [
          this._quantizeExplodeValue(Math.abs(longitudinalValue), symmetryStep),
          this._quantizeExplodeValue(Math.abs(centerTransverseValue), symmetryStep),
          this._quantizeExplodeValue(Math.abs(centerVerticalValue), symmetryStep),
          this._quantizeExplodeValue(entry.sizeMax, sizeStep),
        ].join("|");

        this._explodeItems.push({
          target: entry.target,
          basePosition: entry.basePosition,
          centerMesh: entry.centerMesh.clone(),
          fullOffsetMesh,
          symmetryKey,
          mirrorKey,
          longMag: Math.abs(fullOffsetMesh.dot(modelLongAxisMesh)),
          transMag: Math.abs(fullOffsetMesh.dot(modelTransverseAxisMesh)),
          vertMag: Math.abs(fullOffsetMesh.dot(modelVerticalAxisMesh)),
          longitudinalSign,
          transverseSign,
          verticalSign,
        });
      });
    });

    const applySymmetryBucket = (bucket) => {
      if (!Array.isArray(bucket) || bucket.length <= 1) return;
      const avgLongMag = bucket.reduce((sum, item) => sum + Math.abs(Number(item.longMag) || 0), 0) / bucket.length;
      const avgTransMag = bucket.reduce((sum, item) => sum + Math.abs(Number(item.transMag) || 0), 0) / bucket.length;
      const avgVertMag = bucket.reduce((sum, item) => sum + Math.abs(Number(item.vertMag) || 0), 0) / bucket.length;
      bucket.forEach((item) => {
        item.longMag = avgLongMag;
        item.transMag = avgTransMag;
        item.vertMag = avgVertMag;
        const rebuiltOffset = modelLongAxisMesh.clone().multiplyScalar((item.longitudinalSign || 1) * avgLongMag)
          .addScaledVector(modelTransverseAxisMesh, (item.transverseSign || 1) * avgTransMag)
          .addScaledVector(modelVerticalAxisMesh, (item.verticalSign || 1) * avgVertMag);
        if (rebuiltOffset.lengthSq() > 1e-9) item.fullOffsetMesh = rebuiltOffset;
      });
    };

    const symmetryBuckets = new Map();
    const symmetryCounts = new Map();
    this._explodeItems.forEach((item) => {
      const key = item.symmetryKey || "";
      if (!key) return;
      if (!symmetryBuckets.has(key)) symmetryBuckets.set(key, []);
      symmetryBuckets.get(key).push(item);
    });
    symmetryBuckets.forEach((bucket, key) => {
      symmetryCounts.set(key, Array.isArray(bucket) ? bucket.length : 0);
      applySymmetryBucket(bucket);
    });

    const mirrorBuckets = new Map();
    this._explodeItems.forEach((item) => {
      if ((symmetryCounts.get(item.symmetryKey || "") || 0) > 1) return;
      const key = item.mirrorKey || "";
      if (!key) return;
      if (!mirrorBuckets.has(key)) mirrorBuckets.set(key, []);
      mirrorBuckets.get(key).push(item);
    });
    mirrorBuckets.forEach((bucket) => applySymmetryBucket(bucket));

    return this._explodeItems;
  }

  getExplodablePartCount() {
    return this._getExplodableMeshes().length;
  }

  canExplode() {
    return this._canExplodeTargetCounts(
      this._getExplodableMeshes().length,
      this._getSelectableExplodeMeshes().length,
      this._explodeScope
    );
  }

  getExplodeFactor() {
    return this._explodeFactor || 0;
  }

  getExplodeScope() {
    return this._explodeScope;
  }

  setExplodeFactor(amount = 0) {
    const items = this._ensureExplodeItems();
    const clamped = Math.max(0, Math.min(1, Number(amount) || 0));
    this._explodeFactor = items.length ? clamped : 0;

    if (!items.length) return this._explodeFactor;

    this.modelGroup.updateMatrixWorld(true);
    this.mesh.updateMatrixWorld(true);

    items.forEach((item) => {
      const parent = item.target.parent;
      if (!parent) return;

      const fromWorld = this.mesh.localToWorld(item.centerMesh.clone());
      const targetMeshPoint = item.centerMesh.clone()
        .addScaledVector(item.fullOffsetMesh || new THREE.Vector3(), this._explodeFactor);
      const toWorld = this.mesh.localToWorld(targetMeshPoint);

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
