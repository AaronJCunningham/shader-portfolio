const fragmentShader = /*glsl*/`
varying float vBrightness;
varying float vAlpha;

void main() {
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);
  if (dist > 0.5) discard;

  float alpha = (1.0 - smoothstep(0.1, 0.5, dist)) * vAlpha * 0.5;

  // Blue-white palette based on brightness
  vec3 darkBlue = vec3(0.01, 0.02, 0.1);
  vec3 medBlue = vec3(0.15, 0.3, 0.85);
  vec3 brightWhite = vec3(0.6, 0.75, 1.0);

  float t = clamp(vBrightness, 0.0, 1.0);
  vec3 color = mix(darkBlue, medBlue, smoothstep(0.0, 0.5, t));
  color = mix(color, brightWhite, smoothstep(0.6, 1.0, t));

  gl_FragColor = vec4(color, alpha);
}
`

export default fragmentShader;
