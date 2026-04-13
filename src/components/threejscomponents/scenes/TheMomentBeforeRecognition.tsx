'use client';

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─── GLSL ────────────────────────────────────────────────────────────────────

const vertexShader = `
  uniform float uTime;
  uniform float uSeed;

  attribute float aOffset;
  attribute float aLineId;
  attribute float aT;

  varying float vAlpha;
  varying float vGold;
  varying float vT;
  varying float vLineId;

  // Hash / noise
  float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }
  float hash2(float a, float b) { return hash(a * 317.0 + b * 191.0 + uSeed); }

  float noise1(float x) {
    float i = floor(x);
    float f = fract(x);
    float u = f * f * (3.0 - 2.0 * f);
    return mix(hash(i), hash(i + 1.0), u) * 2.0 - 1.0;
  }

  void main() {
    float totalLines = 120.0;

    // Each line spans the x axis; aT goes 0→1 along line length
    // aLineId is which line (0..totalLines)
    // aOffset is random phase offset per line

    float lineNorm = aLineId / totalLines; // 0..1

    // The ONE interruption: line at lineNorm ≈ 0.5
    float interruptLine = 0.5;
    float interruptStrength = smoothstep(0.08, 0.0, abs(lineNorm - interruptLine));

    // --- CHAOS: curl-like noise displacement ---
    // Phase slowly drifting
    float phase = uTime * 0.18 + aOffset * 6.2831;
    float noiseAmt = 0.45; // maximum chaos displacement

    // Chaos draws from sub-consciousness — decreases over cycle
    float cycle = mod(uTime * 0.055, 1.0); // 0..1 over ~18s
    // It moves toward order but never arrives
    float orderT = smoothstep(0.0, 0.72, cycle); // reaches ~0.72 "order" at cycle end
    // Then resets — chaos floods back
    float chaosAmt = mix(1.0, 0.28, orderT);

    // Base y position: evenly spaced parallel horizontal lines
    float baseY = (lineNorm - 0.5) * 3.0; // -1.5 to 1.5

    // X position along the line
    float xPos = (aT - 0.5) * 5.0; // -2.5 to 2.5

    // Chaos displacement in y (the lines writhe)
    float n1 = noise1(xPos * 1.3 + phase + aLineId * 0.37);
    float n2 = noise1(xPos * 2.7 - phase * 0.7 + aLineId * 0.81);
    float chaosY = (n1 * 0.6 + n2 * 0.4) * noiseAmt * chaosAmt;

    // The interruption: the single interrupted line bends strongly outward
    float interruptY = sin(xPos * 2.5 + uTime * 0.4) * 0.35 * interruptStrength;

    // Toward-order attractor: lines want to converge to a sigil arc
    // The sigil is a simple horizontal — they're already trying to become lines
    // but the noise fights it
    float orderY = 0.0; // "pure order" would be flat
    float finalY = baseY + mix(chaosY, orderY, orderT * 0.55) + interruptY;

    // Slight z tremor (depth of field feel)
    float zNoise = noise1(xPos * 0.5 + phase * 0.3 + aLineId) * 0.15 * chaosAmt;

    vec3 pos = vec3(xPos, finalY, zNoise);

    // Alpha: lines fade in from edges, interrupted line glows
    float edgeFade = smoothstep(0.0, 0.15, aT) * smoothstep(1.0, 0.85, aT);
    vAlpha = edgeFade * (0.4 + 0.5 * (1.0 - chaosAmt * 0.6));
    // The interrupted line is always more visible
    vAlpha = max(vAlpha, edgeFade * interruptStrength * 0.95);

    // Gold tint on lines converging toward order, blood in chaos
    vGold = orderT * (1.0 - abs(lineNorm - 0.5) * 1.8);
    vGold = clamp(vGold, 0.0, 1.0);

    vT = aT;
    vLineId = aLineId;

    vec4 mvp = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    gl_Position = mvp;
    gl_PointSize = 1.5;
  }
`;

