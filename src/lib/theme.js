import { useEffect, useState } from 'react'

const THEME_KEY = 'agentic-newsroom:theme'
const media = () => window.matchMedia('(prefers-color-scheme: light)')

export const resolveTheme = (pref) => (pref === 'system' ? (media().matches ? 'light' : 'dark') : pref)

/** Theme preference ('light' | 'dark' | 'system'), applied as <html data-theme>. */
export function useTheme() {
  const [pref, setPref] = useState(() => localStorage.getItem(THEME_KEY) || 'system')

  useEffect(() => {
    const root = document.documentElement
    const apply = () => {
      // Animate colors only during an explicit switch, never on first paint.
      root.classList.add('theme-switching')
      root.dataset.theme = resolveTheme(pref)
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', root.dataset.theme === 'light' ? '#f4f4f1' : '#08090d')
      clearTimeout(apply.t)
      apply.t = setTimeout(() => root.classList.remove('theme-switching'), 350)
    }
    apply()
    localStorage.setItem(THEME_KEY, pref)
    if (pref !== 'system') return
    const mq = media()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [pref])

  return [pref, setPref]
}
