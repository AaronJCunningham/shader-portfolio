const fragmentShader = `
uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uImageResolution;
uniform float uFrequency;
uniform float uBass;
uniform float uMid;
uniform float uHigh;
varying vec2 vUv;

void main() {
    float screenAspect = uResolution.x / uResolution.y;
    float imageAspect = uImageResolution.x / uImageResolution.y;

    float scale = 0.9;
    
    // Bass Valve for Scale
    // Ensure intro is calm by using a valve
    float bassValve = 0.2; // Lowered to match vertex shader so it actually triggers
    float effectiveBass = 0.0;
    
    if (uBass > bassValve) {
        effectiveBass = (uBass - bassValve) / (1.0 - bassValve);
        effectiveBass = pow(effectiveBass, 2.0); // Exponential punch
    }
    
    scale += effectiveBass * 0.05; // Only expand when bass hits hard

    vec2 newUv = vUv;
    
    if (screenAspect > imageAspect) {
        float newWidth = (imageAspect / screenAspect) * scale;
        float newHeight = 1.0 * scale;
        float offsetX = (1.0 - newWidth) / 2.0;
        float offsetY = (1.0 - newHeight) / 2.0;
        newUv.x = (vUv.x - offsetX) / newWidth;
        newUv.y = (vUv.y - offsetY) / newHeight;
    } else {
        float newWidth = 1.0 * scale;
        float newHeight = (screenAspect / imageAspect) * scale;
        float offsetX = (1.0 - newWidth) / 2.0;
        float offsetY = (1.0 - newHeight) / 2.0;
        newUv.x = (vUv.x - offsetX) / newWidth;
        newUv.y = (vUv.y - offsetY) / newHeight;
    }

    if (newUv.x < 0.0 || newUv.x > 1.0 || newUv.y < 0.0 || newUv.y > 1.0) {
         gl_FragColor = vec4(0.05, 0.05, 0.05, 1.0); 
    } else {
         // Chromatic Aberration Logic
         // Map to uHigh (High frequency bands 8-9)
         // Use valve logic to keep intro clean if needed, or just let it shimmer
         
         float highValve = 0.2;
         float effectiveHigh = 0.0;
         
         if (uHigh > highValve) {
             effectiveHigh = (uHigh - highValve) / (1.0 - highValve);
             effectiveHigh = pow(effectiveHigh, 2.0);
         }
         
         // Reduced intensity by 5x (0.05 -> 0.01)
         float aberration = effectiveHigh * 0.01; 
         
         vec4 texColor;
         
         // Sample Red channel shifted LEFT
         texColor.r = texture2D(uTexture, newUv + vec2(aberration, 0.0)).r;
         
         // Sample Green channel CENTERED
         texColor.g = texture2D(uTexture, newUv).g;
         
         // Sample Blue channel shifted RIGHT
         texColor.b = texture2D(uTexture, newUv - vec2(aberration, 0.0)).b;
         
         // Alpha remains same
         texColor.a = texture2D(uTexture, newUv).a;
         
         // Color manipulations keyed ONLY to effectiveBass
         if (effectiveBass > 0.3) {
             texColor.rgb += vec3(effectiveBass * 0.2); 
             texColor.rgb = mix(texColor.rgb, vec3(1.0) - texColor.rgb, effectiveBass * 0.5); 
         }
         
         gl_FragColor = texColor;
    }
}
`;

export default fragmentShader;
