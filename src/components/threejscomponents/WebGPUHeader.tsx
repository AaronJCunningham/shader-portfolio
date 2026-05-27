import { useEffect, useRef } from "react";

import useMouseWheelAndTouch from "@/components/hooks/useWheelEvent";
import {
  createWebGPUSceneOne,
  type WebGPURuntimeScene,
} from "@/components/threejscomponents/webgpu-scenes/WebGPUSceneOne";
import { createWebGPUSceneTwo } from "@/components/threejscomponents/webgpu-scenes/WebGPUSceneTwo";
import { createWebGPUSceneThree } from "@/components/threejscomponents/webgpu-scenes/WebGPUSceneThree";
import { createWebGPUSceneFour } from "@/components/threejscomponents/webgpu-scenes/WebGPUSceneFour";
import { useLoadingProgress, useScrollPhase } from "@/store";

type WebGPUHeaderProps = {
  onFallback?: () => void;
};

const sceneCount = 4;
const phaseSize = 1 / 3;

function setSceneOpacity(runtimeScene: WebGPURuntimeScene, opacity: number) {
  runtimeScene.materials.forEach((material) => {
    material.opacity = opacity;
    material.needsUpdate = true;
  });
}

function createCompositorMaterial(Nodes: any, currentTexture: any, nextTexture: any) {
  const {
    MeshBasicNodeMaterial,
    float,
    mix,
    smoothstep,
    texture,
    uniform,
    uv,
  } = Nodes;

  const progress = uniform(0);
  const softness = float(0.005);
  const screenUv = uv();
  const wipePosition = screenUv.x.add(screenUv.y).mul(0.5);
  const wipe = smoothstep(progress.sub(softness), progress.add(softness), wipePosition);
  const currentScene = texture(currentTexture, screenUv);
  const nextScene = texture(nextTexture, screenUv);
  const material = new MeshBasicNodeMaterial();

  material.colorNode = mix(nextScene, currentScene, wipe);

  return {
    material,
    progress,
  };
}

