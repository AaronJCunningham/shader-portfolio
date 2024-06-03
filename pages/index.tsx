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
