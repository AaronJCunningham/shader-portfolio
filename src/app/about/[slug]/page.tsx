import {  useParams } from 'next/navigation'

type Post = {
    id: number;
    title: { rendered: string };
    content: { rendered: string };
    slug: string;
    // Add more fields as needed based on the API response
  };

const url = "https://xeleven.space/wp-json/wp/v2/initiatives";

export async function generateStaticParams() {
    const posts = await fetch(url).then((res) => res.json())
   
    return posts.map((post: Post) => ({
      slug: post.slug,
    }))
  }



function Page({ params }: { params: { slug: string } }) {
  console.log(params)
    return<div>{params.slug}</div>
}

export default Page;

