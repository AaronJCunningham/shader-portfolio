import MetaDataHeader from '@/components/metadata/MetaDataHeader'
import {CV} from '@/components/layout/CV'
import {Footer} from '@/components/layout/Footer'
import PortalMenu from '@/components/layout/PortalMenu'

export default function AboutMe() {
  return (
    <>
      <MetaDataHeader
        title="About Me"
        content="Aaron J. Cunningham is a lead creative technologist and full-stack developer building immersive 3D, Web3, and interactive systems."
      />
      <PortalMenu />
      <main className="about-me-page">
        <CV />
      </main>
      <Footer />
    </>
  )
}
