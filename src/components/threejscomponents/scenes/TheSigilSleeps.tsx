'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

// ─── Palette: Bone and Void (Austin Osman Spare / Oracle) ──────────────────
const PALETTE = {
  void: new THREE.Color('#000000'),
  deep: new THREE.Color('#111111'),
  bone: new THREE.Color('#c8b8a2'),
  pale: new THREE.Color('#e8ddd0'),
  flash: new THREE.Color('#ffffff'),
};

const CYCLE = 12; // seconds per full cycle

// ─── Vertex Shader ─────────────────────────────────────────────────────────
const tubeVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uCoherence;
  uniform float uNoiseFreq;
  uniform float uNoiseAmp;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying float vCoherence;

  // Simplex noise
  vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 permute4(vec4 x){return mod289((x*34.0+1.0)*x);}
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
    i=mod289(i);
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

  void main() {
    vUv = uv;
    vCoherence = uCoherence;

    // Organic writhing — noise displaces the tube surface
    vec3 p = position;
    float n = snoise(p * uNoiseFreq + uTime * 0.3) * uNoiseAmp * uCoherence;
    p += normal * n;

    // Breathing pulse on radius
    float breathe = 1.0 + 0.15 * sin(uTime * 1.2 + position.x * 3.0);
    p *= breathe;

    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

// ─── Fragment Shader ────────────────────────────────────────────────────────
const tubeFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uCoherence;
  uniform vec3 uBone;
  uniform vec3 uPale;
  uniform vec3 uVoid;
  uniform vec3 uFlash;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying float vCoherence;

  float hash(vec2 p){
    return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);
  }

  void main() {
    // Fresnel rim — gives the line a soft glow against the void
    vec3 viewDir = normalize(cameraPosition);
    float fresnel = pow(1.0 - max(0.0, dot(vNormal, viewDir)), 2.5);

    // Coherence-driven color: void → bone → pale → flash
    float c = uCoherence;
    vec3 col;
    if(c < 0.5) {
      col = mix(uVoid, uBone, c * 2.0);
    } else {
      col = mix(uBone, uPale, (c - 0.5) * 2.0);
    }
    // White flash at peak
    col = mix(col, uFlash, smoothstep(0.85, 1.0, c) * 0.8);

    // Rim glow
    col += uBone * fresnel * (0.3 + c * 0.7);

    // Grain / hand-drawn texture — subtle
    float grain = hash(vUv * 500.0 + fract(uTime)) * 0.06 - 0.03;
    col += grain;

    // Opacity: nearly transparent at extremes, opaque at peak
    // Constraint: nothing fully visible. Something always hidden.
    float opacity = smoothstep(0.0, 0.25, c) * smoothstep(1.0, 0.6, c);
    opacity = 0.15 + 0.85 * opacity;

    gl_FragColor = vec4(col, opacity);
  }
`;

// ─── Particle Dissolution Shaders ──────────────────────────────────────────
const particleVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uCoherence;

  varying float vAlpha;
  varying float vLife;

  // Curl noise for drift
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

  void main() {
    float dissolve = 1.0 - uCoherence;

    // Drift outward using curl-like noise
    vec3 drift = vec3(
      snoise(position * 0.5 + uTime * 0.1),
      snoise(position * 0.5 + uTime * 0.13 + 100.0),
      snoise(position * 0.5 + uTime * 0.11 + 200.0)
    ) * dissolve * 2.5;

    vec3 pos = position + drift;

    vAlpha = dissolve * (0.3 + 0.7 * (1.0 - dissolve));
    vLife = dissolve;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = (3.0 + dissolve * 4.0) * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const particleFragmentShader = /* glsl */ `
  precision highp float;

  uniform vec3 uBone;
  uniform vec3 uPale;

  varying float vAlpha;
  varying float vLife;

  void main() {
    // Circular particle
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    if(dist > 0.5) discard;

    float alpha = vAlpha * (1.0 - dist * 2.0);
    vec3 col = mix(uBone, uPale, vLife);
    gl_FragColor = vec4(col, alpha * 0.6);
  }
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Self-intersecting Lissajous / figure-8 curve
function getCurvePoint(t: number, time: number, coherence: number): THREE.Vector3 {
  const a = 2.0;
  const b = 1.0;
  const delta = Math.PI / 2;

  // Base figure-8 / Lissajous
  const x = Math.sin(a * t + delta) * 1.2;
  const y = Math.sin(b * t) * 0.8;
  const z = Math.cos(a * t) * 0.6;

  // Noise displacement — fades as coherence rises (line "settles")
  const noiseAmp = (1.0 - coherence) * 0.6;
  const nx = Math.sin(t * 7.3 + time * 0.7) * noiseAmp;
  const ny = Math.sin(t * 5.1 + time * 0.9 + 1.0) * noiseAmp;
  const nz = Math.cos(t * 6.7 + time * 0.5 + 2.0) * noiseAmp;

  return new THREE.Vector3(x + nx, y + ny, z + nz);
}

