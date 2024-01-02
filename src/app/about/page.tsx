import React from 'react';

type Post = {
  id: number;
  title: { rendered: string };
  content: { rendered: string };
  // Add more fields as needed based on the API response
};

async function fetchPosts() {
  const res = await fetch("https://xeleven.space/wp-json/wp/v2/initiatives");

  if (!res.ok) {
    // This will be caught by error boundaries in Next.js
    throw new Error('Failed to fetch posts');
  }

  return res.json();
}

const Page: React.FC = async () => {
  const posts = await fetchPosts()
 
  return (
    <div>
     {posts.map((post: Post) => (
        <div key={post.id}>
          <h2 dangerouslySetInnerHTML={{ __html: post.title.rendered }} />
          <div dangerouslySetInnerHTML={{ __html: post.content.rendered }} />
        </div>
      ))}
    </div>
  );
};

export default Page;
