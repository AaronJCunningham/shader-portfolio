'use client'
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";

import { Footer } from "@/components/about/Footer";

import MetaDataHeader from "@/components/metadata/MetaDataHeader";

import "../../../styles/index.scss"

export default function DynamicNews({ post }) {
  const [width, setWidth] = useState();

  const ref = useRef(null);
  useEffect(() => {
    if(!ref.current) return;
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
          <Link href={`/about/${previous}`}>
            <p className="left_link">previous</p>
          </Link>
        )}
        {next && (
          <Link href={`/about/${next}`}>
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
          <Link href={`/about/${previous}`}>
            <p>previous</p>
          </Link>
        )}
        <br />
        {next && (
          <Link href={`/about/${next}`}>
            <p>next</p>
          </Link>
        )}
      </div>
      <Footer />
    </>
  );
}

const url = "https://xeleven.space/wp-json/wp/v2/initiatives";

export const getStaticPaths = async () => {
  const res = await fetch(url);
  const posts = await res.json();

  // generate the paths
  const paths = posts.map((post) => {
    return {
      params: { slug: `${post.slug}` },
    };
  });

  return {
    paths,
    fallback: false,
  };
};

// This also gets called at build time
export async function getStaticProps({ params }) {
  // params contains the post `id`.
  // If the route is like /posts/1, then params.id is 1
  const res = await fetch(`${url}?slug=${params.slug}`);
  const post = await res.json();

  // Pass post data to the page via props
  return { props: { post } };
}
