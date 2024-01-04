'use client'



import dynamic from "next/dynamic";
import "../../styles/index.scss"
import Bio from "@/components/layout/Bio";

// const Bio = dynamic(() => import("../components/layout/Bio"), { ssr: false });
const MainScene = dynamic(() => import("../components/threejscomponents/MainScene"), { ssr: false });

export default function Home() {
  return (<>
   <div className="header_container" id="main_header">
    <Bio />
    <MainScene />
    </div>
    </>
  )
}
