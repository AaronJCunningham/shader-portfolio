import Image from 'next/image'
import Link from 'next/link'

import {Footer} from '@/components/layout/Footer'
import PortalMenu from '@/components/layout/PortalMenu'
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

const formatDate = (date?: string) =>
  date
    ? new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

export default function DynamicProject({project, previousProject, nextProject}: DynamicProjectProps) {
  const publishedDate = formatDate(project.publishedAt)

  return (
    <>
      <MetaDataHeader
        title={project.seo?.title || project.title}
        content={project.seo?.description || project.excerpt}
        image={project.seoImageUrl || project.imageUrl}
        noIndex={project.seo?.noIndex}
      />

      <div className="project-experience">
        <PortalMenu />

        <main className="project-case">
          <header className="project-masthead">
            <Link className="project-mark" href="/" aria-label="Return home">
              AJC
            </Link>
            <span>CASE STUDY / SELECTED WORK</span>
            <nav className="project-masthead__nav" aria-label="Project navigation">
              <Link href="/work">ALL WORK</Link>
              {previousProject ? (
                <Link href={`/${previousProject.slug}`} aria-label={`Previous project: ${previousProject.title}`}>
                  PREV
                </Link>
              ) : (
                <span>PREV</span>
              )}
              {nextProject ? (
                <Link href={`/${nextProject.slug}`} aria-label={`Next project: ${nextProject.title}`}>
                  NEXT
                </Link>
              ) : (
                <span>NEXT</span>
              )}
            </nav>
          </header>

          <section className="project-hero" aria-labelledby="project-title">
            <div className="project-kicker">
              <span>{'// CASE STUDY'}</span>
              <span>{publishedDate || 'SELECTED PROJECT'}</span>
            </div>
            <h1 id="project-title">{project.title}</h1>
            {project.excerpt && <p>{project.excerpt}</p>}

            <div className="project-hero__footer">
              <span>AARON J. CUNNINGHAM</span>
              <span>DESIGN / DEVELOPMENT / PRODUCT</span>
              <i aria-hidden="true" />
            </div>
          </section>

          {project.imageUrl && (
            <figure className="project-lead-media">
              <Image
                src={project.imageUrl}
                alt={project.mainImage?.alt || `${project.title} project preview`}
                width={1800}
                height={1125}
                sizes="100vw"
                priority
              />
              <figcaption>
                <span>{'//00'}</span>
                <span>{project.mainImage?.caption || 'PROJECT OVERVIEW'}</span>
              </figcaption>
            </figure>
          )}

          <section className="project-content" aria-label={`${project.title} case study content`}>
            <aside className="project-content__rail">
              <div>
                <span>{'//01'}</span>
                <strong>PROJECT NOTES</strong>
              </div>
              <dl>
                <div>
                  <dt>AUTHOR</dt>
                  <dd>AARON J. CUNNINGHAM</dd>
                </div>
                {publishedDate && (
                  <div>
                    <dt>PUBLISHED</dt>
                    <dd>{publishedDate}</dd>
                  </div>
                )}
              </dl>
              {project.links && project.links.length > 0 && (
                <nav aria-label="Project links">
                  {project.links.map((link) => (
                    <a
                      key={link._key || link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {link.label} <span aria-hidden="true">↗</span>
                    </a>
                  ))}
                </nav>
              )}
            </aside>

            <article className="project-rich-text">
              <ProjectBody value={project.body} />
            </article>
          </section>

          <nav className="project-bottom-nav" aria-label="More case studies">
            {previousProject ? (
              <Link href={`/${previousProject.slug}`}>
                <span>PREVIOUS PROJECT</span>
                <strong>{previousProject.title}</strong>
              </Link>
            ) : (
              <div />
            )}
            {nextProject ? (
              <Link href={`/${nextProject.slug}`}>
                <span>NEXT PROJECT</span>
                <strong>{nextProject.title}</strong>
              </Link>
            ) : (
              <Link href="/work">
                <span>CONTINUE</span>
                <strong>All work</strong>
              </Link>
            )}
          </nav>
        </main>

        <Footer />
      </div>
    </>
  )
}

export const getStaticPaths = async () => {
  try {
    const projects = await getProjectSlugs()

    const paths = projects.map((project) => ({
      params: {slug: project.slug},
    }))

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
