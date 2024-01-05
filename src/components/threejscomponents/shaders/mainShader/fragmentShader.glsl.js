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
    vec4 finalColor;

    float softness = 0.05;
    // Determine which textures to mix based on the current phase
    if (uCurrentPhase == 1) {
        texOne = texture(uTextureTwo, vUv);
        texTwo = texture(uTextureOne, vUv);
         // Calculate the blend factor based on uScroll, vUv.x and uSoftness
        float blendFactor = smoothstep(uScroll - softness, uScroll + softness, vUv.x);

        // Interpolate between texOne and texTwo based on blendFactor
        finalColor = mix(texOne, texTwo, blendFactor);
    } else if (uCurrentPhase == 2) {
        texOne = texture(uTextureThree, vUv);
        texTwo = texture(uTextureTwo, vUv);
       
        float blendFactor = smoothstep(uScroll - softness, uScroll + softness, vUv.x);

        // Interpolate between texOne and texTwo based on blendFactor
        finalColor = mix(texOne, texTwo, blendFactor);
    } else if (uCurrentPhase == 3) {
        texOne = texture(uTextureFour, vUv);
        texTwo = texture(uTextureThree, vUv);
        float blendFactor = smoothstep(uScroll - softness, uScroll + softness, vUv.x);

        // Interpolate between texOne and texTwo based on blendFactor
        finalColor = mix(texOne, texTwo, blendFactor);
    } else { // uCurrentPhase == 4
        texOne = texture(uTextureOne, vUv);
        texTwo = texture(uTextureFour, vUv); // Looping back to the first texture
        float blendFactor = smoothstep(uScroll - softness, uScroll + softness, vUv.x);

        // Interpolate between texOne and texTwo based on blendFactor
        finalColor = mix(texOne, texTwo, blendFactor);
    }

    // Mix the textures based on the scroll value
    mixColor = mix(texOne, texTwo, uScroll); 
    gl_FragColor = finalColor;
}
`

export default fragmentShader;