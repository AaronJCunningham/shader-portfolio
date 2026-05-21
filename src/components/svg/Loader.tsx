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
      const timer = setTimeout(() => setVisible(false), 600);
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
        aria-hidden="true"
        focusable="false"
      >
        <polygon
          points="500,80 920,500 500,920 80,500"
          className="css-loader__shape css-loader__shape--1"
        />
        <polygon
          points="500,200 800,500 500,800 200,500"
          className="css-loader__shape css-loader__shape--2"
        />
        <polygon
          points="500,50 650,500 500,950 350,500"
          className="css-loader__shape css-loader__shape--3"
        />
      </svg>

      <div className="css-loader__content">
        <div className="css-loader__text">
          <h2 className="css-loader__title">AARON J. CUNNINGHAM</h2>
          <p className="css-loader__label">LOADING</p>
        </div>
        <div className="css-loader__dots">
          <span className="css-loader__dot" />
          <span className="css-loader__dot" />
          <span className="css-loader__dot" />
        </div>
      </div>
    </div>
  );
};

export default Loader;
