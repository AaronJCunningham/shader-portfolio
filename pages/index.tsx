import Script from 'next/script'
import Cookie from '@/components/cookie/Cookie'
import PortalMenu from '@/components/layout/PortalMenu'
import MatterReel from '@/components/matter-reel/MatterReel'
import MetaDataHeader from '@/components/metadata/MetaDataHeader'
import {MATTER_REEL_SLUGS} from '@/components/matter-reel/matterReel.config'
import {getMatterReelProjects} from '@/sanity/lib/projects'
import type {ProjectListItem} from '@/sanity/types'

type HomeProps = {
  projects: ProjectListItem[]
}

export default function Home({projects}: HomeProps) {
  return (
    <>
      <MetaDataHeader
        title="Matter Reel"
        content="Aaron J. Cunningham's interactive WebGPU portfolio: one persistent field of matter transforms into networks, machines, signals, portals and constellations."
      />
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-363JP1BQ7R"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-363JP1BQ7R');
        `}
      </Script>
      <Cookie />
      <PortalMenu />
      <MatterReel projects={projects} />
    </>
  )
}

export async function getStaticProps() {
  try {
    const projects = await getMatterReelProjects(MATTER_REEL_SLUGS)

    return {
      props: {projects},
      revalidate: 3600,
    }
  } catch (error) {
    console.error('Failed to fetch Sanity projects for Matter Reel', error)

    return {
      props: {projects: []},
      revalidate: 60,
    }
  }
}
