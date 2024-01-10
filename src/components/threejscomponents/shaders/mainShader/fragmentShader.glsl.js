const fragmentShader = /*glsl*/`
uniform sampler2D uTextureOne;
uniform sampler2D uTextureTwo;
uniform sampler2D uTextureThree;
uniform sampler2D uTextureFour;
uniform sampler2D uNoiseTexture;
uniform int uCurrentPhase;
uniform float uScroll; // Normalized value for transition, should reset and range from 0 to 1 for each phase transition
uniform float uTime;
uniform float uGlitchIntensity;
uniform vec2 uResolution;

varying vec2 vUv;

float random(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

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
          float angle = 45.0; // for diagonal
          vec2 direction = vec2(cos(angle), sin(angle));
          float wipeFactor = smoothstep(uScroll - softness, uScroll + softness, dot(vUv, direction));
          finalColor = mix(texOne, texTwo, wipeFactor);
    } else if (uCurrentPhase == 2) {
        texOne = texture(uTextureThree, vUv);
        texTwo = texture(uTextureTwo, vUv);
       
        float blendFactor = smoothstep(uScroll - softness, uScroll + softness, vUv.x);
    
        // Pixelation effect
        // float pixelSize = mix(100.0, 200.0, blendFactor); // Adjust pixel size between 1 and 20 based on blendFactor
        // vec2 pixelatedUv = floor(vUv * pixelSize) / pixelSize;
        // texTwo = texture(uTextureTwo, pixelatedUv);
    
        // Interpolate between texOne and texTwo based on blendFactor
        finalColor = mix(texOne, texTwo, blendFactor);
    } else if (uCurrentPhase == 3) {
        texOne = texture(uTextureFour, vUv);
        texTwo = texture(uTextureThree, vUv);
        float angle = 95.0; // for diagonal
        vec2 direction = vec2(cos(angle), sin(angle));
        float wipeFactor = smoothstep(uScroll - softness, uScroll + softness, 1.0 - dot(vUv, direction));
        finalColor = mix(texOne, texTwo, wipeFactor);



    }
     else { // uCurrentPhase == 4
        texOne = texture(uTextureOne, vUv);
        texTwo = texture(uTextureFour, vUv); // Looping back to the first texture
        float blendFactor = smoothstep(uScroll - softness, uScroll + softness, vUv.y);

        // Interpolate between texOne and texTwo based on blendFactor
        finalColor = mix(texOne, texTwo, blendFactor);
    }

    // Assign the glitched color to gl_FragColor
    gl_FragColor = finalColor;
}
`

export default fragmentShader;