# SPEC-342119: The Crossing

## 1. Oracle Brief (seed 342119)

| Field | Value |
|---|---|
| **Channel** | Austin Osman Spare |
| **Keywords** | sigil / atavistic form |
| **Note** | Bypass the editor. Let the subconscious move the hand. |
| **Emotional State** | calm at the edge of catastrophe |
| **Geometric Seed** | a line that crosses itself exactly once |
| **Color Temperature** | the nightside — `#000510`, `#001133`, `#003366`, `#336699`, `#aaccff` |
| **Constraint** | The negative space is the subject. |

---

## 2. Concept

**"The sigil is the void, not the line."**

A single continuous line begins in total darkness — formless, wandering, atavistic. Like Spare drawing in the dark, the hand moves without knowing where. Slowly the chaos resolves. The line finds its path, its direction. It moves with purpose now — but with the particular purposefulness of something that has forgotten it was ever lost.

Then: a single crossover. Two segments of the same line occupy the same point at the same moment. In that crossing, the sigil is born — not the line itself, but the negative space it creates. The void inside the intersection. The crossing is the subject. The line is just the frame.

The line holds. The void pulses with cold electric light. Then the line dissolves back into darkness — not dramatically, but with the quiet resignation of something returning to where it always was. Calm at the edge of catastrophe.

**Single primitive:** Custom BufferGeometry — a continuous tube mesh following a CatmullRomCurve3 path, where the curve control points are driven by noise that slowly resolves into a self-intersecting figure.

---

## 3. Visual & Rendering Specification

### Scene Setup
- **Camera:** PerspectiveCamera, FOV 45, positioned at z=8, looking at origin
- **Controls:** None — fully autonomous, fixed viewpoint
- **Background:** `#000510` (near-void black with faint blue undertone)
- **Fog:** FogExp2, color #000510, density 0.12

### The Line — Geometry & Behavior
- **Path:** CatmullRomCurve3 with 12 control points, 256 tubular segments
- **Tube radius:** 0.018, 8 radial segments — thin, precise
- **Material:** MeshBasicMaterial, nightside gradient mapped along curve (t parameter)
  - t=0.0 → #000510 (near-black, indistinguishable from void)
  - t=0.25 → #001133 (deep navy)
  - t=0.5 → #003366 (midnight blue)
  - t=0.75 → #336699 (steel blue)
  - t=1.0 → #aaccff (electric ice — brightest point at crossover)
- **Crossover glow:** At the intersection point (t≈0.5), emissive bloom spike — the crossing burns brightest

### The Cycle — 5 Phases
1. **Darkness (0–3s):** Line exists but is invisible — tube opacity 0. Nothing moves yet.
2. **Emergence (3–8s):** The line materializes from nothing — opacity ramps 0→1. Control points still in noise phase.
3. **Coherence (8–20s):** Noise amplitude decreases smoothly. The line "remembers" its path. It wanders, atavistic, organic — but is clearly ONE line, not many. Control points slowly migrate toward the crossover configuration.
4. **The Crossing (20–28s):** The line crosses itself exactly once. At the moment of crossover, the void inside the crossing becomes the visual subject — dark against the electric-blue crossing point. The intersection point emits a cold white-blue bloom flare. Hold here.
5. **Dissolution (28–38s):** Noise returns. The line wanders away from its own crossing. Opacity fades. The void closes. Darkness returns. Then pause. Then loop.

### Crossover Math
- Control points are computed so the curve necessarily self-intersects at exactly one point
- Achieved by placing two control points on opposite sides of the curve's midpoint, with the curve's control net designed to cross
- Use cubic bezier math: P0, P1, P2, P3 — the curve crosses itself if the curve from P0→P3 is bisected by a point on the P1→P2 segment at the correct t value
- The crossover point (t≈0.5) is where the bloom spike occurs

### Negative Space Treatment
- A dark plane or slightly-lighter-than-void backdrop sphere at z=-2 provides just enough contrast for the void to be readable
- The void (negative space inside the crossing) should NOT be pure black — it should be `#001133` (the faintest navy) so the eye can perceive the emptiness
- The line glows brightest at the crossover — #aaccff — making the dark interior read as a void

### Post-Processing
- Bloom: UnrealBloomPass, threshold 0.3, strength 1.2, radius 0.8 — the crossover point blooms strongly
- Chromatic aberration: offset 0.0008 — subtle, cold
- Vignette: darkness 0.6 at edges — the void pulls at the periphery

---

## 4. Animation Parameters

| Parameter | Value |
|---|---|
| Darkness hold | 3s |
| Emergence duration | 5s |
| Coherence duration | 12s |
| Crossover hold | 8s |
| Dissolution + reset | 10s |
| Total cycle | ~38s |
| Noise amplitude (coherence) | 1.2 → 0.0 |
| Noise frequency | 0.8 |
| Noise speed | 0.15 |
| Tube radius | 0.018 |
| Curve tubular segments | 256 |
| Bloom threshold | 0.3 |
| Bloom strength | 1.2 |
| Chromatic aberration | 0.0008 |
| Fog density | 0.12 |

---

## 5. Implementation

- **Component:** `src/components/threejscomponents/scenes/TheCrossing.tsx`
- **Stack:** React Three Fiber + drei + postprocessing
- **All animation:** useFrame — perlin/simplex noise for control point drift
- **Single primitive:** BufferGeometry tube following CatmullRomCurve3
- **No external textures** — fully procedural
- **Loop:** seamless restart after dissolution
- **Color palette:** #000510 #001133 #003366 #336699 #aaccff

---

## 6. Carmack Notes

- The tricky part is the crossover geometry — the curve must self-intersect at exactly one point. Test the control point configuration mathematically before rendering.
- The "negative space is the subject" constraint means the crossing void should be the darkest readable point — not pure black, but barely perceptible navy. The LINE is bright at that point; the VOID is the space the line makes.
- Do NOT touch mauve-zone.tsx, MauveZoneNav.tsx, or manifest.json. Only create TheCrossing.tsx.
- The emotional quality is "held breath" — nothing explodes, nothing resolves. The catastrophe is the stillness.
