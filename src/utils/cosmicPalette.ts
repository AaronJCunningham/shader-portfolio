/**
 * Cosmic Aesthetic Palette Generator
 * Infused with Oracle directive from Mauve Zone
 */

export interface CosmicPalette {
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
  background: string;
  deep: string;
}

const palettes: CosmicPalette[] = [
  {
    // Ember Dark (Oracle directive)
    primary: '#d4520a',
    secondary: '#ffb347',
    accent: '#8b1a00',
    glow: '#d4520a',
    background: '#0a0000',
    deep: '#3d0000',
  },
  {
    // Nightside
    primary: '#001133',
    secondary: '#336699',
    accent: '#aaccff',
    glow: '#0055cc',
    background: '#000510',
    deep: '#000a1a',
  },
  {
    // Mauve Zone
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

export const generateSatelliteColor = (index: number, _totalSatellites: number, palette: CosmicPalette): string => {
  const colors = [
    palette.primary,
    palette.secondary,
    palette.accent,
    palette.deep,
    palette.glow,
  ];
  
  return colors[index % colors.length];
};

export const getGlowColor = (_baseColor: string): string => {
  return '#d4520a';
};

export const getBackgroundColor = (): string => {
  return '#0a0000';
};

export const getIrregularSpacing = (index: number): number => {
  const baseSpacing = 0.1;
  const irregularity = Math.sin(index * 0.7) * 0.03;
  return baseSpacing + irregularity;
};
