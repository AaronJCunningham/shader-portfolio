/**
 * Cosmic Aesthetic Palette Generator
 * Creates surreal, abstract colors for satellite visualization
 */

export interface CosmicPalette {
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
  background: string;
}

// Abstract cosmic color palettes
const palettes: CosmicPalette[] = [
  {
    primary: '#FF006E',    // Hot pink/magenta
    secondary: '#00D9FF',  // Cyan
    accent: '#FFB703',     // Golden
    glow: '#FF006E',
    background: '#0a0e27'
  },
  {
    primary: '#9D4EDD',    // Purple
    secondary: '#3A86FF',  // Blue
    accent: '#FB5607',     // Orange
    glow: '#9D4EDD',
    background: '#0f0819'
  },
  {
    primary: '#06FFA5',    // Neon green
    secondary: '#FF006E',  // Hot pink
    accent: '#00D9FF',     // Cyan
    glow: '#06FFA5',
    background: '#0d0221'
  },
  {
    primary: '#00F0FF',    // Cyan-blue
    secondary: '#FF10F0',  // Magenta
    accent: '#FFD60A',     // Yellow
    glow: '#00F0FF',
    background: '#0a0a1a'
  }
];

// Get random palette
export const getRandomPalette = (): CosmicPalette => {
  return palettes[Math.floor(Math.random() * palettes.length)];
};

/**
 * Generate surreal satellite colors from palette
 */
export const generateSatelliteColor = (index: number, totalSatellites: number, palette: CosmicPalette) => {
  const colors = [
    palette.primary,
    palette.secondary,
    palette.accent,
    '#FF006E',
    '#00D9FF',
    '#06FFA5',
    '#FF10F0',
    '#FFD60A',
    '#9D4EDD',
    '#3A86FF',
  ];
  
  return colors[index % colors.length];
};

/**
 * Generate glow color from base color
 */
export const getGlowColor = (baseColor: string): string => {
  // Return the glow variant (more saturated, brighter)
  return baseColor;
};

/**
 * Get dark space background
 */
export const getBackgroundColor = (): string => {
  return '#0a0e27';
};
