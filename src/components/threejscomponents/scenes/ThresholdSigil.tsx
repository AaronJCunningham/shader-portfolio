'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'

const PARTICLE_COUNT = 40000
const ATOM_COUNT = 16
const CYCLE_DURATION = 18.0

// Broken axis sigil atoms — two half-sigils with offset
const ATOMS = [
  // left half (atoms 0–7)
  { x: -0.9, y: 0.6, z: 0 },
  { x: -1.2, y: 0.1, z: 0 },
  { x: -0.7, y: -0.4, z: 0 },
  { x: -1.1, y: -0.7, z: 0 },
  { x: -0.4, y: 0.85, z: 0 },
  { x: -1.5, y: -0.2, z: 0 },
  { x: -0.6, y: -1.0, z: 0 },
  { x: -1.3, y: 0.5, z: 0 },
  // right half — same relative shape, shifted X by AXIS_BREAK (0.22)
  { x: -0.9 + 0.22, y: 0.6, z: 0 },
  { x: -1.2 + 0.22, y: 0.1, z: 0 },
  { x: -0.7 + 0.22, y: -0.4, z: 0 },
  { x: -1.1 + 0.22, y: -0.7, z: 0 },
  { x: -0.4 + 0.22, y: 0.85, z: 0 },
  { x: -1.5 + 0.22, y: -0.2, z: 0 },
  { x: -0.6 + 0.22, y: -1.0, z: 0 },
  { x: -1.3 + 0.22, y: 0.5, z: 0 },
]

const AXIS_BREAK = 0.22

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uCyclePos;
  attribute float aSeed;
  attribute float aSpeed;
  attribute float aOffset;
  varying float vProgress;
  varying float vAlpha;

  void main() {
    float t = mod(uTime * aSpeed + aOffset, CYCLE_DURATION);
    float cycleT = t / CYCLE_DURATION;
    float breath = sin(uCyclePos * 3.14159) * 0.5 + 0.5;

    // chaos stage: scatter
    vec3 pos = position * (1.8 + sin(aSeed * 7.3) * 0.6);

    // attractor: pull toward atom based on seed
    int atomIdx = int(mod(aSeed * float(ATOM_COUNT), float(ATOM_COUNT)));
    vec3 atom = vec3(ATOMS[atomIdx].x, ATOMS[atomIdx].y, 0.0);

    // pull toward atom — stronger in mid cycle
    float pullStrength = smoothstep(0.1, 0.5, cycleT) * (1.0 - smoothstep(0.85, 1.0, cycleT));
    pos = mix(pos, atom * (1.5 + breath * 0.3), pullStrength * 0.85);

    // drift
    pos.x += sin(uTime * 0.3 + aSeed * 12.7) * 0.12;
    pos.y += cos(uTime * 0.2 + aSeed * 9.1) * 0.12;
    pos.z += sin(uTime * 0.25 + aSeed * 5.5) * 0.08;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = (2.5 + breath * 2.0) * (300.0 / -mvPosition.z);

    // progress drives color
    vProgress = smoothstep(0.0, 0.3, cycleT) * (1.0 - smoothstep(0.8, 1.0, cycleT));
    vAlpha = 0.75 + vProgress * 0.25;
  }
`

const fragmentShader = /* glsl */ `
  varying float vProgress;
  varying float vAlpha;

  void main() {
    float dist = length(gl_PointCoord - 0.5);
    float alpha = smoothstep(0.5, 0.0, dist) * vAlpha;
    if (alpha < 0.01) discard;

    vec3 c1 = vec3(0.220, 0.020, 0.360); // #380534 — visible dark violet
    vec3 c2 = vec3(0.520, 0.040, 0.520); // #850a85 — richer purple
    vec3 c3 = vec3(0.769, 0.302, 1.0);   // #c44dff
    vec3 c4 = vec3(1.0, 0.6, 1.0);        // #ff99ff
    vec3 c5 = vec3(1.0, 1.0, 1.0);        // #ffffff

    vec3 color;
    if (vProgress < 0.3) {
      color = mix(c1, c2, vProgress / 0.3);
    } else if (vProgress < 0.6) {
      color = mix(c2, c3, (vProgress - 0.3) / 0.3);
    } else if (vProgress < 0.85) {
      color = mix(c3, c4, (vProgress - 0.6) / 0.25);
    } else {
      color = mix(c4, c5, (vProgress - 0.85) / 0.15);
    }

    gl_FragColor = vec4(color, alpha);
  }
`

function ParticleField() {
  const pointsRef = useRef<THREE.Points>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const { positions, seeds, speeds, offsets } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const seeds = new Float32Array(PARTICLE_COUNT)
    const speeds = new Float32Array(PARTICLE_COUNT)
    const offsets = new Float32Array(PARTICLE_COUNT)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const r = Math.random() * 8
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)
      seeds[i] = Math.random()
      speeds[i] = 0.6 + Math.random() * 0.8
      offsets[i] = Math.random() * CYCLE_DURATION
    }

    return { positions, seeds, speeds, offsets }
  }, [])

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime()
      const t = clock.getElapsedTime()
      materialRef.current.uniforms.uCyclePos.value = (t % CYCLE_DURATION) / CYCLE_DURATION
    }
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={PARTICLE_COUNT}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aSeed"
          array={seeds}
          count={PARTICLE_COUNT}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aSpeed"
          array={speeds}
          count={PARTICLE_COUNT}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aOffset"
          array={offsets}
          count={PARTICLE_COUNT}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uCyclePos: { value: 0 },
        }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

function Scene() {
  return (
    <>
      <color attach="background" args={['#050010']} />
      <ParticleField />
      <EffectComposer>
        <Bloom luminanceThreshold={0.3} intensity={1.4} radius={0.8} />
      </EffectComposer>
    </>
  )
}

export default function ThresholdSigil() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 60 }}
      gl={{ antialias: false, alpha: false }}
      dpr={[1, 1.5]}
    >
      <Scene />
    </Canvas>
  )
}