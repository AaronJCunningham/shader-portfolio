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

  vec3 cyanDim    = vec3(0.06, 0.40, 0.38);
  vec3 cyanBright = vec3(0.18, 0.72, 0.68);
  vec3 hot        = vec3(0.75, 1.0, 0.95);

  vec3 color = mix(cyanDim, cyanBright, vGlow * 0.45 + centerHot * 0.32);
  color = mix(color, hot, vColorMix * 0.72);
  color = mix(color, hot, vMouseProx * 0.24 + centerHot * 0.16);

  alpha *= 0.72 + vMouseProx * 0.12 + vColorMix * 0.1;

  gl_FragColor = vec4(color * alpha, alpha);
}
`

export default fragmentShader;
