import * as THREE from "three";
import {
  Canvas,
  extend,
  useFrame,
  ReactThreeFiber,
  createPortal,
  useThree,
  useLoader,
} from "@react-three/fiber";
import {
  OrbitControls,
  OrthographicCamera,
  shaderMaterial,
  useFBO,
  useProgress,
} from "@react-three/drei";
import React, { MutableRefObject, useEffect, useRef } from "react";

import SceneWarpBall from "./SceneWarpBall";
import SceneNebula from "./SceneNebula";
import SceneParticleSphere from "./SceneParticleSphere";
import SceneParticleGrid from "./SceneParticleGrid";

import vertexShader from "../shaders/mainShader/vertexShader.glsl.js";
import fragmentShader from "../shaders/mainShader/fragmentShader.glsl.js";

import { useLoadingProgress, useScrollPhase } from "../../../store";

import useMouseWheelandTouch from "@/components/hooks/useWheelEvent";

const ShaderScene = () => {
  const shaderRef = useRef<THREE.ShaderMaterial>(null);
  const smoothedGlobalScrollRef = useRef(0);

  const scene1 = new THREE.Scene();
  const scene2 = new THREE.Scene();
  const scene3 = new THREE.Scene();
  const scene4 = new THREE.Scene();

  const renderTargetA = useFBO();
  const renderTargetB = useFBO();
  const renderTargetC = useFBO();
  const renderTargetD = useFBO();

  const noiseTexture = useLoader(THREE.TextureLoader, "/images/noise.png");
  const { size, camera, viewport, pointer } = useThree();
  const { active, progress, errors, item, loaded, total } = useProgress();

  const [loadingProgress, setLoadingProgress] = useLoadingProgress((state) => [
    state.loadingProgress,
    state.setLoadingProgress,
  ]);

  const setScrollState = useScrollPhase((state) => state.setScrollState);

  useEffect(() => {
    setLoadingProgress(progress);
  }, [progress]);

  useEffect(() => {
    if (!shaderRef.current) return;
    shaderRef.current.uniforms.uResolution.value = new THREE.Vector2(
      size.width,
      size.height,
    );
  });

  const cameraSceneOne = new THREE.PerspectiveCamera(
    55,
    viewport.width / viewport.height,
    1,
    1000,
  );
  const cameraSceneTwo = new THREE.PerspectiveCamera(
    55,
    viewport.width / viewport.height,
    1,
    1000,
  );
  const cameraSceneThree = new THREE.PerspectiveCamera(
    55,
    viewport.width / viewport.height,
    1,
    1000,
  );
  const cameraSceneFour = new THREE.PerspectiveCamera(
    55,
    viewport.width / viewport.height,
    1,
    1000,
  );

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

    gl.setRenderTarget(renderTargetA);
    gl.render(scene1, cameraSceneOne);
    gl.setRenderTarget(renderTargetB);
    gl.render(scene2, cameraSceneTwo);
    gl.setRenderTarget(renderTargetC);
    gl.render(scene3, cameraSceneThree);
    gl.setRenderTarget(renderTargetD);
    gl.render(scene4, cameraSceneFour);

    if (shaderRef.current) {
      // @ts-ignore
      shaderRef.current.uniforms.uTime.value = clock.getElapsedTime();
      // @ts-ignore
      shaderRef.current.uniforms.uTextureOne.value = renderTargetA.texture;
      // @ts-ignore
      shaderRef.current.uniforms.uTextureTwo.value = renderTargetB.texture;
      // @ts-ignore
      shaderRef.current.uniforms.uTextureThree.value = renderTargetC.texture;
      // @ts-ignore
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
              value: null,
            },
            uTextureTwo: {
              value: null,
            },
            uTextureThree: {
              value: null,
            },
            uTextureFour: {
              value: null,
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
              value: null,
            },
          }}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
        />
      </mesh>
      {createPortal(<SceneParticleSphere pointer={pointer} />, scene1)}
      {createPortal(<SceneNebula pointer={pointer} />, scene2)}
      {createPortal(
        <SceneWarpBall sceneCamera={cameraSceneThree} pointer={pointer} />,
        scene3,
      )}
      {createPortal(<SceneParticleGrid pointer={pointer} />, scene4)}
    </>
  );
};

export default ShaderScene;
