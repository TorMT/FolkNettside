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
import { ThreeMFLoader } from "./ThreeMFLoader.js?v=20260409j";
import { FusionArchiveLoader } from "./FusionArchiveLoader.js?v=20260409j";
import { StepLoader } from "./StepLoader.js?v=20260409i";

const ARRAY_BUFFER_CACHE = new Map();

async function fetchArrayBufferCached(url) {
  const key = String(url || "");
  if (!key) throw new Error("fetchArrayBufferCached: url mangler");
  if (!ARRAY_BUFFER_CACHE.has(key)) {
    const promise = fetch(key, { cache: "default" })
      .then(async (res) => {
        console.info("[ModelLoader] HTTP-respons:", {
          url: key,
          status: res.status,
          ok: res.ok,
          contentType: res.headers.get("content-type") || "ukjent",
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ved lasting av ${key}`);
        }
        return res.arrayBuffer();
      })
      .catch((error) => {
        ARRAY_BUFFER_CACHE.delete(key);
        throw error;
      });
    ARRAY_BUFFER_CACHE.set(key, promise);
  }
  return ARRAY_BUFFER_CACHE.get(key);
}

export class ModelLoader {
  constructor() {
    this.stlLoader = new STLLoader();
    this.threeMFLoader = new ThreeMFLoader();
    this.fusionLoader = new FusionArchiveLoader();
    this.stepLoader = new StepLoader();
  }

  /**
   * Last STL eller 3MF via fetch() og returner:
   * { mesh, geometry, volume, centroidLocal }
   */
  async load(url) {
    if (!url) throw new Error("ModelLoader: url mangler");

    console.info("[ModelLoader] Starter lasting:", url);

    const cleanUrl = String(url).split('?')[0].split('#')[0].toLowerCase();
    const is3MF = cleanUrl.endsWith('.3mf') || cleanUrl.endsWith('.3fm') || cleanUrl.endsWith('.fm3');
    const isFusionArchive =
      cleanUrl.endsWith('.3fz') ||
      cleanUrl.endsWith('.f3z') ||
      cleanUrl.endsWith('.f3d') ||
      cleanUrl.endsWith('.fbm');
    const isStep = cleanUrl.endsWith('.step') || cleanUrl.endsWith('.stp');
    const isIges = cleanUrl.endsWith('.iges') || cleanUrl.endsWith('.igs');
    const warmupOcct = (isStep || isIges) ? this.stepLoader.prewarm().catch(() => null) : null;

    const buf = await fetchArrayBufferCached(url);
    console.info("[ModelLoader] Bytes mottatt:", buf.byteLength);

    const isZip = buf.byteLength >= 4 && new DataView(buf).getUint32(0, true) === 0x04034b50;
    console.info("[ModelLoader] Filtypedeteksjon:", { cleanUrl, is3MF, isFusionArchive, isStep, isIges, isZip });

    let geometry;
    let components = null;
    if (is3MF || isFusionArchive || isZip || isStep || isIges) {
      // 3MF/Fusion loaders return arrays of components
      if (is3MF) {
        components = await this.threeMFLoader.parse(buf);
      } else if (isStep) {
        await warmupOcct;
        components = await this.stepLoader.parse(buf, { format: 'step' });
      } else if (isIges) {
        await warmupOcct;
        components = await this.stepLoader.parse(buf, { format: 'iges' });
      } else if (isFusionArchive) {
        components = await this.fusionLoader.parse(buf);
      } else {
        components = await this._loadZipByBestEffort(buf);
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
      const normalizedComponents = [];
      const componentMassProps = [];

      for (const comp of components) {
        const geometry = this._normalizeComponentGeometry(comp);
        if (!geometry) {
          console.warn("[ModelLoader] Hopper over ugyldig komponent:", comp);
          continue;
        }
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();

        const compName = comp?.name || comp?.userData?.componentName || 'component';
        const compKey = String(
          comp?.userData?.componentKey ||
          [
            compName,
            comp?.userData?.nodePath,
            comp?.userData?.sourceName,
            `part-${normalizedComponents.length + 1}`
          ].filter(Boolean).join(" :: ")
        );
        const compMesh = new THREE.Mesh(geometry, null); // Material set below
        compMesh.name = compName;
        compMesh.userData.componentName = compName;
        compMesh.userData.componentKey = compKey;
        compMesh.userData.nodePath = String(comp?.userData?.nodePath || "");
        compMesh.userData.brepFaces = Array.isArray(comp?.userData?.brepFaces)
          ? comp.userData.brepFaces.length
          : Number(comp?.userData?.brepFaces) || 0;
        compMesh.userData.sourceName = String(comp?.userData?.sourceName || "");
        group.add(compMesh);

        // Calculate component volume/centroid + geometry moments for later mass combine
        const geometryMassProps = this.computeGeometryMassProps(geometry);
        const volume = Number.isFinite(geometryMassProps?.volume) ? geometryMassProps.volume : 0;
        const centroid = this._vectorFromPlain(geometryMassProps?.centroidLocal) || new THREE.Vector3();
        totalVolume += volume;
        totalCentroid.addScaledVector(centroid, volume);

        const componentMassEntry = {
          key: compKey,
          name: compName,
          nodePath: String(comp?.userData?.nodePath || ""),
          sourceName: String(comp?.userData?.sourceName || ""),
          materialHint: comp?.userData?.materialHint || null,
          densityKgM3: this._resolveDensityHint(comp?.userData?.materialHint),
          ...geometryMassProps,
        };
        componentMassProps.push(componentMassEntry);
        compMesh.userData.volume = volume;
        compMesh.userData.centroidLocal = centroid.clone();
        compMesh.userData.geometryMassProps = componentMassEntry;

        componentNames.push(compName);
        normalizedComponents.push({
          ...comp,
          key: compKey,
          name: compName,
          geometry,
          userData: {
            ...(comp?.userData || {}),
            componentKey: compKey,
            componentName: compName,
          },
        });
      }

      if (!group.children.length) {
        throw new Error("Fant ingen gyldig geometri i 3MF/Fusion-arkivet.");
      }

      const mergedGeometry = this._mergeComponentGeometries(normalizedComponents.map(c => c.geometry));
      if (mergedGeometry) {
        group.geometry = mergedGeometry;
        group.userData.aggregateGeometry = mergedGeometry;
      }

      const combinedGeometryMassProps = this.combineGeometryMassProps(componentMassProps);

      // Final centroid
      if (totalVolume > 0) {
        totalCentroid.divideScalar(totalVolume);
      }

      mesh = group;
      mesh.userData.volume = Number.isFinite(combinedGeometryMassProps?.volume) ? combinedGeometryMassProps.volume : totalVolume;
      mesh.userData.centroidLocal = this._vectorFromPlain(combinedGeometryMassProps?.centroidLocal) || totalCentroid;
      mesh.userData.componentNames = componentNames;
      mesh.userData.componentMassProps = componentMassProps;
      mesh.userData.geometryMassProps = {
        ...(combinedGeometryMassProps || {}),
        components: componentMassProps,
      };

      // Material setup for group
      const { material, meta } = this._buildMaterialForComponents(normalizedComponents);
      for (let i = 0; i < group.children.length; i++) {
        group.children[i].material = Array.isArray(material) ? material[i] : material;
      }

      mesh.userData.modelMeta = {
        ...meta,
        fileType:
          isFusionArchive ? 'fusion-archive' :
          is3MF ? '3mf' :
          isStep ? 'step' :
          isIges ? 'iges' :
          'zip-auto',
        url: url,
        components: componentNames.length
      };

      return {
        mesh,
        geometry: null, // Group doesn't have single geometry
        volume: mesh.userData.volume,
        centroidLocal: mesh.userData.centroidLocal,
      };

    } else {
      // Single geometry (STL or single-component 3MF)
      if (!geometry || typeof geometry.computeVertexNormals !== "function" || typeof geometry.computeBoundingBox !== "function") {
        throw new Error("Kunne ikke hente gyldig geometri fra modellen (mangler computeVertexNormals/computeBoundingBox).");
      }
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();

      // Beregn totalvolum + centroid i LOCAL space
      const geometryMassProps = this.computeGeometryMassProps(geometry);
      const volume = Number.isFinite(geometryMassProps?.volume) ? geometryMassProps.volume : 0;
      const centroid = this._vectorFromPlain(geometryMassProps?.centroidLocal) || new THREE.Vector3();

      // --- Materialeoppsett ---
      const { material, meta } = this._buildMaterialForGeometry(geometry);

      mesh = new THREE.Mesh(geometry, material);
      mesh.userData.volume = volume;
      mesh.userData.centroidLocal = centroid.clone();
      mesh.userData.componentMassProps = [{
        key: "model-root",
        name: "Modell",
        nodePath: "",
        sourceName: "",
        materialHint: null,
        densityKgM3: null,
        ...geometryMassProps,
      }];
      mesh.userData.geometryMassProps = {
        ...geometryMassProps,
        components: mesh.userData.componentMassProps,
      };

      // Litt metadata kan være nyttig for debugging/GUI senere
      mesh.userData.modelMeta = {
        ...meta,
        fileType:
          is3MF ? '3mf' :
          isFusionArchive ? 'fusion-archive' :
          isStep ? 'step' :
          isIges ? 'iges' :
          'stl',
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

  async _loadZipByBestEffort(data) {
    try {
      return await this.threeMFLoader.parse(data);
    } catch (err3mf) {
      console.warn("[ModelLoader] 3MF-parse feilet, prøver Fusion-arkiv:", err3mf);
      return this.fusionLoader.parse(data);
    }
  }

  _normalizeComponentGeometry(comp) {
    const candidate = comp?.geometry || comp;
    if (!candidate) return null;
    if (candidate.isBufferGeometry) return candidate;
    if (candidate.geometry?.isBufferGeometry) return candidate.geometry;
    return null;
  }

  _mergeComponentGeometries(geometries) {
    const valid = (geometries || []).filter(g => g && typeof g.getAttribute === "function");
    if (!valid.length) return null;

    const nonIndexed = valid.map(g => {
      const clone = g.clone();
      return clone.index ? clone.toNonIndexed() : clone;
    });

    const totalFloats = nonIndexed.reduce((sum, g) => {
      const pos = g.getAttribute('position');
      return sum + ((pos && pos.array) ? pos.array.length : 0);
    }, 0);
    if (!totalFloats) return null;

    const mergedPositions = new Float32Array(totalFloats);
    let offset = 0;
    for (const g of nonIndexed) {
      const pos = g.getAttribute('position');
      if (!pos || !pos.array) continue;
      mergedPositions.set(pos.array, offset);
      offset += pos.array.length;
    }

    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(mergedPositions, 3));
    merged.computeVertexNormals();
    merged.computeBoundingBox();
    return merged;
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
      const col = this._componentColor(components[i], name);

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

  _componentColor(component, fallbackName) {
    const preferred = component?.color;
    if (preferred?.isColor) return preferred.clone();
    if (Array.isArray(preferred) && preferred.length >= 3) {
      const scale = preferred.some((value) => Number(value) > 1) ? 255 : 1;
      return new THREE.Color(
        (Number(preferred[0]) || 0) / scale,
        (Number(preferred[1]) || 0) / scale,
        (Number(preferred[2]) || 0) / scale
      );
    }
    return this._colorFromString(fallbackName);
  }

  // ------------------------------------------------------------
  // Volum + centroid
  // ------------------------------------------------------------

  /**
   * Beregn volum og centroid ved "signed volume of tetrahedrons".
   * Samme logikk som før, men robust for index/no-index.
   */
  computeVolumeAndCentroid(geo) {
    const props = this.computeGeometryMassProps(geo);
    return {
      volume: Number.isFinite(props?.volume) ? props.volume : 0,
      centroid: this._vectorFromPlain(props?.centroidLocal) || new THREE.Vector3(0, 0, 0),
    };
  }

  computeGeometryMassProps(geo) {
    const pos = geo?.attributes?.position;
    const idx = geo?.index;
    if (!pos) {
      return {
        volume: 0,
        centroidLocal: { x: 0, y: 0, z: 0 },
        secondMomentsOrigin: this._createSecondMomentObject(),
        secondMomentsCentroid: this._createSecondMomentObject(),
        inertiaOrigin: this._createSecondMomentObject(),
        inertiaCentroid: this._createSecondMomentObject(),
      };
    }

    let V6 = 0;
    const firstMoment = new THREE.Vector3(0, 0, 0);
    let xx = 0, xy = 0, xz = 0, yy = 0, yz = 0, zz = 0;

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

      cross.copy(p1).cross(p2);
      const v6 = p0.dot(cross);
      V6 += v6;

      const x0 = p0.x, y0 = p0.y, z0 = p0.z;
      const x1 = p1.x, y1 = p1.y, z1 = p1.z;
      const x2 = p2.x, y2 = p2.y, z2 = p2.z;

      firstMoment.x += (x0 + x1 + x2) * v6 / 24;
      firstMoment.y += (y0 + y1 + y2) * v6 / 24;
      firstMoment.z += (z0 + z1 + z2) * v6 / 24;

      xx += v6 * (x0 * x0 + x1 * x1 + x2 * x2 + x0 * x1 + x1 * x2 + x2 * x0) / 60;
      yy += v6 * (y0 * y0 + y1 * y1 + y2 * y2 + y0 * y1 + y1 * y2 + y2 * y0) / 60;
      zz += v6 * (z0 * z0 + z1 * z1 + z2 * z2 + z0 * z1 + z1 * z2 + z2 * z0) / 60;

      xy += v6 * (
        2 * (x0 * y0 + x1 * y1 + x2 * y2) +
        x0 * y1 + y0 * x1 +
        x1 * y2 + y1 * x2 +
        x2 * y0 + y2 * x0
      ) / 120;

      xz += v6 * (
        2 * (x0 * z0 + x1 * z1 + x2 * z2) +
        x0 * z1 + z0 * x1 +
        x1 * z2 + z1 * x2 +
        x2 * z0 + z2 * x0
      ) / 120;

      yz += v6 * (
        2 * (y0 * z0 + y1 * z1 + y2 * z2) +
        y0 * z1 + z0 * y1 +
        y1 * z2 + z1 * y2 +
        y2 * z0 + z2 * y0
      ) / 120;
    }

    const signedVolume = V6 / 6;
    if (Math.abs(signedVolume) < 1e-12) {
      return {
        volume: 0,
        centroidLocal: { x: 0, y: 0, z: 0 },
        secondMomentsOrigin: this._createSecondMomentObject(),
        secondMomentsCentroid: this._createSecondMomentObject(),
        inertiaOrigin: this._createSecondMomentObject(),
        inertiaCentroid: this._createSecondMomentObject(),
      };
    }

    const centroid = firstMoment.clone().multiplyScalar(1 / signedVolume);
    const sign = signedVolume < 0 ? -1 : 1;
    const volume = Math.abs(signedVolume);
    const secondMomentsOrigin = {
      xx: xx * sign,
      xy: xy * sign,
      xz: xz * sign,
      yy: yy * sign,
      yz: yz * sign,
      zz: zz * sign,
    };
    const secondMomentsCentroid = this._shiftSecondMomentsToCentroid(secondMomentsOrigin, volume, centroid);

    return {
      volume,
      centroidLocal: this._vectorToPlain(centroid),
      secondMomentsOrigin,
      secondMomentsCentroid,
      inertiaOrigin: this._inertiaFromSecondMoments(secondMomentsOrigin),
      inertiaCentroid: this._inertiaFromSecondMoments(secondMomentsCentroid),
    };
  }

  combineGeometryMassProps(componentProps = []) {
    const valid = (componentProps || []).filter((item) => Number.isFinite(item?.volume) && item.volume > 1e-12);
    if (!valid.length) {
      return {
        volume: 0,
        centroidLocal: { x: 0, y: 0, z: 0 },
        secondMomentsOrigin: this._createSecondMomentObject(),
        secondMomentsCentroid: this._createSecondMomentObject(),
        inertiaOrigin: this._createSecondMomentObject(),
        inertiaCentroid: this._createSecondMomentObject(),
      };
    }

    let totalVolume = 0;
    const centroid = new THREE.Vector3();
    const secondMomentsOrigin = this._createSecondMomentObject();

    for (const item of valid) {
      const volume = Number(item.volume) || 0;
      const cg = this._vectorFromPlain(item.centroidLocal) || new THREE.Vector3();
      totalVolume += volume;
      centroid.addScaledVector(cg, volume);

      secondMomentsOrigin.xx += Number(item.secondMomentsOrigin?.xx) || 0;
      secondMomentsOrigin.xy += Number(item.secondMomentsOrigin?.xy) || 0;
      secondMomentsOrigin.xz += Number(item.secondMomentsOrigin?.xz) || 0;
      secondMomentsOrigin.yy += Number(item.secondMomentsOrigin?.yy) || 0;
      secondMomentsOrigin.yz += Number(item.secondMomentsOrigin?.yz) || 0;
      secondMomentsOrigin.zz += Number(item.secondMomentsOrigin?.zz) || 0;
    }

    centroid.divideScalar(totalVolume);
    const secondMomentsCentroid = this._shiftSecondMomentsToCentroid(secondMomentsOrigin, totalVolume, centroid);

    return {
      volume: totalVolume,
      centroidLocal: this._vectorToPlain(centroid),
      secondMomentsOrigin,
      secondMomentsCentroid,
      inertiaOrigin: this._inertiaFromSecondMoments(secondMomentsOrigin),
      inertiaCentroid: this._inertiaFromSecondMoments(secondMomentsCentroid),
    };
  }

  _createSecondMomentObject() {
    return { xx: 0, xy: 0, xz: 0, yy: 0, yz: 0, zz: 0 };
  }

  _vectorToPlain(vec) {
    if (!vec || !Number.isFinite(vec.x) || !Number.isFinite(vec.y) || !Number.isFinite(vec.z)) {
      return { x: 0, y: 0, z: 0 };
    }
    return { x: vec.x, y: vec.y, z: vec.z };
  }

  _vectorFromPlain(value) {
    if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.y) || !Number.isFinite(value.z)) return null;
    return new THREE.Vector3(value.x, value.y, value.z);
  }

  _resolveDensityHint(hint) {
    const direct = Number(hint?.densityKgM3);
    if (Number.isFinite(direct) && direct > 0) return direct;
    const profile = Number(hint?.profile?.density);
    return Number.isFinite(profile) && profile > 0 ? profile : null;
  }

  _shiftSecondMomentsToCentroid(secondMomentsOrigin, massOrVolume, centroid) {
    const c = centroid?.isVector3 ? centroid : this._vectorFromPlain(centroid) || new THREE.Vector3();
    const scalar = Number(massOrVolume) || 0;
    if (!scalar) return this._createSecondMomentObject();
    return {
      xx: secondMomentsOrigin.xx - scalar * c.x * c.x,
      xy: secondMomentsOrigin.xy - scalar * c.x * c.y,
      xz: secondMomentsOrigin.xz - scalar * c.x * c.z,
      yy: secondMomentsOrigin.yy - scalar * c.y * c.y,
      yz: secondMomentsOrigin.yz - scalar * c.y * c.z,
      zz: secondMomentsOrigin.zz - scalar * c.z * c.z,
    };
  }

  _inertiaFromSecondMoments(secondMoments) {
    if (!secondMoments) return this._createSecondMomentObject();
    return {
      xx: secondMoments.yy + secondMoments.zz,
      xy: -secondMoments.xy,
      xz: -secondMoments.xz,
      yy: secondMoments.xx + secondMoments.zz,
      yz: -secondMoments.yz,
      zz: secondMoments.xx + secondMoments.yy,
    };
  }
}
