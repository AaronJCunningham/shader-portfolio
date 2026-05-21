const fragmentShader = /*glsl*/`
precision highp float;

varying float vEnergy;
varying float vProximity;
varying float vBand;
varying float vColorMix;

void main() {
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);
  if (dist > 0.5) discard;

  float edgeFade = 1.0 - smoothstep(0.08, 0.5, dist);
  float core = 1.0 - smoothstep(0.0, 0.12, dist);

  vec3 voidCyan = vec3(0.003, 0.018, 0.02);
  vec3 deepCyan = vec3(0.01, 0.13, 0.14);
  vec3 brightCyan = vec3(0.333, 0.937, 0.894);
  vec3 softWhite = vec3(0.949, 0.941, 0.918);

  vec3 color = mix(voidCyan, deepCyan, 0.55 + vBand * 0.25);
  color = mix(color, brightCyan, smoothstep(0.18, 0.78, vEnergy));
  color = mix(color, softWhite, vColorMix * 0.78);
  color = mix(color, softWhite, core * (0.12 + vEnergy * 0.46 + vProximity * 0.14));

  float alpha = edgeFade * (0.16 + vEnergy * 0.38 + vProximity * 0.16 + vColorMix * 0.12);

  gl_FragColor = vec4(color, alpha);
}
`;

export default fragmentShader;
