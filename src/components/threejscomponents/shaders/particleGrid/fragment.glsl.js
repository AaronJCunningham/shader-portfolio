const fragmentShader = /*glsl*/`
varying float vHeight;
varying float vMouseProximity;

void main() {
  // Circular point
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);
  if (dist > 0.5) discard;

  float edgeFade = 1.0 - smoothstep(0.1, 0.5, dist);

  // Color: height-mapped from deep dark cyan to bright cyan to soft off-white tips
  float core = 1.0 - smoothstep(0.0, 0.13, dist);

  vec3 voidCyan = vec3(0.01, 0.06, 0.065);
  vec3 deepCyan = vec3(0.02, 0.18, 0.19);
  vec3 brightCyan = vec3(0.42, 1.0, 0.95);
  vec3 softWhite = vec3(0.98, 1.0, 0.96);

  float h = clamp((vHeight + 0.3) / 2.0, 0.0, 1.0);

  vec3 color = mix(voidCyan, deepCyan, smoothstep(0.0, 0.2, h));
  color = mix(color, brightCyan, smoothstep(0.2, 0.5, h));
  color = mix(color, softWhite, smoothstep(0.58, 1.0, h));
  color = mix(color, softWhite, core * 0.16);

  // Mouse proximity adds extra brightness
  color += vMouseProximity * vec3(0.09, 0.24, 0.23);

  // Alpha: base is dim, peaks and mouse-near particles are brighter
  float alpha = edgeFade * (0.3 + h * 0.46 + vMouseProximity * 0.32 + core * 0.08);

  gl_FragColor = vec4(color, alpha);
}
`

export default fragmentShader;
