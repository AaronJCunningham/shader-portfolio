import * as THREE from 'three';
import { Canvas, extend, useFrame, ReactThreeFiber, createPortal, useThree } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera, shaderMaterial, useFBO, useProgress } from '@react-three/drei';
import React, { MutableRefObject, useEffect, useRef } from 'react';


import SceneOne from './SceneOne';
import SceneTwo from './SceneTwo';
import SceneThree from './SceneThree';
import SceneFour from './SceneFour';

import vertexShader from "../shaders/mainShader/vertexShader.glsl.js"
import fragmentShader from "../shaders/mainShader/fragmentShader.glsl.js"
import VirtualScroll from 'virtual-scroll';


import {useLoadingProgress} from "../../../store"
import Squid from '../meshes/Squid';
import { throttle } from 'lodash';
import { lerpColor } from '@/utilities';
import useMouseWheel from '@/components/hooks/useWheelEvent';

  

const ShaderScene = () => {


const shaderRef = useRef<THREE.ShaderMaterial>(null)


const scene1 = new THREE.Scene();
const scene2 = new THREE.Scene();
const scene3 = new THREE.Scene();
const scene4 = new THREE.Scene();

const renderTargetA = useFBO();
const renderTargetB = useFBO();
const renderTargetC = useFBO();
const renderTargetD = useFBO();

const { size, camera, viewport, pointer } = useThree()
const { active, progress, errors, item, loaded, total } = useProgress()

const [loadingProgress, setLoadingProgress] = useLoadingProgress((state) => [
  state.loadingProgress,
  state.setLoadingProgress,
]);




useEffect(() => {
setLoadingProgress(progress)
},[progress])

// console.log("LOADER>>>>>",progress)
const scroller = new VirtualScroll()
let scroll = 0



const cameraSceneOne = new THREE.PerspectiveCamera(55, viewport.width / viewport.height, 1, 1000)
const cameraSceneTwo = new THREE.PerspectiveCamera(55, viewport.width / viewport.height, 1, 1000)
const cameraSceneThree = new THREE.PerspectiveCamera(55, viewport.width / viewport.height, 1, 1000)
const cameraSceneFour = new THREE.PerspectiveCamera(55, viewport.width / viewport.height, 1, 1000)

const colorStart = [0, 0.678, 0.992]; // RGB for 0xff22ff
const colorEnd = [1.0, 0, 0.85]; 


let normalizedScroll = 0; // Initialize outside the callback
let currentPhase = 1;

const { cumulativeDeltaRef, currentPhaseRef, normalizedValueRef } = useMouseWheel(() => {
  const uScroll = normalizedValueRef.current; // Cumulative scroll value
  currentPhase = currentPhaseRef.current; // Current phase number (1, 2, 3, 4)

  // Calculate the normalized scroll value for the current phase
  const phaseStart = (currentPhase - 1) * 0.25; // Start of the current phase range
  normalizedScroll = (uScroll - phaseStart) / 0.25;

  // Clamp the value between 0 and 1
  normalizedScroll = Math.min(Math.max(normalizedScroll, 0), 1);
  console.log("THREE",currentPhase, currentPhaseRef.current)
});



useFrame(({ clock, gl }) => {
  gl.setRenderTarget(renderTargetA);
  gl.render(scene1, cameraSceneOne);
  gl.setRenderTarget(renderTargetB);
  gl.render(scene2, cameraSceneTwo);
  gl.setRenderTarget(renderTargetC);
  gl.render(scene3, cameraSceneThree);
  gl.setRenderTarget(renderTargetD);
  gl.render(scene4, cameraSceneFour);
  
  if (shaderRef.current )  {
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
      shaderRef.current.uniforms.uCurrentPhase.value = currentPhase;
      shaderRef.current.uniforms.uScroll.value = normalizedScroll;
    
      // shaderRef.current.uniforms.uv.value = shaderRef
    }
  gl.setRenderTarget(null)
  // updateClearColorOnScroll(gl)
  });
// console.log(shaderRef.current)
  return (
    <>
        <mesh
        position={[0,0,0]}
      
      >
      <planeGeometry args={[viewport.width , viewport.height]} />
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
            uTime: {
              value: 0.0,
            },
            uScroll: {
              value: 0.0
            },
            uCurrentPhase: {
              value: 0
            }
          }}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
        />
     
      </mesh>
      {createPortal(<SceneOne sceneCamera={cameraSceneOne} pointer={pointer} />, scene1)}
      {createPortal(<SceneTwo />, scene2)}
      {createPortal(<SceneThree />, scene3)}
      {createPortal(<SceneFour/>, scene4)}
    </>
  );
};

export default ShaderScene;