function buildCurve(time: number, coherence: number): THREE.CatmullRomCurve3 {
  const pts: THREE.Vector3[] = [];
  const segments = 120;
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    pts.push(getCurvePoint(t, time, coherence));
  }
  return new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);
}

// ─── Tube Mesh Component ─────────────────────────────────────────────────────
function SigilTube({ coherence }: { coherence: number }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const timeRef = useRef(0);

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: tubeVertexShader,
    fragmentShader: tubeFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uCoherence: { value: 0 },
      uNoiseFreq: { value: 2.5 },
      uNoiseAmp: { value: 0.08 },
      uBone: { value: PALETTE.bone },
      uPale: { value: PALETTE.pale },
      uVoid: { value: PALETTE.void },
      uFlash: { value: PALETTE.flash },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  }), []);

  const geometry = useMemo(() => new THREE.TubeGeometry(
    buildCurve(0, 0),
    200,
    0.035,
    8,
    true
  ), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    timeRef.current = t;
    material.uniforms.uTime.value = t;
    material.uniforms.uCoherence.value = coherence;

    // Rebuild curve each frame with current coherence
    const curve = buildCurve(t, coherence);
    const newGeo = new THREE.TubeGeometry(curve, 200, 0.035, 8, true);
    meshRef.current.geometry.dispose();
    meshRef.current.geometry = newGeo;
  });

  return <mesh ref={meshRef} geometry={geometry} material={material} />;
}

// ─── Dissolution Particles ──────────────────────────────────────────────────
function DissolutionParticles({ coherence, count = 300 }: { coherence: number; count?: number }) {
  const pointsRef = useRef<THREE.Points>(null!);
  const timeRef = useRef(0);

  // Generate initial positions along the figure-8
  const { positions, geometry } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 2;
      const p = getCurvePoint(t, 0, 0.5);
      pos[i * 3] = p.x;
      pos[i * 3 + 1] = p.y;
      pos[i * 3 + 2] = p.z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return { positions: pos, geometry: geo };
  }, [count]);

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: particleVertexShader,
    fragmentShader: particleFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uCoherence: { value: 0 },
      uBone: { value: PALETTE.bone },
      uPale: { value: PALETTE.pale },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    timeRef.current = t;
    material.uniforms.uTime.value = t;
    material.uniforms.uCoherence.value = coherence;
  });

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}

// ─── Ambient Ember Particles (always present, always subtle) ─────────────────
function EmberParticles({ count = 80 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null!);

  const { geometry, material } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 2.5 + Math.random() * 1.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const mat = new THREE.PointsMaterial({
      color: PALETTE.bone,
      size: 0.015,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return { geometry: geo, material: mat };
  }, [count]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const t = clock.getElapsedTime();
    const mat = pointsRef.current.material as THREE.PointsMaterial;
    // Slow drift
    pointsRef.current.rotation.y = t * 0.02;
    pointsRef.current.rotation.x = Math.sin(t * 0.01) * 0.1;
    // Breathing opacity
    mat.opacity = 0.15 + 0.1 * Math.sin(t * 0.5);
  });

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}

