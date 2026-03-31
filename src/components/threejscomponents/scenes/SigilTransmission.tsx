'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Noise,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

/* ═══════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════ */

const PARTICLE_COUNT = 5000;
const CYCLE_DURATION = 36;

// Nightside + Mauve Zone palette
const VOID_BLACK    = '#050508';
const DEEP_MAUVE    = '#7a2c7a';
const NIGHT_PURPLE  = '#3d1a4d';
const ELECTRIC_VIOLET = '#b06aff';
const COLD_WHITE    = '#e8e0ff';
const STRANGE_GREEN = '#2d4a3e';
const GLOW_GOLD     = '#c8a0ff';

/* ═══════════════════════════════════════════════════════════════════
   GLSL — Simplex3D noise
   ═══════════════════════════════════════════════════════════════════ */

const SIMPLEX_NOISE_GLSL = /* glsl */ `
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
`;

/* ═══════════════════════════════════════════════════════════════════
   LAYER 1 — Full-screen nightside fog background
   ═══════════════════════════════════════════════════════════════════ */

const bgVertShader = /* glsl */ `
  varying vec2 vUv;
  void main(){
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const bgFragShader = /* glsl */ `
  precision highp float;
  ${SIMPLEX_NOISE_GLSL}

  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uWarpAmp;
  uniform float uOpacity;

  varying vec2 vUv;

  float fbm(vec3 p){
    float v = 0.0;
    float a = 0.5;
    for(int i=0;i<5;i++){
      v += a * snoise(p);
      p *= 2.1;
      a *= 0.48;
    }
    return v;
  }

  // nightside palette ramp
  vec3 nightRamp(float t){
    vec3 c0 = vec3(0.020, 0.020, 0.031); // void black
    vec3 c1 = vec3(0.231, 0.106, 0.290); // deep mauve
    vec3 c2 = vec3(0.239, 0.102, 0.302); // night purple
    vec3 c3 = vec3(0.690, 0.416, 1.000); // electric violet
    vec3 c4 = vec3(0.910, 0.878, 1.000); // cold white
    if(t < 0.25) return mix(c0, c1, t/0.25);
    if(t < 0.50) return mix(c1, c2, (t-0.25)/0.25);
    if(t < 0.75) return mix(c2, c3, (t-0.50)/0.25);
    return mix(c3, c4, (t-0.75)/0.25);
  }

  void main(){
    vec2 uv = vUv;
    float aspect = uResolution.x / uResolution.y;
    vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

    float breathe = sin(uTime * 0.18) * 0.5 + 0.5;
    float warp1 = fbm(vec3(p * 1.2 + uTime * 0.07, uTime * 0.04));
    float warp2 = fbm(vec3(p * 1.2 + warp1 * 0.9 * uWarpAmp, uTime * 0.06 + 3.7));
    float warp3 = fbm(vec3(p * 0.8 - warp2 * 0.5 * uWarpAmp, uTime * 0.03 + 7.1));

    float density = warp3 * (0.6 + 0.4 * breathe) * uWarpAmp;
    float t = clamp(density * 0.5 + 0.5, 0.0, 1.0);

    // vertical fade — darker at bottom
    float yFade = smoothstep(0.0, 0.4, uv.y);
    t = t * (0.4 + 0.6 * yFade);

    vec3 col = nightRamp(t) * uOpacity;
    gl_FragColor = vec4(col, 1.0);
  }
