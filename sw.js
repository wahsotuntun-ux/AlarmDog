// Keeps Pet Buddy working offline.
// App files: try the network first so updates show up, fall back to the cache.
// p5.js from the CDN: use the cached copy first, since that version never changes.

const CACHE = "pet-buddy-v1";
const P5_URL = "https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.11.1/p5.min.js";

const APP_FILES = [
  "./",
  "./index.html",
  "./sketch.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  P5_URL,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Leave audio and anything other than GET to the browser.
  if (request.method !== "GET" || request.destination === "audio") return;

  if (request.url === P5_URL) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request))
  );
});