const fragmentShader = `
  varying float vAlpha;
  varying float vGold;
  varying float vT;
  varying float vLineId;

  void main() {
    // Blood palette: #1a0000 → #cc0000, gold: #cc9900 → #ffdd44
    vec3 bloodDeep  = vec3(0.102, 0.0,   0.0);
    vec3 bloodMid   = vec3(0.4,   0.0,   0.0);
    vec3 bloodBright= vec3(0.8,   0.0,   0.0);
    vec3 goldMid    = vec3(0.8,   0.6,   0.0);
    vec3 goldBright = vec3(1.0,   0.867, 0.267);

    // Mix blood → gold based on convergence
    vec3 bloodColor = mix(bloodDeep, bloodBright, vT);
    vec3 goldColor  = mix(goldMid,   goldBright,  vT);
    vec3 col = mix(bloodColor, goldColor, vGold * vGold);

    gl_FragColor = vec4(col, vAlpha);
  }
`;

// ─── GEOMETRY BUILDER ────────────────────────────────────────────────────────

function buildLineGeometry(totalLines: number, pointsPerLine: number) {
  const totalPoints = totalLines * pointsPerLine;

  const positions  = new Float32Array(totalPoints * 3); // unused but required
  const offsets    = new Float32Array(totalPoints);
  const lineIds    = new Float32Array(totalPoints);
  const tValues    = new Float32Array(totalPoints);

  let idx = 0;
  for (let l = 0; l < totalLines; l++) {
    const offset = Math.random();
    for (let p = 0; p < pointsPerLine; p++) {
      const t = p / (pointsPerLine - 1);
      positions[idx * 3]     = 0;
      positions[idx * 3 + 1] = 0;
      positions[idx * 3 + 2] = 0;
      offsets[idx]  = offset;
      lineIds[idx]  = l;
      tValues[idx]  = t;
      idx++;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position',  new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aOffset',   new THREE.BufferAttribute(offsets,   1));
  geo.setAttribute('aLineId',   new THREE.BufferAttribute(lineIds,   1));
  geo.setAttribute('aT',        new THREE.BufferAttribute(tValues,   1));

  // Build indices for line segments
  const indices: number[] = [];
  for (let l = 0; l < totalLines; l++) {
    const base = l * pointsPerLine;
    for (let p = 0; p < pointsPerLine - 1; p++) {
      indices.push(base + p, base + p + 1);
    }
  }
  geo.setIndex(indices);

  return geo;
}

// ─── SCENE INNER ─────────────────────────────────────────────────────────────

function Lines() {
  const matRef = useRef<THREE.ShaderMaterial>(null!);

  const TOTAL_LINES     = 120;
  const POINTS_PER_LINE = 200;

  const geometry = useMemo(() => buildLineGeometry(TOTAL_LINES, POINTS_PER_LINE), []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uSeed: { value: 819130.0 },
  }), []);

  useFrame((state) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <lineSegments geometry={geometry}>
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        linewidth={1}
      />
    </lineSegments>
  );
}

// ─── BACKGROUND VIGNETTE QUAD ─────────────────────────────────────────────────

const bgVert = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const bgFrag = `
  varying vec2 vUv;
  void main() {
    vec2 c = vUv - 0.5;
    float dist = length(c);
    float vignette = smoothstep(0.9, 0.25, dist);
    vec3 deepBlood = vec3(0.04, 0.0, 0.0);
    vec3 black     = vec3(0.0);
    vec3 col = mix(black, deepBlood, vignette * 0.8);
    gl_FragColor = vec4(col, 1.0);
  }
`;

function Background() {
  return (
    <mesh position={[0, 0, -2]} scale={[12, 8, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial vertexShader={bgVert} fragmentShader={bgFrag} depthWrite={false} />
    </mesh>
  );
}

// ─── EXPORTED COMPONENT ───────────────────────────────────────────────────────

export default function TheMomentBeforeRecognition() {
  return (
    <Canvas
      gl={{ antialias: true, alpha: false }}
      camera={{ position: [0, 0, 3.5], fov: 60 }}
      style={{ width: '100%', height: '100%', background: '#050000' }}
    >
      <Background />
      <Lines />
    </Canvas>
  );
}
