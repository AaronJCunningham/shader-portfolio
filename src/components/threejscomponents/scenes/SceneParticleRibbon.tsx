import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

import vertexShader from "../shaders/particleRibbon/vertex.glsl.js";
import fragmentShader from "../shaders/particleRibbon/fragment.glsl.js";

interface SceneParticleRibbonProps {
  isLowQuality?: boolean;
  pointer: { x: number; y: number };
}

const BAND_COUNT = 11;
const PARTICLES_PER_BAND_HIGH = 501;
const PARTICLES_PER_BAND_LOW = 405;
const RIBBON_SIZE_BOOST = 1.2;
const RIBBON_BASE_ANGLE = Math.PI * 0.16;

export default function SceneParticleRibbon({
  isLowQuality = false,
  pointer,
}: SceneParticleRibbonProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const particlesPerBand = isLowQuality
    ? PARTICLES_PER_BAND_LOW
    : PARTICLES_PER_BAND_HIGH;
  const particleCount = BAND_COUNT * particlesPerBand;
  const ribbonDepth = 9;
  const fov = 55;
  const { size } = useThree();
  const aspect = size.width / size.height;
  const visibleHeight =
    2 * Math.tan(THREE.MathUtils.degToRad(fov * 0.5)) * ribbonDepth;
  const visibleWidth = visibleHeight * aspect;
  const ribbonScale = useMemo(
    () =>
      new THREE.Vector2(
        THREE.MathUtils.clamp((visibleWidth * 0.86) / 14, 1, 1.75) *
          RIBBON_SIZE_BOOST,
        THREE.MathUtils.clamp((visibleHeight * 0.58) / 5.4, 1, 1.65) *
          RIBBON_SIZE_BOOST,
      ),
    [visibleHeight, visibleWidth],
  );

  const { positions, uValues, bands, sides, seeds, large, colorMixes } =
    useMemo(() => {
      const pos = new Float32Array(particleCount * 3);
      const u = new Float32Array(particleCount);
      const band = new Float32Array(particleCount);
      const side = new Float32Array(particleCount);
      const seed = new Float32Array(particleCount);
      const largeParticle = new Float32Array(particleCount);
      const colorMix = new Float32Array(particleCount);

      for (let b = 0; b < BAND_COUNT; b++) {
        for (let i = 0; i < particlesPerBand; i++) {
          const index = b * particlesPerBand + i;
          const t = i / (particlesPerBand - 1);

          u[index] = t * 2 - 1;
          band[index] = b;
          side[index] = (b - (BAND_COUNT - 1) * 0.5) / ((BAND_COUNT - 1) * 0.5);
          seed[index] = Math.random();
          largeParticle[index] = Math.random() < 0.02 ? 1 : 0;

          const colorRoll = Math.random();
          if (colorRoll < 0.2) {
            colorMix[index] = 0.82 + Math.random() * 0.18;
          } else if (colorRoll < 0.52) {
            colorMix[index] = 0.28 + Math.random() * 0.42;
          } else {
            colorMix[index] = Math.random() * 0.18;
          }
        }
      }

      return {
        positions: pos,
        uValues: u,
        bands: band,
        sides: side,
        seeds: seed,
        large: largeParticle,
        colorMixes: colorMix,
      };
    }, [particleCount, particlesPerBand]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uRibbonScale: { value: ribbonScale },
    }),
    [ribbonScale],
  );

  useEffect(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uRibbonScale.value.copy(ribbonScale);
  }, [ribbonScale]);

  useFrame(({ clock }) => {
    if (!materialRef.current) return;

    materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
    materialRef.current.uniforms.uPointer.value.set(pointer.x, pointer.y);

    if (pointsRef.current) {
      pointsRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.056) * 0.16;
      pointsRef.current.rotation.z =
        RIBBON_BASE_ANGLE + Math.sin(clock.elapsedTime * 0.035) * 0.05;
    }
  });

  return (
    <>
      <color attach="background" args={["#000000"]} />
      <points ref={pointsRef} position={[0, 0, -ribbonDepth]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aU"
            count={particleCount}
            array={uValues}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aBand"
            count={particleCount}
            array={bands}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aSide"
            count={particleCount}
            array={sides}
            itemSize={1}
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
