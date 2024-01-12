import * as THREE from "three"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Outlines, Environment, useTexture } from "@react-three/drei"
import { Physics, useSphere } from "@react-three/cannon"
import { EffectComposer, N8AO, SMAA } from "@react-three/postprocessing"
import { useRef } from "react"
// import { useControls } from "leva"

const rfs = THREE.MathUtils.randFloatSpread
const sphereGeometry = new THREE.SphereGeometry(1, 32, 32)
const baubleMaterial = new THREE.MeshNormalMaterial()

export const SceneTwo = ({pointer}) =>{

return (
 
  
  <>
    <ambientLight intensity={0.5} />
    <color attach="background" args={["#ff22ff"]} />
    <spotLight intensity={1} angle={0.2} penumbra={1} position={[30, 30, 30]} castShadow shadow-mapSize={[512, 512]} />
    <Physics gravity={[0, 2, 0]} iterations={10}>
      <Pointer pointer={pointer} />
      <Clump />
    </Physics>
    <Environment files="/images/adamsbridge.hdr" />
    </> 
 
)}

function Clump({ mat = new THREE.Matrix4(), vec = new THREE.Vector3(), ...props }) {
  // const { outlines } = useControls({ outlines: { value: 0.0, step: 0.01, min: 0, max: 0.05 } })
  // const texture = useTexture("/images/cross.jpg")
  const [ref, api] = useSphere(() => ({ args: [1], mass: 1, angularDamping: 0.1, linearDamping: 0.65, position: [rfs(20), rfs(20), rfs(20) -9 ] }))
  useFrame((state) => {
    for (let i = 0; i < 40; i++) {
      // Get current whereabouts of the instanced sphere
      ref.current.getMatrixAt(i, mat)
      // Normalize the position and multiply by a negative force.
      // This is enough to drive it towards the center-point.
      api.at(i).applyForce(vec.setFromMatrixPosition(mat).normalize().multiplyScalar(-40).toArray(), [0, 0, 0])
    }
  })
  return (
    <instancedMesh ref={ref} castShadow receiveShadow args={[sphereGeometry, baubleMaterial, 40]}  position={[0,-2,-12]}>
      {/* <Outlines thickness={outlines} /> */}
    </instancedMesh>
  )
}

function Pointer({pointer}) {
  const viewport = useThree((state) => state.viewport)
  const [, api] = useSphere(() => ({ type: "Kinematic", args: [3], position: [0, 0, 0] }))
  return useFrame((state) => api.position.set((pointer.x * viewport.width) / 2, (pointer.y * viewport.height) / 2, 0))
}

export default SceneTwo