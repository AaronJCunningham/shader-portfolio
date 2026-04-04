'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ─── Nightside Palette (Steffi Grant / Mauve Zone) ────────────────────────────
const VOID_BLACK = new THREE.Color('#000510');    // deepest void
const DEEP_NIGHT = new THREE.Color('#001133');    // deep nightside
const MID_NIGHT   = new THREE.Color('#003366');   // mid nightside
const EDGE_NIGHT  = new THREE.Color('#336699');   // edge nightside
const TRANSMIT    = new THREE.Color('#aaccff');   // transmission white-blue

// ─── GPGPU Fragment Generator Shaders ─────────────────────────────────────────
const fragGenVert = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
`;

const fragGenFrag = /* glsl */`
  precision highp float;
  uniform sampler2D uPrev;
  uniform float uTime;
  uniform float uPhase;
  varying vec2 vUv;

  // Simplex noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289((x*34.0+1.0)*x); }
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865, 0.366025404, -0.577350269, 0.024390244);
    vec2 i = floor(v + dot(v, C.yz));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = x0.x > x0.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * 0.024390244) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291 - 0.85373472 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x*x0.x + h.x*x0.y;
    g.yz = a0.yz*x12.xz + h.yz*x12.yw;
    return 130.0 * dot(m, g);
  }

  float fbm(vec2 p, float t) {
    float f = 0.0;
    f += 0.5 * snoise(p + t*0.07); p *= 2.02;
    f += 0.25 * snoise(p + t*0.11); p *= 2.03;
    f += 0.125 * snoise(p + t*0.17);
    return f;
  }

  void main() {
    vec2 uv = vUv;
    // Domain warp inward
    float wx = fbm(uv*2.0 + vec2(0.0, uTime*0.04), uTime);
    float wy = fbm(uv*2.0 + vec2(3.7, uTime*0.04), uTime);
    vec2 warped = uv + vec2(wx, wy) * 0.08;
    
    // Attract to center during assembly phase
    float assemble = smoothstep(0.0, 0.3, uPhase) * smoothstep(0.3, 0.0, uPhase - 0.28);
    vec2 centerAttract = (vec2(0.5) - uv) * assemble * 0.15;
    warped += centerAttract;
    warped = clamp(warped, 0.0, 1.0);

    // Repel outward during dissolution
    float dissolve = smoothstep(0.6, 1.0, uPhase);
    vec2 centerRepel = (uv - vec2(0.5)) * dissolve * 0.2;
    warped += centerRepel;
    warped = clamp(warped, 0.0, 1.0);

    vec4 prev = texture2D(uPrev, warped);
    float signal = 0.0;
    
    // Signal generation during assembly and hold
    if (uPhase > 0.05 && uPhase < 0.92) {
      signal = (snoise(uv*6.0 + uTime*0.2) * 0.5 + 0.5) * (0.6 - abs(uPhase - 0.45)) * 0.18;
    }

    vec3 col = prev.rgb * 0.968 + signal * vec3(0.7, 0.5, 0.8);
    
    // Fade in at start, fade out at end
    float envelope = smoothstep(0.0, 0.1, uPhase) * smoothstep(1.0, 0.85, uPhase);
    col *= envelope;
    
    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }
`;

// ─── SDF Glyph Probe GPGPU ────────────────────────────────────────────────────
const sdfProbeVert = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
`;