`;

function Background({ opacityRef, warpAmpRef }: { opacityRef: React.MutableRefObject<number>; warpAmpRef: React.MutableRefObject<number> }) {
  const matRef = useRef<THREE.ShaderMaterial>(null!);
  void 0;

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1920, 1080) },
    uWarpAmp: { value: 0.4 },
    uOpacity: { value: 0 },
  }), []);

  useFrame(({ clock, size }) => {
    const mat = matRef.current;
    if (!mat) return;
    mat.uniforms.uTime.value = clock.getElapsedTime();
    mat.uniforms.uResolution.value.set(size.width, size.height);
    mat.uniforms.uWarpAmp.value = warpAmpRef.current;
    mat.uniforms.uOpacity.value = opacityRef.current;
  });

  return (
    <mesh renderOrder={-1} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={bgVertShader}
        fragmentShader={bgFragShader}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   LAYER 2 — Sigil particle system (Zos/Kia — form from void)
   ═══════════════════════════════════════════════════════════════════ */

const particleVertShader = /* glsl */ `
  ${SIMPLEX_NOISE_GLSL}

  attribute vec3 aRandom;
  attribute float aPhase;
  attribute float aRadius;
  attribute float aSpeed;

  uniform float uTime;
  uniform float uCondenseAmt;
  uniform float uDissolveAmt;
  uniform float uSigilScale;

  varying float vBrightness;
  varying float vCondense;
  varying vec3 vColor;

  // Hermetic 8-pointed star sigil SDF
  vec3 sigilAttractor(vec3 p, float scale){
    float r = length(p.xz) / max(scale, 0.001);
    float angle = atan(p.z, p.x);

    // 8-pointed star via polar function
    float starR = 0.65 + 0.08 * cos(angle * 8.0);
    float ring1 = abs(r - starR) - 0.03;
    float ring2 = abs(r - 0.42) - 0.02;
    float ring3 = abs(r - 0.18) - 0.015;

    // cross axes (diamond cross)
    float ax = abs(p.x) + abs(p.z);
    float crossD = ax - 0.9;
    float crossW = 0.04;
    float cross1 = max(crossD, -(ax - (0.9 - crossW)));
    float diag = abs(p.x) - abs(p.z);
    float cross2 = max(diag, -(abs(diag) - crossW));

    // 8 ray lines from inner to outer
    float rays = 1e10;
    for(int i=0;i<8;i++){
      float a = float(i) * 3.14159 / 4.0;
      vec2 dir = vec2(cos(a), sin(a));
      float proj = dot(p.xz, dir);
      float perp = length(p.xz - proj * dir);
      rays = min(rays, perp);
    }
    rays = max(rays - 0.015, r - 0.9);

    // eye center
    float eye = length(p.xz) - 0.12;

    // corner dots (diamond formation at 45°)
    float corners = 1e10;
    float cR = 0.52;
    for(int i=0;i<4;i++){
      float a = float(i) * 1.5708 + 0.7854;
      vec2 cpos = vec2(cos(a), sin(a)) * cR;
      corners = min(corners, length(p.xz - cpos) - 0.035);
    }

    float d = ring1;
    d = min(d, ring2);
    d = min(d, ring3);
    d = min(d, max(cross1, r - 0.9));
    d = min(d, max(cross2, r - 0.9));
    d = min(d, rays);
    d = min(d, eye);
    d = min(d, corners);

    return vec3(d, r, angle);
  }

  void main(){
    vec3 pos = position;

    // orbital base position
    float orbitAngle = aRandom.x * 6.2832 + uTime * aSpeed * 0.25 + aPhase * 6.28;
    float orbitR = aRadius;
    vec3 orbit = vec3(
      cos(orbitAngle) * orbitR,
      (aRandom.y - 0.5) * 2.5,
      sin(orbitAngle) * orbitR
    );

    // noise displacement (Kia — chaos)
    float noiseAmt = 1.0 - uCondenseAmt;
    vec3 nc = orbit * 0.9 + uTime * 0.08;
    vec3 noiseOff = vec3(
      snoise(nc),
      snoise(nc + vec3(17.3, 0.0, 0.0)),
      snoise(nc + vec3(0.0, 43.7, 0.0))
    ) * noiseAmt * 2.0;

    // sigil attractor (Zos — form)
    float pullStr = uCondenseAmt * (1.0 - uDissolveAmt);
    vec3 sg = sigilAttractor(orbit, uSigilScale);
    vec3 sigilPos = orbit;
    sigilPos.x = cos(sg.z) * sg.y * uSigilScale;
    sigilPos.z = sin(sg.z) * sg.y * uSigilScale;
    sigilPos.y *= (1.0 - pullStr * 0.88);

    // blend noise + attractor
    pos = mix(orbit + noiseOff, sigilPos, uCondenseAmt);

    // dissolve scatter
    if(uDissolveAmt > 0.0){
      vec3 scatter = normalize(orbit + vec3(0.001)) * uDissolveAmt * 5.0 * aRandom.z;
      scatter += vec3(
        snoise(pos * 2.0 + uTime * 0.4),
        snoise(pos * 2.0 + uTime * 0.55),
        snoise(pos * 2.0 + uTime * 0.35)
      ) * uDissolveAmt * 2.0;
      pos += scatter;
    }

    float holdStr = 1.0 - uDissolveAmt;
    vBrightness = 0.15 + aRandom.w * 0.25 + uCondenseAmt * 0.6 * holdStr;
    vCondense = uCondenseAmt * holdStr;

    // palette: mauve → violet → cold white
    vec3 mauveCol   = vec3(0.478, 0.173, 0.478);
    vec3 violetCol  = vec3(0.690, 0.416, 1.000);
    vec3 whiteCol   = vec3(0.910, 0.878, 1.000);
    vec3 goldCol    = vec3(0.784, 0.627, 1.000);
    vColor = mix(mauveCol, violetCol, vCondense);
    vColor = mix(vColor, whiteCol, aRandom.x * 0.25 * vCondense);
    vColor = mix(vColor, goldCol, uDissolveAmt * aRandom.y * 0.3);
    vColor = mix(vColor, violetCol * 0.5, uDissolveAmt * 0.4);

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;
    gl_PointSize = (vBrightness * 3.0 + 1.5) * (300.0 / -mvPos.z);
  }
