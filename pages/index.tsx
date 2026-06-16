import dynamic from "next/dynamic";

import MainScene from "@/components/threejscomponents/MainScene";
import Loader from "@/components/svg/Loader";
import { Suspense } from "react";

import Cookie from "@/components/cookie/Cookie";
import Script from "next/script";
import MetaDataHeader from "@/components/metadata/MetaDataHeader";
import PortalMenu from "@/components/layout/PortalMenu";

const SceneOverlay = dynamic(() => import("../src/components/layout/SceneOverlay"), {
  ssr: false,
});

export default function Home() {
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
      <PortalMenu />
      <style jsx global>{`
        html,
        body {
          overflow: hidden;
        }
      `}</style>
      <div className="header_container" id="main_header">
        <Loader />
        <SceneOverlay />
        <Suspense fallback={null}>
          <MainScene />
        </Suspense>
      </div>
    </>
  );
}
