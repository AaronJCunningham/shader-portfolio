import * as THREE from "three";
import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";

import vertexShader from "../shaders/nebula/vertex.glsl.js";
import fragmentShader from "../shaders/nebula/fragment.glsl.js";

interface SceneNebulaProps {
  isLowQuality?: boolean;
  pointer: { x: number; y: number };
}

export default function SceneNebula({
  isLowQuality = false,
  pointer,
}: SceneNebulaProps) {
  const meshRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const particleCount = isLowQuality ? 2000 : 2000;
  const nebulaDepth = 8;
  const fov = 55;
  const { size } = useThree();
  const aspect = size.width / size.height;
  const visibleHeight =
    2 * Math.tan(THREE.MathUtils.degToRad(fov * 0.5)) * nebulaDepth;
  const visibleWidth = visibleHeight * aspect;

  const { positions, basePos, phases, seeds, large, colorMixes } =
    useMemo(() => {
      const pos = new Float32Array(particleCount * 3);
      const base = new Float32Array(particleCount * 3);
      const ph = new Float32Array(particleCount * 3);
      const sd = new Float32Array(particleCount);
      const largeParticle = new Float32Array(particleCount);
      const colorMix = new Float32Array(particleCount);
      const spreadX = visibleWidth * 0.32;
      const spreadY = visibleHeight * 0.32;
      const spreadZ = Math.max(2.1, visibleHeight * 0.26);

      // Gaussian-ish 3D blob via central-limit (sum of 3 uniforms)
      for (let i = 0; i < particleCount; i++) {
        const gx =
          (Math.random() + Math.random() + Math.random() - 1.5) * spreadX;
        const gy =
          (Math.random() + Math.random() + Math.random() - 1.5) * spreadY;
        const gz =
          (Math.random() + Math.random() + Math.random() - 1.5) * spreadZ;

        base[i * 3] = gx;
        base[i * 3 + 1] = gy;
        base[i * 3 + 2] = gz;

        ph[i * 3] = Math.random() * 6.28318;
        ph[i * 3 + 1] = Math.random() * 6.28318;
        ph[i * 3 + 2] = Math.random() * 6.28318;
        sd[i] = Math.random();
        largeParticle[i] = Math.random() < 0.02 ? 1 : 0;

        const colorRoll = Math.random();
        if (colorRoll < 0.2) {
          colorMix[i] = 0.82 + Math.random() * 0.18;
        } else if (colorRoll < 0.52) {
          colorMix[i] = 0.28 + Math.random() * 0.42;
        } else {
          colorMix[i] = Math.random() * 0.18;
        }
      }

      return {
        positions: pos,
        basePos: base,
        phases: ph,
        seeds: sd,
        large: largeParticle,
        colorMixes: colorMix,
      };
    }, [particleCount, visibleHeight, visibleWidth]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(0, 0) },
    }),
    [],
  );

  useFrame(({ clock }) => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
    materialRef.current.uniforms.uPointer.value.set(pointer.x, pointer.y);
  });

  return (
    <>
      <color attach="background" args={["#000000"]} />
      <points ref={meshRef} position={[0, 0, -nebulaDepth]}>
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
          <bufferAttribute
            attach="attributes-aLarge"
            count={particleCount}
            array={large}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aColorMix"
            count={particleCount}
            array={colorMixes}
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
