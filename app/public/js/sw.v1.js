// Service Worker for My FYI
// Cache versioning strategy: Update version number to force cache invalidation

const CACHE_VERSION = "myfyi-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/css/tailwind.v1.css",
  "/js/dashboard.v1.js",
  "/manifest.json",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }),
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_VERSION) {
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Don't cache non-GET requests
  if (request.method !== "GET") {
    return event.respondWith(fetch(request));
  }

  // Skip API calls (they'll use HTTP cache headers)
  if (request.url.includes("/api/")) {
    return event.respondWith(fetch(request));
  }

  // Cache-first strategy for static assets
  event.respondWith(
    caches.match(request).then((response) => {
      if (response) {
        return response;
      }

      return fetch(request).then((response) => {
        // Cache new responses
        if (response.status === 200) {
          const clonedResponse = response.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(request, clonedResponse);
          });
        }
        return response;
      });
    }),
  );
});

// Message handler for cache invalidation
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
