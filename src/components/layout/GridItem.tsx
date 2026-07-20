import {useRef, FC} from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {gsap} from 'gsap'
import type {ProjectListItem} from '@/sanity/types'

interface GridItemProps {
  post: ProjectListItem
  index: number
  priority?: boolean
}

export const GridItem: FC<GridItemProps> = ({post, index, priority = false}) => {
  const gridRef = useRef<HTMLElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)
  const imageAlt = post.mainImage?.alt || post.seo?.image?.alt || post.title
  const publishedYear = post.publishedAt
    ? new Date(post.publishedAt).getFullYear()
    : null
  const displayYear = publishedYear && !Number.isNaN(publishedYear)
    ? publishedYear
    : 'CASE STUDY'

  const handleIn = () => {
    gsap.to(gridRef.current, {y: -4, duration: 0.35, ease: 'power2.out'})
    gsap.to(imageRef.current, {scale: 1.035, duration: 0.7, ease: 'power3.out'})
  }
  const handleOut = () => {
    gsap.to(gridRef.current, {y: 0, duration: 0.35, ease: 'power2.out'})
    gsap.to(imageRef.current, {scale: 1, duration: 0.7, ease: 'power3.out'})
  }

  return (
    <Link className="work-card" href={`/${post.slug}`}>
      <article
        ref={gridRef}
        className="grid-container"
        onMouseEnter={handleIn}
        onMouseLeave={handleOut}
      >
        <div className="work-card__meta">
          <span>{`//${String(index + 1).padStart(2, '0')}`}</span>
          <span>{displayYear}</span>
        </div>
        <div className="image_container">
          <div ref={imageRef} className="image_container__inner">
            {post.imageUrl ? (
              <Image
                src={post.imageUrl}
                fill
                alt={imageAlt}
                sizes="(max-width: 700px) calc(100vw - 40px), 50vw"
                style={{objectFit: 'cover', objectPosition: 'center'}}
                priority={priority}
              />
            ) : (
              <div className="project-image-placeholder">
                <span>{post.excerpt || 'Image coming soon'}</span>
              </div>
            )}
          </div>
        </div>
        <div className="title-container">
          <div className="title-inner">
            <h2>{post.title}</h2>
            {post.excerpt && <p>{post.excerpt}</p>}
          </div>
          <span className="work-card__arrow" aria-hidden="true">↗</span>
        </div>
      </article>
    </Link>
  )
}
