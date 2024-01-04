export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

// Function to interpolate between two colors
export const lerpColor = (colorStart: number[], colorEnd: number[], t: number): number[] => {
  return colorStart.map((startComponent, index) => 
    lerp(startComponent, colorEnd[index], t)
  );
};

