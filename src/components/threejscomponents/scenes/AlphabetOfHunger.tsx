'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ─── Palette: Bone and Void ─────────────────────────────────────────────────
const PALETTE = {
  void: new THREE.Color('#000000'),
  deep: new THREE.Color('#111111'),
  bone: new THREE.Color('#c8b8a2'),
  pale: new THREE.Color('#e8ddd0'),
  flash: new THREE.Color('#ffffff'),
};

// ─── GPGPU Ping-Pong Buffer Shaders ─────────────────────────────────────────
const gpgpuVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const gpgpuFragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uPrev;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uState; // 0=void, 0.4=arriving, 0.6=holding, 0.8=dissolving

  varying vec2 vUv;

  // Simplex noise
  vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec3 permute(vec3 x){return mod289((x*34.0+1.0)*x);}
  float snoise(vec2 v){
    const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
    vec2 i=floor(v+dot(v,C.yz));
    vec2 x0=v-i+dot(i,C.xz);
    vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
    vec4 x12=x0.xyxy+C.xxzz;
    x12.xy-=i1;
    i=mod289(i);
    vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
    vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
    m=m*m;m=m*m;
    vec3 x=2.0*fract(p*C.www)-1.0;
    vec3 h=abs(x)-0.5;
    vec3 ox=floor(x+0.5);
    vec3 a0=x-ox;
    m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
    vec3 g;
    g.x=a0.x*x0.x+h.x*x0.y;
    g.yz=a0.yz*x12.xz+h.yz*x12.yw;
    return 130.0*dot(m,g);
  }

  // Domain warp — creates Spare-like organic flow
  vec2 warp(vec2 p, float t){
    float eps = 0.1;
    float n1 = snoise(p + vec2(t * 0.05));
    float n2 = snoise(p + vec2(t * 0.05 + 3.14159));
    vec2 grad = vec2(
      snoise(p + vec2(eps, 0.0) + t * 0.05) - snoise(p - vec2(eps, 0.0) + t * 0.05),
      snoise(p + vec2(0.0, eps) + t * 0.05) - snoise(p - vec2(0.0, eps) + t * 0.05)
    ) / (2.0 * eps);
    return p + grad * 0.15;
  }

  // FBM for organic displacement
  float fbm(vec2 p, float t){
    float f = 0.0;
    f += 0.5 * snoise(p + t * 0.1); p *= 2.02;
    f += 0.25 * snoise(p + t * 0.15); p *= 2.03;
    f += 0.125 * snoise(p + t * 0.2);
    return f;
  }

  void main() {
    vec2 uv = vUv;
    vec2 center = vec2(0.5);
    vec2 toCenter = center - uv;
    float dist = length(toCenter);

    // Domain warp for organic flow
    vec2 warpedUv = warp(uv * 2.0, uTime) * 0.5;

    // Sample previous position with warp
    vec2 sampleUv = mod(warpedUv, 1.0);
    vec4 prev = texture2D(uPrev, sampleUv);

    // Attractor toward sigil center — intensity based on state
    float attractorStrength = smoothstep(0.0, 0.4, uState) * smoothstep(1.0, 0.6, uState);
    float pullToCenter = 0.02 * attractorStrength;
    vec2 biasedUv = mix(uv, center, pullToCenter * (1.0 - dist * 0.5));

    // Add noise displacement — the "automatic drawing" feel
    float noiseDisp = fbm(uv * 3.0, uTime) * 0.02 * attractorStrength;
    vec2 noiseOffset = vec2(
      snoise(uv * 4.0 + uTime * 0.1),
      snoise(uv * 4.0 + 100.0 + uTime * 0.1)
    ) * noiseDisp;
    biasedUv += noiseOffset;
    biasedUv = mod(biasedUv, 1.0);

    // Sample again after all displacements
    vec4 displaced = texture2D(uPrev, biasedUv);

    // Accumulation signal
    float signal = 0.0;
    if(uState > 0.1 && uState < 0.9){
      signal = snoise(uv * 8.0 + uTime * 0.2) * 0.5 + 0.5;
      signal *= attractorStrength;
    }

    // Fade and accumulate
    float fade = 0.975;
    vec3 col = displaced.rgb * fade;
    col += signal * vec3(0.784, 0.722, 0.635) * 0.15; // bone

    // Void state — clear everything
    if(uState < 0.05){
      col *= 0.0;
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;

// ─── SDF Raymarching Shaders ────────────────────────────────────────────────
const sdfVertexShader = /* glsl */ `
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;
    vPosition = position;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const sdfFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uState;
  uniform vec3 uBone;
  uniform vec3 uPale;
  uniform vec3 uDeep;
  uniform vec3 uVoid;
  uniform sampler2D uGpgpu;

  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  // ── Noise ──────────────────────────────────────────────────────────────────
  vec3 mod289v3(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 mod289v4(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 permute4(vec4 x){return mod289v4((x*34.0+1.0)*x);}
  vec4 taylorInvSqrt4(vec4 r){return 1.79284291400159-0.85373472095314*r;}

  float snoise(vec3 v){
    const vec2 C=vec2(1.0/6.0,1.0/3.0);
    const vec4 D=vec4(0.0,0.5,1.0,2.0);
    vec3 i=floor(v+dot(v,C.yyy));
    vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz);
    vec3 l=1.0-g;
    vec3 i1=min(g,l.zxy);
    vec3 i2=max(g,l.zxy);
    vec3 x1=x0-i1+C.xxx;
    vec3 x2=x0-i2+C.yyy;
    vec3 x3=x0-D.yyy;
    i=mod289v3(i);
    vec4 p=permute4(permute4(permute4(
      i.z+vec4(0.0,i1.z,i2.z,1.0))
      +i.y+vec4(0.0,i1.y,i2.y,1.0))
      +i.x+vec4(0.0,i1.x,i1.x,1.0));
    float n_=0.142857142857;
    vec3 ns=n_*D.wyz-D.xzx;
    vec4 j=p-49.0*floor(p*ns.z*ns.z);
    vec4 x_=floor(j*ns.z);
    vec4 y_=floor(j-7.0*x_);
    vec4 x=x_*ns.x+ns.yyyy;
    vec4 y=y_*ns.x+ns.yyyy;
    vec4 h=1.0-abs(x)-abs(y);
    vec4 b0=vec4(x.xy,y.xy);
    vec4 b1=vec4(x.zw,y.zw);
    vec4 s0=floor(b0)*2.0+1.0;
    vec4 s1=floor(b1)*2.0+1.0;
    vec4 sh=-step(h,vec4(0.0));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
    vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x);
    vec3 p1=vec3(a0.zw,h.y);
    vec3 p2=vec3(a1.xy,h.z);
    vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=taylorInvSqrt4(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
    vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
    m=m*m;
    return 42.0*dot(m*m,vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  }

  float fbm(vec3 p){
    float f=0.0;
    f+=0.5*snoise(p);p*=2.01;
    f+=0.25*snoise(p);p*=2.02;
    f+=0.125*snoise(p);
    return f;
  }

  // ── SDF Primitives ──────────────────────────────────────────────────────────
  float sdSphere(vec3 p, float r){ return length(p)-r; }

  float sdCapsule(vec3 p, vec3 a, vec3 b, float r){
    vec3 pa=p-a, ba=b-a;
    float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0);
    return length(pa-ba*h)-r;
  }

  float sdTorus(vec3 p, vec2 t){
    vec2 q=vec2(length(p.xz)-t.x,p.y);
    return length(q)-t.y;
  }

  // ── Rotation ────────────────────────────────────────────────────────────────
  mat2 rot(float a){
    float c=cos(a),s=sin(a);
    return mat2(c,-s,s,c);
  }

  // ── Broken Axis Symmetry — the sigil core ────────────────────────────────────
  vec3 breakAxis(vec3 p, float t){
    // Primary symmetry planes — 3-fold like a sigil glyph
    float n = 3.0;
    for(float i=0.0;i<n;i++){
      float angle = i * 3.14159 * 2.0 / n + t * 0.05;
      vec3 nrm = vec3(cos(angle), 0.0, sin(angle));
      float d = dot(p, nrm);
      if(d < 0.0) p -= 2.0 * d * nrm;
    }

    // THE BREAK — asymmetric Y displacement
    // One side heavier, one side breaking away
    float wrongness = 0.15 + sin(t * 0.17) * 0.03;
    p.y += wrongness;
    p.x += sin(p.y * 2.0 + t * 0.2) * 0.06;

    // Second break — X axis tilted
    p.xz *= rot(sin(t * 0.1) * 0.1);

    return p;
  }

  // ── Sigil SDF — Spare's alphabet as form ────────────────────────────────────
  float sigil(vec3 p, float t){
    // Core — broken symmetry sphere
    vec3 coreP = breakAxis(p, t);

    // Base sphere
    float core = sdSphere(coreP, 0.8);

    // Displacement from GPGPU texture — organic atavistic growth
    float disp = fbm(coreP * 2.0 + t * 0.15) * 0.12;
    core += disp;

    // Capsule arms — sigil letter strokes
    // These rotate slowly, creating the "still arriving" sensation
    float armCount = 4.0;
    float armLength = 0.6;
    for(float i=0.0;i<armCount;i++){
      float angle = i * 3.14159 * 2.0 / armCount + t * 0.03;
      // Break the symmetry — not evenly spaced
      angle += sin(i * 1.5 + t * 0.07) * 0.3;
      vec3 armStart = vec3(cos(angle) * 0.5, 0.0, sin(angle) * 0.5);
      vec3 armEnd = armStart + vec3(cos(angle), 0.0, sin(angle)) * armLength;
      float arm = sdCapsule(p, armStart, armEnd, 0.03 + sin(t + i) * 0.01);
      core = min(core, arm);
    }

    // Twisted torus at the edge — "almost visible"
    vec3 tp = p;
    tp.xz *= rot(t * 0.08);
    tp.y += sin(t * 0.15) * 0.1;
    float torus = sdTorus(tp, vec2(1.2, 0.015));
    torus = abs(torus) - 0.005;

    // Ring of small spheres — alphabet nodes
    float ringRadius = 1.0;
    float nodeCount = 6.0;
    for(float i=0.0;i<nodeCount;i++){
      float angle = i * 3.14159 * 2.0 / nodeCount + t * 0.04;
      // Break — irregular spacing
      angle += sin(i * 2.3 + t * 0.05) * 0.4;
      vec3 nodePos = vec3(cos(angle) * ringRadius, sin(angle * 1.7) * 0.1, sin(angle) * ringRadius);
      float node = sdSphere(p - nodePos, 0.04 + sin(i + t) * 0.015);
      core = min(core, node);
    }

    return min(core, torus);
  }

  // ── Scene SDF ──────────────────────────────────────────────────────────────
  float scene(vec3 p, float t){
    float s = sigil(p, t);

    // State-based dissolution
    // 0.4-0.6 arriving, 0.6-0.8 holding, 0.8-1.0 dissolving
    float dissolveStart = 0.78;
    float dissolveEnd = 0.95;
    float dissolveFactor = smoothstep(dissolveStart, dissolveEnd, t);

    // Add noise-based dissolution at edges
    float noiseDissolve = fbm(p * 3.0 + t) * 0.3;
    s += noiseDissolve * dissolveFactor;

    return s;
  }

  // ── Raymarcher ──────────────────────────────────────────────────────────────
  vec3 calcNormal(vec3 p, float t){
    float e=0.001;
    return normalize(vec3(
      scene(p+vec3(e,0,0),t)-scene(p-vec3(e,0,0),t),
      scene(p+vec3(0,e,0),t)-scene(p-vec3(0,e,0),t),
      scene(p+vec3(0,0,e),t)-scene(p-vec3(0,0,e),t)
    ));
  }

  float raymarch(vec3 ro, vec3 rd, float t){
    float d=0.0;
    for(int i=0;i<100;i++){
      vec3 p=ro+rd*d;
      float h=scene(p,t);
      if(h<0.001) return d;
      if(d>25.0) break;
      d+=h*0.7;
    }
    return -1.0;
  }

  void main(){
    vec3 ro = vec3(0.0, 0.0, 4.0);
    vec3 rd = normalize(vWorldPos - cameraPosition);

    float d = raymarch(ro, rd, uTime);

    vec3 col = uVoid;

    // Background gradient — deep void with subtle bone
    float bgGrad = 1.0 - length(vUv - 0.5) * 0.5;
    col = mix(uDeep, uVoid, bgGrad);

    if(d > 0.0){
      vec3 p = ro + rd * d;
      vec3 n = calcNormal(p, uTime);

      // Dual lighting — key and fill
      vec3 light1 = normalize(vec3(2.0, 3.0, 4.0));
      float diff1 = max(0.0, dot(n, light1));
      vec3 light2 = normalize(vec3(-2.0, -1.0, 3.0));
      float diff2 = max(0.0, dot(n, light2)) * 0.25;

      // Rim lighting — bone white
      float rim = pow(1.0 - max(0.0, dot(n, -rd)), 4.0);

      // State-based visibility
      float arrive = smoothstep(0.0, 0.5, uState);
      float hold = smoothstep(0.5, 0.7, uState) * smoothstep(1.0, 0.75, uState);

      // Bone coloring with depth
      col = mix(uDeep, uBone, diff1 * 0.8 + rim * 0.6);
      col = mix(col, uPale, rim * 0.3 * hold);

      // GPGPU signal bleeds through
      if(uGpgpu){
        vec2 fbUV = mod(vUv * 0.3 + 0.5 + uTime * 0.008, 1.0);
        vec3 gpgpuSignal = texture2D(uGpgpu, fbUV).rgb;
        col = mix(col, uBone, gpgpuSignal.r * 0.25 * hold);
      }

      // The arrival moment — brief clarity
      float clarity = smoothstep(0.45, 0.55, uState) * smoothstep(0.75, 0.65, uState);
      col = mix(col, uPale, clarity * 0.15);

      // Fade based on state
      col *= arrive;

      // Final dissolution
      float dissolve = smoothstep(0.8, 1.0, uState);
      col *= 1.0 - dissolve;
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;

// ─── Post-Processing Shaders ─────────────────────────────────────────────────
const postVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main(){ vUv=uv; gl_Position=vec4(position,1.0); }
`;

const postFragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uScene;
  uniform float uTime;
  uniform vec2 uResolution;

  varying vec2 vUv;

  float hash(vec2 p){
    return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);
  }

  void main(){
    vec2 uv = vUv;

    // Chromatic aberration — edges only
    float distFromCenter = length(uv - 0.5);
    float aberration = 0.003 * distFromCenter;
    vec3 col;
    col.r = texture2D(uScene, uv + vec2(aberration, 0.0)).r;
    col.g = texture2D(uScene, uv).g;
    col.b = texture2D(uScene, uv - vec2(aberration, 0.0)).b;

    // Vignette — void black at edges
    float vignette = 1.0 - dot(uv - 0.5, uv - 0.5) * 0.5 * 2.0;
    vignette = smoothstep(0.0, 1.0, vignette);
    col *= vignette;

    // Film grain
    float grain = hash(uv + fract(uTime * 0.7)) * 0.035 - 0.0175;
    col += grain;

    // Bone-white color grade
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, vec3(lum * 1.05 + 0.02), 0.15);

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }
`;

// ─── Main Scene ──────────────────────────────────────────────────────────────
function AlphabetOfHungerSceneInner() {
  const { gl, size, camera } = useThree();
  const timeRef = useRef(0);

  // GPGPU ping-pong refs
  const pingRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const pongRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const gpgpuQuadRef = useRef<THREE.Mesh>(null!);
  const gpgpuMatRef = useRef<THREE.ShaderMaterial>(null!);
  const gpgpuCamera = useMemo(() => new THREE.OrthographicCamera(-1,1,1,-1,0,1), []);

  // Scene render target
  const sceneRT = useMemo(() => {
    const rt = new THREE.WebGLRenderTarget(size.width, size.height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });
    return rt;
  }, [size]);

  // SDF mesh ref
  const meshRef = useRef<THREE.Mesh>(null!);

  // SDF material
  const sdfMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: sdfVertexShader,
    fragmentShader: sdfFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uState: { value: 0 },
      uBone: { value: PALETTE.bone },
      uPale: { value: PALETTE.pale },
      uDeep: { value: PALETTE.deep },
      uVoid: { value: PALETTE.void },
      uGpgpu: { value: null },
    },
  }), []);

  // GPGPU materials
  const gpgpuMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: gpgpuVertexShader,
    fragmentShader: gpgpuFragmentShader,
    uniforms: {
      uPrev: { value: null },
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
      uState: { value: 0 },
    },
  }), [size]);

  // Post material
  const postMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: postVertexShader,
    fragmentShader: postFragmentShader,
    uniforms: {
      uScene: { value: null },
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
    },
  }), [size]);

  const postQuadRef = useRef<THREE.Mesh>(null!);
  const postCamera = useMemo(() => new THREE.OrthographicCamera(-1,1,1,-1,0,1), []);

  // Initialize GPGPU buffers
  useEffect(() => {
    pingRef.current = new THREE.WebGLRenderTarget(size.width, size.height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
    });
    pongRef.current = new THREE.WebGLRenderTarget(size.width, size.height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
    });

    return () => {
      pingRef.current?.dispose();
      pongRef.current?.dispose();
    };
  }, [size]);

  // 60 second cycle: 20s arrive, 10s hold, 20s disperse, 10s void
  const CYCLE = 60;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    timeRef.current = t;

    // Calculate state (0-1) over the cycle
    const cycleT = t % CYCLE;
    let state = 0;
    if (cycleT < 20) {
      state = smoothstep(0, 20, cycleT) * 0.5; // arriving 0-0.5
    } else if (cycleT < 30) {
      state = 0.5 + smoothstep(20, 30, cycleT) * 0.15; // holding 0.5-0.65
    } else if (cycleT < 50) {
      state = 0.65 + smoothstep(30, 50, cycleT) * 0.25; // dispersing 0.65-0.9
    } else {
      state = 0.9 - smoothstep(50, 60, cycleT) * 0.9; // void back to 0
    }

    // Update GPGPU
    if (gpgpuMatRef.current && pingRef.current && pongRef.current) {
      gpgpuMatRef.current.uniforms.uTime.value = t;
      gpgpuMatRef.current.uniforms.uState.value = state;
      gpgpuMatRef.current.uniforms.uPrev.value = pongRef.current.texture;

      gl.setRenderTarget(pingRef.current);
      gl.render(gpgpuQuadRef.current, gpgpuCamera);
      gl.setRenderTarget(null);

      // Swap
      const tmp = pingRef.current;
      pingRef.current = pongRef.current;
      pongRef.current = tmp;
    }

    // Update SDF
    sdfMat.uniforms.uTime.value = t;
    sdfMat.uniforms.uState.value = state;
    if (pongRef.current) {
      sdfMat.uniforms.uGpgpu.value = pongRef.current.texture;
    }

    // Render scene to RT
    gl.setRenderTarget(sceneRT);
    gl.clear();
    gl.render(meshRef.current, camera);
    gl.setRenderTarget(null);

    // Post to screen
    postMat.uniforms.uScene.value = sceneRT.texture;
    postMat.uniforms.uTime.value = t;
    gl.render(postQuadRef.current, postCamera);
  }, 0);

  // Smoothstep helper
  function smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  return (
    <>
      {/* SDF mesh */}
      <mesh ref={meshRef} material={sdfMat}>
        <boxGeometry args={[2.5, 2.5, 2.5]} />
      </mesh>

      {/* GPGPU quad */}
      <mesh ref={gpgpuQuadRef} visible={false}>
        <planeGeometry args={[2, 2]} />
        <shaderMaterial
          ref={gpgpuMatRef}
          vertexShader={gpgpuVertexShader}
          fragmentShader={gpgpuFragmentShader}
          uniforms={{
            uPrev: { value: null },
            uTime: { value: 0 },
            uResolution: { value: new THREE.Vector2(size.width, size.height) },
            uState: { value: 0 },
          }}
        />
      </mesh>

      {/* Post quad */}
      <mesh ref={postQuadRef} material={postMat}>
        <planeGeometry args={[2, 2]} />
      </mesh>
    </>
  );
}

// ─── Export ─────────────────────────────────────────────────────────────────
export default function AlphabetOfHunger() {
  return (
    <Canvas
      style={{ width: '100%', height: '100%', display: 'block' }}
      gl={{ antialias: false, alpha: false }}
    >
      <AlphabetOfHungerSceneInner />
    </Canvas>
  );
}
