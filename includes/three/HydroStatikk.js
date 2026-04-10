// /includes/three/HydroStatikk.js
//
// HydroStatikk – optimalisert hydrostatikkpakke (Z-up, X-forward, Y-starboard)
//
// Fokus:
// - Robust WL i world XY (z = draft)
// - Live: volum (Δvol) + CB + waterplane-props (Awp/LCF/TCF/Ixx/Iyy/Ixy) + BM/GM + GZ_now
// - On-demand (rapport): GZ-kurve (+ valgfri SAK-kurve)
// - On-demand: Draft-scan (vol/Δ/KB/Awp/+valgfri SAK)
// - Target displacement: finn draft (tonn -> draft) via binærsøk (low, WP/SAK av)
// - Equilibrium solve: robust (scan etter sign-change + bisect)
//
// Viktig:
// - IKKE roter scene/camera her.
// - Modellen skal orienteres av Align/Loader (f.eks. alignGroup).
// - hydroRotGroup brukes til trim/heel (dynamisk).
//
// Enheter:
// - Volum i “world units^3”. Displacement tonn bruker waterDensity (kg/m^3) som skala.
//   (Hvis modellen ikke er i meter: tonn blir “pseudo-tonn”. Det er ok hvis du bruker det relativt.)

import * as THREE from "./three.module.js";

export class HydroStatikk {
  constructor(core) {
    this.core = core;
    this.scene = core.scene;
    this.modelGroup = core.modelGroup;
    this.hydroRotGroup = core.hydroRotGroup;

    // Mesh
    this.mesh = null;

    // Waterline (world XY)
    this.waterPlane = null;
    this.wlVisible = false;
    this.draftZWorld = 0;

    // WL-contour (rød skjæringskurve mellom vannplanet og modellen)
    this.wlContour = null;          // THREE.LineSegments
    this.wlContourVisible = true;
    this._wlContourDirty = true;
    this._wlContourMaxSeg = 30000;  // cap for store STL (antall segmenter)


    // CG/CB markers
    this.cgMarker = null;
    this.cbMarker = null;
    this.markersVisible = { cg: true, cb: true };
    this.cgLocal = null;

    // Hydro state
    this.hydroTimer = null;
    this._hiTimer = null;
    this.hydroBusy = false;

    // Quality
    this.userQuality = "med"; // "low" | "med" | "high"
    this.quality = "med";
    this.wpNy = 140;

    // SAK: live AV (default). On-demand er OK.
    this.enableLiveSAK = false;
    this.liveSAKTimeSliceMs = 5;
    this.reportSAKTimeSliceMs = 10;

    // Axes (for trim/heel setters)
    this.axis = { rollAxis: "x", pitchAxis: "y", upAxis: "z" };
    this.materialDensity = null; // kg/m^3 (modell / last)
    this.massProperties = null;
    this._raycastProxy = null;

    // Physical params
    this.waterDensity = 1025; // kg/m^3 (sjøvann)

    // Results (extended)
    this.lastHydro = {
      subV: null,
      cbW: null,
      cgW: null,

      wp: null,        // {A,xF,yF,Ixx,Iyy,Ixy}
      kb: null,
      kg: null,
      bm: null,        // {roll,pitch}
      gm: null,        // {roll,pitch}
      gz_now: null,    // {roll,pitch}

      sak: null        // wetted surface area (units^2) (kun hvis beregnet)
    };

    // Current trim/heel tracking
    this.trimDeg = 0;
    this.heelDeg = 0;

    // Raycaster (volum + waterplane)
    this.raycaster = new THREE.Raycaster();
    this._rayDir = new THREE.Vector3(1, 0, 0);
    this._rayOrigin = new THREE.Vector3();

    // Temps / reuse
    this._tmpBox = new THREE.Box3();
    this._tmpMatA = new THREE.Matrix4();
    this._tmpMatB = new THREE.Matrix4();
    this._tmpMatC = new THREE.Matrix4();
    this._tmpPos = new THREE.Vector3();
    this._tmpQuat = new THREE.Quaternion();
    this._tmpScale = new THREE.Vector3();
    this._pts8 = Array.from({ length: 8 }, () => new THREE.Vector3());

    // SAK triangle cache
    if (this.wlContour) {
      this.wlContour.geometry.dispose();
      this.wlContour.material.dispose();
      this.scene.remove(this.wlContour);
      this.wlContour = null;
    }
    this._triCache = null; // { pos, index, triCount }
    this._p0 = new THREE.Vector3();
    this._p1 = new THREE.Vector3();
    this._p2 = new THREE.Vector3();
    this._i0 = new THREE.Vector3();
    this._i1 = new THREE.Vector3();

    // Cache invalidation flags (kun små gevinster, men trygt)
    this._cache = {
      worldBounds: null,
      worldBoundsDirty: true,
      refBounds: null,
      refBoundsDirty: true
    };
  }

  // ============================================================
  // CONFIG
  // ============================================================

  setAxisConfig(cfg = {}) {
    if (cfg.upAxis && cfg.upAxis !== "z") {
      console.warn("[HydroStatikk] upAxis må være 'z' i denne pakken.");
    }
    if (cfg.rollAxis) this.axis.rollAxis = cfg.rollAxis;
    if (cfg.pitchAxis) this.axis.pitchAxis = cfg.pitchAxis;
  }

  setWaterplaneSampling(ny) {
    this.wpNy = Math.max(20, Math.min(400, Number(ny) || 140));
    this.scheduleRecalc(false);
  }

  setLiveSAKEnabled(enabled) {
    this.enableLiveSAK = !!enabled;
    this.scheduleRecalc(false);
  }

  setWaterDensity(rho) {
    // keep sane bounds
    this.waterDensity = Math.max(900, Math.min(1100, Number(rho) || 1025));
  }

  setMaterialDensity(rho) {
    const value = Number(rho);
    this.materialDensity = Number.isFinite(value) && value > 0 ? Math.min(50000, Math.max(1, value)) : null;
    this._syncMassPropertiesFromMesh();
  }

  // Call this if *other scripts* changes transforms (alignGroup, etc.)
  notifyTransformChanged() {
    this._invalidateCache();
    this.updateWaterPlane();
    this.scheduleRecalc(false);
  }

  // ============================================================
  // SETUP
  // ============================================================

  setMesh(mesh) {
    this.mesh = mesh;
    this._syncRaycastProxy();
    this._buildTriCache();
    this._syncMassPropertiesFromMesh();
    this._invalidateCache();
    this.ensureWaterPlane();
    this.ensureMarkers();
    this.updateMarkerSizes();
    this.updateMarkers();
    this._wlContourDirty = true;
    this.ensureWaterlineContour();
    this.updateWaterlineContour();
    this.scheduleRecalc(false);
  }

  setCGLocal(vec3OrNull) {
    this.cgLocal = vec3OrNull ? vec3OrNull.clone() : null;
    this.updateMarkers();
    this.scheduleRecalc(false);
  }

  _buildTriCache() {
    const geometry = this.mesh?.geometry || this.mesh?.userData?.aggregateGeometry || null;
    if (!this.mesh || !geometry) {
      if (this.wlContour) {
      this.wlContour.geometry.dispose();
      this.wlContour.material.dispose();
      this.scene.remove(this.wlContour);
      this.wlContour = null;
    }
    this._triCache = null;
      return;
    }
    const g = geometry;
    const posAttr = g.getAttribute("position");
    if (!posAttr) {
      if (this.wlContour) {
      this.wlContour.geometry.dispose();
      this.wlContour.material.dispose();
      this.scene.remove(this.wlContour);
      this.wlContour = null;
    }
    this._triCache = null;
      return;
    }
    const pos = posAttr.array; // Float32Array
    const idxAttr = g.index;
    const index = idxAttr ? idxAttr.array : null;
    const triCount = index ? (index.length / 3) : (pos.length / 9);
    this._triCache = { pos, index, triCount };
  }

