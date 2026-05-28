const vertexShader = /*glsl*/`
uniform float uTime;
uniform vec2 uPointer;
uniform vec2 uRibbonScale;

attribute float aU;
attribute float aBand;
attribute float aSide;
attribute float aSeed;
attribute float aLarge;
attribute float aColorMix;

varying float vEnergy;
varying float vProximity;
varying float vBand;
varying float vColorMix;

const float TAU = 6.28318530718;

void main() {
  float u = aU;
  float band = aBand;
  float side = aSide;

  float stream = u * TAU;
  float drift = uTime * (0.18 + band * 0.018);
  float bandPhase = band * 0.92;

  vec3 pos;
  pos.x = u * 7.0;
  pos.y = side * (0.18 + band * 0.045);
  pos.z = 0.0;

  float foldA = sin(stream * 1.35 + drift + bandPhase);
  float foldB = sin(stream * 2.15 - drift * 1.4 + aSeed * TAU);
  float foldC = cos(stream * 0.7 + drift * 0.8 + bandPhase);

  pos.y += foldA * (0.55 + band * 0.018) + foldB * 0.16;
  pos.z += foldC * 1.1 + foldA * 0.25;
  pos.x += sin(stream * 0.42 + bandPhase + drift) * 0.35;

  pos.y *= 1.9;
  pos.z *= 1.18;

  pos.xy *= uRibbonScale;
  pos.z *= mix(uRibbonScale.x, uRibbonScale.y, 0.5);

  float twist = 0.22 * sin(u * 3.0 + uTime * 0.12);
  float c = cos(twist);
  float s = sin(twist);
  pos.yz = mat2(c, -s, s, c) * pos.yz;

  vec2 pointerWorld = uPointer * vec2(4.5, 3.6) * uRibbonScale;
  float distToPointer = length(pos.xy - pointerWorld);
  float prox = smoothstep(2.1, 0.0, distToPointer);
  pos.z += prox * 0.9;
  pos.y += prox * sin(stream * 4.0 + uTime * 1.8) * 0.18;

  float crossing = 1.0 - smoothstep(0.0, 0.95, abs(pos.y));
  float sparkle = pow(0.5 + 0.5 * sin(aSeed * 40.0 + uTime * 0.85), 7.0);

  vEnergy = clamp(crossing * 0.55 + prox * 0.75 + sparkle * 0.45, 0.0, 1.0);
  vProximity = prox;
  vBand = band / 10.0;
  vColorMix = aColorMix;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  float largeBoost = mix(1.0, 2.65, aLarge);
  gl_PointSize = (0.8 + aSeed * 0.9 + vEnergy * 1.8) * largeBoost * (28.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

export default vertexShader;
