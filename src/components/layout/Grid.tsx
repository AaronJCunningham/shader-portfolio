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

  console.log("All posts from WordPress API:", posts);

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
        <div className="section-meta__filters">
          <button
            className={select === 5 ? "active" : ""}
            onClick={() => setSelect(5)}
          >
            Projects
          </button>
          <button
            className={select === 4 ? "active" : ""}
            onClick={() => setSelect(4)}
          >
            News
          </button>
          <button
            className={select === 8 ? "active" : ""}
            onClick={() => setSelect(8)}
          >
            Tutorials
          </button>
          <button
            className={select === null ? "active" : ""}
            onClick={() => setSelect(null)}
          >
            All
          </button>
        </div>
      </div>
      <div className="main-grid-container">
        {newPosts.map((post, index) => {
          return <GridItem post={post} key={post?.slug} priority={index < 3} />;
        })}
      </div>
    </div>
  );
};
