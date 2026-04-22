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

const PARTICLE_COUNT = 6000;
const CYCLE_DURATION = 40;

// Palette — Nightside / Mauve Zone / Alphabet of Desire
const VOID_BLACK      = '#050208';
const DEEP_MAUVE      = '#6b2d6b';
const ELECTRIC_MAUVE  = '#c060ff';
const BABALON_CRIMSON = '#8b0020';
const TYPHON_WHITE    = '#e8e0f8';
const SIGIL_GOLD      = '#d4a060';
const STRANGE_GREEN   = '#2d4a3e';

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
   LAYER 1 — Full-screen nightside void background
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
  uniform float uPhase;

  varying vec2 vUv;

  float fbm(vec3 p){
    float v = 0.0;
    float a = 0.5;
    for(int i=0;i<6;i++){
      v += a * snoise(p);
      p *= 2.1;
      a *= 0.46;
    }
    return v;
  }

  vec3 nightRamp(float t){
    vec3 c0 = vec3(0.020, 0.008, 0.031);
    vec3 c1 = vec3(0.180, 0.045, 0.220);
    vec3 c2 = vec3(0.420, 0.110, 0.380);
    vec3 c3 = vec3(0.753, 0.376, 1.000);
    vec3 c4 = vec3(0.910, 0.878, 0.973);
    if(t < 0.25) return mix(c0, c1, t/0.25);
    if(t < 0.50) return mix(c1, c2, (t-0.25)/0.25);
    if(t < 0.75) return mix(c2, c3, (t-0.50)/0.25);
    return mix(c3, c4, (t-0.75)/0.25);
  }

  void main(){
    vec2 uv = vUv;
    float aspect = uResolution.x / uResolution.y;
    vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

    float breathe = sin(uTime * 0.12 + uPhase) * 0.5 + 0.5;
    float warp1 = fbm(vec3(p * 1.4 + uTime * 0.05, uTime * 0.03));
    float warp2 = fbm(vec3(p * 1.4 + warp1 * 0.7 * uWarpAmp, uTime * 0.04 + 3.7));
    float warp3 = fbm(vec3(p * 0.9 - warp2 * 0.4 * uWarpAmp, uTime * 0.025 + 7.1));

    float density = warp3 * (0.55 + 0.45 * breathe) * uWarpAmp;
    float t = clamp(density * 0.5 + 0.5, 0.0, 1.0);

    float yFade = smoothstep(0.0, 0.5, uv.y);
    t = t * (0.35 + 0.65 * yFade);

    vec3 col = nightRamp(t);
    gl_FragColor = vec4(col * 0.95, 1.0);
  }
