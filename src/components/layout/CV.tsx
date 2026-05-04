import Link from "next/link";

export const CV = () => {
  return (
    <div id="bio" className="bio_content">
      <h2 className="bio-h2">ABOUT ME</h2>
      <p>
        As a full-stack developer specializing in Three.js, Web3, and AI, I lead
        projects that push the boundaries of browser-based experiences, from
        immersive websites to metaverses.
      </p>

      <p>
        I build applications with TypeScript, Next.js, React, and Supabase,
        always adapting to new technologies to stay at the forefront of web
        development.
      </p>

      <p>
        Most recently, I was the lead Three.js and Web3 developer at BASEDAI,
        where I single-handedly built{" "}
        <a
          href="https://basedai-nexus.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
        >
          The NEXUS
        </a>{" "}
        — a 3D visualization of live blockchain data. I created the design
        thesis, engineered the full stack from top to bottom, and worked
        directly with a 3D artist to design the assets.
      </p>

      <p>
        Since 2023, I have been the lead developer for two additional anonymous
        Web3 projects backed by major blockchain organizations. While details
        remain undisclosed, inquiries are welcome.
      </p>

      <p>
        Previously, I was lead Three.js developer at{" "}
        <a href="https://montra.com" target="_blank" rel="noopener noreferrer">
          Montra
        </a>
        , a web-based video editing startup. From 2020–2023, I served as lead
        developer at{" "}
        <a
          href="https://xeleven.tech"
          target="_blank"
          rel="noopener noreferrer"
        >
          XELEVEN
        </a>
        , a metaverse studio working with clients like{" "}
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
        My blockchain journey began in 2014 with roles at{" "}
        <a
          href="https://coinsquare.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Coinsquare
        </a>
        , Canada&apos;s largest crypto exchange, and{" "}
        <a href="https://iost.io" target="_blank" rel="noopener noreferrer">
          IOST
        </a>{" "}
        in Asia. I&apos;ve given talks at{" "}
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
        Oberhausen Film Festival and Prism Prize Awards. I built a{" "}
        <Link href="/music-visualizer">music visualizer</Link> for my new album
        using three.js and GLSL.
      </p>

      <p>
        I started a project with my AI agent Hex to see if it can learn to be
        creative on its own. Every day, it creates — no prompts, no
        intervention. We call it the{" "}
        <Link href="https://aaronjcunningham.com/mauve-zone">Mauve Zone</Link>.
        The question: where does it go from here?
      </p>

      <p style={{ color: "#888", marginBottom: "5px" }}>
        I am also a musician. Check out the
      </p>
      <Link
        href="/music-visualizer"
        className="reverse-link"
        style={{ textTransform: "uppercase", fontWeight: "bold" }}
      >
        Music Visualizer for my new album
      </Link>
    </div>
  );
};
