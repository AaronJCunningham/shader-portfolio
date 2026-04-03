# SPEC.md — The Alphabet of Hunger

## Artist Statement

This piece channels Austin Osman Spare's practice of **automatic drawing** — the hand moving without conscious intent, allowing form to emerge from the void like a sigil surfacing from static. The scene depicts a form caught mid-arrival: particles coalescing from noise into a broken axis-symmetric structure, holding for a breath, then dissolving back into darkness.

The emotion is **hunger with no name** — desire before language, the wanting that precedes thought. Spare wrote letters into glyphs; we grow them from noise.

The geometry has one axis of symmetry, deliberately fractured — a form almost-balanced, destabilized by the act of becoming.

---

## Technical Vision

**Technique:** GPGPU-driven particle/sdf hybrid with multi-pass feedback.

The scene uses:
1. A **ping-pong GPGPU buffer** that evolves a particle field — positions computed on GPU via render-to-texture, displaced by noise each frame
2. A **raymarched SDF core** — the central sigil form, rendered with soft shadows and rim lighting
3. **Domain warping** to make particles swirl into and out of the SDF attractor — FBM noise warps the UV space, creating organic, Spare-like flowing lines
4. **Feedback loop** — the GPGPU buffer reads from its previous frame, creating persistence and memory; forms emerge from prior states

The scene never fully resolves — it is always becoming, always arriving. The constraint is the work.

---

## Scene Architecture

### Pass 1: GPGPU Position Update (Ping-Pong)
- Two float textures (position, previousPosition)
- Fragment shader reads old position, applies:
  - FBM domain warp (warped UV sampling)
  - Attractor force pulling toward SDF glyph center
  - Noise-based perturbation
- Output written to opposite ping-pong buffer

### Pass 2: SDF Raymarching (Main Canvas)
- Central glyph rendered via raymarched SDF
- SDF combines: broken-symmetry capsule + twisted torus segments + atavistic displacement noise
- Soft shadows from single directional light
- Rim lighting in bone-white tones
- Particles rendered as point sprites, driven by GPGPU positions

### Pass 3: Feedback/Accumulation (Offscreen Buffer)
- Reads previous frame's render
- Slight temporal blend (feedback amount: 0.92)
- Adds subtle bloom-like glow accumulation
- This creates the "still arriving" feeling — forms persist and build

### Post (Inline — No EffectComposer)
- Vignette in void-black
- Film grain overlay (procedural)
- Subtle chromatic aberration at edges
- Bone-white color grade

---

## Uniforms & Inputs

- `uTime` — elapsed seconds
- `uResolution` — viewport size
- `uMouse` — hover position (optional interaction)
- `uPalette` — vec3 array: bone (#c8b8a2), off-white (#e8ddd0), void (#111111), black (#000000)
- `uState` — float 0→1 cycle progress (drives arrival/dispersal)

---

## Interaction

- Subtle mouse parallax on camera (not required — scene works autonomously)
- Time-driven loop: 20s arrival, 10s hold, 20s dispersal, 10s void — repeat

---

## File Structure

```
src/components/threejscomponents/scenes/AlphabetOfHunger.tsx
```

Component wraps its own `<Canvas>`. All shaders inline as template literals. Uses `@react-three/fiber`, `@react-three/drei`, and `three`.

---

## Manifest Entry (TOP of array)

```json
{
  "id": "alphabet-of-hunger",
  "title": "The Alphabet of Hunger",
  "date": "2026-04-03",
  "artist": "Austin Osman Spare (Hex generative)",
  "medium": "GLSL / Three.js / React Three Fiber",
  "description": "A sigil-form materializes from noise — particles caught mid-arrival, held by an unseen attractor, then released. Inspired by Spare's automatic drawing and sigil magic."
}
```

---

## Why This Would Make a Graphics Engineer Pause

The GPGPU ping-pong with feedback accumulation creates a system with **memory** — the previous frame influences the next, meaning the scene is never in a clean "initial state." Combined with domain-warped particle attraction toward an SDF core, the form emerges from pure computation with no obvious center. The broken-axis symmetry is intentional sabotage of easy readability.

---

*Oracle seed: 346918 | Artist: Austin Osman Spare | Date: 2026-04-03*
