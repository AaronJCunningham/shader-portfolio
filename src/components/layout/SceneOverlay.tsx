import React from "react";
import Link from "next/link";
import { useScrollPhase } from "@/store";

const sceneContent = [
  {
    index: "//01",
    label: "MANIFESTO",
    headline: ["I MAKE THE", "INTERNET LESS BORING"],
    body: null,
    showScrollPrompt: true,
    isFirst: true,
  },
  {
    index: "//02",
    label: "VISION",
    headline: ["IF YOU CAN DREAM IT", "I CAN BUILD IT"],
    body: null,
    showScrollPrompt: false,
  },
  {
    index: "//03",
    label: "PHILOSOPHY",
    headline: ["IMMERSIVE", "AND FUNCTIONAL"],
    body: null,
    showScrollPrompt: false,
  },
  {
    index: "//04",
    label: "PROOF",
    headline: [],
    linkedHeadline: { text: "MY WORK", href: "/projects" },
    body: null,
    showScrollPrompt: false,
  },
];

function getTextOpacity(phaseProgress: number, isFirst: boolean): number {
  // First scene: full opacity at 0 (page load), no fade in needed
  // Other scenes: fade in 0-0.15, visible 0.15-0.70, fade out 0.70-1.0
  if (isFirst) {
    if (phaseProgress <= 0.70) return 1;
    return 1 - (phaseProgress - 0.70) / 0.30;
  }
  if (phaseProgress <= 0.15) {
    return phaseProgress / 0.15;
  } else if (phaseProgress <= 0.70) {
    return 1;
  } else {
    return 1 - (phaseProgress - 0.70) / 0.30;
  }
}

function getTextTranslateY(phaseProgress: number, isFirst: boolean): number {
  if (isFirst) {
    if (phaseProgress <= 0.70) return 0;
    return -20 * ((phaseProgress - 0.70) / 0.30);
  }
  if (phaseProgress <= 0.15) {
    return 30 * (1 - phaseProgress / 0.15);
  } else if (phaseProgress <= 0.70) {
    return 0;
  } else {
    return -20 * ((phaseProgress - 0.70) / 0.30);
  }
}

export default function SceneOverlay() {
  const phase = useScrollPhase((state) => state.phase);
  const phaseProgress = useScrollPhase((state) => state.phaseProgress);

  const content = sceneContent[phase - 1];
  const isFirst = "isFirst" in content && !!content.isFirst;
  const opacity = getTextOpacity(phaseProgress, isFirst);
  const translateY = getTextTranslateY(phaseProgress, isFirst);

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
            <h1 key={`${phase}-${i}`}>{line}</h1>
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

        {content.body && <p className="scene-overlay__body">{content.body}</p>}
      </div>

      {content.showScrollPrompt && (
        <p className="scene-overlay__scroll-prompt">SCROLL TO INTERACT</p>
      )}

      <div className="scene-overlay__meta" style={{ opacity }}>
        <span className="scene-overlay__index">{content.index}</span>
        <span className="scene-overlay__label">{content.label}</span>
      </div>
    </div>
  );
}
