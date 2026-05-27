import type { WebGPURuntimeScene } from "./WebGPUSceneOne";

const BAND_COUNT = 11;
const PARTICLES_PER_BAND = 760;
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
  const seeds = new Float32Array(PARTICLE_COUNT);
  const large = new Float32Array(PARTICLE_COUNT);
  const colorMixes = new Float32Array(PARTICLE_COUNT);

  for (let b = 0; b < BAND_COUNT; b += 1) {
    for (let i = 0; i < PARTICLES_PER_BAND; i += 1) {
      const index = b * PARTICLES_PER_BAND + i;
      const t = i / (PARTICLES_PER_BAND - 1);

      uValues[index] = t * 2 - 1;
      bands[index] = b;
      sides[index] = (b - (BAND_COUNT - 1) * 0.5) / ((BAND_COUNT - 1) * 0.5);
      seeds[index] = Math.random();
      large[index] = Math.random() < 0.02 ? 1 : 0;

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
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute("aLarge", new THREE.BufferAttribute(large, 1));
  geometry.setAttribute("aColorMix", new THREE.BufferAttribute(colorMixes, 1));

  const pointerUniform = uniform(new THREE.Vector2(0, 0));
  const time = timerGlobal();
  const u = attribute("aU", "float");
  const band = attribute("aBand", "float");
  const side = attribute("aSide", "float");
  const seed = attribute("aSeed", "float");
  const largeNode = attribute("aLarge", "float");
  const colorMix = attribute("aColorMix", "float");
  const stream = u.mul(TAU);
  const drift = time.mul(band.mul(0.018).add(0.18));
  const bandPhase = band.mul(0.92);
  const foldA = sin(stream.mul(1.35).add(drift).add(bandPhase));
  const foldB = sin(stream.mul(2.15).sub(drift.mul(1.4)).add(seed.mul(TAU)));
  const foldC = cos(stream.mul(0.7).add(drift.mul(0.8)).add(bandPhase));
  const baseX = u.mul(7).add(sin(stream.mul(0.42).add(bandPhase).add(drift)).mul(0.35));
  const baseY = side.mul(band.mul(0.045).add(0.18))
    .add(foldA.mul(band.mul(0.018).add(0.55)))
    .add(foldB.mul(0.16))
    .mul(1.9);
  const baseZ = foldC.mul(1.1).add(foldA.mul(0.25)).mul(1.18);
  const twist = sin(u.mul(3).add(time.mul(0.12))).mul(0.22);
  const c = cos(twist);
  const s = sin(twist);
  const twistedY = baseY.mul(c).sub(baseZ.mul(s));
  const twistedZ = baseY.mul(s).add(baseZ.mul(c));
  const pointerWorld = vec2(pointerUniform.x.mul(4.5), pointerUniform.y.mul(3.6));
  const distToPointer = distance(vec2(baseX, twistedY), pointerWorld);
  const prox = smoothstep(2.1, 0, distToPointer);
  const finalY = twistedY.add(prox.mul(sin(stream.mul(4).add(time.mul(1.8))).mul(0.18)));
  const finalZ = twistedZ.add(prox.mul(0.9));
  const position = vec3(baseX, finalY, finalZ);
  const crossing = smoothstep(0.95, 0, abs(finalY));
  const sparkle = pow(sin(seed.mul(40).add(time.mul(0.85))).mul(0.5).add(0.5), 7);
  const energy = clamp(crossing.mul(0.55).add(prox.mul(0.75)).add(sparkle.mul(0.45)), 0, 1);
  const bandMix = band.div(10);
  const voidCyan = color("#010505");
  const deepCyan = color("#032123");
  const brightCyan = color("#55efe4");
  const softWhite = color("#f2efe6");
  const darkColor = mix(voidCyan, deepCyan, bandMix.mul(0.25).add(0.55));
  const activeColor = mix(darkColor, brightCyan, smoothstep(0.18, 0.78, energy));
  const colorWithWhite = mix(activeColor, softWhite, colorMix.mul(0.78));
  const finalColor = mix(colorWithWhite, softWhite, energy.mul(0.46).add(prox.mul(0.14)).add(0.12));

  const material = new PointsNodeMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0,
    size: 3,
  });

  material.colorNode = finalColor;
  material.opacityNode = energy.mul(0.38).add(prox.mul(0.16)).add(colorMix.mul(0.12)).add(0.16);
  material.positionNode = position;
  material.sizeNode = seed
    .mul(0.9)
    .add(0.8)
    .add(energy.mul(1.8))
    .mul(mix(1.0, 2.65, largeNode))
    .mul(1.65);

  const points = new THREE.Points(geometry, material);
  points.position.set(0, 0, -9);

  const group = new THREE.Group();
  group.add(points);

  const update = ({ pointer, time: elapsed }: { pointer: { x: number; y: number }; time: number }) => {
    pointerUniform.value.set(pointer.x, pointer.y);
    points.rotation.y = Math.sin(elapsed * 0.056) * 0.16;
    points.rotation.z = Math.sin(elapsed * 0.035) * 0.05;
  };

  return {
    group,
    materials: [material],
    interaction: 0,
    baseScale: 1,
    update,
  };
}
