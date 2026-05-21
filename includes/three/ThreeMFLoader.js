import {
  BufferAttribute, BufferGeometry, FileLoader, Loader, Vector3
} from "/includes/three/three.module.js";

let jsZipBootPromise = null;

function ensureJsZip() {
  if ( typeof JSZip !== 'undefined' ) {
    return Promise.resolve( JSZip );
  }
  if ( jsZipBootPromise ) {
    return jsZipBootPromise;
  }
  jsZipBootPromise = new Promise( ( resolve, reject ) => {
    const existing = document.querySelector( 'script[data-jszip-loader="1"]' );
    if ( existing ) {
      existing.addEventListener( 'load', () => resolve( JSZip ), { once: true } );
      existing.addEventListener( 'error', () => reject( new Error( 'Failed to load JSZip' ) ), { once: true } );
      return;
    }
    const script = document.createElement( 'script' );
    script.src = '/includes/three/jszip.min.js';
    script.dataset.jszipLoader = '1';
    script.onload = () => resolve( JSZip );
    script.onerror = () => reject( new Error( 'Failed to load JSZip' ) );
    document.head.appendChild( script );
  } ).catch( ( error ) => {
    jsZipBootPromise = null;
    throw error;
  } );
  return jsZipBootPromise;
}

/**
 * Description: A THREE loader for 3MF (3D Manufacturing Format) files.
 *
 * 3MF is a ZIP-based format containing XML files with 3D mesh data.
 * This loader extracts the mesh geometry from 3MF files for use with Three.js.
 *
 * Usage:
 *  const loader = new ThreeMFLoader();
 *  loader.load( './models/3mf/model.3mf', function ( geometry ) {
 *    scene.add( new THREE.Mesh( geometry ) );
 *  });
 *
 * The loader returns a non-indexed buffer geometry.
 */

class ThreeMFLoader extends Loader {

  constructor( manager ) {
    super( manager );
  }

  load( url, onLoad, onProgress, onError ) {
    const scope = this;

    const loader = new FileLoader( this.manager );
    loader.setPath( this.path );
    loader.setResponseType( 'arraybuffer' );
    loader.setRequestHeader( this.requestHeader );
    loader.setWithCredentials( this.withCredentials );

    // Promise API (when callback is omitted) + backward compatible callback API
    if ( typeof onLoad !== 'function' ) {
      return new Promise( ( resolve, reject ) => {
        loader.load( url, function ( data ) {
          scope.parse( data ).then( resolve ).catch( reject );
        }, onProgress, reject );
      } );
    }

    loader.load( url, function ( data ) {
      scope.parse( data )
        .then( ( parsed ) => onLoad( parsed ) )
        .catch( ( e ) => {
          if ( onError ) {
            onError( e );
          } else {
            console.error( e );
          }
          scope.manager.itemError( url );
        } );
    }, onProgress, onError );
  }

  parse( data ) {
    return new Promise( ( resolve, reject ) => {
      ensureJsZip()
        .then( () => this._parse3MF( data, resolve, reject ) )
        .catch( reject );
    } );
  }

  _parse3MF( data, resolve, reject ) {
    try {
      const zip = new JSZip();
      zip.loadAsync( data ).then( ( zipContent ) => {
        // Find the 3D model file (usually 3D/3dmodel.model)
        const modelFile = zipContent.file( '3D/3dmodel.model' ) || zipContent.file( '/3D/3dmodel.model' );

        if ( !modelFile ) {
          reject( new Error( '3MF file does not contain a valid 3D model' ) );
          return;
        }

        modelFile.async( 'text' ).then( ( xmlText ) => {
          try {
            const geometry = this._parse3MFXML( xmlText );
            resolve( geometry );
          } catch ( e ) {
            reject( e );
          }
        } ).catch( reject );
      } ).catch( reject );
    } catch ( e ) {
      reject( e );
    }
  }


  _parse3MFXML( xmlText ) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString( xmlText, 'text/xml' );
    const materialLibrary = this._extract3MFMaterials( xmlDoc );