  _syncRaycastProxy() {
    this._raycastProxy = null;
    if (!this.mesh) return;
    const geometry = this.mesh.geometry || this.mesh.userData?.aggregateGeometry || null;
    if (!geometry) return;
    if (this.mesh.isMesh && this.mesh.geometry === geometry) return;
    this._raycastProxy = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    this._raycastProxy.matrixAutoUpdate = false;
    this._raycastProxy.visible = false;
    this._raycastProxy.frustumCulled = false;
  }

  _getRaycastTarget() {
    if (!this.mesh) return null;
    if (!this._raycastProxy && !(this.mesh.isMesh && this.mesh.geometry)) {
      this._syncRaycastProxy();
    }
    if (!this._raycastProxy) return this.mesh;
    this.mesh.updateMatrixWorld(true);
    this._raycastProxy.matrixWorld.copy(this.mesh.matrixWorld);
    return this._raycastProxy;
  }

  _getModelMaterialDensity() {
    if (Number.isFinite(this.materialDensity) && this.materialDensity > 0) return this.materialDensity;
    const hint = this.mesh?.userData?.modelMeta?.materialHint || null;
    const direct = Number(hint?.densityKgM3);
    if (Number.isFinite(direct) && direct > 0) return direct;
    const profile = Number(hint?.profile?.density);
    return Number.isFinite(profile) && profile > 0 ? profile : null;
  }

  _getDefaultDensitySource() {
    if (Number.isFinite(this.materialDensity) && this.materialDensity > 0) return "uniform-panel";
    const hint = this.mesh?.userData?.modelMeta?.materialHint || null;
    const direct = Number(hint?.densityKgM3);
    const profile = Number(hint?.profile?.density);
    if ((Number.isFinite(direct) && direct > 0) || (Number.isFinite(profile) && profile > 0)) {
      return "uniform-model-hint";
    }
    const fallback = this._getModelMaterialDensity();
    return Number.isFinite(fallback) && fallback > 0 ? "uniform-fallback" : "unresolved";
  }

