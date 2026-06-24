import {defineQuery} from 'next-sanity'

const visibleProjectsFilter = /* groq */ `
  _type == "project" &&
  defined(slug.current) &&
  visibility != "hidden" &&
  !(_id in path("drafts.**"))
`

const imageFields = /* groq */ `
  asset->{
    _id,
    url,
    metadata {
      lqip,
      dimensions { width, height, aspectRatio }
    }
  },
  alt,
  caption,
  crop,
  hotspot
`

const projectCardFields = /* groq */ `
  _id,
  title,
  "slug": slug.current,
  excerpt,
  publishedAt,
  sortOrder,
  mainImage { ${imageFields} },
  seo {
    title,
    description,
    noIndex,
    image { ${imageFields} }
  },
  "imageUrl": coalesce(mainImage.asset->url, seo.image.asset->url)
`

export const projectsQuery = defineQuery(/* groq */ `
  *[${visibleProjectsFilter}]
  | order(coalesce(sortOrder, 999999) asc, publishedAt desc, title asc) {
    ${projectCardFields}
  }
`)

export const projectBySlugQuery = defineQuery(/* groq */ `
  *[${visibleProjectsFilter} && slug.current == $slug][0] {
    ${projectCardFields},
    body,
    links[] { _key, label, url },
    "seoImageUrl": coalesce(seo.image.asset->url, mainImage.asset->url),
    "seo": {
      "title": coalesce(seo.title, title),
      "description": coalesce(seo.description, excerpt),
      "noIndex": seo.noIndex == true,
      "image": seo.image { ${imageFields} }
    }
  }
`)

export const projectSlugsQuery = defineQuery(/* groq */ `
  *[${visibleProjectsFilter}] { "slug": slug.current }
`)

export const projectNavQuery = defineQuery(/* groq */ `
  *[${visibleProjectsFilter}]
  | order(coalesce(sortOrder, 999999) asc, publishedAt desc, title asc) {
    title,
    "slug": slug.current
  }
`)
