import type { WebGPURuntimeScene } from "./WebGPUSceneOne";

export function createWebGPUSceneTwo(THREE: any, Nodes: any): WebGPURuntimeScene {
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
    pow,
    sin,
    smoothstep,
    timerGlobal,
    uniform,
    vec2,
    vec3,
  } = Nodes;

  const agentCount = 180;
  const trailLength = 96;
  const particleCount = agentCount * trailLength;
  const TAU = Math.PI * 2;
  const positions = new Float32Array(particleCount * 3);
  const agentSeeds = new Float32Array(particleCount);
  const trailProgresses = new Float32Array(particleCount);
  const orbitRadii = new Float32Array(particleCount);
  const depthOffsets = new Float32Array(particleCount);
  const phaseOffsets = new Float32Array(particleCount);
  const attractorIndexes = new Float32Array(particleCount);
  const colorMixes = new Float32Array(particleCount);
  const large = new Float32Array(particleCount);

  for (let agent = 0; agent < agentCount; agent += 1) {
    const seed = Math.random();
    const radius = 0.8 + Math.pow(Math.random(), 0.55) * 3.25;
    const depth = (Math.random() - 0.5) * 2.7;
    const phase = Math.random() * TAU;
    const attractorIndex = Math.floor(Math.random() * 3);
    const colorMix = Math.pow(Math.random(), 2.2);

    for (let segment = 0; segment < trailLength; segment += 1) {
      const index = agent * trailLength + segment;

      agentSeeds[index] = seed;
      trailProgresses[index] = segment / (trailLength - 1);
      orbitRadii[index] = radius;
      depthOffsets[index] = depth;
      phaseOffsets[index] = phase;
      attractorIndexes[index] = attractorIndex;
      colorMixes[index] = colorMix;
      large[index] = segment === 0 || Math.random() < 0.006 ? 1 : 0;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(agentSeeds, 1));
  geometry.setAttribute("aTrail", new THREE.BufferAttribute(trailProgresses, 1));
  geometry.setAttribute("aRadius", new THREE.BufferAttribute(orbitRadii, 1));
  geometry.setAttribute("aDepth", new THREE.BufferAttribute(depthOffsets, 1));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phaseOffsets, 1));
  geometry.setAttribute("aAttractor", new THREE.BufferAttribute(attractorIndexes, 1));
  geometry.setAttribute("aColorMix", new THREE.BufferAttribute(colorMixes, 1));
  geometry.setAttribute("aLarge", new THREE.BufferAttribute(large, 1));

  const pointerUniform = uniform(new THREE.Vector2(0, 0));
  const pointerSpeedUniform = uniform(0);
  const time = timerGlobal();
  const seed = attribute("aSeed", "float");
  const trail = attribute("aTrail", "float");
  const radius = attribute("aRadius", "float");
  const depth = attribute("aDepth", "float");
  const phase = attribute("aPhase", "float");
  const attractor = attribute("aAttractor", "float");
  const colorMix = attribute("aColorMix", "float");
  const largeNode = attribute("aLarge", "float");
  const tail = pow(trail, 1.45);
  const head = float(1).sub(trail);
  const attractorA = vec3(-2.35, 0.68, -0.25);
  const attractorB = vec3(1.92, -0.28, 0.35);
  const attractorC = vec3(0.28, 1.25, -0.62);
  const attractorAB = mix(attractorA, attractorB, smoothstep(0.35, 1.35, attractor));
  const attractorPosition = mix(attractorAB, attractorC, smoothstep(1.35, 2.35, attractor));
  const delayedTime = time.sub(tail.mul(2.65));
  const spin = delayedTime.mul(seed.mul(0.34).add(0.36)).add(phase);
  const wobble = sin(delayedTime.mul(0.42).add(seed.mul(19))).mul(0.36);
  const eccentricity = sin(seed.mul(31)).mul(0.34).add(1.0);
  const orbitX = cos(spin).mul(radius).mul(eccentricity);
  const orbitY = sin(spin.mul(1.18).add(wobble)).mul(radius.mul(0.48));
  const orbitZ = sin(spin.mul(0.72).add(phase)).mul(radius.mul(0.42)).add(depth);
  const secondarySpin = spin.mul(-0.72).add(seed.mul(8.0));
  const secondary = vec3(
    cos(secondarySpin).mul(radius.mul(0.26)),
    sin(secondarySpin.mul(1.35)).mul(radius.mul(0.22)),
    cos(secondarySpin.mul(0.8)).mul(radius.mul(0.18)),
  );
  const basePosition = attractorPosition.add(vec3(orbitX, orbitY, orbitZ)).add(secondary);
  const pointerWorld = vec2(pointerUniform.x.mul(4.2), pointerUniform.y.mul(2.8));
  const distToPointer = distance(basePosition.xy, pointerWorld);
  const pointerInfluence = smoothstep(3.1, 0.0, distToPointer);
  const pointerCore = smoothstep(0.8, 0.0, distToPointer);
  const toPointer = pointerWorld.sub(basePosition.xy);
  const tangent = vec2(toPointer.y.mul(-1), toPointer.x);
  const lensPulse = sin(distToPointer.mul(8.0).sub(time.mul(6.0)).add(phase))
    .mul(exp(distToPointer.mul(-0.72)))
    .mul(pointerSpeedUniform.mul(4.0).add(0.45));
  const pulledXY = basePosition.xy
    .add(toPointer.mul(pointerInfluence).mul(head.mul(0.38).add(0.1)))
    .add(tangent.mul(pointerInfluence).mul(seed.mul(0.055).add(0.045)));
  const finalPosition = vec3(
    pulledXY.x,
    pulledXY.y.add(lensPulse.mul(0.05)),
    basePosition.z.add(pointerInfluence.mul(0.34)).add(lensPulse.mul(0.42)),
  );
  const trailGlow = pow(head, 2.15);
  const speedPulse = pow(sin(spin.mul(2.6)).mul(0.5).add(0.5), 6);
  const energy = clamp(
    trailGlow.mul(0.72).add(pointerInfluence.mul(0.78)).add(speedPulse.mul(0.22)),
    0,
    1,
  );
  const cyanDim = color("#021719");
  const cyan = color("#1aa9a3");
  const white = color("#f2efe6");
  const acid = color("#9fffe8");
  const baseColor = mix(cyanDim, cyan, energy.mul(0.8).add(colorMix.mul(0.2)));
  const hotColor = mix(baseColor, acid, pointerInfluence.mul(0.38).add(speedPulse.mul(0.2)));
  const finalColor = mix(hotColor, white, trailGlow.mul(0.3).add(pointerCore.mul(0.35)));

  const material = new PointsNodeMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0,
    size: 3,
  });

  material.colorNode = finalColor;
  material.opacityNode = energy.mul(0.56).add(pointerCore.mul(0.18)).add(0.04);
  material.positionNode = finalPosition;
  material.sizeNode = float(0.58)
    .add(trailGlow.mul(2.3))
    .add(pointerInfluence.mul(1.0))
    .mul(mix(1.0, 2.5, largeNode))
    .mul(1.45);

  const points = new THREE.Points(geometry, material);
  points.position.set(0, 0, -8.4);
  points.rotation.z = -0.08;

  const group = new THREE.Group();
  group.add(points);

  const previousPointer = new THREE.Vector2(0, 0);
  let pointerSpeed = 0;

  const update = ({ pointer, time: elapsed }: { pointer: { x: number; y: number }; time: number }) => {
    const dx = pointer.x - previousPointer.x;
    const dy = pointer.y - previousPointer.y;
    const speed = Math.sqrt(dx * dx + dy * dy);

    pointerSpeed += (speed - pointerSpeed) * 0.16;
    pointerUniform.value.set(pointer.x, pointer.y);
    pointerSpeedUniform.value = pointerSpeed;
    previousPointer.set(pointer.x, pointer.y);
    points.rotation.y = Math.sin(elapsed * 0.04) * 0.12;
    points.rotation.x = Math.sin(elapsed * 0.028) * 0.04;
  };

  return {
    group,
    materials: [material],
    interaction: 0,
    baseScale: 1,
    update,
  };
}
