'use client';

/**
 * Grief Still Rings — Steffi Grant / typhonian transmission / the mauve zone
 *
 * Oracle seed: 748096
 * Artist: Steffi Grant — The Mauve Zone
 * Emotional state: grief that has become still
 * Geometric seed: concentric rings with irregular spacing
 * Palette: signal grey — #050505, #1a1a1a, #444444, #888888, #e0e0e0
 * Constraint: motion must feel involuntary — like breathing, not walking
 * Artist note: "Precision is not safety. Be exact about strange things."
 *
 * 40-second cycle: void → rings assembling → full form holds + breathes → slow dissolution → void
 * 22 concentric rings, irregular spacing, noise-driven pulse, no sin(t) oscillation.
 */

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';

// ─── Simplex3D GLSL (inline, Gustavson-derived) ───────────────────────────────
const SIMPLEX3D_GLSL = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

// ─── Cycle constants ──────────────────────────────────────────────────────────
const CYCLE_TOTAL = 40.0;    // seconds
const PHASE_VOID_IN = 4.0;   // 0..4   — void
const PHASE_ASSEMBLE = 14.0; // 4..14  — rings assemble
const PHASE_HOLD = 24.0;     // 14..24 — holds + breathes
const PHASE_DISSOLVE = 36.0; // 24..36 — slow dissolution
// 36..40 — void again (fade out)

// ─── Ring radii: 22 rings with irregular spacing ──────────────────────────────
// Clustered near center, spread further out — feels organic
const RING_RADII: number[] = [
  0.18, 0.32, 0.41, 0.56,          // inner cluster — tight
  0.70, 0.88, 0.97,                 // mid-inner — moderate
  1.14, 1.22, 1.35,                 // small cluster
  1.54, 1.69,                       // spread pair
  1.82, 2.01, 2.12,                 // mid cluster
  2.29, 2.51,                       // sparse
  2.68, 2.83,                       // outer pair
  3.02, 3.24, 3.48,                 // trailing outer — sparse
];

// Per-ring: orbital tilt axes and stagger phases (varied, not periodic)
const RING_TILTS = RING_RADII.map((_, i) => {
  const seed = (i * 7.3 + 1.1) * Math.PI;
  return new THREE.Euler(
    Math.sin(seed * 0.7) * 0.35,
    Math.cos(seed * 0.4) * 0.25,
    Math.sin(seed * 1.1) * 0.15,
  );
});

const RING_STAGGER = RING_RADII.map((_, i) => i * 0.41 + Math.sin(i * 2.1) * 0.3);

// ─── Background Shader ────────────────────────────────────────────────────────
const bgVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const bgFragmentShader = /* glsl */ `
  ${SIMPLEX3D_GLSL}
  uniform float uTime;
  uniform float uVoidAlpha;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv - 0.5;
    float dist = length(uv);

    // Deep void base
    vec3 void_ = vec3(0.020, 0.020, 0.020); // ~#050505

    // Subtle nebula — soft grey wisps
    float n1 = snoise(vec3(uv * 2.4, uTime * 0.03)) * 0.5 + 0.5;
    float n2 = snoise(vec3(uv * 4.8 + 1.3, uTime * 0.05)) * 0.5 + 0.5;
    float nebula = n1 * n2 * (1.0 - smoothstep(0.3, 0.7, dist));

    vec3 nebulaCol = vec3(0.267, 0.267, 0.267) * nebula * 0.18; // faint grey

    vec3 col = void_ + nebulaCol;
    gl_FragColor = vec4(col, 1.0);
  }
`;

