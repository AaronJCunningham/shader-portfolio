import Script from "next/script";
import MetaDataHeader from "@/components/metadata/MetaDataHeader";
import { Grid } from "@/components/layout/Grid";
import { Footer } from "@/components/layout/Footer";
import Cookie from "@/components/cookie/Cookie";

export default function Projects({ posts }: { posts: any }) {
  return (
    <>
      <MetaDataHeader title={"Projects"} />
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
      <Grid posts={posts} />
      <Footer />
    </>
  );
}

export async function getStaticProps() {
  const res = await fetch("https://xeleven.space/wp-json/wp/v2/initiatives?per_page=100");
  const posts = await res.json();

  return {
    props: {
      posts,
    },
    revalidate: 3600,
  };
}
