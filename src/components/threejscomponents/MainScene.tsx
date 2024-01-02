
import { Canvas } from "@react-three/fiber"
import { Suspense } from "react"
import ShaderScene from "./ShaderScene"
import Loader from "../svg/Loader"

const MainScene = () => {
    return <div className="header_canvas">
    <Suspense fallback={<Loader />}>
    <Canvas>
    <ShaderScene />
    </Canvas>
    </Suspense>
    </div>
}

export default MainScene;