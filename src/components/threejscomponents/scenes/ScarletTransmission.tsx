'use client';

/**
 * SCARLET TRANSMISSION
 * Oracle: Marjorie Cameron — Seed 802984 — April 15, 2026
 *
 * Channel: Marjorie Cameron / the scarlet woman / erotic geometry
 * "Don't illustrate — transmit. Something needs to get through."
 *
 * A dense field of vertical lines run like a signal through silence.
 * One line — the interrupted one — tears free and begins to form a body.
 * Hermaphroditic, winged, trembling — it almost completes itself.
 * Then the field pulls it back. The pattern almost resolves. Then doesn't.
 *
 * Cold fire palette: #1a0a2e → #6b0f6b → #c44dff → #ff99ff → #ffffff
 */

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─── FIELD LINES (background static parallel lines) ─────────────────────────

const fieldVert = `
  uniform float uTime;

  attribute float aLineId;
  attribute float aT;
  attribute float aPhase;

  varying float vAlpha;
  varying float vLineId;
  varying float vT;

  float hash(float n) { return fract(sin(n * 127.1 + 0.312) * 43758.5453); }

  void main() {
    float totalLines = 80.0;
    float lineNorm = aLineId / totalLines; // 0..1

    // Evenly spaced vertical lines across screen width
    float xPos = (lineNorm - 0.5) * 6.0;  // -3 to 3
    float yPos = (aT - 0.5) * 4.5;         // -2.25 to 2.25

    // All lines have a subtle tremor (the signal is alive)
    float tremor = sin(uTime * 1.3 + aPhase * 6.28 + aT * 4.0) * 0.012;
    float tremor2 = cos(uTime * 0.9 + aPhase * 3.14 + aT * 7.0) * 0.008;

    vec3 pos = vec3(xPos + tremor + tremor2, yPos, -0.5);

    // Fade at top/bottom edges
    float edgeFade = smoothstep(0.0, 0.1, aT) * smoothstep(1.0, 0.9, aT);
    vAlpha = edgeFade * 0.22;

    vLineId = aLineId;
    vT = aT;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = 1.5;
  }
`;

const fieldFrag = `
  varying float vAlpha;
  varying float vLineId;
  varying float vT;

  void main() {
    // Deep violet to magenta — the cold field
    vec3 deepViolet = vec3(0.102, 0.039, 0.180);   // #1a0a2e
    vec3 midPurple  = vec3(0.420, 0.059, 0.420);   // #6b0f6b
    vec3 magenta    = vec3(0.769, 0.302, 1.000);   // #c44dff

    float t = vT;
    vec3 col;
    if (t < 0.5) {
      col = mix(deepViolet, midPurple, t * 2.0);
    } else {
      col = mix(midPurple, magenta, (t - 0.5) * 2.0);
    }

    gl_FragColor = vec4(col, vAlpha);
  }
`;

// ─── THE INTERRUPTED LINE (the transmission itself) ──────────────────────────

