import {createImageUrlBuilder} from '@sanity/image-url'

import {dataset, projectId} from '../env'

const builder = createImageUrlBuilder({projectId, dataset})

export function urlFor(source: unknown) {
  return builder.image(source as never)
}
