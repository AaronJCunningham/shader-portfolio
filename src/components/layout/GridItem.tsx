import { useState, useRef, FC } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";

interface Post {
  slug: string;
  title?: { rendered: string };
  better_featured_image?: {
    source_url: string;
    media_details: {
      width: number;
      height: number;
    };
  };
  yoast_head_json?: { og_description: string };
}

interface GridItemProps {
  post: Post;
}

export const GridItem: FC<GridItemProps> = ({ post }) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  const handleIn = () => {
    gsap.to(gridRef.current, { opacity: 0.5 });
    gsap.to(bgRef.current, { "background-color": "#292929", duration: 0.3 });
    gsap.to(bgRef.current, { scale: 0.98, duration: 0.3 });
  };
  const handleOut = () => {
    gsap.to(gridRef.current, { opacity: 1 });
    gsap.to(bgRef.current, { "background-color": "#030303", duration: 0.3 });
    gsap.to(bgRef.current, { scale: 1, duration: 0.3 });
  };

  const handleClick = () => {
    gsap.to(bgRef.current, { "background-color": "#797979", duration: 0.3 });
  };

  return (
    <Link href={`/about/${post?.slug}`}>
    <div ref={bgRef} 
    className="grid-container"
    key={post?.slug}
      onMouseEnter={handleIn}
      onMouseLeave={handleOut}
      onClick={handleClick}>
      <div className="title-container">
        <h4>{post?.title?.rendered || 'Default Title'}</h4>
      </div>
     <div className="image_container">
        <Image
          src={post?.better_featured_image?.source_url || "/images/default.jpg"}
          layout="fill"
          // width={post?.better_featured_image?.media_details?.width || 1920}
          // height={post?.better_featured_image?.media_details?.height || 1080}
          alt={post?.title?.rendered || "Default Image"}
       
        objectFit="cover" /* Ensures the image covers the area */
        objectPosition="center" /* Adjust as needed */
        />
  </div>
    <div className="description_container">
      <p>{post?.yoast_head_json?.og_description || 'Default Description'}</p>
      </div>
    </div>
  </Link>
  );
};
