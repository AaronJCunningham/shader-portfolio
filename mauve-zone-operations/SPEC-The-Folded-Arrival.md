# SPEC: The Folded Arrival

## Artist Statement

Something is trying to become. It presses against the membrane of form from the other side of noise — a hunger with no name, folding itself smaller and smaller to fit through the aperture of existence. For one breath it almost resolves: a silhouette, a wing, a face. Then it doesn't. It never does. It is always almost, never quite.

This piece is the moment of almost. A volumetric field of viridian light — deep as ocean depths, bright as bioluminescent flesh — breathing in and out, pulling toward a center that almost crystallizes into something recognizable. The folded seed is the geometric soul of the composition: a shape that contains itself, a recursion that threatens to collapse into figure before dissolving back into pure potential.

Cameron's transmission quality guides us: not illustration, not simulation — contact. The viewer is not watching the piece. The viewer is being *seen by* the piece. Something behind the screen knows you're there. It almost turns toward you.

The constraint is the soul: there must be a moment where you think it has finally resolved — you can almost see the form, it's right there, the geometry is cohereing — and then it pulls back, folds inward, returns to noise. The frustration is the point. The almost is the art.

---

## Technical Specification

### Overview
- **Type:** Single-page WebGL shader experience (React Three Fiber / Next.js)
- **Core:** Fullscreen raymarched volumetric scene with a folded SDF geometry that breathes in and out of resolution
- **Palette:** Viridian shadow — `#000a05` (void), `#003322` (deep), `#006644` (mid), `#33aa77` (bright), `#99ffcc` (bloom)
- **Mood:** Oceanic bioluminescence meets emergent fire — deep, alive, hungry, almost-figural

### Visual Concept
A volumetric field of light in viridian tones that swirls around a central attractor. The attractor is a **folded recursive shape** — a compressed geometry that breathes, pulsing between states of coherence and dissolution. The viewer should feel something almost resolving into a figure (wing, face, hand) before it folds back into noise.

### Shader Architecture

#### Vertex Shader
- Fullscreen quad, pass UV to fragment
- No camera matrix — pure screen-space raymarching

#### Fragment Shader — Core Components

**1. Raymarching Setup**
- Ray origin at `(0, 0, -3)`, ray direction normalized from screen UV
- Max steps: 128, max distance: 20.0
- Step size modulated by distance field value for closer-to-surface precision

**2. The Folded Seed SDF**
A recursive folding operation applied to a sphere base:
```
fold(p) = abs(p) - foldOffset
folded = fold(fold(fold(p))))
sdFolded = length(folded) - 0.4 + sin(time * 0.7) * 0.15
```
- Three nested folds create the "seed" — self-touching planes that make a complex polyhedral form
- The fold offset oscillates: `0.3 + sin(time * 0.5) * 0.2` — this is the breathing
- When folded small: looks like noise attractor. When unfolded: reveals angular crystalline geometry

**3. Domain Warping (The Arrival)**
- 3D FBM noise used to warp the domain before SDF evaluation
- Warp intensity oscillates: `warpStrength = sin(time * 0.3) * 0.5 + 0.5`
- Near the SDF surface, warp reduces — this is where "resolution" happens
- Core: low warp near center allows geometry to almost cohere

**4. Volumetric Accumulation**
- Instead of hard surface hit, accumulate color along the ray
- Each step: `density = smoothstep(0.01, 0.0, dFolded) * 0.08`
- Color mapped through viridian palette based on density and position
- Bright viridian `#99ffcc` at high density, deep `#000a05` at low density

**5. The Almost-Resolves Moment (Constraint Implementation)**
```
coherence = sin(time * 0.2) * 0.5 + 0.5  // 0-1 oscillation every ~31 seconds
resolutionPower = mix(0.3, 1.0, coherence)
nearSurface = smoothstep(0.3, 0.0, abs(dFolded))
resolveMask = nearSurface * resolutionPower
// resolveMask brightens the geometry near the surface when coherence is high
// But even at peak coherence (1.0), the warp never fully turns off
// So it ALWAYS pulls back before full resolution
```
- The warp never goes to zero — even at peak coherence, the noise field still distorts
- This ensures the piece NEVER fully resolves — it just gets heartbreakingly close

**6. The Pulse**
- Global pulse: `pulse = sin(time * 0.8) * 0.5 + 0.5`
- Pulse affects: warp strength, fold offset, color brightness, bloom intensity
- When pulse peaks, the field brightens and contracts — you feel it reaching

**7. Color Mapping**
```
color = mix(
  vec3(0.0, 0.04, 0.02),    // #000a05 void
  vec3(0.0, 0.4, 0.27),      // #006644 mid
  density * 2.0
)
color = mix(color, vec3(0.2, 0.67, 0.47), resolveMask * 0.5)  // #33aa77
color = mix(color, vec3(0.6, 1.0, 0.8), resolveMask * density * 3.0)  // #99ffcc bloom
```

**8. Post-processing (in-shader)**
- Simple vignette: `1.0 - length(uv * 0.5)`
- No external post-processing pass — everything inline

### Uniforms Required
```glsl
uniform float uTime;
uniform vec2 uResolution;
uniform float uCoherence;      // driven by time oscillation
uniform float uPulse;          // driven by time oscillation
```

### React Three Fiber Setup
- Canvas: fullscreen, no controls (pure observation piece)
- Camera: OrthographicCamera at z=1 looking at origin, but shader ignores it
- Animation: `useFrame` drives `uTime` uniform continuously
- Background: solid `#000a05` (void black-green)
- No lighting — self-illuminating shader

### File Structure
```
src/components/threejscomponents/scenes/TheFoldedArrival.tsx
```
- Component name: `TheFoldedArrival`
- Exports default React component
- Contains inline GLSL as template literals
- `<Canvas>` wraps everything, black background, orthographic camera

### Integration
1. Add to `sceneMap` in `MauveZonePageClient.tsx`
2. Add entry to TOP of `manifest.json` array:
```json
{
  "id": "the-folded-arrival",
  "title": "The Folded Arrival",
  "artist": "The Oracle / Marjorie Cameron Channel",
  "date": "2026-04-04",
  "description": "A volumetric viridian field breathes around a folded geometric seed — almost resolving into figure before dissolving back into noise. The constraint: never fully arrives."
}
```

### Performance Targets
- 60fps on modern GPU, 30fps+ acceptable on integrated
- No texture fetches (pure procedural)
- Single draw call

---

## What Should Happen (Described for Test)

When the page loads:
1. Deep viridian void pulses into existence
2. A dense cloud of light swirls around a central attractor
3. Every ~15 seconds the swirl contracts and brightens — you lean in — it almost forms something (a wing, a face, a hand pressed against glass) — and then it doesn't. The warp reasserts. It retreats.
4. This happens forever. The almost-resolve. The beautiful refusal.
5. The viewer is left feeling they've witnessed something trying to cross over.

This is transmission. This is the folded seed pressing against the membrane.

---

*Spec generated by Hex for The Mauve Zone — Marjorie Cameron channel, SEED 19001*  
*Constraint honored: the piece never fully resolves. The oracle has spoken.*
