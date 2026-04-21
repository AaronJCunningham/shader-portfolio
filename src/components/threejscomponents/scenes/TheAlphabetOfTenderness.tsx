'use client';

/**
 * THE ALPHABET OF TENDERNESS
 * Oracle: Austin Osman Spare — Seed 20260421 — April 21, 2026
 *
 * Channel: Austin Osman Spare / automatic line / the alphabet of desire
 * "The hand moves; the mind steps aside."
 *
 * 8,000 particles drift in scattered chaos across a void of near-black deep red.
 * Slowly they cohere toward eight attractor points that trace the ghost of a sigil.
 * The form almost resolves — then the attractor vertices drift apart,
 * the polygon buckles, and the particles dissolve back into formlessness.
 *
 * Ember dark palette: #0a0000 → #3d0000 → #8b1a00 → #d4520a → #ffb347
 */

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─── Palette ─────────────────────────────────────────────────────────────────
const PALETTE = {
  void:  new THREE.Color('#0a0000'),
  deep:  new THREE.Color('#3d0000'),
  ember: new THREE.Color('#8b1a00'),
  flame: new THREE.Color('#d4520a'),
  gold:  new THREE.Color('#ffb347'),
};

// ─── Vertex Shader ───────────────────────────────────────────────────────────
const particleVert = /* glsl */`
precision highp float;

attribute float aIndex;
attribute vec3 aSeed;

uniform float uTime;
uniform float uCycle;
uniform vec3 uAttractors[8];
uniform float uScatter;
uniform float uPhase;
uniform vec3 uVoid;
uniform vec3 uEmber;
uniform vec3 uFlame;
uniform vec3 uGold;

varying vec3 vColor;
varying float vAlpha;

float hash(float n){ return fract(sin(n)*43758.5453123); }

// Simplex noise
vec3 mod289(vec3 x){ return x - floor(x*(1.0/289.0))*289.0; }
vec2 mod289(vec2 x){ return x - floor(x*(1.0/289.0))*289.0; }
vec3 permute(vec3 x){ return mod289((x*34.0+1.0)*x); }

float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0,i1.y,1.0)) + i.x + vec3(0.0,i1.x,1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x  = 2.0*fract(p*C.www) - 1.0;
  vec3 h  = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314*(a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x*x0.x  + h.x*x0.y;
  g.yz = a0.yz*x12.xz + h.yz*x12.yw;
  return 130.0*dot(m, g);
}

vec2 curl(vec2 p, float t){
  float eps = 0.02;
  float n1 = snoise(vec2(p.x, p.y + eps) + t*0.07);
  float n2 = snoise(vec2(p.x, p.y - eps) + t*0.07);
  float n3 = snoise(vec2(p.x + eps, p.y) + t*0.07);
  float n4 = snoise(vec2(p.x - eps, p.y) + t*0.07);
  return vec2((n1-n2)/(2.0*eps), -(n3-n4)/(2.0*eps));
}

void main(){
  float angle0 = aSeed.x * 6.2831853;
  float radius0 = 0.3 + aSeed.y * 3.5;
  vec2 seed2d = vec2(cos(angle0)*radius0, sin(angle0)*radius0);

  float cycleT = mod(uTime, uCycle);

  // Find nearest attractor
  float minDist = 99.0;
  int nearestIdx = 0;
  for(int i = 0; i < 8; i++){
    float d = length(seed2d - uAttractors[i].xy);
    if(d < minDist){ minDist = d; nearestIdx = i; }
  }
  vec3 nearAtt = uAttractors[nearestIdx];

  // Convergence: 0→0.45 converge, 0.45→0.55 hold, 0.55→1.0 scatter
  float converge = smoothstep(0.0, 0.45, uPhase) * (1.0 - smoothstep(0.55, 0.95, uPhase));

  float pullRadius = 1.0 + aSeed.z * 1.8;
  vec2 toAtt = nearAtt.xy - seed2d;
  float distToAtt = length(toAtt);

  vec2 orbitDir = normalize(toAtt + vec2(0.001));
  vec2 tangent  = vec2(-orbitDir.y, orbitDir.x) * (aSeed.z > 0.5 ? 1.0 : -1.0);
  vec2 orbitPos = nearAtt.xy + normalize(toAtt + tangent*0.4) * pullRadius;

  vec2 basePos = mix(seed2d, orbitPos, converge);

  // Curl noise drift
  vec2 curlDrift = curl(basePos * 0.4, uTime) * 0.6;
  float centerDist = length(basePos);
  curlDrift *= 0.2 + centerDist * 0.3;

  // Scatter on dissolution
  float scatterAmt = smoothstep(0.55, 0.95, uPhase);
  vec2 scatterDir = normalize(nearAtt.xy + 0.001);
  vec2 scatterPos = seed2d + scatterDir * scatterAmt * 4.0;

  vec2 finalPos2d = mix(basePos + curlDrift, scatterPos + curlDrift * 0.3, scatterAmt);

  // Z wobble
  float z = snoise(vec2(aSeed.x * 8.0, uTime * 0.08)) * 0.8;

  vec3 finalPos = vec3(finalPos2d, z);

  // Color by proximity — ALWAYS visible, brighter when scattered
  float proximity = 1.0 - clamp(distToAtt / 3.0, 0.0, 1.0);
  float formation = converge * proximity;

  // Base color: scattered particles are ember-red, formed particles flame-gold
  vec3 col = mix(uEmber, uFlame, formation);
  col = mix(col, uGold, pow(formation, 2.0) * converge);

  // Always visible — no fade-in, just fade-out at cycle end
  float deathFade = 1.0 - smoothstep(0.94, 1.0, uPhase);

  // Higher base alpha + brighter when scattered (chaos is beautiful too)
  float baseAlpha = 0.7 + (1.0 - formation) * 0.3;

  vColor = col;
  vAlpha = deathFade * baseAlpha;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPos, 1.0);
  // Larger points when scattered so chaos is visible, smaller when formed for density
  float sizeMix = 2.5 + (1.0 - formation) * 2.0 + formation * 3.0;
  gl_PointSize = sizeMix * (5.0 / gl_Position.w);
  gl_PointSize = clamp(gl_PointSize, 1.5, 10.0);
}
`;

