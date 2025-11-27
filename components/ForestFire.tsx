

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createCloudTexture, createFireGlowTexture } from '../utils/math';
import '../types';

// Mountain coordinates from math.ts
const MOUNTAIN_X = 180;
const MOUNTAIN_Z = -60;
const BASE_HEIGHT = 55; 

// Textures
const fireTexture = new THREE.TextureLoader().load(createFireGlowTexture());
const smokeTexture = new THREE.TextureLoader().load(createCloudTexture());

fireTexture.magFilter = THREE.LinearFilter;
fireTexture.minFilter = THREE.LinearFilter;
smokeTexture.magFilter = THREE.LinearFilter;
smokeTexture.minFilter = THREE.LinearFilter;

// --- MATERIALS ---
// Using values > 1.0 for RGB to trigger bloom/glow in ACESFilmicToneMapping

// 1. Core Fire: Blindingly hot
const CoreMaterial = new THREE.SpriteMaterial({
  map: fireTexture,
  color: new THREE.Color(10, 8, 4), // HDR White-Yellow
  transparent: true,
  opacity: 1.0, 
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

// 2. Main Flames: Intense Orange
const FlameMaterial = new THREE.SpriteMaterial({
  map: fireTexture,
  color: new THREE.Color(5, 1.5, 0.2), // HDR Orange-Red
  transparent: true,
  opacity: 0.9,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

// 3. Embers: Bright sparks
const EmberMaterial = new THREE.SpriteMaterial({
  map: fireTexture,
  color: new THREE.Color(8, 4, 1), // HDR Gold
  transparent: true,
  opacity: 1.0,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

// 4. Smoke: Dark plume
const SmokeMaterial = new THREE.SpriteMaterial({
  map: smokeTexture,
  color: new THREE.Color(0.2, 0.2, 0.2), // Slightly lighter grey for volume
  transparent: true,
  opacity: 0.5,
  blending: THREE.NormalBlending,
  depthWrite: false,
});

const ForestFire: React.FC = () => {
  const lightRef = useRef<THREE.PointLight>(null);
  
  // Particle Counts
  const CORE_COUNT = 30;
  const FLAME_COUNT = 70;
  const EMBER_COUNT = 50;
  const SMOKE_COUNT = 25;

  // Refs for direct manipulation
  const coreSprites = useRef<(THREE.Sprite | null)[]>([]);
  const flameSprites = useRef<(THREE.Sprite | null)[]>([]);
  const emberSprites = useRef<(THREE.Sprite | null)[]>([]);
  const smokeSprites = useRef<(THREE.Sprite | null)[]>([]);

  // --- Particle Data Generators ---
  
  const coreData = useMemo(() => Array.from({ length: CORE_COUNT }).map(() => ({
    xOffset: (Math.random() - 0.5) * 35,
    zOffset: (Math.random() - 0.5) * 35,
    speed: 3.0 + Math.random() * 2.0,
    phase: Math.random() * 100,
    lifeTime: 0.6 + Math.random() * 0.4,
    maxScale: 30 + Math.random() * 20
  })), []);

  const flameData = useMemo(() => Array.from({ length: FLAME_COUNT }).map(() => ({
    angle: Math.random() * Math.PI * 2,
    radius: Math.random() * 45,
    speed: 2.0 + Math.random() * 3.0,
    phase: Math.random() * 100,
    lifeTime: 1.2 + Math.random() * 1.2,
    maxScale: 45 + Math.random() * 25
  })), []);

  const emberData = useMemo(() => Array.from({ length: EMBER_COUNT }).map(() => ({
    xOffset: (Math.random() - 0.5) * 60,
    zOffset: (Math.random() - 0.5) * 60,
    speed: 6.0 + Math.random() * 8.0, 
    phase: Math.random() * 100,
    lifeTime: 1.5 + Math.random() * 1.5,
    maxScale: 1.0 + Math.random() * 1.5
  })), []);

  const smokeData = useMemo(() => Array.from({ length: SMOKE_COUNT }).map(() => ({
    xOffset: (Math.random() - 0.5) * 50,
    zOffset: (Math.random() - 0.5) * 50,
    speed: 1.0 + Math.random() * 1.0,
    phase: Math.random() * 100,
    lifeTime: 5.0 + Math.random() * 3.0,
    maxScale: 80 + Math.random() * 50
  })), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;

    // 1. Update Core (Hot Base)
    coreSprites.current.forEach((s, i) => {
        if(!s) return;
        const d = coreData[i];
        const localT = t + d.phase;
        const progress = (localT % d.lifeTime) / d.lifeTime;
        
        // High frequency jitter
        const jitterX = Math.sin(localT * 30) * 1.5;
        const jitterZ = Math.cos(localT * 25) * 1.5;
        
        s.position.set(
            MOUNTAIN_X + d.xOffset + jitterX,
            BASE_HEIGHT + progress * d.speed * 20,
            MOUNTAIN_Z + d.zOffset + jitterZ
        );
        
        // Pulsing intensity
        const alpha = Math.sin(progress * Math.PI); 
        s.scale.setScalar(d.maxScale * alpha);
        s.material.opacity = alpha;
    });

    // 2. Update Flames (Rising Body)
    flameSprites.current.forEach((s, i) => {
        if(!s) return;
        const d = flameData[i];
        const localT = t + d.phase;
        const progress = (localT % d.lifeTime) / d.lifeTime;
        
        // Complex turbulence
        const wind = Math.sin(t * 2 + d.phase) * 10 * progress;
        const turbulence = Math.sin(localT * 5) * 5 * progress;
        const radius = d.radius * (1.0 - progress * 0.4); 

        s.position.set(
            MOUNTAIN_X + Math.cos(d.angle) * radius + wind + turbulence,
            BASE_HEIGHT + progress * d.speed * 60, // Higher flames
            MOUNTAIN_Z + Math.sin(d.angle) * radius + turbulence
        );
        
        // Scale grows then shrinks
        const scaleProgress = 1 - Math.pow(progress - 0.2, 2); 
        s.scale.setScalar(d.maxScale * scaleProgress * (1 - progress * 0.5));
        
        const alpha = Math.max(0, 1 - Math.pow(progress, 3));
        s.material.opacity = 0.9 * alpha;
    });

    // 3. Update Embers (Fast Sparks)
    emberSprites.current.forEach((s, i) => {
        if(!s) return;
        const d = emberData[i];
        const localT = t + d.phase;
        const progress = (localT % d.lifeTime) / d.lifeTime;
        
        // Spiral Upwards
        const spiralRadius = 50 * progress;
        const spiralAngle = localT * 2;

        s.position.set(
            MOUNTAIN_X + d.xOffset + Math.cos(spiralAngle) * spiralRadius * 0.2,
            BASE_HEIGHT + progress * d.speed * 60,
            MOUNTAIN_Z + d.zOffset + Math.sin(spiralAngle) * spiralRadius * 0.2
        );
        
        // Flicker
        const flicker = 0.5 + 0.5 * Math.sin(localT * 40);
        s.scale.setScalar(d.maxScale * (1-progress));
        s.material.opacity = flicker * (1 - progress);
    });

    // 4. Update Smoke
    smokeSprites.current.forEach((s, i) => {
        if(!s) return;
        const d = smokeData[i];
        const localT = t + d.phase;
        const progress = (localT % d.lifeTime) / d.lifeTime;
        
        // Heavy drift
        const windX = -40 * progress; 

        s.position.set(
            MOUNTAIN_X + d.xOffset + windX,
            BASE_HEIGHT + 30 + progress * d.speed * 100,
            MOUNTAIN_Z + d.zOffset
        );
        
        const scale = d.maxScale * (0.5 + progress * 1.5); 
        s.scale.setScalar(scale);
        s.material.opacity = 0.5 * (1 - progress); 
    });

    // Dynamic Lighting
    if (lightRef.current) {
        // More chaotic flicker
        const noise = Math.sin(t * 20) * 0.3 + Math.sin(t * 45) * 0.3 + Math.random() * 0.4;
        lightRef.current.intensity = 150 + noise * 50; // Much brighter
        
        // Color shift: Orange -> Red -> Yellow
        const hueShift = Math.sin(t * 3) * 0.05;
        lightRef.current.color.setHSL(0.08 + hueShift, 1.0, 0.5);
    }
  });

  return (
    <group>
      {/* Light Source */}
      <pointLight 
        ref={lightRef}
        position={[MOUNTAIN_X, BASE_HEIGHT + 40, MOUNTAIN_Z]}
        color="#ff6600" 
        distance={800}
        decay={1.5}
      />

      {/* Render Particles */}
      {coreData.map((_, i) => (
        <sprite key={`core-${i}`} ref={(el) => { coreSprites.current[i] = el; }} material={CoreMaterial} />
      ))}
      {flameData.map((_, i) => (
        <sprite key={`flame-${i}`} ref={(el) => { flameSprites.current[i] = el; }} material={FlameMaterial} />
      ))}
      {emberData.map((_, i) => (
        <sprite key={`ember-${i}`} ref={(el) => { emberSprites.current[i] = el; }} material={EmberMaterial} />
      ))}
      {smokeData.map((_, i) => (
        <sprite key={`smoke-${i}`} ref={(el) => { smokeSprites.current[i] = el; }} material={SmokeMaterial} />
      ))}
    </group>
  );
};

export default ForestFire;
