const CACHE_PREFIX = "japan-trip-2026-2027-";
const CACHE_NAME = `${CACHE_PREFIX}__BUILD_VERSION__`;
const ROOT = new URL("./", self.location.href).href;
const APP_SHELL = [ROOT, new URL("manifest.webmanifest", ROOT).href, new URL("icons/icon.svg", ROOT).href];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    const html = await (await cache.match(ROOT)).text();
    const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((match) => new URL(match[1], ROOT).href);
    await cache.addAll(assets);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  // Firebase/Google and other apps sharing this origin bypass our cache.
  if (request.method !== "GET" || url.origin !== self.location.origin || !url.href.startsWith(ROOT) || url.pathname.endsWith("/version.json")) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (request.mode !== "navigate" && cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request.mode === "navigate" ? ROOT : request, response.clone());
      return response;
    } catch (error) {
      const fallback = cached || (request.mode === "navigate" ? await cache.match(ROOT) : undefined);
      if (fallback) return fallback;
      throw error;
    }
  })());
});