`;

const particleFragShader = /* glsl */ `
  precision highp float;
  varying float vBrightness;
  varying float vCondense;
  varying vec3 vColor;

  void main(){
    vec2 uv = gl_PointCoord - 0.5;
    float dist = length(uv);
    if(dist > 0.5) discard;

    float alpha = smoothstep(0.5, 0.0, dist);
    float glow = exp(-dist * 4.5) * vBrightness;
    vec3 col = vColor * (1.0 + glow * 0.9);
    float core = smoothstep(0.18, 0.0, dist);
    col += vec3(1.0) * core * vCondense * 0.7;

    gl_FragColor = vec4(col, alpha * vBrightness * 1.3);
  }
`;

interface SigilParticlesProps {
  condenseRef: React.MutableRefObject<number>;
  dissolveRef: React.MutableRefObject<number>;
}

const SigilParticles: React.FC<SigilParticlesProps> = ({ condenseRef, dissolveRef }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null!);

  const { positions, randoms, phases, radii, speeds } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const randoms   = new Float32Array(PARTICLE_COUNT * 4);
    const phases    = new Float32Array(PARTICLE_COUNT);
    const radii     = new Float32Array(PARTICLE_COUNT);
    const speeds    = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const r = 1.2 + Math.random() * 3.8;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      positions[i*3+0] = r * Math.sin(phi) * Math.cos(theta);
      positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i*3+2] = r * Math.cos(phi);

      randoms[i*4+0] = Math.random();
      randoms[i*4+1] = Math.random();
      randoms[i*4+2] = Math.random();
      randoms[i*4+3] = Math.random();

      phases[i]  = Math.random();
      radii[i]   = 0.6 + Math.random() * 3.0;
      speeds[i]  = 0.2 + Math.random() * 0.8;
    }
    return { positions, randoms, phases, radii, speeds };
  }, []);

  const uniforms = useMemo(() => ({
    uTime:        { value: 0 },
    uCondenseAmt: { value: 0 },
    uDissolveAmt: { value: 0 },
    uSigilScale:  { value: 1.4 },
  }), []);

  useFrame(({ clock }) => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uTime.value        = clock.getElapsedTime();
    materialRef.current.uniforms.uCondenseAmt.value  = condenseRef.current;
    materialRef.current.uniforms.uDissolveAmt.value  = dissolveRef.current;
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={PARTICLE_COUNT} array={positions}   itemSize={3} />
        <bufferAttribute attach="attributes-aRandom"   count={PARTICLE_COUNT} array={randoms}      itemSize={4} />
        <bufferAttribute attach="attributes-aPhase"    count={PARTICLE_COUNT} array={phases}       itemSize={1} />
        <bufferAttribute attach="attributes-aRadius"  count={PARTICLE_COUNT} array={radii}        itemSize={1} />
        <bufferAttribute attach="attributes-aSpeed"    count={PARTICLE_COUNT} array={speeds}       itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={particleVertShader}
        fragmentShader={particleFragShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   LAYER 3 — Hermetic glyph mesh (Zos — the body as magical instrument)
   ═══════════════════════════════════════════════════════════════════ */

const glyphVertShader = /* glsl */ `
  ${SIMPLEX_NOISE_GLSL}

  attribute float aPhase;

  uniform float uTime;
  uniform float uDisplaceAmp;
  uniform float uDisplaceFreq;
  uniform float uOpacity;
  uniform float uSigilScale;
  uniform float uBreathAmt;

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vDisp;
  varying float vFresnel;

  void main(){
    float breath = sin(uTime * 0.25) * uBreathAmt;
    float amp    = uDisplaceAmp * (1.0 + breath * 0.6);
    float freq   = uDisplaceFreq;

    float disp = sin(position.y * freq + uTime * 0.8 + aPhase * 6.2832) * amp;
    disp += sin(position.x * freq * 0.7 + uTime * 0.6 + aPhase * 3.14) * amp * 0.5;
    vec3 displaced = position + normal * disp;

    vWorldPos = (modelMatrix * vec4(displaced, 1.0)).xyz;
    vNormal   = normalize(normalMatrix * normal);
    vDisp     = disp;

    vec4 mvPos = modelViewMatrix * vec4(displaced, 1.0);
    gl_Position = projectionMatrix * mvPos;

    // Fresnel
    vec3 viewDir = normalize(-mvPos.xyz);
    vFresnel = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 3.0);
  }
