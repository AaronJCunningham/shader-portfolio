'use client'

import { Bio } from '@/components/layout/Bio'
import Loader from '@/components/svg/Loader'
import ShaderScene from '@/components/threejscomponents/ShaderScene'
import { Canvas } from '@react-three/fiber'
import Image from 'next/image'
import { Suspense } from 'react'
import "../../styles/index.scss"
import MainScene from '@/components/threejscomponents/MainScene'

export default function Home() {
  return (<>
   <div className="header_container" id="main_header">
    <Bio />
    <MainScene />
    </div>
    </>
  )
}
