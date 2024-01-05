import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from 'three';
import { Environment, MeshDistortMaterial } from '@react-three/drei';

import vertexShader from "../shaders/displexRing/vertex"
import fragmentShader from "../shaders/displexRing/fragment"

const SceneThree = () => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const { size, clock,  } = useThree();



  const animate = () => {
    
    const time = clock.getElapsedTime();

    if(meshRef.current){
      meshRef.current.rotation.y += 0.005
    }
    
    requestAnimationFrame(animate);
  };

useEffect(() =>{
  animate()
},[])

  return (
    <>
      <mesh ref={meshRef} position={[0, 0, -9]} scale={1}>
        <sphereGeometry args={[2, 15, 100, 100]} />
        <meshNormalMaterial wireframe={true}/>
      </mesh>
      <Environment preset='city' />
    </>
  );
};

export default SceneThree;
