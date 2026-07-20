import type {MutableRefObject} from 'react'
import type {ProjectListItem} from '@/sanity/types'

export type MatterState =
  | 'origin'
  | 'nexus'
  | 'machine'
  | 'signal'
  | 'portal'
  | 'tarot'

export type MatterChapter = {
  id: string
  index: string
  eyebrow: string
  title: string
  description: string
  state: MatterState
  project?: ProjectListItem
  href?: string
  external?: boolean
  materialLabel: string
}

export type MatterPointer = {
  x: number
  y: number
  active: number
}

export type MatterMotionRefs = {
  progress: MutableRefObject<number>
  velocity: MutableRefObject<number>
  pointer: MutableRefObject<MatterPointer>
}

export type MatterRendererStatus = {
  phase: 'idle' | 'initializing' | 'ready' | 'error'
  backend: 'WEBGPU' | 'WEBGL2' | 'STATIC'
  particleCount: number
  detail: string
}
