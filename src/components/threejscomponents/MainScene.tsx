
import { Canvas } from "@react-three/fiber"
import ShaderScene from "./scenes/ShaderScene"

// import Loader from "../svg/Loader"

const MainScene = () => {

    return (
    <div className="header_canvas">
    <Canvas>
        <ShaderScene />  
    </Canvas>
    </div>)
}

export default MainScene;