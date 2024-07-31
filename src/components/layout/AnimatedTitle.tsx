import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { TextPlugin } from "gsap/TextPlugin";
import { useActivateScroll, useLoadingProgress } from "@/store";
import Link from "next/link";
import { useRouter } from "next/router";

gsap.registerPlugin(TextPlugin);

interface AnimatedTitleProps {
  words: string[];
  id?: string;
}

const AnimatedTitle: React.FC<AnimatedTitleProps> = ({ words, id }) => {
  const titleRef = useRef<HTMLHeadingElement>(null);

  const [activateScroll, setActivateScroll] = useActivateScroll((state) => [
    state.activateScroll,
    state.setActivateScroll,
  ]);

  useEffect(() => {
    if (!titleRef.current) return;

    const timeline = gsap.timeline({ repeat: -1, repeatDelay: 2 });

    words.forEach((word) => {
      timeline.to(titleRef.current, {
        duration: 2,
        text: word,
        ease: "power1.inOut",
      });
      timeline.to({}, { duration: 1 }); // Adds a delay after each word animation
    });
  }, [words]);

  const handleClick = () => {
    setActivateScroll(true);
    console.log("CLICK");
  };

  return (
    <Link href={id ? id : "/"}>
      <h3
        ref={titleRef}
        style={{
          display: "inline-block",
          fontSize: "3rem",
          pointerEvents: "all",
          cursor: "pointer",
        }}
        onClick={handleClick}
      >
        {words[0]}
      </h3>
    </Link>
  );
};

export default AnimatedTitle;
