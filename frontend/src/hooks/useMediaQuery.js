import { useEffect, useState } from 'react'

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const m = window.matchMedia(query)
    const handler = (e) => setMatches(e.matches)
    setMatches(m.matches)
    m.addEventListener?.('change', handler)
    return () => m.removeEventListener?.('change', handler)
  }, [query])

  return matches
}
