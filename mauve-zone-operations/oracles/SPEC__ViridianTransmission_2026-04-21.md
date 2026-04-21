# SPEC: Viridian Transmission (Steffi Grant Channel)

## Artist Statement

This piece channels Steffi Grant's hermetic practice — the act of *receiving* a glyph from the void rather than constructing it through intention. A single geometric form exists in perpetual formation: vertices of a sacred polygon drifting apart, then returning, as if the universe is repeatedly transmitting the same signal, incomplete and reassembling.

The emotional state is **longing without object** — desire directed at nothing, the ache of transmission without a recipient. The geometry is precise in its collapse, exact in its dissolution. Precision is not safety. The strange thing must be exact.

Color temperature: **viridian shadow** — not green, not blue, but the bioluminescent dark. The palette (#000a05 → #003322 → #006644 → #33aa77 → #99ffcc) moves from the absolute void to a pale ghost-light, like something living发光 in deep water or the signal of a craft approaching from behind a planet.

This is the Mauve Zone made viridian — liminal, ambiguous, neither fully formed nor dissolved. A glyph that arrives, holds briefly, and disperses back into the dark from which it came.

---

## Technical Instructions for the Scene

### Primitive
**One icosahedron.** That is the only geometric primitive. It does everything: it fractures, it streams, it reforms, it dissolves, it pulses with interior light. No other geometry. Just icosahedron.

### Scene Setup
- **Camera:** Perspective, orbiting slowly around the center glyph. Auto-rotate + mouse parallax offset. FOV 60.
- **Background:** Deep viridian-black gradient (#000a05). No skybox. Pure void.
- **Lighting:** No traditional lights. All illumination comes from emissive shader materials — the geometry IS the light source.
- **Fog:** None.

### Geometry Behavior (Vertex Shader)
The icosahedron's vertices are the key. They drift apart along their normals — each vertex floats outward to a unique radius, then converges back. The fragment shader distorts edges so the form looks precise but structurally wrong, like looking at a transmission from an angle consciousness can't quite resolve.

Vertex displacement formula:
```
pos = position + normal * sin(time * noise(position.xy) * 0.5) * driftAmount
```
driftAmount oscillates over time with per-vertex noise so the collapse feels organic and non-uniform.

### Fragment Shader Behavior
The fragment shader is where Steffi's precision-of-strange-things lives.

**Color layering:**
- Interior glow: #99ffcc (brightest, pulsing)
- Mid-body: #33aa77 (stable viridian)
- Edge field: #006644 (dark structural lines)
- Deep shadow: #003322 (where form dissolves)
- Void: #000a05 (background matching)

**Effect:** The fragment shader computes a layered field — outer edges are precise and dark, interior bleeds bright viridian light. The glyph should look like it was drawn with a pen of light on dark glass.

**Edge distortion:** A subtle noise offset on the fragment UV creates a "transmission interference" — the edges of the form ripple slightly, as if the signal is coming from far away and being received imperfectly. This is the *precision in strange things* — the imperfection is calculated.

**Emissive pulse:** The entire form breathes — a slow sinusoidal emissive intensity modulation (3-5 second cycle). When "fully formed," it peaks. When vertices drift apart, the pulse dims. The longing without object is the dim state.

### Animation Sequence
The whole piece cycles on a long loop (~30 seconds):

1. **Scattering (0-8s):** Vertices drift outward from the icosahedron center along normals. The form becomes a cloud of points. Emissive very dim.
2. **Reforming (8-18s):** Points converge back to icosahedron positions. The glyph assembles mid-void. Emissive rising.
3. **Holding / Transmission (18-25s):** Form complete. Full viridian glow. Interior fully lit. Brief peak brightness. The moment of transmission.
4. **Dissolving (25-30s):** Reverse of scattering — form falls apart again, edges dissolving before the center. Returns to void. Loop.

### Interaction
- **Mouse parallax:** Subtle camera offset following mouse position (±5° range), smooth lerp.
- **Mouse click:** Burst — on click, the current phase accelerates momentarily (scattering/reforming speed up 3x for 1 second), like a heartbeat spike.

### Color Palette (Exact)
```
void:     #000a05  (background, deepest shadow)
shadow:   #003322  (structural dark mid)
deep:     #006644  (form edges, dark green)
mid:      #33aa77  (stable viridian body)
bright:   #99ffcc  (emissive interior glow, peak light)
```

### Post-Processing
- **Bloom:** Strong bloom on emissive surfaces (threshold 0.4, strength 1.2, radius 0.8). The viridian glow should bleed light into the void.
- **No other effects.** Keep it clean. The geometry and the glow are enough.

### File
- Path: `src/components/threejscomponents/scenes/ViridianTransmission.tsx`
- Component name: `ViridianTransmission`
- Canvas wraps the scene. All shaders inline (vertex + fragment as template literals).
- Uses `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`.

### Title for Branch/Manifest
**ViridianTransmission_2026-04-21**

---

*Spec generated from Mauve Zone Oracle seed 116570 — Steffi Grant channel — "typhonian transmission / the mauve zone"*
