import React from "react";
import Link from "next/link";

import { FaGithub, FaTwitter } from "react-icons/fa";

export function Footer({}) {
  return (
    <footer id="contact">
      <div className="section-meta">
        <span className="section-meta__index">{"//07"}</span>
        <span className="section-meta__label">CONNECT</span>
      </div>
      <h3 className="footer_cta">
        <a className="footer_cta-link" href="mailto:hello@aaronjcunningham.com">
          hello@aaronjcunningham.com
        </a>
      </h3>
      <div id="footer_icons">
        <a
          className="footer_icon"
          href="https://twitter.com/aaron_1337"
          target="_blank"
          rel="noreferrer"
        >
          <FaTwitter />
        </a>
        <a
          className="footer_icon"
          href="https://github.com/AaronJCunningham"
          target="_blank"
          rel="noreferrer"
        >
          <FaGithub />
        </a>
      </div>
      <nav className="footer_legal" aria-label="Copyright and legal links">
        <span className="footer_legal-copy">All Rights Reserved Aaron J. Cunningham - 2026</span>
        <span className="footer_legal-separator" aria-hidden="true">|</span>
        <Link href="/impressum">Impressum</Link>
        <span className="footer_legal-separator" aria-hidden="true">|</span>
        <Link href="/datenschutz">Datenschutzerklärung</Link>
      </nav>
    </footer>
  );
}
