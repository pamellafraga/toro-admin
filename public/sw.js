/// Service worker mínimo para instalação PWA (atalho na tela inicial).
const CACHE = "xpress-dashboard-v1"

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(["/", "/icon.png", "/icons/icon-192.png", "/icons/icon-512.png"]),
    ),
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
    ),
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request).then((r) => r || caches.match("/"))),
  )
})
