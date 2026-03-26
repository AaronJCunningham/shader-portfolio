/**
 * The Mauve Zone Oracle
 *
 * Generates a seeded creative brief for Hex.
 * Once the oracle speaks, there is no negotiation.
 *
 * Usage:
 *   npx ts-node oracle.ts          ← random seed
 *   npx ts-node oracle.ts 42       ← fixed seed (reproducible)
 */

// ─── Seeded PRNG (mulberry32) ────────────────────────────────────────────────
// Pure function, no external deps. Given the same seed, always returns the
// same sequence — so a brief can be reproduced exactly from its seed number.

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Source material ─────────────────────────────────────────────────────────

const ARTISTS = [
  {
    name: "Austin Osman Spare",
    keywords: ["sigil", "automatic line", "atavistic form", "the alphabet of desire", "zos and kia"],
    note: "Bypass the editor. Let the subconscious move the hand.",
  },
  {
    name: "Marjorie Cameron",
    keywords: ["babalon", "fire-figure", "the scarlet woman", "arrival from noise", "erotic geometry"],
    note: "Don't illustrate — transmit. Something needs to get through.",
  },
  {
    name: "Steffi Grant",
    keywords: ["hermetic glyph", "nightside", "the mauve zone", "typhonian transmission", "nu-isis"],
    note: "Precision is not safety. Be exact about strange things.",
  },
];

const EMOTIONAL_STATES = [
  "longing without object",
  "the moment before recognition",
  "grief that has become still",
  "ecstatic dissolution",
  "the feeling of being observed from outside time",
  "hunger with no name",
  "calm at the edge of catastrophe",
  "the satisfaction of a completed pattern",
  "vertigo that is also homecoming",
  "tenderness toward something that cannot receive it",
];

const GEOMETRIC_SEEDS = [
  "a single point expanding outward",
  "two opposing spirals that never touch",
  "a grid that buckles at the center",
  "concentric rings with irregular spacing",
  "a field of parallel lines interrupted once",
  "a shape that has been folded",
  "vertices of a polygon drifting apart",
  "a line that crosses itself exactly once",
  "a form with one axis of symmetry, broken",
  "nested shapes of decreasing coherence",
];

const COLOR_TEMPERATURES = [
  { name: "cold fire", palette: ["#1a0a2e", "#6b0f6b", "#c44dff", "#ff99ff", "#ffffff"] },
  { name: "deep mauve", palette: ["#0d0010", "#3d0045", "#7b3fa0", "#c490d1", "#e8d5f0"] },
  { name: "bone and void", palette: ["#000000", "#111111", "#c8b8a2", "#e8ddd0", "#ffffff"] },
  { name: "ember dark", palette: ["#0a0000", "#3d0000", "#8b1a00", "#d4520a", "#ffb347"] },
  { name: "the nightside", palette: ["#000510", "#001133", "#003366", "#336699", "#aaccff"] },
  { name: "blood and gold", palette: ["#1a0000", "#660000", "#cc0000", "#cc9900", "#ffdd44"] },
  { name: "signal grey", palette: ["#050505", "#1a1a1a", "#444444", "#888888", "#e0e0e0"] },
  { name: "viridian shadow", palette: ["#000a05", "#003322", "#006644", "#33aa77", "#99ffcc"] },
];

const CONSTRAINTS = [
  "No symmetry. If it feels balanced, break it.",
  "Nothing should be fully visible. Something must remain hidden.",
  "It must feel like it is still arriving.",
  "Movement only at the periphery. The center is still.",
  "Use only one geometric primitive. Let it do everything.",
  "The piece must have a moment where it almost resolves, then doesn't.",
  "No straight lines.",
  "The negative space is the subject.",
  "It begins in chaos and moves toward order, but does not reach it.",
  "Something in the piece should feel wrong. Leave it.",
  "Maximum three colors from the palette. No more.",
  "The motion must feel involuntary — like breathing, not walking.",
];

// ─── Pick ─────────────────────────────────────────────────────────────────────

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

// ─── Generate brief ───────────────────────────────────────────────────────────

function generateBrief(seed: number) {
  const rand = mulberry32(seed);

  const artist = pick(ARTISTS, rand);
  const keyword = pick(artist.keywords, rand);
  const emotion = pick(EMOTIONAL_STATES, rand);
  const geometry = pick(GEOMETRIC_SEEDS, rand);
  const colorTemp = pick(COLOR_TEMPERATURES, rand);
  const constraint = pick(CONSTRAINTS, rand);

  // A second keyword pull for texture
  const keyword2 = pick(
    artist.keywords.filter((k) => k !== keyword),
    rand
  );

  return {
    seed,
    artist,
    keyword,
    keyword2,
    emotion,
    geometry,
    colorTemp,
    constraint,
  };
}

// ─── Render ───────────────────────────────────────────────────────────────────

function render(brief: ReturnType<typeof generateBrief>) {
  const divider = "─".repeat(60);

  console.log("\n");
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║              T H E   M A U V E   Z O N E                ║");
  console.log("║                    O R A C L E                          ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`\n  SEED: ${brief.seed}\n`);
  console.log(divider);

  console.log(`\n  CHANNEL:     ${brief.artist.name}`);
  console.log(`  CURRENT:     ${brief.keyword} / ${brief.keyword2}`);
  console.log(`  NOTE:        ${brief.artist.note}`);

  console.log(`\n${divider}`);
  console.log(`\n  EMOTIONAL STATE:`);
  console.log(`  → ${brief.emotion}`);

  console.log(`\n  GEOMETRIC SEED:`);
  console.log(`  → ${brief.geometry}`);

  console.log(`\n  COLOR TEMPERATURE:  ${brief.colorTemp.name}`);
  console.log(`  PALETTE:`);
  brief.colorTemp.palette.forEach((hex) => {
    // Rough terminal color block using ANSI where possible
    console.log(`    ${hex}`);
  });

  console.log(`\n${divider}`);
  console.log(`\n  CONSTRAINT (non-negotiable):`);
  console.log(`  → ${brief.constraint}`);

  console.log(`\n${divider}`);
  console.log(`\n  The oracle has spoken. There is no revision.\n`);
  console.log(divider + "\n");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const rawSeed = process.argv[2];
const seed = rawSeed ? parseInt(rawSeed, 10) : Math.floor(Math.random() * 999999);

const brief = generateBrief(seed);
render(brief);

// Also export for future use in Next.js / Three.js
export { generateBrief, mulberry32, ARTISTS, EMOTIONAL_STATES, GEOMETRIC_SEEDS, COLOR_TEMPERATURES, CONSTRAINTS };
export type { };
