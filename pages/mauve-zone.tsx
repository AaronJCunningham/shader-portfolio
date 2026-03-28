import React from 'react';
import dynamic from 'next/dynamic';

const MauveZoneAlphabet = dynamic(
  () => import('@/components/threejscomponents/scenes/MauveZoneAlphabet'),
  { ssr: false }
);

const MauveZonePage: React.FC = () => {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#000000' }}>
      <MauveZoneAlphabet />
    </div>
  );
};

export default MauveZonePage;
