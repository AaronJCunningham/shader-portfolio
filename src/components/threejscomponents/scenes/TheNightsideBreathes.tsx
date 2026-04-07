'use client';

/**
 * The Nightside Breathes — Steffi Grant / Oracle 20260407
 *
 * Oracle seed: 20260407
 * Artist: Steffi Grant — The Mauve Zone / Nightside
 * Emotional state: calm at the edge of catastrophe
 * Geometric seed: a grid that buckles at the center
 * Constraint: motion must feel involuntary — like breathing, not walking
 * Palette: blood and gold
 *
 * A 3D grid that breathes — expanding and contracting from its center.
 * The motion is organic, involuntary, like the pulse of existence itself.
 * Colors shift from deep blood through gold as the structure resonates.
 * Centered distortion creates a sense of something trying to come through.
 */

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const SEED = 20260407;
const BREATH_PERIOD = 6.0; // seconds per full breath cycle

// ─── Vertex Shader ────────────────────────────────────────────────────────────
const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uBreathIntensity;

  attribute vec3 aOriginalPos;

  varying float vDistance;
  varying float vBreathe;

  void main() {
    vec3 pos = aOriginalPos;
    
    // Distance from center
    float dist = length(pos);
    vDistance = dist;
    
    // Breathing cycle: smooth sine wave
    // Period: 6 seconds (2π / 6 ≈ 1.047)
    float breathCycle = sin(uTime * 1.047) * 0.5 + 0.5; // 0..1
    vBreathe = breathCycle;
    
    // Center buckles inward most, outer grid holds steady
    // Gaussian falloff from center
    float centerMask = exp(-dist * dist * 2.5);
    
    // Breathing motion: normal → inward → normal
    // At peak (breathCycle = 1.0), center compresses inward
    // At trough (breathCycle = 0.0), returns to normal
    float buckleFactor = mix(1.0, 0.5, breathCycle); // 1.0 → 0.5 → 1.0
    
    // Radial displacement: positive = outward, 0.5 = inward compression
    vec3 radialDir = normalize(pos);
    float displacement = (buckleFactor - 1.0) * centerMask * uBreathIntensity;
    pos += radialDir * displacement;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

// ─── Fragment Shader ──────────────────────────────────────────────────────────
const fragmentShader = /* glsl */ `
  varying float vDistance;
  varying float vBreathe;

  void main() {
    // Palette: blood → dark red → red → orange → gold
    vec3 blood = vec3(0.102, 0.0, 0.0);      // #1a0000
    vec3 darkRed = vec3(0.4, 0.0, 0.0);      // #660000
    vec3 red = vec3(0.8, 0.0, 0.0);          // #cc0000
    vec3 orange = vec3(0.8, 0.6, 0.0);       // #cc9900
    vec3 gold = vec3(1.0, 0.867, 0.267);     // #ffdd44
    
    // Color based on distance from center, modulated by breathing
    float t = (vDistance / 2.8) * (1.0 + vBreathe * 0.4);
    t = clamp(t, 0.0, 1.0);
    
    vec3 col;
    if (t < 0.25) {
      col = mix(blood, darkRed, t * 4.0);
    } else if (t < 0.5) {
      col = mix(darkRed, red, (t - 0.25) * 4.0);
    } else if (t < 0.75) {
      col = mix(red, orange, (t - 0.5) * 4.0);
    } else {
      col = mix(orange, gold, (t - 0.75) * 4.0);
    }
    
    // Breathing pulse: colors brighten at peak, darken at trough
    col *= mix(0.85, 1.15, vBreathe);
    
    gl_FragColor = vec4(col, 0.95);
  }
`;

// ─── Grid Geometry Generator ──────────────────────────────────────────────────
function createGridGeometry(gridSize: number = 21): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  
  const half = (gridSize - 1) / 2;
  const scale = 2.0 / half; // Scale grid to ±2.0
  
  const vertices: number[] = [];
  const originalPositions: number[] = [];
  
  // Generate grid points
  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      for (let z = 0; z < gridSize; z++) {
        const px = (x - half) * scale;
        const py = (y - half) * scale;
        const pz = (z - half) * scale;
        
        vertices.push(px, py, pz);
        originalPositions.push(px, py, pz);
      }
    }
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
  geometry.setAttribute('aOriginalPos', new THREE.BufferAttribute(new Float32Array(originalPositions), 3));
  
  // Indices for LineSegments (grid edges)
  const indices: number[] = [];
  const stride = gridSize * gridSize;
  
  // X-axis edges
  for (let y = 0; y < gridSize; y++) {
    for (let z = 0; z < gridSize; z++) {
      for (let x = 0; x < gridSize - 1; x++) {
        const idx = x + y * gridSize + z * stride;
        indices.push(idx, idx + 1);
      }
    }
  }
  
  // Y-axis edges
  for (let x = 0; x < gridSize; x++) {
    for (let z = 0; z < gridSize; z++) {
      for (let y = 0; y < gridSize - 1; y++) {
        const idx = x + y * gridSize + z * stride;
        indices.push(idx, idx + gridSize);
      }
    }
  }
  
  // Z-axis edges
  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      for (let z = 0; z < gridSize - 1; z++) {
        const idx = x + y * gridSize + z * stride;
        indices.push(idx, idx + stride);
      }
    }
  }
  
  geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
  
  return geometry;
}

// ─── Breathing Grid Component ─────────────────────────────────────────────────
function BreathingGrid() {
  const linesRef = useRef<THREE.LineSegments>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  
  const geometry = useMemo(() => createGridGeometry(21), []);
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uBreathIntensity: { value: 0.6 },
  }), []);
  
  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = clock.getElapsedTime();
    }
  });
  
  return (
    <lineSegments ref={linesRef} geometry={geometry}>
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent={false}
        depthWrite={true}
        linewidth={1.0}
      />
    </lineSegments>
  );
}

// ─── Main Scene ───────────────────────────────────────────────────────────────
export default function TheNightsideBreathes() {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 50 }}
      style={{ background: '#1a0000', width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: false }}
    >
      <BreathingGrid />
    </Canvas>
  );
}
