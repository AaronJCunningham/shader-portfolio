import React, { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import Globe from '../meshes/Globe';
import Satellites from '../meshes/Satellites';

interface GlobeSceneProps {
  width?: string | number;
  height?: string | number;
}

const GlobeSceneInner: React.FC = () => {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.z = 2;
  }, [camera]);

  return (
    <>
      <OrbitControls 
        enableZoom={true}
        enablePan={true}
        enableRotate={true}
      />
      <ambientLight intensity={0.5} />
      <pointLight position={[1, 0.3, 1]} intensity={1.5} />
      <Globe />
      <Satellites />
    </>
  );
};

const GlobeScene: React.FC<GlobeSceneProps> = ({ 
  width = '100%', 
  height = '100vh' 
}) => {
  return (
    <div style={{ width, height }}>
      <Canvas camera={{ position: [0, 0, 2], fov: 45 }}>
        <GlobeSceneInner />
      </Canvas>
    </div>
  );
};

export default GlobeScene;
