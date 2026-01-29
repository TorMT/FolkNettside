// /includes/three/ModelLoader.js
// Laster STL-filer og lager riktig materiale-oppsett:
// ✅ Vertex colors (binary STL "Magics" / COLOR=...)
// ✅ Multi-solid (ASCII STL med flere "solid" => geometry.groups)
// ✅ Fallback per-solid farger hvis multi-solid uten vertex colors
// ✅ Beholder volum + centroid (samme metode som før)
//
// Krever: STLLoader.js, three.module.js

import * as THREE from "./three.module.js";
import { STLLoader } from "./STLLoader.js";

export class ModelLoader {
  constructor() {
    this.loader = new STLLoader();
  }

  /**
   * Last STL via fetch() og returner:
   * { mesh, geometry, volume, centroidLocal }
   */
  async load(url) {
    if (!url) throw new Error("ModelLoader: url mangler");

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} ved lasting av ${url}`);

    const buf = await res.arrayBuffer();
    const geometry = this.loader.parse(buf);

    // STLLoader gir normalt non-indexed geom, men vi støtter begge
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();

    // Beregn totalvolum + centroid i LOCAL space (bruker pos/index hvis finnes)
    const { volume, centroid } = this.computeVolumeAndCentroid(geometry);

    // --- Materialeoppsett ---
    const { material, meta } = this._buildMaterialForGeometry(geometry);

    const mesh = new THREE.Mesh(geometry, material);

    // Litt metadata kan være nyttig for debugging/GUI senere
    mesh.userData.stlMeta = meta;

    return {
      mesh,
      geometry,
      volume,
      centroidLocal: centroid,
    };
  }

  // ------------------------------------------------------------
  // Material-bygging: vertex colors + groups
  // ------------------------------------------------------------

  _buildMaterialForGeometry(geometry) {
    const hasVertexColors = !!geometry.hasColors || !!geometry.getAttribute?.("color");
    const alpha = Number.isFinite(geometry.alpha) ? geometry.alpha : 1.0;

    const groups = Array.isArray(geometry.groups) ? geometry.groups : [];
    const hasGroups = groups.length > 0;

    const baseParams = {
      metalness: 0.05,
      roughness: 0.55,
      flatShading: false,
      side: THREE.DoubleSide,
    };

    // Case A: Vertex colors (best-effort: bruk én material med vertexColors)
    if (hasVertexColors) {
      const mat = new THREE.MeshStandardMaterial({
        ...baseParams,
        color: 0xffffff,            // tint (UI kan endre)
        vertexColors: true,
        transparent: alpha < 0.999,
        opacity: alpha,
      });

      return {
        material: mat,
        meta: {
          hasVertexColors: true,
          alpha,
          groups: hasGroups ? groups.length : 0,
          groupNames: geometry.userData?.groupNames || null,
        },
      };
    }

    // Case B: Multi-solid (ASCII) uten vertex colors -> material-array per group
    if (hasGroups) {
      const mats = [];
      const names = geometry.userData?.groupNames || [];

      for (let i = 0; i < groups.length; i++) {
        const name = names?.[i] || `solid_${i + 1}`;
        const col = this._colorFromString(name);

        mats.push(
          new THREE.MeshStandardMaterial({
            ...baseParams,
            color: col,
            transparent: false,
            opacity: 1.0,
          })
        );
      }

      return {
        material: mats,
        meta: {
          hasVertexColors: false,
          alpha: 1.0,
          groups: groups.length,
          groupNames: names || null,
        },
      };
    }

    // Case C: Vanlig enkelt-solid, uten colors
    const mat = new THREE.MeshStandardMaterial({
      ...baseParams,
      color: 0x5da9ff,
      transparent: false,
      opacity: 1.0,
    });

    return {
      material: mat,
      meta: {
        hasVertexColors: false,
        alpha: 1.0,
        groups: 0,
        groupNames: null,
      },
    };
  }

  /**
   * Deterministisk farge per navn (for multi-solid)
   */
  _colorFromString(str) {
    const s = String(str || "");
    let h = 2166136261; // FNV-1a-ish
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }

    // Hue 0..1
    const hue = ((h >>> 0) % 360) / 360;

    // Lag en "behagelig" farge i HSL -> RGB
    const c = new THREE.Color();
    c.setHSL(hue, 0.55, 0.55);
    return c;
  }

  // ------------------------------------------------------------
  // Volum + centroid
  // ------------------------------------------------------------

  /**
   * Beregn volum og centroid ved "signed volume of tetrahedrons".
   * Samme logikk som før, men robust for index/no-index.
   */
  computeVolumeAndCentroid(geo) {
    const pos = geo.attributes.position;
    const idx = geo.index;

    let V6 = 0; // 6*volum
    const C = new THREE.Vector3(0, 0, 0);

    const p0 = new THREE.Vector3();
    const p1 = new THREE.Vector3();
    const p2 = new THREE.Vector3();
    const cross = new THREE.Vector3();

    const triCount = idx ? idx.count / 3 : pos.count / 3;

    for (let t = 0; t < triCount; t++) {
      let i0, i1, i2;

      if (idx) {
        i0 = idx.getX(t * 3 + 0);
        i1 = idx.getX(t * 3 + 1);
        i2 = idx.getX(t * 3 + 2);
      } else {
        i0 = t * 3 + 0;
        i1 = t * 3 + 1;
        i2 = t * 3 + 2;
      }

      p0.set(pos.getX(i0), pos.getY(i0), pos.getZ(i0));
      p1.set(pos.getX(i1), pos.getY(i1), pos.getZ(i1));
      p2.set(pos.getX(i2), pos.getY(i2), pos.getZ(i2));

      // signed volume contribution (6*V)
      cross.copy(p1).cross(p2);
      const v6 = p0.dot(cross);
      V6 += v6;

      // centroid contribution
      // tetra centroid = (0 + p0 + p1 + p2)/4
      const Ct = p0.clone().add(p1).add(p2).multiplyScalar(0.25);
      C.addScaledVector(Ct, v6);
    }

    let volume = V6 / 6;

    if (Math.abs(volume) < 1e-12) {
      return {
        volume: 0,
        centroid: new THREE.Vector3(0, 0, 0),
      };
    }

    // normalisering av centroid
    C.multiplyScalar(1 / V6);

    // volum skal være positivt
    if (volume < 0) volume = -volume;

    return {
      volume,
      centroid: C,
    };
  }
}
