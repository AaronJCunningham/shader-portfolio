const fragmentShader = /*glsl*/`
varying float vDisplacement;
varying float vDistToCamera;

void main() {
  // Circular point shape
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);
  if (dist > 0.5) discard;

  // Soft edge falloff — much more transparent
  float alpha = (1.0 - smoothstep(0.1, 0.5, dist)) * 0.35;

  // Color based on displacement: deep blue in valleys, bright blue at peaks
  vec3 deepBlue = vec3(0.01, 0.03, 0.12);
  vec3 brightBlue = vec3(0.2, 0.4, 1.0);
  vec3 white = vec3(0.7, 0.8, 1.0);

  float t = clamp((vDisplacement + 0.3) / 1.2, 0.0, 1.0);
  vec3 color = mix(deepBlue, brightBlue, smoothstep(0.0, 0.6, t));
  color = mix(color, white, smoothstep(0.7, 1.0, t));

  gl_FragColor = vec4(color, alpha);
}
`

export default fragmentShader;
