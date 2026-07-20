import Image from 'next/image'
import type {PortableTextComponents} from '@portabletext/react'
import {PortableText} from '@portabletext/react'

import {urlFor} from '@/sanity/lib/image'

type ProjectBodyProps = {
  value?: unknown[]
}

const components: PortableTextComponents = {
  block: {
    normal: ({children}) => <p>{children}</p>,
    h2: ({children}) => <h2>{children}</h2>,
    h3: ({children}) => <h3>{children}</h3>,
    blockquote: ({children}) => <blockquote>{children}</blockquote>,
  },
  marks: {
    link: ({children, value}) => {
      const href = value?.href || '#'
      const isExternal = /^https?:///.test(href)

      return (
        <a href={href} target={isExternal ? '_blank' : undefined} rel={isExternal ? 'noreferrer noopener' : undefined}>
          {children}
        </a>
      )
    },
  },
  types: {
    image: ({value}) => {
      if (!value?.asset) return null

      const dimensions = value.asset.metadata?.dimensions
      const width = Math.min(1600, dimensions?.width || 1600)
      const height = Math.round(width / (dimensions?.aspectRatio || 1.6))
      const blurDataURL = value.asset.metadata?.lqip

      return (
        <figure>
          <Image
            src={urlFor(value).width(width).fit('max').auto('format').url()}
            alt={value.alt || ''}
            width={width}
            height={height}
            sizes="(max-width: 800px) 100vw, 900px"
            placeholder={blurDataURL ? 'blur' : 'empty'}
            blurDataURL={blurDataURL}
          />
          {value.caption && <figcaption>{value.caption}</figcaption>}
        </figure>
      )
    },
  },
}

export function ProjectBody({value}: ProjectBodyProps) {
  if (!Array.isArray(value) || value.length === 0) return null

  return <PortableText value={value} components={components} />
}
