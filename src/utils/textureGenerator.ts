import * as THREE from 'three';

/**
 * Generate a simple Earth-like texture procedurally
 */
export const generateEarthTexture = (width: number = 2048, height: number = 1024): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Failed to get canvas context');

  // Ocean base
  ctx.fillStyle = '#1a4d7a';
  ctx.fillRect(0, 0, width, height);

  // Continents (simplified)
  const continents = [
    // North America
    { x: 0.15, y: 0.3, w: 0.15, h: 0.25, color: '#2d5a2d' },
    // South America
    { x: 0.2, y: 0.55, w: 0.08, h: 0.2, color: '#2d5a2d' },
    // Europe/Africa
    { x: 0.4, y: 0.2, w: 0.25, h: 0.4, color: '#2d5a2d' },
    // Asia
    { x: 0.55, y: 0.15, w: 0.35, h: 0.35, color: '#2d5a2d' },
    // Australia
    { x: 0.75, y: 0.55, w: 0.1, h: 0.15, color: '#2d5a2d' },
  ];

  continents.forEach(({ x, y, w, h, color }) => {
    ctx.fillStyle = color;
    ctx.fillRect(x * width, y * height, w * width, h * height);
  });

  // Add some noise for texture
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = Math.random() * 15;
    data[i] += noise;
    data[i + 1] += noise;
    data[i + 2] += noise;
  }

  ctx.putImageData(imageData, 0, 0);

  return new THREE.CanvasTexture(canvas);
};

/**
 * Generate a bump map for terrain detail
 */
export const generateBumpTexture = (width: number = 2048, height: number = 1024): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Failed to get canvas context');

  // Start with gray
  ctx.fillStyle = '#888888';
  ctx.fillRect(0, 0, width, height);

  // Add Perlin-like noise (simplified)
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < width * height; i++) {
    const value = 128 + Math.sin(i * 0.01) * 40 + Math.cos(i * 0.005) * 30;
    const idx = i * 4;
    data[idx] = Math.min(255, Math.max(0, value));
    data[idx + 1] = Math.min(255, Math.max(0, value));
    data[idx + 2] = Math.min(255, Math.max(0, value));
    data[idx + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);

  return new THREE.CanvasTexture(canvas);
};
