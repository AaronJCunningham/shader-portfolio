type PointerState = {
  x: number;
  y: number;
};

export type WebGPURuntimeScene = {
  group: any;
  materials: any[];
  interaction: number;
  baseScale: number;
  update?: (state: { pointer: PointerState; time: number }) => void;
};

export function createWebGPUSceneOne(THREE: any, Nodes: any): WebGPURuntimeScene {
  const {
    PointsNodeMaterial,
    attribute,
    clamp,
    color,
    distance,
    float,
    mix,
    mx_fractal_noise_float,
    mx_noise_float,
    normalize,
    positionLocal,
    sin,
    smoothstep,
    timerGlobal,
    uniform,
    vec3,
  } = Nodes;

  const particleCount = 15000;
  const positions = new Float32Array(particleCount * 3);
  const pointSizes = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i += 1) {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / particleCount);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const radius = 3.5;

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);
    pointSizes[i] = 1;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("pointSize", new THREE.BufferAttribute(pointSizes, 1));

  const pointerUniform = uniform(new THREE.Vector2(0, 0));
  const time = timerGlobal();
  const normal = normalize(positionLocal);
  const mouseDir = vec3(pointerUniform.x.mul(5), pointerUniform.y.mul(5), 0);
  const mouseDist = distance(positionLocal.xy, mouseDir.xy);
  const mouseEffect = smoothstep(3.5, 0, mouseDist).mul(0.6);
  const mouseRepulse = smoothstep(2.5, 0, mouseDist).mul(0.8);
  const noise1 = mx_fractal_noise_float(normal.mul(2).add(time.mul(0.15)), 4, 2, 0.5);
  const noise2 = mx_noise_float(normal.mul(4).sub(time.mul(0.25))).mul(0.3);
  const displacement = noise1
    .add(noise2)
    .add(mouseEffect.mul(sin(time.mul(4).add(mouseDist.mul(3)))));
  const displacedPosition = positionLocal
    .add(normal.mul(displacement.mul(0.8)))
    .add(normalize(positionLocal.sub(mouseDir)).mul(mouseRepulse));
  const displacementColor = clamp(displacement.add(0.3).div(1.2), 0, 1);
  const cyanMix = smoothstep(0, 0.6, displacementColor);
  const whiteMix = smoothstep(0.7, 1, displacementColor);
  const cyan = mix(color("#011416"), color("#55efe4"), cyanMix);
  const finalColor = mix(cyan, color("#f2efe6"), whiteMix);

  const material = new PointsNodeMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0,
    size: 3,
  });

  material.colorNode = finalColor;
  material.opacityNode = float(0.4);
  material.positionNode = displacedPosition;
  material.sizeNode = attribute("pointSize", "float").mul(
    float(1)
      .add(displacement.mul(0.5))
      .add(mouseRepulse.mul(1.5))
      .mul(2.4),
  );

  const points = new THREE.Points(geometry, material);
  points.position.set(0, 0, -10);

  const group = new THREE.Group();
  group.add(points);

  const update = ({ pointer }: { pointer: PointerState; time: number }) => {
    pointerUniform.value.set(pointer.x, pointer.y);
    points.rotation.y += 0.001;
  };

  return {
    group,
    materials: [material],
    interaction: 0,
    baseScale: 1,
    update,
  };
}