export default function WebGPUHeader({ onFallback }: WebGPUHeaderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const smoothedGlobalScrollRef = useRef(0);
  const pointerRef = useRef({ x: 0, y: 0 });
  const smoothedPointerRef = useRef({ x: 0, y: 0 });
  const pointerVelocityRef = useRef(0);
  const frameRef = useRef(0);
  const setScrollState = useScrollPhase((state) => state.setScrollState);
  const setLoadingProgress = useLoadingProgress((state) => state.setLoadingProgress);
  const { normalizedValueRef } = useMouseWheelAndTouch(() => {});

  useEffect(() => {
    let mounted = true;
    let renderer: any;
    let renderCamera: any;
    let outputScene: any;
    let outputCamera: any;
    let outputPlane: any;
    let runtimeScenes: WebGPURuntimeScene[] = [];
    let renderScenes: any[] = [];
    let renderTargets: any[] = [];
    let compositorPasses: Array<{ material: any; progress: any }> = [];
    let renderFailed = false;
    const container = containerRef.current;

    const init = async () => {
      try {
        const THREE = await import("three");
        const WebGPURenderer = (
          await import("three/examples/jsm/renderers/webgpu/WebGPURenderer.js")
        ).default;
        const Nodes = await import("three/examples/jsm/nodes/Nodes.js");

        if (!mounted || !container) return;

        renderer = new WebGPURenderer({
          antialias: true,
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x050505, 1);

        container.appendChild(renderer.domElement);

        renderCamera = new THREE.PerspectiveCamera(
          48,
          window.innerWidth / window.innerHeight,
          0.1,
          100,
        );
        renderCamera.position.set(0, 0, 7.25);

        runtimeScenes = [
          createWebGPUSceneOne(THREE, Nodes),
          createWebGPUSceneTwo(THREE, Nodes),
          createWebGPUSceneThree(THREE, Nodes),
          createWebGPUSceneFour(THREE, Nodes),
        ];

        runtimeScenes.forEach((runtimeScene) => setSceneOpacity(runtimeScene, 1));

        renderScenes = runtimeScenes.map((runtimeScene) => {
          const renderScene = new THREE.Scene();
          renderScene.background = new THREE.Color(0x000000);
          renderScene.add(runtimeScene.group);
          return renderScene;
        });

        renderTargets = runtimeScenes.map(
          () =>
            new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
              depthBuffer: true,
              stencilBuffer: false,
            }),
        );

        compositorPasses = [
          createCompositorMaterial(Nodes, renderTargets[0].texture, renderTargets[1].texture),
          createCompositorMaterial(Nodes, renderTargets[1].texture, renderTargets[2].texture),
          createCompositorMaterial(Nodes, renderTargets[2].texture, renderTargets[3].texture),
        ];

        outputScene = new THREE.Scene();
        outputCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        outputPlane = new THREE.Mesh(
          new THREE.PlaneGeometry(2, 2),
          compositorPasses[0].material,
        );
        outputScene.add(outputPlane);

        await renderer.init();
        setLoadingProgress(100);

        const handleResize = () => {
          if (!renderer || !renderCamera) return;

          renderCamera.aspect = window.innerWidth / window.innerHeight;
          renderCamera.updateProjectionMatrix();
          renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
          renderer.setSize(window.innerWidth, window.innerHeight);
          renderTargets.forEach((renderTarget) => {
            renderTarget.setSize(window.innerWidth, window.innerHeight);
          });
        };

        const updatePointer = (clientX: number, clientY: number) => {
          pointerRef.current.x = (clientX / window.innerWidth) * 2 - 1;
          pointerRef.current.y = -(clientY / window.innerHeight) * 2 + 1;
        };

        const handlePointerMove = (event: PointerEvent) => {
          updatePointer(event.clientX, event.clientY);
        };

        const handleTouchMove = (event: TouchEvent) => {
          const touch = event.touches[0];
          if (!touch) return;

          updatePointer(touch.clientX, touch.clientY);
        };

        const animate = async () => {
          if (!mounted) return;

          const delta = 0.08;
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
          const phaseProgress = Math.min(
            Math.max((smoothedGlobalScroll - phaseStart) / phaseSize, 0),
            1,
          );
          const pointer = pointerRef.current;
          const smoothedPointer = smoothedPointerRef.current;
          const previousX = smoothedPointer.x;
          const previousY = smoothedPointer.y;

          smoothedPointer.x = THREE.MathUtils.damp(smoothedPointer.x, pointer.x, 9, delta);
          smoothedPointer.y = THREE.MathUtils.damp(smoothedPointer.y, pointer.y, 9, delta);
          pointerVelocityRef.current = THREE.MathUtils.damp(
            pointerVelocityRef.current,
            Math.hypot(smoothedPointer.x - previousX, smoothedPointer.y - previousY),
            10,
            delta,
          );

          setScrollState(currentPhase, phaseProgress);

          runtimeScenes.forEach((runtimeScene, index) => {
            runtimeScene.update?.({
              pointer: smoothedPointer,
              time: frameRef.current / 60,
            });
          });

          renderCamera.position.x = Math.sin(frameRef.current * 0.002) * 0.14;
          renderCamera.position.y = Math.cos(frameRef.current * 0.0027) * 0.1;
          renderCamera.lookAt(0, 0, 0);

          const compositorPass = compositorPasses[currentPhase - 1];
          compositorPass.progress.value = phaseProgress;
          outputPlane.material = compositorPass.material;

          frameRef.current += 1;

          try {
            for (let i = 0; i < renderScenes.length; i += 1) {
              renderer.setRenderTarget(renderTargets[i]);
              await renderer.render(renderScenes[i], renderCamera);
            }

            renderer.setRenderTarget(null);
            await renderer.render(outputScene, outputCamera);
          } catch (error) {
            if (renderFailed) return;

            renderFailed = true;
            console.error("WebGPU header render failed", error);
            setLoadingProgress(100);
            onFallback?.();
          }
        };

        window.addEventListener("resize", handleResize);
        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("touchmove", handleTouchMove, { passive: true });
        renderer.setAnimationLoop(animate);

        return () => {
          window.removeEventListener("resize", handleResize);
          window.removeEventListener("pointermove", handlePointerMove);
          window.removeEventListener("touchmove", handleTouchMove);
        };
      } catch (error) {
        console.error("WebGPU header failed to initialize", error);
        setLoadingProgress(100);
        onFallback?.();
      }
    };

    let cleanupResize: undefined | (() => void);

    init().then((cleanup) => {
      cleanupResize = cleanup;
    });

    return () => {
      mounted = false;
      cleanupResize?.();

      if (renderer) {
        renderer.setAnimationLoop(null);
        renderer.dispose();
      }

      runtimeScenes.forEach((runtimeScene) => {
        runtimeScene.group.traverse((child: any) => {
          child.geometry?.dispose?.();
          child.material?.dispose?.();
        });
      });
      renderTargets.forEach((renderTarget) => renderTarget.dispose());
      outputPlane?.geometry?.dispose?.();
      compositorPasses.forEach((pass) => pass.material?.dispose?.());

      if (container) {
        container.innerHTML = "";
      }
    };
  }, [normalizedValueRef, onFallback, setLoadingProgress, setScrollState]);

  return <div ref={containerRef} className="header_canvas webgpu-header" />;
}
