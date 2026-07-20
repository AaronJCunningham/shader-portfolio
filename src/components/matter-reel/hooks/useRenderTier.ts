import {useEffect, useState} from 'react'

type NavigatorWithHints = Navigator & {
  connection?: {
    saveData?: boolean
  }
}

export type MatterRenderMode = 'pending' | 'animated' | 'static'

export function useMatterRenderMode() {
  const [renderMode, setRenderMode] = useState<MatterRenderMode>('pending')

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const navigatorWithHints = window.navigator as NavigatorWithHints

    const updatePreference = () => {
      setRenderMode(
        motionQuery.matches || navigatorWithHints.connection?.saveData === true
          ? 'static'
          : 'animated',
      )
    }

    updatePreference()
    motionQuery.addEventListener('change', updatePreference)

    return () => motionQuery.removeEventListener('change', updatePreference)
  }, [])

  return renderMode
}
