import React from "react";

import { FaGithub, FaTwitter } from "react-icons/fa";

export function Footer({}) {
  return (
    <footer id="contact">
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
      <div className="footer_email">
      <h3 className="footer_cta">Let's work together</h3>
      <p>
        <a className="email" href="mailto:hello@aaronjcunningham.com">
          hello@aaronjcunningham.com
        </a>
      </p>
      </div>
      <p id="copyright">
        All Rights Reserved{" "}
        <a
          className="reverse-link"
          href="https://aaronjcunningham.com"
          target="_blank"
          rel="noreferrer"
        >
          Aaron J. Cunningham
        </a>{" "}
        - 2023
      </p>
    </footer>
  );
}
