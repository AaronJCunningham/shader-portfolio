"use client";

import dynamic from "next/dynamic";

// import Bio from "@/components/layout/Bio";
import MainScene from "@/components/threejscomponents/MainScene";
import { Loader, useProgress } from "@react-three/drei";
import { Suspense, useEffect, useState } from "react";
import CookieConsent from "react-cookie-consent";

import { useRouter } from "next/navigation";
import Cookie from "@/components/cookie/Cookie";
import Script from "next/script";
import MetaDataHeader from "@/components/metadata/MetaDataHeader";
import { Grid } from "@/components/layout/Grid";
import { Footer } from "@/components/layout/Footer";
import { useActivateScroll } from "@/store";

const Bio = dynamic(() => import("../src/components/layout/Bio"), {
  ssr: false,
});

export default function Home({ posts }: { posts: any }) {
  const [activateScroll, setActivateScroll] = useActivateScroll((state) => [
    state.activateScroll,
    state.setActivateScroll,
  ]);

  useEffect(() => {
    const isMobile = window.innerWidth <= 768; // Adjust based on your breakpoint for mobile

    if (isMobile) {
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
          <Suspense fallback={<Loader />}>
            <Bio />
            <MainScene />
          </Suspense>
        </div>
      )}

      <>
        <Grid posts={posts} />
        <Footer />
      </>
    </>
  );
}

export async function getStaticProps() {
  // Call an external API endpoint to get posts
  const res = await fetch("https://xeleven.space/wp-json/wp/v2/initiatives");
  const posts = await res.json();

  // By returning { props: { posts } }, the Blog component
  // will receive `posts` as a prop at build time
  return {
    props: {
      posts,
    },
  };
}
