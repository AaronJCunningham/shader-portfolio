import { InstancedMesh, MathUtils, Mesh } from 'three'
import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Instances, Instance, Environment } from '@react-three/drei'

interface BubbleProps {
  factor: number;
  speed: number;
  xFactor: number;
  yFactor: number;
  zFactor: number;
}

interface BubblesProps {
  pointer: { x: number; y: number };
}


const particles = Array.from({ length: 150 }, () => ({
  factor: MathUtils.randInt(20, 100),
  speed: MathUtils.randFloat(0.01, 0.75),
  xFactor: MathUtils.randFloatSpread(40),
  yFactor: MathUtils.randFloatSpread(10),
  zFactor: MathUtils.randFloatSpread(10)
}))

export default function App({pointer}: any) {
  return (
 <>
      <color attach="background" args={['#2f0f88']} />
      <fog attach="fog" args={['#ff22ff', 20, -5]} />
      <ambientLight intensity={1.5} />
      <pointLight position={[10, 10, 10]} intensity={1} castShadow />
      <Bubbles pointer={pointer}/>
    
      <Environment preset="city" />
      </>
  )
}

function Bubbles({pointer}: BubblesProps) {
  const ref = useRef<any>(null);
  useFrame((state, delta) =>  {
    if(!ref.current)return;
    ref.current.rotation.y = MathUtils.damp(ref.current.rotation.y, (pointer.x * Math.PI) / 3, 2.75, delta);
    ref.current.rotation.x = MathUtils.damp(ref.current.rotation.x, (-pointer.y * Math.PI) / 3, 2.75, delta);
  
  })
  return (
    <Instances limit={particles.length} ref={ref} castShadow receiveShadow position={[0, 2.5, -15]}>
      <torusKnotGeometry args={[1, 0.35, 100, 16]} />
      <meshNormalMaterial />
      {particles.map((data, i) => (
        <Bubble key={i} {...data} />
      ))}
    </Instances>
  )
}

function Bubble({ factor, speed, xFactor, yFactor, zFactor }: BubbleProps) {
  const ref = useRef<Mesh>()
  useFrame((state, delta) => {
    if(!ref.current) return;
    const t = factor + state.clock.elapsedTime * (speed / 2)
    ref.current.scale.setScalar(Math.max(0.5, Math.cos(t) * 1))
    ref.current.position.set(
      Math.cos(t) + Math.sin(t * 1) / 10 + xFactor + Math.cos((t / 10) * factor) + (Math.sin(t * 1) * factor) / 10,
      Math.sin(t) + Math.cos(t * 2) / 10 + yFactor + Math.sin((t / 10) * factor) + (Math.cos(t * 2) * factor) / 10,
      Math.sin(t) + Math.cos(t * 2) / 10 + zFactor + Math.cos((t / 10) * factor) + (Math.sin(t * 3) * factor) / -10
    )
    ref.current.rotation.y = Math.sin(delta)
    ref.current.rotation.x = Math.sin(delta)
  })
  return <Instance ref={ref} />
}
