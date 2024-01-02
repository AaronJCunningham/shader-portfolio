import React from 'react';
import { useThree } from "@react-three/fiber";
import * as THREE from 'three';

const SceneTwo = () => {
  const { size, viewport } = useThree();
  console.log("size", size, "viewport", viewport);

  // Function to generate random positions
  const generateRandomPositions = () => {
    const positions = [];
    for (let i = 0; i < 30; i++) {
      const theta = Math.random() * 2 * Math.PI; // Random angle
      const radius = Math.random() * 5; // Random radius
      const x = radius * Math.cos(theta);
      const y = radius * Math.sin(theta);
      const z = Math.random() * -20; // Random depth
      positions.push(new THREE.Vector3(x, y, z));
    }
    return positions;
  };

  const positions = generateRandomPositions();

  return (
    <>
      {positions.map((position, index) => (
        <mesh 
          key={index}
          position={position}
          rotation={[Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI - 10]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={'red'} />
        </mesh>
      ))}
    </>
  );
};

export default SceneTwo;
