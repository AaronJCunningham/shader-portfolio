import React, { useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { useScrollPhase } from "@/store";
import { gsap } from "gsap";
import { TextPlugin } from "gsap/TextPlugin";

gsap.registerPlugin(TextPlugin);

const sceneContent = [
  {
    index: "//01",
    label: "MANIFESTO",
    headline: ["THE INTERSECTION OF", "ART & TECHNOLOGY"],
    showScrollPrompt: true,
  },
  {
    index: "//02",
    label: "VISION",
    headline: ["DREAMS BECOME", "REALITIES"],
    body: "Crafting digital experiences that blur the line between art and engineering. Every pixel is intentional, every interaction considered.",
  },
  {
    index: "//03",
    label: "PHILOSOPHY",
    headline: ["IMMERSIVE", "DIGITAL WORLDS"],
    body: "Performance meets aesthetics. Built with WebGL, GLSL and modern frameworks to deliver seamless experiences across every device.",
  },
  {
    index: "//04",
    label: "COLLABORATION",
    headline: ["VISIT MY WORK"],
    isClickable: true,
    body: "A selection of projects spanning creative development, interactive design and full-stack engineering. Each one built from scratch.",
  },
];

// 4 scenes, 3 transitions. Rest points where each scene is fully visible.
const restPoints = [0, 1 / 3, 2 / 3, 1];
const holdZone = 0.095;
const fadeZone = 0.045;
const ctaWords = ["MY WORK", "MEINE ARBEIT", "私の作品"];

function AnimatedCtaText() {
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!textRef.current) return;

    const timeline = gsap.timeline({ repeat: -1, repeatDelay: 1.4 });

    ctaWords.forEach((word) => {
      timeline.to(textRef.current, {
        duration: 1.25,
        text: word,
        ease: "power1.inOut",
      });
      timeline.to({}, { duration: 1.1 });
    });

    return () => {
      timeline.kill();
    };
  }, []);

  return (
    <span ref={textRef} className="scene-overlay__headline-button-text">
      {ctaWords[0]}
    </span>
  );
}

export default function SceneOverlay() {
  const router = useRouter();
  const phase = useScrollPhase((state) => state.phase);
  const phaseProgress = useScrollPhase((state) => state.phaseProgress);

  const normalizedScroll = (phase - 1) / 3 + phaseProgress / 3;

  let closestScene = 0;
  let closestDist = Infinity;
  for (let i = 0; i < restPoints.length; i++) {
    const dist = Math.abs(normalizedScroll - restPoints[i]);
    if (dist < closestDist) {
      closestDist = dist;
      closestScene = i;
    }
  }

  const fadeProgress = Math.max(0, (closestDist - holdZone) / fadeZone);
  const opacity = Math.max(0, 1 - fadeProgress);
  const direction = Math.sign(normalizedScroll - restPoints[closestScene]);
  const translateY = opacity > 0 ? -10 * fadeProgress * direction : 0;

  const content = sceneContent[closestScene];

  const handleEnter = () => {
    router.push("/work");
  };

  return (
    <div className={`scene-overlay scene-overlay--layout-${closestScene}`}>
      <div
        className="scene-overlay__bottom"
        style={{
          opacity,
          transform: `translateY(${translateY}px)`,
        }}
      >
        <div className="scene-overlay__headline">
          {content.headline.map((line, i) =>
            "isClickable" in content && content.isClickable ? (
              <button
                key={`${closestScene}-${i}`}
                className="scene-overlay__headline-button"
                type="button"
                aria-label="Visit my work"
                onClick={handleEnter}
              >
                <AnimatedCtaText />
              </button>
            ) : (
              <h1 key={`${closestScene}-${i}`}>{line}</h1>
            ),
          )}
        </div>

        {"showScrollPrompt" in content && content.showScrollPrompt && (
          <p className="scene-overlay__scroll-prompt">
            <span className="scene-overlay__prompt-desktop">SCROLL TO INTERACT</span>
            <span className="scene-overlay__prompt-mobile">SWIPE TO INTERACT</span>
          </p>
        )}

        {"body" in content && content.body && (
          <p className="scene-overlay__body">{content.body}</p>
        )}
      </div>

      <div className="scene-overlay__meta" style={{ opacity }}>
        <span className="scene-overlay__index">{content.index}</span>
        <span className="scene-overlay__label">{content.label}</span>
      </div>
    </div>
  );
}