// ─── Ring Vertex Shader ───────────────────────────────────────────────────────
const ringVertexShader = /* glsl */ `
  ${SIMPLEX3D_GLSL}
  uniform float uTime;
  uniform float uPresence;   // 0..1 — birth/death of this ring
  uniform float uStagger;    // per-ring stagger offset for noise
  uniform float uBaseRadius; // base ring radius

  varying float vAlpha;
  varying vec3 vPos;

  void main() {
    vPos = position;

    // Noise-driven radius displacement — involuntary breathing
    // Use 3D simplex noise, not sin(t)
    float noiseInput = uTime * 0.22 + uStagger;
    float breathNoise = snoise(vec3(
      cos(atan(position.y, position.x)) * 1.8,
      sin(atan(position.y, position.x)) * 1.8,
      noiseInput
    ));
    // Secondary slower modulation — the stillness underneath
    float breathSlow = snoise(vec3(
      position.x * 0.5,
      position.y * 0.5,
      uTime * 0.07 + uStagger * 0.3
    ));

    float breathe = breathNoise * 0.04 + breathSlow * 0.025;

    // Apply radial displacement
    vec3 pos = position;
    vec3 radial = normalize(vec3(position.x, position.y, 0.0));
    pos += radial * breathe;

    // Scale by presence (birth/death)
    pos *= uPresence;

    vAlpha = uPresence;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const ringFragmentShader = /* glsl */ `
  varying float vAlpha;
  varying vec3 vPos;

  uniform float uRingIndex; // 0..21
  uniform float uPresence;

  void main() {
    // Palette: signal grey
    vec3 colDark = vec3(0.267, 0.267, 0.267);   // #444444
    vec3 colMid  = vec3(0.533, 0.533, 0.533);   // #888888
    vec3 colLight = vec3(0.878, 0.878, 0.878);  // #e0e0e0

    // Outer rings brighter, inner darker — grief is densest at center
    float t = clamp(uRingIndex / 21.0, 0.0, 1.0);
    vec3 col = mix(colDark, colLight, t);

    // Slight inner glow at center rings
    float innerGlow = (1.0 - t) * 0.3;
    col += vec3(innerGlow * 0.4);

    float alpha = vAlpha * 0.85;
    gl_FragColor = vec4(col, alpha);
  }
