import type {ProjectListItem} from '@/sanity/types'
import type {MatterChapter, MatterState} from './types'

export const MATTER_REEL_SLUGS = [
  'threejs-metaverse',
  'basedai-nexus-visualizing-a-blockchain-in-3d',
  'building-a-defi-launchpad',
  'montra-browser-video-editor',
] as const

type ProjectStateDefinition = {
  id: string
  slug?: (typeof MATTER_REEL_SLUGS)[number]
  href?: string
  external?: boolean
  eyebrow: string
  title: string
  description: string
  materialLabel: string
  state: Exclude<MatterState, 'origin' | 'signal'>
}

const projectStates: ProjectStateDefinition[] = [
  {
    id: 'spirit-realm',
    slug: MATTER_REEL_SLUGS[0],
    eyebrow: '01 / SPIRIT REALM / XELEVEN',
    title: 'Spirit Realm',
    description:
      'An explorable Three.js world, live multiplayer and chat, an art gallery, NFT minting and reusable automatic BVH colliders. Featured at NFT NYC in Times Square.',
    materialLabel: 'TYPESCRIPT / R3F / WEBSOCKETS / BVH / WEB3',
    state: 'portal',
  },
  {
    id: 'the-nexus',
    slug: MATTER_REEL_SLUGS[1],
    eyebrow: '02 / THE NEXUS / BASEDAI',
    title: 'The Nexus',
    description:
      'Owned end to end: the design thesis, Three.js application and two custom backends for live network, staking, price and trading-volume data.',
    materialLabel: 'NEXT.JS / R3F / ETHERS.JS / REAL-TIME DATA',
    state: 'nexus',
  },
  {
    id: 'defi-launchpad',
    slug: MATTER_REEL_SLUGS[2],
    eyebrow: '03 / DEFI LAUNCHPAD / BASEDAI',
    title: 'DeFi Platform',
    description:
      'Five connected Solidity contracts, milestone voting, on-chain staking and transferable positions. EIP-1167 clone factories cut repeat deployment cost by roughly 95%.',
    materialLabel: 'SOLIDITY / NEXT.JS / EXPRESS / SUPABASE / EIP-1167',
    state: 'machine',
  },
  {
    id: 'montra-video-editor',
    slug: MATTER_REEL_SLUGS[3],
    eyebrow: '04 / MONTRA / LEAD THREE.JS DEVELOPER',
    title: 'Montra Video Editor',
    description:
      'Led Three.js development on a production editor that kept video, application state and real-time graphics synchronized in one responsive workflow.',
    materialLabel: 'TYPESCRIPT / REACT / NEXT.JS / R3F / THREE.JS / WEBGL',
    state: 'editor',
  },
]

export function createMatterChapters(projects: ProjectListItem[]): MatterChapter[] {
  const projectsBySlug = new Map(projects.map((project) => [project.slug, project]))

  const chapters: MatterChapter[] = [
    {
      id: 'origin',
      index: '//00',
      eyebrow: 'FULL-STACK DEVELOPMENT / PRODUCT OWNERSHIP / DESIGN JUDGMENT',
      title: 'Aaron J. Cunningham',
      description:
        'I turn ambitious ideas into shipped products, combining full-stack development, design judgment, and disciplined agentic workflows.',
      materialLabel: '7 YEARS SOFTWARE / 10 YEARS DESIGN',
      state: 'origin',
    },
    {
      id: 'capabilities',
      index: '//01',
      eyebrow: 'PRODUCT OWNERSHIP / DESIGN JUDGMENT / END-TO-END DELIVERY',
      title: 'Technical depth.',
      description:
        'Give me an ambitious idea and I will turn it into a finished, highly polished product. I own the architecture and implementation, using my design background to refine every detail until the result feels complete.',
      materialLabel: 'ARCHITECTURE / FRONTEND / BACKEND / REAL-TIME / 3D',
      state: 'signal',
    },
  ]

  projectStates.forEach((definition, index) => {
    const project = definition.slug
      ? projectsBySlug.get(definition.slug) ||
        ({
          _id: `matter-fallback-${definition.slug}`,
          title: definition.title,
          slug: definition.slug,
          excerpt: definition.description,
        } satisfies ProjectListItem)
      : undefined

    chapters.push({
      id: definition.id,
      index: `//0${index + 2}`,
      eyebrow: definition.eyebrow,
      title: definition.title,
      description: definition.description,
      materialLabel: definition.materialLabel,
      project,
      href: definition.href || (project ? `/${project.slug}` : undefined),
      external: definition.external,
      state: definition.state,
    })
  })

  return chapters
}
