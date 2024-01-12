
import { Canvas } from "@react-three/fiber"
import { Suspense, useEffect, useState, useLayoutEffect } from "react"
import ShaderScene from "./scenes/ShaderScene"
import { useProgress, Loader} from "@react-three/drei"
import { useLoadingProgress } from "@/store"
import { ChromaticAberration, EffectComposer } from "@react-three/postprocessing"
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