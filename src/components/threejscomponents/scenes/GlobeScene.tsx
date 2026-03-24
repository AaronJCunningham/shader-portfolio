import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import Globe from '../meshes/Globe';
import Satellites from '../meshes/Satellites';
import SatelliteInfoPanel from '../SatelliteInfoPanel';
import { SatellitePosition } from '@/utils/orbitCalculator';
import { getRandomPalette } from '@/utils/cosmicPalette';

interface GlobeSceneProps {
  width?: string | number;
  height?: string | number;
}

const GlobeSceneInner: React.FC<{
  onSatelliteHover: (sat: SatellitePosition | null, x: number, y: number) => void;
}> = ({ onSatelliteHover }) => {
  const { camera, scene } = useThree();
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const palette = useRef(getRandomPalette());
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastSatRef = useRef<string | null>(null);

  useEffect(() => {
    camera.position.z = 2;
    scene.background = new THREE.Color(palette.current.background);
    scene.fog = new THREE.Fog(palette.current.background, 5, 10);
  }, [camera, scene]);

  useFrame(() => {
    raycasterRef.current.setFromCamera(mouseRef.current, camera);

    const satellites: THREE.Mesh[] = [];
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && (obj.userData as any).satellite) {
        satellites.push(obj);
      }
    });

    if (satellites.length === 0) return;

    // Use larger raycaster radius to prevent flickering
    raycasterRef.current.params.Points.threshold = 0.05;
    const intersects = raycasterRef.current.intersectObjects(satellites);

    if (intersects.length > 0) {
      const obj = intersects[0].object as THREE.Mesh;
      const sat = (obj.userData as any).satellite as SatellitePosition;
      const satId = sat.noradId;

      // Only trigger hover update if satellite changed
      if (satId !== lastSatRef.current) {
        lastSatRef.current = satId;
        
        // Clear any pending debounce
        if (debounceRef.current) clearTimeout(debounceRef.current);
        
        // Debounce the hover callback
        debounceRef.current = setTimeout(() => {
          // Convert world position to screen position
          const screenPos = new THREE.Vector3();
          screenPos.copy(obj.position);
          screenPos.project(camera);
          
          const x = (screenPos.x * window.innerWidth) / 2;
          const y = -(screenPos.y * window.innerHeight) / 2;
          
          onSatelliteHover(sat, x, y);
        }, 50);
      }
    } else {
      if (lastSatRef.current !== null) {
        lastSatRef.current = null;
        
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          onSatelliteHover(null, 0, 0);
        }, 50);
      }
    }
  });

  const handleMouseMove = (event: MouseEvent) => {
    mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <>
      <Stars count={5000} radius={100} />
      <OrbitControls
        enableZoom={true}
        enablePan={true}
        enableRotate={true}
        autoRotate={false}
      />
      
      <ambientLight intensity={0.4} color={palette.current.secondary} />
      <pointLight 
        position={[2, 1.5, 2]} 
        intensity={1.2} 
        color={palette.current.primary}
      />
      <pointLight 
        position={[-2, -1, 1]} 
        intensity={0.6} 
        color={palette.current.accent}
      />
      <pointLight 
        position={[0, 2, 0]} 
        intensity={0.5} 
        color={palette.current.secondary}
      />
      
      <Globe />
      <Satellites />
    </>
  );
};

const GlobeScene: React.FC<GlobeSceneProps> = ({
  width = '100%',
  height = '100vh'
}) => {
  const [hoveredSatellite, setHoveredSatellite] = useState<SatellitePosition | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleSatelliteHover = (sat: SatellitePosition | null, x: number, y: number) => {
    setHoveredSatellite(sat);
    if (sat) {
      setMousePos({ x: x + window.innerWidth * 0.5, y: y + window.innerHeight * 0.5 });
    }
  };

  return (
    <div style={{ width, height, position: 'relative' }}>
      <Canvas camera={{ position: [0, 0, 2], fov: 45 }}>
        <GlobeSceneInner onSatelliteHover={handleSatelliteHover} />
      </Canvas>
      <SatelliteInfoPanel
        satellite={hoveredSatellite}
        visible={hoveredSatellite !== null}
        x={mousePos.x}
        y={mousePos.y}
      />
    </div>
  );
};

export default GlobeScene;
