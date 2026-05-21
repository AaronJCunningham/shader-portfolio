"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

import { Footer } from "@/components/layout/Footer";

import MetaDataHeader from "@/components/metadata/MetaDataHeader";

interface Post {
  title: { rendered: string };
  content: { rendered: string };
  date: string;
  yoast_head_json: { og_description: string };
  better_featured_image: { source_url: string };
  previous?: { slug: string };
  next?: { slug: string };
}

interface DynamicNewsProps {
  post: Post[];
}

interface Params {
  slug: string;
}

interface StaticPropsContext {
  params: Params;
}

export default function DynamicNews({ post }: DynamicNewsProps) {
  const [width, setWidth] = useState<Number>();

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    setWidth(ref.current.offsetWidth);
  }, [width]);

  const previous = post[0]?.previous?.slug;
  const next = post[0]?.next?.slug;

  return (
    <>
      <MetaDataHeader
        title={post[0]?.title.rendered}
        content={post[0]?.yoast_head_json.og_description}
        image={post[0]?.better_featured_image?.source_url}
      />
      <Link href="/" passHref>
        <h1 className="about_button">HOME</h1>
      </Link>
      <div className="about_container" ref={ref}>
        {previous && (
          <Link href={`/${previous}`}>
            <p className="left_link">previous</p>
          </Link>
        )}
        {next && (
          <Link href={`/${next}`}>
            <p className="right_link">next</p>
          </Link>
        )}
        <div className="news_content">
          <div className="news_header">
            <h1>{post[0]?.title?.rendered}</h1>
          </div>
          <div className="news_text_container">
            <span
              dangerouslySetInnerHTML={{
                __html: post[0]?.content?.rendered,
              }}
            ></span>
          </div>
        </div>
      </div>
      <br />
      <br />
      <div className="bottom_link">
        {previous && (
          <Link href={`/${previous}`}>
            <p>previous</p>
          </Link>
        )}
        <br />
        {next && (
          <Link href={`/${next}`}>
            <p>next</p>
          </Link>
        )}
      </div>
      <div className="article-meta">
        <p>By Aaron J. Cunningham • Date Published: {post[0]?.date && new Date(post[0].date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      <Footer />
    </>
  );
}

const url = "https://xeleven.space/wp-json/wp/v2/initiatives";

async function fetchInitiatives(endpoint: string) {
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

export const getStaticPaths = async () => {
  try {
    const posts = await fetchInitiatives(`${url}?per_page=100`);

    const paths = posts.map((post: Params) => {
      return {
        params: { slug: `${post.slug}` },
      };
    });

    return {
      paths,
      fallback: "blocking",
    };
  } catch (error) {
    console.error("Failed to fetch WordPress paths during build", error);

    return {
      paths: [],
      fallback: "blocking",
    };
  }
};

// This also gets called at build time
export async function getStaticProps({ params }: StaticPropsContext) {
  // params contains the post `id`.
  // If the route is like /posts/1, then params.id is 1
  try {
    const post = await fetchInitiatives(
      `${url}?slug=${encodeURIComponent(params.slug)}`
    );

    if (!post?.length) {
      return { notFound: true, revalidate: 60 };
    }

    // Pass post data to the page via props
    return { props: { post }, revalidate: 3600 };
  } catch (error) {
    console.error(`Failed to fetch WordPress post for slug "${params.slug}"`, error);
    return { notFound: true, revalidate: 60 };
  }
}
