

import Script from "next/script";

import { Bio } from "../../components/about/Bio";
import { Footer } from "../../components/about/Footer";
import MetaDataHeader from "../../components/metadata/MetaDataHeader";
import { Grid } from "../../components/about/Grid";

import "../../../styles/index.scss"

async function fetchPosts() {
  const res = await fetch("https://xeleven.space/wp-json/wp/v2/initiatives");

  if (!res.ok) {
    // This will be caught by error boundaries in Next.js
    throw new Error('Failed to fetch posts');
  }

  return res.json();
}

const Page = async () => {
  const posts = await fetchPosts()
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
          function gtag(){window.dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'GA_MEASUREMENT_ID');
        `}
      </Script>
      <main id="about">
        {/* <div className="about-content-container">
          <Bio />
        </div> */}
        <Grid posts={posts} />
        <Footer />
      </main>
    </>
  );
};
export default Page;


