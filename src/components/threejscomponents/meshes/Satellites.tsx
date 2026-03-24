import React, { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { fetchTLEData, calculateMultipleSatellitePositions, type SatellitePosition } from '@/utils/orbitCalculator';

const Satellites: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const [satellites, setSatellites] = useState<SatellitePosition[]>([]);
  const meshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const tleDataRef = useRef<any[]>([]);

  // Fetch TLE data on mount
  useEffect(() => {
    const loadSatellites = async () => {
      try {
        const tles = await fetchTLEData('stations');
        tleDataRef.current = tles;

        // Calculate initial positions
        const positions = calculateMultipleSatellitePositions(tles);
        setSatellites(positions);
      } catch (error) {
        console.error('Failed to load satellites:', error);
      }
    };

    loadSatellites();
  }, []);

  // Create and manage satellite meshes
  useEffect(() => {
    if (!groupRef.current) return;

    // Clear old meshes
    meshesRef.current.forEach((mesh) => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      groupRef.current?.remove(mesh);
    });
    meshesRef.current.clear();

    // Create new meshes for each satellite
    satellites.forEach((sat) => {
      const geometry = new THREE.SphereGeometry(0.015, 8, 8);
      
      // Color based on altitude (lower = red, higher = blue)
      const hueValue = Math.min(sat.altitude / 1000, 1); // Normalize altitude
      const color = new THREE.Color().setHSL(hueValue * 0.6, 0.8, 0.5); // Hue range: red to blue

      const material = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.6,
        metalness: 0.2,
        roughness: 0.4,
      });

      const mesh = new THREE.Mesh(geometry, material);

      // Convert lat/lng/altitude to 3D position
      const phi = (90 - sat.lat) * (Math.PI / 180);
      const theta = (sat.lng + 180) * (Math.PI / 180);

      // Scale altitude to globe radius for visualization (Earth radius ≈ 6371 km)
      const altitudeScale = sat.altitude / 1000; // km to units (1 unit = 1000 km roughly)
      const radius = 0.5 + Math.min(altitudeScale * 0.0001, 0.3); // Cap visualization at 0.3 units above surface

      mesh.position.x = radius * Math.sin(phi) * Math.cos(theta);
      mesh.position.y = radius * Math.cos(phi);
      mesh.position.z = radius * Math.sin(phi) * Math.sin(theta);

      // Store metadata
      (mesh.userData as any).satellite = sat;

      groupRef.current?.add(mesh);
      meshesRef.current.set(sat.noradId, mesh);
    });

    return () => {
      meshesRef.current.forEach((mesh) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
    };
  }, [satellites]);

  // Update positions every frame
  useFrame(() => {
    if (tleDataRef.current.length === 0) return;

    // Recalculate positions
    const updatedPositions = calculateMultipleSatellitePositions(tleDataRef.current);

    updatedPositions.forEach((sat) => {
      const mesh = meshesRef.current.get(sat.noradId);
      if (!mesh) return;

      // Convert lat/lng/altitude to 3D position
      const phi = (90 - sat.lat) * (Math.PI / 180);
      const theta = (sat.lng + 180) * (Math.PI / 180);

      const altitudeScale = sat.altitude / 1000;
      const radius = 0.5 + Math.min(altitudeScale * 0.0001, 0.3);

      mesh.position.x = radius * Math.sin(phi) * Math.cos(theta);
      mesh.position.y = radius * Math.cos(phi);
      mesh.position.z = radius * Math.sin(phi) * Math.sin(theta);

      // Update mesh color based on current altitude
      const hueValue = Math.min(sat.altitude / 1000, 1);
      const color = new THREE.Color().setHSL(hueValue * 0.6, 0.8, 0.5);
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.color.copy(color);
      mat.emissive.copy(color);
    });

    // Update state for UI (e.g., satellite count)
    if (updatedPositions.length > 0) {
      setSatellites(updatedPositions);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Debug info: show satellite count */}
      <ambientLight intensity={0.1} />
    </group>
  );
};

export default Satellites;
