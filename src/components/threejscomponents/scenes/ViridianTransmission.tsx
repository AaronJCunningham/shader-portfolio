'use client';

/**
 * VIRIDIAN TRANSMISSION
 * Oracle: Steffi Grant — Seed 116570 — April 21, 2026
 *
 * Channel: steffi grant / typhonian transmission / the mauve zone
 * Emotional State: longing without object
 * Constraint: Use only one geometric primitive. Let it do everything.
 *
 * Palette (viridian shadow):
 *   #000a05  — void / background
 *   #003322  — deep shadow / structural dark
 *   #006644  — dark viridian / edge field
 *   #33aa77  — stable viridian / mid-body
 *   #99ffcc  — bright emissive / ghost-light peak
 */

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

// ─── SHADERS ──────────────────────────────────────────────────────────────────

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSeed;

  varying float vNormDepth;
  varying float vEdgeDist;
  varying float vFormPhase;

  float hash(float n) { return fract(sin(n * 127.1 + 0.312) * 43758.5453); }

  float noise3(vec3 p) {
    float i = floor(dot(p, vec3(127.1, 311.7, 74.7)));
    float f = fract(sin(dot(i, vec3(127.1, 311.7, 74.7))) * 43758.5453);
    float u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + 1.0), u),
      mix(hash(i + 127.1), hash(i + 128.1), u),
      f
    );
  }

  void main() {
    vec3 pos = position;
    vec3 norm = normalize(position);

    // 30-second cycle:
    //  0.00–0.27  scattering  — vertices drift outward along normals
    //  0.27–0.60  reforming  — convergence back to icosahedron shape
    //  0.60–0.83  holding / transmission  — form complete, emissive peak
    //  0.83–1.00  dissolving  — edges dissolve before center
    float cycle = mod(uTime * 0.03333, 1.0);

    float scatterAmt = 0.0;
    float formAmt = 0.0;
    float dissolveAmt = 0.0;

    if (cycle < 0.27) {
      // SCATTERING
      float t = cycle / 0.27;
      scatterAmt = t * t;
      formAmt = 0.0;
      dissolveAmt = 0.0;
    } else if (cycle < 0.60) {
      // REFORMING
      float t = (cycle - 0.27) / 0.33;
      scatterAmt = max(0.0, 1.0 - t * 2.5);
      formAmt = smoothstep(0.0, 1.0, t);
      dissolveAmt = 0.0;
    } else if (cycle < 0.83) {
      // HOLDING
      scatterAmt = 0.0;
      formAmt = 1.0;
      dissolveAmt = 0.0;
    } else {
      // DISSOLVING
      float t = (cycle - 0.83) / 0.17;
      scatterAmt = 0.0;
      formAmt = max(0.0, 1.0 - t * 2.0);
      dissolveAmt = smoothstep(0.0, 1.0, t);
    }

    // Per-vertex noise for organic scatter — each vertex goes a different distance
    float vertexSeed = hash(float(gl_Vertex_ID) * 13.7 + uSeed);
    float n1 = noise3(pos * 2.3 + uTime * 0.4) * 2.0 - 1.0;
    float n2 = noise3(pos * 4.1 - uTime * 0.3 + 7.3) * 2.0 - 1.0;

    // Drift along normal — amount varies per vertex and over time
    float driftRadius = scatterAmt * (1.2 + vertexSeed * 0.8);
    driftRadius += dissolveAmt * 0.6 * (0.5 + vertexSeed * 0.5);
    pos += norm * driftRadius;

    // Subtle breathing when fully formed
    float breath = sin(uTime * 0.9 + vertexSeed * 6.28) * 0.03 * formAmt;
    pos += norm * breath;

    // Noise displacement for structural wrongness at edges
    pos.x += n1 * 0.04 * (1.0 - formAmt);
    pos.y += n2 * 0.04 * (1.0 - formAmt);
    pos.z += (n1 + n2) * 0.02 * (1.0 - formAmt);

    vNormDepth = driftRadius;
    vFormPhase = formAmt - dissolveAmt;
    vEdgeDist = length(pos) / 2.2;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uSeed;

  varying float vNormDepth;
  varying float vFormPhase;
  varying float vEdgeDist;

  void main() {
    // Viridian shadow palette
    vec3 void_d    = vec3(0.000, 0.039, 0.020);  // #000a05 — deep void
    vec3 shadow    = vec3(0.000, 0.102, 0.085);  // #003322 — deep shadow
    vec3 deepVir   = vec3(0.000, 0.400, 0.267);  // #006644 — dark viridian edges
    vec3 midVir    = vec3(0.200, 0.667, 0.467);  // #33aa77 — stable body
    vec3 bright    = vec3(0.600, 1.000, 0.800);  // #99ffcc — emissive peak

    // Cycle-based emissive pulse — peaks during hold phase, dims during scatter/dissolve
    float cycle = mod(uTime * 0.03333, 1.0);
    float emissivePulse = 0.6 + vFormPhase * 0.4 + sin(uTime * 1.4 + uSeed) * 0.1;

    // Layered color: edges are dark and precise, interior bleeds bright viridian light
    // Closer to "center" (vEdgeDist low) = brighter
    float t = clamp(vEdgeDist, 0.0, 1.0);

    vec3 col;
    if (t < 0.25) {
      col = mix(bright * emissivePulse, midVir, t / 0.25);
    } else if (t < 0.55) {
      col = mix(midVir, deepVir, (t - 0.25) / 0.30);
    } else if (t < 0.80) {
      col = mix(deepVir, shadow, (t - 0.55) / 0.25);
    } else {
      col = mix(shadow, void_d, (t - 0.80) / 0.20);
    }

    // Subtle edge interference — transmission signal from far away, received imperfectly
    float interference = sin(vEdgeDist * 28.0 + uTime * 2.1 + uSeed * 0.1) * 0.04;
    col += interference;

    // Emissive strength: interior glows, edges stay structural
    float emissive = (1.0 - t) * (0.5 + vFormPhase * 0.5) * emissivePulse;

    gl_FragColor = vec4(col, 1.0);
  }
`;

// ─── BACKGROUND GRADIENT ─────────────────────────────────────────────────────

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
    float vignette = smoothstep(0.85, 0.12, dist);

    vec3 void_d = vec3(0.000, 0.039, 0.020);  // #000a05
    vec3 shadow  = vec3(0.000, 0.102, 0.085);  // #003322

    vec3 col = mix(void_d, shadow, vignette * 0.45);
    gl_FragColor = vec4(col, 1.0);
  }
`;

// ─── MAIN SCENE ──────────────────────────────────────────────────────────────

function IcosahedronGlyph() {
  const matRef = useRef<THREE.ShaderMaterial>(null!);
  const mouseRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const burstRef = useRef(0);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uSeed: { value: 116570.0 },
  }), []);

  // Mouse parallax + click burst
  useMemo(() => {
    const handleMouse = (e: MouseEvent) => {
      mouseRef.current.tx = (e.clientX / window.innerWidth - 0.5) * 0.15;
      mouseRef.current.ty = -(e.clientY / window.innerHeight - 0.5) * 0.15;
    };
    const handleClick = () => {
      burstRef.current = 1.0;
    };
    window.addEventListener('mousemove', handleMouse);
    window.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('mousemove', handleMouse);
      window.removeEventListener('click', handleClick);
    };
  }, []);

  useFrame(({ clock, camera }) => {
    if (!matRef.current) return;

    matRef.current.uniforms.uTime.value = clock.getElapsedTime();

    // Smooth mouse parallax
    mouseRef.current.x += (mouseRef.current.tx - mouseRef.current.x) * 0.04;
    mouseRef.current.y += (mouseRef.current.ty - mouseRef.current.y) * 0.04;
    camera.position.x = mouseRef.current.x;
    camera.position.y = mouseRef.current.y;

    // Burst: accelerate phase briefly on click
    if (burstRef.current > 0) {
      burstRef.current -= 0.02;
      matRef.current.uniforms.uTime.value += burstRef.current * 0.5;
    }
  });

  return (
    <mesh>
      <icosahedronGeometry args={[1.4, 5]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function Background() {
  return (
    <mesh position={[0, 0, -2]} scale={[16, 12, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial vertexShader={bgVert} fragmentShader={bgFrag} depthWrite={false} />
    </mesh>
  );
}

function Scene() {
  return (
    <>
      <color attach="background" args={['#000a05']} />
      <Background />
      <IcosahedronGlyph />
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.4}
          luminanceSmoothing={0.2}
          intensity={1.2}
          radius={0.8}
        />
      </EffectComposer>
    </>
  );
}

// ─── EXPORTED COMPONENT ───────────────────────────────────────────────────────

export default function ViridianTransmission() {
  return (
    <Canvas
      gl={{ antialias: true, alpha: false }}
      camera={{ position: [0, 0, 4], fov: 60 }}
      style={{ width: '100%', height: '100%', background: '#000a05' }}
    >
      <Scene />
    </Canvas>
  );
}
