import dynamic from "next/dynamic";

import MainScene from "@/components/threejscomponents/MainScene";
import Loader from "@/components/svg/Loader";
import { Suspense, useEffect, useState } from "react";

import Cookie from "@/components/cookie/Cookie";
import Script from "next/script";
import MetaDataHeader from "@/components/metadata/MetaDataHeader";
import { Grid } from "@/components/layout/Grid";
import { Footer } from "@/components/layout/Footer";
import { useActivateScroll } from "@/store";

const SceneOverlay = dynamic(() => import("../src/components/layout/SceneOverlay"), {
  ssr: false,
});

async function fetchWordPressPosts() {
  const endpoint = "https://xeleven.space/wp-json/wp/v2/initiatives?per_page=100";
  const attempts = 3;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const res = await fetch(endpoint);

      if (!res.ok) {
        throw new Error(`WordPress request failed: ${res.status}`);
      }

      return await res.json();
    } catch (error) {
      if (attempt === attempts) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
}

export default function Home({ posts }: { posts: any }) {
  const [introReady, setIntroReady] = useState(false);
  const [activateScroll, setActivateScroll] = useActivateScroll((state) => [
    state.activateScroll,
    state.setActivateScroll,
  ]);

  useEffect(() => {
    const isMobile = window.innerWidth <= 768;
    const shouldSkipIntro = isMobile || window.scrollY > 0 || Boolean(window.location.hash);

    if (shouldSkipIntro) {
      setActivateScroll(true);
      return;
    }

    setIntroReady(true);
  }, [setActivateScroll]);

  useEffect(() => {
    if (introReady && !activateScroll) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = "auto";
      document.body.style.overflow = "auto";
    }
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [activateScroll, introReady]);

  const showIntro = introReady && !activateScroll;

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
      {showIntro && (
        <style jsx global>{`
          html,
          body {
            overflow: hidden;
          }
        `}</style>
      )}
      {showIntro && (
        <div className="header_container" id="main_header">
          <Loader />
          <SceneOverlay />
          <Suspense fallback={null}>
            <MainScene />
          </Suspense>
        </div>
      )}

      <Grid posts={posts} />
      <Footer />
    </>
  );
}

export async function getStaticProps() {
  try {
    const posts = await fetchWordPressPosts();

    return {
      props: {
        posts,
      },
      revalidate: 3600,
    };
  } catch (error) {
    console.error("Failed to fetch WordPress posts for home page", error);

    return {
      props: {
        posts: [],
      },
      revalidate: 60,
    };
  }
}
