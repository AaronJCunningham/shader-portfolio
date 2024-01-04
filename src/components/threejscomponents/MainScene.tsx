
import { Canvas } from "@react-three/fiber"
import { Suspense } from "react"
import ShaderScene from "./scenes/ShaderScene"
import Loader from "../svg/Loader"

const MainScene = () => {
    return <div className="header_canvas">
    <Suspense fallback={null}>
    <Canvas>
    <ShaderScene />
    </Canvas>
    </Suspense>
    </div>
}

export default MainScene;