// /includes/three/FusionArchiveLoader.js
// Loader for Fusion 360 Archive (.3fz) files (ZIP with multiple 3MFs)
// Gjenbruker ThreeMFLoader for å hente ut alle komponenter fra hver 3MF

import { ThreeMFLoader } from "./ThreeMFLoader.js";

class FusionArchiveLoader {
  constructor() {
    this.threeMFLoader = new ThreeMFLoader();
  }

  async load(url) {
    // Dynamically load JSZip if needed
    if (typeof JSZip === 'undefined') {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/includes/three/jszip.min.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load JSZip'));
        document.head.appendChild(script);
      });
    }
    // Fetch .3fz file
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} ved lasting av ${url}`);
    const buf = await res.arrayBuffer();
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(buf);

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
    const allComponents = [];
    for (const file of threeMFfiles) {
      const xmlText = await file.async('text');
      const comps = this.threeMFLoader._parse3MFXML(xmlText);
      if (Array.isArray(comps)) {
        allComponents.push(...comps);
      } else if (comps) {
        allComponents.push({ name: file.name, geometry: comps });
      }
    }
    return allComponents;
  }
}

export { FusionArchiveLoader };