'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ─── Palette ─────────────────────────────────────────────────────────────────
const BONE = new THREE.Color('#c8b8a2');
const PALE = new THREE.Color('#e8ddd0');
const DEEP = new THREE.Color('#111111');
const VOID_COL = new THREE.Color('#000000');

// ─── GPGPU ping-pong shaders ─────────────────────────────────────────────────
const gpgpuVert = /* glsl */`
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = vec4(position,1.0); }
`;
const gpgpuFrag = /* glsl */`
  precision highp float;
  uniform sampler2D uPrev;
  uniform float uTime;
  uniform float uState;
  varying vec2 vUv;

  vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
  vec2 mod289(vec2 x){return x-floor(x*(1./289.))*289.;}
  vec3 permute(vec3 x){return mod289((x*34.+1.)*x);}
  float snoise(vec2 v){
    const vec4 C=vec4(.211324865,.366025404,-.577350269,.024390244);
    vec2 i=floor(v+dot(v,C.yz));
    vec2 x0=v-i+dot(i,C.xx);
    vec2 i1=x0.x>x0.y?vec2(1,0):vec2(0,1);
    vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1;
    i=mod289(i);
    vec3 p=permute(permute(i.y+vec3(0,i1.y,1))+i.x+vec3(0,i1.x,1));
    vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);
    m=m*m; m=m*m;
    vec3 gx=2.*fract(p*.024390244)-1.;
    vec3 h=abs(gx)-.5;
    vec3 ox=floor(gx+.5);
    vec3 a0=gx-ox;
    m*=1.79284291-.85373472*(a0*a0+h*h);
    vec3 g; g.x=a0.x*x0.x+h.x*x0.y; g.yz=a0.yz*x12.xz+h.yz*x12.yw;
    return 130.*dot(m,g);
  }
  float fbm(vec2 p, float t){
    float f=0.;
    f+=.500*snoise(p+t*.07); p*=2.02;
    f+=.250*snoise(p+t*.11); p*=2.03;
    f+=.125*snoise(p+t*.17);
    return f;
  }
  void main(){
    vec2 uv=vUv;
    float wx=fbm(uv*2.+vec2(0.,uTime*.04),uTime);
    float wy=fbm(uv*2.+vec2(3.7,uTime*.04),uTime);
    vec2 warped=clamp(uv+vec2(wx,wy)*.08,0.,1.);
    float attract=smoothstep(0.0,.5,uState)*smoothstep(1.0,.55,uState);
    warped+=clamp(warped+(vec2(0.5)-uv)*attract*.015,0.,1.)-warped;
    warped=clamp(warped,0.,1.);
    vec4 prev=texture2D(uPrev,warped);
    float signal=0.;
    if(uState>.05&&uState<.92) signal=(snoise(uv*6.+uTime*.2)*.5+.5)*attract*.18;
    vec3 col=prev.rgb*.968+signal*vec3(0.784,0.722,0.635);
    if(uState<.04) col*=0.;
    gl_FragColor=vec4(clamp(col,0.,1.),1.);
  }
`;

