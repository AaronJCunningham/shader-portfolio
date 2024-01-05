import gsap from "gsap";
import React, { useEffect, useRef, useState } from "react";
import useMouseWheel from "../hooks/useWheelEvent"; // Adjust the path as necessary

gsap.registerEffect({
  name: "swapText",
  effect: (targets, config) => {
    let tl = gsap.timeline();
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
  const texts = ["Aaron J. Cunningham", "Interactive Frontend Development", "WebGL & Three.js", "Metaverse & Web3"];
  const [currentIndex, setCurrentIndex] = useState(0);
  const { currentPhaseRef } = useMouseWheel(() => {
    const newIndex = currentPhaseRef.current - 1;
    console.log("OUTSIDE",newIndex, currentPhaseRef.current - 1, currentIndex )
    if ( newIndex !== currentIndex) {
      gsap.effects.swapText([ref.current], {
        text: texts[newIndex],
        duration: 0.25
      });
      setCurrentIndex(newIndex);
      console.log("inside",newIndex, currentPhaseRef.current - 1, currentIndex )
    }
  });

 
  


  return (
    <div className="header_title_container">
      <h2 ref={ref}></h2>
    </div>
  );
}