// ─── Fragment Shader ─────────────────────────────────────────────────────────
const particleFrag = /* glsl */`
precision highp float;
varying vec3 vColor;
varying float vAlpha;

void main(){
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if(d > 0.5) discard;
  float softEdge = 1.0 - smoothstep(0.2, 0.5, d);
  gl_FragColor = vec4(vColor, vAlpha * softEdge);
}
`;

// ─── Attractor positions ─────────────────────────────────────────────────────
function buildAttractors(scatter: number): THREE.Vector3[] {
  const base = [
    new THREE.Vector3(-0.1, 1.8, 0),
    new THREE.Vector3(0.15, 0.7, 0),
    new THREE.Vector3(-0.2, -0.1, 0),
    new THREE.Vector3(0.1, -0.9, 0),
    new THREE.Vector3(-0.05, -1.85, 0),
    new THREE.Vector3(-1.1, 0.4, 0),
    new THREE.Vector3(0.9, -0.2, 0),
    new THREE.Vector3(-0.7, 1.1, 0),
  ];
  return base.map((v, i) => {
    const angle = Math.atan2(v.y, v.x) + (i * 0.4);
    const drift = scatter * (1.5 + i * 0.3);
    return new THREE.Vector3(
      v.x + Math.cos(angle) * drift,
      v.y + Math.sin(angle) * drift,
      v.z
    );
  });
}

// ─── Particle System ─────────────────────────────────────────────────────────
function ParticleField() {
  const CYCLE = 90.0;
  const N_PARTICLES = 8000;
  const pointsRef = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const indices = new Float32Array(N_PARTICLES);
    const seeds = new Float32Array(N_PARTICLES * 3);

    for (let i = 0; i < N_PARTICLES; i++) {
      indices[i] = i;
      seeds[i*3 + 0] = Math.random();
      seeds[i*3 + 1] = Math.random();
      seeds[i*3 + 2] = Math.random();
    }

    const pos = new Float32Array(N_PARTICLES * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aIndex', new THREE.BufferAttribute(indices, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
    return geo;
  }, []);

  const material = useMemo(() => {
    const atts = buildAttractors(0);
    while (atts.length < 8) atts.push(new THREE.Vector3(0,0,0));

    return new THREE.ShaderMaterial({
      vertexShader: particleVert,
      fragmentShader: particleFrag,
      uniforms: {
        uTime: { value: 0 },
        uCycle: { value: CYCLE },
        uPhase: { value: 0 },
        uScatter: { value: 0 },
        uAttractors: { value: atts },
        uVoid: { value: PALETTE.void },
        uEmber: { value: PALETTE.ember },
        uFlame: { value: PALETTE.flame },
        uGold: { value: PALETTE.gold },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const cycleT = t % CYCLE;
    const phase = cycleT / CYCLE;
    const scatter = Math.max(0, (phase - 0.55) / 0.4);

    const newAtts = buildAttractors(scatter * 3.5);
    for (let i = 0; i < 8; i++) {
      (material.uniforms.uAttractors.value as THREE.Vector3[])[i].copy(newAtts[i]);
    }

    material.uniforms.uTime.value = t;
    material.uniforms.uPhase.value = phase;
    material.uniforms.uScatter.value = scatter;
  });

  return (
    <points ref={pointsRef} geometry={geometry} material={material} />
  );
}

// ─── Vignette Overlay ────────────────────────────────────────────────────────
function Vignette() {
  const meshRef = useRef<THREE.Mesh>(null);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }
      `,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        void main(){
          vec2 toCenter = vUv - 0.5;
          float vig = 1.0 - dot(toCenter, toCenter) * 2.5;
          vig = pow(clamp(vig, 0.0, 1.0), 0.7);
          // Dark vignette — occult, heavy
          gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0 - vig * 0.85);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
  }, []);

  return (
    <mesh ref={meshRef} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function TheAlphabetOfTenderness() {
  return (
    <Canvas
      style={{ width: '100%', height: '100%', display: 'block', background: '#0a0000' }}
      gl={{ antialias: false, alpha: false }}
      camera={{ position: [0, 0, 5.5], fov: 55 }}
    >
      <color attach="background" args={['#0a0000']} />
      <ParticleField />
      <Vignette />
    </Canvas>
  );
}
