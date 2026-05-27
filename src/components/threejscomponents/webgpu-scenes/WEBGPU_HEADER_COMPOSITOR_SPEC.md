# WebGPU Header Compositor Spec

Goal: match the original WebGL header architecture, not a group-fade redesign.

1. Build four independent particle scenes.
2. Render each scene every frame into its own render target texture.
3. Draw exactly one fullscreen output plane to the visible canvas.
4. The output plane uses a TSL node material that samples two render target textures at a time.
5. Scroll is split into three phases:
   - phase 1: scene 1 to scene 2
   - phase 2: scene 2 to scene 3
   - phase 3: scene 3 to scene 4
6. The transition is the original hard diagonal wipe:
   - `wipePos = (uv.x + uv.y) * 0.5`
   - `wipe = smoothstep(progress - softness, progress + softness, wipePos)`
   - use a small but visible softness value, currently `0.035`, so partial states read clearly while preserving a hard diagonal transition line.
   - map linear scroll progress through the diagonal wipe distribution before assigning `progress`, so early scroll movement visibly reveals part of the next scene instead of hiding in a tiny corner.
   - `color = mix(nextSceneTexture, currentSceneTexture, wipe)`
7. The scene overlay reads the same scroll phase/progress from Zustand.
8. Scene files own their particle math and pointer response. The header shell owns only renderer, render targets, compositor, and scroll orchestration.
