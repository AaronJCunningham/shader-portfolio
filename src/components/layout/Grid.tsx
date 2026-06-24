import {FC} from 'react'
import {GridItem} from './GridItem'
import type {ProjectListItem} from '@/sanity/types'

interface GridProps {
  posts: ProjectListItem[]
}

export const Grid: FC<GridProps> = ({posts}) => {
  return (
    <div className="project-grid" id="grid">
      <div id="projects" className="section-meta">
        <span className="section-meta__index">{'//06'}</span>
        <span className="section-meta__label">MY WORK</span>
      </div>
      <div className="main-grid-container">
        {posts.map((post, index) => {
          return <GridItem post={post} key={post.slug} priority={index < 3} />
        })}
      </div>
    </div>
  )
}
