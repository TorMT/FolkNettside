// Advanced structure analyzer
// Analyzes crystal structures and identifies materials including alloys like carbon steel

(function() {
  'use strict';
  
  const COMMON_CRYSTALS = [
    { key: 'fcc', name: 'FCC (Face-Centered Cubic)', structures: ['fcc'], cn: 12, atomTypes: [1], examples: 'Typisk: Cu, Al, Ni, Ag, Au' },
    { key: 'bcc', name: 'BCC (Body-Centered Cubic)', structures: ['bcc'], cn: 8, atomTypes: [1], examples: 'Typisk: α-Fe, Cr, W, Mo' },
    { key: 'sc', name: 'SC (Simple Cubic)', structures: ['sc'], cn: 6, atomTypes: [1], examples: 'Sjeldent: Po' },
    { key: 'diamond', name: 'Diamond-struktur', structures: ['diamond'], cn: 4, atomTypes: [1, 2], examples: 'Typisk: C (diamant), Si, Ge' },
    { key: 'nacl', name: 'NaCl (Rock Salt)', structures: ['nacl'], cn: 6, atomTypes: [2], ratio: [1, 1], examples: 'Typisk: NaCl, MgO, CaO' },
    { key: 'cscl', name: 'CsCl', structures: ['cscl'], cn: 8, atomTypes: [2], ratio: [1, 1], examples: 'Typisk: CsCl, CsBr' },
    { key: 'zns', name: 'ZnS (Zinc Blende)', structures: ['zns'], cn: 4, atomTypes: [2], ratio: [1, 1], examples: 'Typisk: ZnS, GaAs, InP' },
    { key: 'caf2', name: 'CaF₂ (Fluorite)', structures: ['caf2'], cn: 8, atomTypes: [2], ratio: [1, 2], examples: 'Typisk: CaF₂, UO₂' },
    { key: 'spinel', name: 'Spinel-type', structures: ['spinel'], cn: null, atomTypes: [3, 4], examples: 'Typisk: MgAl₂O₄, Fe₃O₄' }
  ];
  
  function analyzeStructure(atomPositions, atomMeshes, manualAtoms, placedDefects, selectedStructure) {
    const result = {
      type: "Ukjent",
      confidence: 0,
      details: [],
      warnings: []
    };
    
    // Count active atoms
    const activeAtoms = atomPositions.filter(pos => pos.x < 1e8);
    if (activeAtoms.length === 0) {
      result.details.push("Ingen atomer i strukturen");
      return result;
    }
    
    // Analyze coordination
    const coordination = analyzeCoordination(activeAtoms);
    const avgCN = coordination.average;
    const modeCN = parseInt(coordination.mode);
    
    result.details.push(`Koordinasjonstall: ${modeCN} (gjennomsnitt: ${avgCN.toFixed(1)})`);
    
    // Count atom types from mesh colors
    const atomTypes = countAtomTypes(atomMeshes, atomPositions);
    result.details.push(`Atomtyper: ${atomTypes.count}`);
    
    const defectSummary = summarizePlacedDefects(placedDefects);
    if (defectSummary.total > 0) {
      result.details.push(`Defekter: ${JSON.stringify(defectSummary.types)}`);
    }
    
    const match = matchCommonCrystal({
      selectedStructure,
      modeCN,
      avgCN,
      atomTypeCount: atomTypes.count,
      distribution: atomTypes.distribution
    });
    if (match) {
      result.type = match.name;
      result.confidence = Math.max(result.confidence, match.confidence);
      if (match.examples) result.details.push(match.examples);
    }
    
    // Check for manual atoms
    if (manualAtoms && manualAtoms.length > 0) {
      const manualTypeCounts = {};
      manualAtoms.forEach(atom => {
        const type = atom.atomType;
        manualTypeCounts[type] = (manualTypeCounts[type] || 0) + 1;
      });
      
      result.details.push(`Manuelt plassert: ${JSON.stringify(manualTypeCounts)}`);
      const placementSummary = summarizeManualPlacement(manualAtoms, activeAtoms);
      if (placementSummary.total > 0) {
        result.details.push(`Plasseringsmønster: interstitial=${placementSummary.interstitial}, substitutional=${placementSummary.substitutional}`);
      }
      
      // Detect iron carbide / cementite Fe3C
      if (manualTypeCounts.fe && manualTypeCounts.c) {
        const totalFe = manualTypeCounts.fe || 0;
        const totalC = manualTypeCounts.c || 0;
        const total = totalFe + totalC;
        const ratioFeToC = totalC > 0 ? totalFe / totalC : Infinity;
        const fe3cLike = total >= 4 && Math.abs(ratioFeToC - 3) <= 0.35;
        if (fe3cLike) {
          const cPlacement = placementSummary.byType.c || { interstitial: 0, substitutional: 0 };
          const cInterstitialShare = (cPlacement.interstitial + cPlacement.substitutional) > 0
            ? cPlacement.interstitial / (cPlacement.interstitial + cPlacement.substitutional)
            : 0;
          if (cInterstitialShare >= 0.55) {
            result.type = "Jernkarbid (Fe₃C / Cementitt)";
            result.confidence = 95;
            result.details.push(`Fe:C ≈ ${totalFe}:${totalC}`);
            result.details.push("Sammensetning + plassering matcher Fe₃C (karbon i interstitial-lignende posisjoner)");
          } else {
            result.type = "Fe-C legering (Fe₃C-forhold)";
            result.confidence = 78;
            result.details.push(`Fe:C ≈ ${totalFe}:${totalC}`);
            result.warnings.push("Forholdet ligner Fe₃C, men plassering av C matcher ikke tydelig cementitt");
          }
          return result;
        }
      }
      
      // Detect carbon steel
      if (manualTypeCounts.fe && manualTypeCounts.c) {
        const totalFe = manualTypeCounts.fe || 0;
        const totalC = manualTypeCounts.c || 0;
        const carbonPercent = (totalC / (totalFe + totalC)) * 100;
        
        if (carbonPercent < 0.1) {
          result.type = "Jern (nesten rent)";
          result.confidence = 85;
          result.warnings.push(`Meget lite karbon (${carbonPercent.toFixed(2)}%)`);
        } else if (carbonPercent < 2.1) {
          result.type = "Karbonstål";
          result.confidence = 90;
          result.details.push(`~${carbonPercent.toFixed(2)}% karbon`);
          
          if (carbonPercent < 0.3) {
            result.details.push("Lavkarbonstål (myk)");
          } else if (carbonPercent < 0.6) {
            result.details.push("Mellomkarbonstål");
          } else {
            result.details.push("Høykarbonstål (hard)");
          }
        } else {
          result.type = "Støpejern";
          result.confidence = 85;
          result.details.push(`~${carbonPercent.toFixed(2)}% karbon`);
        }
        
        return result;
      }
      
      // Detect stainless steel
      if (manualTypeCounts.fe && manualTypeCounts.cr) {
        const totalFe = manualTypeCounts.fe || 0;
        const totalCr = manualTypeCounts.cr || 0;
        const crPercent = (totalCr / (totalFe + totalCr)) * 100;
        
        if (crPercent > 10) {
          result.type = "Rustfritt stål";
          result.confidence = 88;
          result.details.push(`~${crPercent.toFixed(1)}% krom`);
          
          if (manualTypeCounts.ni) {
            result.details.push("Mulig austenittisk (18/8 eller 18/10)");
          }
        }
        
        return result;
      }
    }
    
    // Identify based on CN and atom count (fallback)
    if (result.confidence < 75 && atomTypes.count === 1) {
      if (modeCN === 12) {
        result.type = "FCC (Face-Centered Cubic)";
        result.confidence = 90;
        result.details.push("Typisk: Cu, Al, Ni, Ag, Au, Pb");
      } else if (modeCN === 8) {
        result.type = "BCC (Body-Centered Cubic)";
        result.confidence = 90;
        result.details.push("Typisk: α-Fe, Cr, W, Mo");
      } else if (modeCN === 6) {
        result.type = "SC (Simple Cubic)";
        result.confidence = 75;
        result.details.push("Sjeldent i rene metaller");
      } else if (modeCN === 4) {
        result.type = "Diamond eller Tetraedrisk";
        result.confidence = 85;
        result.details.push("Typisk: Si, Ge, C (diamant)");
      }
    } else if (result.confidence < 75 && atomTypes.count === 2) {
      const ratio = calculateAtomRatio(atomTypes.distribution);
      
      if (modeCN === 6 && ratio.close(1, 1)) {
        result.type = "NaCl (Rock Salt)";
        result.confidence = 85;
        result.details.push("Typisk: NaCl, MgO, CaO");
      } else if (modeCN === 8 && ratio.close(1, 1)) {
        result.type = "CsCl (Cesium Chloride)";
        result.confidence = 85;
        result.details.push("Typisk: CsCl, CsBr");
      } else if (modeCN === 4 && ratio.close(1, 1)) {
        result.type = "ZnS (Zinc Blende)";
        result.confidence = 85;
        result.details.push("Typisk: ZnS, GaAs, InP");
      } else if (ratio.close(1, 2)) {
        result.type = "CaF₂ (Fluorite)";
        result.confidence = 80;
        result.details.push("Typisk: CaF₂, UO₂");
      }
    } else if (result.confidence < 75 && atomTypes.count >= 3) {
      result.type = "Kompleks struktur (Spinel-type?)";
      result.confidence = 60;
      result.details.push("3+ atomtyper, mulig oksid");
    }
    
    // Check for defects
    const vacancies = atomPositions.filter(pos => pos.x > 1e8).length;
    if (vacancies > 0) {
      result.warnings.push(`${vacancies} vacancies detektert`);
      result.confidence = Math.max(50, result.confidence - 10);
    }
    
    return result;
  }
  
  function analyzeCoordination(atoms) {
    const coordinations = [];
    
    atoms.forEach((atom, i) => {
      const dists = [];
      atoms.forEach((other, j) => {
        if (i === j) return;
        const dist = atom.distanceTo(other);
        if (dist > 1e-8) dists.push(dist);
      });
      dists.sort((a, b) => a - b);
      if (dists.length === 0) {
        coordinations.push(0);
        return;
      }
      
      const firstShell = detectFirstShellCutoff(dists);
      let neighbors = 0;
      dists.forEach(d => {
        if (d <= firstShell) neighbors++;
      });
      
      coordinations.push(neighbors);
    });
    
    // Calculate distribution
    const cnMap = {};
    coordinations.forEach(cn => {
      cnMap[cn] = (cnMap[cn] || 0) + 1;
    });
    
    return {
      values: coordinations,
      distribution: cnMap,
      average: coordinations.reduce((a, b) => a + b, 0) / coordinations.length,
      mode: Object.keys(cnMap).reduce((a, b) => cnMap[a] > cnMap[b] ? a : b)
    };
  }
  
  function detectFirstShellCutoff(sortedDistances) {
    const nearest = sortedDistances[0];
    let cutoff = nearest * 1.28;
    
    for (let i = 1; i < sortedDistances.length; i++) {
      const prev = sortedDistances[i - 1];
      const curr = sortedDistances[i];
      if (curr / prev > 1.20) {
        cutoff = prev * 1.05;
        break;
      }
    }
    
    return cutoff;
  }
  
  function countAtomTypes(atomMeshes, atomPositions) {
    const colorMap = {};
    
    atomMeshes.forEach((mesh, idx) => {
      if (!atomPositions[idx] || atomPositions[idx].x > 1e8) return; // Skip removed
      if (!mesh || !mesh.material || !mesh.material.color) return;
      
      const colorHex = mesh.material.color.getHexString();
      colorMap[colorHex] = (colorMap[colorHex] || 0) + 1;
    });
    
    return {
      count: Object.keys(colorMap).length,
      distribution: colorMap
    };
  }
  
  function calculateAtomRatio(distribution) {
    const counts = Object.values(distribution);
    if (counts.length < 2) return { close: () => false };
    
    counts.sort((a, b) => a - b);
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    const divisor = counts.reduce(gcd);
    const ratio = counts.map(c => c / divisor);
    
    return {
      ratio,
      close: (a, b) => {
        const tolerance = 0.15;
        if (ratio.length !== 2) return false;
        return Math.abs(ratio[0] / a - ratio[1] / b) < tolerance;
      }
    };
  }
  
  function summarizePlacedDefects(placedDefects) {
    const summary = { total: 0, types: {} };
    if (!placedDefects || typeof placedDefects.forEach !== 'function') return summary;
    
    placedDefects.forEach(defect => {
      if (!defect || !defect.geometry) return;
      summary.total += 1;
      const radius = defect.geometry.parameters && defect.geometry.parameters.radius;
      let type = 'ukjent';
      if (radius >= 0.155) type = 'dopant';
      else if (radius >= 0.125) type = 'interstitial';
      else if (radius >= 0.095) type = 'carrier';
      summary.types[type] = (summary.types[type] || 0) + 1;
    });
    
    return summary;
  }
  
  function summarizeManualPlacement(manualAtoms, baseAtoms) {
    const summary = { total: 0, interstitial: 0, substitutional: 0, byType: {} };
    if (!manualAtoms || manualAtoms.length === 0 || !baseAtoms || baseAtoms.length === 0) return summary;
    
    manualAtoms.forEach(atom => {
      if (!atom || !atom.position) return;
      let minDist = Infinity;
      baseAtoms.forEach(base => {
        const d = atom.position.distanceTo(base);
        if (d < minDist) minDist = d;
      });
      const type = atom.atomType || 'unknown';
      if (!summary.byType[type]) summary.byType[type] = { interstitial: 0, substitutional: 0 };
      
      // Near atom-site => substitutional, otherwise likely interstitial
      if (minDist <= 0.20) {
        summary.substitutional += 1;
        summary.byType[type].substitutional += 1;
      } else {
        summary.interstitial += 1;
        summary.byType[type].interstitial += 1;
      }
      summary.total += 1;
    });
    
    return summary;
  }
  
  function matchCommonCrystal({ selectedStructure, modeCN, avgCN, atomTypeCount, distribution }) {
    const ratio = calculateAtomRatio(distribution);
    const candidates = COMMON_CRYSTALS.filter(c => {
      const structureMatch = selectedStructure && c.structures && c.structures.includes(selectedStructure);
      if (selectedStructure && c.structures && c.structures.length > 0 && !structureMatch) return false;
      if (!c.atomTypes.includes(atomTypeCount)) return false;
      if (!structureMatch && c.cn !== null && Math.abs(modeCN - c.cn) > 2 && Math.abs(avgCN - c.cn) > 2.5) return false;
      if (c.ratio && !ratio.close(c.ratio[0], c.ratio[1])) return false;
      return true;
    });
    
    if (candidates.length === 0) return null;
    const best = candidates[0];
    let confidence = 70;
    if (best.cn !== null) {
      confidence += Math.max(0, 20 - Math.abs(modeCN - best.cn) * 7);
    }
    if (selectedStructure && best.structures.includes(selectedStructure)) confidence += 10;
    return {
      ...best,
      confidence: Math.min(98, Math.round(confidence))
    };
  }
  
  // Export to global scope
  window.StructureAnalyzer = {
    analyzeStructure
  };
})();
