import { useEffect, useState } from 'react'

const storageKey = 'portfolio-idle-motion'

function savedChoice(): boolean | null {
  try {
    const value = localStorage.getItem(storageKey)
    return value === 'on' ? true : value === 'off' ? false : null
  } catch {
    return null
  }
}

export default function useIdleMotion() {
  const [choice, setChoice] = useState(savedChoice)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  const enabled = choice ?? !reducedMotion
  const toggle = () => {
    const next = !enabled
    setChoice(next)
    try {
      localStorage.setItem(storageKey, next ? 'on' : 'off')
    } catch {
      // The control still works for this visit when storage is unavailable.
    }
  }

  return { enabled, toggle }
}
