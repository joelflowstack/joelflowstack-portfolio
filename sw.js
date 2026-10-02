/**
 * JOEL FLOWSTACK — sw.js
 * Only job: when a page navigation fails because there's no network,
 * serve the branded offline page instead of the browser's own
 * network-error interstitial (where the default dinosaur game lives).
 * Online requests are never altered — every navigation tries the
 * network first, and this only kicks in on an actual failure.
 *
 * CACHE FRESHNESS: the offline page used to be cached once at install
 * and never refreshed, so visitors kept seeing whatever version they
 * first loaded. Now (1) bumping CACHE_NAME below makes the browser
 * reinstall and drop old caches, and (2) the cached copy is quietly
 * re-fetched after the first successful navigation each time the worker
 * wakes up, so deploying a new offline.html propagates on its own.
 *
 * Real limitation, not a bug: this only works AFTER the worker has
 * installed once on a working connection. Someone who has never loaded
 * the site before going offline still sees the browser's default page.
 */
const CACHE_NAME = "flow-offline-v2";
const OFFLINE_URL = "/offline";
let refreshedThisRun = false;

async function cacheOfflinePage() {
  const res = await fetch(new Request(OFFLINE_URL, { cache: "reload" }));
  if (!res.ok) throw new Error("offline page fetch failed: " + res.status);
  const cache = await caches.open(CACHE_NAME);
  await cache.put(OFFLINE_URL, res);
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(cacheOfflinePage());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith("flow-offline-") && k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  // Only page navigations — never CSS/JS/image/API requests.
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (!refreshedThisRun) {
          refreshedThisRun = true;
          event.waitUntil(cacheOfflinePage().catch(() => { refreshedThisRun = false; }));
        }
        return res;
      })
      .catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(OFFLINE_URL)) ||
          new Response("You're offline.", { status: 503, headers: { "Content-Type": "text/plain" } });
      })
  );
});
