import vertexShader from "../shaders/ring/vertex.glsl";
import fragmentShader from "../shaders/ring/fragment.glsl";
import simVertex from "../shaders/ring/simVertex.glsl";
import simFragment from "../shaders/ring/simFragment.glsl";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useFBO } from "@react-three/drei";
import { useEffect, useRef } from "react";
import * as THREE from "three";

const Particles = () => {
  const shaderRef = useRef();

  const { size } = useThree();

  const fboSize = 128;
  const fbo1 = useFBO();
  const fbo2 = useFBO();
  const fboScene = new THREE.Scene();
  const fboCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
  fboCamera.position.set(0, 0, 0.5);
  fboCamera.lookAt(0, 0, 0);
  let geometry = new THREE.PlaneGeometry(5, 5);

  const data = new Float32Array(fboSize * fboSize * 4);

  for (let i = 0; i < fboSize; i++) {
    for (let j = 0; j < fboSize; j++) {
      let index = (i + j * fboSize) * 4;
      let theta = Math.random() * Math.PI * 2;
      let r = 0.5 * 0.5 * Math.random();
      data[index + 0] = r * Math.cos(theta);
      data[index + 1] = r * Math.sin(theta);
      data[index + 2] = 0;
      data[index + 3] = 0;
    }
  }

  const fboTexture = new THREE.DataTexture(
    data,
    fboSize,
    fboSize,
    THREE.RGBAFormat,
    THREE.FloatType
  );
  fboTexture.magFilter = THREE.NearestFilter;
  fboTexture.minFilter = THREE.NearestFilter;
  fboTexture.needsUpdate = true;

  const fboMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: null },
      uPositions: { value: fboTexture },
    },
    vertexShader: simVertex,
    fragmentShader: simFragment,
  });

  const fboMesh = new THREE.Mesh(geometry, fboMaterial);

  useEffect(() => {
    if (!shaderRef.current) return;
    //@ts-ignore
    shaderRef.current.uniforms.uPosition.value = fboTexture;
  });

  useFrame(({ gl }) => {
    gl.setRenderTarget(fbo1); // Render to the FBO
    gl.render(fboScene, fboCamera); // Render the FBO scene to the texture
    gl.setRenderTarget(null); // Reset to the default render target
  });

  return (
    <>
      <mesh>
        <boxGeometry />
        <meshNormalMaterial />
      </mesh>
      <primitive object={fboMesh} />
    </>
  );
};

export default Particles;