// ─── SDF raymarcher (on a box, camera shoots rays through it) ─────────────────
const sdfVert = /* glsl */`
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main(){
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position,1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const sdfFrag = /* glsl */`
  precision highp float;
  uniform float uTime;
  uniform float uState;
  uniform vec3 uBone;
  uniform vec3 uPale;
  uniform vec3 uDeep;
  uniform vec3 uVoid;
  uniform sampler2D uGpgpu;
  uniform vec2 uRes;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  // 3D simplex noise
  vec3 mod289v3(vec3 x){return x-floor(x*(1./289.))*289.;}
  vec4 mod289v4(vec4 x){return x-floor(x*(1./289.))*289.;}
  vec4 permute4(vec4 x){return mod289v4((x*34.+1.)*x);}
  vec4 taylorInvSqrt4(vec4 r){return 1.79284291-.85373472*r;}
  float snoise3(vec3 v){
    const vec2 C=vec2(1./6.,1./3.);
    const vec4 D=vec4(0.,.5,1.,2.);
    vec3 i=floor(v+dot(v,C.yyy));
    vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz);
    vec3 l=1.-g;
    vec3 i1=min(g,l.zxy);
    vec3 i2=max(g,l.zxy);
    vec3 x1=x0-i1+C.xxx;
    vec3 x2=x0-i2+C.yyy;
    vec3 x3=x0-D.yyy;
    i=mod289v3(i);
    vec4 p=permute4(permute4(permute4(
      i.z+vec4(0.,i1.z,i2.z,1.))
      +i.y+vec4(0.,i1.y,i2.y,1.))
      +i.x+vec4(0.,i1.x,i2.x,1.));
    float n_=.142857142857;
    vec3 ns=n_*D.wyz-D.xzx;
    vec4 j=p-49.*floor(p*ns.z*ns.z);
    vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.*x_);
    vec4 xx=x_*ns.x+ns.yyyy; vec4 yy=y_*ns.x+ns.yyyy;
    vec4 h=1.-abs(xx)-abs(yy);
    vec4 b0=vec4(xx.xy,yy.xy); vec4 b1=vec4(xx.zw,yy.zw);
    vec4 s0=floor(b0)*2.+1.; vec4 s1=floor(b1)*2.+1.;
    vec4 sh=-step(h,vec4(0.));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
    vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x);
    vec3 p1=vec3(a0.zw,h.y);
    vec3 p2=vec3(a1.xy,h.z);
    vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=taylorInvSqrt4(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
    vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
    m=m*m;
    return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }
  float fbm3(vec3 p){
    float f=0.;
    f+=.500*snoise3(p); p*=2.01;
    f+=.250*snoise3(p); p*=2.02;
    f+=.125*snoise3(p);
    return f;
  }

  float sdSphere(vec3 p,float r){return length(p)-r;}
  float sdCapsule(vec3 p,vec3 a,vec3 b,float r){
    vec3 pa=p-a,ba=b-a;
    return length(pa-ba*clamp(dot(pa,ba)/dot(ba,ba),0.,1.))-r;
  }
  float sdTorus(vec3 p,vec2 t){return length(vec2(length(p.xz)-t.x,p.y))-t.y;}
  mat2 rot2(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}

  float sigil(vec3 p, float t){
    // 3-fold symmetry, deliberately broken
    for(float i=0.;i<3.;i++){
      float ang=i*2.09440+t*.04;
      vec3 n=vec3(cos(ang),0.,sin(ang));
      float d=dot(p,n);
      if(d<0.) p-=2.*d*n;
    }
    p.y+=.14+sin(t*.17)*.04;
    p.x+=sin(p.y*2.+t*.19)*.07;
    p.xz*=rot2(sin(t*.09)*.12);

    float core=sdSphere(p,.72)+fbm3(p*2.+t*.12)*.11;

    for(float i=0.;i<4.;i++){
      float a=i*1.5708+t*.03+sin(i*1.5+t*.07)*.3;
      vec3 s=vec3(cos(a)*.45,0.,sin(a)*.45);
      core=min(core,sdCapsule(p,s,s+vec3(cos(a),0.,sin(a))*.55,.032+sin(t+i)*.01));
    }

    vec3 tp=p; tp.xz*=rot2(t*.07); tp.y+=sin(t*.13)*.1;
    float torus=abs(sdTorus(tp,vec2(1.15,.014)))-.005;

    for(float i=0.;i<6.;i++){
      float a=i*1.0472+t*.035+sin(i*2.3+t*.05)*.4;
      vec3 np=vec3(cos(a)*.95,sin(a*1.7)*.09,sin(a)*.95);
      core=min(core,sdSphere(p-np,.038+sin(i+t)*.014));
    }
    return min(core,torus);
  }

  float sceneSDF(vec3 p){
    float s=sigil(p,uTime);
    s+=fbm3(p*3.+uTime)*.28*smoothstep(.78,.96,uState);
    return s;
  }

  vec3 calcNormal(vec3 p){
    const float e=.001;
    return normalize(vec3(
      sceneSDF(p+vec3(e,0,0))-sceneSDF(p-vec3(e,0,0)),
      sceneSDF(p+vec3(0,e,0))-sceneSDF(p-vec3(0,e,0)),
      sceneSDF(p+vec3(0,0,e))-sceneSDF(p-vec3(0,0,e))
    ));
  }

  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}

  void main(){
    // Camera inside the box — ray from camera to fragment world position
    vec3 ro = cameraPosition;
    vec3 rd = normalize(vWorldPos - cameraPosition);

    // Screen UV for textures/post (from gl_FragCoord)
    vec2 uv = gl_FragCoord.xy / uRes;

    // Background
    float bgGrad=1.-dot(uv-.5,uv-.5)*1.4;
    vec3 col=mix(uVoid,uDeep,clamp(bgGrad,0.,1.));

    // GPGPU bleed into background
    vec4 gpSample=texture2D(uGpgpu,uv);
    float arrive=smoothstep(0.,.45,uState);
    col+=gpSample.rgb*.22*smoothstep(.05,.5,uState);

    // Raymarch
    float dist=0.;float hit=-1.;
    for(int i=0;i<96;i++){
      vec3 p=ro+rd*dist;
      float h=sceneSDF(p);
      if(h<.001){hit=dist;break;}
      if(dist>20.) break;
      dist+=h*.72;
    }

    if(hit>0.){
      vec3 p=ro+rd*hit;
      vec3 n=calcNormal(p);
      float hold=smoothstep(.45,.65,uState)*smoothstep(1.,.68,uState);
      float diff=max(0.,dot(n,normalize(vec3(1.8,2.5,3.))));
      float diff2=max(0.,dot(n,normalize(vec3(-1.5,-.8,2.))))*.2;
      float rim=pow(1.-max(0.,dot(n,-rd)),4.);
      vec2 surfUV=mod(uv*.25+.5+uTime*.006,1.);
      float gpuBleed=texture2D(uGpgpu,surfUV).r;
      vec3 surfCol=mix(uDeep,uBone,diff*.85+rim*.55+diff2);
      surfCol=mix(surfCol,uPale,rim*.28*hold);
      surfCol=mix(surfCol,uBone,gpuBleed*.18*hold);
      float clarity=smoothstep(.48,.56,uState)*smoothstep(.74,.64,uState);
      surfCol=mix(surfCol,uPale,clarity*.12);
      float leave=smoothstep(.78,1.,uState);
      surfCol*=arrive*(1.-leave);
      col=surfCol;
    }

    // Post
    float ca=length(uv-.5)*.006;
    col.r+=texture2D(uGpgpu,uv+vec2(ca,0.)).r*.06*arrive;
    col.b+=texture2D(uGpgpu,uv-vec2(ca,0.)).b*.06*arrive;
    float vig=1.-dot(uv-.5,uv-.5)*1.8;
    col*=smoothstep(0.,1.,vig);
    col+=hash(uv+fract(uTime*.73))*.04-.02;
    float lum=dot(col,vec3(.299,.587,.114));
    col=mix(col,vec3(lum*1.04+.015),.12);

    gl_FragColor=vec4(clamp(col,0.,1.),1.);
  }