// ─── Scene ──────────────────────────────────────────────────────────────────
function TheSigilSleepsScene() {
  const coherenceRef = useRef(0);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // Coherence cycles: 0→1→0 over CYCLE seconds
    const phase = (t % CYCLE) / CYCLE; // 0 to 1
    let coherence: number;

    if (phase < 0.25) {
      // Emergence: 0 → 0.5
      coherence = (phase / 0.25) * 0.5;
    } else if (phase < 0.5) {
      // Convergence: 0.5 → 1.0
      coherence = 0.5 + ((phase - 0.25) / 0.25) * 0.5;
    } else if (phase < 0.58) {
      // Peak hold: 1.0
      coherence = 1.0;
    } else if (phase < 0.83) {
      // Dissolution: 1.0 → 0.3
      coherence = 1.0 - ((phase - 0.58) / 0.25) * 0.7;
    } else {
      // Void: 0.3 → 0 (reset)
      coherence = 0.3 - ((phase - 0.83) / 0.17) * 0.3;
    }

    coherenceRef.current = coherence;
  });

  return (
    <>
      <color attach="background" args={['#000000']} />
      <fogExp2 attach="fog" args={['#000000', 0.12]} />

      {/* Dim ambient — bone-colored */}
      <ambientLight intensity={0.05} color={PALETTE.bone} />

      {/* The sigil line */}
      <SigilLine coherenceRef={coherenceRef} />

      {/* Dissolution particles shed from the line */}
      <DissolutionParticlesWrapper coherenceRef={coherenceRef} />

      {/* Always-present embers — something always hidden */}
      <EmberParticles count={80} />

      {/* Post-processing bloom */}
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.3}
          luminanceSmoothing={0.7}
          intensity={0.8}
          radius={0.6}
        />
      </EffectComposer>
    </>
  );
}

// ─── Wrapper to pass coherence into the tube/particles ───────────────────────
function SigilLine({ coherenceRef }: { coherenceRef: React.MutableRefObject<number> }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const timeRef = useRef(0);

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: tubeVertexShader,
    fragmentShader: tubeFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uCoherence: { value: 0 },
      uNoiseFreq: { value: 2.5 },
      uNoiseAmp: { value: 0.08 },
      uBone: { value: PALETTE.bone },
      uPale: { value: PALETTE.pale },
      uVoid: { value: PALETTE.void },
      uFlash: { value: PALETTE.flash },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  }), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    timeRef.current = t;
    material.uniforms.uTime.value = t;
    const coherence = coherenceRef.current;
    material.uniforms.uCoherence.value = coherence;

    const curve = buildCurve(t, coherence);
    const newGeo = new THREE.TubeGeometry(curve, 200, 0.035, 8, true);
    meshRef.current.geometry.dispose();
    meshRef.current.geometry = newGeo;

    // Camera slow orbit — barely perceptible
    const camAngle = t * 0.04;
    const camRadius = 4.5;
  });

  return <mesh ref={meshRef} material={material} />;
}

function DissolutionParticlesWrapper({ coherenceRef }: { coherenceRef: React.MutableRefObject<number> }) {
  const pointsRef = useRef<THREE.Points>(null!);
  const timeRef = useRef(0);
  const count = 300;

  const { geometry } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 2;
      const p = getCurvePoint(t, 0, 0.5);
      pos[i * 3] = p.x;
      pos[i * 3 + 1] = p.y;
      pos[i * 3 + 2] = p.z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return { geometry: geo };
  }, []);

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: particleVertexShader,
    fragmentShader: particleFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uCoherence: { value: 0 },
      uBone: { value: PALETTE.bone },
      uPale: { value: PALETTE.pale },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    timeRef.current = t;
    material.uniforms.uTime.value = t;
    material.uniforms.uCoherence.value = coherenceRef.current;
  });

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}

// ─── Export ─────────────────────────────────────────────────────────────────
export default function TheSigilSleeps() {
  return (
    <Canvas
      style={{ width: '100%', height: '100%', display: 'block' }}
      gl={{ antialias: true, alpha: false }}
      camera={{ position: [0, 0, 4.5], fov: 50 }}
    >
      <TheSigilSleepsScene />
    </Canvas>
  );
}
