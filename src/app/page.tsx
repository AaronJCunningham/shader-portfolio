'use client'



import dynamic from "next/dynamic";
import "../../styles/index.scss"
// import Bio from "@/components/layout/Bio";
import MainScene from "@/components/threejscomponents/MainScene";
import { Loader, useProgress } from "@react-three/drei";
import { Suspense, useState } from "react";
import MetaDataHeader from "@/components/metadata/MetaDataHeader";
import { useLoaded } from "@/store";

const Bio = dynamic(() => import("../components/layout/Bio"), { ssr: false });
// const MainScene = dynamic(() => import("../components/threejscomponents/MainScene"), { ssr: false });


export default function Home() {
  const [loaded, setLoaded] = useLoaded((state) => [
    state.loaded,
    state.setLoaded,
  ]);
  

  return (<>

   <div className="header_container" id="main_header">
    <Suspense fallback={<Loader />}>
    <Bio />
    <MainScene />
    </Suspense>
    </div>
    </>
  )
}
