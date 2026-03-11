// Advanced structure analyzer
// Analyzes crystal structures and identifies materials including alloys like carbon steel

(function() {
  'use strict';
  
  function analyzeStructure(atomPositions, atomMeshes, manualAtoms, placedDefects) {
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
    
    // Check for manual atoms
    if (manualAtoms && manualAtoms.length > 0) {
      const manualTypeCounts = {};
      manualAtoms.forEach(atom => {
        const type = atom.atomType;
        manualTypeCounts[type] = (manualTypeCounts[type] || 0) + 1;
      });
      
      result.details.push(`Manuelt plassert: ${JSON.stringify(manualTypeCounts)}`);
      
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
    
    // Identify based on CN and atom count
    if (atomTypes.count === 1) {
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
    } else if (atomTypes.count === 2) {
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
    } else if (atomTypes.count >= 3) {
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
  
  function analyzeCoordination(atoms, maxDist = 1.3) {
    const coordinations = [];
    
    atoms.forEach((atom, i) => {
      let neighbors = 0;
      
      atoms.forEach((other, j) => {
        if (i !== j) {
          const dist = atom.distanceTo(other);
          if (dist < maxDist) {
            neighbors++;
          }
        }
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
  
  function countAtomTypes(atomMeshes, atomPositions) {
    const colorMap = {};
    
    atomMeshes.forEach((mesh, idx) => {
      if (atomPositions[idx].x > 1e8) return; // Skip removed
      
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
  
  // Export to global scope
  window.StructureAnalyzer = {
    analyzeStructure
  };
})();
