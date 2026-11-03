import { useEffect } from 'react'
import type { ThemePref } from '../types'

/** Applica la classe `dark` a <html> seguendo la preferenza (o il sistema). */
export function useApplyTheme(pref: ThemePref) {
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = pref === 'dark' || (pref === 'system' && media.matches)
      document.documentElement.classList.toggle('dark', dark)
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b1120' : '#f8fafc')
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [pref])
}
