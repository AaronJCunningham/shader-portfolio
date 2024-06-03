import Script from "next/script";

import { Footer } from "@/components/layout/Footer";
import MetaDataHeader from "@/components/metadata/MetaDataHeader";
import { Grid } from "@/components/layout/Grid";

import "../../styles/index.scss";

const About = ({ posts }: any) => {
  return (
    <>
      <MetaDataHeader title={"About"} />
      <main id="about">
        <Grid posts={posts} />
        <Footer />
      </main>
    </>
  );
};
export default About;

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
