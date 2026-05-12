const vertexShader = /*glsl*/`
uniform float uTime;
uniform vec2 uPointer;
uniform vec2 uPrevPointer;
uniform float uPointerSpeed;

attribute float aRandom;

varying float vHeight;
varying float vMouseProximity;

//
// Simplex 3D noise (Ashima Arts / Ian McEwan)
//
vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 1.0/7.0;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main() {
  vec3 pos = position;

  // Mouse position in world space (mapped from -1..1 to grid range)
  vec2 mouseWorld = uPointer * vec2(8.0, 5.0);

  // Distance from this particle to the mouse on the XZ plane
  float distToMouse = length(pos.xz - mouseWorld);

  // --- Ripple waves emanating from mouse ---
  // Multiple concentric rings expanding outward
  float ripple1 = sin(distToMouse * 3.0 - uTime * 3.5) * exp(-distToMouse * 0.15);
  float ripple2 = sin(distToMouse * 5.0 - uTime * 2.0) * exp(-distToMouse * 0.25);
  float mouseRipple = (ripple1 * 0.6 + ripple2 * 0.3) * smoothstep(12.0, 0.0, distToMouse);

  // Boost ripple intensity when mouse is moving fast
  float speedBoost = 1.0 + uPointerSpeed * 3.0;
  mouseRipple *= speedBoost;

  // --- Ambient ocean waves (always moving) ---
  float ambient1 = snoise(vec3(pos.xz * 0.3, uTime * 0.2)) * 0.3;
  float ambient2 = sin(pos.x * 0.5 + uTime * 0.4) * cos(pos.z * 0.3 + uTime * 0.3) * 0.15;

  // --- Proximity lift: particles near mouse rise up ---
  float proximity = smoothstep(4.0, 0.0, distToMouse);
  float lift = proximity * 1.2;

  // Combine all vertical displacement
  float height = mouseRipple + ambient1 + ambient2 + lift;

  // Add slight random jitter for organic feel
  height += aRandom * 0.05 * sin(uTime * 2.0 + aRandom * 100.0);

  pos.y += height;

  vHeight = height;
  vMouseProximity = proximity;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

  // Particles near mouse grow larger
  float baseSize = 0.8 + aRandom * 0.3;
  float sizeBoost = proximity * 1.0;
  gl_PointSize = max(1.0, (baseSize + sizeBoost) * (20.0 / -mvPosition.z));

  gl_Position = projectionMatrix * mvPosition;
}
`

export default vertexShader;
