import { Environment, useGLTF } from "@react-three/drei"

const Squid = () =>{
    const {scene} = useGLTF("/glbs/squid.glb")

    return <><primitive object={scene} scale={1} position={[0,0,-9]}/>
    <Environment preset="city" />
    </>
}

export default Squid;