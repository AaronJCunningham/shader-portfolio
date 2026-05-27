import type { WebGPURuntimeScene } from "./WebGPUSceneOne";

export function createWebGPUSceneFour(THREE: any, Nodes: any): WebGPURuntimeScene {
  const {
    PointsNodeMaterial,
    attribute,
    clamp,
    color,
    cos,
    distance,
    exp,
    mix,
    mx_noise_float,
    sin,
    smoothstep,
    timerGlobal,
    uniform,
    vec2,
    vec3,
  } = Nodes;

  const gridSize = 120;
  const spacing = 0.14;
  const particleCount = gridSize * gridSize;
  const positions = new Float32Array(particleCount * 3);
  const randoms = new Float32Array(particleCount);
  const halfGrid = (gridSize * spacing) / 2;

  for (let ix = 0; ix < gridSize; ix += 1) {
    for (let iz = 0; iz < gridSize; iz += 1) {
      const i = ix * gridSize + iz;
      positions[i * 3] = ix * spacing - halfGrid;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = iz * spacing - halfGrid;
      randoms[i] = Math.random();
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aRandom", new THREE.BufferAttribute(randoms, 1));

  const pointerUniform = uniform(new THREE.Vector2(0, 0));
  const pointerSpeedUniform = uniform(0);
  const time = timerGlobal();
  const random = attribute("aRandom", "float");
  const mouseWorld = vec2(pointerUniform.x.mul(8), pointerUniform.y.mul(5));
  const distToMouse = distance(vec2(Nodes.positionLocal.x, Nodes.positionLocal.z), mouseWorld);
  const ripple1 = sin(distToMouse.mul(3).sub(time.mul(3.5))).mul(exp(distToMouse.mul(-0.15)));
  const ripple2 = sin(distToMouse.mul(5).sub(time.mul(2))).mul(exp(distToMouse.mul(-0.25)));
  const mouseRipple = ripple1
    .mul(0.6)
    .add(ripple2.mul(0.3))
    .mul(smoothstep(12, 0, distToMouse))
    .mul(pointerSpeedUniform.mul(3).add(1));
  const ambient1 = mx_noise_float(vec3(Nodes.positionLocal.xz.mul(0.3), time.mul(0.2))).mul(0.3);
  const ambient2 = sin(Nodes.positionLocal.x.mul(0.5).add(time.mul(0.4)))
    .mul(cos(Nodes.positionLocal.z.mul(0.3).add(time.mul(0.3))))
    .mul(0.15);
  const proximity = smoothstep(4, 0, distToMouse);
  const lift = proximity.mul(1.2);
  const jitter = random.mul(0.05).mul(sin(time.mul(2).add(random.mul(100))));
  const height = mouseRipple.add(ambient1).add(ambient2).add(lift).add(jitter);
  const displacedPosition = Nodes.positionLocal.add(vec3(0, height, 0));
  const heightMix = clamp(height.add(0.3).div(2), 0, 1);
  const voidCyan = color("#010505");
  const deepCyan = color("#032123");
  const brightCyan = color("#55efe4");
  const softWhite = color("#f2efe6");
  const lowColor = mix(voidCyan, deepCyan, smoothstep(0, 0.2, heightMix));
  const midColor = mix(lowColor, brightCyan, smoothstep(0.2, 0.5, heightMix));
  const finalColor = mix(midColor, softWhite, smoothstep(0.6, 1, heightMix)).add(
    color("#173d3a").mul(proximity),
  );

  const material = new PointsNodeMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0,
    size: 2,
  });

  material.colorNode = finalColor;
  material.opacityNode = heightMix.mul(0.4).add(proximity.mul(0.3)).add(0.2);
  material.positionNode = displacedPosition;
  material.sizeNode = random.mul(0.3).add(0.8).add(proximity.mul(1.0)).mul(1.3);

  const points = new THREE.Points(geometry, material);
  points.position.set(0, -2, -8);
  points.rotation.x = -Math.PI * 0.35;

  const group = new THREE.Group();
  group.add(points);

  const previousPointer = new THREE.Vector2(0, 0);
  let pointerSpeed = 0;

  const update = ({ pointer }: { pointer: { x: number; y: number }; time: number }) => {
    const dx = pointer.x - previousPointer.x;
    const dy = pointer.y - previousPointer.y;
    const speed = Math.sqrt(dx * dx + dy * dy);

    pointerSpeed += (speed - pointerSpeed) * 0.1;
    pointerUniform.value.set(pointer.x, pointer.y);
    pointerSpeedUniform.value = pointerSpeed;
    previousPointer.set(pointer.x, pointer.y);
  };

  return {
    group,
    materials: [material],
    interaction: 0,
    baseScale: 1,
    update,
  };
}
