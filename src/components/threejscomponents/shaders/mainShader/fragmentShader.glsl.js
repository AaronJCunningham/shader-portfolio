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

    float softness = 0.005;
    // 45 degrees in radians = pi/4
    float angle = 3.14159265 / 4.0;
    vec2 direction = vec2(cos(angle), sin(angle));
    // dot(vUv, direction) ranges from 0 to (cos+sin) — normalize to 0-1
    float maxDot = direction.x + direction.y;
    float wipePos = dot(vUv, direction) / maxDot;

    if (uCurrentPhase == 1) {
        texOne = texture(uTextureTwo, vUv);
        texTwo = texture(uTextureOne, vUv);
        float wipeFactor = smoothstep(uScroll - softness, uScroll + softness, wipePos);
        finalColor = mix(texOne, texTwo, wipeFactor);
    } else if (uCurrentPhase == 2) {
        texOne = texture(uTextureThree, vUv);
        texTwo = texture(uTextureTwo, vUv);
        float wipeFactor = smoothstep(uScroll - softness, uScroll + softness, wipePos);
        finalColor = mix(texOne, texTwo, wipeFactor);
    } else if (uCurrentPhase == 3) {
        texOne = texture(uTextureFour, vUv);
        texTwo = texture(uTextureThree, vUv);
        float wipeFactor = smoothstep(uScroll - softness, uScroll + softness, wipePos);
        finalColor = mix(texOne, texTwo, wipeFactor);
    } else {
        // Phase 4+: just show the last scene, no transition
        finalColor = texture(uTextureFour, vUv);
    }

    // Assign the glitched color to gl_FragColor
    gl_FragColor = finalColor;
}
`

export default fragmentShader;