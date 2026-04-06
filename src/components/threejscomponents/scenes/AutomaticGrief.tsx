'use client';

/**
 * Automatic Grief — Austin Osman Spare / Oracle 2026-04-06
 *
 * Oracle seed: 592993
 * Emotional state: grief that has become still
 * Geometric seed: a form with one axis of symmetry, broken
 * Constraint: one geometric primitive only
 * Palette: viridian shadow — #000a05 #003322 #006644 #33aa77 #99ffcc
 *
 * Concept: A plane of points — one primitive — distributed as if a sigil
 * were condensing from noise then going still. The hand moved automatically
 * and stopped mid-stroke. Symmetry about the Y axis, then broken on the left
 * side: one half refuses to mirror. Grief made visible, then released.
 *
 * Technique: A single PlaneGeometry with every vertex animated as a particle.
 * The vertex shader displaces each point using layered curl noise driven by
 * the oracle seed, then bleeds into stillness over a long cycle — like a body
 * that has cried itself out. The right half holds shape; the left half drifts.
 */

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const SEED = 592993;
const PALETTE = [
  new THREE.Color('#000a05'),
  new THREE.Color('#003322'),
  new THREE.Color('#006644'),
  new THREE.Color('#33aa77'),
  new THREE.Color('#99ffcc'),
];

// ─── Vertex Shader ────────────────────────────────────────────────────────────
const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSeed;

  varying float vDepth;
  varying float vSide; // -1 left (broken), +1 right (held)

  // Hash helpers
  float hash(float n) { return fract(sin(n) * 43758.5453123); }
  float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  // Smooth noise
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash2(i + vec2(0,0)), hash2(i + vec2(1,0)), u.x),
      mix(hash2(i + vec2(0,1)), hash2(i + vec2(1,1)), u.x),
      u.y
    );
  }

  // 3-octave fBm
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = p * 2.0 + shift;
      a *= 0.5;
    }
    return v;
  }

  // Curl noise displacement (2D → 3D)
  vec3 curlDisplace(vec2 uv, float t) {
    float eps = 0.01;
    float f0 = fbm(uv + vec2(uSeed * 0.0001, t * 0.07));
    float fx = fbm(uv + vec2(eps, 0.0) + vec2(uSeed * 0.0001, t * 0.07));
    float fy = fbm(uv + vec2(0.0, eps) + vec2(uSeed * 0.0001, t * 0.07));
    vec2 curl = vec2((fy - f0) / eps, -(fx - f0) / eps);
    float z = fbm(uv * 1.3 + vec2(t * 0.04));
    return vec3(curl * 0.35, z * 0.5 - 0.25);
  }

  void main() {
    vec3 pos = position;
    float side = sign(pos.x); // +1 right, -1 left
    vSide = side;

    // Grief stillness cycle: starts still, rises briefly, returns to still
    // Long breath — 40s cycle
    float cycle = sin(uTime * 0.157) * 0.5 + 0.5; // 0..1
    float intensity = pow(cycle, 3.0) * 0.8; // mostly flat, brief peak

    // Curl displacement — both sides alive to start
    vec3 disp = curlDisplace(pos.xy * 0.8 + vec2(uSeed * 0.001), uTime);

    // Left side (broken axis): adds extra asymmetric drift — refuses to mirror
    float brokenness = 0.0;
    if (side < 0.0) {
      brokenness = fbm(pos.xy * 1.2 + vec2(uTime * 0.03, uSeed * 0.002)) * 0.6;
      // Slow lateral drift — the left hand pulls away
      disp.x += brokenness * 1.2 * intensity;
      disp.y -= brokenness * 0.4 * intensity;
      disp.z += brokenness * 0.3;
    }

    // Right side (held symmetry): tighter, more controlled
    if (side > 0.0) {
      disp *= 0.5;
    }

    pos += disp * intensity;

    // Depth for color
    vDepth = pos.z * 0.5 + 0.5;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = mix(1.2, 3.5, vDepth) * (1.0 + intensity * 0.5);
  }
`;

// ─── Fragment Shader ──────────────────────────────────────────────────────────
const fragmentShader = /* glsl */ `
  varying float vDepth;
  varying float vSide;

  // Palette: viridian shadow — darkest to lightest
  vec3 palette(float t) {
    // 5 stops mapped 0..1
    vec3 c0 = vec3(0.000, 0.039, 0.020); // #000a05
    vec3 c1 = vec3(0.000, 0.200, 0.133); // #003322
    vec3 c2 = vec3(0.000, 0.400, 0.267); // #006644
    vec3 c3 = vec3(0.200, 0.667, 0.467); // #33aa77
    vec3 c4 = vec3(0.600, 1.000, 0.800); // #99ffcc

    float s = t * 4.0;
    if (s < 1.0) return mix(c0, c1, s);
    if (s < 2.0) return mix(c1, c2, s - 1.0);
    if (s < 3.0) return mix(c2, c3, s - 2.0);
    return mix(c3, c4, s - 3.0);
  }

  void main() {
    // Circular point
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float alpha = 1.0 - smoothstep(0.35, 0.5, d);

    // Left side (broken) is dimmer — grief that can't hold light
    float brightness = vSide < 0.0 ? 0.55 : 1.0;
    vec3 col = palette(vDepth) * brightness;

    // Slight glow at brightest points
    col += vec3(0.0, 0.15, 0.08) * pow(vDepth, 3.0) * brightness;

    gl_FragColor = vec4(col, alpha * 0.85);
  }
`;

// ─── Scene Inner ──────────────────────────────────────────────────────────────
function GriefField() {
  const meshRef = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  // One primitive: PlaneGeometry — all points from this single mesh
  const { geometry } = useMemo(() => {
    const W = 180;
    const H = 140;
    const geo = new THREE.PlaneGeometry(4.5, 3.5, W - 1, H - 1);
    return { geometry: geo };
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uSeed: { value: SEED },
  }), []);

  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  return (
    <points ref={meshRef} geometry={geometry}>
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function AutomaticGrief() {
  return (
    <Canvas
      camera={{ position: [0, 0, 4.5], fov: 55 }}
      style={{ background: '#000a05', width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: false }}
    >
      <GriefField />
    </Canvas>
  );
}
