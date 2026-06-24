import {client} from './client'
import {projectBySlugQuery, projectNavQuery, projectSlugsQuery, projectsQuery} from './queries'
import type {Project, ProjectListItem, ProjectNavItem} from '../types'

export function getProjects() {
  return client.fetch<ProjectListItem[]>(projectsQuery)
}

export function getProjectBySlug(slug: string) {
  return client.fetch<Project | null>(projectBySlugQuery, {slug})
}

export function getProjectSlugs() {
  return client.fetch<{slug: string}[]>(projectSlugsQuery)
}

export function getProjectNavigation() {
  return client.fetch<ProjectNavItem[]>(projectNavQuery)
}