  _vectorFromPlain(value) {
    if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.y) || !Number.isFinite(value.z)) return null;
    return new THREE.Vector3(value.x, value.y, value.z);
  }

  _vectorToPlain(value) {
    if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.y) || !Number.isFinite(value.z)) return null;
    return { x: value.x, y: value.y, z: value.z };
  }

  _zeroMoments() {
    return { xx: 0, xy: 0, xz: 0, yy: 0, yz: 0, zz: 0 };
  }

  _momentToInertia(secondMoments) {
    if (!secondMoments) return null;
    return {
      xx: secondMoments.yy + secondMoments.zz,
      xy: -secondMoments.xy,
      xz: -secondMoments.xz,
      yy: secondMoments.xx + secondMoments.zz,
      yz: -secondMoments.yz,
      zz: secondMoments.xx + secondMoments.yy,
    };
  }

  _shiftSecondMoments(secondMomentsOrigin, scalar, centroidLocal) {
    const c = this._vectorFromPlain(centroidLocal) || new THREE.Vector3();
    const factor = Number(scalar) || 0;
    if (!factor || !secondMomentsOrigin) return this._zeroMoments();
    return {
      xx: secondMomentsOrigin.xx - factor * c.x * c.x,
      xy: secondMomentsOrigin.xy - factor * c.x * c.y,
      xz: secondMomentsOrigin.xz - factor * c.x * c.z,
      yy: secondMomentsOrigin.yy - factor * c.y * c.y,
      yz: secondMomentsOrigin.yz - factor * c.y * c.z,
      zz: secondMomentsOrigin.zz - factor * c.z * c.z,
    };
  }

  _syncMassPropertiesFromMesh() {
    const components = Array.isArray(this.mesh?.userData?.componentMassProps)
      ? this.mesh.userData.componentMassProps
      : [];
    const fallbackGeometry = this.mesh?.userData?.geometryMassProps || null;

    if (!components.length && !fallbackGeometry) {
      this.massProperties = null;
      this.cgLocal = null;
      this.updateMarkers();
      return;
    }

    const defaultDensity = this._getModelMaterialDensity();
    const defaultDensitySource = this._getDefaultDensitySource();
    const validComponents = components.length ? components : [fallbackGeometry];
    const resolvedDensityEntries = validComponents.map((entry) => {
      const localDensity = Number(entry?.densityKgM3);
      const hintDensity = Number(entry?.materialHint?.densityKgM3 || entry?.materialHint?.profile?.density);
      if (Number.isFinite(localDensity) && localDensity > 0) {
        return { density: localDensity, source: "component-density" };
      }
      if (Number.isFinite(hintDensity) && hintDensity > 0) {
        return { density: hintDensity, source: "component-material-hint" };
      }
      if (Number.isFinite(defaultDensity) && defaultDensity > 0) {
        return { density: defaultDensity, source: defaultDensitySource };
      }
      return { density: null, source: "unresolved" };
    });
    const densityResolved = resolvedDensityEntries.every((entry) => Number.isFinite(entry?.density) && entry.density > 0);

    let totalVolume = 0;
    let totalScalar = 0;
    const centerAccumulator = new THREE.Vector3();
    const secondMomentsOrigin = this._zeroMoments();
    const densitySourceCounts = {};

    const componentSummaries = validComponents.map((entry, index) => {
      const volume = Number(entry?.volume) || 0;
      const centroidLocal = this._vectorFromPlain(entry?.centroidLocal) || new THREE.Vector3();
      const densityEntry = resolvedDensityEntries[index] || { density: null, source: "unresolved" };
      const density = densityEntry.density;
      const densitySource = densityEntry.source || "unresolved";
      const scalar = densityResolved ? density : 1;
      totalVolume += volume;
      totalScalar += volume * scalar;
      centerAccumulator.addScaledVector(centroidLocal, volume * scalar);
      densitySourceCounts[densitySource] = (densitySourceCounts[densitySource] || 0) + 1;

      secondMomentsOrigin.xx += (Number(entry?.secondMomentsOrigin?.xx) || 0) * scalar;
      secondMomentsOrigin.xy += (Number(entry?.secondMomentsOrigin?.xy) || 0) * scalar;
      secondMomentsOrigin.xz += (Number(entry?.secondMomentsOrigin?.xz) || 0) * scalar;
      secondMomentsOrigin.yy += (Number(entry?.secondMomentsOrigin?.yy) || 0) * scalar;
      secondMomentsOrigin.yz += (Number(entry?.secondMomentsOrigin?.yz) || 0) * scalar;
      secondMomentsOrigin.zz += (Number(entry?.secondMomentsOrigin?.zz) || 0) * scalar;

      return {
        key: entry?.key || `component-${index + 1}`,
        name: entry?.name || `Komponent ${index + 1}`,
        nodePath: entry?.nodePath || "",
        sourceName: entry?.sourceName || "",
        volumeM3: volume,
        densityKgM3: Number.isFinite(density) && density > 0 ? density : null,
        densitySource,
        massKg: densityResolved && Number.isFinite(density) && density > 0 ? volume * density : null,
        massTonnes: densityResolved && Number.isFinite(density) && density > 0 ? (volume * density) / 1000 : null,
        centroidLocal: this._vectorToPlain(centroidLocal),
      };
    });

    const centroid = totalScalar > 1e-12
      ? centerAccumulator.divideScalar(totalScalar)
      : this._vectorFromPlain(fallbackGeometry?.centroidLocal) || new THREE.Vector3();
    const secondMomentsCentroid = this._shiftSecondMoments(secondMomentsOrigin, totalScalar, this._vectorToPlain(centroid));
    const componentDensitySources = [...new Set(componentSummaries.map((entry) => entry.densitySource).filter(Boolean))];
    const densityMode = !densityResolved
      ? "unresolved"
      : componentDensitySources.every((source) => source === "component-density" || source === "component-material-hint")
        ? "per-component"
        : componentDensitySources.every((source) => source.startsWith("uniform-"))
          ? "uniform"
          : "mixed";
    const densityNote = densityMode === "per-component"
      ? "Tetthet er lest komponent for komponent der modellmateriale finnes."
      : densityMode === "uniform"
        ? "Lik tetthet er brukt p\u00e5 alle komponenter."
        : densityMode === "mixed"
          ? "Noen komponenter bruker egne materialdata, resten bruker felles tetthet."
          : "Ikke alle komponenter har kjent tetthet; masse er ikke fullt bestemt.";

    this.massProperties = {
      source: "mesh-components",
      componentCount: componentSummaries.length,
      densityKgM3: densityResolved && totalVolume > 1e-12 ? totalScalar / totalVolume : defaultDensity || null,
      densityResolved,
      densityMode,
      densityNote,
      densitySourceCounts,
      defaultDensityKgM3: Number.isFinite(defaultDensity) && defaultDensity > 0 ? defaultDensity : null,
      defaultDensitySource,
      totalVolumeM3: totalVolume,
      totalMassKg: densityResolved ? totalScalar : null,
      totalMassTonnes: densityResolved ? totalScalar / 1000 : null,
      centerOfMassLocal: this._vectorToPlain(centroid),
      centerMode: densityResolved ? "mass-weighted" : "volume-weighted",
      massMethod: densityResolved ? "component-mesh-steiner" : "volume-centroid-fallback",
      massMethodLabel: densityResolved
        ? "Komponentmesh kombinert med Steiner/parallellakseteorem"
        : "Volumveid centroid uten full masselosning",
      secondMomentsOrigin: densityResolved ? secondMomentsOrigin : null,
      secondMomentsCentroid: densityResolved ? secondMomentsCentroid : null,
      inertiaOrigin: densityResolved ? this._momentToInertia(secondMomentsOrigin) : null,
      inertiaCentroid: densityResolved ? this._momentToInertia(secondMomentsCentroid) : null,
      components: componentSummaries,
    };

    this.cgLocal = centroid.clone();
    this.updateMarkers();
  }

  getMassProperties() {
    if (!this.massProperties) return null;
    const centerLocal = this._vectorFromPlain(this.massProperties.centerOfMassLocal);
    const centerWorld = centerLocal ? this.core.localToWorldPoint(centerLocal) : null;
    return {
      ...this.massProperties,
      centerOfMassWorld: this._vectorToPlain(centerWorld),
      kgWorld: Number.isFinite(centerWorld?.z) ? centerWorld.z : null,
    };
  }

  _invalidateCache() {
    this._cache.worldBoundsDirty = true;
    this._cache.refBoundsDirty = true;
  }

  // ============================================================
  // BOUNDS
  // ============================================================

  // World bounds (inkl trim/heel). For grid.
  getWorldBounds() {
    if (!this._cache.worldBoundsDirty && this._cache.worldBounds) return this._cache.worldBounds;

    if (!this.mesh) {
      const def = { min: new THREE.Vector3(), max: new THREE.Vector3(), center: new THREE.Vector3(), maxDim: 1 };
      this._cache.worldBounds = def;
      this._cache.worldBoundsDirty = false;
      return def;
    }

    this.hydroRotGroup.updateMatrixWorld(true);
    this.mesh.updateMatrixWorld(true);

    this._tmpBox.setFromObject(this.mesh);

    const minW = this._tmpBox.min.clone();
    const maxW = this._tmpBox.max.clone();
    const centerW = this._tmpBox.getCenter(new THREE.Vector3());
    const maxDim = Math.max(maxW.x - minW.x, maxW.y - minW.y, maxW.z - minW.z);

    const out = { min: minW, max: maxW, center: centerW, maxDim };
    this._cache.worldBounds = out;
    this._cache.worldBoundsDirty = false;
    return out;
  }

  // Reference bounds: world, men fjerner hydroRotGroup sin WORLD-rotasjon.
  // (alignGroup blir stående, trim/heel fjernes)
  getReferenceBoundsNoHydroRot() {
    if (!this._cache.refBoundsDirty && this._cache.refBounds) return this._cache.refBounds;

    if (!this.mesh) {
      const def = { min: new THREE.Vector3(), max: new THREE.Vector3(), center: new THREE.Vector3(), maxDim: 1 };
      this._cache.refBounds = def;
      this._cache.refBoundsDirty = false;
      return def;
    }

    const geom = this.mesh.geometry || this.mesh.userData?.aggregateGeometry;
    geom.computeBoundingBox();
    const bb = geom.boundingBox;

    this.hydroRotGroup.updateMatrixWorld(true);
    this.mesh.updateMatrixWorld(true);

    const hydroWorld = this.hydroRotGroup.matrixWorld;
    hydroWorld.decompose(this._tmpPos, this._tmpQuat, this._tmpScale);

    // hydroNoRotWorld = T * I * S
    const hydroNoRotWorld = this._tmpMatA.compose(
      this._tmpPos,
      new THREE.Quaternion(),
      this._tmpScale
    );

    // rest = inv(hydroWorld) * meshWorld
    const invHydroWorld = this._tmpMatB.copy(hydroWorld).invert();
    const rest = this._tmpMatC.multiplyMatrices(invHydroWorld, this.mesh.matrixWorld);

    // meshNoRotWorld = hydroNoRotWorld * rest
    const meshNoRotWorld = hydroNoRotWorld.clone().multiply(rest);

    const min = bb.min, max = bb.max;

    this._pts8[0].set(min.x, min.y, min.z).applyMatrix4(meshNoRotWorld);
    this._pts8[1].set(min.x, min.y, max.z).applyMatrix4(meshNoRotWorld);
    this._pts8[2].set(min.x, max.y, min.z).applyMatrix4(meshNoRotWorld);
    this._pts8[3].set(min.x, max.y, max.z).applyMatrix4(meshNoRotWorld);
    this._pts8[4].set(max.x, min.y, min.z).applyMatrix4(meshNoRotWorld);
    this._pts8[5].set(max.x, min.y, max.z).applyMatrix4(meshNoRotWorld);
    this._pts8[6].set(max.x, max.y, min.z).applyMatrix4(meshNoRotWorld);
    this._pts8[7].set(max.x, max.y, max.z).applyMatrix4(meshNoRotWorld);

    const boxW = new THREE.Box3().setFromPoints(this._pts8);

    const minW = boxW.min.clone();
    const maxW = boxW.max.clone();
    const centerW = boxW.getCenter(new THREE.Vector3());
    const maxDim = Math.max(maxW.x - minW.x, maxW.y - minW.y, maxW.z - minW.z);

    const out = { min: minW, max: maxW, center: centerW, maxDim };
    this._cache.refBounds = out;
    this._cache.refBoundsDirty = false;
    return out;
  }

  // ============================================================
  // WATERLINE (WORLD XY)
  // ============================================================

  applyWaterPlaneOrientation() {
    if (!this.waterPlane) return;
    // PlaneGeometry ligger i XY med normal +Z => identity = world XY
    this.waterPlane.quaternion.set(0, 0, 0, 1);
  }

  ensureWaterPlane() {
    if (!this.mesh || this.waterPlane) return;

    const ref = this.getReferenceBoundsNoHydroRot();
    const planeSize = ref.maxDim * 5.0;

    const g = new THREE.PlaneGeometry(planeSize, planeSize);
    const m = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.waterPlane = new THREE.Mesh(g, m);

    this.applyWaterPlaneOrientation();
    this.waterPlane.position.set(ref.center.x, ref.center.y, this.draftZWorld);
    this.waterPlane.visible = this.wlVisible;

    this.scene.add(this.waterPlane);
  }

  updateWaterPlane() {
    if (!this.mesh) return;
    this.ensureWaterPlane();

    const ref = this.getReferenceBoundsNoHydroRot();
    const planeSize = ref.maxDim * 5.0;

    this.applyWaterPlaneOrientation();
    this.waterPlane.position.set(ref.center.x, ref.center.y, this.draftZWorld);
    this._wlContourDirty = true;
    this.updateWaterlineContour();


    if (this.waterPlane.geometry.parameters.width !== planeSize) {
      this.waterPlane.geometry.dispose();
      this.waterPlane.geometry = new THREE.PlaneGeometry(planeSize, planeSize);
    }

    this.waterPlane.visible = this.wlVisible;
  }


  // ============================================================
  // WATERLINE CONTOUR (mesh ∩ z = draftZWorld) – stub (ingen snitt ennå)
  // ============================================================

  ensureWaterlineContour() {
    if (!this.mesh || this.wlContour) return;

    const geom = new THREE.BufferGeometry();
    // Tom pos-attributt så Three ikke klager
    geom.setAttribute("position", new THREE.Float32BufferAttribute([], 3));

    const mat = new THREE.LineBasicMaterial({
      color: 0xef4444,      // rød
      transparent: true,
      opacity: 1.0,
      depthTest: false,   // ← VIKTIG
      depthWrite: false  // ← VIKTIG
    });

    this.wlContour = new THREE.LineSegments(geom, mat);
    this.wlContour.frustumCulled = false; // unngå at den “forsvinner” pga bounds
    this.wlContour.renderOrder = 999;
    this.wlContour.visible = !!this.wlContourVisible;

    this.scene.add(this.wlContour);
  }

  setWaterlineContourVisible(visible) {
    this.wlContourVisible = !!visible;
    if (this.wlContour) this.wlContour.visible = this.wlContourVisible;
  }

 
