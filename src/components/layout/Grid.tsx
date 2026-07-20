import {FC} from 'react'
import {GridItem} from './GridItem'
import type {ProjectListItem} from '@/sanity/types'

interface GridProps {
  posts: ProjectListItem[]
}

export const Grid: FC<GridProps> = ({posts}) => {
  const projectCount = String(posts.length).padStart(2, '0')

  return (
    <section className="project-grid" id="projects" aria-labelledby="project-index-title">
      <header className="work-section-heading">
        <div className="work-kicker">
          <span>{'//01'}</span>
          <span id="project-index-title">PROJECT INDEX</span>
        </div>
        <span>{projectCount} CASE STUDIES / SELECTED SYSTEMS</span>
      </header>
      <div className="main-grid-container">
        {posts.map((post, index) => (
          <GridItem
            post={post}
            index={index}
            key={post.slug}
          />
        ))}
      </div>
      {posts.length === 0 && (
        <p className="project-grid__empty">Project index is temporarily unavailable.</p>
      )}
    </section>
  )
}
