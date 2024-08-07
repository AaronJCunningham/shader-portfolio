import Head from "next/head";
import { useRouter } from "next/router";

const MetaDataHeader = ({
  content = "Aaron J. Cunningham is a frontend developer specializing in metaverse & web3 using Three.js, R3F, Next.js & React.",
  image = "https://ik.imagekit.io/fx30u3wgcqib/Screenshot%202024-08-01%20101252_Amhs5MQK-.png?updatedAt=1722510442336",
  title = "home",
}) => {
  const router = useRouter();
  const canonicalUrl = (
    `https://aaronjcunningham.com` +
    (router.asPath === "/" ? "" : router.asPath)
  ).split("?")[0];

  return (
    <Head>
      <title>{`${title} - Aaron J. Cunningham`}</title>
      <meta name="twitter:card" content="summary_large_image" />
      <meta property="og:url" content="https://aaronjcunningham.com" />
      <meta
        property="og:title"
        content={`${title} - Aaron J. Cunningham`}
        key="title"
      />
      <meta property="og:description" content={content} />
      <meta name="yandex-verification" content="b1955c77c853f21f" />
      <meta property="og:image" content={image} />
      <link rel="canonical" href={canonicalUrl} />
      <link rel="apple-touch-icon" sizes="76x76" href="/apple-touch-icon.png" />
      <link
        rel="icon"
        type="image/png"
        sizes="32x32"
        href="/favicon-32x32.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="16x16"
        href="/favicon-16x16.png"
      />
      <link rel="manifest" href="/site.webmanifest" />
      <meta name="msapplication-TileColor" content="#da532c" />
      <meta name="theme-color" content="#ffffff" />
      <meta name="yandex-verification" content="8d5b06a83511cd21" />
    </Head>
  );
};

export default MetaDataHeader;
