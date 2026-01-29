
// /includes/three/MeasureController.js
// Interaktivt måleverktøy for STL-vieweren.
//
// Funksjoner:
//  - enable/disable måling
//  - klikk to punkter i canvas => vis linje + lengde
//  - snapping: none | vertex | edge | both
//  - snap-toleranse: world-enheter (radius rundt pekepunktet)
//  - labels på skjerm som følger midtpunkt (oppdateres per frame via core.addFrameListener)
//
// Forenklinger/antakelser:
//  - Snap mot vertices: henter nærmeste pos fra geometry.attribute.position
//  - Snap mot edges: sjekker segment-midt&proj for tri-kanter i nærheten (lettvektsheuristikk)
//  - For store geometrier kan edge-snap være kostbart. Vi optimaliserer ved hurtigsjekk
//    i nærområdet fra raycast-truffet tri, ikke hele mesh hver gang.
//
// API (typisk UI-binding):
//  const m = new MeasureController(core);
//  m.setMesh(mesh);
//  m.setEnabled(true/false);
//  m.setSnapMode("none"|"vertex"|"edge"|"both");
//  m.setSnapTolerance(0.01);
//  m.clear();
//
//  Klikk håndteres av modulen selv (lytter på renderer.domElement).
//
// Merk: UI bør oppdatere enheter/formatteringen hvis du viser tall i paneler.
// Denne modulen viser en enkel overlay-label for hver måling.
//
// © Din modulære viewer

import * as THREE from "./three.module.js";

export class MeasureController {
  /**
   * @param {import('./STLViewerCore.js').STLViewerCore} core
   */
  constructor(core) {
    this.core = core;
    this.renderer = core.renderer;
    this.camera = core.camera;
    this.scene = core.scene;

    // Aktiv mesh/geometry
    this.mesh = null;
    this.geometry = null;

    // Raycast-hjelpere
    this.raycaster = new THREE.Raycaster();
    this.mouseNDC = new THREE.Vector2();

    // State
    this.enabled = false;
    this.snapMode = "none";   // "none" | "vertex" | "edge" | "both"
    this.snapTol = 0.010;     // world-enheter

    this.firstPoint = null;   // world pos for første klikk
    this.tempPoint = null;    // world pos for "flytende" andre punkt (vises mens du sikter)
    this.measureObjects = []; // { a:Vec3, b:Vec3, mid:Vec3, line:THREE.Line, label:HTMLElement }

    // Scene-gruppe for visuelt innhold (linjer)
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Event handlers
    this._onClick = this._onClick.bind(this);
    this._onMove = this._onMove.bind(this);

    // Frame-oppdatering for labels
    this._updateLabels = this._updateLabels.bind(this);
    this.core.addFrameListener(this._updateLabels);

    // For å kunne enable/disable lyttere uten å miste referanse:
    this._listenersAttached = false;
  }

  // ---------- Public API ----------

  setMesh(mesh) {
    // Fjern gamle line-objekter (men behold GUI-state)
    this.clear();
    this.mesh = mesh || null;
    this.geometry = mesh?.geometry || null;
  }

  setEnabled(on) {
    const willEnable = !!on;
    if (willEnable === this.enabled) return;

    this.enabled = willEnable;

    if (this.enabled) {
      this._attachListeners();
    } else {
      this._detachListeners();
      // Nullstill eventuell halv måling
      this.firstPoint = null;
      this.tempPoint = null;
    }
  }

  isEnabled() {
    return this.enabled;
  }

  setSnapMode(mode) {
    const m = String(mode || "none").toLowerCase();
    if (m === "none" || m === "vertex" || m === "edge" || m === "both") {
      this.snapMode = m;
    }
  }

  setSnapTolerance(tol) {
    const v = Number(tol);
    if (Number.isFinite(v) && v >= 0) {
      this.snapTol = v;
    }
  }

  clear() {
    for (const o of this.measureObjects) {
      if (o.line) {
        o.line.geometry.dispose?.();
        o.line.material.dispose?.();
        this.group.remove(o.line);
      }
      if (o.label && o.label.parentElement) o.label.parentElement.removeChild(o.label);
    }
    this.measureObjects.length = 0;
    this.firstPoint = null;
    this.tempPoint = null;
  }

  dispose() {
    this.clear();
    this._detachListeners();
    this.core.removeFrameListener(this._updateLabels);
    if (this.group && this.group.parent) this.group.parent.remove(this.group);
  }

  // ---------- Internt: input ----------

  _attachListeners() {
    if (this._listenersAttached) return;
    const el = this.renderer.domElement;
    el.addEventListener("click", this._onClick);
    el.addEventListener("mousemove", this._onMove);
    this._listenersAttached = true;
  }

