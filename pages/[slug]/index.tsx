import React from 'react'
import Link from 'next/link'

import {Footer} from '@/components/layout/Footer'
import MetaDataHeader from '@/components/metadata/MetaDataHeader'
import {ProjectBody} from '@/components/sanity/ProjectBody'
import {getProjectBySlug, getProjectNavigation, getProjectSlugs} from '@/sanity/lib/projects'
import type {Project, ProjectNavItem} from '@/sanity/types'

interface DynamicProjectProps {
  project: Project
  previousProject?: ProjectNavItem | null
  nextProject?: ProjectNavItem | null
}

interface Params {
  slug: string
}

interface StaticPropsContext {
  params: Params
}

export default function DynamicProject({project, previousProject, nextProject}: DynamicProjectProps) {
  return (
    <>
      <MetaDataHeader
        title={project.seo?.title || project.title}
        content={project.seo?.description || project.excerpt}
        image={project.seoImageUrl || project.imageUrl}
        noIndex={project.seo?.noIndex}
      />
      <nav className="project-top-nav" aria-label="Project navigation">
        <Link href="/work" className="project-top-nav__back">
          ← Projects
        </Link>
        <div className="project-top-nav__pager">
          {previousProject ? (
            <Link href={`/${previousProject.slug}`}>Prev</Link>
          ) : (
            <span className="is-disabled">Prev</span>
          )}
          <span aria-hidden="true">/</span>
          {nextProject ? (
            <Link href={`/${nextProject.slug}`}>Next</Link>
          ) : (
            <span className="is-disabled">Next</span>
          )}
        </div>
      </nav>
      <div className="about_container">
        <div className="news_content">
          <div className="news_header">
            <h1>{project.title}</h1>
          </div>
          <div className="news_text_container">
            <ProjectBody value={project.body} />
          </div>
        </div>
      </div>
      <div className="article-meta">
        <p>
          By Aaron J. Cunningham
          {project.publishedAt &&
            ` • Date Published: ${new Date(project.publishedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}`}
        </p>
      </div>
      <Footer />
    </>
  )
}

export const getStaticPaths = async () => {
  try {
    const projects = await getProjectSlugs()

    const paths = projects.map((project) => {
      return {
        params: {slug: project.slug},
      }
    })

    return {
      paths,
      fallback: 'blocking',
    }
  } catch (error) {
    console.error('Failed to fetch Sanity project paths during build', error)

    return {
      paths: [],
      fallback: 'blocking',
    }
  }
}

export async function getStaticProps({params}: StaticPropsContext) {
  try {
    const [project, navigation] = await Promise.all([
      getProjectBySlug(params.slug),
      getProjectNavigation(),
    ])

    if (!project) {
      return {notFound: true, revalidate: 60}
    }

    const currentIndex = navigation.findIndex((item) => item.slug === params.slug)
    const previousProject =
      currentIndex >= 0 && currentIndex < navigation.length - 1 ? navigation[currentIndex + 1] : null
    const nextProject = currentIndex > 0 ? navigation[currentIndex - 1] : null

    return {
      props: {
        project,
        previousProject,
        nextProject,
      },
      revalidate: 3600,
    }
  } catch (error) {
    console.error(`Failed to fetch Sanity project for slug "${params.slug}"`, error)
    return {notFound: true, revalidate: 60}
  }
}
