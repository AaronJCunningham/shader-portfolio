import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

// ─── Constants ───────────────────────────────────────────────────────────────
const RING_COUNT = 22;
const COLORS = ['#ff99ff', '#c44dff', '#6b0f6b', '#6b0f6b', '#1a0a2e'];

function getRingColor(idx: number): string {
  const t = idx / (RING_COUNT - 1);
  if (t < 0.3) return '#ff99ff';
  if (t < 0.6) return '#c44dff';
  if (t < 0.8) return '#6b0f6b';
  return '#1a0a2e';
}

// ─── Noise helpers (CPU-side) ─────────────────────────────────────────────────
function hash(n: number): number {
  return Math.abs(Math.sin(n) * 43758.5453123) % 1;
}

function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const a = hash(ix + iy * 57);
  const b = hash(ix + 1 + iy * 57);
  const c = hash(ix + (iy + 1) * 57);
  const d = hash(ix + 1 + (iy + 1) * 57);
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

// ─── Ring Component ────────────────────────────────────────────────────────────
interface RingProps {
  index: number;
  total: number;
}

const Ring: React.FC<RingProps> = ({ index, total }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Each ring has its own cycle
  const cycleDur = useMemo(() => 25 + hash(index * 7.31 + 1) * 15, [index]);
  const phaseOffset = useMemo(() => hash(index * 3.17 + 2) * cycleDur, [cycleDur, index]);
  const direction = useMemo(() => (hash(index * 11.3) > 0.5 ? 1 : -1), [index]);

  // Logarithmic spacing
  const baseRadius = useMemo(() => {
    const inner = 0.25, outer = 4.8;
    const t = index / (total - 1);
    return inner * Math.pow(outer / inner, Math.pow(t, 0.65));
  }, [index, total]);

  const geometry = useMemo(
    () => new THREE.TorusGeometry(baseRadius, 0.015, 8, 256),
    [baseRadius]
  );

  const color = useMemo(() => new THREE.Color(getRingColor(index)), [index]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = ((clock.getElapsedTime() + phaseOffset) % cycleDur) / cycleDur;

    // Phase breakpoints: 0-0.3 chaos, 0.3-0.5 cohering, 0.5-0.65 form, 0.65-0.85 dissolving, 0.85-1.0 chaos
    let chaosAmt: number;
    if (t < 0.3) chaosAmt = 1;
    else if (t < 0.5) chaosAmt = 1 - (t - 0.3) / 0.2;
    else if (t < 0.65) chaosAmt = 0;
    else if (t < 0.85) chaosAmt = (t - 0.65) / 0.2;
    else chaosAmt = 1;

    const mat = meshRef.current.material as THREE.MeshBasicMaterial;

    // During chaos: desaturate + erratic fast rotation
    const chaosColor = new THREE.Color('#1a0a2e').lerp(color, 1 - chaosAmt * 0.8);
    mat.color = chaosColor;

    // Rotation: fast during chaos, slow during form
    const rotSpeed = chaosAmt > 0.1
      ? 0.015 * chaosAmt * direction
      : 0.001 * direction;
    meshRef.current.rotation.z += rotSpeed;

    // Subtle breathing scale
    const breathAmp = 0.03 * Math.sin(clock.getElapsedTime() * 0.5 + index * 0.7);
    const scale = 1 + breathAmp;
    meshRef.current.scale.setScalar(scale);
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshBasicMaterial color={color} side={THREE.DoubleSide} transparent />
    </mesh>
  );
};

// ─── Ring Field ───────────────────────────────────────────────────────────────
const RingField: React.FC = () => (
  <>
    {Array.from({ length: RING_COUNT }, (_, i) => (
      <Ring key={i} index={i} total={RING_COUNT} />
    ))}
  </>
);

// ─── Scene ────────────────────────────────────────────────────────────────────
const SceneContent: React.FC = () => (
  <>
    <color attach="background" args={['#0a0510']} />
    <fogExp2 attach="fog" args={['#0a0510', 0.07]} />
    <perspectiveCamera position={[0, 0, 6]} fov={55} />
    <ambientLight intensity={0.1} />
    <pointLight position={[0, 0, 3]} intensity={1.5} color="#c44dff" />
    <pointLight position={[-2, 1, 2]} intensity={0.5} color="#ff99ff" />
    <pointLight position={[1, -2, 1]} intensity={0.3} color="#6b0f6b" />
    <RingField />
  </>
);

// ─── Post FX ──────────────────────────────────────────────────────────────────
const PostFX: React.FC = () => (
  <EffectComposer>
    <Bloom
      luminanceThreshold={0.05}
      luminanceSmoothing={0.9}
      intensity={0.8}
      radius={0.7}
    />
  </EffectComposer>
);

// ─── Export ───────────────────────────────────────────────────────────────────
const VertigoHomecoming: React.FC = () => (
  <Canvas
    style={{ width: '100vw', height: '100vh' }}
    gl={{ antialias: true, alpha: false }}
    dpr={[1, 2]}
  >
    <SceneContent />
    <PostFX />
  </Canvas>
);

export default VertigoHomecoming;
