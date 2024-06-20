import React, { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { Canvas, extend, useFrame, useThree } from "@react-three/fiber";
import {
  IcosahedronGeometry,
  DirectionalLight,
  AmbientLight,
  MeshStandardMaterial,
  LinearFilter,
  Vector2,
} from "three";

import vertexPars from "../shaders/warpedBall/vertex_pars.glsl";
import vertexMain from "../shaders/warpedBall/vertex_main.glsl";
import fragmentPars from "../shaders/warpedBall/fragment_pars.glsl";
import fragmentMain from "../shaders/warpedBall/fragment_main.glsl";
import { OrbitControls, Sky } from "@react-three/drei";
import { throttle } from "lodash";
import { lerp } from "@/utilities";

interface WarpedBallProps {
  pointer: any;
}

const WarpedBall: React.FC<WarpedBallProps> = ({ pointer }) => {
  const icoRef = useRef<THREE.Mesh>();

  useEffect(() => {
    const material = new MeshStandardMaterial({
      color: 0x00adfd,
      emissive: 0x00adfd,
      roughness: 0.2,
    });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      // Append custom shader code
      shader.vertexShader = shader.vertexShader.replace(
        "#include <displacementmap_pars_vertex>",
        `#include <displacementmap_pars_vertex>\n${vertexPars}`
      );
      shader.vertexShader = shader.vertexShader.replace(
        "#include <displacementmap_vertex>",
        `#include <displacementmap_vertex>\n${vertexMain}`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <bumpmap_pars_fragment>",
        `#include <bumpmap_pars_fragment>\n${fragmentPars}`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>\n${fragmentMain}`
      );
      material.userData.shader = shader;
    };
    if (!icoRef.current) return;
    icoRef.current.material = material;
  }, []);

  const updateRotation = throttle((x, y) => {
    if (icoRef.current) {
      icoRef.current.rotation.y = lerp(icoRef.current.rotation.y, x * 2, 0.1);
      icoRef.current.rotation.x = lerp(icoRef.current.rotation.x, y * -2, 0.1);
    }
  }, 10);

  useFrame(({ clock }) => {
    if (!icoRef.current) return;
    //@ts-ignore
    const shader = icoRef.current.material.userData.shader;
    if (shader) {
      shader.uniforms.uTime.value = clock.getElapsedTime() / 30;
    }
    updateRotation(pointer.x, pointer.y);
  });

  return (
    <>
      <mesh
        position={[-1, 0, -10]}
        //@ts-ignore
        ref={icoRef}
        geometry={new IcosahedronGeometry(2, 250)}
        scale={2}
      />
      ;
    </>
  );
};

export default WarpedBall;
