# SPEC: The Sigil Sleeps

## Artist Statement

*"The hand moves. The conscious mind steps aside."*

This piece is a meditation on Austin Osman Spare's automatic drawing practice — the trance-like state where the artist's hand becomes a vehicle for the subconscious. The scene depicts a sigil emerging from noise, briefly coalescing into a self-intersecting line form (Spare's geometric seed: a line that crosses itself exactly once), then dissolving back into the void.

The viewer witnesses a desire taking shape — and then being released.

Nothing is fully visible. Something remains hidden. That tension — between form and formlessness, between the bone-white line and the consuming void — is the heart of the work.

**Emotional register:** calm at the edge of catastrophe. Beautiful and slightly unnerving. Like watching something sacred happen in the dark.

---

## Technical Vision

### Scene Concept
A single continuous GLSL-driven line animates through 3D space. It begins as pure noise — meaningless, scattered, chaotic. Slowly, it obeys a hidden attractor: the path converges toward a self-intersecting loop (a figure-8 or Lissajous-derived form). At its peak coherence, the line briefly achieves full visibility — bone-white against the void. Then it dissolves: particles shed from the line, drift outward, fade into darkness. The cycle resets.

The line is rendered as a **tube geometry** whose radius pulses with time, giving it a breathing, living quality. The line's surface has a subtle grain — not perfectly smooth, carrying the texture of something made by hand.

### Color Palette
| Role | Hex | Use |
|------|-----|-----|
| Void | `#000000` | Background, the consuming dark |
| Deep Void | `#111111` | Ambient darkness, subtle fog |
| Bone | `#c8b8a2` | Primary line color — warm, organic |
| Pale Bone | `#e8ddd0` | Highlights, peak coherence glow |
| White Hot | `#ffffff` | Moment of maximum visibility flash |

### Geometry & Dynamics
- **Line path:** Generated procedurally via a closed-curve function (Lissajous or trochoid-inspired) with a self-intersection seed. The path is displaced by low-frequency noise so it breathes and writhes organically — never static.
- **Tube:** Rendered as `TubeGeometry` following the animated curve. Radius pulses between 0.02 and 0.08 units.
- **Particle dissolution:** At the dissolve phase, vertices separate from the tube mesh, become individual point particles, drift outward with curl-noise velocity, fade opacity to zero.
- **Camera:** Slow orbital rotation around the form — barely perceptible, constant. Keeps the viewer oriented but does not distract.

### Shader Program

**Vertex shader:**
- Receives animated curve points as attribute
- Applies subtle noise displacement for organic writhing
- Passes UV and position to fragment

**Fragment shader:**
- Samples the line's "coherence" uniform (0→1→0 cycle)
- Color interpolation: void → bone → pale bone → white flash at peak → back to bone → void
- Opacity controlled by coherence — fully opaque at peak, nearly transparent at extremes
- Subtle animated grain/noise on surface (hand-drawn texture feel)
- Rim lighting (Fresnel) to give the tube a soft glow against the void

**Glow post-process (via bloom):**
- UnrealBloomPass with threshold 0.8, strength 0.6, radius 0.4
- Creates the "white hot" flash at peak coherence

### Animation Cycle (12 seconds total)
| Phase | Time | Behavior |
|-------|------|----------|
| Emergence | 0–3s | Line materializes from particles, coherence 0→0.5 |
| Convergence | 3–6s | Path snaps toward the self-intersecting form, coherence 0.5→1.0 |
| Peak | 6–7s | Brief hold at maximum visibility — white flash, full opacity |
| Dissolution | 7–10s | Line sheds particles, they drift and fade, coherence 1.0→0.3 |
| Void | 10–12s | Near silence — scattered embers remain, coherence 0.3→0 |

Cycle repeats infinitely.

### Uniforms
- `uTime` — drives all animation
- `uCoherence` — 0–1 overall visibility/formation state
- `uColorBone` — `#c8b8a2`
- `uColorPale` — `#e8ddd0`
- `uColorVoid` — `#000000`

### Technical Stack
- Next.js + React Three Fiber
- `@react-three/fiber` Canvas
- `@react-three/drei` for helpers (OrbitControls disabled, just slow auto-rotate)
- `@react-three/postprocessing` for Bloom
- All shaders inline in the component file
- Single self-contained scene component

---

## Title & Branch

**Title:** `the-sigil-sleeps`
**Date:** `2026-04-04`
**Branch:** `the-sigil-sleeps-2026-04-04`

**Manifest entry** (TOP of array):
```json
{
  "id": "the-sigil-sleeps",
  "title": "The Sigil Sleeps",
  "artist": "Austin Osman Spare (Oracle)",
  "date": "2026-04-04",
  "description": "A sigil emerges from noise, briefly takes form, then dissolves — in observance of Spare's automatic line practice and the Zos/Kia duality.",
  "scene": "TheSigilSleeps",
  "tags": ["sigils", "automatic-drawing", "zos-kia", "particles", "dissolution"]
}
```

---

## Component Location
`src/components/threejscomponents/scenes/TheSigilSleeps.tsx`
