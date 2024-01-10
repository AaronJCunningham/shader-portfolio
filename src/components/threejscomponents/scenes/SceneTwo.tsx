import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from "@react-three/fiber";
import { Environment } from '@react-three/drei';
import BallManager from "../ballManger/BallManager"

const SceneTwo = ({pointer}) => {
  // const meshRef1 = useRef<THREE.Mesh>(null);
  // const meshRef2 = useRef<THREE.Mesh>(null);
  // const meshRef3 = useRef<THREE.Mesh>(null);
  // const meshRef4 = useRef<THREE.Mesh>(null);
  // const meshRef5 = useRef<THREE.Mesh>(null);

  // const { size } = useThree();

  // // Define initial velocities
  // const velocity1 = useRef({ x: 0.01, y: 0.01 });
  // const velocity2 = useRef({ x: 0.015, y: -0.01 });
  // const velocity3 = useRef({ x: -0.01, y: 0.015 });
  // const velocity4 = useRef({ x: -0.01, y: 0.015 });
  // const velocity5 = useRef({ x: -0.01, y: 0.015 });

  // useFrame(() => {
  //   [meshRef1, meshRef2, meshRef3, meshRef4, meshRef5].forEach((ref, index) => {
  //     if (ref.current) {
  //       const velocity = [velocity1, velocity2, velocity3, velocity4, velocity5][index].current;

  //       // Update positions
  //       ref.current.position.x += velocity.x;
  //       ref.current.position.y += velocity.y;

  //       // Bounce off the edges
  //       if (ref.current.position.x > size.width / 500 || ref.current.position.x < -size.width / 500) {
  //         velocity.x = -velocity.x;
  //       }
  //       if (ref.current.position.y > size.height / 500 || ref.current.position.y < -size.height / 500) {
  //         velocity.y = -velocity.y;
  //       }

  //       // Rotation
  //       ref.current.rotation.x += 0.02;
  //       ref.current.rotation.y += 0.01;
  //     }
  //   });
  // });

  return (
    <>
      <BallManager pointer={pointer} />
      {/* <fog attach="fog" args={['green', 20, -5]} /> */}
      {/* <color attach="background" args={['#000080']} /> */}
      {/* <Environment preset='city' /> */}
    </>
  );
};

export default SceneTwo;
