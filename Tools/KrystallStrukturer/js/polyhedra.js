// Polyhedra visualization - tetrahedral and octahedral holes
// This module adds tetrahedron and octahedron visualization to the crystal viewer

(function() {
  'use strict';
  
  let polyhedraGroup = null;
  let highlightedPolyhedra = [];
  
  function initPolyhedraGroup(scene) {
    if (!polyhedraGroup) {
      polyhedraGroup = new THREE.Group();
      scene.add(polyhedraGroup);
    }
    return polyhedraGroup;
  }
  
  function clearPolyhedra() {
    if (!polyhedraGroup) return;
    
    highlightedPolyhedra.forEach(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
    polyhedraGroup.clear();
    highlightedPolyhedra = [];
  }
  
  function findNearestAtoms(pos, atomPositions, count) {
    const distances = atomPositions
      .map((atomPos, idx) => ({ pos: atomPos, idx, dist: pos.distanceTo(atomPos) }))
      .filter(d => d.pos.x < 1e8) // Skip removed atoms
      .sort((a, b) => a.dist - b.dist);
    
    return distances.slice(0, count).map(d => d.pos);
  }
  
  function createLine(start, end, color, thickness = 0.05) {
    const dir = new THREE.Vector3().subVectors(end, start);
    const length = dir.length();
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    
    const geometry = new THREE.CylinderGeometry(thickness, thickness, length, 8);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.85
    });
    
    const line = new THREE.Mesh(geometry, material);
    line.position.copy(mid);
    
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.normalize()
    );
    line.setRotationFromQuaternion(quaternion);
    
    return line;
  }
  
  function drawTetrahedron(vertices, center, scene, atomPositions) {
    if (!polyhedraGroup) initPolyhedraGroup(scene);
    
    // Draw edges (6 edges for tetrahedron)
    const edgePairs = [
      [0, 1], [0, 2], [0, 3],
      [1, 2], [1, 3], [2, 3]
    ];
    
    const edgeColor = 0xef4444;
    
    edgePairs.forEach(([i, j]) => {
      if (vertices[i] && vertices[j]) {
        const line = createLine(vertices[i], vertices[j], edgeColor, 0.04);
        polyhedraGroup.add(line);
        highlightedPolyhedra.push(line);
      }
    });
    
    // Draw center point (hole position)
    const centerSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.10, 16, 16),
      new THREE.MeshStandardMaterial({
        color: edgeColor,
        emissive: edgeColor,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.8
      })
    );
    centerSphere.position.copy(center);
    polyhedraGroup.add(centerSphere);
    highlightedPolyhedra.push(centerSphere);
    
    // Highlight the 4 vertices
    vertices.forEach(v => {
      const vertexSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 16, 16),
        new THREE.MeshStandardMaterial({
          color: 0xffa500,
          emissive: 0xffa500,
          emissiveIntensity: 0.4,
          transparent: true,
          opacity: 0.7
        })
      );
      vertexSphere.position.copy(v);
      polyhedraGroup.add(vertexSphere);
      highlightedPolyhedra.push(vertexSphere);
    });
  }
  
  function drawOctahedron(vertices, center, scene, atomPositions) {
    if (!polyhedraGroup) initPolyhedraGroup(scene);
    
    // Octahedron has 12 edges
    const edgePairs = [
      [0, 1], [0, 2], [0, 3], [0, 4],
      [5, 1], [5, 2], [5, 3], [5, 4],
      [1, 2], [2, 3], [3, 4], [4, 1]
    ];
    
    const edgeColor = 0x3b82f6;
    
    edgePairs.forEach(([i, j]) => {
      if (vertices[i] && vertices[j]) {
        const line = createLine(vertices[i], vertices[j], edgeColor, 0.04);
        polyhedraGroup.add(line);
        highlightedPolyhedra.push(line);
      }
    });
    
    // Draw center point
    const centerSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.10, 16, 16),
      new THREE.MeshStandardMaterial({
        color: edgeColor,
        emissive: edgeColor,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.8
      })
    );
    centerSphere.position.copy(center);
    polyhedraGroup.add(centerSphere);
    highlightedPolyhedra.push(centerSphere);
    
    // Highlight vertices
    vertices.forEach(v => {
      const vertexSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 16, 16),
        new THREE.MeshStandardMaterial({
          color: 0x10b981,
          emissive: 0x10b981,
          emissiveIntensity: 0.4,
          transparent: true,
          opacity: 0.7
        })
      );
      vertexSphere.position.copy(v);
      polyhedraGroup.add(vertexSphere);
      highlightedPolyhedra.push(vertexSphere);
    });
  }
  
  function showAllTetrahedralHoles(snapPoints, atomPositions, scene) {
    clearPolyhedra();
    initPolyhedraGroup(scene);
    
    const tetHoles = snapPoints.filter(sp => sp.kind === 'hole' && sp.holeType === 'tetrahedral');
    
    tetHoles.forEach(hole => {
      const neighbors = findNearestAtoms(hole.pos, atomPositions, 4);
      if (neighbors.length >= 4) {
        drawTetrahedron(neighbors.slice(0, 4), hole.pos, scene, atomPositions);
      }
    });
  }
  
  function showAllOctahedralHoles(snapPoints, atomPositions, scene) {
    clearPolyhedra();
    initPolyhedraGroup(scene);
    
    const octHoles = snapPoints.filter(sp => sp.kind === 'hole' && sp.holeType === 'octahedral');
    
    octHoles.forEach(hole => {
      const neighbors = findNearestAtoms(hole.pos, atomPositions, 6);
      if (neighbors.length >= 6) {
        drawOctahedron(neighbors.slice(0, 6), hole.pos, scene, atomPositions);
      }
    });
  }
  
  // Export to global scope
  window.PolyhedraModule = {
    showAllTetrahedralHoles,
    showAllOctahedralHoles,
    clearPolyhedra,
    initPolyhedraGroup
  };
})();
