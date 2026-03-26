import React from 'react';
import dynamic from 'next/dynamic';

const HungerCircuit = dynamic(
  () => import('@/components/threejscomponents/scenes/HungerCircuit'),
  { ssr: false }
);

const MauveZonePage: React.FC = () => {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <HungerCircuit />
    </div>
  );
};

export default MauveZonePage;
