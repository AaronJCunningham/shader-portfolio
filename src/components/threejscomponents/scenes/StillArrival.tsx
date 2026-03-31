'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

// ─── Palette ────────────────────────────────────────────────────────────────
const C = {
  bg: '#0a0000',
  core: '#1a0000',
  dark: '#660000',
  arterial: '#cc0000',
  gold: '#cc9900',
  bright: '#ffdd44',
};

// ─── Primary Form Shaders ────────────────────────────────────────────────────
const formVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;

  uniform float uTime;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vUv = uv;

    float breath = 0.97 + 0.06 * (0.5 + 0.5 * sin(uTime * 0.15 * 3.14159 * 2.0));
    vec3 p = position * breath;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const formFragmentShader = /* glsl */ `
  precision highp float;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;

  uniform float uTime;

  vec3 cCore   = vec3(0.10, 0.00, 0.00);
  vec3 cDark   = vec3(0.40, 0.00, 0.00);
  vec3 cArtery = vec3(0.80, 0.00, 0.00);
  vec3 cGold   = vec3(0.80, 0.60, 0.00);
  vec3 cBright = vec3(1.00, 0.87, 0.27);

  float hash(vec3 p) {
    p = fract(p * vec3(443.8975, 397.2973, 491.1871));
    p += dot(p, p.yxz + 19.19);
    return fract((p.x + p.y) * p.z);
  }
  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x),
          mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
          mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y),
      f.z
    );
  }

  void main() {
    vec3 n = normalize(vNormal);
    float side = step(0.0, n.x);
    float noiseVal = noise(vPosition * 2.5 + uTime * 0.04) * side * 0.12;
    vec3 viewDir = normalize(cameraPosition - vPosition);
    float fresnel = pow(1.0 - max(0.0, dot(n, viewDir)), 3.0);
    float t = fresnel * 0.7 + noiseVal * 2.0;
    t = clamp(t, 0.0, 1.0);
    vec3 col = cDark;
    col = mix(col, cArtery, smoothstep(0.2, 0.6, t));
    col = mix(col, cGold,   smoothstep(0.6, 0.85, t));
    col = mix(col, cBright, smoothstep(0.85, 1.0, t));
    float pulse = 0.5 + 0.5 * sin(uTime * 0.15 * 3.14159 * 2.0);
    col *= 0.85 + 0.15 * pulse;
    gl_FragColor = vec4(col, 1.0);
  }
`;

// ─── Glyph Line Shaders ──────────────────────────────────────────────────────
const glyphVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSpeed;
  uniform vec3 uAxis;
  uniform float uOffset;

  varying float vT;

  mat3 rotateAxis(vec3 axis, float a) {
    axis = normalize(axis);
    float s = sin(a), c = cos(a), oc = 1.0 - c;
    return mat3(
      oc*axis.x*axis.x+c,           oc*axis.x*axis.y-axis.z*s,  oc*axis.z*axis.x+axis.y*s,
      oc*axis.x*axis.y+axis.z*s,    oc*axis.y*axis.y+c,         oc*axis.y*axis.z-axis.x*s,
      oc*axis.z*axis.x-axis.y*s,    oc*axis.y*axis.z+axis.x*s,  oc*axis.z*axis.z+c
    );
  }

  void main() {
    float angle = uTime * uSpeed + uOffset;
    vec3 p = rotateAxis(uAxis, angle) * position;
    vT = uv.x;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const glyphFragmentShader = /* glsl */ `
  precision highp float;
  varying float vT;
  void main() {
    vec3 gold = vec3(0.80, 0.60, 0.0);
    gl_FragColor = vec4(gold, 1.0);
  }
`;

// ─── Particle Shaders ───────────────────────────────────────────────────────
const particleVertexShader = /* glsl */ `
  attribute float aPhase;
  attribute float aSize;
  attribute float aRadius;

  uniform float uTime;

  varying float vAlpha;
  varying float vRadius;

  void main() {
    float drift = sin(uTime * 0.5236 + aPhase) * 0.3;
    float scale = 1.0 + drift * 0.4;
    vec3 p = position * scale;
    float breath = 0.5 + 0.5 * sin(uTime * 0.15 * 6.28318);
    float sz = aSize * (0.8 + 0.2 * breath);
    vRadius = aRadius;
    vAlpha = 0.4 + 0.3 * breath;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = sz * (300.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const particleFragmentShader = /* glsl */ `
  precision highp float;
  varying float vAlpha;
  varying float vRadius;

  vec3 cArtery = vec3(0.80, 0.0, 0.0);
  vec3 cBright = vec3(1.00, 0.87, 0.27);

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float alpha = (1.0 - smoothstep(0.2, 0.5, d)) * vAlpha;
    vec3 col = mix(cArtery, cBright, smoothstep(0.0, 0.5, d));
    gl_FragColor = vec4(col, alpha);
  }
