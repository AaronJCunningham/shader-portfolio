const fragmentShader = /*glsl*/`
varying float vHeight;
varying float vMouseProximity;

void main() {
  // Circular point
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);
  if (dist > 0.5) discard;

  float edgeFade = 1.0 - smoothstep(0.1, 0.5, dist);

  // Color: height-mapped from deep dark blue to bright blue to white tips
  vec3 voidBlue = vec3(0.005, 0.01, 0.06);
  vec3 deepBlue = vec3(0.03, 0.08, 0.25);
  vec3 brightBlue = vec3(0.15, 0.4, 0.95);
  vec3 white = vec3(0.7, 0.85, 1.0);

  float h = clamp((vHeight + 0.3) / 2.0, 0.0, 1.0);

  vec3 color = mix(voidBlue, deepBlue, smoothstep(0.0, 0.2, h));
  color = mix(color, brightBlue, smoothstep(0.2, 0.5, h));
  color = mix(color, white, smoothstep(0.6, 1.0, h));

  // Mouse proximity adds extra brightness
  color += vMouseProximity * vec3(0.1, 0.15, 0.3);

  // Alpha: base is dim, peaks and mouse-near particles are brighter
  float alpha = edgeFade * (0.2 + h * 0.4 + vMouseProximity * 0.3);

  gl_FragColor = vec4(color, alpha);
}
`

export default fragmentShader;
