'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ─── Palette: Ember Dark ─────────────────────────────────────────────────────
const C = {
  void:  new THREE.Color('#0a0000'),
  deep:  new THREE.Color('#3d0000'),
  ember: new THREE.Color('#8b1a00'),
  flame: new THREE.Color('#d4520a'),
  gold:  new THREE.Color('#ffb347'),
};

// ─── Vertex Shader ────────────────────────────────────────────────────────────
// Each particle: position driven by attractor field + curl noise in vertex shader.
// Color encodes cluster density via distance to nearest attractor.

const particleVert = /* glsl */`
precision highp float;

attribute float aIndex;
attribute vec3 aSeed;        // random seed per particle [0,1]^3

uniform float uTime;
uniform float uCycle;        // 90.0
uniform vec3  uAttractors[8];
uniform float uScatter;      // 0→1 how far attractors have drifted apart
uniform float uPhase;        // 0→1 within cycle

// Palette
uniform vec3 uVoid;
uniform vec3 uEmber;
uniform vec3 uFlame;
uniform vec3 uGold;

varying vec3 vColor;
varying float vAlpha;

// ── Mulberry32-ish hash ───────────────────────────────────────────────────────
float hash(float n){ return fract(sin(n)*43758.5453123); }
vec3  hash3(float n){ return vec3(hash(n), hash(n+1.7), hash(n+3.3)); }

// ── Simplex noise 2D ──────────────────────────────────────────────────────────
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

// Curl noise — fluid-like drift
vec2 curl(vec2 p, float t){
  float eps = 0.02;
  float n1 = snoise(vec2(p.x, p.y + eps) + t*0.07);
  float n2 = snoise(vec2(p.x, p.y - eps) + t*0.07);
  float n3 = snoise(vec2(p.x + eps, p.y) + t*0.07);
  float n4 = snoise(vec2(p.x - eps, p.y) + t*0.07);
  return vec2((n1-n2)/(2.0*eps), -(n3-n4)/(2.0*eps));
}

void main(){
  // Particle seed position — initially scattered across a disk
  float angle0 = aSeed.x * 6.2831853;
  float radius0 = 0.3 + aSeed.y * 3.5;
  vec2 seed2d = vec2(cos(angle0)*radius0, sin(angle0)*radius0);

  // Time within cycle
  float cycleT = mod(uTime, uCycle);

  // ── Find nearest attractor ──────────────────────────────────────────────────
  float minDist = 99.0;
  int nearestIdx = 0;
  for(int i = 0; i < 8; i++){
    float d = length(seed2d - uAttractors[i].xy);
    if(d < minDist){ minDist = d; nearestIdx = i; }
  }
  vec3 nearAtt = uAttractors[nearestIdx];

  // ── Convergence weight ──────────────────────────────────────────────────────
  // Phase 0→0.45: converge. 0.45→0.55: hold. 0.55→1.0: scatter.
  float converge = smoothstep(0.0, 0.45, uPhase) * (1.0 - smoothstep(0.55, 0.95, uPhase));
  // Pull strength toward nearest attractor
  float pullRadius = 1.0 + aSeed.z * 1.8; // how close the particle orbits
  vec2 toAtt = nearAtt.xy - seed2d;
  float distToAtt = length(toAtt);

  // Orbit — particles don't slam into center, they orbit at pullRadius distance
  vec2 orbitDir = normalize(toAtt);
  vec2 tangent  = vec2(-orbitDir.y, orbitDir.x) * (aSeed.z > 0.5 ? 1.0 : -1.0);
  float orbitPhase = uTime * (0.15 + aSeed.x * 0.1) + aSeed.y * 6.283;
  vec2 orbitPos = nearAtt.xy + normalize(toAtt + tangent*0.4) * pullRadius;

  // Blend: scattered seed → orbit position
  vec2 basePos = mix(seed2d, orbitPos, converge);

  // ── Curl noise drift ────────────────────────────────────────────────────────
  vec2 curlDrift = curl(basePos * 0.4, uTime) * 0.6;
  // Periphery drifts more, center less
  float centerDist = length(basePos);
  curlDrift *= 0.2 + centerDist * 0.3;

  // ── Scatter on dissolution ──────────────────────────────────────────────────
  // Attractors drift apart — particle follows its assigned attractor outward
  float scatterAmt = smoothstep(0.55, 0.95, uPhase);
  vec2 scatterDir = normalize(nearAtt.xy + 0.001);
  vec2 scatterPos = seed2d + scatterDir * scatterAmt * 4.0;

  vec2 finalPos2d = mix(basePos + curlDrift, scatterPos + curlDrift * 0.3, scatterAmt);

  // ── Z wobble — adds depth, feels alive ──────────────────────────────────────
  float z = snoise(vec2(aSeed.x * 8.0, uTime * 0.08)) * 0.8;

  vec3 finalPos = vec3(finalPos2d, z);

  // ── Color by proximity to sigil form ────────────────────────────────────────
  float proximity = 1.0 - clamp(distToAtt / 3.0, 0.0, 1.0);
  float formation = converge * proximity;

  vec3 col = uVoid;
  col = mix(col, uEmber, formation * 0.6 + 0.1);
  col = mix(col, uFlame, formation * formation * 0.8);
  col = mix(col, uGold,  pow(formation, 3.0) * converge);

  // ── Fade in at birth ─────────────────────────────────────────────────────────
  float birthFade = smoothstep(0.0, 0.06, uPhase);
  // ── Fade out at end ──────────────────────────────────────────────────────────
  float deathFade = 1.0 - smoothstep(0.92, 1.0, uPhase);

  vColor = col;
  vAlpha = birthFade * deathFade * (0.3 + formation * 0.7);

  gl_Position  = projectionMatrix * modelViewMatrix * vec4(finalPos, 1.0);
  // Point size — larger near center/attractor, smaller at periphery
  gl_PointSize = (1.5 + formation * 4.0) * (1.0 / -gl_Position.z * 200.0);
  gl_PointSize = clamp(gl_PointSize, 0.8, 6.0);
}
`;

