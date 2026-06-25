const fragmentShader = /*glsl*/`
varying float vDisplacement;
varying float vDistToCamera;

void main() {
  // Circular point shape
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);
  if (dist > 0.5) discard;

  // Soft edge falloff with a modest lift for weak displays.
  float edgeFade = 1.0 - smoothstep(0.1, 0.5, dist);
  float core = 1.0 - smoothstep(0.0, 0.14, dist);
  float alpha = edgeFade * (0.5 + core * 0.16);

  // Color based on displacement: deep cyan valleys, bright cyan peaks, soft off-white tips
  vec3 deepCyan = vec3(0.02, 0.16, 0.17);
  vec3 brightCyan = vec3(0.42, 1.0, 0.95);
  vec3 softWhite = vec3(0.98, 1.0, 0.96);

  float t = clamp((vDisplacement + 0.3) / 1.2, 0.0, 1.0);
  vec3 color = mix(deepCyan, brightCyan, smoothstep(0.0, 0.6, t));
  color = mix(color, softWhite, smoothstep(0.7, 1.0, t));
  color = mix(color, softWhite, core * 0.18);

  gl_FragColor = vec4(color, alpha);
}
`

export default fragmentShader;
