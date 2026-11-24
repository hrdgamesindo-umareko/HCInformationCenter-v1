/**
 * Service Worker PWA — cache shell agar aplikasi bisa dibuka offline.
 * Strategi:
 * - Aset statis (halaman, css, js, ikon): cache-first lalu update di background.
 * - Request ke Google Apps Script: SELALU network (data harus segar).
 */
var CACHE_NAME = 'hc-info-v1';
var SHELL_ASSETS = [
  'index.html',
  'admin.html',
  'css/style.css',
  'js/config.js',
  'js/api.js',
  'js/app.js',
  'js/admin.js',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(SHELL_ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) {
        return k !== CACHE_NAME;
      }).map(function (k) { return caches.delete(k); }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var url = new URL(event.request.url);

  // Data API: selalu jaringan, jangan di-cache.
  if (url.hostname.indexOf('script.google.com') >= 0 ||
      url.hostname.indexOf('googleusercontent.com') >= 0) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Aset statis: cache-first.
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then(function (cached) {
        var network = fetch(event.request).then(function (response) {
          if (response && response.status === 200 && url.origin === self.location.origin) {
            var copy = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(event.request, copy);
            });
          }
          return response;
        }).catch(function () {
          return cached || Response.error();
        });
        return cached || network;
      })
    );
  }
});
