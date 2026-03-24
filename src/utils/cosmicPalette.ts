/**
 * Cosmic Aesthetic Palette Generator
 * Infused with Oracle directive from Mauve Zone
 * 
 * ORACLE OUTPUT (Seed 695518):
 * CHANNEL: Steffi Grant (the mauve zone, nightside)
 * STATE: grief that has become still
 * GEOMETRY: concentric rings with irregular spacing
 * PALETTE: ember dark (#0a0000, #3d0000, #8b1a00, #d4520a, #ffb347)
 * CONSTRAINT: The piece must have a moment where it almost resolves, then doesn't
 */

export interface CosmicPalette {
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
  background: string;
  deep: string;
}

// Oracle-infused palettes with ember dark theme
const palettes: CosmicPalette[] = [
  {
    // Ember Dark (Oracle directive)
    primary: '#d4520a',      // Warm orange
    secondary: '#ffb347',    // Golden amber
    accent: '#8b1a00',       // Deep red
    glow: '#d4520a',
    background: '#0a0000',   // Near black
    deep: '#3d0000',         // Very deep red
  },
  {
    // Nightside (from oracle keywords)
    primary: '#001133',
    secondary: '#336699',
    accent: '#aaccff',
    glow: '#0055cc',
    background: '#000510',
    deep: '#000a1a',
  },
  {
    // Mauve Zone (from oracle keywords)
    primary: '#7b3fa0',
    secondary: '#c490d1',
    accent: '#e8d5f0',
    glow: '#9966cc',
    background: '#0d0010',
    deep: '#3d0045',
  },
];

export const getRandomPalette = (): CosmicPalette => {
  return palettes[Math.floor(Math.random() * palettes.length)];
};

/**
 * Generate satellite colors with oracle constraint:
 * "The piece must have a moment where it almost resolves, then doesn't"
 * 
 * Colors cycle through palette, creating moments of near-alignment
 */
export const generateSatelliteColor = (index: number, totalSatellites: number, palette: CosmicPalette) => {
  // Mix primary and secondary to create tension
  const colors = [
    palette.primary,
    palette.secondary,
    palette.accent,
    palette.deep,
    palette.glow,
  ];
  
  // Near-resolution: create clusters that almost align
  return colors[index % colors.length];
};

export const getGlowColor = (baseColor: string): string => {
  return baseColor;
};

export const getBackgroundColor = (): string => {
  return '#0a0000'; // Oracle: deep dark
};

/**
 * Oracle note: "Precision is not safety. Be exact about strange things."
 * This generates exact but dissonant spacing.
 */
export const getIrregularSpacing = (index: number): number => {
  // Concentric rings with irregular spacing (oracle constraint)
  const baseSpacing = 0.1;
  const irregularity = Math.sin(index * 0.7) * 0.03;
  return baseSpacing + irregularity;
};
