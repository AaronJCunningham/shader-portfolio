import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from 'three';
import { Cloud, Clouds, Environment, MeshDistortMaterial, Sky, Stars } from '@react-three/drei';

import vertexShader from "../shaders/displexRing/vertex"
import fragmentShader from "../shaders/displexRing/fragment"

import {Dragon }from "../meshes/Dragon"

const SceneFour = ({pointer}: any) => {
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
    
      <Dragon pointer={pointer}/>
      <color attach="background" args={['#001100']} />
     {/* <Stars /> */}
      <Environment preset='sunset' />
    <spotLight color="red" lookAt={new THREE.Vector3(0,-1,-2.2)} intensity={10}/>
    <spotLight color="blue" lookAt={new THREE.Vector3(0,1,-2.2)} intensity={10}/>
    </>
  );
};

export default SceneFour;
