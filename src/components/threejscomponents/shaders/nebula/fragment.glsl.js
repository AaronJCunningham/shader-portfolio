const fragmentShader = /*glsl*/`
varying float vGlow;
varying float vMouseProx;
varying float vCenterDist;
varying float vColorMix;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;

  // Soft circular falloff
  float alpha = exp(-d * 5.5);

  // Brighter toward the cloud's center
  float centerHot = exp(-vCenterDist * 0.55);

  float core = 1.0 - smoothstep(0.0, 0.15, d);

  vec3 cyanDim    = vec3(0.08, 0.48, 0.45);
  vec3 cyanBright = vec3(0.25, 0.88, 0.82);
  vec3 hot        = vec3(0.86, 1.0, 0.97);

  vec3 color = mix(cyanDim, cyanBright, vGlow * 0.45 + centerHot * 0.32);
  color = mix(color, hot, vColorMix * 0.72);
  color = mix(color, hot, vMouseProx * 0.24 + centerHot * 0.16 + core * 0.16);

  alpha *= 0.86 + vMouseProx * 0.14 + vColorMix * 0.12 + core * 0.08;

  gl_FragColor = vec4(color * alpha, alpha);
}
`

export default fragmentShader;
