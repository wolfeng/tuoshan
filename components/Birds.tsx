import React, { useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { getHeight } from '../utils/math';
import '../types';

const PARROT_MODEL_URL = 'https://threejs.org/examples/models/gltf/Parrot.glb';

// Coordinates adjusted to match the visual center of the lake (accounting for noise distortion)
const LAKE_CENTER = new THREE.Vector3(-200, -2, 80);
const MOUNTAIN_FIRE_CENTER = new THREE.Vector3(180, 90, -60);

type BirdState = 'CINEMATIC_ENTRY' | 'APPROACH_LAKE' | 'DIVE_LAKE' | 'SKIM' | 'CLIMB_MOUNTAIN' | 'DIVE_BOMB' | 'PULL_UP';

// --- RIPPLE CONFIGURATION ---
const RIPPLE_CONFIG = {
    MAX_COUNT: 5,       
    WAVES_PER_SPLASH: 1,  
    INNER_RADIUS: 0.3,    
    OUTER_RADIUS: 0.32,   
    ENTRY_SCALE: 1.2,     
    SKIM_SCALE: 0.4,      
    EXPANSION_SPEED: 25,  
    LIFE_DURATION: 2.0,   
    FADE_SPEED: 1.0,      
    BASE_OPACITY: 0.1,    
};

const CinematicParrot = forwardRef<THREE.Group, {}>((props, ref) => {
    const groupRef = useRef<THREE.Group>(null);
    useImperativeHandle(ref, () => groupRef.current as THREE.Group);

    const { scene, animations } = useGLTF(PARROT_MODEL_URL);
    const { actions } = useAnimations(animations, groupRef);

    useEffect(() => {
        scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }, [scene]);

    // Initial State
    const state = useRef<BirdState>('CINEMATIC_ENTRY');
    const velocity = useRef(new THREE.Vector3(0, 0, 0));
    const position = useRef(new THREE.Vector3(-200, 100, 100));
    
    const prevY = useRef(210);
    const target = useRef(new THREE.Vector3());
    const lastSplashTime = useRef(0);
    
    const ripplesRef = useRef<THREE.InstancedMesh>(null);
    const rippleData = useRef<{pos: THREE.Vector3, scale: number, life: number, maxLife: number, active: boolean}[]>([]);

    useMemo(() => {
        for(let i=0; i<RIPPLE_CONFIG.MAX_COUNT; i++) {
            rippleData.current.push({ pos: new THREE.Vector3(), scale: 0, life: 0, maxLife: 0, active: false });
        }
    }, []);

    const spawnRipple = (x: number, z: number, initialScale: number = RIPPLE_CONFIG.ENTRY_SCALE) => {
        for (let i = 0; i < RIPPLE_CONFIG.WAVES_PER_SPLASH; i++) {
            const p = rippleData.current.find(d => !d.active);
            if (p) {
                p.active = true;
                p.pos.set(x, -1.9, z); 
                p.scale = initialScale * (0.8 + i * 0.2); 
                p.maxLife = RIPPLE_CONFIG.LIFE_DURATION + i * 0.5;
                p.life = p.maxLife;
            }
        }
    };

    useEffect(() => {
        const action = actions[Object.keys(actions)[0]];
        if (action) {
            action.reset().play();
            action.setEffectiveTimeScale(1.5);
        }
    }, [actions]);

    useFrame(({ clock }, delta) => {
        if (!groupRef.current) return;
        const dt = Math.min(delta, 0.1); 
        const time = clock.getElapsedTime();

        const currentPos = position.current;
        const currentVel = velocity.current;
        const currentState = state.current;
        const action = actions[Object.keys(actions)[0]];

        let desiredSpeed = 40;
        let turnSpeed = 2.0;
        let flapSpeed = 1.5;

        // Path constants
        const skimStart = new THREE.Vector3(LAKE_CENTER.x + 20, -2, LAKE_CENTER.z - 10);
        const skimEnd = new THREE.Vector3(LAKE_CENTER.x + 75, -2, LAKE_CENTER.z - 30);
        const waterLevel = -2.0;

        // --- RIPPLE TRIGGER ---
        const distToEntry = Math.sqrt(
            Math.pow(currentPos.x - skimStart.x, 2) + 
            Math.pow(currentPos.z - skimStart.z, 2)
        );

        if (currentState === 'DIVE_LAKE' && distToEntry < 25 && currentPos.y < -1.5 && (time - lastSplashTime.current > 2.0)) {
            spawnRipple(currentPos.x, currentPos.z, RIPPLE_CONFIG.ENTRY_SCALE);
            lastSplashTime.current = time;
        }

        // --- STATE MACHINE ---
        if (currentState === 'CINEMATIC_ENTRY') {
            target.current.set(MOUNTAIN_FIRE_CENTER.x, 140, MOUNTAIN_FIRE_CENTER.z);
            desiredSpeed = 100;
            flapSpeed = 3.0; 
            if (currentPos.distanceTo(target.current) < 80) {
                state.current = 'DIVE_BOMB';
            }
        }
        else if (currentState === 'APPROACH_LAKE') {
            target.current.set(skimStart.x, 60, skimStart.z);
            if (currentPos.distanceTo(target.current) < 80) {
                state.current = 'DIVE_LAKE';
            }
        }
        else if (currentState === 'DIVE_LAKE') {
            target.current.set(skimStart.x, -3.0, skimStart.z); 
            desiredSpeed = 90;
            turnSpeed = 3.0;
            if (currentPos.y <= -1.5 || (currentPos.distanceTo(target.current) < 20)) { 
                state.current = 'SKIM';
                if (time - lastSplashTime.current > 2.0) {
                    spawnRipple(currentPos.x, currentPos.z, RIPPLE_CONFIG.ENTRY_SCALE);
                    lastSplashTime.current = time;
                }
            }
        }
        else if (currentState === 'SKIM') {
            target.current.copy(skimEnd);
            const oscillation = Math.sin(time * 15) * 0.6; 
            target.current.y = -1.2 + oscillation; 
            desiredSpeed = 70;
            flapSpeed = 4.0; 
            
            if (Math.random() > 0.85) {
                 spawnRipple(currentPos.x, currentPos.z, RIPPLE_CONFIG.SKIM_SCALE); 
            }

            const distToTarget = new THREE.Vector2(currentPos.x, currentPos.z).distanceTo(new THREE.Vector2(target.current.x, target.current.z));
            if (distToTarget < 20) {
                state.current = 'CLIMB_MOUNTAIN';
            }
        }
        else if (currentState === 'CLIMB_MOUNTAIN') {
            target.current.set(MOUNTAIN_FIRE_CENTER.x - 100, 200, MOUNTAIN_FIRE_CENTER.z + 50); 
            desiredSpeed = 60;
            if (currentPos.distanceTo(target.current) < 60) {
                state.current = 'DIVE_BOMB';
            }
        }
        else if (currentState === 'DIVE_BOMB') {
            target.current.copy(MOUNTAIN_FIRE_CENTER); 
            target.current.y = 80;
            desiredSpeed = 90; 
            flapSpeed = 0.5; 
            
            if (currentPos.distanceTo(target.current) < 60) {
                state.current = 'PULL_UP';
            }
        }
        else if (currentState === 'PULL_UP') {
            target.current.set(MOUNTAIN_FIRE_CENTER.x, 250, MOUNTAIN_FIRE_CENTER.z - 100); 
            desiredSpeed = 60;
            flapSpeed = 2.5; 
            if (currentPos.y > 200) {
                state.current = 'APPROACH_LAKE'; 
            }
        }

        if (action) {
            const currentScale = action.getEffectiveTimeScale();
            action.setEffectiveTimeScale(THREE.MathUtils.lerp(currentScale, flapSpeed, dt * 5));
        }

        const desiredDir = new THREE.Vector3().subVectors(target.current, currentPos).normalize();
        const steer = desiredDir.multiplyScalar(desiredSpeed).sub(currentVel);
        currentVel.add(steer.multiplyScalar(turnSpeed * dt));
        
        if (currentVel.length() > desiredSpeed) {
            currentVel.setLength(desiredSpeed);
        }

        currentPos.add(currentVel.clone().multiplyScalar(dt));

        // Terrain collision
        const terrainHeight = getHeight(currentPos.x, currentPos.z);
        let safeAltitude = terrainHeight + 2.0; 

        if (terrainHeight < waterLevel) {
            if (currentState === 'SKIM' || currentState === 'DIVE_LAKE') {
                safeAltitude = waterLevel - 0.5; 
            } else {
                safeAltitude = waterLevel + 2.0;
            }
        } else {
            if (currentState === 'SKIM') {
                safeAltitude = terrainHeight + 5.0; 
            }
        }

        if (currentPos.y < safeAltitude) {
            currentPos.y = THREE.MathUtils.lerp(currentPos.y, safeAltitude, dt * 10);
            if (currentVel.y < 0) currentVel.y *= 0.5; 
        }

        // --- VISUAL UPDATES ---
        prevY.current = currentPos.y;
        groupRef.current.position.copy(currentPos);
        const lookTarget = currentPos.clone().add(currentVel);
        groupRef.current.lookAt(lookTarget);

        const up = new THREE.Vector3(0, 1, 0);
        let right = new THREE.Vector3(1, 0, 0);
        if (currentVel.lengthSq() > 0.1) {
             right.crossVectors(currentVel.clone().normalize(), up).normalize();
        }
        const bankAngle = -right.y * 1.5; 
        groupRef.current.rotateZ(bankAngle);

        const dummy = new THREE.Object3D();
        const color = new THREE.Color();
        const matrixZero = new THREE.Matrix4().set(0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0);

        // Update Ripples
        if (ripplesRef.current) {
            rippleData.current.forEach((p, i) => {
                if (p.active) {
                    p.life -= dt * RIPPLE_CONFIG.FADE_SPEED;
                    p.scale += dt * RIPPLE_CONFIG.EXPANSION_SPEED; 
                    if (p.life <= 0) {
                        p.active = false;
                        p.scale = 0;
                        ripplesRef.current!.setMatrixAt(i, matrixZero);
                    } else {
                        dummy.position.copy(p.pos);
                        dummy.rotation.x = -Math.PI / 2;
                        dummy.scale.set(p.scale, p.scale, 1);
                        dummy.updateMatrix();
                        ripplesRef.current!.setMatrixAt(i, dummy.matrix);
                        const brightness = Math.max(0, p.life / p.maxLife) * RIPPLE_CONFIG.BASE_OPACITY;
                        color.setRGB(brightness, brightness, brightness);
                        ripplesRef.current!.setColorAt(i, color);
                    }
                } else {
                    ripplesRef.current!.setMatrixAt(i, matrixZero);
                }
            });
            ripplesRef.current.instanceMatrix.needsUpdate = true;
            if (ripplesRef.current.instanceColor) ripplesRef.current.instanceColor.needsUpdate = true;
        }
    });

    return (
        <group>
            <group ref={groupRef} dispose={null}>
                 <primitive object={scene} scale={0.25} castShadow />
            </group>

            {/* Ripples */}
            <instancedMesh ref={ripplesRef} args={[undefined, undefined, RIPPLE_CONFIG.MAX_COUNT]}>
                <ringGeometry args={[RIPPLE_CONFIG.INNER_RADIUS, RIPPLE_CONFIG.OUTER_RADIUS, 32]} /> 
                <meshBasicMaterial 
                    color="#ffffff" 
                    blending={THREE.AdditiveBlending} 
                    side={THREE.DoubleSide} 
                    depthWrite={false}
                    transparent
                />
            </instancedMesh>
        </group>
    );
});

export default CinematicParrot;