`;

function VoidBackground() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({
    uTime:       { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uWarpAmp:    { value: 1.2 },
    uPhase:      { value: 0 },
  }), []);

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
        vertexShader={bgVertShader}
        fragmentShader={bgFragShader}
        uniforms={uniforms}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   LAYER 2 — Glyph ring (drifting hermetic glyphs orbiting center)
   ═══════════════════════════════════════════════════════════════════ */

const glyphVertShader = /* glsl */ `
  ${SIMPLEX_NOISE_GLSL}

  attribute vec3 aBasePos;
  attribute float aPhase;
  attribute float aRadius;
  attribute float aSpeed;
  attribute float aSize;
  attribute vec3 aColor;

  uniform float uTime;
  uniform float uForming;
  uniform float uDissolving;

  varying float vBrightness;
  varying vec3 vColor;
  varying float vAlpha;

  void main(){
    float t = uTime * aSpeed + aPhase;

    float angle = t * 0.3;
    float r = aRadius + sin(t * 0.7) * 0.15;

    vec3 pos = aBasePos;
    pos.x = cos(angle) * r;
    pos.z = sin(angle) * r;
    pos.y += sin(t * 0.5) * 0.1;

    float wobble = snoise(pos * 2.0 + uTime * 0.2) * 0.08;
    pos += normalize(pos + 0.001) * wobble;

    float scale = uForming * (1.0 - uDissolving);
    pos *= 0.3 + scale * 0.7;

    vBrightness = 0.5 + 0.5 * sin(t * 1.3);
    vColor = aColor;
    vAlpha = smoothstep(0.0, 0.3, scale) * (0.4 + 0.4 * vBrightness);

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aSize * (300.0 / -mvPos.z) * (0.2 + 0.8 * scale);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const glyphFragShader = /* glsl */ `
  precision highp float;
  varying float vBrightness;
  varying vec3 vColor;
  varying float vAlpha;

  void main(){
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if(d > 0.5) discard;

    float edge = 1.0 - smoothstep(0.2, 0.5, d);
    float core = 1.0 - smoothstep(0.0, 0.2, d);

    vec3 col = mix(vColor * 0.6, vColor * 1.4, core);
    float alpha = edge * vAlpha;

    gl_FragColor = vec4(col, alpha);
  }
`;

function GlyphRing() {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const { positions, phases, radii, speeds, sizes, colors } = useMemo(() => {
    const count = 280;
    const pos = new Float32Array(count * 3);
    const ph  = new Float32Array(count);
    const rad = new Float32Array(count);
    const spd = new Float32Array(count);
    const sz  = new Float32Array(count);
    const col = new Float32Array(count * 3);

    const palette = [
      new THREE.Color(ELECTRIC_MAUVE),
      new THREE.Color(TYPHON_WHITE),
      new THREE.Color(DEEP_MAUVE),
      new THREE.Color(SIGIL_GOLD),
      new THREE.Color(STRANGE_GREEN),
    ];

    for (let i = 0; i < count; i++) {
      const r = 2.2 + Math.random() * 1.4;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.random() * Math.PI;
      pos[i*3+0] = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = (Math.random() - 0.5) * 0.8;
      pos[i*3+2] = r * Math.sin(phi) * Math.sin(theta);
      ph[i]  = Math.random() * Math.PI * 2;
      rad[i] = r;
      spd[i] = 0.08 + Math.random() * 0.12;
      sz[i]  = 0.5 + Math.random() * 2.5;
      const c = palette[Math.floor(Math.random() * palette.length)];
      col[i*3+0] = c.r; col[i*3+1] = c.g; col[i*3+2] = c.b;
    }
    return { positions: pos, phases: ph, radii: rad, speeds: spd, sizes: sz, colors: col };
  }, []);

  const uniforms = useMemo(() => ({
    uTime:       { value: 0 },
    uForming:    { value: 0 },
    uDissolving: { value: 0 },
  }), []);

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    const t = clock.getElapsedTime();
    matRef.current.uniforms.uTime.value = t;
    const cycle = (t % CYCLE_DURATION) / CYCLE_DURATION;
    const forming    = Math.min(1, cycle * 6);
    const dissolving = Math.max(0, (cycle - 0.65) * 3);
    matRef.current.uniforms.uForming.value    = forming;
    matRef.current.uniforms.uDissolving.value = dissolving;
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aPhase"   args={[phases,   1]} />
        <bufferAttribute attach="attributes-aRadius"  args={[radii,   1]} />
        <bufferAttribute attach="attributes-aSpeed"   args={[speeds,   1]} />
        <bufferAttribute attach="attributes-aSize"    args={[sizes,    1]} />
        <bufferAttribute attach="attributes-aColor"   args={[colors,   3]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={glyphVertShader}
        fragmentShader={glyphFragShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   LAYER 3 — Sigil particles that condense from noise into form
   ═══════════════════════════════════════════════════════════════════ */

const sigilVertShader = /* glsl */ `
  ${SIMPLEX_NOISE_GLSL}

  attribute vec3 aBasePos;
  attribute float aPhase;
  attribute float aRandom;
  attribute float aSigilPath;
  attribute float aOrbitRadius;
  attribute float aOrbitSpeed;

  uniform float uTime;
  uniform float uForming;
  uniform float uHolding;
  uniform float uDissolving;
  uniform float uPulse;
  uniform float uNoiseAmp;
  uniform float uNoiseFreq;

  varying float vBrightness;
  varying float vAlpha;
  varying float vPhase;
  varying float vRandom;

  void main(){
    float t = uTime * 0.12 + aPhase;
    float cycle = uForming + uHolding * (1.0 - uDissolving);

    float pathT = aSigilPath * 6.2832;
    float r = aOrbitRadius + sin(aSigilPath * 11.0) * 0.04;
    vec2 target2D = vec2(cos(pathT), sin(pathT)) * r;
    vec3 target = vec3(target2D.x, target2D.y * 0.6, 0.0);

    vec3 basePos = aBasePos * 2.8;

    float noiseAmt = uNoiseAmp * (1.0 - cycle * 0.7);
    vec3 nc = aBasePos * uNoiseFreq + uTime * 0.08;
    vec3 noise = vec3(
      snoise(nc),
      snoise(nc + vec3(17.3, 0.0, 0.0)),
      snoise(nc + vec3(0.0, 29.7, 0.0))
    ) * noiseAmt;

    vec3 pos = mix(basePos + noise, target, cycle);

    if(uDissolving > 0.0){
      vec3 scatter = normalize(target + vec3(0.001)) * uDissolving * 2.0;
      scatter += vec3(snoise(target * 3.0 + uTime * 0.6)) * uDissolving * 1.0;
      pos += scatter;
    }

    float breathe = sin(uTime * 0.9 + aPhase) * 0.03 * uPulse;
    pos *= 1.0 + breathe;

    vBrightness = 0.3 + 0.7 * cycle * (0.6 + 0.4 * sin(t * 2.1));
    vAlpha = cycle * (0.5 + 0.5 * vBrightness);
    vPhase = aPhase;
    vRandom = aRandom;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = (1.8 + aRandom * 2.2) * (280.0 / -mvPos.z) * (0.3 + 0.7 * cycle);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const sigilFragShader = /* glsl */ `
  precision highp float;
  varying float vBrightness;
  varying float vAlpha;
  varying float vPhase;
  varying float vRandom;

  void main(){
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if(d > 0.5) discard;

    float edge = 1.0 - smoothstep(0.15, 0.5, d);
    float core = 1.0 - smoothstep(0.0, 0.15, d);

    vec3 coreCol = vec3(0.910, 0.878, 0.973);
    vec3 edgeCol = vec3(0.753, 0.376, 1.000);
    vec3 goldCol = vec3(0.831, 0.627, 0.376);

    float goldMix = step(0.65, vRandom);
    vec3 edgeFinal = mix(edgeCol, goldCol, goldMix);
    vec3 col = mix(edgeFinal * 0.8, coreCol * 1.2, core);

    float alpha = edge * vAlpha * 0.85;
    gl_FragColor = vec4(col * vBrightness, alpha);
  }
`;

function SigilParticles() {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const { basePos, phases, randoms, sigilPaths, orbitRadii, orbitSpeeds } = useMemo(() => {
    const count = PARTICLE_COUNT;
    const bp  = new Float32Array(count * 3);
    const ph  = new Float32Array(count);
    const rnd = new Float32Array(count);
    const sp  = new Float32Array(count);
    const or  = new Float32Array(count);
    const os  = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 0.6 + Math.random() * 1.4;
      bp[i*3+0] = r * Math.sin(phi) * Math.cos(theta);
      bp[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      bp[i*3+2] = r * Math.cos(phi) * 0.5;
      ph[i]  = Math.random() * Math.PI * 2;
      rnd[i] = Math.random();
      sp[i]  = Math.random();
      or[i]  = 0.18 + Math.random() * 0.42;
      os[i]  = 0.08 + Math.random() * 0.15;
    }
    return { basePos: bp, phases: ph, randoms: rnd, sigilPaths: sp, orbitRadii: or, orbitSpeeds: os };
  }, []);

  const uniforms = useMemo(() => ({
    uTime:       { value: 0 },
    uForming:    { value: 0 },
    uHolding:    { value: 0 },
    uDissolving: { value: 0 },
    uPulse:      { value: 1 },
    uNoiseAmp:   { value: 0.6 },
    uNoiseFreq:  { value: 1.5 },
  }), []);

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    const t = clock.getElapsedTime();
    matRef.current.uniforms.uTime.value = t;

    const cycle = (t % CYCLE_DURATION) / CYCLE_DURATION;
    let forming = 0, holding = 0, dissolving = 0, pulse = 1;
    if (cycle < 0.15) {
      forming = cycle / 0.15;
      pulse = forming;
    } else if (cycle < 0.55) {
      forming = 1;
      holding = (cycle - 0.15) / 0.40;
      pulse = 0.8 + 0.2 * Math.sin(t * 1.2);
    } else if (cycle < 0.80) {
      forming = 1; holding = 1;
      dissolving = (cycle - 0.55) / 0.25;
      pulse = 1 - dissolving * 0.5;
    } else {
      dissolving = 1; pulse = 0;
    }

    matRef.current.uniforms.uForming.value    = forming;
    matRef.current.uniforms.uHolding.value    = holding;
    matRef.current.uniforms.uDissolving.value = dissolving;
    matRef.current.uniforms.uPulse.value      = pulse;
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position"     args={[basePos,     3]} />
        <bufferAttribute attach="attributes-aPhase"       args={[phases,       1]} />
        <bufferAttribute attach="attributes-aRandom"       args={[randoms,      1]} />
        <bufferAttribute attach="attributes-aSigilPath"    args={[sigilPaths,   1]} />
        <bufferAttribute attach="attributes-aOrbitRadius"  args={[orbitRadii,   1]} />
        <bufferAttribute attach="attributes-aOrbitSpeed"  args={[orbitSpeeds,  1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={sigilVertShader}
        fragmentShader={sigilFragShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   LAYER 4 — Central glyph mesh (torus cross + sphere)
   ═══════════════════════════════════════════════════════════════════ */

const glowVertShader = /* glsl */ `
  ${SIMPLEX_NOISE_GLSL}
  uniform float uTime;
  uniform float uCycle;
  varying float vBrightness;
  varying vec3 vNormal;

  void main(){
    float wobble = snoise(position * 2.0 + uTime * 0.15) * 0.05 * uCycle;
    vec3 pos = position + normal * wobble;
    vBrightness = 0.5 + 0.5 * sin(uTime * 0.8 + position.y * 2.0);
    vNormal = normalMatrix * normal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const glowFragShader = /* glsl */ `
  precision highp float;
  uniform float uCycle;
  uniform float uTime;
  varying float vBrightness;
  varying vec3 vNormal;

  void main(){
    float rim = 1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)));
    rim = pow(rim, 1.8);
    float brightness = vBrightness * rim * uCycle;
    vec3 col = mix(
      vec3(0.420, 0.110, 0.380),
      vec3(0.910, 0.878, 0.973),
      rim
    );
    gl_FragColor = vec4(col * brightness * 1.5, brightness * 0.6);
  }
`;

function CentralGlyph() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uCycle: { value: 0 } }), []);

  useFrame(({ clock }) => {
    if (!matRef.current || !groupRef.current) return;
    const t = clock.getElapsedTime();
    matRef.current.uniforms.uTime.value = t;

    const cycle = (t % CYCLE_DURATION) / CYCLE_DURATION;
    let forming = 0, holding = 0, dissolving = 0;
    if (cycle < 0.15) forming = cycle / 0.15;
    else if (cycle < 0.55) { forming = 1; holding = (cycle - 0.15) / 0.40; }
    else if (cycle < 0.80) { forming = 1; holding = 1; dissolving = (cycle - 0.55) / 0.25; }
    else dissolving = 1;

    const c = forming * (1 - dissolving);
    matRef.current.uniforms.uCycle.value = c;
    groupRef.current.rotation.z = t * 0.05;
    groupRef.current.scale.setScalar(0.1 + c * 0.9);
  });

  const mats = useMemo(() => ({
    glow: new THREE.ShaderMaterial({
      vertexShader: glowVertShader, fragmentShader: glowFragShader,
      uniforms, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    }),
  }), [uniforms]);

  return (
    <group ref={groupRef}>
      <mesh>
        <torusGeometry args={[0.3, 0.015, 8, 64]} />
        <primitive object={mats.glow} attach="material" />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 4]}>
        <torusGeometry args={[0.22, 0.008, 8, 64]} />
        <primitive object={mats.glow} attach="material" />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color={TYPHON_WHITE} transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   POST-PROCESSING
   ═══════════════════════════════════════════════════════════════════ */

function PostEffects() {
  return (
    <EffectComposer>
      <Bloom intensity={1.8} luminanceThreshold={0.15} luminanceSmoothing={0.9} mipmapBlur />
      <ChromaticAberration offset={new THREE.Vector2(0.0008, 0.0005)} blendFunction={BlendFunction.NORMAL} />
      <Noise opacity={0.04} blendFunction={BlendFunction.ADD} />
      <Vignette darkness={0.55} offset={0.3} />
    </EffectComposer>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SCENE ROOT
   ═══════════════════════════════════════════════════════════════════ */

function Scene() {
  return (
    <>
      <VoidBackground />
      <GlyphRing />
      <SigilParticles />
      <CentralGlyph />
      <PostEffects />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   EXPORTS
   ═══════════════════════════════════════════════════════════════════ */

const NightsideTransmission: React.FC = () => (
  <Canvas
    camera={{ position: [0, 0, 3], fov: 60, near: 0.01, far: 100 }}
    gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping }}
    style={{ background: VOID_BLACK }}
    dpr={[1, 2]}
  >
    <Scene />
  </Canvas>
);

export default NightsideTransmission;