  _detachListeners() {
    if (!this._listenersAttached) return;
    const el = this.renderer.domElement;
    el.removeEventListener("click", this._onClick);
    el.removeEventListener("mousemove", this._onMove);
    this._listenersAttached = false;
  }

  _screenToNDC(ev) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouseNDC.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNDC.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
  }

  _onMove(ev) {
    if (!this.enabled || !this.mesh) return;
    if (!this.firstPoint) return; // kun aktiv når første punkt er satt

    this._screenToNDC(ev);
    const hit = this._intersectMesh();
    if (!hit) { this.tempPoint = null; return; }

    const snapped = this._maybeSnap(hit);
    this.tempPoint = snapped || hit.point.clone();
  }

  _onClick(ev) {
    if (!this.enabled || !this.mesh) return;
    this._screenToNDC(ev);

    const hit = this._intersectMesh();
    if (!hit) return;

    const p = this._maybeSnap(hit) || hit.point.clone();

    if (!this.firstPoint) {
      // Første klikk → lagre start
      this.firstPoint = p;
      this.tempPoint = null;
    } else {
      // Andre klikk → fullfør måling
      const a = this.firstPoint.clone();
      const b = p.clone();
      this._commitMeasure(a, b);
      this.firstPoint = null;
      this.tempPoint = null;
    }
  }

  _intersectMesh() {
    if (!this.mesh) return null;
    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    const hits = this.raycaster.intersectObject(this.mesh, false);
    if (!hits || hits.length === 0) return null;
    // velg nærmeste
    return hits[0];
  }

  // ---------- Snapping ----------

  _maybeSnap(rayHit) {
    if (!this.geometry || this.snapMode === "none") return null;

    const tol = this.snapTol;
    const hitPoint = rayHit.point;
    let best = { p: null, d2: Infinity };

    // 1) Vertex snap
    if (this.snapMode === "vertex" || this.snapMode === "both") {
      const vp = this._nearestVertexAroundRayHit(rayHit, tol);
      if (vp && vp.d2 < best.d2) best = vp;
    }

    // 2) Edge snap (mot kantsegmenter rundt truffet tri)
    if (this.snapMode === "edge" || this.snapMode === "both") {
      const ep = this._nearestEdgeAroundRayHit(rayHit, tol);
      if (ep && ep.d2 < best.d2) best = ep;
    }

    return best.p && best.d2 <= tol * tol ? best.p : null;
  }

  _nearestVertexAroundRayHit(rayHit, tol) {
    const geo = this.geometry;
    const pos = geo.attributes.position;
    const idx = geo.index;

    // Hvis vi har indeks, bruk tri som ble truffet for å få nærområde
    // (hurtig og presist nok for snap rundt hit)
    const candidates = [];
    if (idx) {
      const faceIndex = rayHit.faceIndex ?? -1; // faceIndex peker på tri
      if (faceIndex >= 0) {
        const i0 = idx.getX(faceIndex * 3 + 0);
        const i1 = idx.getX(faceIndex * 3 + 1);
        const i2 = idx.getX(faceIndex * 3 + 2);
        candidates.push(i0, i1, i2);
      }
    } else {
      // Uten indeks: bruk tri fra pos direkte
      const faceIndex = rayHit.faceIndex ?? -1;
      if (faceIndex >= 0) {
        candidates.push(faceIndex * 3 + 0, faceIndex * 3 + 1, faceIndex * 3 + 2);
      }
    }

    // Fallback: om vi ikke fikk faceIndex, gjør en liten sampling i nærheten
    if (candidates.length === 0) {
      // sample noen punkter tilfeldig (lite sannsynlig her, men safe-guard)
      const n = Math.min(256, pos.count);
      const step = Math.max(1, Math.floor(pos.count / n));
      for (let i = 0; i < pos.count; i += step) candidates.push(i);
    }

    const hitW = rayHit.point;
    const mesh = this.mesh;

    let best = { p: null, d2: Infinity };
    const v = new THREE.Vector3();
    for (const i of candidates) {
      v.set(pos.getX(i), pos.getY(i), pos.getZ(i));
      // lokalt -> world
      v.applyMatrix4(mesh.matrixWorld);
      const d2 = v.distanceToSquared(hitW);
      if (d2 < best.d2) best = { p: v.clone(), d2 };
    }

    return best;
  }

  _nearestEdgeAroundRayHit(rayHit, tol) {
    // Edge-snap: sjekk de tre kantene i truffet tri + nabotri (hvis mulig).
    // Snapper til nærmeste punkt på segmentet hvis innenfor tol.
    const geo = this.geometry;
    const pos = geo.attributes.position;
    const idx = geo.index;
    const mesh = this.mesh;

    // Finn tri-indekser
    let i0, i1, i2;
    if (idx) {
      const faceIndex = rayHit.faceIndex ?? -1;
      if (faceIndex < 0) return null;
      i0 = idx.getX(faceIndex * 3 + 0);
      i1 = idx.getX(faceIndex * 3 + 1);
      i2 = idx.getX(faceIndex * 3 + 2);
    } else {
      const faceIndex = rayHit.faceIndex ?? -1;
      if (faceIndex < 0) return null;
      i0 = faceIndex * 3 + 0;
      i1 = faceIndex * 3 + 1;
      i2 = faceIndex * 3 + 2;
    }

    // Hent tri-verts i world
    const a = new THREE.Vector3(pos.getX(i0), pos.getY(i0), pos.getZ(i0)).applyMatrix4(mesh.matrixWorld);
    const b = new THREE.Vector3(pos.getX(i1), pos.getY(i1), pos.getZ(i1)).applyMatrix4(mesh.matrixWorld);
    const c = new THREE.Vector3(pos.getX(i2), pos.getY(i2), pos.getZ(i2)).applyMatrix4(mesh.matrixWorld);

    const edges = [
      { p0: a, p1: b },
      { p0: b, p1: c },
      { p0: c, p1: a }
    ];

    const hp = rayHit.point;
    let best = { p: null, d2: Infinity };
    const tmp = new THREE.Vector3();

    for (const e of edges) {
      const near = this._nearestPointOnSegment(hp, e.p0, e.p1, tmp);
      const d2 = near.distanceToSquared(hp);
      if (d2 < best.d2) best = { p: near.clone(), d2 };
    }

    return best;
  }

  _nearestPointOnSegment(p, a, b, out = new THREE.Vector3()) {
    // projiser p på segment ab
    const ab = b.clone().sub(a);
    const ap = p.clone().sub(a);
    const len2 = Math.max(1e-16, ab.lengthSq());
    let t = ab.dot(ap) / len2;
    t = Math.max(0, Math.min(1, t));
    return out.copy(a).addScaledVector(ab, t);
  }

  // ---------- Måling/linje/label ----------

  _commitMeasure(a, b) {
    // Lag linje
    const g = new THREE.BufferGeometry().setFromPoints([a, b]);
    const m = new THREE.LineBasicMaterial({
      color: new THREE.Color(0x111111),
      linewidth: 2, // NB: støttes ikke i WebGL1, men beholder for evt. ext
      transparent: true,
      opacity: 0.9
    });
    const line = new THREE.Line(g, m);
    this.group.add(line);

    const mid = a.clone().add(b).multiplyScalar(0.5);
    const dist = a.distanceTo(b);

    // Label
    const label = this._createLabel(`${dist.toFixed(4)}`);
    // lagre som "measure object"
    this.measureObjects.push({ a, b, mid, line, label });

    // Init label-pos nå, og løpende via frame listener
    this._positionLabelScreen(label, mid);
  }

  _createLabel(text) {
    const div = document.createElement("div");
    div.style.position = "fixed";
    div.style.zIndex = "90";
    div.style.background = "color-mix(in srgb, var(--bg-main, #ffffff) 40%, #000 60%)";
    div.style.color = "var(--primary-contrast, #fff)";
    div.style.padding = "6px 8px";
    div.style.borderRadius = "10px";
    div.style.font = "12px system-ui,Segoe UI,Arial";
    div.style.pointerEvents = "none";
    div.textContent = text;
    document.body.appendChild(div);
    return div;
  }

  _positionLabelScreen(label, worldPos) {
    // world -> NDC -> screen
    const v = worldPos.clone().project(this.camera);
    const x = (v.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-v.y * 0.5 + 0.5) * window.innerHeight;
    label.style.left = `${Math.round(x + 8)}px`;
    label.style.top  = `${Math.round(y + 8)}px`;
  }

  _updateLabels() {
    // Oppdater løpende alle label-posisjoner og tekst (hvis vi vil endre enheter)
    for (const o of this.measureObjects) {
      if (!o.label || !o.mid) continue;
      // oppdatér mid i tilfelle a/b er transformert (de ligger i world allerede, så normalt statisk)
      o.mid.copy(o.a).add(o.b).multiplyScalar(0.5);
      this._positionLabelScreen(o.label, o.mid);

      // Tekst: hvis du har units‑system i UI, kan du formatere her.
      // For nå holder vi world-enheter (meter hvis scenen er i meter):
      const dist = o.a.distanceTo(o.b);
      o.label.textContent = `${dist.toFixed(4)}`;
    }

    // Vis "preview" linje fra firstPoint til tempPoint hvis ønskelig (opsjon):
    // For å holde modulen enkel, viser vi ikke preview-linje – men det er lett å legge til.
  }
}
