import dynamic from 'next/dynamic';

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

const MauveZonePage = () => <MauveZonePageClient />;

export default MauveZonePage;
