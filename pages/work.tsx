import MetaDataHeader from '@/components/metadata/MetaDataHeader'
import {Footer} from '@/components/layout/Footer'
import {Grid} from '@/components/layout/Grid'
import PortalMenu from '@/components/layout/PortalMenu'
import {getProjects} from '@/sanity/lib/projects'
import type {ProjectListItem} from '@/sanity/types'

export default function Work({projects}: {projects: ProjectListItem[]}) {
  return (
    <>
      <MetaDataHeader title="Work" />
      <PortalMenu />
      <Grid posts={projects} />
      <Footer />
    </>
  )
}

export async function getStaticProps() {
  try {
    const projects = await getProjects()

    return {
      props: {
        projects,
      },
      revalidate: 3600,
    }
  } catch (error) {
    console.error('Failed to fetch Sanity projects for work page', error)

    return {
      props: {
        projects: [],
      },
      revalidate: 60,
    }
  }
}
