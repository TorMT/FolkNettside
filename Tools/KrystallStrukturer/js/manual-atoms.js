// Manual atom placement module
// Allows users to manually place atoms and build custom structures

(function() {
  'use strict';
  
  let manualAtomsGroup = null;
  let manualAtoms = [];
  
  // Atom properties database
  const atomProperties = {
    fe: { name: 'Fe (Jern)', color: 0x8b7355, radius: 0.24 },
    c: { name: 'C (Karbon)', color: 0x2d2d2d, radius: 0.17 },
    cr: { name: 'Cr (Krom)', color: 0x8a8a8a, radius: 0.25 },
    ni: { name: 'Ni (Nikkel)', color: 0x8f8f8f, radius: 0.24 },
    cu: { name: 'Cu (Kobber)', color: 0xb87333, radius: 0.25 },
    al: { name: 'Al (Aluminium)', color: 0xa0a0a0, radius: 0.26 },
    o: { name: 'O (Oksygen)', color: 0xff0000, radius: 0.22 },
    custom: { name: 'Custom', color: 0x3b82f6, radius: 0.25 }
  };
  
  function initManualAtomsGroup(scene) {
    if (!manualAtomsGroup) {
      manualAtomsGroup = new THREE.Group();
      scene.add(manualAtomsGroup);
    }
    return manualAtomsGroup;
  }
  
  function addManualAtom(position, atomType, customColor, customRadius, scene) {
    if (!manualAtomsGroup) initManualAtomsGroup(scene);
    
    const props = atomProperties[atomType] || atomProperties.custom;
    const color = customColor !== undefined ? customColor : props.color;
    const radius = customRadius !== undefined ? customRadius : props.radius;
    
    const geometry = new THREE.SphereGeometry(radius, 24, 24);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.4,
      metalness: 0.2,
      emissive: color,
      emissiveIntensity: 0.15
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Store metadata
    mesh.userData = {
      atomType,
      isManual: true,
      color,
      radius
    };
    
    manualAtomsGroup.add(mesh);
    manualAtoms.push({
      mesh,
      position: position.clone(),
      atomType,
      color,
      radius
    });
    
    return mesh;
  }
  
  function clearManualAtoms() {
    if (!manualAtomsGroup) return;
    
    manualAtoms.forEach(atom => {
      manualAtomsGroup.remove(atom.mesh);
      if (atom.mesh.geometry) atom.mesh.geometry.dispose();
      if (atom.mesh.material) atom.mesh.material.dispose();
    });
    
    manualAtoms = [];
  }
  
  function getManualAtoms() {
    return manualAtoms.map(atom => ({
      position: atom.position.clone(),
      atomType: atom.atomType,
      color: atom.color,
      radius: atom.radius
    }));
  }
  
  function getAtomTypeCounts() {
    const counts = {};
    manualAtoms.forEach(atom => {
      const type = atom.atomType;
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }
  
  // Export to global scope
  window.ManualAtomsModule = {
    addManualAtom,
    clearManualAtoms,
    getManualAtoms,
    getAtomTypeCounts,
    atomProperties,
    initManualAtomsGroup
  };
})();
