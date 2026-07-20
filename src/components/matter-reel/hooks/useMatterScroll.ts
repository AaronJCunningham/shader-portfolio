import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import type {RefObject} from 'react'
import type {MatterMotionRefs} from '../types'

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

const settleChapterProgress = (value: number, max: number) => {
  const chapter = Math.floor(value)
  const localProgress = value - chapter

  if (localProgress <= 0.06) return chapter
  if (localProgress >= 0.94) return Math.min(chapter + 1, max)
  return value
}

export function useMatterScroll(
  rootRef: RefObject<HTMLElement>,
  chapterCount: number,
  isStatic: boolean,
) {
  const progress = useRef(0)
  const velocity = useRef(0)
  const pointer = useRef({x: 0, y: 0, active: 0})
  const previousProgress = useRef(0)
  const previousTime = useRef(0)
  const activeIndexRef = useRef(0)
  const scrollableDistance = useRef(1)
  const [activeIndex, setActiveIndex] = useState(0)

  const updateScrollMetrics = useCallback(() => {
    const root = rootRef.current
    if (!root) return

    scrollableDistance.current = Math.max(1, root.scrollHeight - root.clientHeight)
  }, [rootRef])

  useEffect(() => {
    if (isStatic) {
      if (rootRef.current) rootRef.current.scrollTop = 0
      progress.current = 0
      velocity.current = 0
      previousProgress.current = 0
      activeIndexRef.current = 0
      setActiveIndex(0)
      rootRef.current?.style.setProperty('--matter-progress', '0')
      rootRef.current?.removeAttribute('data-scrolled')
      return
    }

    let animationFrame = 0
    let resizeObserver: ResizeObserver | null = null
    previousTime.current = performance.now()
    updateScrollMetrics()

    const root = rootRef.current
    if (root) {
      resizeObserver = new ResizeObserver(updateScrollMetrics)
      resizeObserver.observe(root)
      window.addEventListener('resize', updateScrollMetrics, {passive: true})
    }

    const sample = (now: number) => {
      const scrollRoot = rootRef.current
      if (scrollRoot) {
        const normalized = clamp(
          scrollRoot.scrollTop / scrollableDistance.current,
          0,
          1,
        )
        const maxProgress = chapterCount - 1
        const nextProgress = settleChapterProgress(normalized * maxProgress, maxProgress)
        const elapsed = Math.max((now - previousTime.current) / 1000, 1 / 120)
        const instantaneousVelocity = clamp(
          (nextProgress - previousProgress.current) / elapsed,
          -8,
          8,
        )

        progress.current = nextProgress
        velocity.current += (instantaneousVelocity - velocity.current) * 0.18
        velocity.current *= 0.9

        previousProgress.current = nextProgress
        previousTime.current = now

        const nextActiveIndex = clamp(
          Math.round(nextProgress),
          0,
          chapterCount - 1,
        )
        const visualProgress = clamp(nextProgress / Math.max(1, maxProgress), 0, 1)

        scrollRoot.style.setProperty('--matter-progress', visualProgress.toFixed(4))
        if (nextProgress > 0.22) scrollRoot.dataset.scrolled = 'true'
        else scrollRoot.removeAttribute('data-scrolled')

        if (nextActiveIndex !== activeIndexRef.current) {
          activeIndexRef.current = nextActiveIndex
          setActiveIndex(nextActiveIndex)
        }
      }

      animationFrame = window.requestAnimationFrame(sample)
    }

    animationFrame = window.requestAnimationFrame(sample)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updateScrollMetrics)
    }
  }, [chapterCount, isStatic, rootRef, updateScrollMetrics])

  useEffect(() => {
    if (isStatic) {
      pointer.current.active = 0
      return
    }

    const handlePointerMove = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = -(event.clientY / window.innerHeight) * 2 + 1
      pointer.current.active = event.pointerType === 'touch' ? 0.55 : 1
    }

    const handlePointerLeave = () => {
      pointer.current.active = 0
    }

    window.addEventListener('pointermove', handlePointerMove, {passive: true})
    document.documentElement.addEventListener('pointerleave', handlePointerLeave)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      document.documentElement.removeEventListener('pointerleave', handlePointerLeave)
    }
  }, [isStatic])

  const scrollToChapter = useCallback(
    (index: number) => {
      const root = rootRef.current
      if (!root) return

      updateScrollMetrics()
      const normalized = clamp(index / Math.max(1, chapterCount - 1), 0, 1)
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      root.scrollTo({
        top: scrollableDistance.current * normalized,
        behavior: reduceMotion ? 'auto' : 'smooth',
      })
    },
    [chapterCount, rootRef, updateScrollMetrics],
  )

  const refs = useMemo<MatterMotionRefs>(
    () => ({progress, velocity, pointer}),
    [],
  )

  return {
    refs,
    activeIndex,
    scrollToChapter,
  }
}
