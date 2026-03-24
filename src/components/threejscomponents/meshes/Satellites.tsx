import React, { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { fetchTLEData, calculateMultipleSatellitePositions, type SatellitePosition } from '@/utils/orbitCalculator';

const Satellites: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const [satellites, setSatellites] = useState<SatellitePosition[]>([]);
  const meshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const tleDataRef = useRef<any[]>([]);
  const lastUpdateRef = useRef<number>(0);

  // Fetch TLE data on mount
  useEffect(() => {
    const loadSatellites = async () => {
      try {
        const tles = await fetchTLEData('stations');
        tleDataRef.current = tles;

        // Calculate initial positions
        const positions = await calculateMultipleSatellitePositions(tles);
        setSatellites(positions);
        console.log(`Loaded ${positions.length} satellites`);
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
      const geometry = new THREE.SphereGeometry(0.012, 8, 8);
      
      // Color based on altitude
      const hueValue = Math.min(sat.altitude / 1000, 1);
      const color = new THREE.Color().setHSL(hueValue * 0.6, 0.8, 0.5);

      const material = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.7,
        metalness: 0.3,
        roughness: 0.3,
      });

      const mesh = new THREE.Mesh(geometry, material);

      // Convert lat/lng/altitude to 3D position
      const phi = (90 - sat.lat) * (Math.PI / 180);
      const theta = (sat.lng + 180) * (Math.PI / 180);

      // Earth radius = 0.5 (in scene units)
      // Scale altitude: 400km real = 0.063 units (400/6371 * 0.5)
      const earthRadiusUnits = 0.5;
      const altitudeScale = sat.altitude / 6371; // Convert km to Earth radii
      const radius = earthRadiusUnits * (1 + altitudeScale);

      mesh.position.x = radius * Math.sin(phi) * Math.cos(theta);
      mesh.position.y = radius * Math.cos(phi);
      mesh.position.z = radius * Math.sin(phi) * Math.sin(theta);

      (mesh.userData as any).satellite = sat;

      groupRef.current?.add(mesh);
      meshesRef.current.set(sat.noradId, mesh);
    });
  }, [satellites]);

  // Update positions every frame
  useFrame(({ clock }) => {
    const now = clock.getElapsedTime() * 1000;
    
    // Update every 100ms
    if (now - lastUpdateRef.current < 100) return;
    lastUpdateRef.current = now;

    if (tleDataRef.current.length === 0) return;

    // Async update
    calculateMultipleSatellitePositions(tleDataRef.current).then((updatedPositions) => {
      updatedPositions.forEach((sat) => {
        const mesh = meshesRef.current.get(sat.noradId);
        if (!mesh) return;

        const phi = (90 - sat.lat) * (Math.PI / 180);
        const theta = (sat.lng + 180) * (Math.PI / 180);

        const earthRadiusUnits = 0.5;
        const altitudeScale = sat.altitude / 6371;
        const radius = earthRadiusUnits * (1 + altitudeScale);

        mesh.position.x = radius * Math.sin(phi) * Math.cos(theta);
        mesh.position.y = radius * Math.cos(phi);
        mesh.position.z = radius * Math.sin(phi) * Math.sin(theta);

        const hueValue = Math.min(sat.altitude / 1000, 1);
        const color = new THREE.Color().setHSL(hueValue * 0.6, 0.8, 0.5);
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.color.copy(color);
        mat.emissive.copy(color);
      });

      setSatellites(updatedPositions);
    }).catch((error) => {
      console.error('Error updating satellite positions:', error);
    });
  });

  return <group ref={groupRef} />;
};

export default Satellites;
