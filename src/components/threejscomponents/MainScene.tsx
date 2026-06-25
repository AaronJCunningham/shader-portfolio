import { Canvas } from "@react-three/fiber"
import ShaderScene from "./scenes/ShaderScene"

// import Loader from "../svg/Loader"

const MainScene = () => {
    const isMobile =
        typeof window !== "undefined" &&
        window.matchMedia("(max-width: 767px)").matches;

    return (
    <div className="header_canvas">
    <Canvas
        gl={{
            antialias: false,
            alpha: false,
            powerPreference: "high-performance",
        }}
        dpr={[1, isMobile ? 1.2 : 1.5]}
    >
        <ShaderScene />  
    </Canvas>
    </div>)
}

export default MainScene;
