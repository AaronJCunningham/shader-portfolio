import type { WebGPURuntimeScene } from "./WebGPUSceneOne";

const BAND_COUNT = 18;
const PARTICLES_PER_BAND = 640;
const PARTICLE_COUNT = BAND_COUNT * PARTICLES_PER_BAND;
const TAU = Math.PI * 2;

export function createWebGPUSceneThree(THREE: any, Nodes: any): WebGPURuntimeScene {
  const {
    PointsNodeMaterial,
    abs,
    attribute,
    clamp,
    color,
    cos,
    distance,
    mix,
    pow,
    sin,
    smoothstep,
    timerGlobal,
    uniform,
    vec2,
    vec3,
  } = Nodes;

  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const uValues = new Float32Array(PARTICLE_COUNT);
  const bands = new Float32Array(PARTICLE_COUNT);
  const sides = new Float32Array(PARTICLE_COUNT);
  const depths = new Float32Array(PARTICLE_COUNT);
  const streamOffsets = new Float32Array(PARTICLE_COUNT);
  const seeds = new Float32Array(PARTICLE_COUNT);
  const large = new Float32Array(PARTICLE_COUNT);
  const colorMixes = new Float32Array(PARTICLE_COUNT);

  for (let b = 0; b < BAND_COUNT; b += 1) {
    const bandT = b / (BAND_COUNT - 1);
    const side = bandT * 2 - 1;
    const depth = (Math.random() - 0.5) * 2.2;
    const streamOffset = Math.random() * TAU;

    for (let i = 0; i < PARTICLES_PER_BAND; i += 1) {
      const index = b * PARTICLES_PER_BAND + i;
      const t = i / (PARTICLES_PER_BAND - 1);

      uValues[index] = t * 2 - 1;
      bands[index] = b;
      sides[index] = side;
      depths[index] = depth;
      streamOffsets[index] = streamOffset;
      seeds[index] = Math.random();
      large[index] = Math.random() < 0.014 ? 1 : 0;

      const colorRoll = Math.random();
      if (colorRoll < 0.2) {
        colorMixes[index] = 0.82 + Math.random() * 0.18;
      } else if (colorRoll < 0.52) {
        colorMixes[index] = 0.28 + Math.random() * 0.42;
      } else {
        colorMixes[index] = Math.random() * 0.18;
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aU", new THREE.BufferAttribute(uValues, 1));
  geometry.setAttribute("aBand", new THREE.BufferAttribute(bands, 1));
  geometry.setAttribute("aSide", new THREE.BufferAttribute(sides, 1));
  geometry.setAttribute("aDepth", new THREE.BufferAttribute(depths, 1));
  geometry.setAttribute("aStreamOffset", new THREE.BufferAttribute(streamOffsets, 1));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute("aLarge", new THREE.BufferAttribute(large, 1));
  geometry.setAttribute("aColorMix", new THREE.BufferAttribute(colorMixes, 1));

  const pointerUniform = uniform(new THREE.Vector2(0, 0));
  const pointerSpeedUniform = uniform(0);
  const time = timerGlobal();
  const u = attribute("aU", "float");
  const band = attribute("aBand", "float");
  const side = attribute("aSide", "float");
  const depth = attribute("aDepth", "float");
  const streamOffset = attribute("aStreamOffset", "float");
  const seed = attribute("aSeed", "float");
  const largeNode = attribute("aLarge", "float");
  const colorMix = attribute("aColorMix", "float");
  const stream = u.mul(TAU).add(streamOffset);
  const drift = time.mul(band.mul(0.012).add(0.22));
  const bandPhase = band.mul(0.72).add(streamOffset);
  const carrier = sin(stream.mul(1.05).add(drift).add(bandPhase));
  const interferenceA = sin(stream.mul(2.7).sub(drift.mul(1.6)).add(seed.mul(TAU)));
  const interferenceB = cos(stream.mul(4.8).add(drift.mul(0.85)).add(side.mul(2.0)));
  const baseX = u.mul(7.6)
    .add(carrier.mul(0.18))
    .add(sin(stream.mul(0.38).add(drift)).mul(0.32));
  const laneY = side.mul(2.65);
  const baseY = laneY
    .add(carrier.mul(0.48))
    .add(interferenceA.mul(0.2))
    .add(interferenceB.mul(0.06));
  const baseZ = depth
    .add(cos(stream.mul(0.82).add(drift.mul(0.7))).mul(0.72))
    .add(carrier.mul(0.18));
  const twist = sin(u.mul(4.0).add(time.mul(0.16)).add(side)).mul(0.28);
  const c = cos(twist);
  const s = sin(twist);
  const twistedY = baseY.mul(c).sub(baseZ.mul(s));
  const twistedZ = baseY.mul(s).add(baseZ.mul(c));
  const pointerWorld = vec2(pointerUniform.x.mul(4.5), pointerUniform.y.mul(3.6));
  const distToPointer = distance(vec2(baseX, twistedY), pointerWorld);
  const prox = smoothstep(2.4, 0, distToPointer);
  const core = smoothstep(0.65, 0, distToPointer);
  const pointerWave = sin(distToPointer.mul(8).sub(time.mul(5.6)).add(streamOffset))
    .mul(prox)
    .mul(pointerSpeedUniform.mul(3.2).add(0.45));
  const pluck = sin(stream.mul(7).add(time.mul(2.4))).mul(prox).mul(0.22);
  const finalY = twistedY.add(pluck).add(pointerWave.mul(0.1));
  const finalZ = twistedZ.add(prox.mul(0.46)).add(pointerWave.mul(0.48));
  const position = vec3(baseX, finalY, finalZ);
  const crossing = smoothstep(0.55, 0, abs(finalY.sub(laneY)));
  const travelingPulse = pow(
    sin(u.mul(18).sub(time.mul(3.2)).add(streamOffset)).mul(0.5).add(0.5),
    10,
  );
  const sparkle = pow(sin(seed.mul(40).add(time.mul(0.85))).mul(0.5).add(0.5), 9);
  const energy = clamp(
    crossing.mul(0.28)
      .add(prox.mul(0.62))
      .add(core.mul(0.3))
      .add(travelingPulse.mul(0.58))
      .add(sparkle.mul(0.18)),
    0,
    1,
  );
  const bandMix = band.div(BAND_COUNT - 1);
  const voidCyan = color("#010505");
  const deepCyan = color("#032123");
  const brightCyan = color("#55efe4");
  const softWhite = color("#f2efe6");
  const darkColor = mix(voidCyan, deepCyan, bandMix.mul(0.25).add(0.55));
  const activeColor = mix(darkColor, brightCyan, smoothstep(0.18, 0.78, energy));
  const colorWithWhite = mix(activeColor, softWhite, colorMix.mul(0.78));
  const finalColor = mix(colorWithWhite, softWhite, energy.mul(0.42).add(core.mul(0.28)).add(0.1));

  const material = new PointsNodeMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0,
    size: 3,
  });

  material.colorNode = finalColor;
  material.opacityNode = energy.mul(0.52).add(prox.mul(0.16)).add(colorMix.mul(0.08)).add(0.08);
  material.positionNode = position;
  material.sizeNode = seed
    .mul(0.9)
    .add(0.58)
    .add(energy.mul(2.2))
    .add(core.mul(1.0))
    .mul(mix(1.0, 2.65, largeNode))
    .mul(1.45);

  const points = new THREE.Points(geometry, material);
  points.position.set(0, 0, -9);

  const group = new THREE.Group();
  group.add(points);

  const previousPointer = new THREE.Vector2(0, 0);
  let pointerSpeed = 0;

  const update = ({ pointer, time: elapsed }: { pointer: { x: number; y: number }; time: number }) => {
    const dx = pointer.x - previousPointer.x;
    const dy = pointer.y - previousPointer.y;
    const speed = Math.sqrt(dx * dx + dy * dy);

    pointerSpeed += (speed - pointerSpeed) * 0.14;
    pointerUniform.value.set(pointer.x, pointer.y);
    pointerSpeedUniform.value = pointerSpeed;
    previousPointer.set(pointer.x, pointer.y);
    points.rotation.y = Math.sin(elapsed * 0.052) * 0.12;
    points.rotation.z = Math.sin(elapsed * 0.035) * 0.035;
  };

  return {
    group,
    materials: [material],
    interaction: 0,
    baseScale: 1,
    update,
  };
}
