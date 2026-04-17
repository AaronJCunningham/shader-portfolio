'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'

const PARTICLE_COUNT = 20000
const CYCLE_DURATION = 20.0

// Two half-sigils — left and right offset by BREAK on X
const BREAK = 0.22
const LEFT: [number, number][] = [[0, 1.1], [-0.65, 0.4], [-1.0, -0.1], [-0.55, -0.55], [0, -0.9]]
const RIGHT: [number, number][] = LEFT.map(([x, y]) => [x + BREAK, y] as [number, number])
const NODES: [number, number][] = [...LEFT, ...RIGHT]
const NODE_COUNT = NODES.length

const SIGIL_EDGES: [number, number][] = [
  [0, 1], [0, 2], [0, 4],
  [5, 6], [5, 7], [5, 9],
  [1, 3], [6, 8],
  [2, 3], [7, 8],
]

// Flatten node positions for shader uniforms: [x0,y0, x1,y1, ...]
const NODE_POS_DATA = new Float32Array(NODES.flatMap(([x, y]) => [x, y]))

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uNodes[${NODE_COUNT}];
  attribute float aSeed;
  attribute float aNode;
  attribute float aPhase;
  varying float vBright;
  varying float vNode;

  void main() {
    float t = mod(uTime * 0.85 + aPhase * ${CYCLE_DURATION.toFixed(1)}, ${CYCLE_DURATION.toFixed(1)});
    float cycleT = t / ${CYCLE_DURATION.toFixed(1)};

    float form = smoothstep(0.0, 0.45, cycleT);
    float dissolve = smoothstep(0.65, 1.0, cycleT);

    // Target node position
    int nid = int(mod(aNode * ${NODE_COUNT}.0, ${NODE_COUNT}.0));
    vec2 nodePos = uNodes[nid];

    // Start position: wide disc scatter
    float angle = aSeed * 6.2832;
    float rad = 3.5 + aSeed * 2.5;
    vec3 startPos = vec3(cos(angle) * rad, sin(angle) * rad, (aSeed - 0.5) * 0.5);

    // Target with tiny jitter
    float jx = (fract(aSeed * 43.1) - 0.5) * 0.1;
    float jy = (fract(aSeed * 97.3) - 0.5) * 0.1;
    vec3 target = vec3(nodePos.x + jx, nodePos.y + jy, 0.0);

    // Form from scatter into sigil, then dissolve back out
    float formStr = form * (1.0 - dissolve * dissolve);
    vec3 pos = mix(startPos, target, formStr);

    // Permanent gentle drift
    pos.x += sin(uTime * 0.35 + aSeed * 8.1) * 0.05;
    pos.y += cos(uTime * 0.28 + aSeed * 5.9) * 0.05;

    // Breath at form peak
    float breath = sin(uTime * 1.2 + aSeed * 6.28) * 0.03;
    pos.x += breath;
    pos.y += breath * 0.8;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    float proxToNode = 1.0 - clamp(length(pos - target) * 4.0, 0.0, 1.0);
    vBright = mix(0.35, 1.0, proxToNode) * (1.0 - dissolve * 0.92);
    vNode = aNode;

    float ptSize = (2.5 + sin(uTime * 1.0 + aSeed * 3.14) * 0.5) * (300.0 / -mv.z);
    gl_PointSize = ptSize;
  }
`

const fragmentShader = /* glsl */ `
  varying float vBright;
  varying float vNode;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float alpha = smoothstep(0.5, 0.05, d);
    if (alpha < 0.01) discard;

    // Color clusters by node assignment
    float ni = fract(vNode * 7.3);

    vec3 cv = vec3(0.50, 0.04, 0.88);  // #800fe0 violet
    vec3 cm = vec3(0.92, 0.08, 0.72);  // #eb14b8 magenta
    vec3 cc = vec3(0.04, 0.88, 1.00); // #0ee0ff cyan
    vec3 cw = vec3(1.00, 0.96, 1.00); // white

    vec3 col;
    if (ni < 0.33) {
      col = mix(cv, cm, ni / 0.33);
    } else if (ni < 0.66) {
      col = mix(cm, cc, (ni - 0.33) / 0.33);
    } else {
      col = mix(cc, cw, (ni - 0.66) / 0.34);
    }

    gl_FragColor = vec4(col * vBright, alpha * vBright);
  }
`

function SigilLine({ from, to }: { from: [number, number]; to: [number, number] }) {
  const line = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      from[0], from[1], 0,
      to[0], to[1], 0,
    ]), 3))
    const mat = new THREE.LineBasicMaterial({ color: '#c44dff', transparent: true, opacity: 0.18 })
    return new THREE.Line(geo, mat)
  }, [from, to])
  return <primitive object={line} />
}

function SigilNode({ pos }: { pos: [number, number] }) {
  return (
    <mesh position={[pos[0], pos[1], 0]}>
      <sphereGeometry args={[0.035, 8, 8]} />
      <meshBasicMaterial color="#ff99ff" />
    </mesh>
  )
}

function ParticleField() {
  const matRef = useRef<THREE.ShaderMaterial>(null)

  const { pos, seed, node, phase } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3)
    const seed = new Float32Array(PARTICLE_COUNT)
    const node = new Float32Array(PARTICLE_COUNT)
    const phase = new Float32Array(PARTICLE_COUNT)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const r = 3.5 + Math.random() * 2.5
      const theta = Math.random() * Math.PI * 2
      pos[i * 3] = Math.cos(theta) * r
      pos[i * 3 + 1] = Math.sin(theta) * r
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.5
      seed[i] = Math.random()
      node[i] = Math.random()
      phase[i] = Math.random()
    }
    return { pos, seed, node, phase }
  }, [])

  // Build node uniform array
  const nodeUniforms = useMemo(() => {
    const arr: THREE.Vector2[] = []
    for (let i = 0; i < NODE_COUNT; i++) {
      arr.push(new THREE.Vector2(NODES[i][0], NODES[i][1]))
    }
    return arr
  }, [])

  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = clock.getElapsedTime()
    }
  })

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={pos} count={PARTICLE_COUNT} itemSize={3} />
        <bufferAttribute attach="attributes-aSeed" array={seed} count={PARTICLE_COUNT} itemSize={1} />
        <bufferAttribute attach="attributes-aNode" array={node} count={PARTICLE_COUNT} itemSize={1} />
        <bufferAttribute attach="attributes-aPhase" array={phase} count={PARTICLE_COUNT} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{ uTime: { value: 0 }, uNodes: { value: nodeUniforms } }}
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
      <color attach="background" args={['#020006']} />
      {SIGIL_EDGES.map(([a, b], i) => (
        <SigilLine key={i} from={NODES[a]} to={NODES[b]} />
      ))}
      {NODES.map((n, i) => <SigilNode key={i} pos={n} />)}
      <ParticleField />
      <EffectComposer>
        <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.25} intensity={1.6} radius={0.7} />
      </EffectComposer>
    </>
  )
}

export default function ThresholdSigil() {
  return (
    <Canvas camera={{ position: [0, 0, 3.2], fov: 52 }} gl={{ antialias: false, alpha: false }} dpr={[1, 1.5]}>
      <Scene />
    </Canvas>
  )
}
