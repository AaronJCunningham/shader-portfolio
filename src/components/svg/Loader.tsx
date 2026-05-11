import { useEffect, useState } from "react";
import { useLoadingProgress } from "@/store";

const Loader = () => {
  const [loadingProgress] = useLoadingProgress((state: any) => [
    state.loadingProgress,
  ]);
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (loadingProgress >= 100) {
      setFadeOut(true);
      const timer = setTimeout(() => setVisible(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [loadingProgress]);

  if (!visible) return null;

  return (
    <div className={`css-loader ${fadeOut ? "css-loader--fade-out" : ""}`}>
      <svg
        className="css-loader__geo"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Large diamond */}
        <polygon
          points="500,80 920,500 500,920 80,500"
          className="css-loader__shape css-loader__shape--1"
        />
        {/* Rotated inner diamond */}
        <polygon
          points="500,200 800,500 500,800 200,500"
          className="css-loader__shape css-loader__shape--2"
        />
        {/* Tall narrow diamond */}
        <polygon
          points="500,50 650,500 500,950 350,500"
          className="css-loader__shape css-loader__shape--3"
        />
        {/* Angular lines */}
        <line x1="100" y1="150" x2="500" y2="500" className="css-loader__shape css-loader__shape--4" />
        <line x1="900" y1="150" x2="500" y2="500" className="css-loader__shape css-loader__shape--4" />
        <line x1="100" y1="850" x2="500" y2="500" className="css-loader__shape css-loader__shape--4" />
        <line x1="900" y1="850" x2="500" y2="500" className="css-loader__shape css-loader__shape--4" />
      </svg>

      <div className="css-loader__content">
        <h2 className="css-loader__title">AARON J. CUNNINGHAM</h2>
        <p className="css-loader__label">LOADING</p>
        <div className="css-loader__line" />
      </div>
    </div>
  );
};

export default Loader;
