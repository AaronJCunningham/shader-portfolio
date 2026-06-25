import * as THREE from "three";
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";

import vertexShader from "../shaders/particleGrid/vertex.glsl.js";
import fragmentShader from "../shaders/particleGrid/fragment.glsl.js";

interface SceneFourProps {
  isLowQuality?: boolean;
  pointer: { x: number; y: number };
}

export default function SceneFourPhysics({
  isLowQuality = false,
  pointer,
}: SceneFourProps) {
  const meshRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const prevPointer = useRef(new THREE.Vector2(0, 0));
  const pointerSpeed = useRef(0);

  const gridSize = isLowQuality ? 95 : 120;
  const spacing = 0.14;
  const particleCount = gridSize * gridSize;

  const { positions, randoms } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const rnd = new Float32Array(particleCount);
    const halfGrid = (gridSize * spacing) / 2;

    for (let ix = 0; ix < gridSize; ix++) {
      for (let iz = 0; iz < gridSize; iz++) {
        const i = ix * gridSize + iz;
        pos[i * 3] = ix * spacing - halfGrid;
        pos[i * 3 + 1] = 0;
        pos[i * 3 + 2] = iz * spacing - halfGrid;
        rnd[i] = Math.random();
      }
    }

    return { positions: pos, randoms: rnd };
  }, [gridSize, particleCount]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uPrevPointer: { value: new THREE.Vector2(0, 0) },
      uPointerSpeed: { value: 0 },
    }),
    []
  );

  useFrame(({ clock }) => {
    if (!materialRef.current) return;

    const dx = pointer.x - prevPointer.current.x;
    const dy = pointer.y - prevPointer.current.y;
    const speed = Math.sqrt(dx * dx + dy * dy);
    pointerSpeed.current += (speed - pointerSpeed.current) * 0.1;

    materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
    materialRef.current.uniforms.uPrevPointer.value.copy(
      materialRef.current.uniforms.uPointer.value
    );
    materialRef.current.uniforms.uPointer.value.set(pointer.x, pointer.y);
    materialRef.current.uniforms.uPointerSpeed.value = pointerSpeed.current;

    prevPointer.current.set(pointer.x, pointer.y);
  });

  return (
    <>
      <color attach="background" args={["#000000"]} />
      <points
        ref={meshRef}
        position={[0, -2, -8]}
        rotation={[-Math.PI * 0.35, 0, 0]}
      >
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aRandom"
            count={particleCount}
            array={randoms}
            itemSize={1}
          />
        </bufferGeometry>
        <shaderMaterial
          ref={materialRef}
          uniforms={uniforms}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </>
  );
}
