import {
  Environment,
  OrbitControls,
  Sky,
  Stars,
  useGLTF,
} from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import { PerspectiveCamera } from "three";
import WarpedBall from "../meshes/WarpedBall";

interface SceneOneProps {
  sceneCamera: PerspectiveCamera;
  pointer: any;
}

const SceneOne: React.FC<SceneOneProps> = ({ sceneCamera, pointer }) => {
  const ref = useRef<THREE.Mesh>(null);

  // console.log("scene", nodes)

  useFrame((state, delta) => {
    if (!ref.current) return;
    // ref.current.rotation.x += Math.sin(delta)
    ref.current.rotation.y += Math.sin(delta) * 0.5;
    ref.current.position.y += Math.sin(delta) * 0.02;
  });

  return (
    <>
      <Environment preset="city" background={false} />
      <ambientLight intensity={0.3} />
      <WarpedBall pointer={pointer} />
      <color attach="background" args={["#444444"]} />
    </>
  );
};

export default SceneOne;
