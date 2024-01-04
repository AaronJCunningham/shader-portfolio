'use client'

import { Bio } from '@/components/layout/Bio'

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
