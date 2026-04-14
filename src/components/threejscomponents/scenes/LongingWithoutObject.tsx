'use client';
import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = `
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const fragmentShader = `
uniform float uTime;
uniform vec2 uResolution;

// Palette
const vec3 C0 = vec3(0.039, 0.000, 0.000); // #0a0000
const vec3 C1 = vec3(0.239, 0.000, 0.000); // #3d0000
const vec3 C2 = vec3(0.545, 0.102, 0.000); // #8b1a00
const vec3 C3 = vec3(0.831, 0.322, 0.039); // #d4520a
const vec3 C4 = vec3(1.000, 0.702, 0.278); // #ffb347

// ── SDF helpers ──────────────────────────────────────────

float sdCircle(vec2 p, float r) {
  return length(p) - r;
}

float sdSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

float sdLine(vec2 p, float angle, float len) {
  vec2 dir = vec2(cos(angle), sin(angle));
  vec2 a = dir * len;
  vec2 b = -dir * len;
  return sdSegment(p, a, b);
}

float ring(vec2 p, float r, float width) {
  return abs(sdCircle(p, r)) - width * 0.5;
}

// ── Noise / FBM ──────────────────────────────────────────

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(dot(hash2(i + vec2(0,0)), f - vec2(0,0)),
                 dot(hash2(i + vec2(1,0)), f - vec2(1,0)), u.x),
             mix(dot(hash2(i + vec2(0,1)), f - vec2(0,1)),
                 dot(hash2(i + vec2(1,1)), f - vec2(1,1)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  vec2 shift = vec2(100.0);
  mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = rot * p * 2.1 + shift;
    a *= 0.5;
  }
  return v;
}

// ── Main ─────────────────────────────────────────────────

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / min(uResolution.x, uResolution.y);
  float r = length(uv);

  // ── Ground ───────────────────────────────────────────
  vec3 col = mix(C1 * 0.3, C0, smoothstep(0.0, 1.2, r));

  // ── Peripheral ember fire ────────────────────────────
  // Only alive outside r=0.30, fully present at edges
  float fireMask = smoothstep(0.28, 0.70, r);
  fireMask *= smoothstep(2.0, 0.9, r); // fade at extreme edge too

  if (fireMask > 0.001) {
    // Domain warp — tendrils rotating slowly inward
    float angle = atan(uv.y, uv.x) + uTime * 0.05;
    vec2 polar = vec2(r, angle);
    vec2 warpedUV = uv;
    warpedUV.x += fbm(uv * 2.3 + vec2(uTime * 0.15, 0.0)) * 0.35;
    warpedUV.y += fbm(uv * 2.3 + vec2(0.0, uTime * 0.12)) * 0.35;

    float f = fbm(warpedUV * 1.8 + vec2(uTime * 0.08));
    f = f * 0.5 + 0.5;

    // Color ramp through ember palette
    vec3 fireCol;
    if (f < 0.33) {
      fireCol = mix(C1, C2, f / 0.33);
    } else if (f < 0.66) {
      fireCol = mix(C2, C3, (f - 0.33) / 0.33);
    } else {
      fireCol = mix(C3, C4, (f - 0.66) / 0.34);
    }

    col = mix(col, fireCol, fireMask * f * 0.85);
  }

  // ── Glyph ambient glow (warm but still) ──────────────
  float glow = exp(-r * 4.5) * 0.18;
  col += C1 * glow;

  // ── Still hermetic glyph ─────────────────────────────
  // Completely time-independent
  float glyphSDF = 1e9;
  float glyphWidth = 0.0025;

  // Outer ring
  glyphSDF = min(glyphSDF, ring(uv, 0.35, glyphWidth));

  // Inner ring
  glyphSDF = min(glyphSDF, ring(uv, 0.18, glyphWidth));

  // 6 radial spokes at 60° intervals
  for (int i = 0; i < 6; i++) {
    float a = float(i) * 3.14159265 / 3.0;
    vec2 innerPt = vec2(cos(a), sin(a)) * 0.18;
    vec2 outerPt = vec2(cos(a), sin(a)) * 0.35;
    float d = sdSegment(uv, innerPt, outerPt) - glyphWidth * 0.5;
    glyphSDF = min(glyphSDF, d);
  }

  // Folded hexagon at r=0.27, rotated 15° off-axis (the "fold" quality)
  float hexRot = 0.2618; // 15 degrees in radians
  for (int i = 0; i < 6; i++) {
    float a0 = float(i) * 3.14159265 / 3.0 + hexRot;
    float a1 = float(i + 1) * 3.14159265 / 3.0 + hexRot;
    vec2 p0 = vec2(cos(a0), sin(a0)) * 0.27;
    vec2 p1 = vec2(cos(a1), sin(a1)) * 0.27;
    float d = sdSegment(uv, p0, p1) - glyphWidth * 0.5;
    glyphSDF = min(glyphSDF, d);
  }

  // 3 diagonal fold-crease lines (30°, 90°, 150°) — suggest collapsed planes
  float creaseLens[3];
  creaseLens[0] = 0.32;
  creaseLens[1] = 0.32;
  creaseLens[2] = 0.32;
  float creaseAngles[3];
  creaseAngles[0] = 0.5236;   // 30°
  creaseAngles[1] = 1.5708;   // 90°
  creaseAngles[2] = 2.6180;   // 150°

  for (int i = 0; i < 3; i++) {
    float d = sdLine(uv, creaseAngles[i], creaseLens[i]) - glyphWidth * 0.3;
    glyphSDF = min(glyphSDF, d);
  }

  // Node dots at every spoke+hex intersection region (6 nodes at r=0.27)
  for (int i = 0; i < 6; i++) {
    float a = float(i) * 3.14159265 / 3.0 + hexRot;
    vec2 np = vec2(cos(a), sin(a)) * 0.27;
    float d = sdCircle(uv - np, 0.008);
    glyphSDF = min(glyphSDF, d);
  }

  // Central node
  glyphSDF = min(glyphSDF, sdCircle(uv, 0.012));

  // Render glyph
  float glyphAlpha = 1.0 - smoothstep(0.0, 0.004, glyphSDF);
  if (glyphAlpha > 0.0) {
    // Ember-glow color: cooler at the glyph lines, slight hotspot at strokes
    float edgeGlow = 1.0 - smoothstep(0.0, 0.003, abs(glyphSDF));
    vec3 glyphCol = mix(C2, C3, edgeGlow);
    col = mix(col, glyphCol, glyphAlpha);
    // Add slight halo around glyph
    float halo = exp(-abs(glyphSDF) * 80.0) * 0.4;
    col += C2 * halo;
  }

  // ── Vignette at extreme edges ─────────────────────────
  col *= 1.0 - smoothstep(1.2, 1.8, r) * 0.8;

  gl_FragColor = vec4(col, 1.0);
}
`;

function GlyphPlane() {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  useFrame(({ clock, size }) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = clock.getElapsedTime();
      matRef.current.uniforms.uResolution.value.set(size.width, size.height);
    }
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
          uTime: { value: 0 },
          uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        }}
      />
    </mesh>
  );
}

export default function LongingWithoutObject() {
  return (
    <Canvas
      gl={{ antialias: true }}
      camera={{ position: [0, 0, 1], near: 0.1, far: 10 }}
      style={{ width: '100%', height: '100%' }}
    >
      <GlyphPlane />
    </Canvas>
  );
}
