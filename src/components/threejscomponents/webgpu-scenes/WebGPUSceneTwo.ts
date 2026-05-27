import type { WebGPURuntimeScene } from "./WebGPUSceneOne";

export function createWebGPUSceneTwo(THREE: any, Nodes: any): WebGPURuntimeScene {
  const {
    PointsNodeMaterial,
    attribute,
    color,
    cos,
    distance,
    exp,
    mix,
    pow,
    sin,
    smoothstep,
    timerGlobal,
    uniform,
    vec2,
    vec3,
  } = Nodes;

  const particleCount = 5000;
  const positions = new Float32Array(particleCount * 3);
  const basePositions = new Float32Array(particleCount * 3);
  const phases = new Float32Array(particleCount * 3);
  const seeds = new Float32Array(particleCount);
  const large = new Float32Array(particleCount);
  const colorMixes = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i += 1) {
    const i3 = i * 3;
    const gx = (Math.random() + Math.random() + Math.random() - 1.5) * 3.2;
    const gy = (Math.random() + Math.random() + Math.random() - 1.5) * 1.25;
    const gz = (Math.random() + Math.random() + Math.random() - 1.5) * 1.8;

    positions[i3] = gx;
    positions[i3 + 1] = gy;
    positions[i3 + 2] = gz;
    basePositions[i3] = gx;
    basePositions[i3 + 1] = gy;
    basePositions[i3 + 2] = gz;
    phases[i3] = Math.random() * Math.PI * 2;
    phases[i3 + 1] = Math.random() * Math.PI * 2;
    phases[i3 + 2] = Math.random() * Math.PI * 2;
    seeds[i] = Math.random();
    large[i] = Math.random() < 0.02 ? 1 : 0;

    const colorRoll = Math.random();
    if (colorRoll < 0.2) {
      colorMixes[i] = 0.82 + Math.random() * 0.18;
    } else if (colorRoll < 0.52) {
      colorMixes[i] = 0.28 + Math.random() * 0.42;
    } else {
      colorMixes[i] = Math.random() * 0.18;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aBasePos", new THREE.BufferAttribute(basePositions, 3));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute("aLarge", new THREE.BufferAttribute(large, 1));
  geometry.setAttribute("aColorMix", new THREE.BufferAttribute(colorMixes, 1));

  const pointerUniform = uniform(new THREE.Vector2(0, 0));
  const time = timerGlobal();
  const basePos = attribute("aBasePos", "vec3");
  const phase = attribute("aPhase", "vec3");
  const seed = attribute("aSeed", "float");
  const largeNode = attribute("aLarge", "float");
  const colorMix = attribute("aColorMix", "float");
  const amp = seed.mul(0.16).add(0.12);
  const shimmer = vec3(
    sin(time.mul(0.18).add(phase.x)),
    sin(time.mul(0.15).add(phase.y)),
    sin(time.mul(0.21).add(phase.z)),
  ).mul(amp);
  const shimmered = basePos.add(shimmer);
  const radius = shimmered.xz.length();
  const rotSpeed = radius.mul(0.4).add(0.6).reciprocal().mul(0.12);
  const angle = time.mul(rotSpeed);
  const c = cos(angle);
  const s = sin(angle);
  const rotated = vec3(
    shimmered.x.mul(c).sub(shimmered.z.mul(s)),
    shimmered.y,
    shimmered.x.mul(s).add(shimmered.z.mul(c)),
  );
  const mouseWorld = vec2(pointerUniform.x.mul(2.8), pointerUniform.y.mul(2.0));
  const distXY = distance(rotated.xy, mouseWorld);
  const prox = smoothstep(4.0, 0.0, distXY);
  const magnetic = pow(prox, 1.35);
  const pullDir = mouseWorld.sub(rotated.xy);
  const pulledXY = rotated.xy.add(pullDir.mul(magnetic).mul(seed.mul(0.28).add(0.38)));
  const finalPosition = vec3(pulledXY.x, pulledXY.y, rotated.z.add(magnetic.mul(0.55)));
  const centerDist = basePos.length();
  const glow = seed.mul(0.65).add(0.35);
  const centerHot = exp(centerDist.mul(-0.55));
  const cyanDim = color("#0f6661");
  const cyanBright = color("#2eb8ad");
  const hot = color("#bffff2");
  const nebulaMix = glow.mul(0.45).add(centerHot.mul(0.32));
  const baseColor = mix(cyanDim, cyanBright, nebulaMix);
  const hotColor = mix(baseColor, hot, colorMix.mul(0.72));
  const finalColor = mix(hotColor, hot, prox.mul(0.24).add(centerHot.mul(0.16)));

  const material = new PointsNodeMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0,
    size: 3,
  });

  material.colorNode = finalColor;
  material.opacityNode = prox.mul(0.12).add(colorMix.mul(0.1)).add(0.72);
  material.positionNode = finalPosition;
  material.sizeNode = seed
    .mul(1.8)
    .add(1.0)
    .add(prox.mul(0.75))
    .mul(mix(1.0, 2.65, largeNode))
    .mul(2.2);

  const points = new THREE.Points(geometry, material);
  points.position.set(0, 0, -8);

  const group = new THREE.Group();
  group.add(points);

  const update = ({ pointer }: { pointer: { x: number; y: number }; time: number }) => {
    pointerUniform.value.set(pointer.x, pointer.y);
  };

  return {
    group,
    materials: [material],
    interaction: 0,
    baseScale: 1,
    update,
  };
}
