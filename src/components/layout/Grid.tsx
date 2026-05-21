import { FC } from "react";
import { GridItem } from "./GridItem";
import { CV } from "./CV";

interface Post {
  slug: string;
  categories: number[];
  // ... other properties of post
}

interface GridProps {
  posts: Post[];
}

export const Grid: FC<GridProps> = ({ posts }) => {
  return (
    <div className="project-grid" id="grid">
      <CV />
      <div id="projects" className="section-meta">
        <span className="section-meta__index">{"//06"}</span>
        <span className="section-meta__label">MY WORK</span>
      </div>
      <div className="main-grid-container">
        {posts.map((post, index) => {
          return <GridItem post={post} key={post?.slug} priority={index < 3} />;
        })}
      </div>
    </div>
  );
};
