import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import manifest from '@/manifest.json';
import MauveZoneNav from '@/components/MauveZoneNav';

const MauveZonePage: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  const pieces = manifest as Array<{
    seed: number;
    date: string;
    name: string;
    component: string;
  }>;

  const handlePrev = () => {
    setActiveIndex((i) => (i === 0 ? pieces.length - 1 : i - 1));
  };

  const handleNext = () => {
    setActiveIndex((i) => (i === pieces.length - 1 ? 0 : i + 1));
  };

  const activePiece = pieces[activeIndex];

  // Dynamic import based on component name — key={activeIndex} forces full remount
  const SceneComponent = dynamic(
    () =>
      import(`@/components/threejscomponents/scenes/${activePiece.component}`),
    { ssr: false }
  );

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <div style={{ width: '100%', height: '100%' }}>
        <SceneComponent key={activeIndex} />
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

export default MauveZonePage;
