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
    <div id="bio" className="about_content">
      <h2 className="bio-h2">PROJECTS & BLOG</h2>
      <p>
        Here are a few of my recent projects, as well as some of my thoughts
        that I write for my blog.
      </p>
    </div>
    <div className="button-container">
      <button
        className={select === null ? "active" : ""}
        onClick={() => setSelect(null)}
      >
        All
      </button>
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
    </div>
    <div className="main-grid-container">
      {newPosts.map((post) => {
        return <GridItem post={post} key={post?.slug} />;
      })}
    </div>
  </div>
  );
};
