const vertexShader = /*glsl*/`
varying vec2 vUv;

void main() {
    vUv = uv;
    // Bypass camera matrices — map 2x2 plane directly to clip space
    gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export default vertexShader;
