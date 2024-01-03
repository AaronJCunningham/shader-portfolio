import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from 'three';
import { Environment } from '@react-three/drei';

import vertexShader from "./shaders/displexRing/vertex"
import fragmentShader from "./shaders/displexRing/fragment"

const SceneTwo = () => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const { size } = useThree();



  useFrame(({ clock }, delta) => {
    
    const time = clock.getElapsedTime();
    
    if (shaderRef.current) {
      console.log(time)
      shaderRef.current.uniforms.uTime.value += time
      // shaderRef.current.parent[0].rotation.x = Math.sin(delta)
    }
    if(meshRef.current){
      // meshRef.current.rotation.y += 0.2
    }
  });

  return (
    <>
      <mesh ref={meshRef} position={[0, 0, -9]} scale={5}>
        <torusGeometry args={[1, 0.3, 100, 100]} />
        <shaderMaterial ref={shaderRef} 
        uniforms={{
            uTime: { value: 0 },
            uResolution: { value: new THREE.Vector2(size.width, size.height) },
            uDisplace: { value: 2 },
            uSpread: { value: 1.2 },
            uNoise: { value: 16 },
          }}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}/>
      </mesh>
      <Environment preset='city' />
    </>
  );
};

export default SceneTwo;
