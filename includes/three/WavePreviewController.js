import * as THREE from "./three.module.js";

export class WavePreviewController {
  constructor(core, { getWaterZ = null, setHud = null, getVisualFollowers = null } = {}) {
    this.core = core;
    this.getWaterZ = typeof getWaterZ === "function" ? getWaterZ : null;
    this.setHud = typeof setHud === "function" ? setHud : null;
    this.getVisualFollowers = typeof getVisualFollowers === "function" ? getVisualFollowers : null;
    this.enabled = false;
    this.objectMode = "vessel";
    this.seabedLocked = false;
    this.mesh = null;
    this.ghost = null;
    this.startedAt = performance.now();
    this.params = {};
    this.sequence = -1;
    this.modelPose = null;
    this.modelBounds = null;
    this.visualFollowers = [];
    this.suspended = false;

    this._onFrame = this._onFrame.bind(this);
    this.core?.addFrameListener?.(this._onFrame);
  }

  dispose() {
    this.clear();
    this.core?.removeFrameListener?.(this._onFrame);
  }

  clear() {
    this.enabled = false;
    this.suspended = false;
    this._restoreModelPose();
    this._disposeObject("mesh");
    this._disposeObject("ghost");
    this.params = {};
    this._postState("disabled");
  }

  clearFromCommand(data = {}) {
    const nextSequence = Number(data.sequence);
    if (!Number.isFinite(nextSequence) && this.sequence >= 0) return;
    if (Number.isFinite(nextSequence) && nextSequence < this.sequence) return;
    if (Number.isFinite(nextSequence)) this.sequence = nextSequence;
    this.clear();
  }

  set(data = {}) {
    const nextSequence = Number(data.sequence);
    if (Number.isFinite(nextSequence) && nextSequence < this.sequence) return;
    if (Number.isFinite(nextSequence)) this.sequence = nextSequence;
    if (data.enabled === false) {
      this.clear();
      return;
    }
    const wasEnabled = this.enabled === true;
    this.enabled = true;
    this.suspended = false;
    this.startedAt = performance.now();
    this.objectMode = data.objectMode === "fixed" ? "fixed" : "vessel";
    this.seabedLocked = data.seabedLocked === true || this.objectMode === "fixed";
    this.params = {
      waveHeightM: Math.max(0, Number(data.waveHeightM) || 0),
      wavePeriodS: Math.max(0.5, Number(data.wavePeriodS) || 6.5),
      wavelengthM: Math.max(0.1, Number(data.wavelengthM) || 10),
      waveHeadingDeg: Number(data.waveHeadingDeg) || 180,
      waveDirectionDeg: Number(data.waveDirectionDeg) || 0,
      modelLengthM: Math.max(0.1, Number(data.modelLengthM) || 1),
      modelBeamM: Math.max(0.1, Number(data.modelBeamM) || 1),
      modelDraftM: Math.max(0.01, Number(data.modelDraftM) || 0.3),
      modelYawDeg: Number(data.modelYawDeg) || 0,
      response: data.response || {},
      objectMode: this.objectMode,
    };
    if (!wasEnabled || !this.modelPose) this._captureModelPose();
    this._ensureObjects();
    this.setHud?.(this.seabedLocked ? "Bølgepreview: bunnlåst konstruksjon" : "Bølgepreview: fartøyrespons", false);
    this._postState("enabled");
  }

  suspendVisualMotion() {
    if (!this.enabled || this.suspended) return () => {};
    this.suspended = true;
    this._restoreModelPose();
    return () => this.resumeVisualMotion();
  }

  resumeVisualMotion() {
    if (!this.enabled || !this.suspended) return;
    this.suspended = false;
    this._captureModelPose();
    this._ensureObjects();
  }

  _disposeObject(key) {
    const object = this[key];
    if (!object) return;
    object.geometry?.dispose?.();
    object.material?.dispose?.();
    object.parent?.remove?.(object);
    this[key] = null;
  }

  _postState(state) {
    try {
      if (!window.parent || window.parent === window) return;
      window.parent.postMessage({
        type: "viewer-wave-preview",
        state,
        objectMode: this.objectMode,
        waveHeightM: this.params?.waveHeightM ?? null,
        wavelengthM: this.params?.wavelengthM ?? null,
      }, "*");
    } catch {}
  }

  _bounds() {
    return this.core?.computeBoundsWorld?.(this.core?.modelGroup) || {
      center: new THREE.Vector3(),
      size: new THREE.Vector3(1, 1, 1),
      maxDim: 1,
    };
  }

  _motionTarget() {
    return this.core?.modelGroup || null;
  }

