import React from 'react';
import dynamic from 'next/dynamic';

const ZosKia = dynamic(
  () => import('@/components/threejscomponents/scenes/ZosKia'),
  {
    ssr: false,
    loading: () => <div style={{ background: '#050000', width: '100vw', height: '100vh' }} />
  }
);

const MauveZonePage: React.FC = () => {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#050000' }}>
      <ZosKia />
    </div>
  );
};

export default MauveZonePage;
