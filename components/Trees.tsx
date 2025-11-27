

import React, { useMemo, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { getHeight, createFoliageTexture } from '../utils/math';
import '../types';

const TREE_COUNT = 11000;
const TERRAIN_WIDTH = 800;
const TERRAIN_DEPTH = 800;

const Trees: React.FC = () => {
  // We use 4 instanced meshes: 1 for trunks, 3 for canopy layers (bottom, mid, top)
  const trunkMeshRef = useRef<THREE.InstancedMesh>(null);
  const foliageBottomRef = useRef<THREE.InstancedMesh>(null);
  const foliageMidRef = useRef<THREE.InstancedMesh>(null);
  const foliageTopRef = useRef<THREE.InstancedMesh>(null);

  // 1. Geometries
  const trunkGeo = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.2, 0.4, 1, 6);
    geo.translate(0, 0.5, 0); // Pivot at bottom
    return geo;
  }, []);

  const foliageGeo = useMemo(() => {
    // Low poly sphere (Icosahedron) gives a nice geometric leaf volume
    return new THREE.IcosahedronGeometry(1, 0); 
  }, []);

  // 2. Materials
  const trunkMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#4e342e',
      roughness: 0.9,
      metalness: 0.1,
    });
  }, []);

  const foliageTexture = useMemo(() => {
    const tex = new THREE.TextureLoader().load(createFoliageTexture());
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  const foliageMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: foliageTexture,
      color: '#ffffff',
      roughness: 0.8,
      metalness: 0.0,
      side: THREE.FrontSide, // Only show outside for solidity
    });
  }, [foliageTexture]);

  // 3. Instance Generation
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    
    let index = 0;
    for (let i = 0; i < TREE_COUNT; i++) {
      // Rectangular distribution
      const x = (Math.random() - 0.5) * TERRAIN_WIDTH;
      const z = (Math.random() - 0.5) * TERRAIN_DEPTH;
      const y = getHeight(x, z);

      // Avoid spawning in the lake (Water level is -2.0)
      if (y < -1.5) continue; 

      // Reduced scale and height for smaller trees
      const scale = 0.4 + Math.random() * 0.4;
      const trunkHeight = 3 + Math.random() * 4;

      // --- TRUNK ---
      dummy.position.set(x, y - 0.2, z); // Lower slightly to embed in ground
      dummy.scale.set(scale, trunkHeight, scale);
      dummy.rotation.set(0, Math.random() * Math.PI, 0);
      dummy.updateMatrix();
      if (trunkMeshRef.current) trunkMeshRef.current.setMatrixAt(index, dummy.matrix);

      // --- FOLIAGE COLORS ---
      // Randomize green shade slightly for each tree
      const hue = 0.25 + (Math.random() - 0.5) * 0.05; // Base green hue
      const sat = 0.6 + Math.random() * 0.2;
      const light = 0.3 + Math.random() * 0.2;
      color.setHSL(hue, sat, light);
      
      if (foliageBottomRef.current) foliageBottomRef.current.setColorAt(index, color);
      if (foliageMidRef.current) foliageMidRef.current.setColorAt(index, color);
      
      // Top slightly brighter
      color.setHSL(hue, sat, light + 0.1);
      if (foliageTopRef.current) foliageTopRef.current.setColorAt(index, color);

      // --- FOLIAGE GEOMETRY POSITIONS ---
      
      // Bottom Layer (Wide)
      dummy.position.set(x, y + trunkHeight * 0.5, z);
      dummy.scale.set(scale * 3.5, scale * 2.5, scale * 3.5);
      dummy.rotation.set(Math.random(), Math.random(), Math.random());
      dummy.updateMatrix();
      if (foliageBottomRef.current) foliageBottomRef.current.setMatrixAt(index, dummy.matrix);

      // Mid Layer
      dummy.position.set(x, y + trunkHeight * 0.75, z);
      dummy.scale.set(scale * 2.8, scale * 2.8, scale * 2.8);
      dummy.rotation.set(Math.random(), Math.random(), Math.random());
      dummy.updateMatrix();
      if (foliageMidRef.current) foliageMidRef.current.setMatrixAt(index, dummy.matrix);

      // Top Layer (Small)
      dummy.position.set(x, y + trunkHeight * 0.95, z);
      dummy.scale.set(scale * 1.8, scale * 1.8, scale * 1.8);
      dummy.rotation.set(Math.random(), Math.random(), Math.random());
      dummy.updateMatrix();
      if (foliageTopRef.current) foliageTopRef.current.setMatrixAt(index, dummy.matrix);

      index++;
    }

    // Update counts and flags
    [trunkMeshRef, foliageBottomRef, foliageMidRef, foliageTopRef].forEach(ref => {
        if (ref.current) {
            ref.current.count = index;
            ref.current.instanceMatrix.needsUpdate = true;
            if (ref !== trunkMeshRef) ref.current.instanceColor!.needsUpdate = true;
        }
    });

  }, []);

  return (
    <group>
      <instancedMesh ref={trunkMeshRef} args={[trunkGeo, trunkMaterial, TREE_COUNT]} castShadow receiveShadow />
      <instancedMesh ref={foliageBottomRef} args={[foliageGeo, foliageMaterial, TREE_COUNT]} castShadow receiveShadow />
      <instancedMesh ref={foliageMidRef} args={[foliageGeo, foliageMaterial, TREE_COUNT]} castShadow receiveShadow />
      <instancedMesh ref={foliageTopRef} args={[foliageGeo, foliageMaterial, TREE_COUNT]} castShadow receiveShadow />
    </group>
  );
};

export default Trees;