# SPEC: FOLDED DESIRE

**Oracle Seed:** 20260402
**Artist Channel:** Austin Osman Spare
**Date:** 2026-04-02

---

## Artist Statement

*"The Alphabet of Desire"* — Spare's glyphs were not symbols but *living things*, each one a condensed packet of will and longing, pressed into service. The sigil is a wound in the mind through which the Kia speaks.

This piece enters that territory.

A form emerges from noise — not because it was placed there, but because it was always there, waiting in the signal. The geometry folds. What appears solid is already dissolving. What appears chaotic has already resolved, twice, in the time it took to look away.

The piece should feel like catching something from the corner of your eye that vanishes when you turn to face it. There is a moment — technically 7-12 seconds in — where the form almost resolves into legibility. A shape that could be a letter. A face that almost coheres. It does not resolve. It falls apart and the observer exhales.

**Vertigo that is also homecoming.**

Something is wrong with the fold. The center of the shape is displaced — not symmetrically, not randomly, but with a precision that feels intentional. It is the scar. Leave it.

---

## Technical Approach

### Techniques (minimum two required, we'll use three)

1. **Multi-pass feedback/ping-pong buffers** — Buffer A evolves a particle/signal field. Buffer B reads Buffer A to drive the SDF fold. The buffers ping-pong across frames, accumulating structure.

2. **Raymarched SDF geometry** — The central folded form is constructed as a signed distance field, rendered via raymarching. Not a mesh — a mathematical object that exists as pure function.

3. **Domain warping** — The SDF is warped by noise in domain space before evaluation. This creates the organic, hand-drawn quality. The warp itself is time-evolving, creating the sense of a form that cannot hold still.

4. **GPGPU-driven displacement** — The feedback buffer is rendered to texture each frame, then used to displace the SDF surface. This ties the abstract signal field to the physical geometry.

### Color Palette: Bone and Void

```
#000000  — absolute void (background)
#111111  — deep shadow
#c8b8a2  — aged bone (primary form)
#e8ddd0  — pale signal (highlights, edges)
#ffffff  — the flash of recognition (sparingly)
```

Only three colors from this palette may be active in the scene at once. The constraint is self-imposed.

### The Folded Form

The SDF is constructed from a sphere primitive that has been *domain-folded* — i.e., the input point is reflected through multiple planes before distance evaluation, creating a shape that appears mathematically simple but visually complex. The fold is deliberately asymmetric: the displacement is offset from center by 0.12 units on the Y axis, creating the wrongness. This offset is static and will not be explained.

A secondary SDF — a distorted torus — orbits the folded sphere at a slow angular velocity, rendered at lower opacity. It should feel peripheral, liminal, a shape at the edge of attention.

### The Signal Field (Feedback Buffer)

Buffer A maintains a float texture. Each frame:
- The previous frame's texture is displaced by a curl-noise field (time-evolving)
- A small *attractor* region near the center pulses with energy
- The buffer fades slightly (0.985 multiplier) to prevent saturation

Buffer B converts Buffer A to a normal/displacement map for the SDF surface.

### Post-Processing

Custom post-processing pipeline, manual render pass, no EffectComposer:
- Vignette (smooth falloff, 0.4 intensity)
- Chromatic aberration (very subtle, 0.002 offset)
- Grain (0.04, time-seeded — always slightly different noise each frame)

The grain is intentional. It is the static between channels. Do not remove it.

### Interaction

- **Mouse hover** subtly shifts the fold axis — the asymmetry responds to the cursor as if it were a living thing being observed
- **Click** injects a burst of signal into the feedback buffer — a flash of will
- **Idle** — when untouched for 20+ seconds, the form begins to breathe (scale oscillation, 0.03 amplitude, ~8 second period)

### Timing

The piece has no fixed duration. It loops with a period of approximately 90 seconds — not in a visual cycle but in an energetic one. The first 15 seconds are emergence (from complete noise to initial form). At ~45 seconds the form is most coherent. At ~70 seconds it begins to dissolve. At ~90 seconds it is gone and the cycle restarts.

---

## Delivery

- **Branch:** `folded-desire-2026-04-02`
- **Component:** `src/components/threejscomponents/scenes/FoldedDesire.tsx`
- **Manifest entry:** TOP of the array
- **Artist credit:** Austin Osman Spare / Mauve Zone Oracle
- **Tags:** sigil, sdf, feedback, raymarching, domain-warp

---

*The oracle has spoken. There is no revision.*