const interruptVert = `
  uniform float uTime;
  uniform float uSeed;

  attribute float aT;

  varying float vAlpha;
  varying float vGlow;
  varying float vT;

  float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }

  float noise(float x) {
    float i = floor(x);
    float f = fract(x);
    float u = f*f*(3.0-2.0*f);
    return mix(hash(i), hash(i+1.0), u)*2.0-1.0;
  }

  // Cameron's sigil: an abstract wing/body shape
  // Returns x-offset given normalized t (0=top, 1=bottom)
  vec2 sigilShape(float t) {
    // A figure: narrow at top (crown), wide in middle (shoulders/wings), 
    // tapers through waist, flares at hips, closes at base
    float body;
    float wing;

    if (t < 0.15) {
      // Crown — narrow spike
      body = 0.0;
      wing = sin(t / 0.15 * 3.14159) * 0.05;
    } else if (t < 0.35) {
      // Shoulders — wings open
      float s = (t - 0.15) / 0.20;
      body = 0.0;
      wing = mix(0.05, 0.55, s * s);
    } else if (t < 0.55) {
      // Wings fully extended — maximum spread
      float s = (t - 0.35) / 0.20;
      body = 0.0;
      wing = mix(0.55, 0.65, sin(s * 3.14159));
    } else if (t < 0.70) {
      // Waist — closes
      float s = (t - 0.55) / 0.15;
      body = 0.0;
      wing = mix(0.65, 0.20, s);
    } else if (t < 0.85) {
      // Hips — flares again (erotic geometry)
      float s = (t - 0.70) / 0.15;
      body = 0.0;
      wing = mix(0.20, 0.38, sin(s * 3.14159));
    } else {
      // Base — closes to point
      float s = (t - 0.85) / 0.15;
      body = 0.0;
      wing = mix(0.38, 0.0, s);
    }

    return vec2(body, wing);
  }

  void main() {
    float t = aT; // 0..1 top to bottom

    // The cycle: 0..1 over ~12 seconds
    // 0-0.5: the figure condenses from the field (chaos → form)
    // 0.5-0.72: the figure almost completes — holds, trembles
    // 0.72-0.80: the near-resolution (peak satisfaction, nearly complete)
    // 0.80-1.0: it dissolves back — the pattern doesn't close
    float cycle = mod(uTime * 0.083, 1.0); // ~12s cycle

    // How "formed" is the figure? (0 = pure line, 1 = full sigil)
    float formT;
    if (cycle < 0.50) {
      formT = cycle / 0.50; // 0→1
    } else if (cycle < 0.72) {
      formT = 1.0; // fully formed
    } else if (cycle < 0.80) {
      // The ALMOST-RESOLVES moment: form wobbles, almost crystallizes
      float s = (cycle - 0.72) / 0.08;
      // Approaches perfect stillness... 
      formT = 1.0 - s * 0.15; // barely changes, hovering
    } else {
      // Dissolution — doesn't finish
      float s = (cycle - 0.80) / 0.20;
      formT = mix(0.85, 0.0, s * s); // collapses back
    }

    // Get sigil shape at this t
    vec2 sig = sigilShape(t);
    float sigilX = sig.y; // wing spread

    // Base line position (center)
    float baseX = 0.0;

    // Noise for organic tremor — especially alive during the "almost" moment
    float almostFactor = smoothstep(0.68, 0.80, cycle) * smoothstep(0.90, 0.80, cycle);
    float tremAmount = 0.025 + almostFactor * 0.06; // trembles hardest at near-resolution
    float noise1 = noise(t * 6.0 + uTime * 1.8) * tremAmount;
    float noise2 = noise(t * 11.0 - uTime * 1.2 + 3.7) * tremAmount * 0.6;

    // Form the figure: expand from center line outward
    // Two strands: left wing and right wing
    // aT encodes both strands via parity — we only use one strand here
    // We use the full sigil as a single ribbon center displaced from origin
    float xDisplace = sigilX * formT;

    float yPos = (t - 0.5) * 4.5;
    float xPos = baseX + xDisplace + noise1 + noise2;

    // Glow intensity: brightest at tips of wings and during almost-moment
    vGlow = sigilX * formT + almostFactor * 0.5;
    vGlow = clamp(vGlow, 0.0, 1.0);

    // Alpha: bright during form, fades on collapse
    float edgeFade = smoothstep(0.0, 0.05, t) * smoothstep(1.0, 0.95, t);
    vAlpha = edgeFade * mix(0.3, 0.95, formT);
    // Almost-moment: pulse brighter
    vAlpha += almostFactor * 0.35 * edgeFade;

    vT = t;

    vec3 pos = vec3(xPos, yPos, 0.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = 2.0;
  }
`;

