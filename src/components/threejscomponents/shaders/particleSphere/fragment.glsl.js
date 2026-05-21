const fragmentShader = /*glsl*/`
varying float vDisplacement;
varying float vDistToCamera;

void main() {
  // Circular point shape
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);
  if (dist > 0.5) discard;

  // Soft edge falloff — much more transparent
  float alpha = (1.0 - smoothstep(0.1, 0.5, dist)) * 0.4;

  // Color based on displacement: deep cyan valleys, bright cyan peaks, soft off-white tips
  vec3 deepCyan = vec3(0.005, 0.08, 0.09);
  vec3 brightCyan = vec3(0.333, 0.937, 0.894);
  vec3 softWhite = vec3(0.949, 0.941, 0.918);

  float t = clamp((vDisplacement + 0.3) / 1.2, 0.0, 1.0);
  vec3 color = mix(deepCyan, brightCyan, smoothstep(0.0, 0.6, t));
  color = mix(color, softWhite, smoothstep(0.7, 1.0, t));

  gl_FragColor = vec4(color, alpha);
}
`

export default fragmentShader;
