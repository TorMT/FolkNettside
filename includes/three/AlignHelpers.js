
// /includes/three/AlignHelpers.js
// Orienteringshjelpere for STL-modellen:
// 1) bestBoatAlignQuaternion(geometry): finner en quaternion som grovt sett
//    aligner L (lengde) -> X, B (bredde) -> Y, H (høyde) -> Z.
//    Heuristikk: vurderer permutasjoner av akser og fortegn, scorer bbox-forhold.
// 2) createSwapQuaternion(type): hurtig-rotasjoner "yz" | "xz" | "xy"
//    som tilsvarer å "bytte" akser slik brukeren forventer.
//
// Avhengigheter: three.module.js
// Bruk sammen med STLViewerCore.applyAlignQuaternion(q) for å sette align.

import * as THREE from "./three.module.js";

export class AlignHelpers {
  /**
   * Finn en quaternion som gir "båt-vennlig" orientering:
   *  - Lengste utstrekning -> X
   *  - Nest lengste -> Y
   *  - Minste -> Z (opp)
   *
   * Heuristikk: tester alle permutasjoner og fortegn av basis-aksene,
   * og evaluerer en score basert på world-bbox (etter den tenkte basen).
   *
   * @param {THREE.BufferGeometry} geo
   * @returns {THREE.Quaternion} quaternion
   */
  static bestBoatAlignQuaternion(geo) {
    const pos = geo.attributes.position;
    const n = pos.count;

    // Sample ned punkter for å gjøre scoring raskere
    const step = Math.max(1, Math.floor(n / 5000));
    const points = [];
    for (let i = 0; i < n; i += step) {
      points.push(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)));
    }

    const axes = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 1),
    ];

    function matFromBasis(xAxis, yAxis, zAxis) {
      const m = new THREE.Matrix4();
      m.makeBasis(xAxis, yAxis, zAxis);
      return m;
    }

    function scoreMatrix(m) {
      // Prosjekter alle sample-punkter inn i denne "basen"
      const min = new THREE.Vector3( Infinity,  Infinity,  Infinity);
      const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);

      for (const p of points) {
        const qv = p.clone().applyMatrix4(m);
        min.min(qv);
        max.max(qv);
      }

      const s = max.clone().sub(min);
      const sx = s.x, sy = s.y, sz = s.z;

      // Score lavere = bedre.
      // 1) Straff hvis X ikke er større eller lik Y (vi ønsker L→X >= B→Y)
      // 2) Straff hvis Y ikke er større eller lik Z (B→Y >= H→Z)
      // 3) Straff høy Z ift X (vi vil gjerne at høyden er lavest)
      // 4) Ekstra straff hvis Z ikke er den minste av de tre (hard rule)
      let penalty = 0;
      if (sx < sy) penalty += (sy - sx) / (sx + sy + 1e-9);
      if (sy < sz) penalty += (sz - sy) / (sy + sz + 1e-9);

      const ratio = (sz + 1e-9) / (sx + 1e-9);
      penalty += ratio * 0.35;

      if (!(sz <= sy && sz <= sx)) penalty += 2.0;

      return penalty;
    }

    let best = { score: Infinity, quat: new THREE.Quaternion() };
    const perms = [
      [0, 1, 2], [0, 2, 1], [1, 0, 2],
      [1, 2, 0], [2, 0, 1], [2, 1, 0]
    ];
    const signs = [-1, 1];

    for (const p of perms) {
      for (const sx of signs) {
        for (const sy of signs) {
          for (const sz of signs) {
            const xA = axes[p[0]].clone().multiplyScalar(sx);
            const yA = axes[p[1]].clone().multiplyScalar(sy);
            const zA = axes[p[2]].clone().multiplyScalar(sz);

            // Må være høyrehendt basis
            const cross = xA.clone().cross(yA);
            if (cross.dot(zA) < 0.999) continue;

            const m = matFromBasis(xA, yA, zA);
            const sc = scoreMatrix(m);

            if (sc < best.score) {
              const qAlign = new THREE.Quaternion().setFromRotationMatrix(m);
              best = { score: sc, quat: qAlign };
            }
          }
        }
      }
    }

    return best.quat;
  }

  /**
   * Hurtig "swap"-rotasjoner:
   *  - "yz": roterer 90° rundt X (bytter Y/Z)
   *  - "xz": roterer 90° rundt Y (bytter X/Z)
   *  - "xy": roterer 90° rundt Z (bytter X/Y)
   *
   * @param {"yz"|"xz"|"xy"} type
   * @returns {THREE.Quaternion}
   */
  static createSwapQuaternion(type) {
    const qRot = new THREE.Quaternion();
    if (type === "yz") {
      qRot.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
    } else if (type === "xz") {
      qRot.setFromEuler(new THREE.Euler(0, Math.PI / 2, 0));
    } else if (type === "xy") {
      qRot.setFromEuler(new THREE.Euler(0, 0, Math.PI / 2));
    }
    return qRot;
  }
}
