import React from 'react';

export interface Position {
    x: number;
    y: number;
    z: number;
}

export interface CloudData {
    x: number;
    y: number;
    z: number;
    speed: number;
    scale: number;
}

// Augment global JSX namespace to include Three.js elements
// We use interface merging to add these to the existing HTML elements provided by React
declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      meshStandardMaterial: any;
      planeGeometry: any;
      meshPhysicalMaterial: any;
      instancedMesh: any;
      cylinderGeometry: any;
      icosahedronGeometry: any;
      sprite: any;
      spriteMaterial: any;
      fog: any;
      ambientLight: any;
      directionalLight: any;
      orthographicCamera: any;
      hemisphereLight: any;
      primitive: any;
      ringGeometry: any;
      meshBasicMaterial: any;
      pointLight: any;
    }
  }
}
