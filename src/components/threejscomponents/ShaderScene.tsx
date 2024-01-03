import * as THREE from 'three';
import { Canvas, extend, useFrame, ReactThreeFiber, createPortal, useThree } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera, shaderMaterial, useFBO, useProgress } from '@react-three/drei';
import React, { MutableRefObject, useEffect, useRef } from 'react';


import SceneOne from './SceneOne';
import SceneTwo from './SceneTwo';
import vertexShader from "./shaders/vertexShader.glsl.js"
import fragmentShader from "./shaders/fragmentShader.glsl.js"
import CustomCamera from './CustomCamera';
import VirtualScroll from 'virtual-scroll';
import CustomPerspectiveCamera from './CustomPerspectiveCamera';

import {useLoadingProgress} from "../../store"
  

const ShaderScene = () => {


const shaderRef = useRef<THREE.ShaderMaterial>(null)


const scene1 = new THREE.Scene();
const scene2 = new THREE.Scene();

const renderTargetA = useFBO();
const renderTargetB = useFBO();

const { size, camera, viewport, pointer } = useThree()
const { active, progress, errors, item, loaded, total } = useProgress()

const [loadingProgress, setLoadingProgress] = useLoadingProgress((state) => [
  state.loadingProgress,
  state.setLoadingProgress,
]);
console.log("camera",camera)

useEffect(() => {
setLoadingProgress(progress)
},[progress])
console.log("LOADER>>>>>",progress)
const scroller = new VirtualScroll()
let scroll = 0
scroller.on(event => {
	scroll = event.y / 1000
})

const cameraRef = useRef<THREE.PerspectiveCamera>(new THREE.PerspectiveCamera(105, viewport.width / viewport.height, 1, 1000))
const cameraSceneOne = new THREE.PerspectiveCamera(55, viewport.width / viewport.height, 1, 1000)
const cameraSceneTwo = new THREE.PerspectiveCamera(55, viewport.width / viewport.height, 1, 1000)


useFrame(({ clock, gl }) => {
  gl.setRenderTarget(renderTargetA);
  gl.render(scene1, cameraSceneOne);
  
  gl.setRenderTarget(renderTargetB);
  gl.render(scene2, cameraSceneOne);

  if (shaderRef.current )  {
   
    // @ts-ignore
      shaderRef.current.uniforms.uTime.value = clock.getElapsedTime();
      // @ts-ignore
      shaderRef.current.uniforms.uTextureOne.value = renderTargetA.texture;
      // @ts-ignore
      shaderRef.current.uniforms.uTextureTwo.value = renderTargetB.texture;
      shaderRef.current.uniforms.uScroll.value = -scroll;
      // shaderRef.current.uniforms.uv.value = shaderRef
    }

  gl.setRenderTarget(null)


  });
console.log(shaderRef.current)
  return (
    <>
  {/* <SceneTwo /> */}
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
            uTime: {
              value: 0.0,
            },
            uScroll: {
              value: 0.0
            }
          }}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
        />
     
      </mesh>
      {createPortal(<SceneOne sceneCamera={cameraSceneOne} pointer={pointer} />, scene1)}
      {createPortal(<SceneTwo />, scene2)}
    </>
  );
};

export default ShaderScene;
