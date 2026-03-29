'use client';

import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  EffectComposer,
  Bloom,
  Vignette,
} from '@react-three/postprocessing';

// ─── constants ────────────────────────────────────────────────────
const PARTICLE_COUNT = 4000;
const CYCLE_DURATION = 36; // seconds
// phase boundaries (normalised 0-1)
const P1 = 0.25; // noise drift
const P2 = 0.50; // crystallisation
const P3 = 0.75; // the almost
// P3→1.0 = withdrawal

// signal-grey gradient stops
const GREY_DARK = new THREE.Color(0x1a1a1a);
const GREY_MID = new THREE.Color(0x4a4a4a);
const GREY_LIGHT = new THREE.Color(0x8a8a8a);

// ─── simplex 3D noise (GLSL) ─────────────────────────────────────
const simplex3D = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289((x*34.0+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}

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
  vec4 p=permute(permute(permute(
    i.z+vec4(0.0,i1.z,i2.z,1.0))
    +i.y+vec4(0.0,i1.y,i2.y,1.0))
    +i.x+vec4(0.0,i1.x,i2.x,1.0));
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
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`;

// ─── vertex shader ────────────────────────────────────────────────
const vertexShader = /* glsl */ `
${simplex3D}

attribute vec3 basePosition;
attribute float wingSign;   // -1 left, +1 right
attribute float particleY;  // normalised y [0,1] for gradient

uniform float uTime;
uniform float uPhase;       // 0-1 within cycle
uniform float uNoiseScale;
uniform float uCrystal;     // 0→1 crystallisation
uniform float uAlmost;      // 0→1 the-almost convergence
uniform float uWithdraw;    // 0→1 withdrawal scatter

varying float vBrightness;
varying float vNormY;

void main(){
  vec3 pos = basePosition;

  // --- broken symmetry: right wing gets 15 % more displacement ---
  float asymmetry = wingSign > 0.0 ? 1.15 : 1.0;

  // Phase 1: noise drift
  float driftAmp = 1.0 - uCrystal;
  vec3 noiseCoord = pos * uNoiseScale + uTime * 0.15;
  float nx = snoise(noiseCoord);
  float ny = snoise(noiseCoord + vec3(31.7, 0.0, 0.0));
  float nz = snoise(noiseCoord + vec3(0.0, 47.3, 0.0));
  pos += vec3(nx, ny, nz) * 0.6 * driftAmp * asymmetry;

  // Phase 2: crystallisation – particles settle toward base
  // (handled by driftAmp decreasing)

  // Phase 3: the almost – slight inward pull + glow
  float almostPull = uAlmost * 0.15;
  pos = mix(pos, basePosition, almostPull);

  // Phase 4: withdrawal – scatter outward
  vec3 scatterDir = normalize(basePosition + vec3(0.001)) * uWithdraw * 3.0 * asymmetry;
  float withdrawNoise = snoise(basePosition * 2.0 + uTime * 0.5);
  scatterDir += vec3(withdrawNoise) * uWithdraw * 0.8;
  pos += scatterDir;

  // brightness: brighter at crystallisation + almost, dimmer at withdrawal
  vBrightness = 0.3 + 0.5 * uCrystal + 0.7 * uAlmost * (1.0 - uWithdraw);
  vNormY = particleY;

  vec4 mvPos = modelViewMatrix * instanceMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPos;
}
`;

// ─── fragment shader ──────────────────────────────────────────────
const fragmentShader = /* glsl */ `
uniform vec3 uColorDark;
uniform vec3 uColorMid;
uniform vec3 uColorLight;
uniform float uTime;

varying float vBrightness;
varying float vNormY;

// cheap film grain
float grain(vec2 co, float t){
  return fract(sin(dot(co + t, vec2(12.9898,78.233))) * 43758.5453);
}

void main(){
  // y-axis gradient: dark at bottom, light at top
  vec3 col = mix(uColorDark, uColorMid, smoothstep(0.0, 0.5, vNormY));
  col = mix(col, uColorLight, smoothstep(0.5, 1.0, vNormY));
  col *= vBrightness;

  // film grain
  float g = grain(gl_FragCoord.xy * 0.01, uTime) * 0.08;
  col += vec3(g);

  gl_FragColor = vec4(col, 1.0);
}
`;

// ─── build winged-figure positions ────────────────────────────────
function buildWingedFigure(count: number) {
  const positions = new Float32Array(count * 3);
  const wingSigns = new Float32Array(count);
  const particleYs = new Float32Array(count);

  // proportions: ~30% torso/head, ~70% wings
  const torsoCount = Math.floor(count * 0.3);
  const wingCount = count - torsoCount;

  let idx = 0;

  // torso + head: elongated capsule along y
  for (let i = 0; i < torsoCount; i++) {
    const t = Math.random();
    const y = -1.5 + t * 3.5; // -1.5 to 2.0
    const r = y > 1.2
      ? 0.25 * (1.0 - (y - 1.2) / 0.8) // head taper
      : 0.3 + 0.15 * Math.sin((y + 1.5) / 3.5 * Math.PI); // torso
    const angle = Math.random() * Math.PI * 2;
    const radius = r * Math.sqrt(Math.random());
    positions[idx * 3] = Math.cos(angle) * radius;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = Math.sin(angle) * radius * 0.5;
    wingSigns[idx] = positions[idx * 3] < 0 ? -1 : 1;
    particleYs[idx] = (y + 1.5) / 3.5;
    idx++;
  }

  // wings: two swept arcs
  for (let i = 0; i < wingCount; i++) {
    const side = i < wingCount / 2 ? -1 : 1;
    const t = Math.random();
    // wing span
    const span = 0.3 + t * 2.2;
    const x = side * span;
    // wing arc: higher in center, lower at tips
    const wingArc = 0.6 * Math.sin(t * Math.PI);
    const y = 0.2 + wingArc + (Math.random() - 0.5) * 0.4;
    // slight forward sweep
    const z = -t * 0.5 + (Math.random() - 0.5) * 0.2;
    // feather spread
    const spread = t * 0.3;
    positions[idx * 3] = x + (Math.random() - 0.5) * spread;
    positions[idx * 3 + 1] = y + (Math.random() - 0.5) * spread;
    positions[idx * 3 + 2] = z + (Math.random() - 0.5) * spread * 0.5;
    wingSigns[idx] = side;
    particleYs[idx] = Math.max(0, Math.min(1, (y + 1.5) / 3.5));
    idx++;
  }

  return { positions, wingSigns, particleYs };
}

// ─── compute phase uniforms ───────────────────────────────────────
function phaseUniforms(phase: number) {
  let crystal = 0;
  let almost = 0;
  let withdraw = 0;

  if (phase < P1) {
    // noise drift – all zeros
  } else if (phase < P2) {
    crystal = (phase - P1) / (P2 - P1);
  } else if (phase < P3) {
    crystal = 1;
    almost = (phase - P2) / (P3 - P2);
  } else {
    crystal = 1.0 - (phase - P3) / (1 - P3);
    almost = 1.0 - (phase - P3) / (1 - P3);
    withdraw = (phase - P3) / (1 - P3);
  }
  return { crystal, almost, withdraw };
}

// ─── particle system (inner scene) ────────────────────────────────
function Particles() {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const { camera } = useThree();

  const { positions, wingSigns, particleYs } = useMemo(
    () => buildWingedFigure(PARTICLE_COUNT),
    [],
  );

  const uniforms = useRef({
    uTime: { value: 0 },
    uPhase: { value: 0 },
    uNoiseScale: { value: 1.2 },
    uCrystal: { value: 0 },
    uAlmost: { value: 0 },
    uWithdraw: { value: 0 },
    uColorDark: { value: GREY_DARK },
    uColorMid: { value: GREY_MID },
    uColorLight: { value: GREY_LIGHT },
  });

  const geometry = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(0.015, 0);
    geo.setAttribute('basePosition', new THREE.InstancedBufferAttribute(positions, 3));
    geo.setAttribute('wingSign', new THREE.InstancedBufferAttribute(wingSigns, 1));
    geo.setAttribute('particleY', new THREE.InstancedBufferAttribute(particleYs, 1));
    return geo;
  }, [positions, wingSigns, particleYs]);

  // identity matrices for instances
  useEffect(() => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      dummy.position.set(0, 0, 0);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    camera.position.set(0, 0.5, 5);
  }, [camera]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const phase = (t % CYCLE_DURATION) / CYCLE_DURATION;
    const { crystal, almost, withdraw } = phaseUniforms(phase);

    const u = uniforms.current;
    u.uTime.value = t;
    u.uPhase.value = phase;
    u.uCrystal.value = crystal;
    u.uAlmost.value = almost;
    u.uWithdraw.value = withdraw;
  });

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: uniforms.current,
        transparent: false,
        depthWrite: true,
      }),
    [],
  );

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, PARTICLE_COUNT]}
      frustumCulled={false}
    />
  );
}

// ─── outer wrapper ────────────────────────────────────────────────
interface BabalonArrivesProps {
  width?: string;
  height?: string;
}

export default function BabalonArrives({
  width = '100%',
  height = '100vh',
}: BabalonArrivesProps) {
  return (
    <div style={{ width, height, background: '#0a0a0a' }}>
      <Canvas
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#0a0a0a']} />
        <Particles />
        <EffectComposer>
          <Bloom
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            intensity={1.4}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.25} darkness={0.9} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
