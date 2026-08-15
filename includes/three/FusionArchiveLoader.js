// /includes/three/FusionArchiveLoader.js
// Loader for Fusion archive files (.f3z/.3fz) (ZIP with one or more Fusion payload files)
// Gjenbruker ThreeMFLoader for å hente ut alle komponenter fra hver 3MF

import { ThreeMFLoader } from "./ThreeMFLoader.js?v=20260527a";

let jsZipBootPromise = null;

function ensureJsZip() {
  if (typeof JSZip !== "undefined") {
    return Promise.resolve(JSZip);
  }
  if (jsZipBootPromise) {
    return jsZipBootPromise;
  }
  jsZipBootPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-jszip-loader="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(JSZip), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load JSZip")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "/includes/three/jszip.min.js";
    script.dataset.jszipLoader = "1";
    script.onload = () => resolve(JSZip);
    script.onerror = () => reject(new Error("Failed to load JSZip"));
    document.head.appendChild(script);
  }).catch((error) => {
    jsZipBootPromise = null;
    throw error;
  });
  return jsZipBootPromise;
}

class FusionArchiveLoader {
  constructor() {
    this.threeMFLoader = new ThreeMFLoader();
  }

  _basename(path) {
    const value = String(path || "");
    if (!value) return "";
    const parts = value.split(/[\\/]/).filter(Boolean);
    return parts.length ? parts[parts.length - 1] : value;
  }

  _annotateComponent(component, file, index = 0) {
    if (!component) return null;
    const archiveEntry = String(file?.name || "").trim();
    const sourceName = this._basename(archiveEntry) || `3mf-${index + 1}`;
    const componentName = String(
      component?.name ||
      component?.userData?.componentName ||
      component?.userData?.partNumber ||
      component?.userData?.objectId ||
      sourceName ||
      `component-${index + 1}`
    ).trim() || `component-${index + 1}`;
    const rawNodePath = String(component?.userData?.nodePath || componentName).trim();
    const nodePath = rawNodePath
      ? (archiveEntry && !rawNodePath.startsWith(`${archiveEntry}::`) ? `${archiveEntry}::${rawNodePath}` : rawNodePath)
      : `${archiveEntry}::${componentName}`;
    return {
      ...component,
      name: componentName,
      userData: {
        ...(component?.userData || {}),
        componentName,
        sourceName,
        archiveEntry,
        nodePath,
      },
    };
  }

  async load(url) {
    await ensureJsZip();
    // Fetch .f3z/.3fz file
    const res = await fetch(url, { cache: "default" });
    if (!res.ok) throw new Error(`HTTP ${res.status} ved lasting av ${url}`);
    return this.parse(await res.arrayBuffer());
  }

  async parse(data) {
    await ensureJsZip();
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(data);

    // Find all 3MF files in archive
    const threeMFfiles = Object.values(zipContent.files).filter(f => f.name.toLowerCase().endsWith('.3mf'));
    if (!threeMFfiles.length) throw new Error('Ingen 3MF-filer funnet i .f3z/.3fz-arkivet');

    // Parse manifest if present (for navn/hierarki)
    let manifest = null;
    const manifestFile = zipContent.file('manifest.json') || zipContent.file('manifest.xml');
    if (manifestFile) {
      manifest = await manifestFile.async('text');
      // TODO: parse manifest for navn/hierarki hvis ønskelig
    }

    // Parse alle 3MF-filer og hent ut komponenter
    const allComponents = await Promise.all(threeMFfiles.map(async (file) => {
      const xmlText = await file.async('text');
      const comps = this.threeMFLoader._parse3MFXML(xmlText);
      if (Array.isArray(comps)) {
        return comps.map((component, index) => this._annotateComponent(component, file, index)).filter(Boolean);
      }
      if (comps) {
        return [this._annotateComponent({ name: this._basename(file.name), geometry: comps, userData: {} }, file, 0)];
      }
      return [];
    }));
    return allComponents.flat();
  }
}

export { FusionArchiveLoader };
