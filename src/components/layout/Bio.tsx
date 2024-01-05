import gsap from "gsap";
import React, { useEffect, useRef, useState } from "react";
import useMouseWheel from "../hooks/useWheelEvent"; // Adjust the path as necessary

gsap.registerEffect({
  name: "swapText",
  effect: (targets, config) => {
    let tl = gsap.timeline({ delay: config.delay });
    tl.to(targets, { opacity: 0, duration: config.duration / 2 });
    tl.add(() => targets[0].innerText = config.text);
    tl.to(targets, { opacity: 1, duration: config.duration / 2 });
    return tl;
  },
  defaults: { duration: 1 },
  extendTimeline: true
});

export default function Bio() {
  const ref = useRef<HTMLHeadingElement | null>(null);
  const texts = ["Aaron J. Cunningham", "2", "3", "4"];
  const [currentIndex, setCurrentIndex] = useState(0);

  const { currentPhaseRef} = useMouseWheel(() => {
    const newIndex = currentPhaseRef.current - 1;
    if (newIndex !== currentIndex) {
      gsap.effects.swapText([ref.current], { 
        text: texts[newIndex] || "BROKEN",
        duration: 0.5
      });
      setCurrentIndex(newIndex);
    }
  });

  return (
    <div>
      <div className="header_title_container">
        <h2 ref={ref}>{texts[0]}</h2>
      </div>
    </div>
  );
}