`;

// ─── Glyph (circle + cross arms) Vertex/Fragment ─────────────────────────────
const glyphVertexShader = /* glsl */ `
  ${SIMPLEX3D_GLSL}
  uniform float uTime;
  uniform float uPresence;

  varying float vAlpha;

  void main() {
    vec3 pos = position * uPresence;
    // Subtle involuntary drift on the glyph
    float drift = snoise(vec3(position.x * 2.0, position.y * 2.0, uTime * 0.18)) * 0.006;
    pos.x += drift;
    pos.y += snoise(vec3(position.y * 2.0, uTime * 0.14, 0.5)) * 0.006;

    vAlpha = uPresence;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const glyphFragmentShader = /* glsl */ `
  varying float vAlpha;

  void main() {
    // Near-white signal — the core is the clearest
    vec3 col = vec3(0.878, 0.878, 0.878); // #e0e0e0
    gl_FragColor = vec4(col, vAlpha * 0.95);
  }
`;

// ─── Particle Vertex/Fragment ─────────────────────────────────────────────────
const particleVertexShader = /* glsl */ `
  ${SIMPLEX3D_GLSL}
  uniform float uTime;
  uniform float uPresence; // global field presence

  attribute float aIndex;
  attribute vec3  aOffset;
  attribute float aSpeed;

  varying float vAlpha;

  void main() {
    // Drift through 3D space, noise-driven
    float t = uTime * aSpeed * 0.12 + aIndex * 6.283;
    vec3 pos = aOffset;

    // Slow involuntary drift
    float nx = snoise(vec3(pos.x * 0.4, pos.y * 0.4, uTime * 0.06 + aIndex));
    float ny = snoise(vec3(pos.y * 0.4, pos.z * 0.4, uTime * 0.08 + aIndex + 3.1));
    float nz = snoise(vec3(pos.z * 0.4, pos.x * 0.4, uTime * 0.05 + aIndex + 6.2));

    pos.x += nx * 0.4;
    pos.y += ny * 0.4;
    pos.z += nz * 0.3;

    vAlpha = uPresence * 0.55 * (0.4 + 0.6 * (snoise(vec3(aIndex, uTime * 0.1, 0.0)) * 0.5 + 0.5));

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = (1.5 + aSpeed * 0.8) * (4.0 / -mvPos.z);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const particleFragmentShader = /* glsl */ `
  varying float vAlpha;

  void main() {
    // Circular soft point
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float alpha = (1.0 - d * 2.0) * vAlpha;
    // Signal grey
    vec3 col = vec3(0.533, 0.533, 0.533); // #888888
    gl_FragColor = vec4(col, alpha);
  }
`;

// ─── Cycle phase resolver ─────────────────────────────────────────────────────
function getCycleState(t: number): {
  ringPresences: number[];
  glyphPresence: number;
  globalPresence: number;
} {
  const tc = t % CYCLE_TOTAL;

  let globalPresence = 1.0;

  // Void in: tc < 4
  if (tc < PHASE_VOID_IN) {
    globalPresence = 0.0;
    return {
      ringPresences: RING_RADII.map(() => 0.0),
      glyphPresence: 0.0,
      globalPresence: 0.0,
    };
  }

  // Void out: tc > 36
  if (tc > PHASE_DISSOLVE) {
    globalPresence = 1.0 - smoothstep01((tc - PHASE_DISSOLVE) / (CYCLE_TOTAL - PHASE_DISSOLVE));
    return {
      ringPresences: RING_RADII.map(() => globalPresence),
      glyphPresence: globalPresence * 0.5,
      globalPresence,
    };
  }

  // Assemble: tc 4..14 — rings arrive staggered from outer to inner
  if (tc < PHASE_ASSEMBLE) {
    const assembleT = (tc - PHASE_VOID_IN) / (PHASE_ASSEMBLE - PHASE_VOID_IN); // 0..1
    // Rings arrive: outer first, then inner
    // ring index 0 = innermost = arrives last
    const ringPresences = RING_RADII.map((_, i) => {
      const arrivalT = (21 - i) / 22; // outer rings (high i) arrive early
      const ringT = smoothstep01((assembleT - arrivalT * 0.6) / 0.4);
      return Math.max(0, Math.min(1, ringT));
    });
    // Glyph forms last — appears only after rings are mostly assembled
    const glyphPresence = smoothstep01((assembleT - 0.82) / 0.18);
    return { ringPresences, glyphPresence, globalPresence: 1.0 };
  }

  // Hold + breathe: tc 14..24 — everything present
  if (tc < PHASE_HOLD) {
    return {
      ringPresences: RING_RADII.map(() => 1.0),
      glyphPresence: 1.0,
      globalPresence: 1.0,
    };
  }

  // Dissolve: tc 24..36 — slow dissolution, glyph dissolves first
  const dissolveT = (tc - PHASE_HOLD) / (PHASE_DISSOLVE - PHASE_HOLD); // 0..1
  const glyphPresence = 1.0 - smoothstep01(dissolveT / 0.3);
  const ringPresences = RING_RADII.map((_, i) => {
    // Inner rings dissolve last (grief at center is the last to let go)
    const departureT = i / 22; // inner (low i) depart late
    const ringT = 1.0 - smoothstep01((dissolveT - departureT * 0.5) / 0.5);
    return Math.max(0, Math.min(1, ringT));
  });

  return { ringPresences, glyphPresence, globalPresence: 1.0 };
}

function smoothstep01(x: number): number {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}

// ─── Background Plane ─────────────────────────────────────────────────────────
function BackgroundPlane() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
  }), []);

  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  return (
    <mesh position={[0, 0, -4]}>
      <planeGeometry args={[30, 20]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={bgVertexShader}
        fragmentShader={bgFragmentShader}
        uniforms={uniforms}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─── Single Ring ─────────────────────────────────────────────────────────────
interface RingProps {
  radius: number;
  tilt: THREE.Euler;
  stagger: number;
  ringIndex: number;
  presenceRef: React.MutableRefObject<number[]>;
}

function Ring({ radius, tilt, stagger, ringIndex, presenceRef }: RingProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    // Torus for ring: ring radius = radius, tube = thin
    const tubeRadius = 0.008 + radius * 0.002; // slightly thicker for larger rings
    const geo = new THREE.TorusGeometry(radius, tubeRadius, 6, 128);
    return geo;
  }, [radius]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uPresence: { value: 0 },
    uStagger: { value: stagger },
    uBaseRadius: { value: radius },
    uRingIndex: { value: ringIndex },
  }), [stagger, radius, ringIndex]);

  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = clock.getElapsedTime();
      matRef.current.uniforms.uPresence.value = presenceRef.current[ringIndex] ?? 0;
    }
  });

  return (
    <mesh rotation={tilt}>
      <primitive object={geometry} />
      <shaderMaterial
        ref={matRef}
        vertexShader={ringVertexShader}
        fragmentShader={ringFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ─── Glyph Core (circle + cross arms) ────────────────────────────────────────
function GlyphCore({ presenceRef }: { presenceRef: React.MutableRefObject<number> }) {
  const circleMatRef = useRef<THREE.ShaderMaterial>(null);
  const crossMatRef = useRef<THREE.ShaderMaterial>(null);

  const circleGeo = useMemo(() => {
    // Ring circle outline
    const geo = new THREE.TorusGeometry(0.10, 0.005, 6, 64);
    return geo;
  }, []);

  const crossGeo = useMemo(() => {
    // Cross arms as line segments
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array([
      // Horizontal arm
      -0.14, 0, 0,
       0.14, 0, 0,
      // Vertical arm
      0, -0.14, 0,
      0,  0.14, 0,
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  const uniforms1 = useMemo(() => ({
    uTime: { value: 0 },
    uPresence: { value: 0 },
  }), []);

  const uniforms2 = useMemo(() => ({
    uTime: { value: 0 },
    uPresence: { value: 0 },
  }), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const p = presenceRef.current;
    if (circleMatRef.current) {
      circleMatRef.current.uniforms.uTime.value = t;
      circleMatRef.current.uniforms.uPresence.value = p;
    }
    if (crossMatRef.current) {
      crossMatRef.current.uniforms.uTime.value = t;
      crossMatRef.current.uniforms.uPresence.value = p;
    }
  });

  return (
    <group>
      <mesh geometry={circleGeo}>
        <shaderMaterial
          ref={circleMatRef}
          vertexShader={glyphVertexShader}
          fragmentShader={glyphFragmentShader}
          uniforms={uniforms1}
          transparent
          depthWrite={false}
        />
      </mesh>
      <lineSegments geometry={crossGeo}>
        <shaderMaterial
          ref={crossMatRef}
          vertexShader={glyphVertexShader}
          fragmentShader={glyphFragmentShader}
          uniforms={uniforms2}
          transparent
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}

// ─── Particle Field ───────────────────────────────────────────────────────────
const PARTICLE_COUNT = 3000;

function ParticleField({ presenceRef }: { presenceRef: React.MutableRefObject<number> }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const { geometry } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const indices = new Float32Array(PARTICLE_COUNT);
    const speeds = new Float32Array(PARTICLE_COUNT);
    const offsets = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Distribute through a disc-sphere hybrid, centered on ring volume
      const r = Math.sqrt(Math.random()) * 3.8; // radius up to 3.8
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.6; // flattened sphere
      const x = r * Math.cos(theta) * Math.cos(phi);
      const y = r * Math.sin(theta) * Math.cos(phi);
      const z = r * Math.sin(phi) * 1.2;

      positions[i * 3 + 0] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      offsets[i * 3 + 0] = x;
      offsets[i * 3 + 1] = y;
      offsets[i * 3 + 2] = z;
      indices[i] = i;
      speeds[i] = 0.5 + Math.random() * 1.5;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aOffset', new THREE.BufferAttribute(offsets, 3));
    geo.setAttribute('aIndex', new THREE.BufferAttribute(indices, 1));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    return { geometry: geo };
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uPresence: { value: 0 },
  }), []);

  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = clock.getElapsedTime();
      matRef.current.uniforms.uPresence.value = presenceRef.current;
    }
  });

  return (
    <points geometry={geometry}>
      <shaderMaterial
        ref={matRef}
        vertexShader={particleVertexShader}
        fragmentShader={particleFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ─── Scene Orchestrator ───────────────────────────────────────────────────────
function GriefScene() {
  const ringPresencesRef = useRef<number[]>(RING_RADII.map(() => 0));
  const glyphPresenceRef = useRef<number>(0);
  const globalPresenceRef = useRef<number>(0);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const state = getCycleState(t);
    ringPresencesRef.current = state.ringPresences;
    glyphPresenceRef.current = state.glyphPresence;
    globalPresenceRef.current = state.globalPresence;
  });

  return (
    <>
      <BackgroundPlane />

      {/* Concentric rings */}
      {RING_RADII.map((radius, i) => (
        <Ring
          key={i}
          radius={radius}
          tilt={RING_TILTS[i]}
          stagger={RING_STAGGER[i]}
          ringIndex={i}
          presenceRef={ringPresencesRef}
        />
      ))}

      {/* Central glyph */}
      <GlyphCore presenceRef={glyphPresenceRef} />

      {/* Particle field */}
      <ParticleField presenceRef={globalPresenceRef} />

      {/* Post-processing: Bloom + Noise grain + Vignette — no chromatic aberration */}
      <EffectComposer>
        <Bloom luminanceThreshold={0.05} luminanceSmoothing={0.9} intensity={0.8} mipmapBlur />
        <Noise opacity={0.04} />
        <Vignette eskil={false} offset={0.1} darkness={0.8} />
      </EffectComposer>
    </>
  );
}

// ─── Default Export ───────────────────────────────────────────────────────────
export default function GriefStillRings() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 55 }}
      style={{ background: '#050505', width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: false }}
    >
      <GriefScene />
    </Canvas>
  );
}
