import MetaDataHeader from "@/components/metadata/MetaDataHeader";
import { Footer } from "@/components/layout/Footer";
import { Grid } from "@/components/layout/Grid";
import PortalMenu from "@/components/layout/PortalMenu";

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

export default function Work({ posts }: { posts: any }) {
  return (
    <>
      <MetaDataHeader title={"Work"} />
      <PortalMenu />
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
    console.error("Failed to fetch WordPress posts for work page", error);

    return {
      props: {
        posts: [],
      },
      revalidate: 60,
    };
  }
}