`;

const glyphFragShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uOpacity;
  uniform float uCondenseAmt;
  uniform float uEmissive;

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vDisp;
  varying float vFresnel;

  vec3 nightRamp(float t){
    vec3 c0 = vec3(0.020, 0.020, 0.031);
    vec3 c1 = vec3(0.478, 0.173, 0.478);
    vec3 c2 = vec3(0.690, 0.416, 1.000);
    vec3 c3 = vec3(0.910, 0.878, 1.000);
    if(t < 0.33) return mix(c0, c1, t/0.33);
    if(t < 0.66) return mix(c1, c2, (t-0.33)/0.33);
    return mix(c2, c3, (t-0.66)/0.34);
  }

  void main(){
    float t = clamp((vWorldPos.y + 1.2) / 2.8, 0.0, 1.0);
    vec3 col = nightRamp(t);

    // emissive peaks at displacement
    float emissive = abs(vDisp) * 4.0 * uEmissive;
    col += vec3(0.690, 0.416, 1.000) * emissive;

    // Fresnel glow at silhouette edges (strange green Steffi accent)
    col += vec3(0.176, 0.290, 0.243) * vFresnel * 1.8;

    // inner core brightening based on condensation
    float inner = (1.0 - length(vWorldPos.xz) / 1.5);
    col += vec3(0.910, 0.878, 1.000) * inner * uCondenseAmt * 0.25;

    // subtle scanline shimmer
    float scan = sin(vWorldPos.y * 40.0 + uTime * 2.0) * 0.03 + 0.97;
    col *= scan;

    gl_FragColor = vec4(col, uOpacity);
  }
`;