  _captureModelPose() {
    const target = this._motionTarget();
    if (!target) return;
    target.updateMatrixWorld?.(true);
    const bounds = this.core?.computeBoundsWorld?.(target);
    const center = bounds?.center || new THREE.Vector3();
    const waterZ = Number(this.getWaterZ?.());
    const waterlineZ = Number.isFinite(waterZ) ? waterZ : center.z;
    const waterlineAnchor = new THREE.Vector3(center.x, center.y, waterlineZ);
    this.modelPose = {
      position: target.position.clone(),
      quaternion: target.quaternion.clone(),
      matrixWorld: target.matrixWorld.clone(),
      matrixWorldInverse: target.matrixWorld.clone().invert(),
      waterlineAnchor,
      waterlineLocalAnchor: target.worldToLocal(waterlineAnchor.clone()),
    };
    this.modelBounds = bounds
      ? {
        center: bounds.center.clone(),
        size: bounds.size.clone(),
        maxDim: bounds.maxDim,
      }
      : null;
    this._captureVisualFollowers();
  }

  _restoreModelPose() {
    const target = this._motionTarget();
    if (!target || !this.modelPose) return;
    target.position.copy(this.modelPose.position);
    target.quaternion.copy(this.modelPose.quaternion);
    target.updateMatrixWorld?.(true);
    this._restoreVisualFollowers();
    this.modelPose = null;
    this.modelBounds = null;
  }

  _captureVisualFollowers() {
    this._restoreVisualFollowers();
    const followers = this.getVisualFollowers?.() || [];
    this.visualFollowers = followers
      .filter(Boolean)
      .map((object) => ({
        object,
        matrix: object.matrix.clone(),
        matrixAutoUpdate: object.matrixAutoUpdate,
        position: object.position.clone(),
        quaternion: object.quaternion.clone(),
        scale: object.scale.clone(),
      }));
  }

  _restoreVisualFollowers() {
    this.visualFollowers.forEach((entry) => {
      const object = entry?.object;
      if (!object) return;
      object.matrixAutoUpdate = entry.matrixAutoUpdate;
      object.matrix.copy(entry.matrix);
      object.position.copy(entry.position);
      object.quaternion.copy(entry.quaternion);
      object.scale.copy(entry.scale);
      object.updateMatrixWorld?.(true);
    });
    this.visualFollowers = [];
  }

  _applyVisualFollowers() {
    if (!this.modelPose?.matrixWorldInverse || !this.visualFollowers.length) return;
    const target = this._motionTarget();
    if (!target) return;
    target.updateMatrixWorld?.(true);
    const delta = new THREE.Matrix4().multiplyMatrices(target.matrixWorld, this.modelPose.matrixWorldInverse);
    this.visualFollowers.forEach((entry) => {
      const object = entry?.object;
      if (!object) return;
      object.matrixAutoUpdate = false;
      object.matrix.copy(delta).multiply(entry.matrix);
      object.updateMatrixWorld?.(true);
    });
  }

  _ensureObjects() {
    const bounds = this.modelBounds || this._bounds();
    const center = bounds.center || new THREE.Vector3();
    const waterlineAnchor = this.modelPose?.waterlineAnchor || center;
    const size = bounds.size || new THREE.Vector3(1, 1, 1);
    const lengthM = Math.max(0.1, Number(this.params.modelLengthM) || Math.max(size.x, 1));
    const beamM = Math.max(0.1, Number(this.params.modelBeamM) || Math.max(size.y, 1));
    const gridSize = Math.max(lengthM * 3.2, beamM * 5, Number(this.params.wavelengthM) * 1.35 || 10);

    if (!this.mesh || Math.abs((this.mesh.userData.gridSize || 0) - gridSize) / gridSize > 0.2) {
      this._disposeObject("mesh");
      const geometry = new THREE.PlaneGeometry(gridSize, gridSize, 72, 72);
      const material = new THREE.MeshBasicMaterial({
        color: 0x1d8fbd,
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
        wireframe: true,
        depthWrite: false,
        depthTest: false,
      });
      this.mesh = new THREE.Mesh(geometry, material);
      this.mesh.userData.gridSize = gridSize;
      this.mesh.renderOrder = 40;
      this.core.scene.add(this.mesh);
    }

    const waterZ = Number(this.getWaterZ?.());
    const waterlineZ = Number.isFinite(waterZ) ? waterZ : waterlineAnchor.z;
    this.mesh.position.set(waterlineAnchor.x, waterlineAnchor.y, waterlineZ);

    if (!this.ghost && this.objectMode !== "fixed") {
      const ghostGeometry = new THREE.BoxGeometry(Math.max(size.x, 0.01), Math.max(size.y, 0.01), Math.max(size.z, 0.01));
      const ghostMaterial = new THREE.MeshBasicMaterial({
        color: 0xffb020,
        transparent: true,
        opacity: 0.26,
        wireframe: true,
        depthWrite: false,
        depthTest: false,
      });
      this.ghost = new THREE.Mesh(ghostGeometry, ghostMaterial);
      this.ghost.renderOrder = 41;
      this.core.scene.add(this.ghost);
    } else if (this.objectMode === "fixed") {
      this._disposeObject("ghost");
    }

    if (this.ghost) this.ghost.visible = false;
  }

