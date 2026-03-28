import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

// Simplex noise implementation for organic displacement
function hash(n: number): number {
  const x = Math.sin(n) * 43758.5453123;
  return x - Math.floor(x);
}

function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix + iy * 57.0);
  const b = hash(ix + 1 + iy * 57.0);
  const c = hash(ix + (iy + 1) * 57.0);
  const d = hash(ix + 1 + (iy + 1) * 57.0);
  return a + (b - a) * ux + (c - a) * uy + (d - b - c + a) * ux * uy;
}

function fbm(x: number, y: number): number {
  let v = 0;
  let amp = 0.5;
  for (let i = 0; i < 4; i++) {
    v += amp * valueNoise(x, y);
    x *= 2;
    y *= 2;
    amp *= 0.5;
  }
  return v;
}

// Ease-in-out sine for smooth envelope
function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

// Colors from spec
const BONE = new THREE.Color('#c8b8a2');
const WARM_BONE = new THREE.Color('#e8ddd0');
const VOID = '#000000';

interface TorusSigilProps {
  cycleOffset?: number;
}

const TorusSigil: React.FC<TorusSigilProps> = ({ cycleOffset = 0 }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const geoRef = useRef<THREE.TorusGeometry | null>(null);
  const matRef = useRef<THREE.MeshStandardMaterial | null>(null);

  const CYCLE_DURATION = 8; // 8 seconds

  const geometry = useMemo(() => {
    // TorusGeometry(radius, tube, radialSegments, tubularSegments)
    const g = new THREE.TorusGeometry(1.0, 0.3, 64, 128);
    geoRef.current = g;
    return g;
  }, []);

  useFrame((state) => {
    if (!meshRef.current || !geoRef.current || !matRef.current) return;

    const t = state.clock.elapsedTime;
    const cycleTime = (t + cycleOffset) % CYCLE_DURATION;
    const cycleProgress = cycleTime / CYCLE_DURATION;

    // Displacement envelope: 0 -> peak (at 0.5) -> 0
    const envelopeT = cycleProgress < 0.5
      ? easeInOutSine(cycleProgress * 2)
      : easeInOutSine((1 - cycleProgress) * 2);
    const displacementAmp = envelopeT * 0.8;

    // Minor axis wobble (symmetry break)
    const wobble = Math.sin(t * 0.8) * envelopeT * 0.15;

    // Major axis rotation (constant slow spin)
    meshRef.current.rotation.y += 0.002;
    meshRef.current.rotation.x = wobble;
    meshRef.current.rotation.z = Math.sin(t * 0.5) * wobble * 0.5;

    // Vertex displacement
    const posAttr = geoRef.current.attributes.position;
    const arr = posAttr.array as Float32Array;
    const count = posAttr.count;

    for (let i = 0; i < count; i++) {
      const x = arr[i * 3];
      const y = arr[i * 3 + 1];
      const z = arr[i * 3 + 2];

      // Angle along the torus major circle
      const theta = Math.atan2(y, x);
      // Angle around the torus tube
      const phi = Math.atan2(z, Math.sqrt(x * x + y * y));

      // Layered noise for organic displacement
      const noise1 = fbm(theta * 3 + t * 0.3, phi * 5) - 0.5;
      const noise2 = fbm(theta * 6 - t * 0.2, phi * 10 + t * 0.1) - 0.5;
      const noise3 = Math.sin(theta * 8 + t * 0.5) * 0.3;
      const noise4 = Math.sin(phi * 12 - t * 0.3) * 0.2;

      const totalNoise = (noise1 + noise2 * 0.5 + noise3 + noise4) * displacementAmp;

      // Displace along the normal (outward from torus center)
      const dist = Math.sqrt(x * x + y * y);
      const nx = (x / dist) * totalNoise * 0.4;
      const ny = (y / dist) * totalNoise * 0.4;
      const nz = z > 0 ? totalNoise * 0.3 : -totalNoise * 0.1;

      arr[i * 3] = x + nx;
      arr[i * 3 + 1] = y + ny;
      arr[i * 3 + 2] = z + nz;
    }

    posAttr.needsUpdate = true;
    geoRef.current.computeVertexNormals();

    // Opacity breathing: 0.3 -> 1.0 -> 0.3
    const opacity = 0.3 + envelopeT * 0.7;
    matRef.current.opacity = opacity;

    // Color temperature shift
    const colorMix = envelopeT;
    matRef.current.color.lerpColors(WARM_BONE, BONE, colorMix);
    matRef.current.emissive.lerpColors(WARM_BONE, BONE, colorMix);
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        ref={matRef}
        color={BONE}
        emissive={WARM_BONE}
        emissiveIntensity={0.4}
        metalness={0.1}
        roughness={0.8}
        transparent
        opacity={0.3}
      />
    </mesh>
  );
};

const MauveZoneAlphabetScene: React.FC = () => {
  const cameraRef = useRef({ angle: 0 });

  useFrame((state) => {
    // Subtle slow orbit camera drift
    cameraRef.current.angle += 0.0002;
    state.camera.position.x = Math.sin(cameraRef.current.angle) * 0.3;
    state.camera.position.z = 5 + Math.cos(cameraRef.current.angle * 0.5) * 0.2;
    state.camera.lookAt(0, 0, 0);
  });

  return (
    <>
      {/* Void background */}
      <color attach="background" args={[VOID]} />

      {/* No traditional lights - emission only */}

      {/* Single torus sigil */}
      <TorusSigil />

      {/* Subtle bloom post-processing */}
      <EffectComposer>
        <Bloom
          intensity={0.3}
          luminanceThreshold={0.8}
          luminanceSmoothing={0.5}
          radius={0.5}
        />
      </EffectComposer>
    </>
  );
};

const MauveZoneAlphabet: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: VOID,
      }}
      className={className}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <MauveZoneAlphabetScene />
      </Canvas>
    </div>
  );
};

export default MauveZoneAlphabet;
