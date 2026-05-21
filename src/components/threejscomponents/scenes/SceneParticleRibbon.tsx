import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";

import vertexShader from "../shaders/particleRibbon/vertex.glsl.js";
import fragmentShader from "../shaders/particleRibbon/fragment.glsl.js";

interface SceneParticleRibbonProps {
  pointer: { x: number; y: number };
}

const BAND_COUNT = 11;
const PARTICLES_PER_BAND = 760;
const PARTICLE_COUNT = BAND_COUNT * PARTICLES_PER_BAND;

export default function SceneParticleRibbon({
  pointer,
}: SceneParticleRibbonProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { positions, uValues, bands, sides, seeds } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const u = new Float32Array(PARTICLE_COUNT);
    const band = new Float32Array(PARTICLE_COUNT);
    const side = new Float32Array(PARTICLE_COUNT);
    const seed = new Float32Array(PARTICLE_COUNT);

    for (let b = 0; b < BAND_COUNT; b++) {
      for (let i = 0; i < PARTICLES_PER_BAND; i++) {
        const index = b * PARTICLES_PER_BAND + i;
        const t = i / (PARTICLES_PER_BAND - 1);

        u[index] = t * 2 - 1;
        band[index] = b;
        side[index] = (b - (BAND_COUNT - 1) * 0.5) / ((BAND_COUNT - 1) * 0.5);
        seed[index] = Math.random();
      }
    }

    return { positions: pos, uValues: u, bands: band, sides: side, seeds: seed };
  }, []);

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

    if (pointsRef.current) {
      pointsRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.08) * 0.16;
      pointsRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.05) * 0.05;
    }
  });

  return (
    <>
      <color attach="background" args={["#000000"]} />
      <points ref={pointsRef} position={[0, 0, -9]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={PARTICLE_COUNT}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aU"
            count={PARTICLE_COUNT}
            array={uValues}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aBand"
            count={PARTICLE_COUNT}
            array={bands}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aSide"
            count={PARTICLE_COUNT}
            array={sides}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aSeed"
            count={PARTICLE_COUNT}
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
