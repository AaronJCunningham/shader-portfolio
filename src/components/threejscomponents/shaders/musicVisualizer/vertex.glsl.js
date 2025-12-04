const vertexShader = `
varying vec2 vUv;
uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uHigh;
uniform float uFrequency; 

// Helper random function
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main() {
    vUv = uv;
    vec3 pos = position;
    
    float gridX = 50.0;
    float gridY = 50.0;
    
    vec2 gridIndex = floor(uv * vec2(gridX, gridY));
    float r = random(gridIndex);
    
    // --- SMOOTH ANALOG RESPONSE ---
    // Removed hard "if > valve" logic.
    // Using smoothstep + pow to create a "soft knee" response.
    // Quiet sounds (0.0 - 0.2) -> very tiny movement
    // Loud sounds (0.5 - 1.0) -> exponential growth
    
    float rawSignal = uBass; // This is the mid-range average passed from scene
    
    // Smoothstep: clips negative values but smoothly ramps up from 0.15 to 1.0
    float effectiveSignal = smoothstep(0.15, 1.0, rawSignal);
    
    // Exponential curve for impact
    effectiveSignal = pow(effectiveSignal, 2.5);
    
    // Boost to visible range
    effectiveSignal *= 3.0;

    float displacement = 0.0;
    
    // Main chunks move with signal
    if (r > 0.6) {
        displacement += effectiveSignal; 
    }
    
    // Mids/Highs shimmer
    displacement += uMid * 0.1;
    if (r < 0.2) displacement += uHigh * 0.05;
    
    // --- Z-AXIS DISPLACEMENT ---
    // Removed "floor" stepping logic.
    // Movement is now continuous and smooth (analog).
    
    float maxZ = 2.0; 
    
    // Apply displacement directly
    pos.z += displacement * maxZ;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

export default vertexShader;
