import dynamic from "next/dynamic";
import React from "react";

const Lottie = dynamic(() => import("lottie-react"), {
  ssr: false,
});

import loaderAnimation from "./loader.json"; // Adjust the path to your actual file location

const Loader = () => {
  const style = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
  };

  return (
    <div style={style}>
      <Lottie
        animationData={loaderAnimation}
        style={{ width: 500, height: 500 }}
      />
    </div>
  );
};

export default Loader;
