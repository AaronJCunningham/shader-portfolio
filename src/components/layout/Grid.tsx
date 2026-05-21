import { useState, FC } from "react";
import { GridItem } from "./GridItem";
import { CV } from "./CV";
import { useSelect } from "../../store";

interface Post {
  slug: string;
  categories: number[];
  // ... other properties of post
}

interface GridProps {
  posts: Post[];
}

export const Grid: FC<GridProps> = ({ posts }) => {
  const [select, setSelect] = useSelect((state) => [
    state.select,
    state.setSelect,
  ]);

  const newPosts = posts.filter((post) => {
    if (select === null) {
      return true;
    } else {
      return post.categories[0] === select;
    }
  });

  return (
    <div className="project-grid" id="grid">
      <CV />
      <div id="projects" className="section-meta">
        <span className="section-meta__index">{"//06"}</span>
        <span className="section-meta__label">MY WORK</span>
      </div>
      <div className="bio-links">
        <button
          className={`bio-links__filter ${select === 5 ? "active" : ""}`}
          onClick={() => setSelect(5)}
        >
          PROJECTS
        </button>
        <span className="bio-links__separator">|</span>
        <button
          className={`bio-links__filter ${select === 4 ? "active" : ""}`}
          onClick={() => setSelect(4)}
        >
          NEWS
        </button>
        <span className="bio-links__separator">|</span>
        <button
          className={`bio-links__filter ${select === 8 ? "active" : ""}`}
          onClick={() => setSelect(8)}
        >
          TUTORIALS
        </button>
        <span className="bio-links__separator">|</span>
        <button
          className={`bio-links__filter ${select === null ? "active" : ""}`}
          onClick={() => setSelect(null)}
        >
          ALL
        </button>
      </div>
      <div className="main-grid-container">
        {newPosts.map((post, index) => {
          return <GridItem post={post} key={post?.slug} priority={index < 3} />;
        })}
      </div>
    </div>
  );
};
