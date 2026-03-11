// Measurement tool with snap functionality
// Allows users to measure distances between atoms with visual feedback

(function() {
  'use strict';
  
  let measurementGroup = null;
  let measurements = [];
  let measurementPoints = [];
  let isActive = false;
  
  function initMeasurementGroup(scene) {
    if (!measurementGroup) {
      measurementGroup = new THREE.Group();
      scene.add(measurementGroup);
    }
    return measurementGroup;
  }
  
  function setActive(active) {
    isActive = active;
    if (!active) {
      measurementPoints = [];
    }
  }
  
  function createMeasurementLine(start, end, distance) {
    const dir = new THREE.Vector3().subVectors(end, start);
    const length = dir.length();
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    
    // Line
    const geometry = new THREE.CylinderGeometry(0.02, 0.02, length, 8);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0xffaa00,
      emissiveIntensity: 0.5
    });
    
    const line = new THREE.Mesh(geometry, material);
    line.position.copy(mid);
    
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.normalize()
    );
    line.setRotationFromQuaternion(quaternion);
    
    // Start marker
    const startMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 16, 16),
      new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        emissive: 0x00ff00,
        emissiveIntensity: 0.6
      })
    );
    startMarker.position.copy(start);
    
    // End marker
    const endMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 16, 16),
      new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.6
      })
    );
    endMarker.position.copy(end);
    
    return {
      line,
      startMarker,
      endMarker,
      distance,
      start: start.clone(),
      end: end.clone()
    };
  }
  
  function addMeasurement(start, end, scene) {
    if (!measurementGroup) initMeasurementGroup(scene);
    
    const distance = start.distanceTo(end);
    const measurement = createMeasurementLine(start, end, distance);
    
    measurementGroup.add(measurement.line);
    measurementGroup.add(measurement.startMarker);
    measurementGroup.add(measurement.endMarker);
    
    measurements.push(measurement);
    
    return {
      distance,
      start,
      end,
      index: measurements.length - 1
    };
  }
  
  function handleClick(snapPoint, scene) {
    if (!isActive) return null;
    
    measurementPoints.push(snapPoint.pos.clone());
    
    if (measurementPoints.length === 2) {
      const result = addMeasurement(measurementPoints[0], measurementPoints[1], scene);
      measurementPoints = []; // Reset for next measurement
      return result;
    }
    
    return null;
  }
  
  function clearAllMeasurements() {
    if (!measurementGroup) return;
    
    measurements.forEach(m => {
      measurementGroup.remove(m.line);
      measurementGroup.remove(m.startMarker);
      measurementGroup.remove(m.endMarker);
      
      if (m.line.geometry) m.line.geometry.dispose();
      if (m.line.material) m.line.material.dispose();
      if (m.startMarker.geometry) m.startMarker.geometry.dispose();
      if (m.startMarker.material) m.startMarker.material.dispose();
      if (m.endMarker.geometry) m.endMarker.geometry.dispose();
      if (m.endMarker.material) m.endMarker.material.dispose();
    });
    
    measurements = [];
    measurementPoints = [];
  }
  
  function getMeasurements() {
    return measurements.map((m, idx) => ({
      index: idx,
      distance: m.distance.toFixed(3),
      start: `(${m.start.x.toFixed(2)}, ${m.start.y.toFixed(2)}, ${m.start.z.toFixed(2)})`,
      end: `(${m.end.x.toFixed(2)}, ${m.end.y.toFixed(2)}, ${m.end.z.toFixed(2)})`
    }));
  }
  
  // Export to global scope
  window.MeasurementModule = {
    setActive,
    handleClick,
    clearAllMeasurements,
    getMeasurements,
    initMeasurementGroup
  };
})();
