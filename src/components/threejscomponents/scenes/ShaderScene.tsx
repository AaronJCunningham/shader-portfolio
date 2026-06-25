import * as THREE from "three";
import {
  useFrame,
  createPortal,
  useThree,
  useLoader,
} from "@react-three/fiber";
import { useFBO, useProgress } from "@react-three/drei";
import React, { useEffect, useMemo, useRef } from "react";

import SceneNebula from "./SceneNebula";
import SceneParticleSphere from "./SceneParticleSphere";
import SceneParticleRibbon from "./SceneParticleRibbon";
import SceneParticleGrid from "./SceneParticleGrid";

import vertexShader from "../shaders/mainShader/vertexShader.glsl.js";
import fragmentShader from "../shaders/mainShader/fragmentShader.glsl.js";

import { useLoadingProgress, useScrollPhase } from "../../../store";

import useMouseWheelandTouch from "@/components/hooks/useWheelEvent";

const ShaderScene = () => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  const smoothedGlobalScrollRef = useRef(0);
  const preRenderedRef = useRef(false);

  const scenes = useMemo(
    () => [
      new THREE.Scene(),
      new THREE.Scene(),
      new THREE.Scene(),
      new THREE.Scene(),
    ],
    [],
  );

  const noiseTexture = useLoader(THREE.TextureLoader, "/images/noise.png");
  const { size, viewport, pointer } = useThree();
  const { progress } = useProgress();
  const isLowQuality = useMemo(() => {
    if (typeof window === "undefined") return false;

    const nav = window.navigator as Navigator & { deviceMemory?: number };
    const isMobileViewport = window.matchMedia("(max-width: 767px)").matches;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const hasHighDpr = window.devicePixelRatio >= 2;
    const hasLowMemory =
      typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4;
    const forceLowQuality = new URLSearchParams(window.location.search).get(
      "shaderQuality",
    ) === "low";

    return (
      forceLowQuality ||
      isMobileViewport ||
      hasHighDpr ||
      hasLowMemory ||
      prefersReducedMotion
    );
  }, []);
  const fboScale = isLowQuality ? 0.72 : 1;
  const fboWidth = Math.max(1, Math.floor(size.width * fboScale));
  const fboHeight = Math.max(1, Math.floor(size.height * fboScale));

  const renderTargetA = useFBO(fboWidth, fboHeight, {
    depthBuffer: false,
    stencilBuffer: false,
    samples: 0,
  });
  const renderTargetB = useFBO(fboWidth, fboHeight, {
    depthBuffer: false,
    stencilBuffer: false,
    samples: 0,
  });
  const renderTargetC = useFBO(fboWidth, fboHeight, {
    depthBuffer: false,
    stencilBuffer: false,
    samples: 0,
  });
  const renderTargetD = useFBO(fboWidth, fboHeight, {
    depthBuffer: false,
    stencilBuffer: false,
    samples: 0,
  });
  const renderTargets = useMemo(
    () => [renderTargetA, renderTargetB, renderTargetC, renderTargetD],
    [renderTargetA, renderTargetB, renderTargetC, renderTargetD],
  );

  const setLoadingProgress = useLoadingProgress(
    (state: any) => state.setLoadingProgress,
  );

  const setScrollState = useScrollPhase((state) => state.setScrollState);

  useEffect(() => {
    setLoadingProgress(progress);
  }, [progress, setLoadingProgress]);

  useEffect(() => {
    if (!shaderRef.current) return;
    shaderRef.current.uniforms.uResolution.value = new THREE.Vector2(
      size.width,
      size.height,
    );
  }, [size.height, size.width]);

  const sceneCameras = useMemo(
    () =>
      Array.from(
        { length: 4 },
        () =>
          new THREE.PerspectiveCamera(
            55,
            1,
            1,
            1000,
          ),
      ),
    [],
  );

  useEffect(() => {
    sceneCameras.forEach((sceneCamera) => {
      sceneCamera.aspect = viewport.width / viewport.height;
      sceneCamera.updateProjectionMatrix();
    });
  }, [sceneCameras, viewport.height, viewport.width]);

  const phaseSize = 1 / 3; // 3 transitions

  const { normalizedValueRef } = useMouseWheelandTouch(() => {});

  useFrame(({ clock, gl }, delta) => {
    smoothedGlobalScrollRef.current = THREE.MathUtils.damp(
      smoothedGlobalScrollRef.current,
      normalizedValueRef.current,
      8,
      delta,
    );

    const smoothedGlobalScroll = smoothedGlobalScrollRef.current;
    const currentPhase = Math.min(
      Math.floor(smoothedGlobalScroll / phaseSize) + 1,
      3,
    );
    const phaseStart = (currentPhase - 1) * phaseSize;
    const normalizedScroll = Math.min(
      Math.max((smoothedGlobalScroll - phaseStart) / phaseSize, 0),
      1,
    );

    setScrollState(currentPhase, normalizedScroll);

    const renderScene = (index: number) => {
      gl.setRenderTarget(renderTargets[index]);
      gl.clear();
      gl.render(scenes[index], sceneCameras[index]);
    };

    if (!preRenderedRef.current) {
      renderScene(0);
      renderScene(1);
      renderScene(2);
      renderScene(3);
      preRenderedRef.current = true;
    } else {
      const isScrollSettled =
        Math.abs(smoothedGlobalScroll - normalizedValueRef.current) < 0.0005;
      const isAtPhaseStart = normalizedScroll < 0.002;
      const isAtPhaseEnd = normalizedScroll > 0.998;

      if (isScrollSettled && (isAtPhaseStart || isAtPhaseEnd)) {
        renderScene(
          THREE.MathUtils.clamp(
            currentPhase - 1 + (isAtPhaseEnd ? 1 : 0),
            0,
            3,
          ),
        );
      } else {
        renderScene(currentPhase - 1);
        renderScene(currentPhase);
      }
    }

    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = clock.getElapsedTime();
      shaderRef.current.uniforms.uTextureOne.value = renderTargetA.texture;
      shaderRef.current.uniforms.uTextureTwo.value = renderTargetB.texture;
      shaderRef.current.uniforms.uTextureThree.value = renderTargetC.texture;
      shaderRef.current.uniforms.uTextureFour.value = renderTargetD.texture;
      shaderRef.current.uniforms.uScroll.value = normalizedScroll;
      shaderRef.current.uniforms.uCurrentPhase.value = currentPhase;
    }
    gl.setRenderTarget(null);
  });

  useEffect(() => {
    const glitchIntensity = 0.5;
    const interval = setInterval(() => {
      if (shaderRef.current) {
        shaderRef.current.uniforms.uGlitchIntensity.value =
          Math.random() < 0.1 ? glitchIntensity : 0;
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);
  return (
    <>
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[viewport.width, viewport.height]} />
        <shaderMaterial
          ref={shaderRef}
          uniforms={{
            uTextureOne: {
              value: renderTargetA.texture,
            },
            uTextureTwo: {
              value: renderTargetB.texture,
            },
            uTextureThree: {
              value: renderTargetC.texture,
            },
            uTextureFour: {
              value: renderTargetD.texture,
            },
            uNoiseTexture: {
              value: noiseTexture,
            },
            uTime: {
              value: 0.0,
            },
            uScroll: {
              value: 0.0,
            },
            uCurrentPhase: {
              value: 0,
            },
            uGlitchIntensity: {
              value: 0.0,
            },
            uResolution: {
              value: new THREE.Vector2(size.width, size.height),
            },
          }}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
        />
      </mesh>
      {createPortal(
        <SceneParticleSphere isLowQuality={isLowQuality} pointer={pointer} />,
        scenes[0],
      )}
      {createPortal(
        <SceneNebula isLowQuality={isLowQuality} pointer={pointer} />,
        scenes[1],
      )}
      {createPortal(
        <SceneParticleRibbon isLowQuality={isLowQuality} pointer={pointer} />,
        scenes[2],
      )}
      {createPortal(
        <SceneParticleGrid isLowQuality={isLowQuality} pointer={pointer} />,
        scenes[3],
      )}
    </>
  );
};

export default ShaderScene;
