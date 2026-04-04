'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';

// ─── GLSL: Fullscreen raymarched volumetric field ───────────────────────────
// Channel: Marjorie Cameron / Seed 19001 / 2026-04-04
// Constraint: the piece must have a moment where it almost resolves, then doesn't.

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec2  uResolution;

  varying vec2 vUv;

  // ── Noise helpers ──────────────────────────────────────────────────────────
  vec3 hash3(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
             dot(p, vec3(269.5, 183.3, 246.1)),
             dot(p, vec3(113.5, 271.9, 124.6)));
    return fract(sin(p) * 43758.5453);
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(dot(hash3(i + vec3(0,0,0)), f - vec3(0,0,0)),
                       dot(hash3(i + vec3(1,0,0)), f - vec3(1,0,0)), u.x),
                   mix(dot(hash3(i + vec3(0,1,0)), f - vec3(0,1,0)),
                       dot(hash3(i + vec3(1,1,0)), f - vec3(1,1,0)), u.x), u.y),
               mix(mix(dot(hash3(i + vec3(0,0,1)), f - vec3(0,0,1)),
                       dot(hash3(i + vec3(1,0,1)), f - vec3(1,0,1)), u.x),
                   mix(dot(hash3(i + vec3(0,1,1)), f - vec3(0,1,1)),
                       dot(hash3(i + vec3(1,1,1)), f - vec3(1,1,1)), u.x), u.y), u.z);
  }

  float fbm(vec3 p, int octaves) {
    float v = 0.0;
    float a = 0.5;
    vec3 shift = vec3(100.0);
    for (int i = 0; i < 6; i++) {
      if (i >= octaves) break;
      v += a * noise(p);
      p = p * 2.0 + shift;
      a *= 0.5;
    }
    return v;
  }

  // ── The Folded Seed SDF ───────────────────────────────────────────────────
  // Three nested plane folds create a self-touching polyhedral form
  // that breathes between coherence and noise.
  vec3 fold(vec3 p, float offset) {
    p = abs(p) - offset;
    return p;
  }

  float sdFolded(vec3 p, float t) {
    // Breathing fold offset: oscillates between tight (crystalline) and open (diffuse)
    float foldOff = 0.28 + sin(t * 0.43) * 0.13;
    vec3 q = fold(fold(fold(p, foldOff), foldOff * 0.62), foldOff * 0.38);
    float d = length(q) - 0.35 + sin(t * 0.71) * 0.08;
    return d;
  }

  // ── Coherence cycle (the almost-resolve) ─────────────────────────────────
  // Every ~28 seconds the field pulls toward resolution, then retreats.
  // The warp NEVER goes to zero — it always pulls back before full arrival.
  float coherenceCycle(float t) {
    float c = sin(t * 0.224) * 0.5 + 0.5; // 0→1→0 over ~28s
    // Apply a power curve so the approach feels slow but the retreat is sharp
    return pow(c, 1.6);
  }

  // ── Domain warp ───────────────────────────────────────────────────────────
  vec3 warpDomain(vec3 p, float t, float coherence) {
    // warpStrength is always > 0 — the constraint: never fully resolves
    float warpStrength = mix(1.2, 0.18, coherence); // never 0
    float warpTime = t * 0.17;

    vec3 warpOffset = vec3(
      fbm(p * 0.8 + vec3(warpTime, 0.0, 0.0), 4),
      fbm(p * 0.8 + vec3(0.0, warpTime, 0.31), 4),
      fbm(p * 0.8 + vec3(0.72, 0.0, warpTime), 4)
    );

    return p + warpOffset * warpStrength;
  }

  // ── Palette (viridian shadow) ─────────────────────────────────────────────
  // #000a05 → #003322 → #006644 → #33aa77 → #99ffcc
  vec3 palette(float t, float coherence) {
    vec3 void_col  = vec3(0.000, 0.039, 0.020); // #000a05
    vec3 deep_col  = vec3(0.000, 0.200, 0.133); // #003322
    vec3 mid_col   = vec3(0.000, 0.400, 0.267); // #006644
    vec3 bright_col= vec3(0.200, 0.667, 0.467); // #33aa77
    vec3 bloom_col = vec3(0.600, 1.000, 0.800); // #99ffcc

    vec3 c = mix(void_col, deep_col, smoothstep(0.0, 0.25, t));
    c = mix(c, mid_col,   smoothstep(0.2, 0.55, t));
    c = mix(c, bright_col,smoothstep(0.5, 0.82, t));
    c = mix(c, bloom_col, smoothstep(0.78, 1.0, t));

    // Coherence tints toward the bloom color — the approach of resolution
    c = mix(c, bloom_col * 0.7, coherence * 0.35);
    return c;
  }

  // ── Raymarcher ───────────────────────────────────────────────────────────
  void main() {
    vec2 uv = (vUv - 0.5) * 2.0;
    uv.x *= uResolution.x / uResolution.y;

    float t = uTime;
    float coherence = coherenceCycle(t);

    // Ray setup
    vec3 ro = vec3(0.0, 0.0, -3.2);
    vec3 rd = normalize(vec3(uv * 0.75, 1.0));

    // Pulse: the field breathes
    float pulse = sin(t * 0.81) * 0.5 + 0.5;

    // Volumetric accumulation
    vec3 color = vec3(0.0);
    float totalDensity = 0.0;
    float stepSize = 0.06;
    float maxDist = 10.0;
    float dist = 0.0;

    for (int i = 0; i < 120; i++) {
      if (dist > maxDist) break;

      vec3 p = ro + rd * dist;

      // Domain warp — the key to the "never arrives" quality
      vec3 wp = warpDomain(p, t, coherence);

      float d = sdFolded(wp, t);

      // Surface proximity creates density
      float density = smoothstep(0.55, 0.0, abs(d)) * 0.09;
      // Coherence peak brightens the near-surface layer
      density += smoothstep(0.15, 0.0, abs(d)) * coherence * 0.12;

      // Pulse modulates density
      density *= (0.7 + pulse * 0.6);

      // Color the sample along the palette
      float palT = smoothstep(0.5, 0.0, abs(d));
      palT = mix(palT, 1.0, coherence * smoothstep(0.12, 0.0, abs(d)));

      vec3 sampleCol = palette(palT, coherence);

      // Accumulate
      float alpha = density * (1.0 - totalDensity);
      color += sampleCol * alpha;
      totalDensity = min(1.0, totalDensity + alpha);

      if (totalDensity > 0.98) break;

      // Adaptive step: closer to surface = smaller steps
      float stepMod = max(0.015, abs(d) * 0.5);
      dist += stepMod;
    }

    // Background void — deep viridian black
    vec3 bgColor = vec3(0.000, 0.039, 0.020); // #000a05
    // Subtle bg pulse — the void breathes too
    bgColor += vec3(0.0, 0.015, 0.008) * pulse;
    color = mix(bgColor, color, min(1.0, totalDensity * 2.2));

    // Coherence flare: at peak almost-resolution, a brief luminous surge
    // Then it retracts. This is the cruelty of the piece.
    float flare = pow(coherence, 4.0) * 0.18;
    color += vec3(0.5, 1.0, 0.75) * flare * smoothstep(0.35, 0.0, length(uv));

    // Vignette
    float vig = 1.0 - smoothstep(0.5, 1.5, length(vUv - 0.5) * 2.2);
    color *= vig;

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ─── Scene mesh (fullscreen quad) ───────────────────────────────────────────
function FoldedArrivalMesh() {
  const meshRef = useRef<THREE.Mesh>(null!);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
    }),
    []
  );

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms,
        depthWrite: false,
        depthTest: false,
      }),
    [uniforms]
  );

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(2, 2);
    return geo;
  }, []);

  useFrame(({ clock, size }) => {
    uniforms.uTime.value = clock.getElapsedTime();
    uniforms.uResolution.value.set(size.width, size.height);
  });

  return <mesh ref={meshRef} geometry={geometry} material={material} />;
}

// ─── Exported component ──────────────────────────────────────────────────────
interface TheFoldedArrivalProps {
  width?: string;
  height?: string;
}

export default function TheFoldedArrival({
  width = '100%',
  height = '100vh',
}: TheFoldedArrivalProps) {
  return (
    <div style={{ width, height, background: '#000a05' }}>
      <Canvas
        gl={{
          antialias: false,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 1.5]}
        orthographic
        camera={{ position: [0, 0, 1], near: 0, far: 2, zoom: 1 }}
      >
        <color attach="background" args={['#000a05']} />
        <FoldedArrivalMesh />
        <EffectComposer>
          <Bloom
            luminanceThreshold={0.08}
            luminanceSmoothing={0.92}
            intensity={1.8}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.15} darkness={0.75} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
