const fragmentShader = /*glsl*/`
uniform sampler2D uTextureOne;
uniform sampler2D uTextureTwo;
uniform sampler2D uTextureThree;
uniform sampler2D uTextureFour;
uniform int uCurrentPhase;
uniform float uScroll; // Normalized value for transition, should reset and range from 0 to 1 for each phase transition

varying vec2 vUv;

void main() {
    vec4 texOne;
    vec4 texTwo;
    vec4 mixColor;
    // Determine which textures to mix based on the current phase
    if (uCurrentPhase == 1) {
        texOne = texture(uTextureOne, vUv);
        texTwo = texture(uTextureTwo, vUv);
      
    } else if (uCurrentPhase == 2) {
        texOne = texture(uTextureTwo, vUv);
        texTwo = texture(uTextureThree, vUv);
        
    } else if (uCurrentPhase == 3) {
        texOne = texture(uTextureThree, vUv);
        texTwo = texture(uTextureFour, vUv);
        
    } else { // uCurrentPhase == 4
        texOne = texture(uTextureFour, vUv);
        texTwo = texture(uTextureOne, vUv); // Looping back to the first texture
        
    }

    // Mix the textures based on the scroll value
    mixColor = texOne; 
    gl_FragColor = mixColor;
}

`

export default fragmentShader;