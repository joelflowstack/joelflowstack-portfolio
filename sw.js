/**
 * JOEL FLOWSTACK — sw.js
 * Only job: when a page navigation fails because there's no network,
 * serve offline.html (cached at install time) instead of letting the
 * browser show its own network-error interstitial — which is exactly
 * where the default dinosaur game lives. This never touches normal
 * online requests; every fetch tries the network first and this only
 * ever kicks in on an actual failure.
 *
 * Real limitation, not a bug: this can only work AFTER the service
 * worker has installed once on a working connection. Someone who has
 * literally never loaded the site before going offline will still see
 * the browser's own default page the very first time — there's no way
 * around that, a service worker can't be installed without a first
 * successful visit.
 */
const CACHE_NAME = "flow-offline-v1";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Only intercept actual page navigations (clicking a link, typing a
  // URL, reloading) — never CSS/JS/image/API requests, which should
  // simply fail normally if offline rather than being swapped for a
  // full HTML page.
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(OFFLINE_URL))
  );
});
