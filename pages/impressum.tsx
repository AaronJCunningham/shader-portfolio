import MetaDataHeader from "@/components/metadata/MetaDataHeader";
import { Footer } from "@/components/layout/Footer";

export default function Impressum() {
  return (
    <>
      <MetaDataHeader title="Impressum" />
      <main className="legal-page">
        <section className="legal-page__content">
          <div className="section-meta">
            <span className="section-meta__index">{"//08"}</span>
            <span className="section-meta__label">IMPRESSUM</span>
          </div>

          <h1>Impressum</h1>

          <h2>Angaben gemäß § 5 DDG</h2>
          <p>
            Aaron J. Cunningham
            <br />
            Uhlandstr. 29
            <br />
            10719 Berlin
            <br />
            Deutschland
          </p>

          <h2>Kontakt</h2>
          <p>
            E-Mail:{" "}
            <a href="mailto:hello@aaronjcunningham.com">
              hello@aaronjcunningham.com
            </a>
          </p>

          <h2>Verantwortlich für den Inhalt</h2>
          <p>
            Verantwortlich nach § 18 Abs. 2 MStV:
            <br />
            Aaron J. Cunningham
            <br />
            Uhlandstr. 29
            <br />
            10719 Berlin
            <br />
            Deutschland
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
