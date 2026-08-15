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

function workerNoop() {}

async function defaultYieldControl() {
  await new Promise( ( resolve ) => requestAnimationFrame( resolve ) );
}

function throwIfAborted( signal ) {
  if ( !signal?.aborted ) return;
  throw signal.reason || new DOMException( 'Aborted', 'AbortError' );
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

  parse( data, options = {} ) {
    return new Promise( ( resolve, reject ) => {
      ensureJsZip()
        .then( () => this._parse3MF( data, resolve, reject, options ) )
        .catch( reject );
    } );
  }

  _parse3MF( data, resolve, reject, options = {} ) {
    try {
      const zip = new JSZip();
      zip.loadAsync( data ).then( ( zipContent ) => {
        // Find the 3D model file (usually 3D/3dmodel.model)
        const modelFile = zipContent.file( '3D/3dmodel.model' ) || zipContent.file( '/3D/3dmodel.model' );

        if ( !modelFile ) {
          reject( new Error( '3MF file does not contain a valid 3D model' ) );
          return;
        }

        modelFile.async( 'text' ).then( async ( xmlText ) => {
          try {
            const geometry = await this._parse3MFXMLAsync( xmlText, options );
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

  _buildObjectMeta( objNode, modelUnitMeta ) {
    const partNumber = String( objNode?.getAttribute( 'partnumber' ) || '' ).trim();
    const objectId = String( objNode?.getAttribute( 'id' ) || '' ).trim();
    const displayName = String(
      objNode?.getAttribute( 'name' ) ||
      partNumber ||
      objectId ||
      'component'
    ).trim() || 'component';
    return {
      name: displayName,
      userData: {
        modelUnitMeta,
        partNumber,
        objectId,
        componentName: displayName,
        nodePath: objectId ? `${displayName}::${objectId}` : displayName,
      }
    };
  }

  async _parse3MFXMLAsync( xmlText, options = {} ) {
    const onProgress = typeof options.onProgress === 'function' ? options.onProgress : workerNoop;
    const yieldControl = typeof options.yieldControl === 'function' ? options.yieldControl : defaultYieldControl;
    const signal = options.signal || null;
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString( xmlText, 'text/xml' );
    const modelUnitMeta = this._readModelUnitMeta( xmlDoc );
    const materialLibrary = this._extract3MFMaterials( xmlDoc );
    const objects = Array.from( xmlDoc.querySelectorAll( 'object' ) );
    if ( !objects.length ) {
      throw new Error( 'No objects found in 3MF file' );
    }

    const meshNodes = Array.from( xmlDoc.querySelectorAll( 'mesh' ) );
    const meshMap = new Map();
    for ( let meshIndex = 0; meshIndex < meshNodes.length; meshIndex ++ ) {
      throwIfAborted( signal );
      const meshNode = meshNodes[ meshIndex ];
      const vertexElements = Array.from( meshNode.querySelectorAll( 'vertices vertex' ) );
      const vertices = new Array( vertexElements.length );
      for ( let index = 0; index < vertexElements.length; index ++ ) {
        const vertex = vertexElements[ index ];
        const x = parseFloat( vertex.getAttribute( 'x' ) ) || 0;
        const y = parseFloat( vertex.getAttribute( 'y' ) ) || 0;
        const z = parseFloat( vertex.getAttribute( 'z' ) ) || 0;
        vertices[ index ] = new Vector3( x, y, z );
        if ( ( index + 1 ) % 2400 === 0 && index + 1 < vertexElements.length ) {
          onProgress( {
            progress: 0.05 + ( meshIndex / Math.max( 1, meshNodes.length ) ) * 0.2,
            message: 'Tolker 3MF-vertices...',
            detail: `${meshIndex + 1}/${meshNodes.length} mesh - ${index + 1}/${vertexElements.length} vertices`
          } );
          await yieldControl();
          throwIfAborted( signal );
        }
      }

      const triangleElements = Array.from( meshNode.querySelectorAll( 'triangles triangle' ) );
      const triangles = new Array( triangleElements.length );
      for ( let index = 0; index < triangleElements.length; index ++ ) {
        const triangle = triangleElements[ index ];
        triangles[ index ] = {
          v1: parseInt( triangle.getAttribute( 'v1' ) ),
          v2: parseInt( triangle.getAttribute( 'v2' ) ),
          v3: parseInt( triangle.getAttribute( 'v3' ) ),
          pid: triangle.getAttribute( 'pid' ),
          p1: triangle.getAttribute( 'p1' ),
          p2: triangle.getAttribute( 'p2' ),
          p3: triangle.getAttribute( 'p3' )
        };
        if ( ( index + 1 ) % 2400 === 0 && index + 1 < triangleElements.length ) {
          onProgress( {
            progress: 0.08 + ( meshIndex / Math.max( 1, meshNodes.length ) ) * 0.28,
            message: 'Samler 3MF-triangler...',
            detail: `${meshIndex + 1}/${meshNodes.length} mesh - ${index + 1}/${triangleElements.length} triangler`
          } );
          await yieldControl();
          throwIfAborted( signal );
        }
      }

      const geometry = new BufferGeometry();
      const positions = new Float32Array( triangles.length * 9 );
      for ( let index = 0; index < triangles.length; index ++ ) {
        const triangle = triangles[ index ];
        const v1 = vertices[ triangle.v1 ];
        const v2 = vertices[ triangle.v2 ];
        const v3 = vertices[ triangle.v3 ];
        positions[ index * 9 ] = v1.x;
        positions[ index * 9 + 1 ] = v1.y;
        positions[ index * 9 + 2 ] = v1.z;
        positions[ index * 9 + 3 ] = v2.x;
        positions[ index * 9 + 4 ] = v2.y;
        positions[ index * 9 + 5 ] = v2.z;
        positions[ index * 9 + 6 ] = v3.x;
        positions[ index * 9 + 7 ] = v3.y;
        positions[ index * 9 + 8 ] = v3.z;
        if ( ( index + 1 ) % 1600 === 0 && index + 1 < triangles.length ) {
          onProgress( {
            progress: 0.1 + ( meshIndex / Math.max( 1, meshNodes.length ) ) * 0.55,
            message: 'Tolker 3MF-triangler...',
            detail: `${meshIndex + 1}/${meshNodes.length} mesh · ${index + 1}/${triangles.length} triangler`
          } );
          await yieldControl();
          throwIfAborted( signal );
        }
      }
      geometry.setAttribute( 'position', new BufferAttribute( positions, 3 ) );
      geometry.computeVertexNormals();
      this._attachUnitMetaToGeometry( geometry, modelUnitMeta );

      const triangleMaterials = this._collectTriangleMaterials( triangles, materialLibrary );
      meshMap.set( meshNode, { geometry, triangleMaterials } );
      const meshId = meshNode.getAttribute( 'id' );
      if ( meshId ) meshMap.set( meshId, { geometry, triangleMaterials } );

      onProgress( {
        progress: 0.18 + ( ( meshIndex + 1 ) / Math.max( 1, meshNodes.length ) ) * 0.46,
        message: 'Tolker 3MF-mesh...',
        detail: `${meshIndex + 1}/${meshNodes.length} mesh ferdig`
      } );
      if ( meshIndex + 1 < meshNodes.length ) {
        await yieldControl();
      }
    }

    const objectsById = new Map();
    objects.forEach( ( objNode ) => {
      const id = objNode.getAttribute( 'id' );
      if ( id ) objectsById.set( id, objNode );
    } );

    const resolveGeometryForObject = ( objNode, seen = new Set() ) => {
      if ( !objNode ) return null;
      const objectId = objNode.getAttribute( 'id' ) || `anon_${Math.random()}`;
      if ( seen.has( objectId ) ) return null;
      seen.add( objectId );

      let meshNode = objNode.querySelector( 'mesh' );
      if ( meshNode ) return meshMap.get( meshNode ) || null;

      const meshRef = objNode.getAttribute( 'mesh' );
      if ( meshRef && meshMap.has( meshRef ) ) return meshMap.get( meshRef );

      const nestedComponents = Array.from( objNode.querySelectorAll( 'components component' ) );
      for ( const compNode of nestedComponents ) {
        const refId = compNode.getAttribute( 'objectid' );
        if ( !refId ) continue;
        const refObj = objectsById.get( refId );
        const resolved = resolveGeometryForObject( refObj, seen );
        if ( resolved ) return resolved;
      }
      return null;
    };

    const components = [];
    for ( let objectIndex = 0; objectIndex < objects.length; objectIndex ++ ) {
      throwIfAborted( signal );
      const objNode = objects[ objectIndex ];
      const objectMeta = this._buildObjectMeta( objNode, modelUnitMeta );
      const meshData = resolveGeometryForObject( objNode );
      if ( !meshData?.geometry ) continue;
      const objectMaterials = this._collectObjectMaterials( objNode, materialLibrary, meshData.triangleMaterials );
      components.push( {
        name: objectMeta.name,
        geometry: meshData.geometry,
        materials: objectMaterials,
        userData: objectMeta.userData
      } );
      if ( ( objectIndex + 1 ) % 12 === 0 && objectIndex + 1 < objects.length ) {
        onProgress( {
          progress: 0.72 + ( ( objectIndex + 1 ) / Math.max( 1, objects.length ) ) * 0.24,
          message: 'Bygger komponentliste...',
          detail: `${objectIndex + 1}/${objects.length} objekter klare`
        } );
        await yieldControl();
      }
    }

    if ( components.length === 1 ) return components[ 0 ].geometry;
    return components;
  }


  _parse3MFXML( xmlText ) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString( xmlText, 'text/xml' );
    const modelUnitMeta = this._readModelUnitMeta( xmlDoc );
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
      this._attachUnitMetaToGeometry( geometry, modelUnitMeta );

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
      const objectMeta = this._buildObjectMeta( objNode, modelUnitMeta );
      const meshData = resolveGeometryForObject(objNode);
      if (!meshData?.geometry) return null;
      const objectMaterials = this._collectObjectMaterials(objNode, materialLibrary, meshData.triangleMaterials);
      return {
        name: objectMeta.name,
        geometry: meshData.geometry,
        materials: objectMaterials,
        userData: objectMeta.userData
      };
    }).filter(Boolean);

    // Fallback: if only one, return geometry directly for backward compatibility
    if (components.length === 1) return components[0].geometry;
    return components;
  }

  _normalize3MFLengthUnit(value) {
    const unit = String(value || '').trim().toLowerCase();
    if (!unit) return null;
    if (unit === 'micron' || unit === 'micrometer' || unit === 'micrometre' || unit === 'um') return 'um';
    if (unit === 'millimeter' || unit === 'millimetre' || unit === 'mm') return 'mm';
    if (unit === 'centimeter' || unit === 'centimetre' || unit === 'cm') return 'cm';
    if (unit === 'meter' || unit === 'metre' || unit === 'm') return 'm';
    if (unit === 'inch' || unit === 'in') return 'inch';
    if (unit === 'foot' || unit === 'ft') return 'ft';
    return null;
  }

  _metersPer3MFUnit(unit) {
    if (unit === 'um') return 1e-6;
    if (unit === 'mm') return 1e-3;
    if (unit === 'cm') return 1e-2;
    if (unit === 'inch') return 0.0254;
    if (unit === 'ft') return 0.3048;
    return 1;
  }

  _readModelUnitMeta(xmlDoc) {
    const modelNode = xmlDoc?.documentElement?.nodeName?.toLowerCase() === 'model'
      ? xmlDoc.documentElement
      : xmlDoc?.querySelector?.('model');
    const rawUnit = modelNode?.getAttribute?.('unit') || '';
    const sourceLengthUnit = this._normalize3MFLengthUnit(rawUnit);
    return {
      sourceLengthUnit,
      sourceMetersPerUnit: this._metersPer3MFUnit(sourceLengthUnit),
      normalizedToMeters: false,
      unitDeclaredInFile: !!sourceLengthUnit,
    };
  }

  _attachUnitMetaToGeometry(geometry, modelUnitMeta) {
    if (!geometry) return;
    geometry.userData = geometry.userData || {};
    geometry.userData.modelUnitMeta = {
      ...(geometry.userData.modelUnitMeta || {}),
      ...(modelUnitMeta || {}),
    };
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
    Array.from(node.querySelectorAll(':scope > metadata')).forEach((metaNode) => {
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
