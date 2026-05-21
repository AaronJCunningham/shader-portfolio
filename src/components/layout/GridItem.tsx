import { useRef, FC } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";

function decodeEntities(text: string): string {
  return text
    .replace(/&#8217;/g, "\u2019")
    .replace(/&#8216;/g, "\u2018")
    .replace(/&#8211;/g, "\u2013")
    .replace(/&#8212;/g, "\u2014")
    .replace(/&hellip;/g, "\u2026")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

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
  priority?: boolean;
}

export const GridItem: FC<GridItemProps> = ({ post, priority = false }) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  const handleIn = () => {
    gsap.to(gridRef.current, { y: -4, duration: 0.35, ease: "power2.out" });
    gsap.to(imageRef.current, { scale: 1.035, duration: 0.7, ease: "power3.out" });
  };
  const handleOut = () => {
    gsap.to(gridRef.current, { y: 0, duration: 0.35, ease: "power2.out" });
    gsap.to(imageRef.current, { scale: 1, duration: 0.7, ease: "power3.out" });
  };

  return (
    <Link href={`/${post?.slug}`}>
      <div
        ref={gridRef}
        className="grid-container"
        key={post?.slug}
        onMouseEnter={handleIn}
        onMouseLeave={handleOut}
      >
        <div className="image_container">
          <div ref={imageRef} className="image_container__inner">
            <Image
              src={
                post?.better_featured_image?.source_url || "/images/default.jpg"
              }
              layout="fill"
              alt={post?.title?.rendered || "Default Image"}
              objectFit="cover"
              objectPosition="center"
              priority={priority}
              loading={priority ? "eager" : "lazy"}
            />
          </div>
        </div>
        <div className="title-container">
          <div className="title-inner">
            <h4>{decodeEntities(post?.title?.rendered || "Default Title")}</h4>
          </div>
        </div>
      </div>
    </Link>
  );
};
