import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import Terrain from './Terrain';
import Trees from './Trees';
import Clouds from './Clouds';
import Birds from './Birds';
import ForestFire from './ForestFire';
import '../types';

// Rainforest Sky Blue
const BG_COLOR = '#87CEEB';
const FOG_COLOR = '#87CEEB';

const CameraRig = ({ 
    isAutoFlying, 
    viewMode, 
    birdRef 
}: { 
    isAutoFlying: boolean, 
    viewMode: 'FREE' | 'FOLLOW', 
    birdRef: React.RefObject<THREE.Group> 
}) => {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const targetRef = useRef(new THREE.Vector3(0, 0, 0));
  
  // Track start time relative to component mount for animation reset
  const startTimeRef = useRef<number | null>(null);

  // Figure 1 Config (High View)
  const START_POS = new THREE.Vector3(-163, 253, 42);
  // Figure 2 Config (Low View)
  const END_POS = new THREE.Vector3(-308, 35, 206);

  useFrame((state) => {
    if (!cameraRef.current) return;
    
    // Initialize start time on first frame
    if (startTimeRef.current === null) {
        startTimeRef.current = state.clock.elapsedTime;
    }
    const time = state.clock.elapsedTime - startTimeRef.current;

    // --- FOLLOW MODE ---
    if (viewMode === 'FOLLOW' && birdRef.current) {
        const bird = birdRef.current;
        const birdPos = bird.position;
        
        // Calculate Third Person Camera Position relative to bird
        const offset = new THREE.Vector3(0, 10, -25);
        offset.applyQuaternion(bird.quaternion);
        const desiredPos = birdPos.clone().add(offset);
        
        // Smoothly lerp camera to desired position
        cameraRef.current.position.lerp(desiredPos, 0.1);
        
        // Look slightly ahead of the bird
        const lookOffset = new THREE.Vector3(0, 2, 20);
        lookOffset.applyQuaternion(bird.quaternion);
        const lookTarget = birdPos.clone().add(lookOffset);
        
        targetRef.current.lerp(lookTarget, 0.1);
        cameraRef.current.lookAt(targetRef.current);
        return;
    }
    
    // --- FREE / INTRO MODE ---
    // 0s - 3.0s: Hold High View
    if (time < 3.0) {
        cameraRef.current.position.lerp(START_POS, 0.1);
        targetRef.current.lerp(new THREE.Vector3(0, 0, 0), 0.1);
    } 
    // 3.0s - 8.5s: Swoop Down to Low View
    else if (time < 8.5) {
        const progress = (time - 3.0) / 5.5;
        const ease = progress * progress * (3 - 2 * progress);
        
        cameraRef.current.position.lerpVectors(START_POS, END_POS, ease);
        
        const startTarget = new THREE.Vector3(0, 0, 0);
        const endTarget = new THREE.Vector3(100, 60, -50);
        targetRef.current.lerpVectors(startTarget, endTarget, ease);
    } 
    // 8.5s+: Handover to Auto-Hover
    else if (isAutoFlying) {
        const hoverTime = (time - 8.5) * 0.2;
        
        cameraRef.current.position.x = END_POS.x + Math.sin(hoverTime) * 10;
        cameraRef.current.position.z = END_POS.z + Math.cos(hoverTime) * 10;
        cameraRef.current.position.y = END_POS.y + Math.sin(hoverTime * 0.5) * 3;
        
        targetRef.current.lerp(new THREE.Vector3(100, 60, -50), 0.05);
    }

    cameraRef.current.lookAt(targetRef.current);
  });

  return (
    <PerspectiveCamera 
      ref={cameraRef} 
      makeDefault 
      position={[-163, 253, 42]} 
      fov={55} 
      near={0.1} 
      far={600} 
    />
  );
};

interface SceneProps {
  pixelRatio: number;
  viewMode: 'FREE' | 'FOLLOW';
  resetKey: number;
}

const Scene: React.FC<SceneProps> = ({ pixelRatio, viewMode, resetKey }) => {
  const [autoFly, setAutoFly] = useState(true);
  const birdRef = useRef<THREE.Group>(null);

  return (
    <div className="w-full h-full relative" style={{ backgroundColor: BG_COLOR }}>
      <Canvas
        shadows
        dpr={pixelRatio}
        gl={{ 
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.0,
        }}
      >
        <fog attach="fog" args={[FOG_COLOR, 250, 1200]} />

        <ambientLight intensity={1.5} color="#dbeed0" />
        
        <directionalLight 
          position={[100, 150, 50]} 
          intensity={3.5} 
          castShadow 
          shadow-mapSize={[2048, 2048]}
          color="#fffce8"
          shadow-bias={-0.0005}
        >
          <orthographicCamera attach="shadow-camera" args={[-400, 400, 400, -400]} />
        </directionalLight>

        <hemisphereLight args={['#87CEEB', '#2e5a1c', 0.8]} />
        
        <CameraRig 
            key={`cam-${resetKey}`} 
            isAutoFlying={autoFly} 
            viewMode={viewMode} 
            birdRef={birdRef} 
        />
        
        <group>
            <Terrain />
            <Trees />
            <Birds key={`bird-${resetKey}`} ref={birdRef} />
            <Clouds />
            <ForestFire />
        </group>

        {viewMode === 'FREE' && (
            <OrbitControls 
                enableZoom={true} 
                enablePan={true} 
                maxPolarAngle={Math.PI / 2 - 0.1}
                onStart={() => setAutoFly(false)}
            />
        )}
      </Canvas>
    </div>
  );
};

export default Scene;