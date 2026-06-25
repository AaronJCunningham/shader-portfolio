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

  vec3 voidCyan = vec3(0.01, 0.06, 0.065);
  vec3 deepCyan = vec3(0.02, 0.18, 0.19);
  vec3 brightCyan = vec3(0.42, 1.0, 0.95);
  vec3 softWhite = vec3(0.98, 1.0, 0.96);

  vec3 color = mix(voidCyan, deepCyan, 0.55 + vBand * 0.25);
  color = mix(color, brightCyan, smoothstep(0.18, 0.78, vEnergy));
  color = mix(color, softWhite, vColorMix * 0.78);
  color = mix(color, softWhite, core * (0.2 + vEnergy * 0.5 + vProximity * 0.16));

  float alpha = edgeFade * (0.24 + vEnergy * 0.44 + vProximity * 0.18 + vColorMix * 0.14 + core * 0.08);

  gl_FragColor = vec4(color, alpha);
}
`;

export default fragmentShader;
