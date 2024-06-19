import gsap from "gsap";
import React, { useEffect, useRef, useState } from "react";
import useMouseWheelandTouch from "../hooks/useWheelEvent"; // Adjust the path as necessary
import Link from "next/link";
import { useActivateScroll } from "@/store";
import AnimatedTitle from "./AnimatedTitle";

// gsap.registerEffect({
//   name: "swapText",
//   effect: (targets: any, config: any) => {
//     let tl = gsap.timeline();
//     tl.to(targets, { opacity: 0, duration: config.duration / 2 });
//     tl.add(() => (targets[0].innerText = config.text));
//     tl.to(targets, { opacity: 1, duration: config.duration / 2 });
//     return tl;
//   },
//   defaults: { duration: 1 },
//   extendTimeline: true,
// });

export default function Bio() {
  const ref = useRef<HTMLHeadingElement | null>(null);
  const texts = [
    "Aaron J. Cunningham",
    "Interactive Frontend Development",
    "WebGL & Three.js",
    "Metaverse & Web3",
  ];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [delta, setDelta] = useState(0);
  const [phase, setPhase] = useState(0);
  const [normalizedValue, setNormalizedValue] = useState(0);

  const [activateScroll, setActivateScroll] = useActivateScroll((state) => [
    state.activateScroll,
    state.setActivateScroll,
  ]);

  const { currentPhaseRef, cumulativeDeltaRef, normalizedValueRef } =
    useMouseWheelandTouch(() => {
      let newIndex = currentPhaseRef.current - 1;
      newIndex = Math.max(0, Math.min(newIndex, texts.length - 1)); // Ensure newIndex is within bounds

      if (newIndex !== currentIndex) {
        // gsap.effects.swapText([ref.current], {
        //   text: texts[newIndex],
        //   duration: 1,
        // });
        setCurrentIndex(newIndex);
      }
    });

  useEffect(() => {
    setDelta(cumulativeDeltaRef.current);
    setPhase(currentPhaseRef.current);
    setNormalizedValue(normalizedValueRef.current);
  }, [currentPhaseRef, cumulativeDeltaRef, normalizedValueRef.current]);

  const handleClick = () => {
    setActivateScroll(true);
  };

  return (
    <>
      {/* <div className="ticker-container">
        <div className="ticker">
          <span className="ticker-text">
            This is a sample news ticker text that scrolls from left to right.
            This is a sample news ticker text that scrolls from left to right.
            This is a sample news ticker text that scrolls from left to right.
          </span>
        </div>
      </div> */}
      <div className="header_title_container">
        <div className="border-1">
          <h4>scroll & mouse to interact</h4>
        </div>
        <div className="border-2">
          <div className="row-1">
            <AnimatedTitle words={["ABOUT ME", "自己紹介", "ÜBER MICH"]} />
          </div>
          <div className="row-2">
            <AnimatedTitle
              words={["PROJECTS", "事業", "PROJEKTE"]}
              id={"/#projects"}
            />
          </div>
          <div className="row-3">
            <AnimatedTitle
              words={["CONTACT", "接触", "KONTAKT"]}
              id={"/#contact"}
            />
          </div>
        </div>
      </div>
    </>
  );
}