`;

// ─── Post quad just composites scene RT to screen ────────────────────────────
const postVert = /* glsl */`varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position,1.0);}`;
const postFrag = /* glsl */`
  precision highp float;
  uniform sampler2D uScene;
  varying vec2 vUv;
  void main(){ gl_FragColor = texture2D(uScene, vUv); }
`;

// ─── Inner Component ─────────────────────────────────────────────────────────
function Inner() {
  const { gl, size, camera } = useThree();

  // GPGPU ping-pong
  const pingRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const pongRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const gpgpuMeshRef = useRef<THREE.Mesh>(null!);
  const gpgpuMatRef  = useRef<THREE.ShaderMaterial>(null!);
  const gpgpuCam = useMemo(() => new THREE.OrthographicCamera(-1,1,1,-1,0,1), []);

  // SDF mesh (box, camera inside at z=3.8 looking through it)
  const sdfMeshRef = useRef<THREE.Mesh>(null!);
  const sdfMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: sdfVert,
    fragmentShader: sdfFrag,
    uniforms: {
      uTime:  { value: 0 },
      uState: { value: 0 },
      uRes:   { value: new THREE.Vector2(size.width, size.height) },
      uGpgpu: { value: null },
      uBone:  { value: BONE },
      uPale:  { value: PALE },
      uDeep:  { value: DEEP },
      uVoid:  { value: VOID_COL },
    },
    side: THREE.BackSide, // camera is inside the box
  }), []); // eslint-disable-line

  // Scene RT + post quad
  const sceneRT = useMemo(() => new THREE.WebGLRenderTarget(size.width, size.height, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
  }), [size]);

  const postMeshRef = useRef<THREE.Mesh>(null!);
  const postMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: postVert,
    fragmentShader: postFrag,
    uniforms: { uScene: { value: null } },
  }), []);
  const postCam = useMemo(() => new THREE.OrthographicCamera(-1,1,1,-1,0,1), []);

  // Init GPGPU targets
  useEffect(() => {
    const opts = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
    };
    pingRef.current = new THREE.WebGLRenderTarget(512, 512, opts);
    pongRef.current = new THREE.WebGLRenderTarget(512, 512, opts);
    return () => { pingRef.current?.dispose(); pongRef.current?.dispose(); sceneRT.dispose(); };
  }, []); // eslint-disable-line

  // Resize
  useEffect(() => {
    sdfMat.uniforms.uRes.value.set(size.width, size.height);
    sceneRT.setSize(size.width, size.height);
  }, [size, sdfMat, sceneRT]);

  const CYCLE = 60;
  function ss(e0: number, e1: number, x: number) {
    const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  }

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const ct = t % CYCLE;
    let state = 0;
    if (ct < 20)      state = ss(0,20,ct)*0.5;
    else if (ct < 30) state = 0.5 + ss(20,30,ct)*0.15;
    else if (ct < 50) state = 0.65 + ss(30,50,ct)*0.25;
    else              state = 0.9 * ss(60,50,ct);

    const ping = pingRef.current;
    const pong = pongRef.current;
    if (ping && pong) {
      // GPGPU step → write to ping
      const mat = gpgpuMatRef.current;
      mat.uniforms.uTime.value  = t;
      mat.uniforms.uState.value = state;
      mat.uniforms.uPrev.value  = pong.texture;
      gl.setRenderTarget(ping);
      gl.render(gpgpuMeshRef.current, gpgpuCam);
      gl.setRenderTarget(null);
      // swap
      pingRef.current = pong;
      pongRef.current = ping;
    }

    // Update SDF uniforms
    sdfMat.uniforms.uTime.value  = t;
    sdfMat.uniforms.uState.value = state;
    sdfMat.uniforms.uGpgpu.value = pingRef.current?.texture ?? null;

    // Render SDF scene to RT
    gl.setRenderTarget(sceneRT);
    gl.clear();
    gl.render(sdfMeshRef.current, camera);
    gl.setRenderTarget(null);

    // Post to screen
    postMat.uniforms.uScene.value = sceneRT.texture;
    gl.render(postMeshRef.current, postCam);
  }, 0);

  return (
    <>
      {/* SDF box — camera at z=3.8 shoots into BackSide */}
      <mesh ref={sdfMeshRef} material={sdfMat}>
        <boxGeometry args={[10, 10, 10]} />
      </mesh>

      {/* GPGPU quad — invisible, rendered imperatively */}
      <mesh ref={gpgpuMeshRef} visible={false}>
        <planeGeometry args={[2, 2]} />
        <shaderMaterial
          ref={gpgpuMatRef}
          vertexShader={gpgpuVert}
          fragmentShader={gpgpuFrag}
          uniforms={{
            uPrev:  { value: null },
            uTime:  { value: 0 },
            uState: { value: 0 },
          }}
        />
      </mesh>

      {/* Post quad — rendered imperatively to screen */}
      <mesh ref={postMeshRef} material={postMat}>
        <planeGeometry args={[2, 2]} />
      </mesh>
    </>
  );
}

// ─── Export ──────────────────────────────────────────────────────────────────
export default function AlphabetOfHunger() {
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
