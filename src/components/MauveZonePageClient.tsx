import React, { useState } from 'react';
import Link from 'next/link';
import MauveZoneNav from '@/components/MauveZoneNav';
import manifest from '@/manifest.json';

import GlobeScene from '@/components/threejscomponents/scenes/GlobeScene';
import HungerCircuit from '@/components/threejscomponents/scenes/HungerCircuit';
import MauveZoneAlphabet from '@/components/threejscomponents/scenes/MauveZoneAlphabet';
import MauveZoneScene from '@/components/threejscomponents/scenes/MauveZoneScene';
import VertigoHomecoming from '@/components/threejscomponents/scenes/VertigoHomecoming';
import ZosKia from '@/components/threejscomponents/scenes/ZosKia';
import BabalonArrives from '@/components/threejscomponents/scenes/BabalonArrives';

/** Only scenes that wrap their own <Canvas>; inner-only scenes break MauveZone when rendered directly. */
const sceneMap: Record<string, React.ComponentType> = {
  BabalonArrives,
  GlobeScene,
  HungerCircuit,
  MauveZoneAlphabet,
  MauveZoneScene,
  VertigoHomecoming,
  ZosKia,
};

const MauveZonePageClient: React.FC = () => {
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
      <Link href="/" passHref>
        <h1 className="about_button">HOME</h1>
      </Link>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <SceneComponent />
      </div>
      <MauveZoneNav
        pieces={pieces}
        activeIndex={activeIndex}
        onPrev={handlePrev}
        onNext={handleNext}
      />
    </div>
  );
};

export default MauveZonePageClient;
