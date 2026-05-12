import React, { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import vertexShader from "../shaders/metaballs/vertex.glsl.js";
import fragmentShader from "../shaders/metaballs/fragment.glsl.js";

const TRAIL_LENGTH = 15;

const SceneTwoLiquid = ({ pointer }: any) => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  const { size, viewport } = useThree();

  const pointerTrail = useMemo(
    () =>
      Array.from({ length: TRAIL_LENGTH }, () => new THREE.Vector2(0.0, 0.0)),
    []
  );

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0.0 },
      uResolution: {
        value: new THREE.Vector2(
          size.width * viewport.dpr,
          size.height * viewport.dpr
        ),
      },
      uPointerTrail: { value: pointerTrail },
    }),
    []
  );

  useFrame((state) => {
    if (!shaderRef.current) return;

    // Shift trail: each position follows the one before it
    for (let i = TRAIL_LENGTH - 1; i > 0; i--) {
      pointerTrail[i].copy(pointerTrail[i - 1]);
    }
    // Head tracks mouse with slight smoothing
    pointerTrail[0].lerp(
      new THREE.Vector2(pointer.x, pointer.y),
      0.45
    );

    // Update uniforms
    shaderRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    shaderRef.current.uniforms.uResolution.value.set(
      state.size.width * state.viewport.dpr,
      state.size.height * state.viewport.dpr
    );
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={shaderRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
};

export default SceneTwoLiquid;
