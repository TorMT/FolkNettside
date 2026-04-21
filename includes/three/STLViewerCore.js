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
    if (!this._explodeSelectionTokens?.size) return true;
    const aliases = this._getExplodeTargetAliases(target);
    return aliases.some((alias) => this._explodeSelectionTokens.has(alias));
  }

  _getExplodableMeshes() {
    return this._getRenderableMeshes().filter((target) => {
      return target && target !== this.mesh && this._matchesExplodeSelection(target);
    });
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

  setExplodeSelection(tokens = []) {
    const normalized = [...new Set((Array.isArray(tokens) ? tokens : [])
      .map((value) => this._normalizeExplodeToken(value))
      .filter(Boolean))];
    const next = normalized.length ? new Set(normalized) : null;
    const prevList = this._explodeSelectionTokens ? [...this._explodeSelectionTokens].sort() : [];
    const nextList = next ? [...next].sort() : [];
    const unchanged = prevList.length === nextList.length && prevList.every((value, index) => value === nextList[index]);
    if (unchanged) return;

    this._restoreExplodeBasePositions(this._explodeItems);
    this._explodeItems = [];
    this._explodeSelectionTokens = next;

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

  _ensureExplodeItems() {
    if (!this.mesh) {
      this._explodeItems = [];
      return this._explodeItems;
    }
    if (this._explodeItems.length) return this._explodeItems;

    const targets = this._getExplodableMeshes();
    if (targets.length <= 1) {
      this._explodeItems = [];
      this._explodeBaseMaxDim = 1;
      return this._explodeItems;
    }

    this.modelGroup.updateMatrixWorld(true);
    this.mesh.updateMatrixWorld(true);
    this._explodeBaseMaxDim = this.computeBoundsWorld(this.mesh).maxDim || 1;

    const weightedModelCenter = new THREE.Vector3();
    let totalExplodeWeight = 0;
    const meshCenterBox = new THREE.Box3();
    const entries = targets.map((target) => {
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
      if (Number.isFinite(explodeWeight) && explodeWeight > 0) {
        weightedModelCenter.addScaledVector(meshCenter, explodeWeight);
        totalExplodeWeight += explodeWeight;
      }
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

    const modelCenter = totalExplodeWeight > 1e-9
      ? weightedModelCenter.clone().divideScalar(totalExplodeWeight)
      : (
        meshCenterBox.isEmpty()
          ? new THREE.Vector3()
          : meshCenterBox.getCenter(new THREE.Vector3())
      );
    const meshSpan = meshCenterBox.getSize(new THREE.Vector3());
    const modelLongAxisMesh = meshSpan.x >= meshSpan.y
      ? new THREE.Vector3(1, 0, 0)
      : new THREE.Vector3(0, 1, 0);
    const modelTransverseAxisMesh = meshSpan.x >= meshSpan.y
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(1, 0, 0);
    const modelVerticalAxisMesh = new THREE.Vector3(0, 0, 1);
    const transverseHalfSpan = Math.max(
      1e-6,
      Math.abs(meshSpan.x >= meshSpan.y ? meshSpan.y : meshSpan.x) * 0.5
    );
    const xyCenterThreshold = Math.max(
      Math.max(meshSpan.x, meshSpan.y, 0) * 0.12,
      (this._explodeBaseMaxDim || 1) * 0.05,
      0.04
    );
    const symmetryStep = Math.max((this._explodeBaseMaxDim || 1) * 0.04, 0.016);
    const sizeStep = Math.max((this._explodeBaseMaxDim || 1) * 0.03, 0.008);
    const clusters = this._clusterExplodeEntries(entries);
    const maxClusterRadius = Math.max(
      1e-6,
      ...clusters.map((cluster) => cluster.center.distanceTo(modelCenter))
    );

    this._explodeItems = [];
    clusters.forEach((cluster, clusterIndex) => {
      const clusterOffset = cluster.center.clone().sub(modelCenter);
      const clusterXYDistance = Math.hypot(clusterOffset.x, clusterOffset.y);
      const preferVerticalExplode = clusterXYDistance <= xyCenterThreshold;
      let clusterDir = clusterOffset.clone();
      const clusterDistance = clusterDir.length();
      if (preferVerticalExplode) {
        const verticalSign = Math.abs(clusterOffset.z) > 1e-6
          ? Math.sign(clusterOffset.z)
          : (clusterIndex % 2 === 0 ? 1 : -1);
        clusterDir = new THREE.Vector3(0, 0, verticalSign || 1);
      } else if (clusterDistance < 1e-9) {
        clusterDir = this._createDeterministicDirection(clusterIndex, clusters.length);
      } else {
        clusterDir.normalize();
      }

      const localMaxDistance = Math.max(
        1e-6,
        ...cluster.entries.map((entry) => entry.centerMesh.distanceTo(cluster.center))
      );

      cluster.entries.forEach((entry, entryIndex) => {
        const centerOffset = entry.centerMesh.clone().sub(modelCenter);
        const longitudinalValue = centerOffset.dot(modelLongAxisMesh);
        const clusterLongitudinalValue = clusterOffset.dot(modelLongAxisMesh);
        const longitudinalSign = this._resolveAxisSign(
          longitudinalValue,
          clusterLongitudinalValue,
          clusterIndex + entryIndex + 11
        );
        const clusterTransverseValue = clusterOffset.dot(modelTransverseAxisMesh);
        const centerTransverseValue = centerOffset.dot(modelTransverseAxisMesh);
        const transverseSign = this._resolveAxisSign(
          centerTransverseValue,
          clusterTransverseValue,
          clusterIndex + entryIndex
        );
        const centerVerticalValue = centerOffset.dot(modelVerticalAxisMesh);
        const verticalSign = this._resolveAxisSign(
          centerVerticalValue,
          clusterOffset.dot(modelVerticalAxisMesh),
          clusterIndex + entryIndex + 37
        );
        const longitudinalDir = modelLongAxisMesh.clone().multiplyScalar(longitudinalSign).normalize();
        const transverseDir = modelTransverseAxisMesh.clone().multiplyScalar(transverseSign).normalize();
        let localDir = entry.centerMesh.clone().sub(cluster.center);
        if (preferVerticalExplode) {
          // Keep centered stacks readable without sending them too far in Z.
          localDir.z *= 0.03;
        }
        const localDistance = localDir.length();
        const localTransverseValue = localDir.dot(modelTransverseAxisMesh);
        if (localDistance < 1e-9) {
          localDir = transverseDir.clone().multiplyScalar(0.82).add(longitudinalDir.clone().multiplyScalar(0.38));
        } else {
          localDir.normalize();
          const localLongMag = Math.abs(localDir.dot(modelLongAxisMesh));
          const localTransMag = Math.abs(localDir.dot(modelTransverseAxisMesh));
          const localVertMag = Math.abs(localDir.dot(modelVerticalAxisMesh));
          localDir = modelLongAxisMesh.clone().multiplyScalar(longitudinalSign * localLongMag)
            .addScaledVector(modelTransverseAxisMesh, transverseSign * localTransMag)
            .addScaledVector(modelVerticalAxisMesh, verticalSign * localVertMag * 0.35);
          if (preferVerticalExplode) localDir.z *= 0.4;
        }
        if (localDir.lengthSq() < 1e-9) localDir = this._buildOrthogonalVector(clusterDir, entryIndex);
        else localDir.normalize();

        const dirMesh = cluster.entries.length > 1
          ? clusterDir.clone().multiplyScalar(0.82).add(localDir.clone().multiplyScalar(0.56)).normalize()
          : clusterDir.clone();
        let parallelDir = clusterDir.clone();
        if (entry.longAxisMesh?.lengthSq?.() > 1e-9) {
          const axisLong = Math.abs(entry.longAxisMesh.dot(modelLongAxisMesh));
          const axisTrans = Math.abs(entry.longAxisMesh.dot(modelTransverseAxisMesh));
          const axisVert = Math.abs(entry.longAxisMesh.dot(modelVerticalAxisMesh));
          if (axisVert > axisLong && axisVert > axisTrans) {
            parallelDir = modelVerticalAxisMesh.clone().multiplyScalar(verticalSign);
          } else if (axisTrans > axisLong) {
            parallelDir = modelTransverseAxisMesh.clone().multiplyScalar(transverseSign);
          } else {
            parallelDir = modelLongAxisMesh.clone().multiplyScalar(longitudinalSign);
          }
        }
        if (preferVerticalExplode) parallelDir.z *= 0.18;
        if (parallelDir.lengthSq() < 1e-9) parallelDir = clusterDir.clone();
        else parallelDir.normalize();
        const transverseNormalized = Math.min(1, Math.abs(centerTransverseValue) / transverseHalfSpan);
        const transverseCenterBoost = 1 - transverseNormalized;

        const clusterWeight = 1.08 + 0.72 * Math.min(1, clusterDistance / maxClusterRadius) + (preferVerticalExplode ? -0.24 : 0);
        const localWeight = cluster.entries.length > 1
          ? 0.32 + 0.62 * Math.min(1, localDistance / localMaxDistance)
          : 0;
        const verticalScale = preferVerticalExplode ? 0.12 : 1;
        const transverseWeight = (preferVerticalExplode ? 0.5 : 0.22) + 0.9 * transverseCenterBoost;
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
          clusterDirMesh: clusterDir.clone(),
          localDirMesh: localDir.clone(),
          parallelDirMesh: parallelDir.clone(),
          transverseDirMesh: transverseDir.clone(),
          dirMesh,
          radialWeight: Math.min(1.6, clusterWeight + localWeight),
          clusterWeight,
          localWeight,
          clusterSize: cluster.entries.length,
          verticalScale,
          parallelWeight: Number.isFinite(entry.parallelWeight) ? entry.parallelWeight : 0,
          transverseWeight,
          symmetryKey,
          mirrorKey,
          longitudinalSign,
          transverseSign,
          verticalSign,
        });
      });
    });

    const applySymmetryBucket = (bucket) => {
      if (!Array.isArray(bucket) || bucket.length <= 1) return;
      const avgClusterWeight = bucket.reduce((sum, item) => sum + (Number(item.clusterWeight) || 0), 0) / bucket.length;
      const avgLocalWeight = bucket.reduce((sum, item) => sum + (Number(item.localWeight) || 0), 0) / bucket.length;
      const avgParallelWeight = bucket.reduce((sum, item) => sum + (Number(item.parallelWeight) || 0), 0) / bucket.length;
      const avgTransverseWeight = bucket.reduce((sum, item) => sum + (Number(item.transverseWeight) || 0), 0) / bucket.length;
      const avgVerticalScale = bucket.reduce((sum, item) => sum + (Number(item.verticalScale) || 0), 0) / bucket.length;
      const avgClusterLongMag = bucket.reduce((sum, item) => sum + Math.abs(item.clusterDirMesh?.dot?.(modelLongAxisMesh) || 0), 0) / bucket.length;
      const avgClusterTransMag = bucket.reduce((sum, item) => sum + Math.abs(item.clusterDirMesh?.dot?.(modelTransverseAxisMesh) || 0), 0) / bucket.length;
      const avgClusterVertMag = bucket.reduce((sum, item) => sum + Math.abs(item.clusterDirMesh?.dot?.(modelVerticalAxisMesh) || 0), 0) / bucket.length;
      const avgLocalLongMag = bucket.reduce((sum, item) => sum + Math.abs(item.localDirMesh?.dot?.(modelLongAxisMesh) || 0), 0) / bucket.length;
      const avgLocalTransMag = bucket.reduce((sum, item) => sum + Math.abs(item.localDirMesh?.dot?.(modelTransverseAxisMesh) || 0), 0) / bucket.length;
      const avgLocalVertMag = bucket.reduce((sum, item) => sum + Math.abs(item.localDirMesh?.dot?.(modelVerticalAxisMesh) || 0), 0) / bucket.length;
      bucket.forEach((item) => {
        item.clusterWeight = avgClusterWeight;
        item.localWeight = avgLocalWeight;
        item.parallelWeight = avgParallelWeight;
        item.transverseWeight = avgTransverseWeight;
        item.verticalScale = avgVerticalScale;
        item.radialWeight = Math.min(1.6, item.clusterWeight + item.localWeight);
        const rebuiltClusterDir = modelLongAxisMesh.clone().multiplyScalar((item.longitudinalSign || 1) * avgClusterLongMag)
          .addScaledVector(modelTransverseAxisMesh, (item.transverseSign || 1) * avgClusterTransMag)
          .addScaledVector(modelVerticalAxisMesh, (item.verticalSign || 1) * avgClusterVertMag);
        if (rebuiltClusterDir.lengthSq() > 1e-9) item.clusterDirMesh = rebuiltClusterDir.normalize();
        const rebuiltLocalDir = modelLongAxisMesh.clone().multiplyScalar((item.longitudinalSign || 1) * avgLocalLongMag)
          .addScaledVector(modelTransverseAxisMesh, (item.transverseSign || 1) * avgLocalTransMag)
          .addScaledVector(modelVerticalAxisMesh, (item.verticalSign || 1) * avgLocalVertMag);
        if (rebuiltLocalDir.lengthSq() > 1e-9) item.localDirMesh = rebuiltLocalDir.normalize();
        item.dirMesh = item.clusterDirMesh.clone().multiplyScalar(0.82).add(item.localDirMesh.clone().multiplyScalar(0.56)).normalize();
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

    // Make low explode values noticeably calmer, while still allowing wide separation near the top end.
    const easedFactor = Math.pow(this._explodeFactor, 1.75);
    const sensitivityScale = 1 / 5.25;
    const spreadMultiplier = 1.18 + Math.min(0.92, items.length * 0.024);
    const spreadDistance = (this._explodeBaseMaxDim || 1) * spreadMultiplier * easedFactor * sensitivityScale;

    items.forEach((item) => {
      const parent = item.target.parent;
      if (!parent) return;

      const fromWorld = this.mesh.localToWorld(item.centerMesh.clone());
      const verticalScale = Number.isFinite(item.verticalScale) ? item.verticalScale : 1;
      const clusterDistance = spreadDistance * (item.clusterWeight || item.radialWeight || 1) * verticalScale;
      const localDistance = spreadDistance
        * (item.clusterSize > 1 ? (0.24 + 0.54 * easedFactor) * (item.localWeight || 0) : 0);
      const parallelDistance = spreadDistance
        * (0.72 + 0.38 * easedFactor)
        * Math.max(0, Math.min(1, Number(item.parallelWeight) || 0));
      const transverseDistance = spreadDistance
        * (0.34 + 0.32 * easedFactor)
        * Math.max(0, Math.min(1.4, Number(item.transverseWeight) || 0));
      const targetMeshPoint = item.centerMesh.clone()
        .addScaledVector(item.clusterDirMesh || item.dirMesh, clusterDistance)
        .addScaledVector(item.localDirMesh || item.dirMesh, localDistance)
        .addScaledVector(item.parallelDirMesh || item.dirMesh, parallelDistance)
        .addScaledVector(item.transverseDirMesh || item.dirMesh, transverseDistance);
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
