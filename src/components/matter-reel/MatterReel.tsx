import dynamic from 'next/dynamic'
import Link from 'next/link'
import {useCallback, useMemo, useRef, useState} from 'react'
import type {CSSProperties} from 'react'
import type {ProjectListItem} from '@/sanity/types'
import {createMatterChapters} from './matterReel.config'
import {useMatterScroll} from './hooks/useMatterScroll'
import {useMatterRenderMode} from './hooks/useRenderTier'
import type {MatterRendererStatus} from './types'

const MatterReelCanvas = dynamic(() => import('./MatterReelCanvas'), {
  ssr: false,
})

type MatterReelProps = {
  projects: ProjectListItem[]
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

const initialStatus: MatterRendererStatus = {
  phase: 'idle',
  backend: 'WEBGPU',
  particleCount: 0,
  detail: 'PREPARING',
}

export default function MatterReel({projects}: MatterReelProps) {
  const rootRef = useRef<HTMLElement>(null)
  const chapters = useMemo(() => createMatterChapters(projects), [projects])
  const renderMode = useMatterRenderMode()
  const [rendererUnavailable, setRendererUnavailable] = useState(false)
  const isStatic = renderMode === 'static' || rendererUnavailable
  const isInteractive = renderMode === 'animated' && !rendererUnavailable
  const {refs, displayProgress, activeIndex, scrollToChapter} = useMatterScroll(
    rootRef,
    chapters.length,
    !isInteractive,
  )
  const [rendererStatus, setRendererStatus] = useState(initialStatus)
  const updateRendererStatus = useCallback((status: MatterRendererStatus) => {
    if (status.phase === 'error') setRendererUnavailable(true)
    setRendererStatus(status)
  }, [])

  const activeChapter = chapters[activeIndex]
  const progress = clamp(displayProgress / Math.max(1, chapters.length - 1), 0, 1)
  const isLoading =
    !isStatic &&
    (renderMode === 'pending' ||
      rendererStatus.phase === 'idle' ||
      rendererStatus.phase === 'initializing')
  const rendererFailed = rendererStatus.phase === 'error'
  const trackHeight = `${100 + (chapters.length - 1) * 80}dvh`

  return (
    <main
      ref={rootRef}
      className={`matter-reel ${isStatic ? 'matter-reel--static' : ''} ${
        rendererFailed ? 'matter-reel--renderer-error' : ''
      }`}
      data-state={activeChapter.state}
      tabIndex={isStatic ? undefined : 0}
      aria-label={isStatic ? undefined : 'Interactive project reel'}
    >
      <Link className="matter-reel__skip" href="/work">
        Skip experience / view all work
      </Link>

      <div
        className="matter-reel__track"
        style={{height: isStatic ? undefined : trackHeight}}
      >
        <div className="matter-reel__snap-points" aria-hidden="true">
          {chapters.map((chapter, index) => (
            <span key={chapter.id} style={{top: `${index * 80}dvh`}} />
          ))}
        </div>
        <div className="matter-reel__stage">
        <div className="matter-reel__visual" aria-hidden="true">
          {isInteractive && (
            <MatterReelCanvas
              motion={refs}
              disabled={false}
              onStatus={updateRendererStatus}
            />
          )}
          <div className="matter-reel__aurora" />
          <div className="matter-reel__grid" />
          <div className="matter-reel__vignette" />
        </div>

        <div
          className={`matter-reel__loader ${isLoading ? '' : 'matter-reel__loader--hidden'}`}
          aria-hidden={!isLoading}
        >
          <span className="matter-reel__loader-mark" />
          <span>Allocating persistent matter</span>
        </div>

        <header className="matter-reel__masthead">
          <div className="matter-reel__brand">
            <span>AJC</span>
            <span>LEAD FULL-STACK DEVELOPER / CREATIVE TECHNOLOGIST</span>
          </div>
          <div className="matter-reel__live-status">
            <span className="matter-reel__status-dot" />
            <span>
              {rendererStatus.backend} {rendererStatus.backend !== 'STATIC' ? '/ TSL' : ''}
            </span>
          </div>
        </header>

        <div className="matter-reel__mobile-chapter-meta" aria-hidden="true">
          <span>{activeChapter.index}</span>
          <span>{activeChapter.eyebrow}</span>
        </div>

        <div className="matter-reel__chapters">
          {chapters.map((chapter, index) => {
            const isActive = index === activeIndex
            const chapterStyle = {
              '--matter-opacity': isActive ? 1 : 0,
              '--matter-translate': isActive
                ? '0px'
                : `${index < activeIndex ? -18 : 18}px`,
              '--matter-blur': isActive ? '0px' : '3px',
            } as CSSProperties

            return (
              <article
                key={chapter.id}
                className={`matter-reel__chapter matter-reel__chapter--${chapter.state} ${
                  isActive ? 'matter-reel__chapter--active' : ''
                }`}
                style={chapterStyle}
                aria-hidden={!isActive}
              >
                <div className="matter-reel__chapter-meta">
                  <span>{chapter.index}</span>
                  <span>{chapter.eyebrow}</span>
                </div>
                {index === 0 ? (
                  <h1 className="matter-reel__title">{chapter.title}</h1>
                ) : (
                  <h2 className="matter-reel__title">{chapter.title}</h2>
                )}
                <p className="matter-reel__description">{chapter.description}</p>
                <div className="matter-reel__chapter-actions">
                  {chapter.href ? (
                    <Link
                      className="matter-reel__project-link"
                      href={chapter.href}
                      tabIndex={isActive ? 0 : -1}
                      aria-label={`Open ${chapter.title} case study`}
                      target={chapter.external ? '_blank' : undefined}
                      rel={chapter.external ? 'noopener noreferrer' : undefined}
                    >
                      Open case study <span aria-hidden="true">↗</span>
                    </Link>
                  ) : (
                    <button
                      className="matter-reel__project-link"
                      type="button"
                      tabIndex={isActive ? 0 : -1}
                      onClick={() => scrollToChapter(Math.min(index + 1, chapters.length - 1))}
                    >
                      {index === 0 ? 'Enter the field' : 'See selected systems'}{' '}
                      <span aria-hidden="true">↓</span>
                    </button>
                  )}
                  {index === chapters.length - 1 && (
                    <Link
                      className="matter-reel__all-work"
                      href="/work"
                      tabIndex={isActive ? 0 : -1}
                    >
                      View all work
                    </Link>
                  )}
                </div>
              </article>
            )
          })}
        </div>

        <nav className="matter-reel__rail" aria-label="Matter Reel chapters">
          {chapters.map((chapter, index) => {
            const visited = displayProgress >= index - 0.05
            return (
              <button
                key={chapter.id}
                className={`matter-reel__rail-point ${
                  index === activeIndex ? 'matter-reel__rail-point--active' : ''
                } ${visited ? 'matter-reel__rail-point--visited' : ''}`}
                type="button"
                onClick={() => scrollToChapter(index)}
                aria-label={`Go to ${chapter.title}`}
                aria-current={index === activeIndex ? 'step' : undefined}
              >
                <span />
              </button>
            )
          })}
        </nav>

        <div className="matter-reel__telemetry" aria-hidden="true">
          <span>{activeChapter.materialLabel}</span>
          <span>
            {rendererStatus.particleCount > 0
              ? `${rendererStatus.particleCount.toLocaleString('en-US')} BODIES`
              : rendererStatus.detail}
          </span>
        </div>

        <div className="matter-reel__progress" aria-hidden="true">
          <span style={{transform: `scaleX(${progress})`}} />
        </div>

        <div
          className={`matter-reel__scroll-cue ${displayProgress > 0.22 ? 'matter-reel__scroll-cue--hidden' : ''}`}
          aria-hidden="true"
        >
          <span>SCROLL TO APPLY ENERGY</span>
          <i />
        </div>
        </div>
      </div>

      <section className="matter-reel__static-list" aria-label="Featured projects">
        <div className="matter-reel__static-intro">
          <span>{'// THE MATTER REEL'}</span>
          <h1>Selected work</h1>
          <p>
            Lightweight experience active. Every featured project remains available
            below.
          </p>
        </div>
        {chapters
          .filter((chapter) => chapter.href)
          .map((chapter) => (
            <article className="matter-reel__static-card" key={chapter.id}>
              <div>
                <span>{chapter.index}</span>
                <span>{chapter.materialLabel}</span>
              </div>
              <h2>{chapter.title}</h2>
              <p>{chapter.description}</p>
              <Link
                href={chapter.href || '/work'}
                target={chapter.external ? '_blank' : undefined}
                rel={chapter.external ? 'noopener noreferrer' : undefined}
              >
                Open case study ↗
              </Link>
            </article>
          ))}
        <Link className="matter-reel__static-all" href="/work">
          View all work
        </Link>
      </section>
    </main>
  )
}
