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
  vec3 voidCyan = vec3(0.003, 0.018, 0.02);
  vec3 deepCyan = vec3(0.01, 0.13, 0.14);
  vec3 brightCyan = vec3(0.333, 0.937, 0.894);
  vec3 softWhite = vec3(0.949, 0.941, 0.918);

  float h = clamp((vHeight + 0.3) / 2.0, 0.0, 1.0);

  vec3 color = mix(voidCyan, deepCyan, smoothstep(0.0, 0.2, h));
  color = mix(color, brightCyan, smoothstep(0.2, 0.5, h));
  color = mix(color, softWhite, smoothstep(0.6, 1.0, h));

  // Mouse proximity adds extra brightness
  color += vMouseProximity * vec3(0.09, 0.24, 0.23);

  // Alpha: base is dim, peaks and mouse-near particles are brighter
  float alpha = edgeFade * (0.2 + h * 0.4 + vMouseProximity * 0.3);

  gl_FragColor = vec4(color, alpha);
}
`

export default fragmentShader;
