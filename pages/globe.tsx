import React from 'react';
import dynamic from 'next/dynamic';

const GlobeScene = dynamic(
  () => import('@/components/threejscomponents/scenes/GlobeScene'),
  { ssr: false }
);

const GlobePage: React.FC = () => {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <GlobeScene />
    </div>
  );
};

export default GlobePage;
