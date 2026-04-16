'use client';
import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────────────────────
// EXACT ABOUT STRANGE THINGS
// Oracle: Steffi Grant · hermetic glyph / nu-isis · longing without object
// Palette: blood and gold — #1a0000 #660000 #cc0000 #cc9900 #ffdd44
// Constraint: No symmetry. If it feels balanced, break it.
// ─────────────────────────────────────────────────────────────────────────────

const vertexShader = `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const fragmentShader = `
uniform float uTime;
uniform vec2  uResolution;

// ── Palette ───────────────────────────────────────────────────────────────────
const vec3 P0 = vec3(0.102, 0.000, 0.000); // #1a0000  — void blood
const vec3 P1 = vec3(0.400, 0.000, 0.000); // #660000  — deep arterial
const vec3 P2 = vec3(0.800, 0.000, 0.000); // #cc0000  — raw transmission
const vec3 P3 = vec3(0.800, 0.600, 0.000); // #cc9900  — gold interior
const vec3 P4 = vec3(1.000, 0.867, 0.267); // #ffdd44  — glyph edge, reception

// ── SDF Utilities ─────────────────────────────────────────────────────────────
float sdCircle(vec2 p, float r) { return length(p) - r; }

float sdSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  return length(pa - ba * clamp(dot(pa,ba)/dot(ba,ba), 0.0, 1.0));
}

float sdTri(vec2 p, float r) {
  const float k = sqrt(3.0);
  p.x = abs(p.x) - r;
  p.y = p.y + r / k;
  if (p.x + k*p.y > 0.0) p = vec2(p.x - k*p.y, -k*p.x - p.y) / 2.0;
  p.x -= clamp(p.x, -2.0*r, 0.0);
  return -length(p) * sign(p.y);
}

float ring(vec2 p, float r, float w) {
  return abs(length(p) - r) - w * 0.5;
}

