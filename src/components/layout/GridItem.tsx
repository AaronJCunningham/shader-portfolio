import {useRef, FC} from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {gsap} from 'gsap'
import type {ProjectListItem} from '@/sanity/types'

interface GridItemProps {
  post: ProjectListItem
  priority?: boolean
}

export const GridItem: FC<GridItemProps> = ({post, priority = false}) => {
  const gridRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)
  const imageAlt = post.mainImage?.alt || post.seo?.image?.alt || post.title

  const handleIn = () => {
    gsap.to(gridRef.current, {y: -4, duration: 0.35, ease: 'power2.out'})
    gsap.to(imageRef.current, {scale: 1.035, duration: 0.7, ease: 'power3.out'})
  }
  const handleOut = () => {
    gsap.to(gridRef.current, {y: 0, duration: 0.35, ease: 'power2.out'})
    gsap.to(imageRef.current, {scale: 1, duration: 0.7, ease: 'power3.out'})
  }

  return (
    <Link href={`/${post.slug}`}>
      <div
        ref={gridRef}
        className="grid-container"
        key={post.slug}
        onMouseEnter={handleIn}
        onMouseLeave={handleOut}
      >
        <div className="image_container">
          <div ref={imageRef} className="image_container__inner">
            {post.imageUrl ? (
              <Image
                src={post.imageUrl}
                fill
                alt={imageAlt}
                sizes="(max-width: 650px) 100vw, (max-width: 1100px) 50vw, 25vw"
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
            <h4>{post.title}</h4>
          </div>
        </div>
      </div>
    </Link>
  )
}
