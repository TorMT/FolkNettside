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

  function renderPolyhedra(snapPoints, atomPositions, scene, options = {}) {
    const showTetra = options.showTetra !== false;
    const showOcta = options.showOcta !== false;
    const structureType = options.structureType || '';
    const unitCellOnly = options.unitCellOnly === true;

    clearPolyhedra();
    initPolyhedraGroup(scene);

    let tetraCount = 0;
    let octaCount = 0;

    if (unitCellOnly) {
      const idealCenters = getIdealUnitCellHoleCenters(structureType);
      if (showTetra) {
        idealCenters.tetra.forEach(center => {
          drawTetrahedron(createIdealTetraVertices(center, atomPositions), center, scene);
          tetraCount += 1;
        });
      }
      if (showOcta) {
        idealCenters.octa.forEach(center => {
          drawOctahedron(createIdealOctaVertices(center, atomPositions), center, scene);
          octaCount += 1;
        });
      }
      return { tetraCount, octaCount };
    }

    if (showTetra) {
      const tetHoles = snapPoints.filter(sp => sp.kind === 'hole' && sp.holeType === 'tetrahedral');
      tetHoles.forEach(hole => {
        const vertices = Array.isArray(hole.coordinatingAtoms) && hole.coordinatingAtoms.length >= 4
          ? hole.coordinatingAtoms.slice(0, 4)
          : chooseNeighborShell(hole.pos, atomPositions, 4);
        const finalVertices = vertices.length >= 4 ? vertices : createIdealTetraVertices(hole.pos, atomPositions);
        drawTetrahedron(finalVertices, hole.pos, scene);
        tetraCount += 1;
      });
    }

    if (showOcta) {
      const octHoles = snapPoints.filter(sp => sp.kind === 'hole' && sp.holeType === 'octahedral');
      octHoles.forEach(hole => {
        const vertices = Array.isArray(hole.coordinatingAtoms) && hole.coordinatingAtoms.length >= 6
          ? hole.coordinatingAtoms.slice(0, 6)
          : chooseNeighborShell(hole.pos, atomPositions, 6);
        const finalVertices = vertices.length >= 6 ? vertices : createIdealOctaVertices(hole.pos, atomPositions);
        drawOctahedron(finalVertices, hole.pos, scene);
        octaCount += 1;
      });
    }

    return { tetraCount, octaCount };
  }

  function getIdealUnitCellHoleCenters(structureType) {
    if (structureType === 'fcc' || structureType === 'diamond' || structureType === 'nacl' || structureType === 'zns' || structureType === 'caf2' || structureType === 'spinel') {
      return {
        tetra: [
          new THREE.Vector3(0.25, 0.25, 0.25),
          new THREE.Vector3(0.25, 0.25, 0.75),
          new THREE.Vector3(0.25, 0.75, 0.25),
          new THREE.Vector3(0.25, 0.75, 0.75),
          new THREE.Vector3(0.75, 0.25, 0.25),
          new THREE.Vector3(0.75, 0.25, 0.75),
          new THREE.Vector3(0.75, 0.75, 0.25),
          new THREE.Vector3(0.75, 0.75, 0.75)
        ],
        octa: [
          new THREE.Vector3(0.5, 0.5, 0.5),
          new THREE.Vector3(0.5, 0.0, 0.0),
          new THREE.Vector3(0.5, 1.0, 0.0),
          new THREE.Vector3(0.5, 0.0, 1.0),
          new THREE.Vector3(0.5, 1.0, 1.0),
          new THREE.Vector3(0.0, 0.5, 0.0),
          new THREE.Vector3(1.0, 0.5, 0.0),
          new THREE.Vector3(0.0, 0.5, 1.0),
          new THREE.Vector3(1.0, 0.5, 1.0),
          new THREE.Vector3(0.0, 0.0, 0.5),
          new THREE.Vector3(1.0, 0.0, 0.5),
          new THREE.Vector3(0.0, 1.0, 0.5),
          new THREE.Vector3(1.0, 1.0, 0.5)
        ]
      };
    }
    if (structureType === 'sc') {
      return {
        tetra: [],
        octa: [new THREE.Vector3(0.5, 0.5, 0.5)]
      };
    }
    return { tetra: [], octa: [] };
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

  function chooseNeighborShell(pos, atomPositions, count) {
    const neighbors = findNearestAtoms(pos, atomPositions, Math.max(count * 3, count));
    if (neighbors.length < count) return [];

    const nearest = neighbors[0].dist;
    const shell = neighbors.filter(n => Math.abs(n.dist - nearest) <= Math.max(0.08, nearest * 0.12));
    if (shell.length >= count) {
      return shell.slice(0, count).map(n => n.pos);
    }

    const relaxed = neighbors.filter(n => n.dist <= nearest * 1.35);
    return relaxed.slice(0, count).map(n => n.pos);
  }

  function estimateHoleRadius(center, atomPositions, fallback = 0.22) {
    const nearest = findNearestAtoms(center, atomPositions, 1);
    if (!nearest.length) return fallback;
    return Math.max(0.12, nearest[0].dist * 0.42);
  }

  function createIdealTetraVertices(center, atomPositions) {
    const r = estimateHoleRadius(center, atomPositions, 0.22);
    const raw = [
      new THREE.Vector3( 1, 1, 1),
      new THREE.Vector3(-1,-1, 1),
      new THREE.Vector3(-1, 1,-1),
      new THREE.Vector3( 1,-1,-1)
    ];
    return raw.map(v => v.normalize().multiplyScalar(r).add(center.clone()));
  }

  function createIdealOctaVertices(center, atomPositions) {
    const r = estimateHoleRadius(center, atomPositions, 0.22);
    return [
      new THREE.Vector3(center.x, center.y, center.z + r),
      new THREE.Vector3(center.x + r, center.y, center.z),
      new THREE.Vector3(center.x, center.y + r, center.z),
      new THREE.Vector3(center.x - r, center.y, center.z),
      new THREE.Vector3(center.x, center.y - r, center.z),
      new THREE.Vector3(center.x, center.y, center.z - r)
    ];
  }

  function orderOctaVertices(vertices, center) {
    if (!Array.isArray(vertices) || vertices.length < 6) return vertices;
    const dirs = [
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, 0, -1)
    ];

    const used = new Set();
    return dirs.map(dir => {
      let bestIndex = -1;
      let bestScore = -Infinity;
      vertices.forEach((vertex, idx) => {
        if (used.has(idx)) return;
        const score = vertex.clone().sub(center).normalize().dot(dir);
        if (score > bestScore) {
          bestScore = score;
          bestIndex = idx;
        }
      });
      if (bestIndex >= 0) {
        used.add(bestIndex);
        return vertices[bestIndex];
      }
      return null;
    }).filter(Boolean);
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
      opacity: 0.95,
      depthTest: false,
      depthWrite: false
    });
    
    const line = new THREE.Mesh(geometry, material);
    line.position.copy(mid);
    line.renderOrder = 20;
    
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
      opacity: Math.max(opacity, 0.24),
      side: THREE.DoubleSide,
      roughness: 0.5,
      metalness: 0.08,
      depthTest: false,
      depthWrite: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 10;
    return mesh;
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
        const line = createLine(vertices[i], vertices[j], edgeColor, 0.018);
        polyhedraGroup.add(line);
        highlightedPolyhedra.push(line);
      }
    });
    
    // Draw center point (hole position)
    const centerSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 16, 16),
      new THREE.MeshStandardMaterial({
        color: edgeColor,
        emissive: edgeColor,
        emissiveIntensity: 0.7,
        transparent: true,
        opacity: 0.95,
        depthTest: false,
        depthWrite: false
      })
    );
    centerSphere.position.copy(center);
    centerSphere.renderOrder = 30;
    polyhedraGroup.add(centerSphere);
    highlightedPolyhedra.push(centerSphere);
    
    // Highlight the 4 vertices
    vertices.forEach(v => {
      const vertexSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 12, 12),
        new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          emissive: 0xf59e0b,
          emissiveIntensity: 0.25,
          transparent: true,
          opacity: 0.35,
          depthTest: false,
          depthWrite: false
        })
      );
      vertexSphere.position.copy(v);
      vertexSphere.renderOrder = 15;
      polyhedraGroup.add(vertexSphere);
      highlightedPolyhedra.push(vertexSphere);
    });
  }
  
  function drawOctahedron(vertices, center, scene) {
    if (!polyhedraGroup) initPolyhedraGroup(scene);
    vertices = orderOctaVertices(vertices, center);
    
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
        const line = createLine(vertices[i], vertices[j], edgeColor, 0.018);
        polyhedraGroup.add(line);
        highlightedPolyhedra.push(line);
      }
    });
    
    // Draw center point
    const centerSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 16, 16),
      new THREE.MeshStandardMaterial({
        color: edgeColor,
        emissive: edgeColor,
        emissiveIntensity: 0.7,
        transparent: true,
        opacity: 0.95,
        depthTest: false,
        depthWrite: false
      })
    );
    centerSphere.position.copy(center);
    centerSphere.renderOrder = 30;
    polyhedraGroup.add(centerSphere);
    highlightedPolyhedra.push(centerSphere);
    
    // Highlight vertices
    vertices.forEach(v => {
      const vertexSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 12, 12),
        new THREE.MeshStandardMaterial({
          color: 0x10b981,
          emissive: 0x10b981,
          emissiveIntensity: 0.25,
          transparent: true,
          opacity: 0.35,
          depthTest: false,
          depthWrite: false
        })
      );
      vertexSphere.position.copy(v);
      vertexSphere.renderOrder = 15;
      polyhedraGroup.add(vertexSphere);
      highlightedPolyhedra.push(vertexSphere);
    });
  }
  
  function showAllTetrahedralHoles(snapPoints, atomPositions, scene) {
    return renderPolyhedra(snapPoints, atomPositions, scene, { showTetra: true, showOcta: false }).tetraCount;
  }
  
  function showAllOctahedralHoles(snapPoints, atomPositions, scene) {
    return renderPolyhedra(snapPoints, atomPositions, scene, { showTetra: false, showOcta: true }).octaCount;
  }
  
  // Export to global scope
  window.PolyhedraModule = {
    renderPolyhedra,
    showAllTetrahedralHoles,
    showAllOctahedralHoles,
    clearPolyhedra,
    initPolyhedraGroup
  };
})();
