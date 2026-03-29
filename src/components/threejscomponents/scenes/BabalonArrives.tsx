'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  EffectComposer,
  Bloom,
  Vignette,
} from '@react-three/postprocessing';

const PARTICLE_COUNT = 4000;
const CYCLE_DURATION = 36;

const vertexShader = /* glsl */ `
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
    return 42.0*dot(m*m,vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  }

  attribute vec3 basePosition;
  attribute float wingSign;
  attribute float normY;

  uniform float uTime;
  uniform float uNoiseAmp;
  uniform float uNoiseFreq;
  uniform float uCrystal;
  uniform float uAlmost;
  uniform float uWithdraw;

  varying float vBrightness;
  varying float vNormY;

  void main(){
    vec3 pos = basePosition;
    float asymmetry = wingSign > 0.0 ? 1.15 : 1.0;

    // drift
    float drift = 1.0 - uCrystal;
    vec3 nc = basePosition * uNoiseFreq + uTime * 0.15;
    pos += vec3(
      snoise(nc),
      snoise(nc + vec3(31.7, 0.0, 0.0)),
      snoise(nc + vec3(0.0, 47.3, 0.0))
    ) * uNoiseAmp * drift * asymmetry;

    // crystallisation settle
    pos = mix(pos, basePosition, uCrystal * 0.8);

    // almost pull
    pos = mix(pos, basePosition, uAlmost * 0.2);

    // withdrawal scatter
    if(uWithdraw > 0.0){
      vec3 scatter = normalize(basePosition + vec3(0.001)) * uWithdraw * 2.5 * asymmetry;
      scatter += vec3(snoise(basePosition * 2.0 + uTime * 0.5)) * uWithdraw * 1.2;
      pos += scatter;
    }

    vBrightness = 0.15 + 0.5 * uCrystal + 0.8 * uAlmost * (1.0 - uWithdraw);
    vNormY = normY;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColorDark;
  uniform vec3 uColorMid;
  uniform vec3 uColorLight;
  uniform float uTime;

  varying float vBrightness;
  varying float vNormY;

  float grain(vec2 co, float t){
    return fract(sin(dot(co + t, vec2(12.9898,78.233))) * 43758.5453);
  }

  void main(){
    vec3 col = mix(uColorDark, uColorMid, smoothstep(0.0, 0.5, vNormY));
    col = mix(col, uColorLight, smoothstep(0.5, 1.0, vNormY));
    col *= vBrightness;
    float g = grain(gl_FragCoord.xy * 0.01, uTime) * 0.1;
    col += vec3(g);
    gl_FragColor = vec4(col, 1.0);
  }
`;

function buildFigure(count: number){
  const positions = new Float32Array(count * 3);
  const wingSigns = new Float32Array(count);
  const normYs = new Float32Array(count);

  const torsoCount = Math.floor(count * 0.3);
  const wingCount = count - torsoCount;

  let i = 0;

  // torso + head
  for(; i < torsoCount; i++){
    const t = Math.random();
    const y = -1.5 + t * 3.5;
    const r = y > 1.2
      ? 0.25 * (1.0 - (y - 1.2) / 0.8)
      : 0.3 + 0.15 * Math.sin((y + 1.5) / 3.5 * Math.PI);
    const angle = Math.random() * Math.PI * 2;
    const rad = r * Math.sqrt(Math.random());
    positions[i*3]   = Math.cos(angle) * rad;
    positions[i*3+1] = y;
    positions[i*3+2] = Math.sin(angle) * rad * 0.5;
    wingSigns[i] = positions[i*3] < 0 ? -1 : 1;
    normYs[i] = (y + 1.5) / 3.5;
  }

  // wings
  for(; i < count; i++){
    const side = i < torsoCount + wingCount / 2 ? -1 : 1;
    const t = Math.random();
    const span = 0.3 + t * 2.2;
    const x = side * span;
    const wingArc = 0.6 * Math.sin(t * Math.PI);
    const wy = 0.2 + wingArc + (Math.random() - 0.5) * 0.4;
    const z = -t * 0.5 + (Math.random() - 0.5) * 0.2;
    const spread = t * 0.3;
    positions[i*3]   = x + (Math.random() - 0.5) * spread;
    positions[i*3+1] = wy + (Math.random() - 0.5) * spread;
    positions[i*3+2] = z + (Math.random() - 0.5) * spread * 0.5;
    wingSigns[i] = side;
    normYs[i] = Math.max(0, Math.min(1, (wy + 1.5) / 3.5));
  }

  return { positions, wingSigns, normYs };
}