// ── Noise ─────────────────────────────────────────────────────────────────────
vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1,311.7)), dot(p, vec2(269.5,183.3)));
  return fract(sin(p) * 43758.5453123) * 2.0 - 1.0;
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(
    mix(dot(hash2(i+vec2(0,0)), f-vec2(0,0)), dot(hash2(i+vec2(1,0)), f-vec2(1,0)), u.x),
    mix(dot(hash2(i+vec2(0,1)), f-vec2(0,1)), dot(hash2(i+vec2(1,1)), f-vec2(1,1)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 rot = mat2(0.8,-0.6, 0.6,0.8);
  for (int i = 0; i < 6; i++) {
    v += a * noise(p);
    p  = rot * p * 2.1 + vec2(31.41, 27.18);
    a *= 0.5;
  }
  return v;
}

// ── Domain warp ───────────────────────────────────────────────────────────────
vec2 warp(vec2 uv, float t) {
  float wx = fbm(uv * 1.7 + vec2(t * 0.07, 0.0));
  float wy = fbm(uv * 1.7 + vec2(0.0, t * 0.05) + vec2(5.2, 1.3));
  return uv + vec2(wx, wy) * 0.22;
}

// ── Rotation helper ───────────────────────────────────────────────────────────
vec2 rot2(vec2 p, float a) {
  return vec2(p.x*cos(a) - p.y*sin(a), p.x*sin(a) + p.y*cos(a));
}

// ── Main ──────────────────────────────────────────────────────────────────────
void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / min(uResolution.x, uResolution.y);

  // Asymmetric offset — the center is never the center
  uv += vec2(-0.07, 0.11);

  float r = length(uv);
  float t = uTime;

  // ── Background: blood-dark fog with warped fire veins ─────────────────────
  vec2 wUV = warp(uv, t);
  float bg = fbm(wUV * 2.3 + t * 0.04);
  bg = bg * 0.5 + 0.5;

  vec3 col = mix(P0, P1 * 0.6, smoothstep(0.0, 1.6, r));
  col = mix(col, P1, bg * 0.35 * smoothstep(0.2, 1.2, r));

  // Hot vein tendrils at mid-range
  float vein = fbm(warp(uv, t * 1.3) * 3.1 + t * 0.06);
  float veinMask = smoothstep(0.15, 0.55, r) * smoothstep(1.3, 0.5, r);
  float veinBright = smoothstep(0.55, 0.85, vein * 0.5 + 0.5);
  col = mix(col, P2 * 0.7, veinBright * veinMask * 0.55);

  // ── The glyph system — nested shapes of decreasing coherence ──────────────
  float gSDF = 1e6;
  float strokeW = 0.0022;

  // Layer 0 — outer tilted ellipse (not a circle — precision about strange things)
  // Tilted 7° off horizontal, squashed horizontally
  vec2 uvL0 = rot2(uv, 0.122); // 7°
  uvL0.x *= 1.18;
  float d0 = abs(length(uvL0) - 0.44) - strokeW * 0.5;
  gSDF = min(gSDF, d0);

  // Layer 1 — broken ring: ring with a 35° gap at bottom-left (asymmetric)
  vec2 uvL1 = rot2(uv, -0.08);
  float ang1 = atan(uvL1.y, uvL1.x); // -π..π
  float gap1Start = -2.45;
  float gap1End   = -1.78;
  float gapMask1  = step(gap1Start, ang1) * (1.0 - step(gap1End, ang1));
  float d1 = abs(length(uvL1) - 0.31) - strokeW * 0.5;
  gSDF = min(gSDF, d1 + gapMask1 * 9999.0);

  // Layer 2 — inner warped ring: sinusoidally deformed, drifts slowly
  float ang2 = atan(uv.y, uv.x);
  float wobble = 0.028 * sin(ang2 * 7.0 + t * 0.9) + 0.014 * sin(ang2 * 3.0 - t * 0.4);
  float d2 = abs(length(uv) - 0.175 + wobble) - strokeW * 0.5;
  // Extra break on this one — top-right arc gone
  float ang2val = atan(uv.y, uv.x);
  float gapMask2 = step(0.35, ang2val) * (1.0 - step(1.22, ang2val));
  gSDF = min(gSDF, d2 + gapMask2 * 9999.0);

  // Layer 3 — asymmetric triangle, rotated off-axis, scaled small
  vec2 uvT = rot2(uv - vec2(0.012, -0.018), 0.41); // slightly off-center + rotated
  float dTri = abs(sdTri(uvT, 0.11)) - strokeW * 0.5;
  gSDF = min(gSDF, dTri);

  // Layer 4 — 5 radial spokes (not 6 — odd defeats symmetry), irregular lengths
  float spokeAngles[5];
  spokeAngles[0] = 0.0;
  spokeAngles[1] = 1.35;
  spokeAngles[2] = 2.51;
  spokeAngles[3] = 4.03;
  spokeAngles[4] = 5.20;
  float spokeLens[5];
  spokeLens[0] = 0.44;
  spokeLens[1] = 0.31;
  spokeLens[2] = 0.44;
  spokeLens[3] = 0.38;
  spokeLens[4] = 0.25;

  for (int i = 0; i < 5; i++) {
    float sa = spokeAngles[i];
    vec2 dir = vec2(cos(sa), sin(sa));
    // Each spoke from inner ring outward — but lengths vary, breaking radial balance
    vec2 inner = dir * 0.175;
    vec2 outer = dir * spokeLens[i];
    float ds = sdSegment(uv, inner, outer) - strokeW * 0.4;
    gSDF = min(gSDF, ds);
  }

  // Layer 5 — 4 off-center cross hairs through glyph interior (precision instrument feel)
  // Horizontal hairline, slightly above center
  {
    vec2 a = vec2(-0.28, 0.04);
    vec2 b = vec2( 0.21, 0.07);
    float dh = sdSegment(uv, a, b) - strokeW * 0.3;
    gSDF = min(gSDF, dh);
  }
  // Vertical hairline, slightly left
  {
    vec2 a = vec2(-0.03, -0.22);
    vec2 b = vec2(-0.07,  0.19);
    float dv = sdSegment(uv, a, b) - strokeW * 0.3;
    gSDF = min(gSDF, dv);
  }
  // Diagonal — upper-right to lower-left, long
  {
    vec2 a = vec2(-0.24, -0.27);
    vec2 b = vec2( 0.29,  0.32);
    float dd = sdSegment(uv, a, b) - strokeW * 0.3;
    gSDF = min(gSDF, dd);
  }

  // Layer 6 — node dots: 5 positions, none centered on obvious geometry
  vec2 nodes[5];
  nodes[0] = vec2( 0.000,  0.000); // center — one anchor
  nodes[1] = vec2( 0.175, -0.07); // inner ring, right-low
  nodes[2] = vec2(-0.14,   0.28); // outer ring, top-left
  nodes[3] = vec2( 0.33,   0.13); // beyond outer, right
  nodes[4] = vec2(-0.21,  -0.17); // between rings, low-left

  for (int i = 0; i < 5; i++) {
    float dn = sdCircle(uv - nodes[i], 0.009 + float(i) * 0.002);
    gSDF = min(gSDF, dn);
  }

  // Layer 7 — Coherence decay: small floating arc fragment, drifting slowly
  // This arc is "escaping" the glyph — nested shapes losing coherence
  float arcPhase = t * 0.07;
  vec2 arcCenter = vec2(cos(arcPhase) * 0.52, sin(arcPhase * 0.7) * 0.48);
  float arcAng = atan((uv - arcCenter).y, (uv - arcCenter).x);
  float arcRange = step(-0.6, arcAng) * (1.0 - step(1.1, arcAng));
  float dArc = abs(length(uv - arcCenter) - 0.06) - strokeW * 0.5;
  gSDF = min(gSDF, dArc + (1.0 - arcRange) * 9999.0);

  // ── Render glyph ──────────────────────────────────────────────────────────
  // Gold edge with blood interior — precision on strange forms
  float glyphMask = 1.0 - smoothstep(0.0, 0.006, gSDF);
  float innerEdge = 1.0 - smoothstep(0.0, 0.003, abs(gSDF));
  float outerGlow = exp(-max(gSDF, 0.0) * 55.0);

  if (glyphMask > 0.001) {
    // Edge = gold, interior of stroke = blood
    float edgeT = innerEdge;
    vec3 glyphCol = mix(P2, P4, edgeT);
    col = mix(col, glyphCol, glyphMask);
  }

  // Glyph halo — warm gold emanation
  col += P3 * outerGlow * 0.28;
  col += P4 * exp(-max(gSDF, 0.0) * 140.0) * 0.18;

  // ── Nu-Isis transmission pulse — a heartbeat from outside ─────────────────
  // Non-uniform pulse: faster rise, slow decay (biological)
  float pulse = sin(t * 1.1) * 0.5 + 0.5;
  pulse = pow(pulse, 2.8); // asymmetric waveshape
  float centralGlow = exp(-r * 5.5) * pulse * 0.22;
  col += P3 * centralGlow;

  // ── Longing gradient — warmth that can't reach anything ───────────────────
  // Asymmetric warm bleed: slightly lower-right
  vec2 longingOffset = uv - vec2(0.15, -0.18);
  float longing = exp(-length(longingOffset) * 3.8) * 0.12;
  col += P2 * longing;

  // ── Edge dissolution — the shapes are losing coherence at the boundary ─────
  float dissolveNoise = fbm(uv * 4.0 - t * 0.03) * 0.5 + 0.5;
  float edgeDist = 1.0 - smoothstep(0.7, 1.35, r);
  col *= edgeDist + dissolveNoise * (1.0 - edgeDist) * 0.3;

  // ── Final vignette ─────────────────────────────────────────────────────────
  col *= 1.0 - smoothstep(1.1, 1.9, r) * 0.95;

  // Tone mapping: subtle crush so blacks stay void-deep
  col = col / (col + vec3(0.28));
  col *= 1.28;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

function GlyphField() {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  useFrame(({ clock, size }) => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTime.value = clock.getElapsedTime();
    matRef.current.uniforms.uResolution.value.set(size.width, size.height);
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        depthTest={false}
        uniforms={{
          uTime:       { value: 0 },
          uResolution: { value: new THREE.Vector2(
            typeof window !== 'undefined' ? window.innerWidth  : 1920,
            typeof window !== 'undefined' ? window.innerHeight : 1080
          )},
        }}
      />
    </mesh>
  );
}

export default function ExactAboutStrangeThings() {
  return (
    <Canvas
      gl={{ antialias: true }}
      camera={{ position: [0, 0, 1], near: 0.1, far: 10 }}
      style={{ width: '100%', height: '100%' }}
    >
      <GlyphField />
    </Canvas>
  );
}