const sdfProbeFrag = /* glsl */`
  precision highp float;
  uniform float uTime;
  uniform float uPhase;
  varying vec2 vUv;

  // 3D Simplex noise
  vec3 mod289v3(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
  vec4 mod289v4(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
  vec4 permute4(vec4 x) { return mod289v4((x*34.0+1.0)*x); }
  vec4 taylorInvSqrt4(vec4 r) { return 1.79284291 - 0.85373472*r; }

  float snoise3(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g, l.zxy);
    vec3 i2 = max(g, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289v3(i);
    vec4 p = permute4(permute4(permute4(i.z+vec4(0.0,i1.z,i2.z,1.0))
      +i.y+vec4(0.0,i1.y,i2.y,1.0))
      +i.x+vec4(0.0,i1.x,i2.x,1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0*floor(p*ns.z*ns.z);
    vec4 x_ = floor(j*ns.z);
    vec4 y_ = floor(j - 7.0*x_);
    vec4 xx = x_*ns.x + ns.yyyy;
    vec4 yy = y_*ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(xx) - abs(yy);
    vec4 b0 = vec4(xx.xy, yy.xy);
    vec4 b1 = vec4(xx.zw, yy.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt4(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m*m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  float fbm3(vec3 p) {
    float f = 0.0;
    f += 0.5 * snoise3(p); p *= 2.01;
    f += 0.25 * snoise3(p); p *= 2.02;
    f += 0.125 * snoise3(p);
    return f;
  }

  // SDFs
  float sdSphere(vec3 p, float r) { return length(p) - r; }
  float sdTorus(vec3 p, vec2 t) { return length(vec2(length(p.xz)-t.x, p.y)) - t.y; }
  
  mat2 rot2(float a) { float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }

  float glyphSDF(vec3 p) {
    // Central void sphere
    float core = sdSphere(p, 0.72);
    
    // Nested tori rings — 3 concentric
    vec3 tp = p;
    tp.xz *= rot2(uTime*0.07);
    tp.y += sin(uTime*0.13)*0.1;
    float ring1 = abs(sdTorus(tp, vec2(1.15, 0.014))) - 0.005;
    
    tp = p;
    tp.xz *= rot2(uTime*0.05 + 1.047);
    float ring2 = abs(sdTorus(tp, vec2(1.0, 0.012))) - 0.004;
    
    tp = p;
    tp.xz *= rot2(uTime*0.06 + 2.094);
    float ring3 = abs(sdTorus(tp, vec2(0.85, 0.01))) - 0.003;
    
    // Radial spikes via subtraction cylinders
    float spikes = 1e6;
    for (float i=0.0; i<8.0; i+=1.0) {
      float a = i * 0.7854 + uTime*0.035;
      vec3 sn = vec3(cos(a), 0.0, sin(a));
      float d = length(p - sn*0.95) - 0.038;
      spikes = min(spikes, d);
    }
    
    // Domain warp the core
    core += fbm3(p*2.0 + uTime*0.12) * 0.11;
    
    // Compose: core ∧ rings ∧ spikes
    float result = min(core, min(ring1, min(ring2, min(ring3, spikes))));
    
    // Broken symmetry offset
    float asymmetry = sin(p.y * 3.0 + uTime*0.08) * 0.04;
    if (p.x < 0.0) asymmetry *= -0.7; // break the symmetry
    result += asymmetry;
    
    return result;
  }

  void main() {
    vec2 uv = vUv;
    // Map UV to 3D probe space
    vec3 p = vec3(uv*2.0 - 1.0, sin(uTime*0.1)*0.5);
    
    float d = glyphSDF(p);
    
    // Encode SDF distance in RGB (normalize to 0-1 for texture)
    float distNorm = clamp((d + 1.0) / 2.0, 0.0, 1.0);
    
    // Also encode phase information in alpha
    float phaseInfo = uPhase;
    
    gl_FragColor = vec4(distNorm, distNorm*0.8, distNorm*0.6, phaseInfo);
  }
`;