updateWaterlineContour() {
  if (!this.mesh) return;
  this.ensureWaterlineContour();
  if (!this.wlContour) return;

  // Synlighet uansett
  this.wlContour.visible = true;

  // Kommenter ut denne hvis du vil tvinge rebuild hver gang:
  if (!this._wlContourDirty) return;

  const z0 = this.draftZWorld;

  const g = this.mesh.geometry;
  const posAttr = g.getAttribute("position");
  if (!posAttr) return;

  const pos = posAttr.array;
  const idxAttr = g.index;
  const index = idxAttr ? idxAttr.array : null;
  const triCount = index ? (index.length / 3) : (pos.length / 9);

  this.mesh.updateMatrixWorld(true);
  const M = this.mesh.matrixWorld;

  const eps = 1e-8;

  const A = this._p0, B = this._p1, C = this._p2;
  const P0 = this._i0, P1 = this._i1;

  const getV = (i, out) => {
    const k = i * 3;
    out.set(pos[k], pos[k + 1], pos[k + 2]).applyMatrix4(M);
  };

  const segs = [];

  const addPointIfOnPlane = (V, outArr) => {
    if (Math.abs(V.z - z0) <= eps) outArr.push(V);
  };

  const intersectEdge = (P, Q, out) => {
    const dz = Q.z - P.z;

    // Hvis hele kanten ligger på planet: hopp (ellers får du masse støy)
    if (Math.abs(dz) <= eps) return false;

    const t = (z0 - P.z) / dz;
    if (t < -eps || t > 1 + eps) return false;

    out.set(
      P.x + t * (Q.x - P.x),
      P.y + t * (Q.y - P.y),
      z0
    );
    return true;
  };

  let segCount = 0;

  for (let ti = 0; ti < triCount; ti++) {
    if (index) {
      getV(index[3 * ti], A);
      getV(index[3 * ti + 1], B);
      getV(index[3 * ti + 2], C);
    } else {
      const base = ti * 9;
      A.set(pos[base], pos[base + 1], pos[base + 2]).applyMatrix4(M);
      B.set(pos[base + 3], pos[base + 4], pos[base + 5]).applyMatrix4(M);
      C.set(pos[base + 6], pos[base + 7], pos[base + 8]).applyMatrix4(M);
    }

    // Tidlig ut hvis alle er klart på samme side
    const a = A.z, b = B.z, c = C.z;
    const above = (a > z0 + eps) + (b > z0 + eps) + (c > z0 + eps);
    const below = (a < z0 - eps) + (b < z0 - eps) + (c < z0 - eps);
    if (above === 3 || below === 3) continue;

    const pts = [];

    // vertices “på planet”
    addPointIfOnPlane(A, pts);
    addPointIfOnPlane(B, pts);
    addPointIfOnPlane(C, pts);

    // edge intersections (ta maks 2)
    if (pts.length < 2 && intersectEdge(A, B, P0)) pts.push(P0.clone());
    if (pts.length < 2 && intersectEdge(B, C, P0)) pts.push(P0.clone());
    if (pts.length < 2 && intersectEdge(C, A, P0)) pts.push(P0.clone());

    // Fjern duplikater (kan skje ved “på planet”)
    for (let i = pts.length - 1; i >= 0; i--) {
      for (let j = i - 1; j >= 0; j--) {
        if (pts[i].distanceToSquared(pts[j]) < 1e-12) {
          pts.splice(i, 1);
          break;
        }
      }
    }

    if (pts.length >= 2) {
      const p = pts[0];
      const q = pts[1];
      segs.push(p.x, p.y, p.z, q.x, q.y, q.z);
      segCount++;
      if (segCount >= this._wlContourMaxSeg) break;
    }
  }

  // DEBUG: se om du faktisk får segmenter
  console.log("[WL contour] segments:", segCount, "z0:", z0);

  this.wlContour.geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(segs, 3)
  );
  this.wlContour.geometry.computeBoundingSphere?.();

  this._wlContourDirty = false;
}



  setWaterlineVisible(visible) {
    this.wlVisible = !!visible;
    if (this.waterPlane) this.waterPlane.visible = this.wlVisible;
    this.scheduleRecalc(false);
  }

  setDraftFromSlider(t) {
    if (!this.mesh) return this.draftZWorld;

    const ref = this.getReferenceBoundsNoHydroRot();
    const zMin = ref.min.z;
    const zMax = ref.max.z;
    const tt = Math.max(0, Math.min(1, Number(t)));

    this.draftZWorld = zMin + tt * (zMax - zMin);

    this.updateWaterPlane();
    this._invalidateCache();
    this.scheduleRecalc(true);
    return this.draftZWorld;
  }

  initDraftAtBottom() {
    return this.setDraftFromSlider(0);
  }

  initDraftAtWorldZero() {
    this.draftZWorld = 0;
    this.updateWaterPlane();
    this._invalidateCache();
    this.scheduleRecalc(false);
    return this.draftZWorld;
  }

  // ============================================================
  // TRIM / HEEL
  // ============================================================

  _setAxisRotation(axisName, rad) {
    if (axisName === "x") this.hydroRotGroup.rotation.x = rad;
    else if (axisName === "y") this.hydroRotGroup.rotation.y = rad;
    else if (axisName === "z") this.hydroRotGroup.rotation.z = rad;
  }

  setTrim(deg) {
    const rad = THREE.MathUtils.degToRad(Number(deg));
    this._setAxisRotation(this.axis.pitchAxis, rad);
    this.trimDeg = Number(deg);
    this.updateWaterPlane();
    this._invalidateCache();
    this.scheduleRecalc(true);
  }

  setHeel(deg) {
    const rad = THREE.MathUtils.degToRad(Number(deg));
    this._setAxisRotation(this.axis.rollAxis, rad);
    this.heelDeg = Number(deg);
    this.updateWaterPlane();
    this._invalidateCache();
    this.scheduleRecalc(true);
  }

  zeroTrimHeel() {
    this.hydroRotGroup.rotation.x = 0;
    this.trimDeg = 0;
    this.heelDeg = 0;
    this.hydroRotGroup.rotation.y = 0;
    this.hydroRotGroup.rotation.z = 0;
    this.updateWaterPlane();
    this._invalidateCache();
    this.scheduleRecalc(false);
  }

  // ============================================================
  // MARKERS
  // ============================================================

  ensureMarkers() {
    if (!this.mesh) return;

    if (!this.cgMarker) {
      this.cgMarker = new THREE.Mesh(
        new THREE.SphereGeometry(1, 18, 14),
        new THREE.MeshBasicMaterial({ color: 0x22c55e, depthTest: true })
      );
      this.scene.add(this.cgMarker);
    }

    if (!this.cbMarker) {
      this.cbMarker = new THREE.Mesh(
        new THREE.SphereGeometry(1, 18, 14),
        new THREE.MeshBasicMaterial({ color: 0x60a5fa, depthTest: true })
      );
      this.scene.add(this.cbMarker);
    }

    this.updateMarkerSizes();
    this.updateMarkers();
  }

  updateMarkerSizes() {
    if (!this.mesh || !this.cgMarker || !this.cbMarker) return;

    const ref = this.getReferenceBoundsNoHydroRot();
    const r = ref.maxDim * 0.015;

    this.cgMarker.scale.setScalar(r);
    this.cbMarker.scale.setScalar(r);
  }

  setMarkersVisible(cg, cb) {
    this.markersVisible.cg = !!cg;
    this.markersVisible.cb = !!cb;
    this.updateMarkers();
  }

  updateMarkers() {
    if (!this.cgMarker || !this.cbMarker) return;

    this.cgMarker.visible = this.markersVisible.cg;
    this.cbMarker.visible = this.markersVisible.cb;

    // CG world
    let cgW = null;
    if (this.cgLocal && this.mesh) {
      cgW = this.core.localToWorldPoint(this.cgLocal, this.mesh);
      this.cgMarker.position.copy(cgW);
    }
    this.lastHydro.cgW = cgW;

    // CB world
    if (this.lastHydro.cbW) {
      this.cbMarker.position.copy(this.lastHydro.cbW);
    }
  }

  highlightComponent(compName) {
    if (!this.mesh) return;
    this.mesh.traverse((child) => {
      if (child.name === compName) {
        child.material.opacity = 1.0;
        child.material.transparent = false;
      } else {
        child.material.opacity = 0.3;
        child.material.transparent = true;
      }
      if (child.material) child.material.needsUpdate = true;
    });
  }

  // ============================================================
  // QUALITY / SCHEDULING
  // ============================================================

  setQuality(q) {
    this.userQuality = q;
    if (this.quality !== "low") this.quality = q;
    this.scheduleRecalc(false);
  }

  qualityToGrid(qv) {
    if (qv === "low") return { ny: 22, nz: 22 };
    if (qv === "high") return { ny: 90, nz: 90 };
    return { ny: 50, nz: 50 };
  }

  scheduleRecalc(interactive = false) {
    if (!this.mesh) return;

    if (this.hydroTimer) clearTimeout(this.hydroTimer);
    if (this._hiTimer) clearTimeout(this._hiTimer);

    if (interactive) this.quality = "low";

    this.hydroTimer = setTimeout(() => {
      this.recompute();
    }, 80);

    if (interactive) {
      this._hiTimer = setTimeout(() => {
        this.quality = this.userQuality;
        this.recompute();
      }, 380);
    }
  }

  // ============================================================
  // WATERPLANE PROPERTIES (Awp, centroid, inertias)
  // ============================================================

  async computeWaterplaneProps({ wb, draftZ, ny = 140, timeSliceMs = 8 } = {}) {
    if (!this.mesh) return null;

    const bounds = wb || this.getWorldBounds();
    const yMin = bounds.min.y;
    const yMax = bounds.max.y;

    const dy = (yMax - yMin) / ny;
    const eps = (bounds.max.x - bounds.min.x) * 0.02 + 1e-6;

    let A = 0;
    let Sx = 0;
    let Sy = 0;

    let Ix0 = 0;
    let Iy0 = 0;
    let Ixy0 = 0;

    let t0 = performance.now();

    for (let iy = 0; iy < ny; iy++) {
      const y = yMin + (iy + 0.5) * dy;

      this._rayOrigin.set(bounds.min.x - eps, y, draftZ);
      this.raycaster.set(this._rayOrigin, this._rayDir);

      const rayTarget = this._getRaycastTarget();
      if (!rayTarget) continue;
      const hits = this.raycaster.intersectObject(rayTarget, false);
      const n = hits.length;
      if (n < 2) continue;

      for (let k = 0; k + 1 < n; k += 2) {
        const x0 = hits[k].point.x;
        const x1 = hits[k + 1].point.x;
        const len = x1 - x0;
        if (len <= 0) continue;

        const dA = len * dy;
        A += dA;

        const xm = 0.5 * (x0 + x1);

        Sx += xm * dA;
        Sy += y * dA;

        // 2nd moments about origin
        Ix0 += (y * y) * dA;
        Iy0 += ((x1 * x1 * x1 - x0 * x0 * x0) / 3) * dy;
        Ixy0 += y * ((x1 * x1 - x0 * x0) / 2) * dy;
      }

      if (performance.now() - t0 > timeSliceMs) {
        await new Promise(requestAnimationFrame);
        t0 = performance.now();
      }
    }

    if (A <= 1e-12) {
      return { A: 0, xF: null, yF: null, Ixx: 0, Iyy: 0, Ixy: 0 };
    }

    const xF = Sx / A;
    const yF = Sy / A;

    // centroidal moments
    const Ixx = Ix0 - A * (yF * yF);
    const Iyy = Iy0 - A * (xF * xF);
    const Ixy = Ixy0 - A * (xF * yF);

    return { A, xF, yF, Ixx, Iyy, Ixy };
  }

  // ============================================================
  // SAK (WETTED SURFACE AREA) – on-demand / low-only live
  // ============================================================

  _triArea(a, b, c) {
    const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;
    const acx = c.x - a.x, acy = c.y - a.y, acz = c.z - a.z;
    const cx = aby * acz - abz * acy;
    const cy = abz * acx - abx * acz;
    const cz = abx * acy - aby * acx;
    return 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
  }

  _lerpToPlaneZ(pUnder, pOver, z0, out) {
    const denom = (pOver.z - pUnder.z);
    const t = Math.abs(denom) < 1e-12 ? 0 : (z0 - pUnder.z) / denom;
    out.set(
      pUnder.x + t * (pOver.x - pUnder.x),
      pUnder.y + t * (pOver.y - pUnder.y),
      z0
    );
    return out;
  }

  async computeWetSurfaceArea({ draftZ = null, timeSliceMs = 10 } = {}) {
    if (!this.mesh || !this._triCache) return 0;

    const z0 = (draftZ == null) ? this.draftZWorld : draftZ;

    // Cheap early out using world bounds (ikke new Box3 per kall)
    const wb = this.getWorldBounds();
    if (z0 <= wb.min.z) return 0;
    if (z0 >= wb.max.z) {
      // ikke helt korrekt "hele overflatearealet", men vi bruker kun under-vann i praksis.
      // Returnerer total undervann kan være ~total, men vi har ikke total surface her => beregn normalt.
    }

    this.mesh.updateMatrixWorld(true);

    let sak = 0;
    let t0 = performance.now();

    const { pos, index, triCount } = this._triCache;

    const A = this._p0;
    const B = this._p1;
    const C = this._p2;
    const I0 = this._i0;
    const I1 = this._i1;

    const getV = (i, out) => {
      const k = i * 3;
      out.set(pos[k], pos[k + 1], pos[k + 2]).applyMatrix4(this.mesh.matrixWorld);
    };

    for (let ti = 0; ti < triCount; ti++) {
      if (index) {
        const ia = index[3 * ti];
        const ib = index[3 * ti + 1];
        const ic = index[3 * ti + 2];
        getV(ia, A); getV(ib, B); getV(ic, C);
      } else {
        const base = ti * 9;
        A.set(pos[base], pos[base + 1], pos[base + 2]).applyMatrix4(this.mesh.matrixWorld);
        B.set(pos[base + 3], pos[base + 4], pos[base + 5]).applyMatrix4(this.mesh.matrixWorld);
        C.set(pos[base + 6], pos[base + 7], pos[base + 8]).applyMatrix4(this.mesh.matrixWorld);
      }

      const aU = A.z <= z0;
      const bU = B.z <= z0;
      const cU = C.z <= z0;
      const nUnder = (aU ? 1 : 0) + (bU ? 1 : 0) + (cU ? 1 : 0);

      if (nUnder === 0) {
        // 0
      } else if (nUnder === 3) {
        sak += this._triArea(A, B, C);
      } else if (nUnder === 1) {
        let P, Q, R; // P under
        if (aU) { P = A; Q = B; R = C; }
        else if (bU) { P = B; Q = C; R = A; }
        else { P = C; Q = A; R = B; }

        this._lerpToPlaneZ(P, Q, z0, I0);
        this._lerpToPlaneZ(P, R, z0, I1);

        sak += this._triArea(P, I0, I1);
      } else {
        let P, Q, R; // R over
        if (!aU) { R = A; P = B; Q = C; }
        else if (!bU) { R = B; P = C; Q = A; }
        else { R = C; P = A; Q = B; }

        this._lerpToPlaneZ(P, R, z0, I0);
        this._lerpToPlaneZ(Q, R, z0, I1);

        sak += this._triArea(P, Q, I1);
        sak += this._triArea(P, I1, I0);
      }

      if (performance.now() - t0 > timeSliceMs) {
        await new Promise(requestAnimationFrame);
        t0 = performance.now();
      }
    }

    return sak;
  }

  // ============================================================
  // CORE HYDRO COMPUTE (volume + CB + derived)
  // ============================================================

  async recompute() {
    if (!this.mesh || this.hydroBusy) return;
    this.hydroBusy = true;

    try {
      const res = await this._recomputeInternal({
        quality: this.quality,
        computeWP: true,
        wpNy: this.wpNy,
        timeSliceMs: 12,
        computeSAK: (this.enableLiveSAK && this.quality === "low")
      });
      this.updateMarkers();
      return res;
    } catch (e) {
      console.error("Hydro computation error:", e);
      return null;
    } finally {
      this.hydroBusy = false;
    }
  }

  async _recomputeInternal({
    quality = "med",
    computeWP = true,
    wpNy = 140,
    timeSliceMs = 12,
    computeSAK = false
  } = {}) {
    // bounds must be fresh
    this._invalidateCache(); // safe: hydroRotGroup may have changed
    const wb = this.getWorldBounds();

    const zMin = wb.min.z;
    const zMax = Math.min(this.draftZWorld, wb.max.z);

    if (zMax <= zMin + 1e-9) {
      this.lastHydro.subV = 0;
      this.lastHydro.cbW = null;
      this.lastHydro.wp = null;
      this.lastHydro.kb = null;
      this.lastHydro.bm = null;
      this.lastHydro.gm = null;
      this.lastHydro.gz_now = null;
      if (computeSAK) this.lastHydro.sak = 0;
      return { subV: 0, cbW: null };
    }

    const { ny, nz } = this.qualityToGrid(quality);

    const dy = (wb.max.y - wb.min.y) / ny;
    const dz = (zMax - zMin) / nz;

    let subV = 0;
    let cbx = 0, cby = 0, cbz = 0;

    const eps = (wb.max.x - wb.min.x) * 0.02 + 1e-6;

    let t0 = performance.now();

    for (let iz = 0; iz < nz; iz++) {
      const z = zMin + (iz + 0.5) * dz;

      for (let iy = 0; iy < ny; iy++) {
        const y = wb.min.y + (iy + 0.5) * dy;

        this._rayOrigin.set(wb.min.x - eps, y, z);
        this.raycaster.set(this._rayOrigin, this._rayDir);

        const rayTarget = this._getRaycastTarget();
        if (!rayTarget) continue;
        const hits = this.raycaster.intersectObject(rayTarget, false);
        const n = hits.length;
        if (n < 2) continue;

        // Raycaster returns sorted along ray => no sort needed
        for (let k = 0; k + 1 < n; k += 2) {
          const x0 = hits[k].point.x;
          const x1 = hits[k + 1].point.x;
          const len = x1 - x0;
          if (len <= 0) continue;

          const cellV = len * dy * dz;
          subV += cellV;

          const xm = 0.5 * (x0 + x1);
          cbx += xm * cellV;
          cby += y  * cellV;
          cbz += z  * cellV;
        }

        // time-slice
        if (performance.now() - t0 > timeSliceMs) {
          await new Promise(requestAnimationFrame);
          t0 = performance.now();
        }
      }
    }

    let cbW = null;
    if (subV > 0) cbW = new THREE.Vector3(cbx / subV, cby / subV, cbz / subV);

    this.lastHydro.subV = subV;
    this.lastHydro.cbW = cbW;

    // WP props
    let wp = null;
    if (computeWP) {
      wp = await this.computeWaterplaneProps({
        wb,
        draftZ: this.draftZWorld,
        ny: wpNy,
        timeSliceMs: Math.max(6, Math.floor(timeSliceMs * 0.75))
      });
    }
    this.lastHydro.wp = wp;

    // Optional live SAK (kun low)
    if (computeSAK) {
      this.lastHydro.sak = await this.computeWetSurfaceArea({
        draftZ: this.draftZWorld,
        timeSliceMs: this.liveSAKTimeSliceMs
      });
    }

    // Derived stability
    const cgW = this.lastHydro.cgW;
    const KB = cbW ? cbW.z : null;
    const KG = cgW ? cgW.z : null;

    this.lastHydro.kb = KB;
    this.lastHydro.kg = KG;

    if (subV > 0 && wp && wp.A > 0 && KB != null && KG != null) {
      const BM_roll = wp.Ixx / subV;
      const BM_pitch = wp.Iyy / subV;

      const GM_roll = KB + BM_roll - KG;
      const GM_pitch = KB + BM_pitch - KG;

      this.lastHydro.bm = { roll: BM_roll, pitch: BM_pitch };
      this.lastHydro.gm = { roll: GM_roll, pitch: GM_pitch };

      // instantaneous lever arms
      if (cbW && cgW) {
        const dx = cbW.x - cgW.x;
        const dyw = cbW.y - cgW.y;
        this.lastHydro.gz_now = { roll: dyw, pitch: -dx };
      } else {
        this.lastHydro.gz_now = null;
      }
    } else {
      this.lastHydro.bm = null;
      this.lastHydro.gm = null;
      this.lastHydro.gz_now = null;
    }

    return { subV, cbW, wp, sak: this.lastHydro.sak };
  }

  // ============================================================
  // HELPERS: GZ calculation (used by report & equilibrium)
  // ============================================================

  _computeGZ(mode, cbW, cgW) {
    if (!cbW || !cgW) return null;
    const dx = cbW.x - cgW.x;
    const dy = cbW.y - cgW.y;
    // roll about X => lever arm in Y
    // pitch about Y => lever arm in X (sign chosen to match earlier)
    return mode === "roll" ? dy : -dx;
  }

  // ============================================================
  // SIMPLIFIED GM CALCULATIONS
  // ============================================================

  getSimplifiedGM() {
    const h = this.lastHydro;
    if (!h.gm) return { transverse: null, longitudinal: null };
    return {
      transverse: h.gm.roll,
      longitudinal: h.gm.pitch
    };
  }

  async getGMForDisplacement(targetTonnes) {
    const result = await this.findDraftForDisplacement(targetTonnes);
    if (!result) return null;
    await this.recompute();
    return this.getSimplifiedGM();
  }

  // ============================================================
  // TARGET DISPLACEMENT (tonn -> draft) via binærsøk
  // ============================================================

  /**
   * Finn draft som gir ønsket displacement (tonn) via binærsøk.
   * Kjøres low og uten WP/SAK for fart. Til slutt settes draft og full recompute.
   */
  async findDraftForDisplacement(targetTonnes, {
    toleranceTonnes = 0.05,
    maxIterations = 22
  } = {}) {
    if (!this.mesh) return null;

    const ref = this.getReferenceBoundsNoHydroRot();
    let lo = ref.min.z;
    let hi = ref.max.z;

    const tgtT = Number(targetTonnes);
    if (!isFinite(tgtT) || tgtT <= 0) return null;

    // tonn -> volum
    const targetVol = (tgtT * 1000) / this.waterDensity;

    const origDraft = this.draftZWorld;

    let bestDraft = lo;
    let bestErr = Infinity;
    let bestVol = 0;

    for (let i = 0; i < maxIterations; i++) {
      const mid = 0.5 * (lo + hi);

      this.draftZWorld = mid;
      this.updateWaterPlane();

      const r = await this._recomputeInternal({
        quality: "low",
        computeWP: false,
        computeSAK: false,
        timeSliceMs: 8
      });

      const vol = r?.subV || 0;
      const err = Math.abs(vol - targetVol);

      if (err < bestErr) {
        bestErr = err;
        bestDraft = mid;
        bestVol = vol;
      }

      const dispT = (vol * this.waterDensity) / 1000;
      if (Math.abs(dispT - tgtT) < toleranceTonnes) break;

      if (vol < targetVol) lo = mid;
      else hi = mid;
    }

    // apply best
    this.draftZWorld = bestDraft;
    this.updateWaterPlane();
    this._invalidateCache();

    // full update
    await this.recompute();

    return {
      draft: bestDraft,
      volume: bestVol,
      displacementTonnes: (bestVol * this.waterDensity) / 1000,
      targetTonnes: tgtT,
      errorTonnes: Math.abs(((bestVol * this.waterDensity) / 1000) - tgtT)
    };
  }

  // ============================================================
  // EQUILIBRIUM SOLVE (robust): scan -> sign change -> bisection
  // ============================================================

  /**
   * Finn likevektsvinkel der GZ ≈ 0.
   * Robust: først grov scan for å finne et intervall med sign change, så bisect.
   */
  async solveEquilibrium(mode = "roll", {
    maxDeg = 30,
    scanStepDeg = 2,
    toleranceGZ = 1e-3,
    maxBisectionIters = 20
  } = {}) {
    if (!this.mesh || !this.cgLocal) return null;

    const origRot = this.hydroRotGroup.rotation.clone();
    const origQuality = this.quality;

    const maxA = Math.max(1, Number(maxDeg) || 30);
    const step = Math.max(0.5, Number(scanStepDeg) || 2);

    this.quality = "low";

    // helper to eval GZ at angle
    const evalAt = async (deg) => {
      const rad = THREE.MathUtils.degToRad(deg);
      this.hydroRotGroup.rotation.copy(origRot);
      if (mode === "roll") this._setAxisRotation(this.axis.rollAxis, rad);
      else this._setAxisRotation(this.axis.pitchAxis, rad);

      const r = await this._recomputeInternal({
        quality: "low",
        computeWP: false,
        computeSAK: false,
        timeSliceMs: 6
      });

      const gz = this._computeGZ(mode, r?.cbW || null, this.lastHydro.cgW || null);
      return gz;
    };

    try {
      // 1) scan for sign change
      let a0 = -maxA;
      let g0 = await evalAt(a0);

      let bracket = null;

      for (let a = a0 + step; a <= maxA + 1e-9; a += step) {
        const g = await evalAt(a);

        if (g0 != null && g != null) {
          if (Math.abs(g) < toleranceGZ) {
            bracket = { lo: a, hi: a, gLo: g, gHi: g };
            break;
          }
          if (g0 === 0) {
            bracket = { lo: a - step, hi: a - step, gLo: g0, gHi: g0 };
            break;
          }
          if ((g0 > 0 && g < 0) || (g0 < 0 && g > 0)) {
            bracket = { lo: a - step, hi: a, gLo: g0, gHi: g };
            break;
          }
        }

        a0 = a;
        g0 = g;
      }

      // If no bracket found, return best "closest to zero" from scan (fallback)
      if (!bracket) {
        // coarse choose best among scanned points
        let bestA = 0;
        let bestG = Infinity;

        for (let a = -maxA; a <= maxA + 1e-9; a += step) {
          const g = await evalAt(a);
          if (g == null) continue;
          const ag = Math.abs(g);
          if (ag < bestG) { bestG = ag; bestA = a; }
        }

        // restore and recompute full
        this.hydroRotGroup.rotation.copy(origRot);
        this.quality = origQuality;
        this._invalidateCache();
        await this.recompute();

        return { angleDeg: bestA, gz: isFinite(bestG) ? (bestG * (bestA < 0 ? -1 : 1)) : null, bracket: null };
      }

      // 2) bisection within bracket (unless already exact)
      let lo = bracket.lo, hi = bracket.hi;
      let gLo = bracket.gLo, gHi = bracket.gHi;

      let bestAngle = lo;
      let bestGZ = gLo;

      if (lo === hi) {
        bestAngle = lo;
        bestGZ = gLo;
      } else {
        for (let i = 0; i < maxBisectionIters; i++) {
          const mid = 0.5 * (lo + hi);
          const gMid = await evalAt(mid);

          if (gMid == null) break;

          if (Math.abs(gMid) < Math.abs(bestGZ)) {
            bestAngle = mid;
            bestGZ = gMid;
          }

          if (Math.abs(gMid) < toleranceGZ) {
            bestAngle = mid;
            bestGZ = gMid;
            break;
          }

          // choose side based on sign
          if ((gLo > 0 && gMid < 0) || (gLo < 0 && gMid > 0)) {
            hi = mid;
            gHi = gMid;
          } else {
            lo = mid;
            gLo = gMid;
          }
        }
      }

      // apply best
      this.hydroRotGroup.rotation.copy(origRot);
      if (mode === "roll") this._setAxisRotation(this.axis.rollAxis, THREE.MathUtils.degToRad(bestAngle));
      else this._setAxisRotation(this.axis.pitchAxis, THREE.MathUtils.degToRad(bestAngle));

      this.updateWaterPlane();
      this._invalidateCache();
      this.quality = origQuality;
      await this.recompute();

      return { angleDeg: bestAngle, gz: bestGZ, bracket: { lo, hi } };
    } finally {
      this.quality = origQuality;
    }
  }

  // ============================================================
  // REPORT (on-demand): GZ curve (+ optional SAK)
  // ============================================================

  async generateHydroReport({
    mode = "roll",      // "roll" | "pitch"
    maxDeg = 60,
    stepDeg = 2,
    quality = "low",
    includeSAK = true
  } = {}) {
    if (!this.mesh) return null;

    const origRot = this.hydroRotGroup.rotation.clone();
    const origQuality = this.quality;

    const angles = [];
    const gz = [];
    const cbSeries = [];
    const volSeries = [];
    const sakSeries = [];

    const maxA = Math.max(0, Number(maxDeg) || 60);
    const step = Math.max(0.5, Number(stepDeg) || 2);

    this.quality = quality;

    try {
      for (let a = -maxA; a <= maxA + 1e-9; a += step) {
        const rad = THREE.MathUtils.degToRad(a);

        this.hydroRotGroup.rotation.copy(origRot);
        if (mode === "roll") this._setAxisRotation(this.axis.rollAxis, rad);
        else this._setAxisRotation(this.axis.pitchAxis, rad);

        // fast eval (no WP)
        const r = await this._recomputeInternal({
          quality,
          computeWP: false,
          computeSAK: false,
          timeSliceMs: 10
        });

        const cbW = r?.cbW || null;
        const subV = r?.subV || 0;
        const g = this._computeGZ(mode, cbW, this.lastHydro.cgW || null);

        angles.push(a);
        volSeries.push(subV);
        cbSeries.push(cbW ? { x: cbW.x, y: cbW.y, z: cbW.z } : null);
        gz.push(g);

        if (includeSAK) {
          const sak = await this.computeWetSurfaceArea({
            draftZ: this.draftZWorld,
            timeSliceMs: this.reportSAKTimeSliceMs
          });
          sakSeries.push(sak);
        } else {
          sakSeries.push(null);
        }
      }

      // restore
      this.hydroRotGroup.rotation.copy(origRot);

      // full recompute at current state
      this.quality = origQuality;
      await this.recompute();

      const now = this.getLastResults();
      const stability = this._computeStabilityMetrics(angles, gz);

      return {
        meta: { mode, maxDeg: maxA, stepDeg: step, qualityUsed: quality, includeSAK: !!includeSAK, draftZWorld: this.draftZWorld },
        now: {
          subV: now.subV,
          sak: now.sak,
          cbW: now.cbW ? { x: now.cbW.x, y: now.cbW.y, z: now.cbW.z } : null,
          cgW: now.cgW ? { x: now.cgW.x, y: now.cgW.y, z: now.cgW.z } : null,
          wp: now.wp,
          kb: now.kb,
          kg: now.kg,
          bm: now.bm,
          gm: now.gm,
          gz_now: now.gz_now
        },
        curve: { anglesDeg: angles, gz, displacedVolume: volSeries, cbW: cbSeries, sak: sakSeries },
        stability
      };
    } finally {
      this.hydroRotGroup.rotation.copy(origRot);
      this.quality = origQuality;
    }
  }

  _computeStabilityMetrics(angles, gz) {
    if (!angles?.length || !gz?.length) return null;

    let maxGZ = -Infinity;
    let angleAtMaxGZ = null;

    for (let i = 0; i < gz.length; i++) {
      const v = gz[i];
      if (v == null) continue;
      if (v > maxGZ) { maxGZ = v; angleAtMaxGZ = angles[i]; }
    }

    // AVS: first positive-angle where GZ becomes negative (rough)
    let avs = null;
    for (let i = 0; i < gz.length; i++) {
      if (angles[i] > 0 && gz[i] != null && gz[i] < 0) { avs = angles[i]; break; }
    }

    // trapezoid area over angle range [a,b]
    const area = (a0, a1) => {
      let s = 0;
      for (let i = 0; i < angles.length - 1; i++) {
        const x0 = angles[i], x1 = angles[i + 1];
        if (x0 < a0 || x1 > a1) continue;
        const y0 = gz[i], y1 = gz[i + 1];
        if (y0 == null || y1 == null) continue;
        s += 0.5 * (y0 + y1) * (x1 - x0);
      }
      return s;
    };

    const maxAngle = Math.max(...angles);

    return {
      maxGZ: isFinite(maxGZ) ? maxGZ : null,
      angleAtMaxGZ,
      avs,
      area_0_30: area(0, 30),
      area_0_40: area(0, 40),
      area_0_max: area(0, maxAngle)
    };
  }

  // ============================================================
  // DRAFT-SCAN (on-demand)
  // ============================================================

  async generateDraftScan({
    draftCount = 20,
    quality = "low",
    includeAwp = true,
    includeSAK = false
  } = {}) {
    if (!this.mesh) return null;

    const n = Math.max(2, Math.min(200, Number(draftCount) || 20));

    const origDraft = this.draftZWorld;
    const origQuality = this.quality;

    const ref = this.getReferenceBoundsNoHydroRot();
    const zMin = ref.min.z;
    const zMax = ref.max.z;

    const drafts = [];
    const volumes = [];
    const displacements = [];
    const kbs = [];
    const awps = [];
    const saks = [];

    this.quality = quality;

    try {
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const draft = zMin + t * (zMax - zMin);

        this.draftZWorld = draft;
        this.updateWaterPlane();

        const r = await this._recomputeInternal({
          quality,
          computeWP: includeAwp,
          wpNy: this.wpNy,
          timeSliceMs: 8,
          computeSAK: false
        });

        const vol = r?.subV || 0;
        const kb = r?.cbW ? r.cbW.z : null;
        const awp = r?.wp ? r.wp.A : null;

        drafts.push(draft);
        volumes.push(vol);
        displacements.push((vol * this.waterDensity) / 1000);
        kbs.push(kb);
        awps.push(awp);

        if (includeSAK) {
          const sak = await this.computeWetSurfaceArea({ draftZ: draft, timeSliceMs: this.reportSAKTimeSliceMs });
          saks.push(sak);
        } else {
          saks.push(null);
        }
      }

      // restore
      this.draftZWorld = origDraft;
      this.updateWaterPlane();
      this.quality = origQuality;
      await this.recompute();

      return {
        meta: { draftCount: n, qualityUsed: quality, includeAwp: !!includeAwp, includeSAK: !!includeSAK, rho: this.waterDensity },
        data: { drafts, volumes, displacements, kbs, awps, saks }
      };
    } finally {
      this.draftZWorld = origDraft;
      this.quality = origQuality;
    }
  }

  // ============================================================
  // EXPORT HELPERS (JSON/CSV + download)
  // (PDF: anbefales via UI: render rapport-panelet og bruk browser "Print -> Save as PDF")
  // ============================================================

  exportJSON(obj) {
    if (!obj) return null;
    return JSON.stringify(obj, null, 2);
  }

  exportReportCSV(report) {
    if (!report?.curve) return null;
    const { anglesDeg, gz, displacedVolume, sak } = report.curve;

    let csv = "AngleDeg,GZ,Volume,DisplacementTonnes,SAK\n";
    for (let i = 0; i < anglesDeg.length; i++) {
      const a = anglesDeg[i];
      const g = gz[i];
      const v = displacedVolume[i] ?? "";
      const d = (typeof v === "number") ? (v * this.waterDensity / 1000) : "";
      const s = sak ? (sak[i] ?? "") : "";
      csv += `${a},${g ?? ""},${v ?? ""},${d ?? ""},${s ?? ""}\n`;
    }
    return csv;
  }

  exportDraftScanCSV(scan) {
    if (!scan?.data) return null;
    const { drafts, volumes, displacements, kbs, awps, saks } = scan.data;

    let csv = "Draft,Volume,DisplacementTonnes,KB,Awp,SAK\n";
    for (let i = 0; i < drafts.length; i++) {
      csv += `${drafts[i]},${volumes[i] ?? ""},${displacements[i] ?? ""},${kbs[i] ?? ""},${awps[i] ?? ""},${saks[i] ?? ""}\n`;
    }
    return csv;
  }

  _downloadText(text, filename, mime) {
    if (!text) return;
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  downloadJSON(obj, filename = "hydro.json") {
    const t = this.exportJSON(obj);
    this._downloadText(t, filename, "application/json");
  }

  downloadCSV(csvText, filename = "hydro.csv") {
    this._downloadText(csvText, filename, "text/csv");
  }

  // ============================================================
  // GETTERS
  // ============================================================

  getLastResults() {
    return this.lastHydro;
  }

  isBusy() {
    return this.hydroBusy;
  }

  // ============================================================
  // VISIBILITY TOGGLES
  // ============================================================

  setHydroElementsVisible(options = {}) {
    const {
      waterline = this.wlVisible,
      waterlineContour = this.wlContourVisible,
      markers = { cg: this.markersVisible.cg, cb: this.markersVisible.cb }
    } = options;

    this.setWaterlineVisible(waterline);
    this.setWaterlineContourVisible(waterlineContour);
    this.setMarkersVisible(markers.cg, markers.cb);
  }

  // ============================================================
  // DISPOSE
  // ============================================================

  dispose() {
    if (this.waterPlane) {
      this.waterPlane.geometry.dispose();
      this.waterPlane.material.dispose();
      this.scene.remove(this.waterPlane);
      this.waterPlane = null;
    }
    if (this.cgMarker) {
      this.cgMarker.geometry.dispose();
      this.cgMarker.material.dispose();
      this.scene.remove(this.cgMarker);
      this.cgMarker = null;
    }
    if (this.cbMarker) {
      this.cbMarker.geometry.dispose();
      this.cbMarker.material.dispose();
      this.scene.remove(this.cbMarker);
      this.cbMarker = null;
    }
    if (this.wlContour) {
      this.wlContour.geometry.dispose();
      this.wlContour.material.dispose();
      this.scene.remove(this.wlContour);
      this.wlContour = null;
    }
    this._triCache = null;
  }
}
