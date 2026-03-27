# SPEC-372947: Vertigo Homecoming

## 1. Oracle Brief (seed 372947)

| Field | Value |
|---|---|
| **Channel** | Marjorie Cameron |
| **Keywords** | erotic geometry / the scarlet woman |
| **Note** | Don't illustrate — transmit. Something needs to get through. |
| **Emotional State** | vertigo that is also homecoming |
| **Geometric Seed** | concentric rings with irregular spacing |
| **Color Temperature** | cold fire — `#1a0a2e`, `#6b0f6b`, `#c44dff`, `#ff99ff`, `#ffffff` |
| **Constraint** | It begins in chaos and moves toward order, but does not reach it. |

---

## 2. Concept

**"The fall is upward."**

A field of concentric rings that emerges from total noise — vertices scattered, positions random, as if the geometry hasn't decided what it is yet. Slowly, imperceptibly, the chaos resolves into rings. The spacing firms up. Something almost recognizable assembles.

Then it doesn't. The rings dissolve back into noise — not abruptly, but with the slow resignation of a thing that almost remembered its own shape. The viewer feels they have witnessed an arrival, but from the wrong direction. The vertigo is not in the falling. It's in the moment the ground becomes the ceiling and the body accepts both.

The color temperature — cold fire — is the key. Violet and magenta burning without heat. A flame that does not consume. The palette says "inferno" and the motion says "stillness." That contradiction is the piece.

**Single primitive:** `TorusGeometry` (thin tube) — all rings from one primitive. Chaos is vertex noise applied to ring positions; order is noise subtracted.

---

## 3. Visual & Rendering Specification

### Scene Setup
- **Camera:** PerspectiveCamera, FOV 55, positioned at z=6, looking at origin
- **Controls:** None — fully autonomous
- **Background:** `#0a0510` (near-black with violet undertone)
- **Fog:** FogExp2, color #0a0510, density 0.08

### Rings — The Chaos-to-Order Cycle
- **Count:** 22 concentric rings
- **Geometry:** TorusGeometry(r=1.8, tube=0.012, radialSegments=6, tubularSegments=256) — low radial segments for angular, not smooth, feel
- **Ring state machine (per ring, independent phase):**
  - Phase 0 — CHAOS: Vertex noise amplitude 0.4. Ring unrecognizable
  - Phase 1 — COHERING: Noise decreases over 4–6s
  - Phase 2 — FORM: Full TorusGeometry for ~2s. Near-zero rotation
  - Phase 3 — DISSOLVING: Noise increases over 3–4s
  - Phase 4 — CHAOS: Brief full-noise, then coheres again
- **Cycle duration:** 25–40s per ring (randomized)
- **Phase offset:** Each ring has random phase offset — field is never synchronized
- **Result:** A living field where some rings are clear, others dissolving, others coheres

### Spacing
- Base radius: logarithmic spacing, inner tight, outer loose
- Spacing perturbation: 0.05 * sin(time * 0.3 + ringIndex)
- At peak coherence, inner 6–8 rings approach sigil-adjacent ratio

### Color Mapping (cold fire)
- Inner rings (most coherent): #ff99ff → #c44dff
- Middle rings: #6b0f6b
- Outer rings (most chaotic): #1a0a2e
- #ffffff reserved for peak-coherence white flash on innermost ring apex

### Rotation
- During chaos: fast, erratic (±0.015 rad/frame), direction flips
- During coherence/form: near-zero rotation

### Post-Processing
- Bloom: UnrealBloomPass, threshold 0.05, strength 0.8, radius 0.7
- Chromatic aberration: offset 0.001

---

## 4. Animation Parameters

| Parameter | Value |
|---|---|
| Ring count | 22 |
| Chaos amplitude | 0.4 → 0.0 |
| Coherence duration | 4–6s |
| Form hold | ~2s |
| Dissolve duration | 3–4s |
| Full cycle | 25–40s per ring |
| Rotation speed (chaos) | ±0.015 rad/frame, erratic |
| Rotation speed (form) | ~0.001 rad/frame |
| Spacing perturbation | 0.05 * sin(time * 0.3 + index) |
| Bloom threshold | 0.05 |
| Bloom strength | 0.8 |
| Chromatic aberration | 0.001 offset |

---

## 5. Implementation

- Component: src/components/threejscomponents/scenes/VertigoHomecoming.tsx
- Stack: React Three Fiber + drei + postprocessing
- All animation in useFrame — no GSAP
- Single primitive: TorusGeometry with per-vertex noise displacement
- No external textures — fully procedural
- Page /mauve-zone renders VertigoHomecoming fullscreen
- Color palette: #1a0a2e #6b0f6b #c44dff #ff99ff #ffffff

---

## 6. Folder Structure

mauve-zone-operations/
  scenes/
    HungerCircuit.tsx      (SPEC-691673)
    VertigoHomecoming.tsx  (SPEC-372947)
  SPEC-691673.md
  SPEC-372947.md
  oracle.ts
  research/

shader-portfolio/
  src/components/threejscomponents/scenes/
    MauveZoneScene.tsx    ← placeholder, keep for routing
    VertigoHomecoming.tsx ← the actual piece

---

## 7. Acceptance Criteria

- [ ] Fullscreen canvas, dark violet-black background
- [ ] 22 concentric rings visible
- [ ] Rings independently cycle chaos → coherence → form → dissolve
- [ ] During chaos, rings visibly perturbed / unrecognizable
- [ ] During form, rings clear and nearly still
- [ ] Field never uniform — rings in different phases
- [ ] Inner rings approach sigil-adjacent spacing at peak coherence
- [ ] Colors: #ff99ff/#c44dff inner → #6b0f6b middle → #1a0a2e outer
- [ ] Bloom on bright inner rings
- [ ] Subtle chromatic aberration
- [ ] Fully autonomous — no user interaction
- [ ] Clean build, 60fps