`;

// ─── Primary Form ────────────────────────────────────────────────────────────
function ArrivalForm() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const matRef = useRef<THREE.ShaderMaterial>(null!);

  const geometry = useMemo(() => new THREE.SphereGeometry(1, 64, 64), []);

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: formVertexShader,
    fragmentShader: formFragmentShader,
    uniforms: { uTime: { value: 0 } },
  }), []);

  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = clock.getElapsedTime();
    if (meshRef.current) meshRef.current.scale.set(0.9, 1.4, 0.9);
  });

  return (
    <mesh ref={meshRef} geometry={geometry} scale={[0.9, 1.4, 0.9]}>
      <primitive object={material} ref={matRef} attach="material" />
    </mesh>
  );
}

// ─── Glyph Lines ─────────────────────────────────────────────────────────────
const glyphConfigs = [
  { axis: [1, 0.3, 0.1], speed: 0.03, offset: 0.0,  radius: 1.6, y: 0.0  },
  { axis: [0.2, 1, 0.4], speed: 0.05, offset: 1.1,  radius: 1.5, y: 0.2  },
  { axis: [0.7, 0.2, 1], speed: 0.02, offset: 2.2,  radius: 1.7, y: -0.1 },
  { axis: [0.3, 0.8, 0.2], speed: 0.04, offset: 0.7, radius: 1.4, y: 0.3  },
  { axis: [1, 0.1, 0.6], speed: 0.06, offset: 3.1,  radius: 1.6, y: -0.2 },
  { axis: [0.5, 0.9, 0.3], speed: 0.025, offset: 1.8, radius: 1.5, y: 0.1  },
  { axis: [0.9, 0.4, 1], speed: 0.035, offset: 2.7, radius: 1.7, y: -0.3 },
  { axis: [0.1, 0.6, 0.8], speed: 0.055, offset: 0.3, radius: 1.4, y: 0.4  },
  { axis: [0.8, 0.3, 0.9], speed: 0.028, offset: 1.5, radius: 1.6, y: 0.25 },
  { axis: [0.4, 1, 0.5], speed: 0.045, offset: 2.9,  radius: 1.5, y: -0.15 },
];

function GlyphLine({ axis, speed, offset, radius, y }: typeof glyphConfigs[0]) {
  const matRef = useRef<THREE.ShaderMaterial>(null!);

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: glyphVertexShader,
    fragmentShader: glyphFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uSpeed: { value: speed },
      uAxis: { value: new THREE.Vector3(...axis) },
      uOffset: { value: offset },
    },
    transparent: true,
  }), [axis, speed, offset]);

  const geometry = useMemo(() => new THREE.CapsuleGeometry(0.005, radius * 2, 4, 16), [radius]);

  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <mesh geometry={geometry} position={[0, y, 0]}>
      <primitive object={material} ref={matRef} attach="material" />
    </mesh>
  );
}

// ─── Particle Dissolution Layer ─────────────────────────────────────────────
function DissolutionLayer() {
  const COUNT = 1000;

  const { positions, phases, sizes, radii } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const ph = new Float32Array(COUNT);
    const sz = new Float32Array(COUNT);
    const rad = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      const r = 1.8 + Math.random() * 0.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      ph[i] = Math.random() * Math.PI * 2;
      sz[i] = 8 + Math.random() * 16;
      rad[i] = (r - 1.8) / 0.8;
    }
    return { positions: pos, phases: ph, sizes: sz, radii: rad };
  }, []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aRadius', new THREE.BufferAttribute(radii, 1));
    return geo;
  }, [positions, phases, sizes, radii]);

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: particleVertexShader,
    fragmentShader: particleFragmentShader,
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), []);

  const matRef = useRef<THREE.ShaderMaterial>(null!);

  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <points geometry={geometry}>
      <primitive object={material} ref={matRef} attach="material" />
    </points>
  );
}

// ─── Scene ───────────────────────────────────────────────────────────────────
function StillArrivalScene() {
  return (
    <>
      <color attach="background" args={[C.bg]} />
      <fogExp2 attach="fog" args={[C.bg, 0.05]} />
      <ArrivalForm />
      {glyphConfigs.map((cfg, i) => <GlyphLine key={i} {...cfg} />)}
      <DissolutionLayer />
      <EffectComposer>
        <Bloom luminanceThreshold={0.15} luminanceSmoothing={0.9} intensity={0.8} radius={0.6} />
      </EffectComposer>
    </>
  );
}

// ─── Exported Canvas ─────────────────────────────────────────────────────────
export default function StillArrival() {
  return (
    <Canvas
      style={{ width: '100%', height: '100%', display: 'block' }}
      camera={{ position: [0, 0, 4], fov: 60 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
    >
      <StillArrivalScene />
    </Canvas>
  );
}
