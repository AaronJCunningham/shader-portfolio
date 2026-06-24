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
        <CV>
          <section className="about-signal" aria-label="Creative technology profile">
            <div className="about-signal__sheet">
              <div className="about-signal__ruler" aria-hidden="true">
                <span>CREATIVE TECHNOLOGY</span>
                <span>AI-FIRST BUILDER</span>
                <span>FULL APP THINKING</span>
              </div>

              <div className="about-signal__grid">
                <div>
                  <span>01</span>
                  <strong>Idea to interface</strong>
                </div>
                <div>
                  <span>02</span>
                  <strong>Shader to system</strong>
                </div>
                <div>
                  <span>03</span>
                  <strong>Design that ships</strong>
                </div>
                <div>
                  <span>04</span>
                  <strong>Prototype to product</strong>
                </div>
              </div>
            </div>
          </section>
        </CV>
      </main>
      <Footer />
    </>
  )
}
