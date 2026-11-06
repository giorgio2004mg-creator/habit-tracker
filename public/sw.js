// Service worker: tiene in cache l'app così si apre anche senza connessione.
// I dati (Supabase) non passano da qui: li gestisce l'app con la sua coda offline.

const CACHE = 'abitudini-v2'
const SHELL = ['/', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png']

const put = (key, response) => caches.open(CACHE).then((cache) => cache.put(key, response))

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    // Prima la rete, così si vede sempre l'ultima versione; offline la pagina salvata
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) put('/', response.clone())
          return response
        })
        .catch(() => caches.match('/')),
    )
    return
  }

  // File statici (con hash nel nome, quindi immutabili): prima la cache
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) put(request, response.clone())
          return response
        }),
    ),
  )
})
