import gsap from "gsap";
import React, { useEffect, useRef, useState } from "react";
import useMouseWheel from "../hooks/useWheelEvent"; // Adjust the path as necessary


gsap.registerEffect({
  name: "swapText",
  effect: (targets: any, config: any) => {
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
  const [delta, setDelta] = useState(0)
const [phase, setPhase] = useState(0)
const [normalizedValue, setNormalizedValue] = useState(0)
  const { currentPhaseRef, cumulativeDeltaRef, normalizedValueRef } = useMouseWheel(() => {
    const newIndex = currentPhaseRef.current - 1;
    // console.log("OUTSIDE",newIndex, currentPhaseRef.current - 1, currentIndex )
    if ( newIndex !== currentIndex) {
      // gsap.effects.swapText([ref.current], {
      //   text: texts[newIndex],
      //   duration: 0.25
      // });
      setCurrentIndex(newIndex);
     
      // console.log("inside",newIndex, currentPhaseRef.current - 1, currentIndex )
    }
  });

 useEffect(() => {
  // console.log("TRIGGERERERRERERE")
  setDelta(cumulativeDeltaRef.current)
  setPhase(currentPhaseRef.current)
  setNormalizedValue(normalizedValueRef.current)
 },[currentPhaseRef, cumulativeDeltaRef, normalizedValueRef.current])
  


  return (
    <div className="header_title_container">
      <h2 ref={ref}>{texts[currentIndex]}</h2>
    </div>
  );
}
