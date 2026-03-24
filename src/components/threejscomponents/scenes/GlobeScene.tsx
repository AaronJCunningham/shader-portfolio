import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import Globe from '../meshes/Globe';
import Satellites from '../meshes/Satellites';
import SatelliteInfoPanel from '../SatelliteInfoPanel';
import { SatellitePosition } from '@/utils/orbitCalculator';

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

  useEffect(() => {
    camera.position.z = 2;
  }, [camera]);

  useFrame(() => {
    // Update raycaster from mouse position
    raycasterRef.current.setFromCamera(mouseRef.current, camera);

    // Get all satellite meshes
    const satellites: THREE.Mesh[] = [];
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && (obj.userData as any).satellite) {
        satellites.push(obj);
      }
    });

    if (satellites.length === 0) return;

    // Check intersections
    const intersects = raycasterRef.current.intersectObjects(satellites);

    if (intersects.length > 0) {
      const obj = intersects[0].object as THREE.Mesh;
      const sat = (obj.userData as any).satellite as SatellitePosition;
      onSatelliteHover(sat, mouseRef.current.x * window.innerWidth * 0.5, mouseRef.current.y * window.innerHeight * 0.5);
    } else {
      onSatelliteHover(null, 0, 0);
    }
  });

  const handleMouseMove = (event: MouseEvent) => {
    mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <>
      <OrbitControls
        enableZoom={true}
        enablePan={true}
        enableRotate={true}
      />
      <ambientLight intensity={0.5} />
      <pointLight position={[1, 0.3, 1]} intensity={1.5} />
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
    setMousePos({ x: x + window.innerWidth * 0.5, y: y + window.innerHeight * 0.5 });
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
