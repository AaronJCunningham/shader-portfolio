const fragmentShader = /*glsl*/ `
// fragment.glsl
uniform vec2 uResolution;
varying vec2 vUv;

void main() {
  vec2 st = vUv * uResolution;
  gl_FragColor = vec4(st.x / uResolution.x, st.y / uResolution.y, 0.0, 1.0);
}`;

export default fragmentShader;
