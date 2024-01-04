import gsap from "gsap";
import React, { useEffect, useRef } from "react";
import VirtualScroll from "virtual-scroll";
import { throttle } from "lodash";

export function Bio() {
  const ref = useRef<HTMLDivElement | null>(null);
  let boxWidth = 0;
  const spacing = 1000; // Adjust this value to control the spacing

  const scroller = new VirtualScroll();

  useEffect(() => {
    boxWidth = document.getElementById("main_header")?.getBoundingClientRect()?.width || 0;
    console.log("boxWIDTH>>>>>", boxWidth);
  });

  const handleScroll = throttle((event) => {
    const scrollOffset = event.y / 1000;
    console.log(event);
    gsap.to(ref.current?.children, {
      x: (i) => (i * spacing) - (-scrollOffset * boxWidth),
      ease: "power1",
      duration: 0.8 // Adjust duration for smoother animation
    });
  }, 10); // Throttle the event handler

  useEffect(() => {
    scroller.on(handleScroll);

    return () => {
      scroller.off(handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!ref.current) return;
    gsap.set(ref.current.children, {
      x: (i) => i * spacing 
    });
  }, []);

  return (
    <div>
      <div className="header_title_container" ref={ref}>
        <h2 className="box">Aaron J. <span>Cunningham</span></h2>
        <h2 className="box">Interactive</h2>
        <h2 className="box">Frontend Developer</h2>
        <h2 className="box">Frontend Developer</h2>
      </div>
    </div>
  );
}