    // Find all <object> nodes (each can reference a mesh)
    const objects = Array.from(xmlDoc.querySelectorAll('object'));
    if (!objects.length) {
      throw new Error('No objects found in 3MF file');
    }


    // Parse all meshes and build a map by id (if present)
    const meshMap = new Map();
    xmlDoc.querySelectorAll('mesh').forEach(meshNode => {
      // Parse vertices
      const vertices = [];
      const vertexElements = meshNode.querySelectorAll('vertices vertex');
      vertexElements.forEach(vertex => {
        const x = parseFloat(vertex.getAttribute('x')) || 0;
        const y = parseFloat(vertex.getAttribute('y')) || 0;
        const z = parseFloat(vertex.getAttribute('z')) || 0;
        vertices.push(new Vector3(x, y, z));
      });

      // Parse triangles
      const triangles = [];
      const triangleElements = meshNode.querySelectorAll('triangles triangle');
      triangleElements.forEach(triangle => {
        const v1 = parseInt(triangle.getAttribute('v1'));
        const v2 = parseInt(triangle.getAttribute('v2'));
        const v3 = parseInt(triangle.getAttribute('v3'));
        triangles.push({
          v1, v2, v3,
          pid: triangle.getAttribute('pid'),
          p1: triangle.getAttribute('p1'),
          p2: triangle.getAttribute('p2'),
          p3: triangle.getAttribute('p3')
        });
      });

      // Create geometry
      const geometry = new BufferGeometry();
      const positions = new Float32Array(triangles.length * 9);
      for (let i = 0; i < triangles.length; i++) {
        const triangle = triangles[i];
        const v1 = vertices[triangle.v1];
        const v2 = vertices[triangle.v2];
        const v3 = vertices[triangle.v3];
        positions[i * 9] = v1.x;
        positions[i * 9 + 1] = v1.y;
        positions[i * 9 + 2] = v1.z;
        positions[i * 9 + 3] = v2.x;
        positions[i * 9 + 4] = v2.y;
        positions[i * 9 + 5] = v2.z;
        positions[i * 9 + 6] = v3.x;
        positions[i * 9 + 7] = v3.y;
        positions[i * 9 + 8] = v3.z;
      }
      geometry.setAttribute('position', new BufferAttribute(positions, 3));
      geometry.computeVertexNormals();

      // Store geometry by mesh node and by id (if present)
      const triangleMaterials = this._collectTriangleMaterials(triangles, materialLibrary);
      meshMap.set(meshNode, { geometry, triangleMaterials });
      const meshId = meshNode.getAttribute('id');
      if (meshId) meshMap.set(meshId, { geometry, triangleMaterials });
    });

    const objectsById = new Map();
    objects.forEach((objNode) => {
      const id = objNode.getAttribute('id');
      if (id) objectsById.set(id, objNode);
    });

    const resolveGeometryForObject = (objNode, seen = new Set()) => {
      if (!objNode) return null;
      const objectId = objNode.getAttribute('id') || `anon_${Math.random()}`;
      if (seen.has(objectId)) return null;
      seen.add(objectId);

      let meshNode = objNode.querySelector('mesh');
      if (meshNode) return meshMap.get(meshNode) || null;

      const meshRef = objNode.getAttribute('mesh');
      if (meshRef && meshMap.has(meshRef)) return meshMap.get(meshRef);

      const nestedComponents = Array.from(objNode.querySelectorAll('components component'));
      for (const compNode of nestedComponents) {
        const refId = compNode.getAttribute('objectid');
        if (!refId) continue;
        const refObj = objectsById.get(refId);
        const resolved = resolveGeometryForObject(refObj, seen);
        if (resolved) return resolved;
      }
      return null;
    };

    // Build component list
    const components = objects.map(objNode => {
      // Try to get name/id
      const name = objNode.getAttribute('name') || objNode.getAttribute('id') || 'component';
      const meshData = resolveGeometryForObject(objNode);
      if (!meshData?.geometry) return null;
      const objectMaterials = this._collectObjectMaterials(objNode, materialLibrary, meshData.triangleMaterials);
      return { name, geometry: meshData.geometry, materials: objectMaterials };
    }).filter(Boolean);

