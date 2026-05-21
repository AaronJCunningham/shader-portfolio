import * as THREE from "three";
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";

import vertexShader from "../shaders/nebula/vertex.glsl.js";
import fragmentShader from "../shaders/nebula/fragment.glsl.js";

interface SceneNebulaProps {
  pointer: { x: number; y: number };
}

export default function SceneNebula({ pointer }: SceneNebulaProps) {
  const meshRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const particleCount = 14000;

  const { positions, basePos, phases, seeds } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const base = new Float32Array(particleCount * 3);
    const ph = new Float32Array(particleCount * 3);
    const sd = new Float32Array(particleCount);

    // Gaussian-ish 3D blob via central-limit (sum of 3 uniforms)
    for (let i = 0; i < particleCount; i++) {
      const gx = (Math.random() + Math.random() + Math.random() - 1.5) * 1.6;
      const gy = (Math.random() + Math.random() + Math.random() - 1.5) * 1.1;
      const gz = (Math.random() + Math.random() + Math.random() - 1.5) * 1.6;

      base[i * 3] = gx;
      base[i * 3 + 1] = gy;
      base[i * 3 + 2] = gz;

      ph[i * 3] = Math.random() * 6.28318;
      ph[i * 3 + 1] = Math.random() * 6.28318;
      ph[i * 3 + 2] = Math.random() * 6.28318;
      sd[i] = Math.random();
    }

    return { positions: pos, basePos: base, phases: ph, seeds: sd };
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(0, 0) },
    }),
    []
  );

  useFrame(({ clock }) => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
    materialRef.current.uniforms.uPointer.value.set(pointer.x, pointer.y);
  });

  return (
    <>
      <color attach="background" args={["#000000"]} />
      <points ref={meshRef} position={[0, 0, -8]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aBasePos"
            count={particleCount}
            array={basePos}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aPhase"
            count={particleCount}
            array={phases}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aSeed"
            count={particleCount}
            array={seeds}
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
