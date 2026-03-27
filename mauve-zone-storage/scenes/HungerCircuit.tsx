import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

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
  for (let i = 0; i < 3; i++) {
    v += amp * valueNoise(x, y);
    x *= 2;
    y *= 2;
    amp *= 0.5;
  }
  return v;
}

const PALETTE = ['#e0e0e0', '#c0c0c0', '#888888', '#444444', '#1a1a1a'];

function getColor(i: number, total: number): THREE.Color {
  const t = i / (total - 1);
  if (t < 0.3) return new THREE.Color(PALETTE[0]);
  if (t < 0.5) return new THREE.Color(PALETTE[1]);
  if (t < 0.7) return new THREE.Color(PALETTE[2]);
  if (t < 0.9) return new THREE.Color(PALETTE[3]);
  return new THREE.Color(PALETTE[4]);
}

interface RingProps {
  index: number;
  baseRadius: number;
  color: THREE.Color;
}

const RingWithMotion: React.FC<RingProps> = ({ index, baseRadius, color }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const geoRef = useRef<THREE.TorusGeometry | null>(null);

  const rs = useRef({
    breathPhase: Math.random() * Math.PI * 2,
    rotSpeed: 0.001 + Math.random() * 0.001,
    dir: Math.random() > 0.5 ? 1 : -1,
    jitterCur: 0.5 + Math.random() * 0.5,
    jitterTgt: 0.5 + Math.random() * 0.5,
    jitterStart: 0.5 + Math.random() * 0.5,
    jitterStartT: 0,
    normalTgt: 0.5 + Math.random() * 0.5,
    initialized: false,
  });

  const geometry = useMemo(() => {
    const g = new THREE.TorusGeometry(1, 0.008, 6, 128);
    geoRef.current = g;
    return g;
  }, []);

  useFrame((state) => {
    if (!meshRef.current || !geoRef.current) return;
    const tMs = state.clock.elapsedTime * 1000;
    const tSec = state.clock.elapsedTime;
    const r = rs.current;

    if (tMs - r.jitterStartT > 10000 || !r.initialized) {
      r.jitterStartT = tMs;
      r.jitterStart = r.jitterCur;
      r.jitterTgt = r.normalTgt;
      r.initialized = true;
    }

    const elapsed = tMs - r.jitterStartT;
    const progress = Math.min(elapsed / 2000, 1);
    const eased = progress < 0.5
      ? 2 * progress * progress
      : -1 + (4 - 2 * progress) * progress;
    r.jitterCur = r.jitterStart + (r.jitterTgt - r.jitterStart) * eased;

    const breathScale = 0.94 + 0.12 * ((Math.sin(tSec * 0.7 + r.breathPhase) + 1) / 2);
    const radius = baseRadius * (0.5 + r.jitterCur * 0.5) * breathScale;
    meshRef.current.scale.set(radius, radius, 1);
    meshRef.current.rotation.z += r.rotSpeed * r.dir;

    const posAttr = geoRef.current.attributes.position;
    const arr = posAttr.array as Float32Array;
    for (let i = 0; i < arr.length; i += 3) {
      const lx = arr[i];
      const ly = arr[i + 1];
      const angle = Math.atan2(ly, lx);
      const noise = fbm(angle * 2.5 + index * 0.7, tSec * 0.08) - 0.5;
      const disp = noise * 0.04 * radius;
      arr[i] += Math.cos(angle) * disp;
      arr[i + 1] += Math.sin(angle) * disp;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshBasicMaterial color={color} transparent opacity={0.85} />
    </mesh>
  );
};

const FilmGrain: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;
      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
      }
      void main() {
        float noise = random(vUv * 1000.0 + uTime * 100.0);
        gl_FragColor = vec4(vec3(noise), 0.04);
      }
    `,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  }), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    (meshRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 2]} renderOrder={1000} material={mat}>
      <planeGeometry args={[10, 10]} />
    </mesh>
  );
};

const RING_COUNT = 20;
const BASE_INNER = 0.3;
const BASE_OUTER = 2.5;

const HungerCircuitScene: React.FC = () => {
  const almostRef = useRef({
    timer: 0,
    nextInterval: 20000 + Math.random() * 10000,
    inAlmost: false,
    almostStart: 0,
  });

  const ringData = useMemo(() => {
    return Array.from({ length: RING_COUNT }, (_, i) => {
      const t = i / (RING_COUNT - 1);
      const logR = BASE_INNER + (BASE_OUTER - BASE_INNER) * (Math.log(1 + t * 9) / Math.log(10));
      return { baseRadius: logR, color: getColor(i, RING_COUNT) };
    });
  }, []);

  useFrame((state) => {
    const tMs = state.clock.elapsedTime * 1000;
    const a = almostRef.current;
    if (!a.inAlmost && tMs - a.timer > a.nextInterval) {
      a.inAlmost = true;
      a.almostStart = tMs;
      a.timer = tMs;
      a.nextInterval = 20000 + Math.random() * 10000;
    }
    if (a.inAlmost && tMs - a.almostStart > 1500) {
      a.inAlmost = false;
    }
  });

  return (
    <>
      <color attach="background" args={['#050505']} />
      <fogExp2 attach="fog" args={['#050505', 0.15]} />
      <ambientLight intensity={0.3} />
      {ringData.map((d, i) => (
        <RingWithMotion key={i} index={i} baseRadius={d.baseRadius} color={d.color} />
      ))}
      <EffectComposer>
        <Bloom intensity={0.5} />
      </EffectComposer>
      <FilmGrain />
    </>
  );
};

const HungerCircuit: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#050505' }}
      className={className}
    >
      <Canvas camera={{ position: [0, 0, 5], fov: 60 }} gl={{ antialias: true, alpha: false }} dpr={[1, 2]}>
        <HungerCircuitScene />
      </Canvas>
    </div>
  );
};

export default HungerCircuit;
