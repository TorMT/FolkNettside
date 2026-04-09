// /includes/three/FusionArchiveLoader.js
// Loader for Fusion 360 Archive (.3fz) files (ZIP with multiple 3MFs)
// Gjenbruker ThreeMFLoader for å hente ut alle komponenter fra hver 3MF

import { ThreeMFLoader } from "./ThreeMFLoader.js?v=20260409j";

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

  async load(url) {
    await ensureJsZip();
    // Fetch .3fz file
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
    if (!threeMFfiles.length) throw new Error('Ingen 3MF-filer funnet i .3fz-arkivet');

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
        return comps;
      }
      if (comps) {
        return [{ name: file.name, geometry: comps }];
      }
      return [];
    }));
    return allComponents.flat();
  }
}

export { FusionArchiveLoader };
