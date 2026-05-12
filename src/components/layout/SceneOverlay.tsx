import React from "react";
import { useScrollPhase, useActivateScroll } from "@/store";

const sceneContent = [
  {
    index: "//01",
    label: "MANIFESTO",
    headline: ["I MAKE THE", "INTERNET LESS BORING"],
    showScrollPrompt: true,
  },
  {
    index: "//02",
    label: "VISION",
    headline: ["IF YOU CAN DREAM IT", "I CAN BUILD IT"],
    body: "Crafting digital experiences that blur the line between art and engineering. Every pixel is intentional, every interaction considered.",
  },
  {
    index: "//03",
    label: "PHILOSOPHY",
    headline: ["IMMERSIVE", "AND FUNCTIONAL"],
    body: "Performance meets aesthetics. Built with WebGL, GLSL and modern frameworks to deliver seamless experiences across every device.",
  },
  {
    index: "//04",
    label: "COLLABORATION",
    headline: ["MY WORK"],
    isClickable: true,
    body: "A selection of projects spanning creative development, interactive design and full-stack engineering. Each one built from scratch.",
  },
];

// 4 scenes, 3 transitions. Rest points where each scene is fully visible.
const restPoints = [0, 1 / 3, 2 / 3, 1];
const fadeZone = 0.12;

export default function SceneOverlay() {
  const phase = useScrollPhase((state) => state.phase);
  const phaseProgress = useScrollPhase((state) => state.phaseProgress);
  const setActivateScroll = useActivateScroll(
    (state) => state.setActivateScroll,
  );

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

  const opacity = Math.max(0, 1 - closestDist / fadeZone);
  const direction = Math.sign(normalizedScroll - restPoints[closestScene]);
  const translateY =
    opacity > 0 ? -20 * (closestDist / fadeZone) * direction : 0;

  const content = sceneContent[closestScene];

  const handleEnter = () => {
    setActivateScroll(true);
  };

  return (
    <div className="scene-overlay">
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
              <h1
                key={`${closestScene}-${i}`}
                className="scene-overlay__headline-link"
                onClick={handleEnter}
              >
                {line}
              </h1>
            ) : (
              <h1 key={`${closestScene}-${i}`}>{line}</h1>
            ),
          )}
        </div>

        {"showScrollPrompt" in content && content.showScrollPrompt && (
          <p className="scene-overlay__scroll-prompt">SCROLL TO INTERACT</p>
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
