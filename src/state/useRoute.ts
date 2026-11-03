import { useEffect, useState } from 'react'

export const ROUTES = ['oggi', 'calendario', 'statistiche', 'abitudini', 'impostazioni'] as const
export type Route = (typeof ROUTES)[number]

const parse = (): Route => {
  const r = window.location.hash.replace(/^#\/?/, '')
  return (ROUTES as readonly string[]).includes(r) ? (r as Route) : 'oggi'
}

/** Router minimale basato sull'hash: funziona anche su hosting statico. */
export function useRoute(): Route {
  const [route, setRoute] = useState(parse)
  useEffect(() => {
    const onChange = () => {
      setRoute(parse())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