    // Fallback: if only one, return geometry directly for backward compatibility
    if (components.length === 1) return components[0].geometry;
    return components;
  }

  _extract3MFMaterials(xmlDoc) {
    const library = new Map();
    xmlDoc.querySelectorAll('resources basematerials').forEach((baseNode) => {
      const pid = baseNode.getAttribute('id');
      if (!pid) return;
      baseNode.querySelectorAll('base').forEach((matNode, index) => {
        const customData = this._extractMetadataMap(matNode);
        const densityKgM3 = this._parseDensityFromMetadata(customData);
        const key = `${pid}:${index}`;
        library.set(key, {
          type: 'basematerials',
          pid,
          pindex: index,
          name: matNode.getAttribute('name') || `material_${index}`,
          displayColor: matNode.getAttribute('displaycolor') || null,
          densityKgM3,
          customData,
          source: 'base'
        });
      });
    });

    xmlDoc.querySelectorAll('resources colorgroup').forEach((groupNode) => {
      const pid = groupNode.getAttribute('id');
      if (!pid) return;
      groupNode.querySelectorAll('color').forEach((colorNode, index) => {
        const customData = this._extractMetadataMap(colorNode);
        const densityKgM3 = this._parseDensityFromMetadata(customData);
        const key = `${pid}:${index}`;
        library.set(key, {
          type: 'colorgroup',
          pid,
          pindex: index,
          name: colorNode.getAttribute('name') || `color_${index}`,
          displayColor: colorNode.getAttribute('color') || null,
          densityKgM3,
          customData,
          source: 'color'
        });
      });
    });

    return library;
  }

  _collectTriangleMaterials(triangles, materialLibrary) {
    const used = new Map();
    for (const tri of triangles) {
      if (!tri.pid) continue;
      const indexes = [tri.p1, tri.p2, tri.p3].filter((v) => v !== null && v !== undefined);
      if (!indexes.length) indexes.push('0');
      for (const idx of indexes) {
        const key = `${tri.pid}:${idx}`;
        const material = materialLibrary.get(key);
        if (!material) continue;
        const count = used.get(key)?.usageCount || 0;
        used.set(key, { ...material, usageCount: count + 1 });
      }
    }
    return Array.from(used.values());
  }

  _collectObjectMaterials(objNode, materialLibrary, triangleMaterials = []) {
    const byKey = new Map();
    triangleMaterials.forEach((m) => byKey.set(`${m.pid}:${m.pindex}`, m));
    const pid = objNode.getAttribute('pid');
    const pindex = objNode.getAttribute('pindex') || '0';
    if (pid) {
      const key = `${pid}:${pindex}`;
      const material = materialLibrary.get(key);
      if (material && !byKey.has(key)) {
        byKey.set(key, { ...material, usageCount: 0 });
      }
    }
    return Array.from(byKey.values());
  }

  _extractMetadataMap(node) {
    const map = {};
    const directMetadata = Array.from(node.children || []).filter(
      (child) => String(child?.tagName || '').toLowerCase() === 'metadata'
    );
    directMetadata.forEach((metaNode) => {
      const key = String(metaNode.getAttribute('name') || metaNode.getAttribute('key') || '').trim();
      if (!key) return;
      map[key] = (metaNode.textContent || '').trim();
    });
    return map;
  }

  _parseDensityFromMetadata(metadata = {}) {
    const value = Object.entries(metadata).find(([k]) => /dens/i.test(k))?.[1];
    if (!value) return null;
    const parsed = Number(String(value).replace(',', '.').match(/[+\-]?\d+(?:\.\d+)?/)?.[0]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  // Synchronous version for direct data parsing (used by ModelLoader)
  parseSync( data ) {
    // For synchronous parsing, we'd need to handle JSZip differently
    // This is a simplified version that assumes the data is already extracted XML
    // In practice, this would need async handling
    throw new Error( '3MFLoader.parseSync not implemented. Use parse() for async loading.' );
  }
}

export { ThreeMFLoader };
