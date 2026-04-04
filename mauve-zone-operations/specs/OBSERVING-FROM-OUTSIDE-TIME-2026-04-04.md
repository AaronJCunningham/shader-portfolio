# SPEC: Observed From Outside Time

**Artist:** Steffi Grant (via The Mauve Zone Oracle)
**Date:** 2026-04-04
**Branch:** `observing-from-outside-time-2026-04-04`

---

## I. Artist Statement

*The feeling of being observed from outside time.* This is not paranoia. This is interception — something on the other side of the membrane, looking through. The form has one axis of symmetry, broken. It is a seal, a sigil, a transmission device. But the subject is not the sigil itself. The subject is what the sigil *removes* from the void. The negative space is the subject.

Steffi Grant received glyphs from the Mauve Zone — that liminal space beyond the dreaming mind where genuine magical transmission occurs. Her glyphs were not designed. They were *intercepted*. This work honors that practice: a complex hermetic glyph assembling itself from deep space, holding in perfect broken symmetry, then dissolving back into the nightside. The observer and the observed share the same void. The symmetry breaks so something can enter.

The nightside palette — the blues of deep space, the mauves of the zone between states — is not a choice. It is the color of the frequency.

---

## II. Visual Concept

**Scene:** A single complex glyph floats in absolute dark. It assembles from scattered fragments drifting in from the edges of a void. The glyph holds — a form with one axis of symmetry, broken — rotating with glacial slowness. Then it begins to dissolve: fragments peeling away, drifting back into the dark. The void reclaims everything. Cycle repeats.

**The glyph:** A composite hermetic structure — layered circular bands, radial spikes, a central void eye — assembled from SDF primitives. One axis of bilateral symmetry is disrupted by a phase offset: the left and right halves are synchronized but misaligned by a small angular offset, creating a sense of unease in the symmetry. It is almost perfect. Almost. That almost is the magic.

**Color temperature:** The nightside. Not blue, not purple — the space between. Colors emerge from deep black: #000510 → #001133 → #003366 → #336699 → #aaccff. Luminance travels inward from the void edges. The glyph itself is the coldest, most luminous point — a beacon in the dark.

**Negative space as subject:** The glyph is defined by what is carved away. A central void sphere carves through multiple nested tori. Radial spokes are defined by subtraction. The glyph is a hole in the void shaped like a transmission.

---

## III. Technical Approach

### Multi-Pass Architecture (Ping-Pong GPGPU)

**Buffer A — Fragment Generator:**
A render-to-texture pass that generates fragment positions using domain-warped FBM noise. Each fragment represents a piece of the glyph. The buffer outputs a texture where RGB encodes 3D positions projected to 2D, and alpha encodes a phase/life value. Two ping-pong textures alternate read/write each frame.

**Buffer B — Glyph SDF Probe:**
A second render-to-texture buffer that computes signed distance values for a simplified glyph SDF at fragment grid positions. This is not rendered to screen — it is a data texture used by the final pass to drive displacement and life-cycle timing. Ping-pong between two textures.

**Final Pass — Glyph Assembler + Post:**
Reads Buffer A (fragment positions) and Buffer B (SDF data). Assembles the full glyph using raymarched SDF composition. The central void eye, nested tori rings, radial spike lattice — all constructed from SDFs. Domain warping distorts the surface of each SDF element slightly, giving organic imperfection to the precision. Anti-aliased with analytical derivatives. Custom post-processing: a subtle chromatic aberration at the glyph edges and a vignette that tightens when the glyph is fully formed.

### SDF Scene Construction

```
Glyph SDF = 
  // Central void eye — carved sphere
  sphere(carve=true) 
  
  // Nested tori rings — three concentric, slightly warped
  ∧ torus_ring_1 
  ∧ torus_ring_2 
  ∧ torus_ring_3
  
  // Radial spike lattice — defined by cylindrical subtraction
  ∧ radial_spikes
  
  // The asymmetry — one axis broken
  ∧ symmetry_breaker
```

**Domain warping:** Each SDF element is displaced by a small FBM offset before evaluation, creating organic surface noise on what would otherwise be sterile precision.

**Raymarching:** 128 steps max, epsilon 0.0005, normal estimation via central differences.

**Post-processing (no EffectComposer):**
- Chromatic aberration at glyph perimeter (RGB channel offset driven by SDF edge proximity)
- Vignette that pulses: wide open during assembly, tight during hold, releases during dissolution
- Subtle film grain overlay

### Uniforms

- `uTime` — animation driver
- `uResolution` — canvas resolution
- `uPhase` — 0→1 cycle progress (assembly 0-0.3, hold 0.3-0.6, dissolution 0.6-1.0)
- `uFragments` — Buffer A texture
- `uSDFData` — Buffer B texture

### Color Pipeline

Fragment color determined by distance from glyph center → palette index:
- d > 0.8: #000510 (void)
- d 0.5-0.8: #001133 (deep nightside)
- d 0.2-0.5: #003366 (mid nightside)
- d 0.05-0.2: #336699 (edge nightside)
- d < 0.05: #aaccff (transmission white-blue)

---

## IV. What Would Make a Graphics Engineer Pause

**The broken-symmetry SDF construction:** Building a complex multi-element SDF scene where the asymmetry is not a bug but a feature — achieved via a carefully controlled angular phase offset on one half of a bilaterally symmetric form. This requires SDF composition with controlled displacement, not mesh manipulation.

**Ping-pong GPGPU for glyph assembly state:** The fragment birth/death/position is not CPU-driven — it emerges from a feedback loop between two GPU buffers. The final pass literally does not know where fragments will be until it reads the texture.

**Negative-space-as-subject SDF design:** The glyph is more hole than solid. The carved central sphere and subtracted radial spikes mean the form is defined by emptiness. This inverts typical SDF rendering where solid geometry defines the form.

---

## V. Cycle Animation Timeline

| Phase | uPhase Range | Event |
|---|---|---|
| Assembly | 0.0 – 0.3 | Fragments drift inward from void edges, glyph coalesces |
| Hold | 0.3 – 0.6 | Complete glyph, slow rotation, symmetry barely maintained |
| Dissolution | 0.6 – 1.0 | Fragments peel away, glyph dissolves into void |

Total cycle: ~12 seconds. Loops infinitely.

---

## VI. Deliverable

A single React Three Fiber component `ObservingFromOutsideTime.tsx` that:
- Owns its `<Canvas>` 
- Implements two ping-pong `BufferGeometry` passes + final raymarching pass
- All shaders inline (vertex + fragment per pass)
- Uses `useFrame` for animation loop
- No external post-processing library
- Exports as default for manifest integration
