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
      {/* ... other components */}
      <div className="button-container">
        <button
          className={select === 5 ? "active" : ""}
          onClick={() => setSelect(5)}
        >
          Projects
        </button>
        {/* ... other buttons */}
      </div>
      <div className="main-grid-container">
        {newPosts.map((post) => (
          <GridItem post={post} key={post?.slug} />
        ))}
      </div>
    </div>
  );
};
