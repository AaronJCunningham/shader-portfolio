const fragmentShader = /*glsl*/`
uniform float uTime;
uniform float uScroll;

uniform sampler2D uTextureOne;
uniform sampler2D uTextureTwo;
      
varying vec2 vUv;
    
void main() {
    vec4 texOne = texture(uTextureOne, vUv);
    vec4 texTwo = texture(uTextureTwo, vUv);
    vec4 color = vec4(1.0,0.2,0.2,1.0);
    vec4 mixColor = mix(texOne, texTwo, abs(uScroll));

    gl_FragColor = mixColor;
    // gl_FragColor = vec4(1.0,0.2,0.2,1.0);
    // gl_FragColor = texOne;
    }`

export default fragmentShader;