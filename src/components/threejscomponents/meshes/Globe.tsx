import React, { useEffect, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { generateEarthTexture, generateBumpTexture } from '@/utils/textureGenerator';
import { getRandomPalette } from '@/utils/cosmicPalette';

const Globe: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const palette = useMemo(() => getRandomPalette(), []);

  const { colorMap, bumpMap } = useMemo(() => {
    return {
      colorMap: generateEarthTexture(),
      bumpMap: generateBumpTexture(),
    };
  }, []);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.0002;
    }
    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y += 0.0001;
    }
  });

  return (
    <group>
      {/* Main Globe */}
      <mesh ref={meshRef} castShadow receiveShadow>
        <sphereGeometry args={[0.5, 64, 64]} />
        <meshStandardMaterial
          map={colorMap}
          bumpMap={bumpMap}
          bumpScale={0.5}
          metalness={0.1}
          roughness={0.7}
          emissive={0x1a1a2e}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Atmospheric Glow Layer */}
      <mesh ref={atmosphereRef}>
        <sphereGeometry args={[0.52, 32, 32]} />
        <meshBasicMaterial
          color={palette.glow}
          transparent={true}
          opacity={0.08}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Outer Glow Ring */}
      <mesh>
        <ringGeometry args={[0.52, 0.55, 64]} />
        <meshBasicMaterial
          color={palette.secondary}
          transparent={true}
          opacity={0.15}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Equatorial Glow */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.5, 0.008, 16, 100]} />
        <meshStandardMaterial
          color={palette.accent}
          emissive={palette.accent as any}
          emissiveIntensity={0.8}
          metalness={0.3}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
};

export default Globe;
