import {
  BufferAttribute, BufferGeometry, FileLoader, Loader, Vector3
} from "/includes/three/three.module.js";

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
      // Check if JSZip is available
      if ( typeof JSZip === 'undefined' ) {
        // Try to load JSZip dynamically
        const script = document.createElement( 'script' );
        script.src = '/includes/three/jszip.min.js';
        script.onload = () => this._parse3MF( data, resolve, reject );
        script.onerror = () => reject( new Error( 'Failed to load JSZip' ) );
        document.head.appendChild( script );
      } else {
        this._parse3MF( data, resolve, reject );
      }
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
        triangles.push([v1, v2, v3]);
      });

      // Create geometry
      const geometry = new BufferGeometry();
      const positions = new Float32Array(triangles.length * 9);
      for (let i = 0; i < triangles.length; i++) {
        const triangle = triangles[i];
        const v1 = vertices[triangle[0]];
        const v2 = vertices[triangle[1]];
        const v3 = vertices[triangle[2]];
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
      meshMap.set(meshNode, geometry);
      const meshId = meshNode.getAttribute('id');
      if (meshId) meshMap.set(meshId, geometry);
    });

    // Build component list
    const components = objects.map(objNode => {
      // Try to get name/id
      const name = objNode.getAttribute('name') || objNode.getAttribute('id') || 'component';
      // Find mesh child or mesh reference
      let geometry = null;
      let meshNode = objNode.querySelector('mesh');
      if (meshNode) {
        geometry = meshMap.get(meshNode);
      } else {
        // Try mesh reference via mesh attribute
        const meshRef = objNode.getAttribute('mesh');
        if (meshRef) {
          geometry = meshMap.get(meshRef);
        }
      }
      if (!geometry) return null;
      return { name, geometry };
    }).filter(Boolean);

    // Fallback: if only one, return geometry directly for backward compatibility
    if (components.length === 1) return components[0].geometry;
    return components;
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
