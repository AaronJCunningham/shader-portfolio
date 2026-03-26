import React, { useState } from 'react';

interface ManifestEntry {
  seed: number;
  date: string;
  name: string;
  component: string;
}

interface MauveZoneNavProps {
  pieces: ManifestEntry[];
  activeIndex: number;
  onPrev: () => void;
  onNext: () => void;
}

const MauveZoneNav: React.FC<MauveZoneNavProps> = ({ pieces, activeIndex, onPrev, onNext }) => {
  const [visible, setVisible] = useState(true);
  const activePiece = pieces[activeIndex];

  return (
    <>
      <style>{`
        .mauve-zone-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 56px;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          z-index: 1000;
          transition: transform 0.3s ease;
          color: white;
          font-family: 'Space Grotesk', system-ui, sans-serif;
          font-size: 14px;
          letter-spacing: 0.02em;
        }
        .mauve-zone-nav.hidden {
          transform: translateY(100%);
        }
        .mauve-zone-nav-arrow {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.8;
          transition: opacity 0.2s;
          font-size: 18px;
        }
        .mauve-zone-nav-arrow:hover {
          opacity: 1;
        }
        .mauve-zone-nav-center {
          text-align: center;
          flex: 1;
        }
        .mauve-zone-nav-title {
          font-weight: 500;
          font-size: 13px;
        }
        .mauve-zone-nav-date {
          font-size: 11px;
          opacity: 0.6;
          margin-top: 2px;
        }
        .mauve-zone-nav-toggle {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.6;
          transition: opacity 0.2s;
          font-size: 16px;
          min-width: 32px;
        }
        .mauve-zone-nav-toggle:hover {
          opacity: 1;
        }
      `}</style>
      <nav className={`mauve-zone-nav ${visible ? '' : 'hidden'}`}>
        <button className="mauve-zone-nav-arrow" onClick={onPrev} aria-label="Previous piece">
          ←
        </button>
        <div className="mauve-zone-nav-center">
          <div className="mauve-zone-nav-title">{activePiece.name}</div>
          <div className="mauve-zone-nav-date">{activePiece.date}</div>
        </div>
        <button className="mauve-zone-nav-arrow" onClick={onNext} aria-label="Next piece">
          →
        </button>
        <button
          className="mauve-zone-nav-toggle"
          onClick={() => setVisible(v => !v)}
          aria-label={visible ? 'Hide navigation' : 'Show navigation'}
        >
          {visible ? '▲' : '▼'}
        </button>
      </nav>
    </>
  );
};

export default MauveZoneNav;