const interruptFrag = `
  varying float vAlpha;
  varying float vGlow;
  varying float vT;

  void main() {
    // Cold fire: violet → pink → white-hot core
    vec3 violet  = vec3(0.420, 0.059, 0.420);   // #6b0f6b
    vec3 magenta = vec3(0.769, 0.302, 1.000);   // #c44dff
    vec3 pink    = vec3(1.000, 0.600, 1.000);   // #ff99ff
    vec3 white   = vec3(1.000, 1.000, 1.000);   // #ffffff

    // Color climbs toward white at peak glow
    vec3 col;
    if (vGlow < 0.33) {
      col = mix(violet, magenta, vGlow * 3.0);
    } else if (vGlow < 0.66) {
      col = mix(magenta, pink, (vGlow - 0.33) * 3.0);
    } else {
      col = mix(pink, white, (vGlow - 0.66) * 3.0);
    }

    gl_FragColor = vec4(col, vAlpha);
  }
`;

// ─── MIRROR LINE (the symmetrical other wing) ────────────────────────────────

const mirrorVert = `
  uniform float uTime;
  uniform float uSeed;

  attribute float aT;

  varying float vAlpha;
  varying float vGlow;
  varying float vT;

  float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }

  float noise(float x) {
    float i = floor(x);
    float f = fract(x);
    float u = f*f*(3.0-2.0*f);
    return mix(hash(i), hash(i+1.0), u)*2.0-1.0;
  }

  vec2 sigilShape(float t) {
    float wing;
    if (t < 0.15) {
      wing = sin(t / 0.15 * 3.14159) * 0.05;
    } else if (t < 0.35) {
      float s = (t - 0.15) / 0.20;
      wing = mix(0.05, 0.55, s * s);
    } else if (t < 0.55) {
      float s = (t - 0.35) / 0.20;
      wing = mix(0.55, 0.65, sin(s * 3.14159));
    } else if (t < 0.70) {
      float s = (t - 0.55) / 0.15;
      wing = mix(0.65, 0.20, s);
    } else if (t < 0.85) {
      float s = (t - 0.70) / 0.15;
      wing = mix(0.20, 0.38, sin(s * 3.14159));
    } else {
      float s = (t - 0.85) / 0.15;
      wing = mix(0.38, 0.0, s);
    }
    return vec2(0.0, wing);
  }

  void main() {
    float t = aT;

    float cycle = mod(uTime * 0.083, 1.0);

    float formT;
    if (cycle < 0.50) {
      formT = cycle / 0.50;
    } else if (cycle < 0.72) {
      formT = 1.0;
    } else if (cycle < 0.80) {
      float s = (cycle - 0.72) / 0.08;
      formT = 1.0 - s * 0.15;
    } else {
      float s = (cycle - 0.80) / 0.20;
      formT = mix(0.85, 0.0, s * s);
    }

    vec2 sig = sigilShape(t);
    float sigilX = sig.y;

    float almostFactor = smoothstep(0.68, 0.80, cycle) * smoothstep(0.90, 0.80, cycle);
    float tremAmount = 0.025 + almostFactor * 0.06;
    float noise1 = noise(t * 6.0 + uTime * 1.8 + 9.1) * tremAmount;
    float noise2 = noise(t * 11.0 - uTime * 1.2 + 1.3) * tremAmount * 0.6;

    // Mirror: negative x
    float xDisplace = -(sigilX * formT);
    float yPos = (t - 0.5) * 4.5;
    float xPos = xDisplace + noise1 + noise2;

    vGlow = sigilX * formT + almostFactor * 0.5;
    vGlow = clamp(vGlow, 0.0, 1.0);

    float edgeFade = smoothstep(0.0, 0.05, t) * smoothstep(1.0, 0.95, t);
    vAlpha = edgeFade * mix(0.3, 0.95, formT);
    vAlpha += almostFactor * 0.35 * edgeFade;

    vT = t;

    vec3 pos = vec3(xPos, yPos, 0.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = 2.0;
  }
`;

// ─── GEOMETRY BUILDERS ────────────────────────────────────────────────────────

