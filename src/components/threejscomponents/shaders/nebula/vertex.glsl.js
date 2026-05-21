const vertexShader = /*glsl*/`
uniform float uTime;
uniform vec2  uPointer;

attribute vec3 aBasePos;
attribute vec3 aPhase;
attribute float aSeed;

varying float vGlow;
varying float vMouseProx;
varying float vCenterDist;

void main() {
  vec3 pos = aBasePos;

  // ── Per-particle shimmer (3 cheap sins, no noise) ──
  float amp = 0.18 + aSeed * 0.22;
  pos += amp * vec3(
    sin(uTime * 0.40 + aPhase.x),
    sin(uTime * 0.33 + aPhase.y),
    sin(uTime * 0.47 + aPhase.z)
  );

  // ── Differential rotation around Y — slow swirl, faster near center ──
  float r       = length(pos.xz);
  float rotSpeed = 0.30 / (r * 0.4 + 0.6);
  float ang     = uTime * rotSpeed;
  float c = cos(ang), s = sin(ang);
  pos.xz = mat2(c, -s, s, c) * pos.xz;

  // ── Mouse: pull particles in pointer's XY band toward camera ──
  vec2  mouseW = uPointer * vec2(2.8, 2.0);
  float distXY = length(pos.xy - mouseW);
  float prox   = smoothstep(2.2, 0.0, distXY);
  pos.z += prox * 0.7;

  vMouseProx  = prox;
  vCenterDist = length(aBasePos);
  vGlow       = 0.35 + aSeed * 0.65;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = (1.0 + aSeed * 1.8 + prox * 1.6) * (38.0 / -mv.z);
  gl_Position  = projectionMatrix * mv;
}
`

export default vertexShader;
