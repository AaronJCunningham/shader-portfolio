import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import Particles from "../../src/components/threejscomponents/particles/Particles";
import dynamic from "next/dynamic";
import { OrbitControls, Stars } from "@react-three/drei";

// const Particles = dynamic(
//   () => import("../../src/components/threejscomponents/particles/Particles"),
//   {
//     ssr: false,
//   }
// );

const Page = () => {
  const meshRef = useRef();

  const canvasStyles = {
    width: "100vw",
    height: "100vh",
  };

  return (
    <div style={canvasStyles}>
      <Canvas>
        <Stars />
        <ambientLight />
        <OrbitControls />
        <Particles />
      </Canvas>
    </div>
  );
};

export default Page;
