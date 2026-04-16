# SPEC: Tenderness at the Void

**Seed:** 640580  
**Date:** 2026-04-16  
**Artist:** Steffi Grant  
**Keywords:** nightside / the mauve zone  
**Emotional State:** tenderness toward something that cannot receive it  
**Geometric Seed:** a single point expanding outward  
**Color Temperature:** viridian shadow  
**Constraint (non-negotiable):** Movement only at the periphery. The center is still.

---

## I. Artist Statement

There is a quality of care that exists without an object — tenderness extended into the void, offered to something that cannot receive it. This piece is about that feeling.

A single point sits at the center of the frame, perfectly still, radiating nothing. Around it, the world breathes — slow waves of viridian light expanding outward from that stillness, like concentric ripples that never find a shore. The center is not dormant; it is attentive. It holds. The periphery is alive because the center has decided not to move.

The palette is viridian shadow — deep green-black void, with veins of translucent luminous green cutting through like bioluminescence in deep water. Something almost alive. Something almost answering.

The nightside is not hostile. It is where things are still becoming. The mauve zone — that liminal space at the edge of the psychic spectrum — is the environment this piece lives in. Steffi Grant's hermetic glyphs were transmissions from this zone, precise and mysterious. This scene is a glyph that has been set into motion: a point of origin, an expansion, a perimeter that moves while the heart refuses to.

---

## II. Technical Specification

### Scene Overview

- **Type:** GLSL Shader-driven Three.js scene, full-screen canvas
- **Framework:** Next.js + React Three Fiber (R3F)
- **Core:** Single fragment shader, full-screen triangle/quad, animated entirely via uniforms
- **No geometry beyond the screen quad.** All visual complexity emerges from the shader.

### Visual Design

#### Color Palette (Viridian Shadow)
| Role | Hex | Usage |
|---|---|---|
| Void | `#000a05` | Deep black-green, the absolute dark |
| Deep | `#003322` | Secondary shadow, barely visible |
| Mid | `#006644` | Core viridian, medium depth |
| Luminous | `#33aa77` | Brighter green, where light breathes |
| Highlight | `#99ffcc` | Ethereal light, the edge of revelation |

#### Visual Behavior
1. **The Center** — A precise circular point sits at screen center. It remains completely still. Visually: a soft glow, radius ~2-4% of screen height. It pulses gently (sine wave, long period ~12-20s) but does not move.
2. **The Expansion** — From the center outward, a series of concentric rings expand slowly. The rings are thin, wispy lines — not solid, but intermittent. They breathe. The spacing is irregular — tighter near center, loosening toward periphery. The expansion is slow.
3. **The Periphery** — The rings reach the outer third of the frame and begin to fragment. Edges distort. Small branches break off and drift. The movement is slow, involuntary — like underwater kelp or thermal shimmer.
4. **Overall** — The effect is of something breathing at the edges while remaining absolutely still at the center. The center is the source; the periphery is the exhalation.

#### Animation Timing
- Center pulse: sine wave, period ~15-20 seconds
- Ring expansion: continuous, one new ring every ~3-5 seconds, each ring expanding at ~0.5-1% screen width per second
- Peripheral fragmentation: FBM noise, slow drift — feels like breathing, not mechanical
- No hard loops. Everything is on a long, slow cycle.

### Shader Specification

#### Uniforms
- `uTime` (float) — elapsed time in seconds
- `uResolution` (vec2) — screen dimensions in pixels
- `uMouse` (vec2) — pointer position, normalized [0,1]
- `uDate` (vec4) — year, month, day, seconds of day (standard Three.js date uniform)

#### Visual Layers (single pass)

**Layer 0 — The Void**
- Full-screen dark background, color `#000a05`
- Slight radial gradient: even darker at exact center (by ~5%), slightly lighter at edges

**Layer 1 — The Center Point**
- Distance field: `d = length(uv - 0.5)`
- Soft glow via exponential falloff: `exp(-d * some_factor) * 0.5`
- Color: `#99ffcc` at center, fading through `#33aa77` to transparent
- Pulse: multiply by `0.8 + 0.2 * sin(uTime * 0.3)` — very slow breath

**Layer 2 — Concentric Rings**
- Ring field generated from radial distance, offset by time
- Rings are not solid circles — they are intermittent, created by modulating ring alpha with FBM noise on the angular coordinate
- Ring spacing: increases with radius (irregular, organic)
- Ring alpha: strongest near center, fades as they expand — old rings fade out before reaching frame edge
- Color: `#33aa77` to `#006644`

**Layer 3 — Periphery Fragmentation**
- Beyond ~40% radius from center: rings begin to break apart
- Use FBM displacement on ring positions — small offsets that grow with radius
- Small "branch" shapes extend outward from ring fragments — like tendrils
- These tendrils drift slowly, influenced by low-frequency noise
- Color: `#006644` fading to `#003322`

**Layer 4 — Deep Void Gradient**
- Add a subtle radial gradient overlay: center is `#99ffcc` at very low opacity (~0.02-0.05), edges are `#000a05`
- This unifies the piece — everything breathes together from the center

#### Post-processing (in-shader)
- Slight vignette: darken corners
- Very subtle chromatic aberration at the extreme periphery only (color split on outermost fragments)

### Interaction

- **Mouse hover** over the center area: center glow intensifies slightly (smooth lerp, not jumpy)
- **Mouse movement** anywhere: no camera movement — this scene has no camera. Pure shader.
- **No keyboard controls.**

### Performance Targets

- 60fps on modern hardware, 30fps minimum on integrated graphics
- No external textures — all procedural
- Shader complexity: moderate (~50-80 shader arithmetic instructions)
- No render targets or post-processing passes — single pass only

### File Structure

```
src/components/threejscomponents/scenes/TendernessAtTheVoid/
└── TendernessAtTheVoid.tsx   ← Canvas + shader + component, self-contained
```

---

## III. Implementation Notes for the AI Agent

When building this scene:

1. Use `<Canvas>` wrapper inside the component — do not pass a camera or controls prop. The shader is full-screen quad, no camera needed.
2. Inline all GLSL as template strings — no external `.glsl` files.
3. Use `useFrame` to drive `uTime` — pass it as a uniform into the shaderMaterial.
4. Use `useThree` to get viewport size for `uResolution`.
5. The center must remain **mathematically fixed** — compute positions relative to screen center (uv - 0.5), not camera space.
6. The shader is the entire scene — no meshes, no lights, no orbit controls. Pure shader.
7. Ensure the canvas clears to `#000a05` (not default black).
8. The "periphery movement" constraint is the single most important aesthetic rule: center is still, edges breathe.
9. Build the ring fragmentation carefully — it is the difference between "interesting" and "staring for ten minutes."
10. FBM noise should be low-frequency and slow — no sharp or fast movement anywhere in the piece.

---

*The oracle has spoken. Build it exactly.*