function phaseUniforms(phase: number){
  const P1 = 0.111, P2 = 0.444, P3 = 0.722;
  let crystal=0, almost=0, withdraw=0, noiseAmp=1.8, noiseFreq=0.5;

  if(phase < P1){
    noiseAmp = 1.8; noiseFreq = 0.5;
  } else if(phase < P2){
    const p = (phase - P1) / (P2 - P1);
    crystal = p; noiseAmp = 1.8 - p * 1.5; noiseFreq = 0.5 + p * 0.8;
  } else if(phase < P3){
    const p = (phase - P2) / (P3 - P2);
    crystal = 1; almost = p; noiseAmp = 0.3; noiseFreq = 1.3;
  } else {
    const p = (phase - P3) / (1.0 - P3);
    crystal = 1.0 - p; almost = 1.0 - p; withdraw = p;
    noiseAmp = 0.3 + p * 1.5; noiseFreq = 1.3 - p * 0.8;
  }
  return { crystal, almost, withdraw, noiseAmp, noiseFreq };
}

function Particles(){
  const pointsRef = useRef<THREE.Points>(null!);

  const { positions, wingSigns, normYs } = useMemo(() => buildFigure(PARTICLE_COUNT), []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('basePosition', new THREE.BufferAttribute(positions.slice(), 3));
    geo.setAttribute('wingSign', new THREE.BufferAttribute(wingSigns, 1));
    geo.setAttribute('normY', new THREE.BufferAttribute(normYs, 1));
    return geo;
  }, [positions, wingSigns, normYs]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uNoiseAmp: { value: 1.8 },
    uNoiseFreq: { value: 0.5 },
    uCrystal: { value: 0 },
    uAlmost: { value: 0 },
    uWithdraw: { value: 0 },
    uColorDark: { value: new THREE.Color(0x1a1a1a) },
    uColorMid: { value: new THREE.Color(0x4a4a4a) },
    uColorLight: { value: new THREE.Color(0x8a8a8a) },
  }), []);

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
  }), [uniforms]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const phase = (t % CYCLE_DURATION) / CYCLE_DURATION;
    const { crystal, almost, withdraw, noiseAmp, noiseFreq } = phaseUniforms(phase);
    const u = uniforms;
    u.uTime.value = t;
    u.uNoiseAmp.value = noiseAmp;
    u.uNoiseFreq.value = noiseFreq;
    u.uCrystal.value = crystal;
    u.uAlmost.value = almost;
    u.uWithdraw.value = withdraw;
  });

  return <points ref={pointsRef} geometry={geometry} material={material} />;
}

interface BabalonArrivesProps {
  width?: string;
  height?: string;
}

export default function BabalonArrives({ width='100%', height='100vh' }: BabalonArrivesProps){
  return (
    <div style={{ width, height, background: '#050505' }}>
      <Canvas
        gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
        camera={{ position: [0, 0.5, 5.5], fov: 38 }}
      >
        <color attach="background" args={['#050505']} />
        <fog attach="fog" args={['#050505', 4, 12]} />
        <Particles />
        <EffectComposer>
          <Bloom luminanceThreshold={0.15} luminanceSmoothing={0.9} intensity={1.2} mipmapBlur />
          <Vignette eskil={false} offset={0.2} darkness={0.8} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
