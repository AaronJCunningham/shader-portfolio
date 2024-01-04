import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from 'three';
import { Environment, MeshDistortMaterial } from '@react-three/drei';

import vertexShader from "./shaders/displexRing/vertex"
import fragmentShader from "./shaders/displexRing/fragment"

const SceneTwo = () => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const { size, clock,  } = useThree();



  const animate = () => {
    
    const time = clock.getElapsedTime();
    
    if (shaderRef.current) {
  
      shaderRef.current.uniforms.uDisplace.value = time
      // shaderRef.current.parent[0].rotation.x = Math.sin(delta)
    }
    if(meshRef.current){
      // meshRef.current.rotation.y += 0.2
    }
    
    requestAnimationFrame(animate);
  };

useEffect(() =>{
  animate()
},[])

  return (
    <>
      <mesh ref={meshRef} position={[0, 0, -9]} scale={1}>
        <torusGeometry args={[1, 0.3, 100, 100]} />
        <MeshDistortMaterial />
      </mesh>
      <Environment preset='city' />
    </>
  );
};

export default SceneTwo;
