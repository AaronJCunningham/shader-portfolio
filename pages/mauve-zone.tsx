import dynamic from 'next/dynamic';
import MetaDataHeader from '@/components/metadata/MetaDataHeader';

const MauveZonePageClient = dynamic(() => import('@/components/MauveZonePageClient'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#050000',
      }}
    />
  ),
});

const MauveZonePage = () => (
  <>
    <MetaDataHeader
      title="The Mauve Zone"
      content="An experimental generative art space by Aaron J. Cunningham."
      noIndex
    />
    <MauveZonePageClient />
  </>
);

export default MauveZonePage;
