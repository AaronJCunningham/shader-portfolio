import React from 'react';
import dynamic from 'next/dynamic';
import MetaDataHeader from '@/components/metadata/MetaDataHeader';

const GlobeScene = dynamic(
  () => import('@/components/threejscomponents/scenes/GlobeScene'),
  { ssr: false }
);

const GlobePage: React.FC = () => {
  return (
    <>
      <MetaDataHeader
        title="Globe Experiment"
        content="An experimental Three.js globe by Aaron J. Cunningham."
        noIndex
      />
      <div style={{ width: '100%', height: '100vh' }}>
        <GlobeScene />
      </div>
    </>
  );
};

export default GlobePage;
