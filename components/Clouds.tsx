

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createCloudTexture } from '../utils/math';
import '../types';

const CLOUD_COUNT = 3;
const WORLD_WIDTH = 800;
const WORLD_DEPTH = 800;

// Create texture once
const cloudTexture = new THREE.TextureLoader().load(createCloudTexture());
// Smooth blending for realistic fog/cloud
cloudTexture.magFilter = THREE.LinearFilter;
cloudTexture.minFilter = THREE.LinearFilter;

// Material for single particles
const CloudParticleMaterial = new THREE.SpriteMaterial({
  map: cloudTexture,
  color: '#ffffff',
  transparent: true,
  opacity: 0.3, // Low opacity for subtle accumulation
  depthWrite: false, 
});

interface CloudParticle {
    x: number;
    y: number;
    z: number;
    scale: number;
}

const Cloud: React.FC<{ initialPos: [number, number, number], speed: number, size: number }> = ({ initialPos, speed, size }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  // Generate particles for this single cloud volume
  const particles: CloudParticle[] = useMemo(() => {
      const p: CloudParticle[] = [];
      const particleCount = 60 + Math.floor(Math.random() * 30);
      
      for(let i=0; i<particleCount; i++) {
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.random() * Math.PI;
          const r = Math.random() * size * 0.45; 
          
          p.push({
              x: r * Math.sin(phi) * Math.cos(theta) * 2.5, 
              y: r * Math.cos(phi) * 0.8,
              z: r * Math.sin(phi) * Math.sin(theta) * 1.5,
              scale: size * (0.2 + Math.random() * 0.3) 
          });
      }
      return p;
  }, [size]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.position.z += speed * delta;
      
      if (groupRef.current.position.z > WORLD_DEPTH / 2) {
        groupRef.current.position.z = -WORLD_DEPTH / 2;
        groupRef.current.position.x = (Math.random() - 0.5) * WORLD_WIDTH;
        groupRef.current.position.y = 50 + Math.random() * 30;
      }
    }
  });

  return (
    <group ref={groupRef} position={initialPos}>
       {particles.map((p, i) => (
           <sprite 
             key={i} 
             position={[p.x, p.y, p.z]} 
             scale={[p.scale, p.scale, 1]} 
             material={CloudParticleMaterial} 
           />
       ))}
    </group>
  );
};

const Clouds: React.FC = () => {
  const clouds = useMemo(() => {
    const arr = [];
    for (let i = 0; i < CLOUD_COUNT; i++) {
      arr.push({
        // Start them slightly off-center to drift in
        x: (Math.random() - 0.5) * 400,
        y: 60 + Math.random() * 20, 
        // Start behind the initial camera view (negative Z relative to camera pos) so they float IN
        z: -200 + Math.random() * 300,
        speed: 10 + Math.random() * 5, // Faster drift for cinematic feel
        size: 30 + Math.random() * 20
      });
    }
    return arr;
  }, []);

  return (
    <group>
      {clouds.map((cloud, i) => (
        <Cloud key={i} initialPos={[cloud.x, cloud.y, cloud.z]} speed={cloud.speed} size={cloud.size} />
      ))}
    </group>
  );
};

export default Clouds;