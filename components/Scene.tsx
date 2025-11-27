import React, { useRef, useState, useEffect } from 'react';
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
    birdRef,
    controlsRef
}: { 
    isAutoFlying: boolean, 
    viewMode: 'FREE' | 'FOLLOW', 
    birdRef: React.RefObject<THREE.Group>,
    controlsRef: React.MutableRefObject<any>
}) => {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const targetRef = useRef(new THREE.Vector3(0, 0, 0));
  
  // Track start time relative to component mount for animation reset
  const startTimeRef = useRef<number | null>(null);

  // Figure 1 Config (High View)
  const START_POS = new THREE.Vector3(-163, 253, 42);
  // Figure 2 Config (Low View)
  // Reverted to original low altitude (35) as requested
  const END_POS = new THREE.Vector3(-308, 35, 206);
  
  // Adjusted LookAt target to be more central (0, 30, 0).
  // Previous value (-50) was cutting off the Mountain (which is at X=180).
  // This balances the Lake (Left) and Mountain (Right).
  const END_LOOK_TARGET = new THREE.Vector3(0, 30, 0);

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
    let desiredPos = new THREE.Vector3();
    let desiredLook = new THREE.Vector3();

    // 0s - 3.0s: Hold High View
    if (time < 3.0) {
        desiredPos.copy(START_POS);
        desiredLook.set(0, 0, 0);
    } 
    // 3.0s - 8.5s: Swoop Down to Low View
    else if (time < 8.5) {
        const progress = (time - 3.0) / 5.5;
        const ease = progress * progress * (3 - 2 * progress);
        
        desiredPos.lerpVectors(START_POS, END_POS, ease);
        desiredLook.lerpVectors(new THREE.Vector3(0, 0, 0), END_LOOK_TARGET, ease);
    } 
    // 8.5s+: Handover to Auto-Hover
    // OR if we switched back to FREE mode later (time > 8.5), we default to this logic
    else if (isAutoFlying) {
        const hoverTime = (time - 8.5) * 0.2;
        
        desiredPos.set(
            END_POS.x + Math.sin(hoverTime) * 10,
            END_POS.y + Math.sin(hoverTime * 0.5) * 3,
            END_POS.z + Math.cos(hoverTime) * 10
        );
        desiredLook.copy(END_LOOK_TARGET);
    } else {
        // Manual control active (OrbitControls), do not override position
        return;
    }

    // Smoothly transition to the calculated target
    // This provides the "Pull Back" effect when switching from Follow to Free mode
    cameraRef.current.position.lerp(desiredPos, 0.05);
    targetRef.current.lerp(desiredLook, 0.05);
    cameraRef.current.lookAt(targetRef.current);

    // CRITICAL FIX: Sync OrbitControls target to current camera look-at
    // This prevents the camera from "jumping" when the user first clicks/drags
    if (controlsRef.current && isAutoFlying) {
        controlsRef.current.target.copy(targetRef.current);
        controlsRef.current.update();
    }
  });

  return (
    <PerspectiveCamera 
      ref={cameraRef} 
      makeDefault 
      position={[-163, 253, 42]} 
      fov={55} 
      near={0.1} 
      far={700} 
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
  const controlsRef = useRef<any>(null);

  // When switching back to FREE mode, ensure we resume auto-flight/hover
  // so the camera returns to the cinematic position
  useEffect(() => {
    if (viewMode === 'FREE') {
        setAutoFly(true);
    }
  }, [viewMode]);

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
            controlsRef={controlsRef}
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
                ref={controlsRef}
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