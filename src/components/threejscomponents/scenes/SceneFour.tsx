import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from 'three';
import { Environment, MeshDistortMaterial } from '@react-three/drei';

import vertexShader from "../shaders/displexRing/vertex"
import fragmentShader from "../shaders/displexRing/fragment"

const SceneFour = () => {
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
      meshRef.current.rotation.y += 0.2
    }
    
    requestAnimationFrame(animate);
  };

useEffect(() =>{
  animate()
},[])

  return (
    <>
      <mesh ref={meshRef} position={[0, 0, -9]} scale={2}>
        <boxGeometry args={[2, 2]} />
        <meshBasicMaterial color="red" />
      </mesh>
      <mesh ref={meshRef} position={[-4, 0, -9]} scale={2}>
        <boxGeometry args={[2, 2]} />
        <meshBasicMaterial color="red" />
      </mesh>
      <mesh ref={meshRef} position={[4, 0, -9]} scale={2}>
        <boxGeometry args={[2, 2]} />
        <meshBasicMaterial color="red" />
      </mesh>
      <mesh ref={meshRef} position={[-5, 0, -9]} scale={2}>
        <boxGeometry args={[2, 2]} />
        <meshBasicMaterial color="red" />
      </mesh>
      <Environment preset='city' />
    </>
  );
};

export default SceneFour;
