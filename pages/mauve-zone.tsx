import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import MauveZoneNav from '@/components/MauveZoneNav';
import manifest from '@/manifest.json';

// Static imports for scene components (required for dynamic() with ssr:false)
import GlobeScene from '@/components/threejscomponents/scenes/GlobeScene';
import HungerCircuit from '@/components/threejscomponents/scenes/HungerCircuit';
import MauveZoneAlphabet from '@/components/threejscomponents/scenes/MauveZoneAlphabet';
import MauveZoneScene from '@/components/threejscomponents/scenes/MauveZoneScene';
import MusicVisualizerScene from '@/components/threejscomponents/scenes/MusicVisualizerScene';
import SceneFour from '@/components/threejscomponents/scenes/SceneFour';
import SceneOne from '@/components/threejscomponents/scenes/SceneOne';
import SceneThree from '@/components/threejscomponents/scenes/SceneThree';
import SceneTwo from '@/components/threejscomponents/scenes/SceneTwo';
import ShaderScene from '@/components/threejscomponents/scenes/ShaderScene';
import VertigoHomecoming from '@/components/threejscomponents/scenes/VertigoHomecoming';
import ZosKia from '@/components/threejscomponents/scenes/ZosKia';

const sceneMap: Record<string, React.ComponentType<any>> = {
  GlobeScene,
  HungerCircuit,
  MauveZoneAlphabet,
  MauveZoneScene,
  MusicVisualizerScene,
  SceneFour,
  SceneOne,
  SceneThree,
  SceneTwo,
  ShaderScene,
  VertigoHomecoming,
  ZosKia,
};

const MauveZonePage: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  const pieces = manifest as Array<{ seed: number; date: string; name: string; component: string }>;

  const handlePrev = () => {
    setActiveIndex((i) => (i - 1 + pieces.length) % pieces.length);
  };

  const handleNext = () => {
    setActiveIndex((i) => (i + 1) % pieces.length);
  };

  const activePiece = pieces[activeIndex];
  const SceneComponent = sceneMap[activePiece?.component] ?? ZosKia;

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#050000', position: 'relative' }}>
      {/* 3D scene layer */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <SceneComponent />
      </div>

      {/* Navigation bar layer */}
      <MauveZoneNav
        pieces={pieces}
        activeIndex={activeIndex}
        onPrev={handlePrev}
        onNext={handleNext}
      />
    </div>
  );
};

export default MauveZonePage;