function addPhaseAttribute(geo: THREE.BufferGeometry) {
  const count = geo.attributes.position.count;
  const phases = new Float32Array(count);
  for (let i = 0; i < count; i++) phases[i] = Math.random();
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  return geo;
}

const GLYPH_PARTS = [
  // outer torus ring
  { geo: new THREE.TorusGeometry(0.68, 0.025, 8, 128),   pos: [0,0,0] as [number,number,number], rot: [Math.PI/2,0,0] as [number,number,number], amp: 0.018, freq: 2.8 },
  // mid ring
  { geo: new THREE.TorusGeometry(0.44, 0.018, 8, 128),    pos: [0,0,0] as [number,number,number], rot: [Math.PI/2,0,0] as [number,number,number], amp: 0.012, freq: 3.2 },
  // inner ring
  { geo: new THREE.TorusGeometry(0.20, 0.014, 8, 64),     pos: [0,0,0] as [number,number,number], rot: [Math.PI/2,0,0] as [number,number,number], amp: 0.008, freq: 4.0 },
  // horizontal cross bar
  { geo: new THREE.PlaneGeometry(1.5, 0.045),             pos: [0,0,0.002] as [number,number,number], rot: [0,0,0] as [number,number,number], amp: 0.015, freq: 2.5 },
  // vertical cross bar
  { geo: new THREE.PlaneGeometry(0.045, 1.5),             pos: [0,0,0.002] as [number,number,number], rot: [0,0,0] as [number,number,number], amp: 0.015, freq: 2.5 },
  // diagonal cross 1
  { geo: new THREE.PlaneGeometry(1.5, 0.03),              pos: [0,0,0.003] as [number,number,number], rot: [0,0,Math.PI/4] as [number,number,number], amp: 0.010, freq: 3.0 },
  // diagonal cross 2
  { geo: new THREE.PlaneGeometry(1.5, 0.03),              pos: [0,0,0.003] as [number,number,number], rot: [0,0,-Math.PI/4] as [number,number,number], amp: 0.010, freq: 3.0 },
  // center eye circle
  { geo: new THREE.CircleGeometry(0.14, 64),              pos: [0,0,0.005] as [number,number,number], rot: [0,0,0] as [number,number,number], amp: 0.005, freq: 5.0 },
  // outer eye ring
  { geo: new THREE.TorusGeometry(0.14, 0.012, 8, 64),     pos: [0,0,0.004] as [number,number,number], rot: [Math.PI/2,0,0] as [number,number,number], amp: 0.008, freq: 4.5 },
];

const CORNER_DOTS: [number, number][] = [
  [0.52, 0.52], [-0.52, 0.52], [0.52, -0.52], [-0.52, -0.52],
];

