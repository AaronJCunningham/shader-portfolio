import Link from "next/link";

export const CV = () => {
  return (
    <div id="bio" className="bio_content">
      <h2 className="bio-h2">ABOUT ME</h2>
      <p>
        As a Creative Technologist & Full-stack Three.js Developer specializing
        in Web3 and AI, I lead projects that push the boundaries of
        browser-based experiences — from immersive 3D platforms to fully
        realized metaverses.
      </p>

      <p>
        I build production applications with TypeScript, Next.js, React, and
        Supabase, and I own the full lifecycle: design, architecture, frontend,
        backend, and smart contracts.
      </p>

      <p>
        Most recently, I was lead developer at BASEDAI, where I single-handedly
        built{" "}
        <a
          href="https://basedai-nexus.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
        >
          The NEXUS
        </a>{" "}
        — a real-time 3D visualization of live blockchain data. I defined the
        design thesis, architected and built the full stack, and directed a 3D
        artist to produce the assets.
      </p>

      <p>
        Since 2023, I have been lead developer for two additional Web3 projects
        backed by major blockchain organizations. Details remain under NDA —
        inquiries are welcome.
      </p>

      <p>
        Previously, I was lead Three.js developer at{" "}
        <a href="https://montra.com" target="_blank" rel="noopener noreferrer">
          Montra
        </a>
        , a browser-based video editing platform built with React Three Fiber.
        From 2020–2023, I led development at{" "}
        <a
          href="https://xeleven.tech"
          target="_blank"
          rel="noopener noreferrer"
        >
          XELEVEN
        </a>
        , a metaverse studio delivering immersive experiences for clients
        including{" "}
        <a
          href="https://theface.com/tiffany-calvers-world"
          target="_blank"
          rel="noopener noreferrer"
        >
          NIKE
        </a>
        . Our project{" "}
        <a
          href="https://www.spiritrealm.art"
          target="_blank"
          rel="noopener noreferrer"
        >
          Spirit Realm
        </a>{" "}
        was featured at NFT NYC in Times Square and in Red-Eye magazine. In
        2022, I contributed to{" "}
        <a
          href="https://ravespace.io"
          target="_blank"
          rel="noopener noreferrer"
        >
          RaveSpace&apos;s
        </a>{" "}
        Musée Dezentral, the first NFT museum.
      </p>

      <p>
        My blockchain career began in 2014 at{" "}
        <a
          href="https://coinsquare.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Coinsquare
        </a>
        , Canada&apos;s largest crypto exchange, followed by{" "}
        <a href="https://iost.io" target="_blank" rel="noopener noreferrer">
          IOST
        </a>{" "}
        in Asia. I&apos;ve spoken at{" "}
        <Link href="https://www.aaronjcunningham.com/chainlink-in-berlin">
          Chainlink HQ in Berlin
        </Link>{" "}
        and{" "}
        <Link href="https://www.aaronjcunningham.com/google-campus-warsaw">
          Google Campus in Warsaw
        </Link>
        .
      </p>

      <p>
        Beyond tech, my background in music includes five Billboard Top-20
        tracks, features in VICE and BoilerRoom, and nominations at the
        Oberhausen Film Festival and Prism Prize Awards.
      </p>

      <p>
        I started a project with my AI agent Hex to explore whether an AI can
        learn to be creative autonomously. Every day, it creates — no prompts,
        no intervention. We call it the{" "}
        <Link href="https://aaronjcunningham.com/mauve-zone">Mauve Zone</Link>.
        The question: where does it go from here?
      </p>
    </div>
  );
};
