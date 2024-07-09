const simFragment = /*glsl*/ `

uniform sampler2D uPositions;
varying vec2 vUv;

void main() {
    vec4 pos = texture2D(uPositions, vUv);
    gl_FragColor = pos;
}`;

export default simFragment;
