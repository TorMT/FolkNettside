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
    
    const unique = [];
    const seen = new Set();
    distances.forEach(d => {
      if (seen.has(d.idx)) return;
      seen.add(d.idx);
      unique.push(d);
    });
    
    return unique.slice(0, count);
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
  
  function createFaceMesh(vertices, triangles, color, opacity = 0.18) {
    const positions = [];
    triangles.forEach(([a, b, c]) => {
      const va = vertices[a];
      const vb = vertices[b];
      const vc = vertices[c];
      if (!va || !vb || !vc) return;
      positions.push(va.x, va.y, va.z, vb.x, vb.y, vb.z, vc.x, vc.y, vc.z);
    });
    
    if (positions.length === 0) return null;
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    
    const material = new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      roughness: 0.5,
      metalness: 0.08
    });
    
    return new THREE.Mesh(geometry, material);
  }
  
  function drawTetrahedron(vertices, center, scene) {
    if (!polyhedraGroup) initPolyhedraGroup(scene);
    
    // Draw edges (6 edges for tetrahedron)
    const edgePairs = [
      [0, 1], [0, 2], [0, 3],
      [1, 2], [1, 3], [2, 3]
    ];
    
    const edgeColor = 0xef4444;
    const face = createFaceMesh(vertices, [
      [0, 1, 2], [0, 1, 3], [0, 2, 3], [1, 2, 3]
    ], edgeColor, 0.16);
    if (face) {
      polyhedraGroup.add(face);
      highlightedPolyhedra.push(face);
    }
    
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
  
  function drawOctahedron(vertices, center, scene) {
    if (!polyhedraGroup) initPolyhedraGroup(scene);
    
    // Octahedron has 12 edges
    const edgePairs = [
      [0, 1], [0, 2], [0, 3], [0, 4],
      [5, 1], [5, 2], [5, 3], [5, 4],
      [1, 2], [2, 3], [3, 4], [4, 1]
    ];
    
    const edgeColor = 0x3b82f6;
    const face = createFaceMesh(vertices, [
      [0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 1],
      [5, 2, 1], [5, 3, 2], [5, 4, 3], [5, 1, 4]
    ], edgeColor, 0.14);
    if (face) {
      polyhedraGroup.add(face);
      highlightedPolyhedra.push(face);
    }
    
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
    
    let drawn = 0;
    tetHoles.forEach(hole => {
      const neighbors = findNearestAtoms(hole.pos, atomPositions, 4);
      if (neighbors.length >= 4) {
        const nearest = neighbors[0].dist;
        const filtered = neighbors.filter(n => n.dist <= nearest * 1.35);
        if (filtered.length < 4) return;
        drawTetrahedron(filtered.slice(0, 4).map(n => n.pos), hole.pos, scene);
        drawn += 1;
      }
    });
    
    return drawn;
  }
  
  function showAllOctahedralHoles(snapPoints, atomPositions, scene) {
    clearPolyhedra();
    initPolyhedraGroup(scene);
    
    const octHoles = snapPoints.filter(sp => sp.kind === 'hole' && sp.holeType === 'octahedral');
    
    let drawn = 0;
    octHoles.forEach(hole => {
      const neighbors = findNearestAtoms(hole.pos, atomPositions, 6);
      if (neighbors.length >= 6) {
        const nearest = neighbors[0].dist;
        const filtered = neighbors.filter(n => n.dist <= nearest * 1.35);
        if (filtered.length < 6) return;
        drawOctahedron(filtered.slice(0, 6).map(n => n.pos), hole.pos, scene);
        drawn += 1;
      }
    });
    
    return drawn;
  }
  
  // Export to global scope
  window.PolyhedraModule = {
    showAllTetrahedralHoles,
    showAllOctahedralHoles,
    clearPolyhedra,
    initPolyhedraGroup
  };
})();
