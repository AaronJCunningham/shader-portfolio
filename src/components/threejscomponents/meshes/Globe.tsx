import React, { useEffect, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { generateEarthTexture, generateBumpTexture } from '@/utils/textureGenerator';

const Globe: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Generate textures once
  const { colorMap, bumpMap } = useMemo(() => {
    return {
      colorMap: generateEarthTexture(),
      bumpMap: generateBumpTexture(),
    };
  }, []);

  // Gentle auto-rotation
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.0002;
    }
  });

  return (
    <mesh ref={meshRef} castShadow receiveShadow>
      <sphereGeometry args={[0.5, 64, 64]} />
      <meshStandardMaterial
        map={colorMap}
        bumpMap={bumpMap}
        bumpScale={0.5}
        metalness={0}
        roughness={0.8}
      />
    </mesh>
  );
};

export default Globe;
