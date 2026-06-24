import type {PortableTextComponents} from '@portabletext/react'
import {PortableText} from '@portabletext/react'

import {urlFor} from '@/sanity/lib/image'

type ProjectBodyProps = {
  value?: unknown[]
}

const components: PortableTextComponents = {
  block: {
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

      return (
        <figure>
          <img src={urlFor(value).width(1000).fit('max').auto('format').url()} alt={value.alt || ''} />
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