// ─── Fragment Shader ──────────────────────────────────────────────────────────
const particleFrag = /* glsl */`
precision highp float;

varying vec3 vColor;
varying float vAlpha;

void main(){
  // Soft circular point
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if(d > 0.5) discard;
  float softEdge = 1.0 - smoothstep(0.2, 0.5, d);
  gl_FragColor = vec4(vColor, vAlpha * softEdge);
}
`;

// ─── Post Shaders ─────────────────────────────────────────────────────────────
const postVert = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }
`;

const postFrag = /* glsl */`
precision highp float;

uniform sampler2D uScene;
uniform float uTime;
uniform vec2 uResolution;
uniform float uPhase;

varying vec2 vUv;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }

void main(){
  vec2 uv = vUv;

  // Chromatic aberration — ember red bleeds outward
  float aber = 0.0025 * (0.5 + 0.5*sin(uTime * 0.3));
  vec2 toCenter = uv - 0.5;
  float dist = length(toCenter);

  vec3 col;
  col.r = texture2D(uScene, uv + toCenter * aber).r;
  col.g = texture2D(uScene, uv).g;
  col.b = texture2D(uScene, uv - toCenter * aber).b;

  // Vignette — heavy, occult
  float vig = 1.0 - dot(toCenter, toCenter) * 2.2;
  vig = pow(clamp(vig, 0.0, 1.0), 0.8);
  col *= vig;

  // Grain — time-seeded
  float grain = hash(uv + fract(uTime * 0.01)) * 0.035 - 0.017;
  col += grain;

  // Subtle bloom pass — brightest pixels bleed
  vec3 bright = max(col - 0.4, 0.0) * 1.5;
  for(int i = 1; i <= 4; i++){
    float s = float(i) * 0.003;
    bright += max(texture2D(uScene, uv + vec2(s, 0.0)).rgb - 0.4, 0.0) * 0.25;
    bright += max(texture2D(uScene, uv - vec2(s, 0.0)).rgb - 0.4, 0.0) * 0.25;
    bright += max(texture2D(uScene, uv + vec2(0.0, s)).rgb - 0.4, 0.0) * 0.25;
    bright += max(texture2D(uScene, uv - vec2(0.0, s)).rgb - 0.4, 0.0) * 0.25;
  }
  col += bright * 0.15;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

// ─── Attractor Config ─────────────────────────────────────────────────────────
// 8 points tracing a rough sigil glyph — asymmetric by design.
// These are the "vertices of the polygon" that will drift apart.
function buildAttractors(scatter: number): THREE.Vector3[] {
  const base = [
    // Spine — slightly off-center (asymmetry is intentional)
    new THREE.Vector3(-0.1, 1.8, 0),
    new THREE.Vector3(0.15, 0.7, 0),
    new THREE.Vector3(-0.2, -0.1, 0),
    new THREE.Vector3(0.1, -0.9, 0),
    new THREE.Vector3(-0.05, -1.85, 0),
    // Cross-strokes — the sigil's arms
    new THREE.Vector3(-1.1, 0.4, 0),
    new THREE.Vector3(0.9, -0.2, 0),
    // The displaced one — "something feels wrong, leave it"
    new THREE.Vector3(-0.7, 1.1, 0),
  ];
  // On scatter, points drift outward along their natural direction
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

// ─── Inner Scene ──────────────────────────────────────────────────────────────
function AlphabetOfTendernessInner() {
  const { gl, size } = useThree();
  const CYCLE = 90.0;
  const N_PARTICLES = 8000;

  // Particle geometry — positions seeded once
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const indices  = new Float32Array(N_PARTICLES);
    const seeds    = new Float32Array(N_PARTICLES * 3);

    for (let i = 0; i < N_PARTICLES; i++) {
      indices[i] = i;
      seeds[i*3 + 0] = Math.random();
      seeds[i*3 + 1] = Math.random();
      seeds[i*3 + 2] = Math.random();
    }

    // Dummy positions — actual positions computed in vertex shader
    const pos = new Float32Array(N_PARTICLES * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aIndex',   new THREE.BufferAttribute(indices, 1));
    geo.setAttribute('aSeed',    new THREE.BufferAttribute(seeds, 3));
    return geo;
  }, []);

  const attractorUniforms = useMemo(() => {
    const arr: THREE.Vector3[] = buildAttractors(0);
    // Pad to 8
    while (arr.length < 8) arr.push(new THREE.Vector3(0,0,0));
    return arr;
  }, []);

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: particleVert,
    fragmentShader: particleFrag,
    uniforms: {
      uTime:       { value: 0 },
      uCycle:      { value: CYCLE },
      uPhase:      { value: 0 },
      uScatter:    { value: 0 },
      uAttractors: { value: attractorUniforms },
      uVoid:       { value: C.void },
      uEmber:      { value: C.ember },
      uFlame:      { value: C.flame },
      uGold:       { value: C.gold },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }), [attractorUniforms]);

  // Post-process: render scene to RT, then blit through post shader
  const sceneRT = useMemo(() => new THREE.WebGLRenderTarget(size.width, size.height, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
  }), [size]);

  const postMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: postVert,
    fragmentShader: postFrag,
    uniforms: {
      uScene:      { value: null },
      uTime:       { value: 0 },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
      uPhase:      { value: 0 },
    },
    depthWrite: false,
  }), [size]);

  const postCam  = useMemo(() => new THREE.OrthographicCamera(-1,1,1,-1,0,1), []);
  const postQuad = useMemo(() => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2,2), postMat);
    return m;
  }, [postMat]);

  const pointsRef = useRef<THREE.Points>(null!);
  const sceneObj  = useMemo(() => {
    const s = new THREE.Scene();
    s.background = new THREE.Color('#0a0000');
    return s;
  }, []);

  const mouseRef = useRef(new THREE.Vector2(0, 0));

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      mouseRef.current.set(
        (e.clientX / window.innerWidth)  * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      );
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  const cameraRef = useRef<THREE.PerspectiveCamera>(null!);

  useFrame(({ clock, camera }) => {
    const t = clock.getElapsedTime();
    const cycleT = t % CYCLE;
    const phase = cycleT / CYCLE;

    // Scatter amt: 0 during formation, rises after phase 0.55
    const scatter = Math.max(0, (phase - 0.55) / 0.4);

    // Update attractor positions
    const newAtts = buildAttractors(scatter * 3.5);
    for (let i = 0; i < 8; i++) {
      (material.uniforms.uAttractors.value as THREE.Vector3[])[i].copy(newAtts[i]);
    }

    material.uniforms.uTime.value  = t;
    material.uniforms.uPhase.value = phase;
    material.uniforms.uScatter.value = scatter;

    postMat.uniforms.uTime.value  = t;
    postMat.uniforms.uPhase.value = phase;

    // Subtle camera drift — the piece breathes
    const breathe = Math.sin(t * 0.18) * 0.05;
    camera.position.x = mouseRef.current.x * 0.3 + breathe;
    camera.position.y = mouseRef.current.y * 0.2 + Math.sin(t * 0.11) * 0.03;
    camera.lookAt(0, 0, 0);

    // Add points to temp scene for RT render
    if (pointsRef.current && !sceneObj.children.includes(pointsRef.current)) {
      sceneObj.add(pointsRef.current);
    }

    // Render particles → sceneRT
    gl.setRenderTarget(sceneRT);
    gl.setClearColor(new THREE.Color('#0a0000'), 1);
    gl.clear();
    gl.render(sceneObj, camera);
    gl.setRenderTarget(null);

    // Blit through post shader
    postMat.uniforms.uScene.value = sceneRT.texture;
    gl.clear();
    gl.render(postQuad, postCam);
  });

  return (
    <points ref={pointsRef} geometry={geometry} material={material} />
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function TheAlphabetOfTenderness() {
  return (
    <Canvas
      style={{ width: '100%', height: '100%', display: 'block' }}
      gl={{ antialias: false, alpha: false }}
      camera={{ position: [0, 0, 5.5], fov: 55 }}
    >
      <AlphabetOfTendernessInner />
    </Canvas>
  );
}
