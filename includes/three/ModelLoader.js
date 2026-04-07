// /includes/three/ModelLoader.js
// Laster STL og 3MF-filer og lager riktig materiale-oppsett:
// ✅ Vertex colors (binary STL "Magics" / COLOR=...)
// ✅ Multi-solid (ASCII STL med flere "solid" => geometry.groups)
// ✅ Fallback per-solid farger hvis multi-solid uten vertex colors
// ✅ Beholder volum + centroid (samme metode som før)
//
// Krever: STLLoader.js, ThreeMFLoader.js, three.module.js

import * as THREE from "./three.module.js";
import { STLLoader } from "./STLLoader.js";
import { ThreeMFLoader } from "./ThreeMFLoader.js";
import { FusionArchiveLoader } from "./FusionArchiveLoader.js";

export class ModelLoader {
  constructor() {
    this.stlLoader = new STLLoader();
    this.threeMFLoader = new ThreeMFLoader();
    this.fusionLoader = new FusionArchiveLoader();
  }

  /**
   * Last STL eller 3MF via fetch() og returner:
   * { mesh, geometry, volume, centroidLocal }
   */
  async load(url) {
    if (!url) throw new Error("ModelLoader: url mangler");

    console.info("[ModelLoader] Starter lasting:", url);
    const res = await fetch(url, { cache: "no-store" });
    console.info("[ModelLoader] HTTP-respons:", {
      url,
      status: res.status,
      ok: res.ok,
      contentType: res.headers.get("content-type") || "ukjent",
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ved lasting av ${url}`);
    }

    const buf = await res.arrayBuffer();
    console.info("[ModelLoader] Bytes mottatt:", buf.byteLength);

    // Detect file type from URL extension (ignorer query/hash)
    const cleanUrl = String(url).split('?')[0].split('#')[0].toLowerCase();
    const is3MF = cleanUrl.endsWith('.3mf') || cleanUrl.endsWith('.3fm') || cleanUrl.endsWith('.fm3');
    const isFusionArchive = cleanUrl.endsWith('.3fz') || cleanUrl.endsWith('.f3d') || cleanUrl.endsWith('.fbm');
    const isZip = buf.byteLength >= 4 && new DataView(buf).getUint32(0, true) === 0x04034b50;
    console.info("[ModelLoader] Filtypedeteksjon:", { cleanUrl, is3MF, isFusionArchive, isZip });

    let geometry;
    let components = null;
    if (is3MF || isFusionArchive || isZip) {
      // 3MF/Fusion loaders return arrays of components
      if (is3MF) {
        components = await this.threeMFLoader.load(url);
      } else if (isFusionArchive) {
        components = await this.fusionLoader.load(url);
      } else {
        components = await this._loadZipByBestEffort(url);
      }
      if (!Array.isArray(components)) {
        // Single component - wrap in array
        components = [{ name: 'model', geometry: components }];
      }
      geometry = null; // Will be handled below
    } else {
      // STL loader is synchronous
      geometry = this.stlLoader.parse(buf);
    }

    let mesh;
    let componentNames = [];

    if (components) {
      // Build a group with multiple meshes
      const group = new THREE.Group();
      let totalVolume = 0;
      const totalCentroid = new THREE.Vector3();

      for (const comp of components) {
        comp.geometry.computeVertexNormals();
        comp.geometry.computeBoundingBox();

        const compMesh = new THREE.Mesh(comp.geometry, null); // Material set below
        compMesh.name = comp.name;
        compMesh.userData.componentName = comp.name;
        group.add(compMesh);

        // Calculate component volume/centroid
        const { volume, centroid } = this.computeVolumeAndCentroid(comp.geometry);
        totalVolume += volume;
        totalCentroid.addScaledVector(centroid, volume);

        componentNames.push(comp.name);
      }

      // Final centroid
      if (totalVolume > 0) {
        totalCentroid.divideScalar(totalVolume);
      }

      mesh = group;
      mesh.userData.volume = totalVolume;
      mesh.userData.centroidLocal = totalCentroid;
      mesh.userData.componentNames = componentNames;

      // Material setup for group
      const { material, meta } = this._buildMaterialForComponents(components);
      for (let i = 0; i < group.children.length; i++) {
        group.children[i].material = Array.isArray(material) ? material[i] : material;
      }

      mesh.userData.modelMeta = {
        ...meta,
        fileType: isFusionArchive ? 'fusion-archive' : (is3MF ? '3mf' : 'zip-auto'),
        url: url,
        components: componentNames.length
      };

      return {
        mesh,
        geometry: null, // Group doesn't have single geometry
        volume: totalVolume,
        centroidLocal: totalCentroid,
      };

    } else {
      // Single geometry (STL or single-component 3MF)
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();

      // Beregn totalvolum + centroid i LOCAL space
      const { volume, centroid } = this.computeVolumeAndCentroid(geometry);

      // --- Materialeoppsett ---
      const { material, meta } = this._buildMaterialForGeometry(geometry);

      mesh = new THREE.Mesh(geometry, material);

      // Litt metadata kan være nyttig for debugging/GUI senere
      mesh.userData.modelMeta = {
        ...meta,
        fileType: is3MF ? '3mf' : (isFusionArchive ? 'fusion-archive' : 'stl'),
        url: url
      };

      return {
        mesh,
        geometry,
        volume,
        centroidLocal: centroid,
      };
    }
  }

  async _loadZipByBestEffort(url) {
    try {
      return await this.threeMFLoader.load(url);
    } catch (err3mf) {
      console.warn("[ModelLoader] 3MF-parse feilet, prøver Fusion-arkiv:", err3mf);
      return this.fusionLoader.load(url);
    }
  }

  // ------------------------------------------------------------
  // Material-bygging: vertex colors + groups
  // ------------------------------------------------------------

  _buildMaterialForComponents(components) {
    const baseParams = {
      metalness: 0.05,
      roughness: 0.55,
      flatShading: false,
      side: THREE.DoubleSide,
    };

    // Build materials for each component
    const materials = [];
    const names = components.map(c => c.name);

    for (let i = 0; i < components.length; i++) {
      const name = names[i] || `component_${i + 1}`;
      const col = this._colorFromString(name);

      materials.push(
        new THREE.MeshStandardMaterial({
          ...baseParams,
          color: col,
          transparent: false,
          opacity: 1.0,
        })
      );
    }

    return {
      material: materials,
      meta: {
        hasVertexColors: false,
        alpha: 1.0,
        groups: components.length,
        groupNames: names,
        components: components.length,
      },
    };
  }

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
