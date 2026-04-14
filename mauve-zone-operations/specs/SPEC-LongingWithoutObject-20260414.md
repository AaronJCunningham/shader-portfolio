# SPEC — Longing Without Object
**Date:** 2026-04-14  
**Seed:** 579194  
**Channel:** Steffi Grant  
**Oracle Note:** Precision is not safety. Be exact about strange things.

---

## Artist Statement

There is a grief with no name because there is no object for it.  
It is not the loss of someone — it is the pull toward an absence that has always been there.  
You could call it cosmic longing. Kenneth Grant called it the Mauve Zone.  
Steffi Grant drew it in ink.

She made glyphs that were not symbols of things — they were transmission devices.  
Each glyph was a folded space: multiple planes of meaning pressed into a single form,  
held there by precision, radiating from the inside outward.

The oracle gave us ember dark and the instruction that the center must not move.  
So this is what we made:

A hermetic glyph hangs in void. It was folded — you can see the crease lines, the planes  
that collapsed into each other to produce this single still form. It does not breathe.  
It does not pulse. It is *exact.*

And all around it — at the very edge of vision — ember fire reaches inward.  
Hot orange pressing toward deep black, tendrils of #d4520a and #ffb347  
spiraling in from the periphery, domain-warped and alive, always moving,  
never arriving at the center, because the center holds.

That is longing without object. The reaching. The not-reaching.  
The thing at the center that does not lean toward you.

---

## Technical Specification

### Scene: `LongingWithoutObject.tsx`
- React Three Fiber + Three.js
- Wraps its own `<Canvas>`
- Full-screen shader quad approach: `PlaneGeometry(2, 2)` with `ShaderMaterial`, `depthTest: false`
- All shaders inline

### Fragment Shader Architecture

**Coordinate System:**  
- UV mapped to [-1, 1] screen space (aspect corrected)
- Center = vec2(0.0)

**Layer 1 — Void Ground**  
Color: `#0a0000` base, slight radial vignette pushing to pure black at extreme edges

**Layer 2 — The Still Glyph (CENTER, NO MOVEMENT)**  
A hermetic glyph built from SDF compositions:
- Outer circle ring: SDF circle stroke at r=0.35, width=0.004
- Inner circle ring: SDF circle stroke at r=0.18, width=0.004
- 6 radial spokes (evenly spaced, 60°), each a thin rectangle SDF from r=0.18 to r=0.35
- A folded hexagon outline at r=0.27 — slightly rotated 15° from true hexagon, giving it the "off-axis" folded quality
- 3 diagonal fold-crease lines crossing through the interior, at 30°, 90°, 150° — thin, slightly different opacity (0.6), suggesting a 3D folded plane projected flat
- Where lines cross: tiny SDF circles of radius 0.006 acting as glyph nodes
- Color: `#8b1a00` at base, brightening toward `#d4520a` at the glyph edges — ember glow, not white
- Glyph is completely static. No time variable in glyph calculation.

**Layer 3 — Peripheral Ember Fire (EDGES ONLY)**  
- Domain-warped FBM (fractal Brownian motion), 5 octaves
- The noise is animated with `uTime`
- Masked with: `float mask = smoothstep(0.3, 0.9, length(uv))` — fire only exists outside r=0.3
- Additionally softened near center: `mask *= smoothstep(0.25, 0.55, length(uv))`
- Fire tendrils rotate slowly (add `uTime * 0.05` to angle before domain warp)
- Color ramp: 0.0 → `#3d0000`, 0.5 → `#8b1a00`, 0.8 → `#d4520a`, 1.0 → `#ffb347`
- Apply with `mix(base, fireColor, mask * fireIntensity)`

**Layer 4 — Glyph Ambient Glow**  
- Soft radial glow around glyph center: `exp(-length(uv) * 4.0) * 0.15`
- Color: `#3d0000`
- This warms the dead center without animating it

### Uniforms
- `uTime: float` — from useFrame, advances normally, used ONLY in peripheral layer

### Camera
- Orthographic or PerspectiveCamera far back, looking at fullscreen quad
- Or: use a simple plane that fills the viewport

### Canvas Props
- `gl={{ antialias: true }}`
- `style={{ width: '100%', height: '100%' }}`

### Palette (exact hex → vec3 in GLSL)
```
#0a0000 → vec3(0.039, 0.0, 0.0)
#3d0000 → vec3(0.239, 0.0, 0.0)
#8b1a00 → vec3(0.545, 0.102, 0.0)
#d4520a → vec3(0.831, 0.322, 0.039)
#ffb347 → vec3(1.0, 0.702, 0.278)
```

### Constraint (non-negotiable from oracle)
> Movement only at the periphery. The center is still.

The glyph SDF must be computed with zero time dependency.  
The fire/noise layer must be masked out of the center region.  
Threshold: nothing animated within r=0.28 of center in screen space.