// ─── Final Raymarching Pass ───────────────────────────────────────────────────
const rayVert = /* glsl */`
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const rayFrag = /* glsl */`
  precision highp float;
  uniform float uTime;
  uniform float uPhase;
  uniform vec2 uRes;
  uniform sampler2D uFragments;
  uniform sampler2D uSdfData;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  // Noise for domain warping
  vec3 mod289v3(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
  vec4 mod289v4(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
  vec4 permute4(vec4 x) { return mod289v4((x*34.0+1.0)*x); }
  vec4 taylorInvSqrt4(vec4 r) { return 1.79284291 - 0.85373472*r; }

  float snoise3(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g, l.zxy);
    vec3 i2 = max(g, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289v3(i);
    vec4 p = permute4(permute4(permute4(i.z+vec4(0.0,i1.z,i2.z,1.0))
      +i.y+vec4(0.0,i1.y,i2.y,1.0))
      +i.x+vec4(0.0,i1.x,i2.x,1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0*floor(p*ns.z*ns.z);
    vec4 x_ = floor(j*ns.z);
    vec4 y_ = floor(j - 7.0*x_);
    vec4 xx = x_*ns.x + ns.yyyy;
    vec4 yy = y_*ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(xx) - abs(yy);
    vec4 b0 = vec4(xx.xy, yy.xy);
    vec4 b1 = vec4(xx.zw, yy.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt4(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m*m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  float fbm3(vec3 p) {
    float f = 0.0;
    f += 0.5 * snoise3(p); p *= 2.01;
    f += 0.25 * snoise3(p);
    return f;
  }

  // SDFs (mirrored from probe)
  float sdSphere(vec3 p, float r) { return length(p) - r; }
  float sdTorus(vec3 p, vec2 t) { return length(vec2(length(p.xz)-t.x, p.y)) - t.y; }
  mat2 rot2(float a) { float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }

  float glyphSDF(vec3 p) {
    float core = sdSphere(p, 0.72);
    
    vec3 tp = p;
    tp.xz *= rot2(uTime*0.07);
    tp.y += sin(uTime*0.13)*0.1;
    float ring1 = abs(sdTorus(tp, vec2(1.15, 0.014))) - 0.005;
    
    tp = p;
    tp.xz *= rot2(uTime*0.05 + 1.047);
    float ring2 = abs(sdTorus(tp, vec2(1.0, 0.012))) - 0.004;
    
    tp = p;
    tp.xz *= rot2(uTime*0.06 + 2.094);
    float ring3 = abs(sdTorus(tp, vec2(0.85, 0.01))) - 0.003;
    
    float spikes = 1e6;
    for (float i=0.0; i<8.0; i+=1.0) {
      float a = i * 0.7854 + uTime*0.035;
      vec3 sn = vec3(cos(a), 0.0, sin(a));
      float d = length(p - sn*0.95) - 0.038;
      spikes = min(spikes, d);
    }
    
    core += fbm3(p*2.0 + uTime*0.12) * 0.11;
    
    float result = min(core, min(ring1, min(ring2, min(ring3, spikes))));
    
    float asymmetry = sin(p.y * 3.0 + uTime*0.08) * 0.04;
    if (p.x < 0.0) asymmetry *= -0.7;
    result += asymmetry;
    
    return result;
  }

  vec3 calcNormal(vec3 p) {
    const float e = 0.001;
    return normalize(vec3(
      glyphSDF(p + vec3(e, 0.0, 0.0)) - glyphSDF(p - vec3(e, 0.0, 0.0)),
      glyphSDF(p + vec3(0.0, e, 0.0)) - glyphSDF(p - vec3(0.0, e, 0.0)),
      glyphSDF(p + vec3(0.0, 0.0, e)) - glyphSDF(p - vec3(0.0, 0.0, e))
    ));
  }

  void main() {
    vec3 ro = cameraPosition;
    vec3 rd = normalize(vWorldPos - cameraPosition);
    vec2 uv = gl_FragCoord.xy / uRes;

    // Background gradient into void
    float bgGrad = 1.0 - dot(uv - 0.5, uv - 0.5) * 1.4;
    vec3 col = mix(
      vec3(0.0, 0.003137, 0.066667),  // #000510
      vec3(0.0, 0.066667, 0.2),        // #001133
      clamp(bgGrad, 0.0, 1.0)
    );

    // GPGPU bleed into background
    vec4 fragSample = texture2D(uFragments, uv);
    float arrive = smoothstep(0.0, 0.45, uPhase);
    col += fragSample.rgb * 0.22 * smoothstep(0.05, 0.5, uPhase);

    // Raymarch
    float dist = 0.0;
    float hit = -1.0;
    for (int i = 0; i < 128; i++) {
      vec3 p = ro + rd * dist;
      float h = glyphSDF(p);
      if (h < 0.001) {
        hit = dist;
        break;
      }
      if (dist > 20.0) break;
      dist += h * 0.72;
    }

    if (hit > 0.0) {
      vec3 p = ro + rd * hit;
      vec3 n = calcNormal(p);
      
      // Lighting
      float hold = smoothstep(0.3, 0.6, uPhase) * smoothstep(1.0, 0.65, uPhase);
      float diff = max(0.0, dot(n, normalize(vec3(1.8, 2.5, 3.0))));
      float rim = pow(1.0 - max(0.0, dot(n, -rd)), 4.0);
      
      // Palette based on distance to center
      float centerDist = length(p);
      vec3 surfCol;
      
      if (centerDist > 0.8) {
        surfCol = vec3(0.0, 0.003137, 0.066667);  // #000510
      } else if (centerDist > 0.5) {
        surfCol = vec3(0.0, 0.066667, 0.2);       // #001133
      } else if (centerDist > 0.2) {
        surfCol = vec3(0.0, 0.2, 0.4);            // #003366
      } else if (centerDist > 0.05) {
        surfCol = vec3(0.2, 0.4, 0.6);            // #336699
      } else {
        surfCol = vec3(0.666667, 0.8, 1.0);       // #aaccff
      }
      
      surfCol = mix(surfCol, surfCol + vec3(0.3, 0.5, 0.7), diff * 0.85);
      surfCol = mix(surfCol, vec3(0.666667, 0.8, 1.0), rim * 0.7 * hold);
      
      float leave = smoothstep(0.78, 1.0, uPhase);
      surfCol *= arrive * (1.0 - leave);
      col = surfCol;
    }

    // Custom post-processing
    // Chromatic aberration
    float ca = length(uv - 0.5) * 0.006;
    col.r += texture2D(uFragments, uv + vec2(ca, 0.0)).r * 0.15 * arrive;
    col.g += texture2D(uFragments, uv + vec2(0.0, ca*0.5)).g * 0.08 * arrive;
    col.b += texture2D(uFragments, uv - vec2(ca, 0.0)).b * 0.12 * arrive;
    
    // Vignette
    float vig = 1.0 - dot(uv - 0.5, uv - 0.5) * 1.8;
    col *= smoothstep(0.0, 1.0, vig);
    
    col = clamp(col, 0.0, 1.0);
    gl_FragColor = vec4(col, 1.0);
  }
`;

// ─── Component ────────────────────────────────────────────────────────────────
function Inner() {
  const { gl, size, camera } = useThree();

  // GPGPU ping-pong for fragment generator
  const fragPingRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const fragPongRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const fragMeshRef = useRef<THREE.Mesh>(null!);
  const fragMatRef = useRef<THREE.ShaderMaterial>(null!);
  const fragCam = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);

  // GPGPU for SDF probe
  const sdfProbeRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const sdfProbeMeshRef = useRef<THREE.Mesh>(null!);
  const sdfProbeMatRef = useRef<THREE.ShaderMaterial>(null!);
  const sdfProbeCam = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);

  // Main raymarching
  const rayMeshRef = useRef<THREE.Mesh>(null!);
  const rayMatRef = useRef<THREE.ShaderMaterial>(null!);

  // Scene RT
  const sceneRT = useMemo(
    () =>
      new THREE.WebGLRenderTarget(size.width, size.height, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
      }),
    [size]
  );

  // Init GPGPU targets
  useEffect(() => {
    const opts = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
    };
    fragPingRef.current = new THREE.WebGLRenderTarget(256, 256, opts);
    fragPongRef.current = new THREE.WebGLRenderTarget(256, 256, opts);
    sdfProbeRef.current = new THREE.WebGLRenderTarget(256, 256, opts);
    return () => {
      fragPingRef.current?.dispose();
      fragPongRef.current?.dispose();
      sdfProbeRef.current?.dispose();
      sceneRT.dispose();
    };
  }, [sceneRT]);

  useEffect(() => {
    rayMatRef.current.uniforms.uRes.value.set(size.width, size.height);
    sceneRT.setSize(size.width, size.height);
  }, [size, sceneRT]);

  const CYCLE = 60;
  function smoothstep(e0: number, e1: number, x: number) {
    const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  }

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const ct = (t + 25) % CYCLE;
    let phase = 0;
    if (ct < 20) phase = smoothstep(0, 20, ct) * 0.3;
    else if (ct < 30) phase = 0.3 + smoothstep(20, 30, ct) * 0.3;
    else if (ct < 50) phase = 0.6 + smoothstep(30, 50, ct) * 0.4;
    else phase = smoothstep(60, 50, ct);

    // Fragment generator GPGPU
    const fragPing = fragPingRef.current;
    const fragPong = fragPongRef.current;
    if (fragPing && fragPong) {
      const mat = fragMatRef.current;
      mat.uniforms.uTime.value = t;
      mat.uniforms.uPhase.value = phase;
      mat.uniforms.uPrev.value = fragPong.texture;
      gl.setRenderTarget(fragPing);
      gl.render(fragMeshRef.current, fragCam);
      gl.setRenderTarget(null);
      fragPingRef.current = fragPong;
      fragPongRef.current = fragPing;
    }

    // SDF probe
    const sdfProbe = sdfProbeRef.current;
    if (sdfProbe) {
      const mat = sdfProbeMatRef.current;
      mat.uniforms.uTime.value = t;
      mat.uniforms.uPhase.value = phase;
      gl.setRenderTarget(sdfProbe);
      gl.render(sdfProbeMeshRef.current, sdfProbeCam);
      gl.setRenderTarget(null);
    }

    // Update ray uniforms
    rayMatRef.current.uniforms.uTime.value = t;
    rayMatRef.current.uniforms.uPhase.value = phase;
    rayMatRef.current.uniforms.uFragments.value = fragPingRef.current?.texture ?? null;
    rayMatRef.current.uniforms.uSdfData.value = sdfProbe?.texture ?? null;

    // Render to scene RT
    gl.setRenderTarget(sceneRT);
    gl.clear();
    gl.render(rayMeshRef.current, camera);
    gl.setRenderTarget(null);

    // Blit to screen
    gl.copyFramebufferToTexture(new THREE.Vector2(0, 0), sceneRT.texture);
  }, 0);

  return (
    <>
      {/* Fragment generator mesh — invisible */}
      <mesh ref={fragMeshRef} visible={false}>
        <planeGeometry args={[2, 2]} />
        <shaderMaterial
          ref={fragMatRef}
          vertexShader={fragGenVert}
          fragmentShader={fragGenFrag}
          uniforms={{
            uPrev: { value: null },
            uTime: { value: 0 },
            uPhase: { value: 0 },
          }}
        />
      </mesh>

      {/* SDF probe mesh — invisible */}
      <mesh ref={sdfProbeMeshRef} visible={false}>
        <planeGeometry args={[2, 2]} />
        <shaderMaterial
          ref={sdfProbeMatRef}
          vertexShader={sdfProbeVert}
          fragmentShader={sdfProbeFrag}
          uniforms={{
            uTime: { value: 0 },
            uPhase: { value: 0 },
          }}
        />
      </mesh>

      {/* Raymarching box — camera inside, shoots rays outward */}
      <mesh ref={rayMeshRef} material={rayMatRef}>
        <boxGeometry args={[10, 10, 10]} />
        <shaderMaterial
          ref={rayMatRef}
          vertexShader={rayVert}
          fragmentShader={rayFrag}
          uniforms={{
            uTime: { value: 0 },
            uPhase: { value: 0 },
            uRes: { value: new THREE.Vector2(size.width, size.height) },
            uFragments: { value: null },
            uSdfData: { value: null },
          }}
          side={THREE.BackSide}
        />
      </mesh>
    </>
  );
}

export default function ObservingFromOutsideTime() {
  return (
    <Canvas
      style={{ width: '100%', height: '100%', display: 'block' }}
      gl={{ antialias: false, alpha: false }}
      camera={{ position: [0, 0, 3.8], fov: 60 }}
    >
      <Inner />
    </Canvas>
  );
}
