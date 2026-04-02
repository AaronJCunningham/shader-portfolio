'use client';

import { useRef, useMemo, useEffect } from 'react';
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

// ─── Ping-Pong Feedback Buffer Shaders ──────────────────────────────────────
const feedbackVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const feedbackFragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uPrev;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec3 uMouse;
  uniform float uBurst;

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

  // Curl noise for fluid-like advection
  vec2 curl(vec2 p, float t) {
    float eps = 0.01;
    float n1 = snoise(vec2(p.x, p.y + eps) + t * 0.1);
    float n2 = snoise(vec2(p.x, p.y - eps) + t * 0.1);
    float n3 = snoise(vec2(p.x + eps, p.y) + t * 0.1);
    float n4 = snoise(vec2(p.x - eps, p.y) + t * 0.1);
    return vec2((n1 - n2) / (2.0 * eps), -(n3 - n4) / (2.0 * eps));
  }

  void main() {
    vec2 uv = vUv;
    vec2 center = vec2(0.5);
    vec2 toCenter = center - uv;
    float dist = length(toCenter);

    // Advect via curl noise
    vec2 drift = curl(uv * 2.0, uTime * 0.3) * 0.003;
    vec2 advectedUv = mod(uv + drift, 1.0);

    // Sample previous with slight pull toward center (attractor)
    float pull = 0.015;
    vec2 biasedUv = mix(advectedUv, center, pull * (1.0 - dist));
    biasedUv = mod(biasedUv, 1.0);

    vec4 prev = texture2D(uPrev, biasedUv);

    // Attractor pulse at center
    float attractorDist = length(uv - center);
    float pulse = sin(uTime * 0.8) * 0.5 + 0.5;
    float attractor = exp(-attractorDist * 8.0) * pulse * 0.4;
    attractor += exp(-attractorDist * 20.0) * 0.3;

    // Burst injection on click
    float burstDist = length(uv - uMouse.xy);
    attractor += uBurst * exp(-burstDist * 6.0) * 0.6;

    // Fade and accumulate
    float fade = 0.985;
    vec3 signal = prev.rgb * fade;
    signal += attractor * vec3(0.784, 0.722, 0.635); // bone color

    // Emergence phase (first 15s): build from zero
    float emerge = clamp(uTime / 15.0, 0.0, 1.0);
    signal *= emerge;

    gl_FragColor = vec4(signal, 1.0);
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
  uniform float uCycle;
  uniform vec3 uBone;
  uniform vec3 uPale;
  uniform vec3 uDeep;
  uniform vec3 uVoid;
  uniform sampler2D uFeedback;
  uniform vec2 uFeedbackRes;
  uniform vec3 uMouse;

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

  float sdTorus(vec3 p, vec2 t){
    vec2 q=vec2(length(p.xz)-t.x,p.y);
    return length(q)-t.y;
  }

  // ── Domain warp (the "fold") ─────────────────────────────────────────────────
  vec3 fold(vec3 p, float t){
    // The wrongness: asymmetric Y-axis displacement — offset from center by 0.12
    float wrongness = 0.12;

    // Primary fold planes
    float n = 3.0;
    for(float i=0.0;i<n;i++){
      float angle = i * 3.14159 * 2.0 / n + t * 0.07;
      vec3 nrm = vec3(cos(angle), 0.0, sin(angle));
      float d = dot(p, nrm);
      if(d < 0.0) p -= 2.0 * d * nrm;
    }

    // Secondary fold — the deliberate displacement
    float foldWave = sin(p.y * 1.5 + t * 0.2) * 0.05;
    p.x += foldWave;
    p.z += sin(p.x * 2.0 + t * 0.15) * 0.04;

    // The asymmetry — something feels wrong here. Leave it.
    p.y += wrongness * (1.0 + sin(t * 0.3) * 0.1);

    return p;
  }

  // ── Scene SDF ──────────────────────────────────────────────────────────────
  float scene(vec3 p, float t){
    vec3 fw = fold(p, t);

    // Core folded sphere
    float sphere = sdSphere(fw, 1.0);

    // Domain-warped displacement from feedback
    vec2 feedbackUv = vUv; // approximate UV from world pos
    float disp = fbm(fw * 1.5 + t * 0.1) * 0.15;
    sphere += disp;

    // Peripheral torus — at the edge of attention
    vec3 tp = p;
    tp.x += sin(t * 0.11) * 0.6;
    tp.z += cos(t * 0.13) * 0.6;
    float torus = sdTorus(tp, vec2(1.8, 0.02));
    torus = abs(torus) - 0.01;

    return min(sphere, torus);
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
    for(int i=0;i<80;i++){
      vec3 p=ro+rd*d;
      float h=scene(p,t);
      if(h<0.001) return d;
      if(d>20.0) break;
      d+=h*0.8;
    }
    return -1.0;
  }

  void main(){
    vec3 ro = vec3(0.0, 0.0, 3.5);
    vec3 rd = normalize(vWorldPos - cameraPosition);

    float cycleT = mod(uTime, uCycle);
    float dissolve = 0.0;
    if(cycleT > 70.0){
      dissolve = (cycleT - 70.0) / (uCycle - 70.0);
    }

    float d = raymarch(ro, rd, uTime);

    vec3 col = uVoid;

    if(d > 0.0){
      vec3 p = ro + rd * d;
      vec3 n = calcNormal(p, uTime);

      // Lighting
      vec3 light1 = normalize(vec3(2.0, 3.0, 4.0));
      float diff1 = max(0.0, dot(n, light1));
      vec3 light2 = normalize(vec3(-3.0, -1.0, 2.0));
      float diff2 = max(0.0, dot(n, light2)) * 0.3;
      float fresnel = pow(1.0 - max(0.0, dot(n, -rd)), 3.0);

      // Bone coloring
      col = mix(uDeep, uBone, diff1 * 0.7 + fresnel * 0.5);
      col = mix(col, uPale, fresnel * 0.4);

      // Feedback signal bleeds through
      vec2 fbUV = mod(vUv * 0.5 + 0.5 + uTime * 0.01, 1.0);
      vec3 fbSignal = texture2D(uFeedback, fbUV).rgb;
      col = mix(col, uBone, fbSignal.r * 0.3);

      // Almost resolved — the 45s moment of legibility
      float resolve = smoothstep(40.0, 48.0, cycleT) * smoothstep(55.0, 48.0, cycleT);
      col = mix(col, uPale, resolve * 0.2);

      // Torus is more transparent
      vec3 tp = vPosition;
      tp.x += sin(uTime * 0.11) * 0.6;
      tp.z += cos(uTime * 0.13) * 0.6;
      float torusCheck = sdTorus(tp, vec2(1.8, 0.02));
      if(torusCheck < 0.1) col *= 0.3;

      // Dissolution at end of cycle
      col *= 1.0 - dissolve * 0.95;

      // Mouse hover — subtle shift in fold response
      float mouseInfluence = length(uMouse);
      col = mix(col, uPale, mouseInfluence * 0.05);
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;

// ─── Post-Processing Shaders (manual, no EffectComposer) ───────────────────
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

    // Chromatic aberration — subtle, 0.002
    float aberration = 0.002;
    vec3 col;
    col.r = texture2D(uScene, uv + vec2(aberration, 0.0)).r;
    col.g = texture2D(uScene, uv).g;
    col.b = texture2D(uScene, uv - vec2(aberration, 0.0)).b;

    // Vignette — 0.4 intensity
    vec2 center = uv - 0.5;
    float vignette = 1.0 - dot(center, center) * 0.4 * 2.0;
    vignette = smoothstep(0.0, 1.0, vignette);
    col *= vignette;

    // Grain — time-seeded, 0.04 intensity
    float grain = hash(uv + fract(uTime)) * 0.04 - 0.02;
    col += grain;

    // Subtle breathing desaturation at dissolution
    float cycleT = mod(uTime, 90.0);
    float dissolve = clamp((cycleT - 70.0) / 20.0, 0.0, 1.0);
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, vec3(lum), dissolve * 0.3);

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }
`;

// ─── Feedback Buffer Component ───────────────────────────────────────────────
function FeedbackBuffer({ mouseRef, burstRef, timeRef }: {
  mouseRef: React.MutableRefObject<{x:number;y:number}>;
  burstRef: React.MutableRefObject<number>;
  timeRef: React.MutableRefObject<number>;
}) {
  const { gl, size } = useThree();
  const camera = useMemo(() => new THREE.OrthographicCamera(-1,1,1,-1,0,1), []);

  const [pingPong, setPingPong] = React.useState<{
    write: THREE.WebGLRenderTarget;
    read: THREE.WebGLRenderTarget;
  } | null>(null);

  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const quadRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    const rt = new THREE.WebGLRenderTarget(size.width, size.height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
    });
    const rt2 = new THREE.WebGLRenderTarget(size.width, size.height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
    });
    setPingPong({ write: rt, read: rt2 });

    return () => {
      rt.dispose();
      rt2.dispose();
    };
  }, [size]);

  useFrame(() => {
    if (!pingPong || !materialRef.current || !quadRef.current) return;

    const mat = materialRef.current;
    mat.uniforms.uTime.value = timeRef.current;
    mat.uniforms.uMouse.value.set(mouseRef.current.x, mouseRef.current.y, 0);
    mat.uniforms.uBurst.value = burstRef.current;
    mat.uniforms.uPrev.value = pingPong.read.texture;

    // Render into write target
    gl.setRenderTarget(pingPong.write);
    gl.render(quadRef.current, camera);
    gl.setRenderTarget(null);

    // Swap
    const tmp = pingPong.read;
    pingPong.read = pingPong.write;
    pingPong.write = tmp;

    // Decay burst
    burstRef.current *= 0.9;
  }, 1);

  if (!pingPong) return null;

  return (
    <mesh ref={quadRef}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={feedbackVertexShader}
        fragmentShader={feedbackFragmentShader}
        uniforms={{
          uPrev: { value: null },
          uTime: { value: 0 },
          uResolution: { value: new THREE.Vector2(size.width, size.height) },
          uMouse: { value: new THREE.Vector3() },
          uBurst: { value: 0 },
        }}
      />
    </mesh>
  );
}

// ─── SDF Scene Component ────────────────────────────────────────────────────
function FoldedDesireScene({ feedbackTex }: { feedbackTex: THREE.Texture | null }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const burstRef = useRef(0);
  const idleRef = useRef(0);
  const lastInteractionRef = useRef(0);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: sdfVertexShader,
      fragmentShader: sdfFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uCycle: { value: 90 },
        uBone: { value: PALETTE.bone },
        uPale: { value: PALETTE.pale },
        uDeep: { value: PALETTE.deep },
        uVoid: { value: PALETTE.void },
        uFeedback: { value: null },
        uFeedbackRes: { value: new THREE.Vector2(512, 512) },
        uMouse: { value: new THREE.Vector3() },
      },
    });
  }, []);

  useFrame(({ clock, pointer }) => {
    const t = clock.getElapsedTime();
    material.uniforms.uTime.value = t;

    // Mouse tracking
    mouseRef.current.x = (pointer.x + 1) * 0.5;
    mouseRef.current.y = (pointer.y + 1) * 0.5;
    material.uniforms.uMouse.value.set(pointer.x, pointer.y, 0);

    // Feedback texture
    if (feedbackTex) {
      material.uniforms.uFeedback.value = feedbackTex;
    }

    // Idle breathing after 20s
    const sinceInteraction = t - lastInteractionRef.current;
    if (sinceInteraction > 20) {
      const breathe = 0.97 + 0.03 * Math.sin(t * (Math.PI * 2) / 8);
      if (meshRef.current) meshRef.current.scale.setScalar(breathe);
    }
  });

  // Click to burst
  useEffect(() => {
    const handleClick = () => {
      burstRef.current = 1.0;
      lastInteractionRef.current = performance.now() / 1000;
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  return (
    <mesh ref={meshRef} material={material}>
      <boxGeometry args={[2, 2, 2]} />
    </mesh>
  );
}

// ─── Post-Process Component ─────────────────────────────────────────────────
function PostProcess({ sceneTex }: { sceneTex: THREE.Texture | null }) {
  const { gl, size } = useThree();
  const camera = useMemo(() => new THREE.OrthographicCamera(-1,1,1,-1,0,1), []);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: postVertexShader,
      fragmentShader: postFragmentShader,
      uniforms: {
        uScene: { value: null },
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(size.width, size.height) },
      },
    });
  }, [size]);

  const quadRef = useRef<THREE.Mesh>(null);
  const sceneRTRef = useRef<THREE.WebGLRenderTarget | null>(null);

  useEffect(() => {
    const rt = new THREE.WebGLRenderTarget(size.width, size.height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });
    sceneRTRef.current = rt;
    return () => rt.dispose();
  }, [size]);

  useFrame(({ clock }) => {
    if (!sceneTex || !sceneRTRef.current || !quadRef.current) return;

    // Render scene to RT
    material.uniforms.uScene.value = sceneTex;
    material.uniforms.uTime.value = clock.getElapsedTime();

    gl.setRenderTarget(sceneRTRef.current);
    gl.render(quadRef.current, camera);
    gl.setRenderTarget(null);
  }, 0);

  // Blit to screen via a full-screen triangle in a second pass
  // Actually let's handle this differently — use a separate canvas or onAfterFrame
  return null;
}

// ─── Main Scene ─────────────────────────────────────────────────────────────
import React from 'react';

function FoldedDesireSceneInner({ burstRef, mouseRef }: {
  burstRef: React.MutableRefObject<number>;
  mouseRef: React.MutableRefObject<{x:number;y:number}>;
}) {
  const { gl, size, camera } = useThree();
  const timeRef = useRef(0);
  const meshRef = useRef<THREE.Mesh>(null!);
  const mouseInternalRef = useRef({ x: 0.5, y: 0.5 });
  const burstInternalRef = useRef(0);

  // Ping-pong buffers
  const pingRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const pongRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const quadRef = useRef<THREE.Mesh>(null!);
  const feedbackMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const feedbackCamera = useMemo(() => new THREE.OrthographicCamera(-1,1,1,-1,0,1), []);

  // Feedback RTs
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

  // Main scene RT for post-processing
  const sceneRT = useMemo(() => {
    const rt = new THREE.WebGLRenderTarget(size.width, size.height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });
    return rt;
  }, [size]);

  const postMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: postVertexShader,
    fragmentShader: postFragmentShader,
    uniforms: {
      uScene: { value: null },
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
    },
  }), [size]);

  const sdfMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: sdfVertexShader,
    fragmentShader: sdfFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uCycle: { value: 90 },
      uBone: { value: PALETTE.bone },
      uPale: { value: PALETTE.pale },
      uDeep: { value: PALETTE.deep },
      uVoid: { value: PALETTE.void },
      uFeedback: { value: null },
      uFeedbackRes: { value: new THREE.Vector2(size.width, size.height) },
      uMouse: { value: new THREE.Vector3() },
    },
  }), [size]);

  const postQuadRef = useRef<THREE.Mesh>(null!);
  const postCamera = useMemo(() => new THREE.OrthographicCamera(-1,1,1,-1,0,1), []);

  useFrame(({ clock, pointer }) => {
    const t = clock.getElapsedTime();
    timeRef.current = t;

    // Update SDF material
    sdfMat.uniforms.uTime.value = t;
    sdfMat.uniforms.uMouse.value.set(pointer.x, pointer.y, 0);

    // Render feedback pass
    if (feedbackMatRef.current && pingRef.current && pongRef.current) {
      feedbackMatRef.current.uniforms.uTime.value = t;
      feedbackMatRef.current.uniforms.uMouse.value.set(pointer.x, pointer.y, 0);
      feedbackMatRef.current.uniforms.uBurst.value = burstRef.current;
      feedbackMatRef.current.uniforms.uPrev.value = pongRef.current.texture;

      gl.setRenderTarget(pingRef.current);
      gl.render(quadRef.current, feedbackCamera);
      gl.setRenderTarget(null);

      // Swap ping/pong
      const tmp = pingRef.current;
      pingRef.current = pongRef.current;
      pongRef.current = tmp;

      // Decay burst
      burstRef.current *= 0.92;
    }

    // Set feedback texture for SDF
    if (pongRef.current) {
      sdfMat.uniforms.uFeedback.value = pongRef.current.texture;
    }

    // Render SDF scene to RT
    gl.setRenderTarget(sceneRT);
    gl.clear();
    gl.render(meshRef.current, camera);
    gl.setRenderTarget(null);

    // Post-process to screen
    postMat.uniforms.uScene.value = sceneRT.texture;
    postMat.uniforms.uTime.value = t;
    gl.render(postQuadRef.current, postCamera);
  }, 0);

  return (
    <>
      {/* SDF mesh — invisible box, raymarched inside */}
      <mesh ref={meshRef} material={sdfMat}>
        <boxGeometry args={[2, 2, 2]} />
      </mesh>

      {/* Feedback quad (off-screen) */}
      <mesh ref={quadRef} visible={false}>
        <planeGeometry args={[2, 2]} />
        <shaderMaterial
          ref={feedbackMatRef}
          vertexShader={feedbackVertexShader}
          fragmentShader={feedbackFragmentShader}
          uniforms={{
            uPrev: { value: null },
            uTime: { value: 0 },
            uResolution: { value: new THREE.Vector2(size.width, size.height) },
            uMouse: { value: new THREE.Vector3() },
            uBurst: { value: 0 },
          }}
        />
      </mesh>

      {/* Post-process quad */}
      <mesh ref={postQuadRef} material={postMat}>
        <planeGeometry args={[2, 2]} />
      </mesh>
    </>
  );
}

// ─── Export ─────────────────────────────────────────────────────────────────
export default function FoldedDesire() {
  const burstRef = useRef(0);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });

  return (
    <Canvas
      style={{ width: '100%', height: '100%', display: 'block' }}
      gl={{ antialias: false, alpha: false }}
      onPointerMove={(e) => {
        mouseRef.current.x = (e.clientX / window.innerWidth);
        mouseRef.current.y = (e.clientY / window.innerHeight);
      }}
      onClick={() => { burstRef.current = 1.0; }}
    >
      <FoldedDesireSceneInner burstRef={burstRef} mouseRef={mouseRef} />
    </Canvas>
  );
}
