import gsap from "gsap";
import React, { useEffect, useRef, useState } from "react";
import useMouseWheelandTouch from "../hooks/useWheelEvent"; // Adjust the path as necessary
import Link from "next/link";
import { useActivateScroll } from "@/store";

gsap.registerEffect({
  name: "swapText",
  effect: (targets: any, config: any) => {
    let tl = gsap.timeline();
    tl.to(targets, { opacity: 0, duration: config.duration / 2 });
    tl.add(() => (targets[0].innerText = config.text));
    tl.to(targets, { opacity: 1, duration: config.duration / 2 });
    return tl;
  },
  defaults: { duration: 1 },
  extendTimeline: true,
});

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
        gsap.effects.swapText([ref.current], {
          text: texts[newIndex],
          duration: 1,
        });
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
    <div className="header_title_container">
      <div className="header_content">
        <h2 ref={ref}>Aaron J. Cunningham</h2>
        {phase === 1 && (
          <div className="scroll_text">
            <div className="enter_link" onClick={handleClick}>
              <p>SCROLL DOWN TO INTERACT OR CLICK TO SKIP</p>
            </div>
          </div>
        )}
        {phase === 4 && (
          <div className="enter_link" onClick={handleClick}>
            CLICK TO ENTER
          </div>
        )}
      </div>
    </div>
  );
}
