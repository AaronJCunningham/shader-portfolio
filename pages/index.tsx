import dynamic from "next/dynamic";

import MainScene from "@/components/threejscomponents/MainScene";
import Loader from "@/components/svg/Loader";
import { Suspense, useEffect } from "react";

import Cookie from "@/components/cookie/Cookie";
import Script from "next/script";
import MetaDataHeader from "@/components/metadata/MetaDataHeader";
import { useActivateScroll } from "@/store";

const SceneOverlay = dynamic(() => import("../src/components/layout/SceneOverlay"), {
  ssr: false,
});

export default function Home() {
  const [activateScroll, setActivateScroll] = useActivateScroll((state) => [
    state.activateScroll,
    state.setActivateScroll,
  ]);

  useEffect(() => {
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      setActivateScroll(true);
    }

    if (window.scrollY > 0 || window.location.hash) {
      setActivateScroll(true);
    }
  }, []);

  return (
    <>
      <MetaDataHeader title={"Home"} />
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-363JP1BQ7R"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-363JP1BQ7R');
  `}
      </Script>
      <Cookie />
      {!activateScroll && (
        <div className="header_container" id="main_header">
          <Loader />
          <SceneOverlay />
          <Suspense fallback={null}>
            <MainScene />
          </Suspense>
        </div>
      )}
    </>
  );
}
