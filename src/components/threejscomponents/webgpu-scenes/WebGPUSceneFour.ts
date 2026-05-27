import type { WebGPURuntimeScene } from "./WebGPUSceneOne";

export function createWebGPUSceneFour(THREE: any, Nodes: any): WebGPURuntimeScene {
  const {
    PointsNodeMaterial,
    abs,
    attribute,
    clamp,
    color,
    cos,
    distance,
    exp,
    float,
    mix,
    mx_noise_float,
    pow,
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
  const routes = new Float32Array(particleCount);
  const nodeStrengths = new Float32Array(particleCount);
  const halfGrid = (gridSize * spacing) / 2;

  for (let ix = 0; ix < gridSize; ix += 1) {
    for (let iz = 0; iz < gridSize; iz += 1) {
      const i = ix * gridSize + iz;
      const x = ix * spacing - halfGrid;
      const z = iz * spacing - halfGrid;
      const routeA = Math.abs(z - Math.sin(x * 0.72) * 1.8);
      const routeB = Math.abs(z + x * 0.42 - 1.15);
      const routeC = Math.abs(z - x * -0.28 + 1.75);
      const route = Math.max(
        routeA < 0.08 ? 1 : 0,
        routeB < 0.07 ? 0.85 : 0,
        routeC < 0.07 ? 0.75 : 0,
      );
      const isNode =
        (ix % 18 === 0 && iz % 15 === 0) ||
        (route > 0 && ix % 22 === 0) ||
        (route > 0 && iz % 19 === 0);

      positions[i * 3] = x;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = z;
      randoms[i] = Math.random();
      routes[i] = route;
      nodeStrengths[i] = isNode ? 0.65 + Math.random() * 0.35 : 0;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aRandom", new THREE.BufferAttribute(randoms, 1));
  geometry.setAttribute("aRoute", new THREE.BufferAttribute(routes, 1));
  geometry.setAttribute("aNode", new THREE.BufferAttribute(nodeStrengths, 1));

  const pointerUniform = uniform(new THREE.Vector2(0, 0));
  const pointerSpeedUniform = uniform(0);
  const time = timerGlobal();
  const random = attribute("aRandom", "float");
  const route = attribute("aRoute", "float");
  const node = attribute("aNode", "float");
  const mouseWorld = vec2(pointerUniform.x.mul(8), pointerUniform.y.mul(5));
  const distToMouse = distance(vec2(Nodes.positionLocal.x, Nodes.positionLocal.z), mouseWorld);
  const scan = sin(Nodes.positionLocal.x.mul(1.35).sub(time.mul(2.1))).mul(0.5).add(0.5);
  const routePulse = pow(
    sin(Nodes.positionLocal.x.mul(2.2).add(Nodes.positionLocal.z.mul(1.4)).sub(time.mul(4.2)))
      .mul(0.5)
      .add(0.5),
    8,
  ).mul(route);
  const nodePulse = pow(sin(time.mul(2.4).add(random.mul(40))).mul(0.5).add(0.5), 10).mul(node);
  const ripple1 = sin(distToMouse.mul(3).sub(time.mul(3.5))).mul(exp(distToMouse.mul(-0.15)));
  const ripple2 = sin(distToMouse.mul(7).sub(time.mul(3.2))).mul(exp(distToMouse.mul(-0.32)));
  const mouseRipple = ripple1
    .mul(0.6)
    .add(ripple2.mul(0.3))
    .mul(smoothstep(12, 0, distToMouse))
    .mul(pointerSpeedUniform.mul(3).add(0.85));
  const ambient1 = mx_noise_float(vec3(Nodes.positionLocal.xz.mul(0.3), time.mul(0.2))).mul(0.3);
  const ambient2 = sin(Nodes.positionLocal.x.mul(0.5).add(time.mul(0.4)))
    .mul(cos(Nodes.positionLocal.z.mul(0.3).add(time.mul(0.3))))
    .mul(0.15);
  const proximity = smoothstep(4, 0, distToMouse);
  const routeLift = route.mul(scan.mul(0.34).add(routePulse.mul(1.4)).add(0.12));
  const nodeLift = node.mul(0.32).add(nodePulse.mul(2.8));
  const lift = proximity.mul(1.05);
  const jitter = random.mul(0.05).mul(sin(time.mul(2).add(random.mul(100))));
  const height = mouseRipple
    .add(ambient1)
    .add(ambient2)
    .add(lift)
    .add(routeLift)
    .add(nodeLift)
    .add(jitter);
  const displacedPosition = Nodes.positionLocal.add(vec3(0, height, 0));
  const heightMix = clamp(height.add(0.3).div(2.6), 0, 1);
  const routeEnergy = clamp(route.mul(0.42).add(routePulse.mul(0.58)).add(nodePulse.mul(0.8)), 0, 1);
  const voidCyan = color("#010505");
  const deepCyan = color("#032123");
  const brightCyan = color("#55efe4");
  const softWhite = color("#f2efe6");
  const lowColor = mix(voidCyan, deepCyan, smoothstep(0, 0.2, heightMix));
  const midColor = mix(lowColor, brightCyan, smoothstep(0.2, 0.5, heightMix));
  const routeColor = mix(midColor, brightCyan, routeEnergy);
  const finalColor = mix(routeColor, softWhite, smoothstep(0.58, 1, heightMix).add(nodePulse.mul(0.42))).add(
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
  material.opacityNode = heightMix
    .mul(0.34)
    .add(proximity.mul(0.28))
    .add(routeEnergy.mul(0.32))
    .add(0.12);
  material.positionNode = displacedPosition;
  material.sizeNode = random
    .mul(0.24)
    .add(0.64)
    .add(proximity.mul(0.9))
    .add(routeEnergy.mul(1.3))
    .add(node.mul(2.4))
    .mul(float(1.22));

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