  _onFrame() {
    if (!this.enabled || !this.mesh) return;
    const geometry = this.mesh.geometry;
    const pos = geometry?.attributes?.position;
    if (!pos) return;

    const t = (performance.now() - this.startedAt) / 1000;
    const amplitude = (Number(this.params.waveHeightM) || 0) / 2;
    const wavelength = Math.max(0.1, Number(this.params.wavelengthM) || 10);
    const omega = (Math.PI * 2) / Math.max(0.5, Number(this.params.wavePeriodS) || 6.5);
    const theta = THREE.MathUtils.degToRad(Number(this.params.waveDirectionDeg) || 0);
    const dirX = Math.sin(theta);
    const dirY = Math.cos(theta);
    const k = (Math.PI * 2) / wavelength;

    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const phase = k * (x * dirX + y * dirY) - omega * t;
      pos.setZ(i, amplitude * Math.sin(phase));
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals?.();

    if (!this.suspended) this._applyModelWaveMotion({ omega, k, dirX, dirY, amplitude, t });
  }

  _applyModelWaveMotion({ omega, k, dirX, dirY, amplitude, t }) {
    const target = this._motionTarget();
    if (!target || !this.modelPose || this.suspended || this.seabedLocked || this.objectMode === "fixed") return;
    const response = this.params.response || {};
    const bounds = this.modelBounds || this._bounds();
    const center = bounds?.center || new THREE.Vector3();
    const waterlineAnchor = this.modelPose.waterlineAnchor || center;
    const L = Math.max(0.1, Number(this.params.modelLengthM) || bounds?.size?.x || 1);
    const B = Math.max(0.1, Number(this.params.modelBeamM) || bounds?.size?.y || 1);
    const T = Math.max(0.01, Number(this.params.modelDraftM) || bounds?.size?.z || 0.3);
    const wavelength = Math.max(0.1, Number(this.params.wavelengthM) || 10);
    const relativeHeading = THREE.MathUtils.degToRad((Number(this.params.waveHeadingDeg) || 180) - (Number(this.params.modelYawDeg) || 0));
    const headGain = Math.abs(Math.cos(relativeHeading));
    const beamGain = Math.abs(Math.sin(relativeHeading));
    const relativeWave = amplitude / Math.max(T, 0.05);
    const wavelengthFit = Math.min(1.2, wavelength / Math.max(L, 0.1));
    const fallbackHeave = amplitude * Math.min(0.95, Math.max(0.12, 0.25 + 0.35 * wavelengthFit));
    const fallbackRollDeg = THREE.MathUtils.radToDeg(Math.atan2(amplitude, Math.max(B * 0.5, 0.05))) * Math.min(1.1, 0.35 + relativeWave * 0.25);
    const fallbackPitchDeg = THREE.MathUtils.radToDeg(Math.atan2(amplitude, Math.max(L * 0.5, 0.05))) * Math.min(1.0, 0.3 + relativeWave * 0.2);
    const heave = Number.isFinite(Number(response.heaveM)) ? Number(response.heaveM) : fallbackHeave;
    const rollDeg = Number.isFinite(Number(response.rollDeg)) ? Number(response.rollDeg) * Math.max(0.2, beamGain) : fallbackRollDeg * Math.max(0.15, beamGain);
    const pitchDeg = Number.isFinite(Number(response.pitchDeg)) ? Number(response.pitchDeg) * Math.max(0.2, headGain) : fallbackPitchDeg * Math.max(0.15, headGain);
    const roll = THREE.MathUtils.degToRad(rollDeg);
    const pitch = THREE.MathUtils.degToRad(pitchDeg);
    const wavePhase = k * (waterlineAnchor.x * dirX + waterlineAnchor.y * dirY) - omega * t;
    const yaw = THREE.MathUtils.degToRad(Number(this.params.modelYawDeg) || 0);

    const heaveOffset = heave * Math.sin(wavePhase);

    const yawQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), yaw);
    const pitchQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), pitch * Math.sin(wavePhase));
    const rollQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), roll * Math.sin(wavePhase + Math.PI * 0.2));
    target.position.copy(this.modelPose.position);
    target.quaternion.copy(this.modelPose.quaternion).multiply(yawQ).multiply(pitchQ).multiply(rollQ);
    target.updateMatrixWorld?.(true);

    if (this.modelPose.waterlineLocalAnchor) {
      const desiredAnchor = waterlineAnchor.clone();
      desiredAnchor.z += heaveOffset;
      const currentAnchor = target.localToWorld(this.modelPose.waterlineLocalAnchor.clone());
      target.position.add(desiredAnchor.sub(currentAnchor));
    } else {
      target.position.z += heaveOffset;
    }
    target.updateMatrixWorld?.(true);
    this._applyVisualFollowers();
  }
}
