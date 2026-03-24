import React, { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Satellite {
  id: string;
  name: string;
  lat: number;
  lng: number;
  altitude: number;
  orbitRadius: number;
  orbitSpeed: number;
  color: string;
}

// Generate mock satellite data for now
const generateMockSatellites = (count: number): Satellite[] => {
  const satellites: Satellite[] = [];
  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#ffd93d', '#a8e6cf'];

  for (let i = 0; i < count; i++) {
    satellites.push({
      id: `sat_${i}`,
      name: `Satellite ${i + 1}`,
      lat: Math.random() * 180 - 90,
      lng: Math.random() * 360 - 180,
      altitude: 0.05 + Math.random() * 0.15,
      orbitRadius: 0.6 + (Math.random() * 0.3),
      orbitSpeed: 0.0005 + Math.random() * 0.001,
      color: colors[i % colors.length],
    });
  }

  return satellites;
};

const Satellites: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const [satellites] = useState<Satellite[]>(() => generateMockSatellites(15));
  const timeRef = useRef<number>(0);
  const meshesRef = useRef<Map<string, THREE.Mesh>>(new Map());

  useEffect(() => {
    if (!groupRef.current) return;

    // Create satellite meshes
    satellites.forEach((sat) => {
      const geometry = new THREE.SphereGeometry(0.01, 8, 8);
      const material = new THREE.MeshStandardMaterial({
        color: sat.color,
        emissive: sat.color,
        emissiveIntensity: 0.5,
      });
      const mesh = new THREE.Mesh(geometry, material);

      // Convert lat/lng to 3D position on sphere surface
      const phi = (90 - sat.lat) * (Math.PI / 180);
      const theta = (sat.lng + 180) * (Math.PI / 180);

      const radius = 0.5 + sat.altitude;
      mesh.position.x = radius * Math.sin(phi) * Math.cos(theta);
      mesh.position.y = radius * Math.cos(phi);
      mesh.position.z = radius * Math.sin(phi) * Math.sin(theta);

      groupRef.current?.add(mesh);
      meshesRef.current.set(sat.id, mesh);
    });

    return () => {
      // Cleanup
      meshesRef.current.forEach((mesh) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        groupRef.current?.remove(mesh);
      });
      meshesRef.current.clear();
    };
  }, [satellites]);

  // Animate satellites in orbit
  useFrame(() => {
    timeRef.current += 1;

    satellites.forEach((sat) => {
      const mesh = meshesRef.current.get(sat.id);
      if (!mesh) return;

      // Orbital motion: circular orbit around the sphere
      const angle = timeRef.current * sat.orbitSpeed;
      const orbitRadius = sat.orbitRadius;

      const phi = (90 - sat.lat) * (Math.PI / 180);
      const theta = (sat.lng + 180 + angle * 100) * (Math.PI / 180);

      const radius = 0.5 + sat.altitude;
      mesh.position.x = radius * Math.sin(phi) * Math.cos(theta);
      mesh.position.y = radius * Math.cos(phi);
      mesh.position.z = radius * Math.sin(phi) * Math.sin(theta);
    });
  });

  return <group ref={groupRef} />;
};

export default Satellites;
