import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from 'three';
import { Cloud, Clouds, Environment, MeshDistortMaterial, Sky, Stars } from '@react-three/drei';

import vertexShader from "../shaders/displexRing/vertex"
import fragmentShader from "../shaders/displexRing/fragment"

import {Dragon }from "../meshes/Dragon"
import {Island }from "../meshes/Island"
import {Tavern }from "../meshes/Tavern"

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
   
    <Tavern pointer={pointer}/>
      {/* <Dragon pointer={pointer}/> */}
      <color attach="background" args={['#001100']} />
     <Sky distance={100} inclination={-1} sunPosition={[5,5,10]}/>
     <ambientLight intensity={5} />
     
      <Environment preset='park' />
      {/*@ts-ignore */}
    <spotLight color="red" lookAt={new THREE.Vector3(0,-1,-2.2)} intensity={100}/>
    {/*@ts-ignore */}
    <spotLight color="blue" lookAt={new THREE.Vector3(0,1,-2.2)} intensity={10}/>
    </>
  );
};

export default SceneFour;
