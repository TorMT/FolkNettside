
// /includes/three/ClippingController.js
// Cutaway-klipping for STL-vieweren.
//
// • Klipper i MESH-LOKALT koordinatsystem (som originalen).
// • Velg akse: "x" | "y" | "z"
// • Inverter side: invert true/false
// • Slider -1..1 mappes til min..max på valgt akse i meshens lokale bbox.
// • Planets normal peker langs valgt akse (evt. snudd ved invert).
//
// Viktig:
//  - Renderer må ha localClippingEnabled=true (settes i STLViewerCore).
//  - Denne modulen styrer KUN klippeplaner for hoved-mesh-materialet.
//  - Kall refreshBounds() etter ny mesh/align om slider ikke oppfører seg.

import * as THREE from "./three.module.js";

export class ClippingController {
  /**
   * @param {import('./STLViewerCore.js').STLViewerCore} core
   */
  constructor(core) {
    this.core = core;
    this.mesh = null;

    // Aktiv/akse/invert
    this.enabled = false;
    this.axis = "x";       // "x" | "y" | "z"
    this.invert = false;

    // Gjeldende klippeplan og bounds for slider-mapping
    this.clipPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
    this.clipBounds = { min: -1, max: 1 }; // lokale grenser langs valgt akse

    // Gjeldende sliderverdi (for å kunne re-applisere ved axis/invert/endringer)
    this._sliderValue = 0.0; // -1..1
  }

  /**
   * Sett aktuell mesh (kalles når ny modell lastes).
   */
  setMesh(mesh) {
    // Fjern klipping fra gammel mesh
    if (this.mesh && this.mesh.material) {
      this._applyMaterialPlanes(this.mesh.material, []);
    }

    this.mesh = mesh;

    // Re-init bounds fra ny geometri
    this.refreshBounds();

    // Re-appliser på ny mesh
    this._updateClipPlaneFromState();
    this._applyPlaneToMesh();
  }

  /**
   * Oppfrisk slider-bounds ved valgt akse fra meshens lokale bounding box.
   * Kall dette etter at geometrien har endret seg (f.eks. etter auto-align
   * dersom align påvirker lokal bbox), eller når du bytter akse.
   */
  refreshBounds() {
    if (!this.mesh || !this.mesh.geometry) return;
    this.mesh.geometry.computeBoundingBox();
    const b = this.mesh.geometry.boundingBox;

    if (this.axis === "x") this.clipBounds = { min: b.min.x, max: b.max.x };
    if (this.axis === "y") this.clipBounds = { min: b.min.y, max: b.max.y };
    if (this.axis === "z") this.clipBounds = { min: b.min.z, max: b.max.z };
  }

  /**
   * Slå klipping av/på.
   */
  setEnabled(on) {
    this.enabled = !!on;
    this._applyPlaneToMesh();
  }

  /**
   * Sett akse ("x","y","z").
   * Oppdaterer bounds og re-appliserer eksisterende sliderposisjon.
   */
  setAxis(axis) {
    if (axis !== "x" && axis !== "y" && axis !== "z") return;
    this.axis = axis;
    this.refreshBounds();
    this._updateClipPlaneFromState();
    this._applyPlaneToMesh();
  }

  /**
   * Inverter hvilken side som beholdes.
   */
  setInvert(on) {
    this.invert = !!on;
    this._updateClipPlaneFromState();
    this._applyPlaneToMesh();
  }

  /**
   * Sett sliderverdi (fra -1..1). Verdi mappes til min..max på valgt akse.
   * @param {number} t - i området [-1, 1]
   */
  setSlider(t) {
    const tt = Math.max(-1, Math.min(1, Number(t)));
    this._sliderValue = tt;
    this._updateClipPlaneFromState();
    this._applyPlaneToMesh();
  }

  /**
   * @returns {{min:number,max:number}} gjeldende lokale bounds for valgt akse
   */
  getBounds() {
    return { ...this.clipBounds };
  }

  /**
   * Internt: bygg plane.normal og plane.constant ut fra axis/invert/slider/bounds.
   */
  _updateClipPlaneFromState() {
    // Bestem normal langs valgt akse, evt. snu ved invert
    const s = this.invert ? -1 : 1;
    const n = new THREE.Vector3(
      this.axis === "x" ? 1 * s : 0,
      this.axis === "y" ? 1 * s : 0,
      this.axis === "z" ? 1 * s : 0
    );
    this.clipPlane.normal.copy(n).normalize();

    // Map slider -1..1 til pos i [min,max] langs valgt akse (lokalt)
    const { min, max } = this.clipBounds;
    const pos = min + ((this._sliderValue + 1) / 2) * (max - min);

    // Punkt på planet i lokalt space til mesh
    const p0 = new THREE.Vector3(
      this.axis === "x" ? pos : 0,
      this.axis === "y" ? pos : 0,
      this.axis === "z" ? pos : 0
    );

    // Plane.constant = -n·p0  (plan-ligning: n·x + constant = 0)
    this.clipPlane.constant = -n.dot(p0);
  }

  /**
   * Internt: påfør plane til mesh-materialet, eller fjern.
   */
  _applyPlaneToMesh() {
    if (!this.mesh || !this.mesh.material) return;

    const planes = this.enabled ? [this.clipPlane] : [];
    this._applyMaterialPlanes(this.mesh.material, planes);

    // NB: Hvis du har kanter/bbox-line som egne objekter med egne materialer,
    // bør de enten tvinges synlig (uten klipping), eller også få clippingPlanes.
  }

  /**
   * Håndter både enkelttmateriale og et array av materialer.
   * @param {THREE.Material|THREE.Material[]} mat
   * @param {THREE.Plane[]} planes
   */
  _applyMaterialPlanes(mat, planes) {
    if (Array.isArray(mat)) {
      for (const m of mat) this._setMatPlanes(m, planes);
    } else {
      this._setMatPlanes(mat, planes);
    }
  }

  _setMatPlanes(mat, planes) {
    if (!mat) return;
    mat.clippingPlanes = planes;
    mat.needsUpdate = true;
  }
}
``
