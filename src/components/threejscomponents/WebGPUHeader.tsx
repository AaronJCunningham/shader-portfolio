import { useEffect, useRef } from "react";

import useMouseWheelAndTouch from "@/components/hooks/useWheelEvent";
import {
  createWebGPUSceneOne,
  type WebGPURuntimeScene,
} from "@/components/threejscomponents/webgpu-scenes/WebGPUSceneOne";
import { useLoadingProgress, useScrollPhase } from "@/store";

type WebGPUHeaderProps = {
  onFallback?: () => void;
};

const sceneCount = 4;
const phaseSize = 1 / 3;

function setSceneOpacity(runtimeScene: WebGPURuntimeScene, opacity: number) {
  runtimeScene.group.visible = opacity > 0.01;
  runtimeScene.materials.forEach((material) => {
    material.opacity = opacity;
    material.needsUpdate = true;
  });
}

function makeParticleGeometry(
  THREE: any,
  count: number,
  layout: "nebula" | "ribbon" | "grid",
) {
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const amplitudes = new Float32Array(count);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    const i3 = i * 3;
    const t = i / count;
    const angle = t * Math.PI * 2;
    const spin = angle * 5.0;
    const radius = Math.sqrt(t);

    if (layout === "nebula") {
      const z = 1 - 2 * t;
      const sphereRadius = Math.sqrt(Math.max(0, 1 - z * z));
      const theta = i * 2.399963229728653;

      positions[i3] =
        Math.cos(spin) * radius * 3.6 + Math.cos(theta) * sphereRadius * 0.55;
      positions[i3 + 1] = (Math.random() - 0.5) * 1.8 + Math.sin(angle * 3) * 0.35;
      positions[i3 + 2] =
        Math.sin(spin) * radius * 2.6 + Math.sin(theta) * sphereRadius * 0.55;
    }

    if (layout === "ribbon") {
      const x = (t - 0.5) * 8;
      positions[i3] = x;
      positions[i3 + 1] = Math.sin(t * Math.PI * 8) * 1.2;
      positions[i3 + 2] = Math.cos(t * Math.PI * 5) * 1.2;
    }

    if (layout === "grid") {
      const side = Math.ceil(Math.sqrt(count));
      const x = (i % side) / side - 0.5;
      const y = Math.floor(i / side) / side - 0.5;
      positions[i3] = x * 7;
      positions[i3 + 1] = y * 4.2;
      positions[i3 + 2] = (Math.random() - 0.5) * 0.45;
    }

    phases[i] = Math.random() * Math.PI * 2;
    amplitudes[i] = 0.04 + Math.random() * 0.22;
    sizes[i] = 2.5 + Math.random() * 5.5;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("phase", new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute("amp", new THREE.BufferAttribute(amplitudes, 1));
  geometry.setAttribute("pointSize", new THREE.BufferAttribute(sizes, 1));

  return geometry;
}

function createNodeParticleMaterial(
  Nodes: any,
  THREE: any,
  colorA: string,
  colorB: string,
  layout: "nebula" | "ribbon" | "grid",
) {
  const {
    PointsNodeMaterial,
    attribute,
    color,
    mix,
    sin,
    timerGlobal,
    vec3,
    positionLocal,
  } = Nodes;

  const time = timerGlobal(0.75);
  const phase = attribute("phase", "float");
  const amp = attribute("amp", "float");
  const wave = sin(time.add(phase));

  const material = new PointsNodeMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0,
    size: 3,
  });

  material.colorNode = mix(color(colorA), color(colorB), wave.mul(0.5).add(0.5));
  material.sizeNode = attribute("pointSize", "float").mul(wave.mul(0.18).add(1.0));
  material.positionNode = positionLocal.add(
    vec3(
      sin(time.mul(0.77).add(phase)).mul(amp),
      sin(time.mul(1.13).add(phase.mul(1.7))).mul(amp.mul(1.4)),
      sin(time.mul(0.51).add(phase.mul(0.6))).mul(amp.mul(2.2)),
    ),
  );

  return {
    material,
  };
}

function createRuntimeScene(
  THREE: any,
  Nodes: any,
  layout: "nebula" | "ribbon" | "grid",
  colors: [string, string],
  count: number,
) {
  const group = new THREE.Group();
  const geometry = makeParticleGeometry(THREE, count, layout);
  const { material } = createNodeParticleMaterial(
    Nodes,
    THREE,
    colors[0],
    colors[1],
    layout,
  );
  const points = new THREE.Points(geometry, material);

  group.add(points);

  return {
    group,
    materials: [material],
    interaction: layout === "grid" ? 0.55 : 0.72,
    baseScale: 1,
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
    let scene: any;
    let camera: any;
    let runtimeScenes: WebGPURuntimeScene[] = [];
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

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(
          48,
          window.innerWidth / window.innerHeight,
          0.1,
          100,
        );
        camera.position.set(0, 0, 7.25);

        runtimeScenes = [
          createWebGPUSceneOne(THREE, Nodes),
          createRuntimeScene(THREE, Nodes, "nebula", ["#ff4d8d", "#7b61ff"], 2600),
          createRuntimeScene(THREE, Nodes, "ribbon", ["#e4ff6a", "#40ffc6"], 2200),
          createRuntimeScene(THREE, Nodes, "grid", ["#d8d2c4", "#ff693d"], 2400),
        ];

        runtimeScenes.forEach((runtimeScene) => scene.add(runtimeScene.group));

        await renderer.init();
        setLoadingProgress(100);

        const handleResize = () => {
          if (!renderer || !camera) return;

          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
          renderer.setSize(window.innerWidth, window.innerHeight);
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
          const globalProgress = (currentPhase - 1 + phaseProgress) / 3;
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
            const sceneProgress = index / (sceneCount - 1);
            const distance = Math.abs(globalProgress - sceneProgress);
            const opacity = THREE.MathUtils.smoothstep(0.34 - distance, 0, 0.34);
            const interaction = runtimeScene.interaction * opacity;
            const scaleLift = pointerVelocityRef.current * 2.4 * interaction;

            runtimeScene.update?.({
              pointer: smoothedPointer,
              time: frameRef.current / 60,
            });
            setSceneOpacity(runtimeScene, opacity);
            runtimeScene.group.rotation.y +=
              index === 0 ? 0 : 0.0018 + index * 0.0008 + smoothedPointer.x * 0.004 * interaction;
            runtimeScene.group.rotation.x =
              index === 0
                ? 0
                : Math.sin(frameRef.current * 0.006 + index) * 0.16 +
                  smoothedPointer.y * 0.26 * interaction;
            runtimeScene.group.position.x = index === 0 ? 0 : smoothedPointer.x * 0.42 * interaction;
            runtimeScene.group.position.y = index === 0 ? 0 : smoothedPointer.y * 0.3 * interaction;
            runtimeScene.group.position.z = -distance * 1.3;
            runtimeScene.group.scale.setScalar(index === 0 ? 1 : runtimeScene.baseScale + scaleLift);
          });

          camera.position.x = Math.sin(frameRef.current * 0.002) * 0.14 + smoothedPointer.x * 0.22;
          camera.position.y = Math.cos(frameRef.current * 0.0027) * 0.1 + smoothedPointer.y * 0.16;
          camera.lookAt(0, 0, 0);

          frameRef.current += 1;

          try {
            await renderer.render(scene, camera);
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

      if (container) {
        container.innerHTML = "";
      }
    };
  }, [normalizedValueRef, onFallback, setLoadingProgress, setScrollState]);

  return <div ref={containerRef} className="header_canvas webgpu-header" />;
}
