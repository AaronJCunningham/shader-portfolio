import { Environment, OrbitControls, Sky, Stars, useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import { PerspectiveCamera } from "three";
import vertexShader from "./shaders/sceneOne/vertexShader.glsl";
import fragmentShader from "./shaders/sceneOne/fragmentShader.glsl";
import WarpedBall from "./WarpedBall";


interface SceneOneProps {
  sceneCamera: PerspectiveCamera;
pointer: any;
}

const SceneOne: React.FC<SceneOneProps> = ({sceneCamera, pointer}) => {
  const ref = useRef<THREE.Mesh>(null);

  const [hovered, setHovered] = useState(false);

  const {nodes, scene} = useGLTF("/glbs/gyroidBall.glb")



console.log("scene", nodes)

  useFrame((state, delta) => {
  
    if (!ref.current) return;
    // ref.current.rotation.x += Math.sin(delta)
    ref.current.rotation.y += Math.sin(delta) * 0.5
    ref.current.position.y += Math.sin(delta) * 0.02

  });

  return (
    <>
      <OrbitControls camera={sceneCamera} autoRotate/>
      <Environment preset="city" background={false} />
      <WarpedBall pointer={pointer} />
      </>
  );
};

export default SceneOne;
