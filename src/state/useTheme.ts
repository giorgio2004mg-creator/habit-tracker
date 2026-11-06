import { useEffect } from 'react'
import type { ThemePref } from '../types'

export const THEME_KEY = 'habit-tracker:theme'

/** Applica la classe `dark` a <html> seguendo la preferenza (o il sistema). */
export function useApplyTheme(pref: ThemePref) {
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = pref === 'dark' || (pref === 'system' && media.matches)
      document.documentElement.classList.toggle('dark', dark)
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0f0f0e' : '#e8e8e3')
    }
    apply()
    // Copia locale letta da index.html prima del caricamento dei dati, per evitare il lampo di tema
    try {
      localStorage.setItem(THEME_KEY, pref)
    } catch {
      // storage non disponibile: pazienza, solo un lampo all'avvio
    }
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [pref])
}
