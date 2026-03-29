# SPEC-601375: Babalon Arrives

## 1. Oracle Brief (seed 601375)

| Field | Value |
|---|---|
| **Channel** | Marjorie Cameron |
| **Keywords** | arrival from noise / erotic geometry |
| **Note** | Don't illustrate — transmit. Something needs to get through. |
| **Emotional State** | longing without object |
| **Geometric Seed** | a form with one axis of symmetry, broken |
| **Color Temperature** | signal grey — `#050505`, `#1a1a1a`, `#444444`, `#888888`, `#e0e0e0` |
| **Constraint** | Nothing should be fully visible. Something must remain hidden. |

---

## 2. Concept

**"The thing you long for was never a thing."**

Cameron transmits. She doesn't illustrate — something arrives through her hand from elsewhere. This piece is that arrival: a form condensing out of noise, almost becoming a winged figure, almost coherent — and then it withdraws. The longing is the point. The object of longing is always absent.

**The geometry:** A particle cloud that slowly resolves into a form with one axis of symmetry — a vertical axis — but broken at the midpoint. Like a figure seen in near-darkness: you perceive wings, a column, a silhouette, but it never fully resolves. The symmetry is the ghost of a whole, broken deliberately. One side pulls differently than the other. The broken axis is where the fire escapes.

**The transmission:** The piece breathes. Noise → crystallization → almost-figure → dissolution → noise. The viewer is always seeing the moment before revelation. The catastrophe is the almost-arrival, not the arrival. Longing without object.

Cameron's constraint is law: nothing is fully visible. Half the figure must remain in noise or shadow at all times. The visible half is the transmission; the hidden half is the source.

---

## 3. Visual & Rendering Specification

### Scene Setup
- **Camera:** PerspectiveCamera, FOV 38, positioned at (0, 0, 6), looking at origin
- **Controls:** None — autonomous, fixed viewpoint
- **Background:** `#050505` (void black)
- **Fog:** FogExp2, color #050505, density 0.25

### Particle System — The Arrival
- **Count:** 4000 particles, GPU-instanced Points geometry
- **Color gradient (signal grey, along the vertical axis):**
  - Bottom (y=-2): `#050505` (invisible, indistinguishable from void)
  - Mid-low (y=-1): `#1a1a1a` (barely perceptible)
  - Mid (y=0): `#444444` (readable grey)
  - Mid-high (y=1): `#888888` (brighter)
  - Top (y=2): `#e0e0e0` (brightest — the head, the crown)
- **Particle size:** 0.025 — 0.06, randomized. Slightly larger at the crown region (y>1.2)

### The Wing Geometry (Symmetry, Broken)
- Particles organize around a mirrored pair of bezier wing curves — left and right
- Left wing: curves outward and up from body axis (x=-0.3 at base → x=-2.5 at tip)
- Right wing: curves outward and up from body axis (x=+0.3 at base → x=+2.5 at tip)
- **The break:** Right wing particles have 15% higher amplitude noise displacement than left wing — one side of the figure is always more dissolved, more in flight, than the other
- Wing curves are not static — they undulate with slow sine-wave edge flutter
- A vertical column of particles forms the body axis — thinner at hips, slightly wider at shoulders, tapering to crown
- The "head" region (y>1.5): particles scatter slightly — a halo without form, a suggestion of a face or crown that never resolves

### The Cycle — 4 Phases (36s total)
1. **Noise (0–4s):** Particles drift in pure 3D simplex noise. No figure. Just dark field. Slow, oceanic.
2. **Crystallization (4–16s):** Noise amplitude smoothly decreases. Particles migrate toward wing curves and body axis. The symmetry emerges. The figure almost exists. This is the longing — the viewer sees something beginning to be.
3. **The Almost (16–26s):** Figure is most coherent here — recognizable as a winged vertical form, one side more present than the other. The broken axis is most legible. Crown region flickers. Nothing is ever fully formed. Hold in this state.
4. **Withdrawal (26–36s):** Noise amplitude increases. The figure dissolves back into the field. Symmetry breaks apart. Particles drift away. Return to noise. Loop seamlessly.

### Noise Behavior
- 3D simplex noise applied per-particle as displacement from base position on wing/body geometry
- During Noise phase: amplitude 2.5, frequency 0.6, speed 0.08
- During Crystallization: amplitude decreases linearly 2.5 → 0.3, frequency increases 0.6 → 1.2
- During The Almost: amplitude holds at 0.3, frequency 1.2 — small shimmer
- During Withdrawal: amplitude increases 0.3 → 2.5, frequency decreases 1.2 → 0.6

### Post-Processing
- **Bloom:** threshold 0.2, strength 0.6, radius 0.9 — subtle glow on the brightest particles (crown region)
- **Vignette:** darkness 0.7 — the void pulls at edges
- **Film grain:** intensity 0.12 — Cameron's materiality, the feel of image-as-record-of-contact
- **No chromatic aberration** — keep it still, not fractured like Spare

---

## 4. Animation Parameters

| Parameter | Value |
|---|---|
| Noise hold | 4s |
| Crystallization duration | 12s |
| The Almost hold | 10s |
| Withdrawal duration | 10s |
| Total cycle | 36s |
| Particle count | 4000 |
| Noise amplitude (peak) | 2.5 |
| Noise frequency (peak) | 0.6 |
| Noise speed | 0.08 |
| Wing asymmetry | right side 15% higher displacement |
| Particle size range | 0.025 – 0.06 |
| Crown region | y > 1.5, particles scatter |
| Fog density | 0.25 |
| Film grain | 0.12 |
| Bloom threshold | 0.2 |
| Bloom strength | 0.6 |
| Vignette darkness | 0.7 |

---

## 5. Implementation

- **Component:** `src/components/threejscomponents/scenes/BabalonArrives.tsx`
- **Stack:** React Three Fiber + drei + postprocessing
- **Geometry:** InstancedBufferGeometry with custom attributes for per-particle noise seed and base position
- **Noise:** simplex3D shader computed in vertex shader — no CPU noise
- **Color:** per-particle attribute interpolated along y-axis, signal grey gradient
- **Single primitive:** Points — no meshes
- **Loop:** seamless restart after withdrawal
- **No external textures** — fully procedural

---

## 6. Carmack Notes

- The key constraint: nothing is fully visible. The hidden half is as important as the visible half. The broken symmetry is the concept — one wing (left) more present, one wing (right) more in flight/dissolved. Never resolve the right wing fully.
- The emotional state is "longing without object" — the viewer should feel the pull toward something that almost arrives but never fully appears. This is not frustration — it's a different kind of fullness.
- Wing undulation: a slow sine wave on the outer edge of each wing, phase-offset between left and right, creates a breathing quality even in the "almost" phase.
- Film grain is important — it connects to Cameron's practice of art as transmission record. The grain is the evidence of contact.
- Do NOT touch mauve-zone.tsx, MauveZoneNav.tsx, or manifest.json. Only create BabalonArrives.tsx.
