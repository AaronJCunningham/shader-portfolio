import React from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';

const RectPlane: React.FC = () => {
  return (
    <mesh position={[0, 0, 0]}>
      <planeGeometry args={[4, 3]} />
      <meshStandardMaterial color="#9b4dca" side={THREE.DoubleSide} />
    </mesh>
  );
};

const MauveZoneScene: React.FC = () => {
  return (
    <Canvas
      style={{ width: '100vw', height: '100vh' }}
      camera={{ position: [0, 0, 5] }}
    >
      <color attach="background" args={['#1a0a1f']} />
      <ambientLight intensity={0.6} />
      <pointLight position={[5, 5, 5]} intensity={1.2} color="#d4a0ff" />
      <RectPlane />
    </Canvas>
  );
};

export default MauveZoneScene;
