

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getHeight, createGroundTexture, createWaterBumpMap } from '../utils/math';
import '../types';

const TERRAIN_WIDTH = 800;
const TERRAIN_DEPTH = 800;
const WIDTH_SEGMENTS = 256;
const DEPTH_SEGMENTS = 256;

const Terrain: React.FC = () => {
  const waterRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    // PlaneGeometry args: width, height, widthSegments, heightSegments
    const geo = new THREE.PlaneGeometry(TERRAIN_WIDTH, TERRAIN_DEPTH, WIDTH_SEGMENTS, DEPTH_SEGMENTS);
    geo.rotateX(-Math.PI / 2);

    const posAttribute = geo.attributes.position;
    for (let i = 0; i < posAttribute.count; i++) {
      const x = posAttribute.getX(i);
      const z = posAttribute.getZ(i);
      const y = getHeight(x, z);
      posAttribute.setY(i, y);
    }
    
    geo.computeVertexNormals();
    return geo;
  }, []);

  const texture = useMemo(() => {
    const dataUrl = createGroundTexture();
    const tex = new THREE.TextureLoader().load(dataUrl);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    // Linear Filter for realistic smooth look
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter; 
    // Adjust repeat to respect 1:1 ratio (square)
    tex.repeat.set(28, 28); 
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  const waterBumpMap = useMemo(() => {
    const tex = new THREE.TextureLoader().load(createWaterBumpMap());
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(12, 12); 
    return tex;
  }, []);

  useFrame((state, delta) => {
    if (waterRef.current && waterRef.current.material) {
        // Animate bump map offset to simulate moving water/ripples
        const mat = waterRef.current.material as THREE.MeshPhysicalMaterial;
        if (mat.bumpMap) {
            // Diagonal movement for flow
            mat.bumpMap.offset.x = (mat.bumpMap.offset.x + delta * 0.04) % 1;
            mat.bumpMap.offset.y = (mat.bumpMap.offset.y + delta * 0.02) % 1;
        }
    }
  });

  return (
    <group>
      {/* Land */}
      <mesh geometry={geometry} receiveShadow>
        <meshStandardMaterial 
          map={texture} 
          roughness={0.9}
          metalness={0}
          color="#ffffff" 
        />
      </mesh>
      
      {/* Enhanced Lake Water */}
      <mesh 
        ref={waterRef}
        position={[0, -2.0, 0]} 
        rotation={[-Math.PI / 2, 0, 0]} 
        receiveShadow
      >
        <planeGeometry args={[TERRAIN_WIDTH, TERRAIN_DEPTH]} />
        <meshPhysicalMaterial 
          color="#4fa4b8" 
          transmission={0.4} // Glass-like transparency
          thickness={2.0}    // Volume thickness for refraction
          roughness={0.05}   // Very smooth surface for reflections
          metalness={0.1}
          reflectivity={0.9}
          ior={1.33}         // Index of Refraction for water
          bumpMap={waterBumpMap}
          bumpScale={0.5}
          clearcoat={1.0}    // Wet layer on top
          clearcoatRoughness={0.05}
          side={THREE.DoubleSide}
          transparent={true} // Needed for transmission in some three.js versions/setups
          opacity={0.8}
        />
      </mesh>
    </group>
  );
};

export default Terrain;