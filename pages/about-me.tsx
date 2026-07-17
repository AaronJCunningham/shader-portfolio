import MetaDataHeader from '@/components/metadata/MetaDataHeader'
import {CV} from '@/components/layout/CV'
import {Footer} from '@/components/layout/Footer'
import PortalMenu from '@/components/layout/PortalMenu'

export default function AboutMe() {
  return (
    <>
      <MetaDataHeader
        title="About Me"
        content="Aaron J. Cunningham is a lead full-stack developer and creative technologist building complete products, real-time systems, and immersive 3D experiences."
      />
      <PortalMenu />
      <main className="about-me-page">
        <CV>
          <section className="about-signal" aria-label="Creative technology profile">
            <div className="about-signal__sheet">
              <div className="about-signal__ruler" aria-hidden="true">
                <span>FULL-STACK DEVELOPMENT</span>
                <span>PRODUCT OWNERSHIP</span>
                <span>CREATIVE TECHNOLOGY</span>
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
