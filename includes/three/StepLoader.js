import * as THREE from "./three.module.js";

const OCCT_IMPORT_URL = "/includes/vendor/occt-import-js/occt-import-js.js";
const OCCT_WASM_BASE = "/includes/vendor/occt-import-js/";

export class StepLoader {
  constructor() {
    this._occtPromise = null;
  }

  prewarm() {
    return this._ensureOcctImport();
  }

  async parse(data, options = {}) {
    const occt = await this._ensureOcctImport();
    const format = String(options.format || "step").toLowerCase();
    const content = data instanceof Uint8Array ? data : new Uint8Array(data);
    const params = {
      linearUnit: options.linearUnit || "meter",
      linearDeflectionType: options.linearDeflectionType || "bounding_box_ratio",
      linearDeflection: Number.isFinite(options.linearDeflection) ? options.linearDeflection : 0.0015,
      angularDeflection: Number.isFinite(options.angularDeflection) ? options.angularDeflection : 0.5,
    };

    const result =
      format === "iges" || format === "igs"
        ? occt.ReadIgesFile(content, params)
        : occt.ReadStepFile(content, params);

    if (!result?.success) {
      throw new Error(this._readFailureReason(result, format));
    }

    const components = this._buildComponents(result);
    if (!components.length) {
      throw new Error(`Fant ingen triangulert geometri i ${format.toUpperCase()}-fila.`);
    }
    return components;
  }

  async _ensureOcctImport() {
    if (this._occtPromise) return this._occtPromise;

    this._occtPromise = new Promise((resolve, reject) => {
      const boot = () => {
        if (typeof window.occtimportjs !== "function") {
          reject(new Error("occt-import-js ble ikke eksponert på window."));
          return;
        }
        window.occtimportjs({
          locateFile: (file) => `${OCCT_WASM_BASE}${file}`,
        }).then(resolve).catch(reject);
      };

      if (typeof window.occtimportjs === "function") {
        boot();
        return;
      }

      const existing = document.querySelector(`script[data-occt-import="1"]`);
      if (existing) {
        existing.addEventListener("load", boot, { once: true });
        existing.addEventListener("error", () => reject(new Error("Kunne ikke laste occt-import-js.")), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = OCCT_IMPORT_URL;
      script.async = true;
      script.dataset.occtImport = "1";
      script.onload = boot;
      script.onerror = () => reject(new Error("Kunne ikke laste occt-import-js."));
      document.head.appendChild(script);
    });

    return this._occtPromise;
  }

  _readFailureReason(result, format) {
    if (!result || typeof result !== "object") {
      return `Kunne ikke lese ${format.toUpperCase()}-fila.`;
    }
    const reason =
      result.reason ||
      result.error ||
      result.message ||
      result.status ||
      result.exception ||
      "";
    return reason
      ? `Kunne ikke lese ${format.toUpperCase()}-fila: ${reason}`
      : `Kunne ikke lese ${format.toUpperCase()}-fila.`;
  }

  _buildComponents(result) {
    const meshes = Array.isArray(result?.meshes) ? result.meshes : [];
    const meshPaths = new Map();
    this._walkNode(result?.root, [], meshPaths);

    const seenNames = new Map();
    const components = [];

    meshes.forEach((meshDef, index) => {
      const geometry = this._meshToGeometry(meshDef);
      if (!geometry) return;

      const path = meshPaths.get(index) || [];
      const baseName = this._resolveComponentName(meshDef, path, index);
      const name = this._uniqueName(baseName, seenNames);
      const color = this._parseColor(meshDef?.color);

      geometry.userData = {
        ...(geometry.userData || {}),
        sourceName: this._cleanName(meshDef?.name),
        nodePath: path.join(" / "),
        brepFaces: Array.isArray(meshDef?.brep_faces) ? meshDef.brep_faces.length : 0,
      };

      components.push({
        name,
        geometry,
        color,
        userData: {
          nodePath: path.join(" / "),
          brepFaces: Array.isArray(meshDef?.brep_faces) ? meshDef.brep_faces.length : 0,
          sourceName: this._cleanName(meshDef?.name),
        },
      });
    });

    return components;
  }

  _walkNode(node, parentPath, meshPaths) {
    if (!node || typeof node !== "object") return;
    const name = this._cleanName(node.name);
    const nextPath = name ? [...parentPath, name] : parentPath.slice();

    const meshRefs = Array.isArray(node.meshes) ? node.meshes : [];
    meshRefs.forEach((meshIndex) => {
      if (!Number.isInteger(meshIndex) || meshIndex < 0 || meshPaths.has(meshIndex)) return;
      meshPaths.set(meshIndex, nextPath);
    });

    const children = Array.isArray(node.children) ? node.children : [];
    children.forEach((child) => this._walkNode(child, nextPath, meshPaths));
  }

  _meshToGeometry(meshDef) {
    const positions = meshDef?.attributes?.position?.array;
    if (!Array.isArray(positions) && !(positions instanceof Float32Array) && !(positions instanceof ArrayBuffer)) {
      return null;
    }

    const positionArray =
      positions instanceof Float32Array
        ? positions
        : positions instanceof ArrayBuffer
          ? new Float32Array(positions)
          : Float32Array.from(positions);

    if (!positionArray.length) return null;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positionArray, 3));

    const normals = meshDef?.attributes?.normal?.array;
    if (normals) {
      const normalArray =
        normals instanceof Float32Array
          ? normals
          : normals instanceof ArrayBuffer
            ? new Float32Array(normals)
            : Float32Array.from(normals);
      if (normalArray.length) {
        geometry.setAttribute("normal", new THREE.BufferAttribute(normalArray, 3));
      }
    }

    const indices = meshDef?.index?.array;
    if (indices && (Array.isArray(indices) || ArrayBuffer.isView(indices))) {
      let maxIndex = 0;
      for (let i = 0; i < indices.length; i++) {
        maxIndex = Math.max(maxIndex, Number(indices[i]) || 0);
      }
      const indexArray = maxIndex > 65535 ? Uint32Array.from(indices) : Uint16Array.from(indices);
      geometry.setIndex(new THREE.BufferAttribute(indexArray, 1));
    }

    if (!geometry.getAttribute("normal")) {
      geometry.computeVertexNormals();
    }
    geometry.computeBoundingBox();
    return geometry;
  }

  _resolveComponentName(meshDef, path, index) {
    const directName = this._cleanName(meshDef?.name);
    if (directName) return directName;
    const fromPath = [...(path || [])].reverse().find(Boolean);
    return fromPath || `CAD komponent ${index + 1}`;
  }

  _cleanName(value) {
    const text = String(value || "")
      .replace(/\0/g, "")
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) return "";
    if (/^(unnamed|unknown|null|shape)$/i.test(text)) return "";
    return text;
  }

  _uniqueName(baseName, seenNames) {
    const base = this._cleanName(baseName) || "CAD komponent";
    const count = (seenNames.get(base) || 0) + 1;
    seenNames.set(base, count);
    return count === 1 ? base : `${base} (${count})`;
  }

  _parseColor(colorValue) {
    if (!Array.isArray(colorValue) || colorValue.length < 3) return null;
    const raw = colorValue.slice(0, 3).map((value) => Number(value) || 0);
    const scale = raw.some((value) => value > 1) ? 255 : 1;
    return new THREE.Color(raw[0] / scale, raw[1] / scale, raw[2] / scale);
  }
}
