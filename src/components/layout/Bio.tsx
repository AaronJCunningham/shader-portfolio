import gsap from "gsap";
import React, { useEffect, useRef, useState } from "react";
import useMouseWheelandTouch from "../hooks/useWheelEvent"; // Adjust the path as necessary
import Link from "next/link";
import { useActivateScroll, useLoadingProgress } from "@/store";
import AnimatedTitle from "./AnimatedTitle";

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

  const [loadingProgress, setLoadingProgress] = useLoadingProgress((state) => [
    state.loadingProgress,
    state.setLoadingProgress,
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

  useEffect(() => {
    if (loadingProgress >= 100) {
      gsap.to(".fade-in", { opacity: 1, duration: 3, ease: "power2.inOut" });
    }
  }, [loadingProgress]);

  const handleClick = () => {
    setActivateScroll(true);
  };

  return (
    <>
      {loadingProgress >= 100 && (
        <div>
          <div
            className="header_title_container fade-in"
            style={{ opacity: 0 }}
          >
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
        </div>
      )}
    </>
  );
}
