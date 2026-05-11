import React from "react";
import Link from "next/link";
import { useScrollPhase } from "@/store";

// 5 visual rest points as you scroll through:
// SceneOne → SceneFour → SceneThree → SceneTwo → SceneOne
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
  },
  {
    index: "//03",
    label: "PHILOSOPHY",
    headline: ["IMMERSIVE", "AND FUNCTIONAL"],
  },
  {
    index: "//04",
    label: "PROOF",
    headline: [],
    linkedHeadline: { text: "MY WORK", href: "/projects" },
  },
];

// Rest points in normalized scroll space (0 to 1)
// Each phase boundary is where a scene is fully visible
const restPoints = [0, 1/3, 2/3, 1];
const fadeZone = 0.12;

export default function SceneOverlay() {
  const phase = useScrollPhase((state) => state.phase);
  const phaseProgress = useScrollPhase((state) => state.phaseProgress);

  // Overall normalized scroll (0 to ~1)
  const normalizedScroll = (phase - 1) / 3 + phaseProgress / 3;

  // Find closest rest point
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
  const translateY = opacity > 0 ? -20 * (closestDist / fadeZone) * direction : 0;

  const content = sceneContent[closestScene];

  return (
    <div className="scene-overlay">
      <div
        className="scene-overlay__content"
        style={{
          opacity,
          transform: `translateY(${translateY}px)`,
        }}
      >
        <div className="scene-overlay__headline">
          {content.headline.map((line, i) => (
            <h1 key={`${closestScene}-${i}`}>{line}</h1>
          ))}
          {"linkedHeadline" in content && content.linkedHeadline && (
            <h1>
              <Link
                href={(content as any).linkedHeadline.href}
                className="scene-overlay__headline-link"
              >
                {(content as any).linkedHeadline.text}
              </Link>
            </h1>
          )}
        </div>
      </div>

      {"showScrollPrompt" in content && content.showScrollPrompt && (
        <p className="scene-overlay__scroll-prompt">SCROLL TO INTERACT</p>
      )}

      <div className="scene-overlay__meta" style={{ opacity }}>
        <span className="scene-overlay__index">{content.index}</span>
        <span className="scene-overlay__label">{content.label}</span>
      </div>
    </div>
  );
}
