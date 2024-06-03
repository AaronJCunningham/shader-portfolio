"use client";

import dynamic from "next/dynamic";
import "../styles/index.scss";
// import Bio from "@/components/layout/Bio";
import MainScene from "@/components/threejscomponents/MainScene";
import { Loader, useProgress } from "@react-three/drei";
import { Suspense, useEffect, useState } from "react";
import CookieConsent from "react-cookie-consent";

import { useRouter } from "next/navigation";
import Cookie from "@/components/cookie/Cookie";
import Script from "next/script";
import MetaDataHeader from "@/components/metadata/MetaDataHeader";

const Bio = dynamic(() => import("../src/components/layout/Bio"), {
  ssr: false,
});
// const MainScene = dynamic(() => import("../components/threejscomponents/MainScene"), { ssr: false });

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const isMobile = window.innerWidth <= 768; // Adjust based on your breakpoint for mobile

    if (isMobile) {
      router.push("/about");
    }
  }, [router]);

  return (
    <>
      <MetaDataHeader />
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-363JP1BQ7R"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'GA_MEASUREMENT_ID');
        `}
      </Script>
      <div className="header_container" id="main_header">
        <Cookie />
        <Suspense fallback={<Loader />}>
          <Bio />
          <MainScene />
        </Suspense>
      </div>
    </>
  );
}
