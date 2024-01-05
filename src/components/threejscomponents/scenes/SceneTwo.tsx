import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from "@react-three/fiber";
import { Environment } from '@react-three/drei';

const SceneTwo = () => {
  const meshRef1 = useRef(null);
  const meshRef2 = useRef(null);
  const meshRef3 = useRef(null);
  const { size } = useThree();

  // Define initial velocities
  const velocity1 = useRef({ x: 0.01, y: 0.01 });
  const velocity2 = useRef({ x: 0.015, y: -0.01 });
  const velocity3 = useRef({ x: -0.01, y: 0.015 });

  useFrame(() => {
    [meshRef1, meshRef2, meshRef3].forEach((ref, index) => {
      if (ref.current) {
        const velocity = [velocity1, velocity2, velocity3][index].current;

        // Update positions
        ref.current.position.x += velocity.x;
        ref.current.position.y += velocity.y;

        // Bounce off the edges
        if (ref.current.position.x > size.width / 500 || ref.current.position.x < -size.width / 500) {
          velocity.x = -velocity.x;
        }
        if (ref.current.position.y > size.height / 500 || ref.current.position.y < -size.height / 500) {
          velocity.y = -velocity.y;
        }

        // Rotation
        ref.current.rotation.x += 0.02;
        ref.current.rotation.y += 0.01;
      }
    });
  });

  return (
    <>
      <mesh ref={meshRef1} position={[0, 1, -9]} scale={1}>
        <torusKnotGeometry args={[1, 0.3, 100, 100]} />
        <meshNormalMaterial />
      </mesh>
      <Environment preset='city' />
      <mesh ref={meshRef2} position={[-2, 0, -9]} scale={1}>
        <torusKnotGeometry args={[1, 0.3, 100, 100]} />
        <meshNormalMaterial />
      </mesh>
      <Environment preset='city' />
      <mesh ref={meshRef3} position={[2, -1, -9]} scale={1}>
        <torusKnotGeometry args={[1, 0.3, 100, 100]} />
        <meshNormalMaterial />
      </mesh>
      <Environment preset='city' />
    </>
  );
};

export default SceneTwo;
