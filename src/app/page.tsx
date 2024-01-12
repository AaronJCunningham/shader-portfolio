'use client'



import dynamic from "next/dynamic";
import "../../styles/index.scss"
// import Bio from "@/components/layout/Bio";
import MainScene from "@/components/threejscomponents/MainScene";
import { useProgress } from "@react-three/drei";
import { useState } from "react";

const Bio = dynamic(() => import("../components/layout/Bio"), { ssr: false });
// const MainScene = dynamic(() => import("../components/threejscomponents/MainScene"), { ssr: false });

export default function Home() {

  const [loaded, setLoaded] = useState(false)
   
  // const {progress} = useProgress() 
  

  // useLayoutEffect(() => {
  //     if (progress === 100 ) {
  //         setTimeout(() =>{
  //             console.log("DID THIS WORK?");
  //             setLoaded(true);
  //         },2000)
  //     }
      
  // }, [progress])

  return (<>
   <div className="header_container" id="main_header">
    <Bio />
    <MainScene />
    </div>
    </>
  )
}