function buildFieldGeometry(totalLines: number, pointsPerLine: number) {
  const total = totalLines * pointsPerLine;
  const positions = new Float32Array(total * 3);
  const lineIds   = new Float32Array(total);
  const tValues   = new Float32Array(total);
  const phases    = new Float32Array(total);

  let idx = 0;
  for (let l = 0; l < totalLines; l++) {
    const phase = Math.random();
    for (let p = 0; p < pointsPerLine; p++) {
      const t = p / (pointsPerLine - 1);
      positions[idx * 3]     = 0;
      positions[idx * 3 + 1] = 0;
      positions[idx * 3 + 2] = 0;
      lineIds[idx]  = l;
      tValues[idx]  = t;
      phases[idx]   = phase;
      idx++;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aLineId',  new THREE.BufferAttribute(lineIds, 1));
  geo.setAttribute('aT',       new THREE.BufferAttribute(tValues, 1));
  geo.setAttribute('aPhase',   new THREE.BufferAttribute(phases, 1));

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

function buildStrandGeometry(points: number) {
  const positions = new Float32Array(points * 3);
  const tValues   = new Float32Array(points);

  for (let p = 0; p < points; p++) {
    const t = p / (points - 1);
    positions[p * 3]     = 0;
    positions[p * 3 + 1] = 0;
    positions[p * 3 + 2] = 0;
    tValues[p] = t;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aT',       new THREE.BufferAttribute(tValues, 1));

  const indices: number[] = [];
  for (let p = 0; p < points - 1; p++) {
    indices.push(p, p + 1);
  }
  geo.setIndex(indices);
  return geo;
}

// ─── SCENE COMPONENTS ─────────────────────────────────────────────────────────

function FieldLines() {
  const matRef = useRef<THREE.ShaderMaterial>(null!);
  const LINES = 80, PTS = 180;

  const geometry = useMemo(() => buildFieldGeometry(LINES, PTS), []);
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  useFrame((s) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = s.clock.elapsedTime;
  });

  return (
    <lineSegments geometry={geometry}>
      <shaderMaterial
        ref={matRef}
        vertexShader={fieldVert}
        fragmentShader={fieldFrag}
        uniforms={uniforms}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  );
}

function RightWing() {
  const matRef = useRef<THREE.ShaderMaterial>(null!);
  const PTS = 300;

  const geometry = useMemo(() => buildStrandGeometry(PTS), []);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uSeed: { value: 802984.0 },
  }), []);

  useFrame((s) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = s.clock.elapsedTime;
  });

  return (
    <lineSegments geometry={geometry}>
      <shaderMaterial
        ref={matRef}
        vertexShader={interruptVert}
        fragmentShader={interruptFrag}
        uniforms={uniforms}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  );
}

function LeftWing() {
  const matRef = useRef<THREE.ShaderMaterial>(null!);
  const PTS = 300;

  const geometry = useMemo(() => buildStrandGeometry(PTS), []);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uSeed: { value: 802984.0 },
  }), []);

  useFrame((s) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = s.clock.elapsedTime;
  });

  return (
    <lineSegments geometry={geometry}>
      <shaderMaterial
        ref={matRef}
        vertexShader={mirrorVert}
        fragmentShader={interruptFrag}
        uniforms={uniforms}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  );
}

// ─── BACKGROUND ───────────────────────────────────────────────────────────────

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
    float vignette = smoothstep(0.85, 0.10, dist);

    vec3 void_   = vec3(0.0, 0.0, 0.0);
    vec3 deepMauve = vec3(0.102, 0.039, 0.180); // #1a0a2e

    vec3 col = mix(void_, deepMauve, vignette * 0.65);
    gl_FragColor = vec4(col, 1.0);
  }
`;

function Background() {
  return (
    <mesh position={[0, 0, -2]} scale={[14, 10, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial vertexShader={bgVert} fragmentShader={bgFrag} depthWrite={false} />
    </mesh>
  );
}

// ─── EXPORTED COMPONENT ───────────────────────────────────────────────────────

export default function ScarletTransmission() {
  return (
    <Canvas
      gl={{ antialias: true, alpha: false }}
      camera={{ position: [0, 0, 4], fov: 60 }}
      style={{ width: '100%', height: '100%', background: '#050010' }}
    >
      <Background />
      <FieldLines />
      <LeftWing />
      <RightWing />
    </Canvas>
  );
}
