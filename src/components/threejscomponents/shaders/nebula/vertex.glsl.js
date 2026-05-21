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
  float amp = 0.12 + aSeed * 0.16;
  pos += amp * vec3(
    sin(uTime * 0.18 + aPhase.x),
    sin(uTime * 0.15 + aPhase.y),
    sin(uTime * 0.21 + aPhase.z)
  );

  // ── Differential rotation around Y — slow swirl, faster near center ──
  float r       = length(pos.xz);
  float rotSpeed = 0.12 / (r * 0.4 + 0.6);
  float ang     = uTime * rotSpeed;
  float c = cos(ang), s = sin(ang);
  pos.xz = mat2(c, -s, s, c) * pos.xz;

  // ── Mouse: magnetic pull through the cloud, with a small lift toward camera ──
  vec2  mouseW = uPointer * vec2(2.8, 2.0);
  float distXY = length(pos.xy - mouseW);
  float prox   = smoothstep(4.0, 0.0, distXY);
  float magnetic = pow(prox, 1.35);
  vec2 pullDir = mouseW - pos.xy;
  pos.xy += pullDir * magnetic * (0.38 + aSeed * 0.28);
  pos.z += magnetic * 0.55;

  vMouseProx  = prox;
  vCenterDist = length(aBasePos);
  vGlow       = 0.35 + aSeed * 0.65;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = (1.0 + aSeed * 1.8 + prox * 0.75) * (38.0 / -mv.z);
  gl_Position  = projectionMatrix * mv;
}
`

export default vertexShader;
