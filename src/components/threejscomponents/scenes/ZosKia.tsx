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
  const observerTimerRef = useRef(Math.random() * 15 + 25);

  const geometry = useMemo(() => {
    return new THREE.TorusKnotGeometry(1 * radiusScale, tubeRadius, 220, 8, 2, 3);
  }, [radiusScale, tubeRadius]);

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorA),
      emissive: new THREE.Color(colorA),
      emissiveIntensity: 0.4,
      roughness: 0.3,
      metalness: 0.6,
    });
  }, [colorA]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    timeRef.current = t;

    observerTimerRef.current -= 0.016;
    if (observerTimerRef.current <= 0) {
      pauseRef.current = true;
      pauseUntilRef.current = t + 1.2;
      observerTimerRef.current = Math.random() * 15 + 25;
    }
    if (pauseRef.current && t >= pauseUntilRef.current) {
      pauseRef.current = false;
    }

    if (!pauseRef.current) {
      meshRef.current.rotation.y += rotationSpeed;
    }

    const breathPhase = (t / breathPeriod) * Math.PI * 2;
    const breath = breathMin + (breathMax - breathMin) * (0.5 + 0.5 * Math.sin(breathPhase));
    meshRef.current.scale.setScalar(breath);

    const driftX = Math.sin(t * (Math.PI * 2) / driftPeriodX) * 0.15;
    const driftY = Math.cos(t * (Math.PI * 2) / driftPeriodY) * 0.1;
    meshRef.current.position.set(driftX, driftY, 0);

    const observerIntensity = pauseRef.current ? 1.0 : 0.4;
    (meshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = observerIntensity;

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

      {/* 20 spirals — mixed signal grey, blood red, gold */}
      <Spiral radiusScale={1.8} tubeRadius={0.004} colorA="#660000" colorB="#cc0000" rotationSpeed={0.001} breathPeriod={11} breathMin={0.90} breathMax={1.10} noiseFreq={1.5} noiseAmp={0.008} driftPeriodX={20} driftPeriodY={18} isZos={true} />
      <Spiral radiusScale={1.5} tubeRadius={0.003} colorA="#cc9900" colorB="#ffdd44" rotationSpeed={-0.0015} breathPeriod={8} breathMin={0.88} breathMax={1.12} noiseFreq={2.0} noiseAmp={0.010} driftPeriodX={14} driftPeriodY={16} isZos={false} />
      <Spiral radiusScale={1.2} tubeRadius={0.005} colorA="#1a1a1a" colorB="#888888" rotationSpeed={0.002} breathPeriod={13} breathMin={0.92} breathMax={1.08} noiseFreq={2.5} noiseAmp={0.012} driftPeriodX={22} driftPeriodY={19} isZos={false} />
      <Spiral radiusScale={1.0} tubeRadius={0.004} colorA="#660000" colorB="#aa0000" rotationSpeed={-0.0025} breathPeriod={9} breathMin={0.85} breathMax={1.15} noiseFreq={3.0} noiseAmp={0.009} driftPeriodX={17} driftPeriodY={21} isZos={true} />
      <Spiral radiusScale={0.85} tubeRadius={0.003} colorA="#cc9900" colorB="#ffcc00" rotationSpeed={0.0018} breathPeriod={10} breathMin={0.90} breathMax={1.10} noiseFreq={2.2} noiseAmp={0.011} driftPeriodX={19} driftPeriodY={15} isZos={false} />
      <Spiral radiusScale={0.7} tubeRadius={0.004} colorA="#444444" colorB="#e0e0e0" rotationSpeed={-0.0012} breathPeriod={7} breathMin={0.87} breathMax={1.13} noiseFreq={3.5} noiseAmp={0.008} driftPeriodX={13} driftPeriodY={23} isZos={false} />
      <Spiral radiusScale={0.6} tubeRadius={0.003} colorA="#770000" colorB="#dd2200" rotationSpeed={0.0022} breathPeriod={12} breathMin={0.91} breathMax={1.09} noiseFreq={1.8} noiseAmp={0.013} driftPeriodX={24} driftPeriodY={17} isZos={true} />
      <Spiral radiusScale={0.5} tubeRadius={0.0025} colorA="#cc8800" colorB="#ffee44" rotationSpeed={-0.001} breathPeriod={6} breathMin={0.86} breathMax={1.14} noiseFreq={4.0} noiseAmp={0.007} driftPeriodX={11} driftPeriodY={20} isZos={false} />
      <Spiral radiusScale={1.6} tubeRadius={0.0035} colorA="#333333" colorB="#777777" rotationSpeed={0.0008} breathPeriod={14} breathMin={0.93} breathMax={1.07} noiseFreq={1.6} noiseAmp={0.010} driftPeriodX={25} driftPeriodY={22} isZos={false} />
      <Spiral radiusScale={1.3} tubeRadius={0.0045} colorA="#aa4400" colorB="#ff6600" rotationSpeed={-0.0028} breathPeriod={8.5} breathMin={0.89} breathMax={1.11} noiseFreq={2.8} noiseAmp={0.009} driftPeriodX={16} driftPeriodY={18} isZos={false} />
      <Spiral radiusScale={0.95} tubeRadius={0.0032} colorA="#550000" colorB="#990000" rotationSpeed={0.0014} breathPeriod={9.5} breathMin={0.88} breathMax={1.12} noiseFreq={3.2} noiseAmp={0.011} driftPeriodX={18} driftPeriodY={14} isZos={true} />
      <Spiral radiusScale={0.75} tubeRadius={0.0028} colorA="#ddbb00" colorB="#ffee88" rotationSpeed={-0.0016} breathPeriod={7.5} breathMin={0.90} breathMax={1.10} noiseFreq={2.6} noiseAmp={0.008} driftPeriodX={12} driftPeriodY={24} isZos={false} />
      <Spiral radiusScale={0.55} tubeRadius={0.0038} colorA="#2a2a2a" colorB="#666666" rotationSpeed={0.002} breathPeriod={11.5} breathMin={0.92} breathMax={1.08} noiseFreq={1.9} noiseAmp={0.012} driftPeriodX={21} driftPeriodY={16} isZos={false} />
      <Spiral radiusScale={1.45} tubeRadius={0.0033} colorA="#880000" colorB="#cc0000" rotationSpeed={-0.0011} breathPeriod={10.5} breathMin={0.87} breathMax={1.13} noiseFreq={3.8} noiseAmp={0.010} driftPeriodX={15} driftPeriodY={19} isZos={true} />
      <Spiral radiusScale={1.1} tubeRadius={0.0042} colorA="#bb9900" colorB="#ffcc22" rotationSpeed={0.0026} breathPeriod={8} breathMin={0.91} breathMax={1.09} noiseFreq={2.1} noiseAmp={0.009} driftPeriodX={23} driftPeriodY={13} isZos={false} />
      <Spiral radiusScale={0.8} tubeRadius={0.0036} colorA="#1a1a1a" colorB="#444444" rotationSpeed={-0.0019} breathPeriod={12.5} breathMin={0.89} breathMax={1.11} noiseFreq={2.4} noiseAmp={0.011} driftPeriodX={17} driftPeriodY={25} isZos={false} />
      <Spiral radiusScale={0.65} tubeRadius={0.003} colorA="#993300" colorB="#ee5500" rotationSpeed={0.0013} breathPeriod={6.5} breathMin={0.86} breathMax={1.14} noiseFreq={4.2} noiseAmp={0.008} driftPeriodX={10} driftPeriodY={22} isZos={false} />
      <Spiral radiusScale={0.45} tubeRadius={0.0034} colorA="#666600" colorB="#aaaa00" rotationSpeed={-0.0024} breathPeriod={13.5} breathMin={0.93} breathMax={1.07} noiseFreq={1.7} noiseAmp={0.013} driftPeriodX={26} driftPeriodY={12} isZos={false} />

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
    <Canvas style={{ width: '100%', height: '100%', display: 'block' }}>
      <ZosKiaScene />
    </Canvas>
  );
}
