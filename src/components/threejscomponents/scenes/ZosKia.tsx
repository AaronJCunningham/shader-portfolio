'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

interface SpiralProps {
  radiusScale: number;
  tubeRadius: number;
  colorA: string;
  colorB: string;
  rotationSpeed: number;
  breathPeriod: number;
  breathMin: number;
  breathMax: number;
  noiseFreq: number;
  noiseAmp: number;
  driftPeriodX: number;
  driftPeriodY: number;
  isZos: boolean;
}

function Spiral({
  radiusScale, tubeRadius, colorA, colorB,
  rotationSpeed, breathPeriod, breathMin, breathMax,
  noiseFreq, noiseAmp, driftPeriodX, driftPeriodY, isZos
}: SpiralProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const timeRef = useRef(0);
  const pauseRef = useRef(false);
  const pauseUntilRef = useRef(0);
  const observerTimerRef = useRef(Math.random() * 15 + 25); // 25-40s initial

  const geometry = useMemo(() => {
    const geo = new THREE.TorusKnotGeometry(1 * radiusScale, tubeRadius, 220, 8, 2, 3);
    return geo;
  }, [radiusScale, tubeRadius]);

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorA),
      emissive: new THREE.Color(colorA),
      emissiveIntensity: 0.4,
      roughness: 0.3,
      metalness: 0.6,
    });
  }, [colorA, colorB]);

  // Update emissive color blend based on time
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    timeRef.current = t;

    // Observer pause logic
    observerTimerRef.current -= 0.016;
    if (observerTimerRef.current <= 0) {
      pauseRef.current = true;
      pauseUntilRef.current = t + 1.2;
      observerTimerRef.current = Math.random() * 15 + 25;
    }
    if (pauseRef.current && t >= pauseUntilRef.current) {
      pauseRef.current = false;
    }

    // Rotation — paused during observer moment
    if (!pauseRef.current) {
      meshRef.current.rotation.y += rotationSpeed;
    }

    // Breathing scale
    const breathPhase = (t / breathPeriod) * Math.PI * 2;
    const breath = breathMin + (breathMax - breathMin) * (0.5 + 0.5 * Math.sin(breathPhase));
    meshRef.current.scale.setScalar(breath);

    // Figure-8 drift
    const driftX = Math.sin(t * (Math.PI * 2) / driftPeriodX) * 0.15;
    const driftY = Math.cos(t * (Math.PI * 2) / driftPeriodY) * 0.1;
    meshRef.current.position.set(driftX, driftY, 0);

    // Observer pulse: full brightness when pausing
    const observerIntensity = pauseRef.current ? 1.0 : 0.4;
    (meshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = observerIntensity;

    // Color blend from A to B based on breath
    const blend = 0.5 + 0.5 * Math.sin(breathPhase);
    const c = new THREE.Color(colorA).lerp(new THREE.Color(colorB), blend);
    (meshRef.current.material as THREE.MeshStandardMaterial).color = c;
    (meshRef.current.material as THREE.MeshStandardMaterial).emissive = c;
  });

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} />
  );
}

function ZosKiaScene() {
  return (
    <>
      <color attach="background" args={['#050000']} />
      <fogExp2 attach="fog" args={['#050000', 0.08]} />
      <ambientLight intensity={0.1} />
      <pointLight position={[0, 0, 3]} intensity={0.5} color="#cc0000" />
      <pointLight position={[0, 0, -3]} intensity={0.3} color="#ffdd44" />

      {/* Zos — blood red, clockwise */}
      <Spiral
        radiusScale={1.0}
        tubeRadius={0.006}
        colorA="#660000"
        colorB="#cc0000"
        rotationSpeed={0.003}
        breathPeriod={7}
        breathMin={0.92}
        breathMax={1.08}
        noiseFreq={2.5}
        noiseAmp={0.015}
        driftPeriodX={12}
        driftPeriodY={12}
        isZos={true}
      />

      {/* Kia — gold, counter-clockwise */}
      <Spiral
        radiusScale={0.7}
        tubeRadius={0.003}
        colorA="#cc9900"
        colorB="#ffdd44"
        rotationSpeed={-0.002}
        breathPeriod={9}
        breathMin={0.88}
        breathMax={1.12}
        noiseFreq={3.5}
        noiseAmp={0.01}
        driftPeriodX={15}
        driftPeriodY={15}
        isZos={false}
      />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.1}
          luminanceSmoothing={0.9}
          intensity={0.7}
          radius={0.5}
        />
      </EffectComposer>
    </>
  );
}

export default function ZosKia() {
  return (
    <Canvas>
      <ZosKiaScene />
    </Canvas>
  );
}