function GlyphMesh({ opacityRef, condenseRef }: { opacityRef: React.MutableRefObject<number>; condenseRef: React.MutableRefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null!);

  const geos = useMemo(() =>
    GLYPH_PARTS.map(p => addPhaseAttribute(p.geo.clone())),
  []);

  const matRefs = useRef<(THREE.ShaderMaterial | null)[]>([]);
  const cornerMatRefs = useRef<(THREE.MeshBasicMaterial | null)[]>([]);

  const uniformsList = useMemo(() =>
    GLYPH_PARTS.map(p => ({
      uTime:        { value: 0 },
      uDisplaceAmp: { value: p.amp },
      uDisplaceFreq:{ value: p.freq },
      uOpacity:     { value: 0 },
      uSigilScale:  { value: 1.4 },
      uBreathAmt:   { value: 0.5 },
      uCondenseAmt: { value: 0 },
      uEmissive:    { value: 0.4 },
    })),
  []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    const opacity = opacityRef.current;
    const condense = condenseRef.current;
    const pulse = 0.88 + 0.12 * Math.sin(t * 1.8);

    groupRef.current.visible = opacity > 0.01;
    groupRef.current.rotation.z += 0.0004;

    uniformsList.forEach((u, i) => {
      u.uTime.value = t;
      u.uOpacity.value = opacity * (i === 7 ? pulse : 1.0); // eye pulses
      u.uCondenseAmt.value = condense;
      u.uEmissive.value = 0.3 + condense * 0.5;
      if (matRefs.current[i]) {
        (matRefs.current[i] as THREE.ShaderMaterial).uniforms = u;
      }
    });

    cornerMatRefs.current.forEach(m => {
      if (m) m.opacity = opacity * 0.85;
    });
  });

  return (
    <group ref={groupRef} rotation={[Math.PI / 2, 0, 0]}>
      {GLYPH_PARTS.map((part, i) => (
        <mesh key={i} position={part.pos} rotation={part.rot}>
          <primitive object={geos[i]} attach="geometry" />
          <shaderMaterial
            ref={el => { matRefs.current[i] = el; }}
            vertexShader={glyphVertShader}
            fragmentShader={glyphFragShader}
            uniforms={uniformsList[i]}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}

      {/* corner dots */}
      {CORNER_DOTS.map(([x, z], i) => (
        <mesh key={`corner-${i}`} position={[x, z, 0.005]}>
          <circleGeometry args={[0.042, 16]} />
          <meshBasicMaterial
            ref={el => { cornerMatRefs.current[i] = el; }}
            color={ELECTRIC_VIOLET}
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   LAYER 4 — Central emissive core (eye of the sigil)
   ═══════════════════════════════════════════════════════════════════ */

function CentralCore({ intensityRef }: { intensityRef: React.MutableRefObject<number> }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const geo = useMemo(() => new THREE.SphereGeometry(0.08, 16, 16), []);
  const matRef = useRef<THREE.MeshBasicMaterial>(null!);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    const intensity = intensityRef.current;
    const pulse = 1.0 + 0.2 * Math.sin(t * 3.3) + 0.1 * Math.sin(t * 7.1);
    meshRef.current.scale.setScalar(pulse);
    if (matRef.current) {
      matRef.current.opacity = intensity * (0.7 + 0.1 * Math.sin(t * 4.7));
    }
    meshRef.current.visible = intensity > 0.01;
  });

  return (
    <mesh ref={meshRef} geometry={geo}>
      <meshBasicMaterial
        ref={matRef}
        color={COLD_WHITE}
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PHASE DRIVER — 36-second cycle
   ═══════════════════════════════════════════════════════════════════ */

interface PhaseState {
  condenseAmt: number;
  dissolveAmt: number;
  glyphOpacity: number;
  coreIntensity: number;
  bgWarpAmp: number;
  bgOpacity: number;
}

function computePhase(cycleT: number): PhaseState {
  // Phase 1 — Emergence: 0.00 – 0.20
  if (cycleT < 0.20) {
    const p = cycleT / 0.20;
    return {
      condenseAmt:   p * 0.6,
      dissolveAmt:  0,
      glyphOpacity: p * 0.7,
      coreIntensity: p * 0.4,
      bgWarpAmp:    0.2 + p * 0.5,
      bgOpacity:    0.3 + p * 0.5,
    };
  }
  // Phase 2 — Crystallization: 0.20 – 0.50
  if (cycleT < 0.50) {
    const p = (cycleT - 0.20) / 0.30;
    return {
      condenseAmt:   0.6 + p * 0.4,
      dissolveAmt:  0,
      glyphOpacity: 0.7 + p * 0.3,
      coreIntensity: 0.4 + p * 0.5,
      bgWarpAmp:    0.7 + p * 0.2,
      bgOpacity:    0.8 + p * 0.2,
    };
  }
  // Phase 3 — Ecstatic Transmission: 0.50 – 0.75
  if (cycleT < 0.75) {
    const p = (cycleT - 0.50) / 0.25;
    const flicker = 0.75 + 0.25 * Math.sin(cycleT * 30.0);
    return {
      condenseAmt:   1.0,
      dissolveAmt:  p * 0.25,
      glyphOpacity: flicker,
      coreIntensity: 0.9 * flicker,
      bgWarpAmp:    0.9 + 0.1 * Math.sin(cycleT * 20.0),
      bgOpacity:    1.0,
    };
  }
  // Phase 4 — Withdrawal: 0.75 – 1.00
  const p = (cycleT - 0.75) / 0.25;
  return {
    condenseAmt:   1.0 - p,
    dissolveAmt:  0.25 + p * 0.75,
    glyphOpacity: (1.0 - p) * 0.85,
    coreIntensity: (1.0 - p) * 0.6,
    bgWarpAmp:    1.0 - p * 0.8,
    bgOpacity:    1.0 - p * 0.7,
  };
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN SCENE
   ═══════════════════════════════════════════════════════════════════ */

function SigilTransmissionScene() {
  const condenseRef  = useRef(0);
  const dissolveRef  = useRef(0);
  const glyphOpRef   = useRef(0);
  const coreIntRef   = useRef(0);
  const bgWarpRef    = useRef(0);
  const bgOpacityRef = useRef(0);

  // expose warp amp to Background via ref stored in module

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const cycleT = (t % CYCLE_DURATION) / CYCLE_DURATION;
    const phase = computePhase(cycleT);

    condenseRef.current   = phase.condenseAmt;
    dissolveRef.current   = phase.dissolveAmt;
    glyphOpRef.current     = phase.glyphOpacity;
    coreIntRef.current     = phase.coreIntensity;
    bgWarpRef.current      = phase.bgWarpAmp;
    bgOpacityRef.current   = phase.bgOpacity;
  });

  return (
    <>
      <color attach="background" args={[VOID_BLACK]} />
      <fogExp2 attach="fog" args={[VOID_BLACK, 0.045]} />

      <ambientLight intensity={0.06} />
      <pointLight position={[0, 0, 2]}   intensity={0.5} color={ELECTRIC_VIOLET} />
      <pointLight position={[0, 0, -2]}  intensity={0.35} color={NIGHT_PURPLE} />
      <pointLight position={[2, 1, 0]}   intensity={0.2}  color={STRANGE_GREEN} />
      <pointLight position={[-2, -1, 0]} intensity={0.15} color={DEEP_MAUVE} />

      <Background opacityRef={bgOpacityRef} warpAmpRef={bgWarpRef} />
      <SigilParticles condenseRef={condenseRef} dissolveRef={dissolveRef} />
      <GlyphMesh opacityRef={glyphOpRef} condenseRef={condenseRef} />
      <CentralCore intensityRef={coreIntRef} />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.08}
          luminanceSmoothing={0.88}
          intensity={1.6}
          radius={0.8}
          mipmapBlur
        />
        <ChromaticAberration
          blendFunction={BlendFunction.NORMAL}
          offset={new THREE.Vector2(0.0015, 0.0015)}
          radialModulation
          modulationOffset={0.12}
        />
        <Noise
          blendFunction={BlendFunction.SOFT_LIGHT}
          opacity={0.12}
        />
        <Vignette
          offset={0.28}
          darkness={0.90}
          blendFunction={BlendFunction.NORMAL}
        />
      </EffectComposer>
    </>
  );
}

export default function SigilTransmission() {
  return (
    <Canvas
      style={{ width: '100%', height: '100%', display: 'block' }}
      gl={{ antialias: true, alpha: false }}
      camera={{ position: [0, 0, 4], fov: 50 }}
    >
      <SigilTransmissionScene />
    </Canvas>
  );
}
