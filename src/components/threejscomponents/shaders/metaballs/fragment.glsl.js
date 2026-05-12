const fragmentShader = /*glsl*/`
precision highp float;

// ─── Constants ───────────────────────────────────────────────────
const float EPS       = 1e-4;
const int   MAX_STEPS = 48;
const float MAX_DIST  = 10.0;
const int   TRAIL_LEN = 15;

// ─── Uniforms ────────────────────────────────────────────────────
uniform vec2  uResolution;
uniform float uTime;
uniform vec2  uPointerTrail[TRAIL_LEN];

// ─── Camera (orthographic raymarch) ──────────────────────────────
const vec3 CAM_ORIGIN = vec3(0.0, 0.0, 2.0);
const vec3 CAM_DIR    = vec3(0.0, 0.0, -1.0);
const vec3 CAM_UP     = vec3(0.0, 1.0, 0.0);
const vec3 CAM_RIGHT  = vec3(1.0, 0.0, 0.0);

// ─── Noise ───────────────────────────────────────────────────────
float hash(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
}

float noise3D(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);

    return mix(
        mix(mix(hash(i),                    hash(i + vec3(1,0,0)), u.x),
            mix(hash(i + vec3(0,1,0)),      hash(i + vec3(1,1,0)), u.x), u.y),
        mix(mix(hash(i + vec3(0,0,1)),      hash(i + vec3(1,0,1)), u.x),
            mix(hash(i + vec3(0,1,1)),      hash(i + vec3(1,1,1)), u.x), u.y),
        u.z
    );
}

// FBM for richer noise
float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    vec3 shift = vec3(100.0);
    for (int i = 0; i < 4; i++) {
        v += a * noise3D(p);
        p = p * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

// ─── SDF Primitives ──────────────────────────────────────────────
float sdSphere(vec3 p, float r) {
    return length(p) - r;
}

// Exponential smooth-min — organic metaball blending
float smin(float a, float b, float k) {
    float h = exp(-k * a) + exp(-k * b);
    return -log(h) / k;
}

// ─── Scene Definition ────────────────────────────────────────────
float map(vec3 p) {
    float d = 1e5;
    float k = 7.0;
    float baseRadius = 8e-3;

    // ── Pointer trail (15 tapered spheres) ──
    for (int i = 0; i < TRAIL_LEN; i++) {
        float fi     = float(i);
        float radius = baseRadius * float(TRAIL_LEN - i);
        vec2  trail  = uPointerTrail[i] * uResolution / min(uResolution.x, uResolution.y);
        d = smin(d, sdSphere(p - vec3(trail, 0.0), radius), k);
    }

    // ── Central pulsing sphere ──
    float pulse = 0.15 + 0.025 * sin(uTime * 1.2) + 0.015 * sin(uTime * 2.7);
    d = smin(d, sdSphere(p, pulse), k);

    // ── Orbiting satellites (5 spheres, varied orbits) ──
    for (int i = 0; i < 5; i++) {
        float fi    = float(i);
        float speed = 0.2 + fi * 0.07;
        float angle = uTime * speed + fi * 1.2566;   // ~golden angle spacing
        float orbit = 0.4 + 0.12 * sin(uTime * 0.3 + fi * 2.0);
        float yOsc  = 0.18 * sin(uTime * 0.45 + fi * 1.8);
        float zOsc  = 0.06 * sin(uTime * 0.35 + fi * 3.0);

        vec3  pos = vec3(orbit * cos(angle), yOsc, zOsc);
        float r   = 0.055 + 0.02 * sin(uTime * 0.8 + fi);
        d = smin(d, sdSphere(p - pos, r), k);
    }

    // ── Decorative static sphere (lower right) ──
    float staticR = 0.08 + 0.01 * sin(uTime * 0.6);
    d = smin(d, sdSphere(p - vec3(0.7, -0.35, 0.0), staticR), k * 0.8);

    return d;
}

// ─── Normal via central differences ──────────────────────────────
vec3 calcNormal(vec3 p) {
    vec2 e = vec2(EPS, 0.0);
    return normalize(vec3(
        map(p + e.xyy) - map(p - e.xyy),
        map(p + e.yxy) - map(p - e.yxy),
        map(p + e.yyx) - map(p - e.yyx)
    ));
}

// ─── Main ────────────────────────────────────────────────────────
void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution) / min(uResolution.x, uResolution.y);
    vec2 screenUv = gl_FragCoord.xy / uResolution;

    // Orthographic ray
    vec3 ro = CAM_ORIGIN + CAM_RIGHT * uv.x + CAM_UP * uv.y;
    vec3 rd = CAM_DIR;

    // ── Raymarch ──
    float t = 0.0;
    float d = 0.0;
    for (int i = 0; i < MAX_STEPS; i++) {
        d = map(ro + rd * t);
        t += d;
        if (d < EPS || t > MAX_DIST) break;
    }

    vec3 color = vec3(0.0);

    // Lights
    vec3 L1 = normalize(vec3(1.0, 1.0, 0.5));
    vec3 L2 = normalize(vec3(-0.5, 0.8, 0.3));

    if (d < EPS) {
        // ── Hit: compute shading ──
        vec3 pos     = ro + rd * t;
        vec3 normal  = calcNormal(pos);
        vec3 reflDir = reflect(rd, normal);

        // ── Diffuse — very subtle, just enough to see form ──
        float diff1 = max(dot(normal, L1), 0.0);
        float diff2 = max(dot(normal, L2), 0.0);
        float diffuse = diff1 * 0.7 + diff2 * 0.3;

        // ── Near-black base — the blob is essentially black ──
        vec3 baseColor = vec3(0.01, 0.01, 0.02);
        color = baseColor + vec3(0.01, 0.02, 0.04) * diffuse;

        // ── Fresnel rim — cool blue edge glow, makes shape visible ──
        float fresnel = pow(1.0 - max(dot(-rd, normal), 0.0), 4.0);
        color += vec3(0.08, 0.15, 0.4) * fresnel * 0.8;

        // ── Strong glossy specular — sharp white highlights ──
        float spec1 = pow(max(dot(reflDir, L1), 0.0), 120.0);
        float spec2 = pow(max(dot(reflDir, L2), 0.0), 80.0);
        color += vec3(0.9, 0.95, 1.0) * spec1 * 1.8;
        color += vec3(0.5, 0.7, 1.0) * spec2 * 0.6;

        // ── Subtle environment reflection via noise — like dark glass ──
        float envRefl = fbm(reflDir * 4.0 + uTime * 0.08);
        color += vec3(0.02, 0.04, 0.08) * envRefl * fresnel;

        // ── Very faint blue subsurface at grazing angles ──
        float sss = pow(max(dot(rd, L1), 0.0), 3.0) * 0.08;
        color += vec3(0.05, 0.1, 0.2) * sss;

    } else {
        // ── Near-miss glow — faint blue halo ──
        float glow = exp(-d * 18.0);
        color += vec3(0.03, 0.06, 0.15) * glow;
    }

    // ── Gentle tone mapping (preserve the light blues) ──
    color = color / (color + vec3(1.0));  // Reinhard

    // ── Subtle vignette ──
    float vig = 1.0 - 0.2 * length(screenUv - 0.5);
    color *= vig;

    gl_FragColor = vec4(color, 1.0);
}
`

export default fragmentShader;
