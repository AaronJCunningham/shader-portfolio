# SPEC: Threshold Sigil (2026-04-17)

---

## ARTIST STATEMENT

*"The hand moves. The mind steps aside."*

This piece is a meditation on Austin Osman Spare's practice of automatic drawing and sigil generation — the moment when desire condenses from chaos into form, and is then released. We begin in noise. Particles drift in the void like letters scattered across a page — meaningless alone. Slowly, a hidden geometry asserts itself. Particles orient toward an axis of broken symmetry: a form that almost resolves, almost becomes something, but holds itself in permanent liminality. The sigil hovers at the threshold between order and dissolution.

Cold fire burns at the edges. Violet plasma against deep void. The image feels alive — not because it moves randomly, but because it moves *with intention that is almost recognizable*. Like something trying to remember itself.

This is Zos: the body as instrument. This is Kia: consciousness before identity. The particles are the body; the attractor is the void. Together they make a sigil that never completes — only persists, cycling between formation and dissolution, arrest and release.

---

## TECHNICAL SPECIFICATION

### Project Setup
- **Framework:** Next.js with React Three Fiber
- **Component path:** `src/components/threejscomponents/scenes/ThresholdSigil.tsx`
- **Entry integration:** Add to `MauveZonePageClient.tsx` sceneMap + `manifest.json`

### Scene Architecture

**Camera:** PerspectiveCamera at z=5, FOV 60, slight slow drift orbit (±0.3 units) to give depth without distraction. No user controls.

**The Particle Field:**
- 40,000 particles as `THREE.Points`
- Initial positions: random within a sphere of radius 8
- Velocities: small random vectors (Brownian-ish drift)
- Color: driven by particle age/progress through the sigil formation cycle
  - Stage 1 (0–30%): deep violet `#1a0a2e` → electric mauve `#6b0f6b`
  - Stage 2 (30–60%): `#c44dff` cold fire
  - Stage 3 (60–100%): `#ff99ff` → near white `#ffffff` at peak formation

**The Attractor — Broken Axis Symmetry:**
- The target form is a sigil glyph constructed from Spare's Alphabet of Desire energy
- Define a set of hidden attractor points that form the skeleton of an abstract sigil
- The sigil has ONE axis of symmetry — but that axis is fractured/broken at the center (two half-sigils slightly offset, like a crack running through it)
- Particles are pulled toward nearest attractor points with spring force
- Attractor points themselves drift very slowly, breathing at 0.002 units/frame
- As particles approach attractor, their alpha increases (they brighten)
- At peak formation: particles nearest the attractor axes glow white-hot

**The Dissolution Cycle:**
- Particles never fully lock — max 85% proximity to target, then they start drifting free
- Freed particles scatter outward, cool in color, fade
- New particles spawn from the void to replace them
- Cycle period: ~18 seconds full breath

**Shader Detail:**
- Custom `ShaderMaterial` on Points geometry
- Vertex shader: position particles based on time + per-particle seed; compute proximity to nearest attractor axis
- Fragment shader: soft glow discs with radial falloff; color derived from progress value (u-g branch in LAB space for cold fire feel); additive blending for plasma effect

**Lighting/Post:**
- No scene lights needed — particles are self-illuminating via shader
- Bloom pass via `@react-three/postprocessing` — threshold 0.3, strength 1.2, radius 0.8

**Audio:** None

---

## FEEL / RHYTHM

- **0–5s:** Chaos. Particles scatter, slowly orienting. Low opacity.
- **5–12s:** Condensation. Particles begin finding the broken axis. Color intensifies. Cold fire emerges.
- **12–16s:** Peak formation. The half-sigils almost read as a complete form. Brightest moment. White-core particles.
- **16–18s:** Dissolution. Particles release. Scatter into void. Colors cool. Fade to near-black.
- **18s:** Loop seamlessly. No hard reset — dissolve flows into new chaos.

---

## PARAMETERS TO EXPOSE (for potential tuning)

```ts
PARTICLE_COUNT: 40000
ATTRACTOR_COUNT: 12        // 6 per half of broken axis
AXIS_BREAK_OFFSET: 0.18   // units offset between half-sigils
CYCLE_DURATION: 18         // seconds
BLOOM_STRENGTH: 1.2
BLOOM_THRESHOLD: 0.3
```

---

## BRANCH NAME

`threshold-sigil-2026-04-17`

---

## FILES TO CREATE

1. `src/components/threejscomponents/scenes/ThresholdSigil.tsx` — the scene component
2. Update `MauveZonePageClient.tsx` — import + sceneMap entry
3. Update `manifest.json` — prepend to array

---

*Spare bypassed the editor. We bypass the finished form. The sigil exists only in the becoming.*