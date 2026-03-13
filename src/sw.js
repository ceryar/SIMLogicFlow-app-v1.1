import { precacheAndRoute } from 'workbox-precaching';

// Inyectar el manifiesto de precarga de Vite
precacheAndRoute(self.__WB_MANIFEST);

/**
 * SimLogicFlow — Service Worker v3 (Adaptado para Workbox/VitePWA)
 * 
 * Este SW combina la potencia de Workbox para assets estáticos
 * con la lógica personalizada para la API (claves de caché sin headers).
 */

const CACHE_VERSION = 'slf-v3';
const CACHE_CATALOG = `${CACHE_VERSION}-catalog`;
const CACHE_DYNAMIC = `${CACHE_VERSION}-dynamic`;
const CACHE_NAVIGATION = `${CACHE_VERSION}-navigation`;

const TTL_CATALOG = 24 * 60 * 60 * 1000;  // 24 h
const TTL_DYNAMIC = 2 * 60 * 60 * 1000;  //  2 h
const NETWORK_TIMEOUT_MS = 15000;         // 15 s

// ── Patrones de URL ────────────────────────────────────────────────────────────
const RE_AUTH = /\/api\/v1\/auth\//;
const RE_CATALOG = /\/api\/v1\/(courses|simulators|rooms|roles|maintenance-types)(\/|$|\?)/;
const RE_DYNAMIC = /\/api\/v1\/(users|pro-courses|maintenances|maintenance-history)(\/|$|\?)/;
const RE_API = /\/api\/v1\//;

// ─────────────────────────────────────────────────────────────────────────────
// CLAVE DE CACHÉ — SOLO LA URL
// ─────────────────────────────────────────────────────────────────────────────
function cacheKey(request) {
    return request.url;
}

// ── Helper: respuesta offline JSON ────────────────────────────────────────────
function offlineFallback(pathname) {
    const labels = {
        users: 'usuarios', courses: 'cursos', simulators: 'simuladores',
        rooms: 'aulas', roles: 'roles', 'maintenance-types': 'tipos de mantenimiento',
        'pro-courses': 'programaciones', maintenances: 'mantenimientos',
        'maintenance-history': 'historial',
    };
    const segment = pathname.split('/')[3] || '';
    const label = labels[segment] || 'datos';
    return new Response(
        JSON.stringify({ offline: true, message: `Sin conexión — ${label} no disponibles` }),
        {
            status: 503, statusText: 'Offline',
            headers: { 'Content-Type': 'application/json', 'X-Offline': 'true' }
        }
    );
}

// ── Guardar respuesta ─────────────────────────────────────────────────────────
async function saveToCache(cacheName, request, response) {
    if (!response || (!response.ok && response.status !== 0)) return;
    try {
        const cache = await caches.open(cacheName);
        const key = cacheKey(request);
        if (response.status === 0) {
            await cache.put(key, response.clone());
            return;
        }
        const body = await response.clone().arrayBuffer();
        const headers = new Headers(response.headers);
        headers.set('X-Cache-Time', String(Date.now()));
        const cached = new Response(body, { status: response.status, statusText: response.statusText, headers });
        await cache.put(key, cached);
    } catch (e) {
        console.warn('[SW] No se pudo guardar en caché:', e);
    }
}

// ── Leer desde caché ──────────────────────────────────────────────────────────
async function readFromCache(cacheName, request) {
    const cache = await caches.open(cacheName);
    return cache.match(cacheKey(request), { ignoreVary: true });
}

function isExpired(cachedRes, ttlMs) {
    if (!cachedRes) return true;
    const t = Number(cachedRes.headers.get('X-Cache-Time') || 0);
    return (Date.now() - t) > ttlMs;
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCH — enrutador principal
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    if (request.method !== 'GET') return;

    // Solo interceptamos API — los assets los maneja workbox.precacheAndRoute arriba
    if (RE_API.test(url.pathname)) {
        if (RE_AUTH.test(url.pathname)) return;

        if (RE_CATALOG.test(url.pathname)) {
            event.respondWith(staleWhileRevalidate(request, CACHE_CATALOG, TTL_CATALOG));
            return;
        }
        if (RE_DYNAMIC.test(url.pathname)) {
            event.respondWith(networkFirst(request, CACHE_DYNAMIC, TTL_DYNAMIC));
            return;
        }
        event.respondWith(networkFirst(request, CACHE_DYNAMIC, TTL_DYNAMIC));
        return;
    }

    // Navegación SPA: Si falla red, buscamos index.html en el caché de precarga
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(async () => {
                const cache = await caches.open(CACHE_NAVIGATION);
                return (await caches.match('/index.html')) || new Response('Offline', { status: 503 });
            })
        );
    }
});

// ── Estrategias API ──────────────────────────────────────────────────────────

async function staleWhileRevalidate(request, cacheName, ttlMs) {
    const cached = await readFromCache(cacheName, request);
    const networkPromise = fetch(request.clone())
        .then(res => { if (res.ok) saveToCache(cacheName, request, res.clone()); return res; })
        .catch(() => null);

    if (cached && !isExpired(cached, ttlMs)) return cached.clone();
    try {
        const netRes = await networkPromise;
        if (netRes) return netRes;
    } catch { }
    return (cached && cached.clone()) || offlineFallback(new URL(request.url).pathname);
}

async function networkFirst(request, cacheName, ttlMs) {
    return new Promise(resolve => {
        let done = false;
        const timer = setTimeout(async () => {
            if (!done) {
                done = true;
                const cached = await readFromCache(cacheName, request);
                resolve(cached ? cached.clone() : offlineFallback(new URL(request.url).pathname));
            }
        }, NETWORK_TIMEOUT_MS);

        fetch(request.clone())
            .then(res => {
                clearTimeout(timer);
                if (!done) {
                    done = true;
                    if (res.ok || res.status === 0) saveToCache(cacheName, request, res.clone());
                    resolve(res);
                }
            })
            .catch(async () => {
                clearTimeout(timer);
                if (!done) {
                    done = true;
                    const cached = await readFromCache(cacheName, request);
                    resolve(cached ? cached.clone() : offlineFallback(new URL(request.url).pathname));
                }
            });
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// MENSAJES
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('message', event => {
    const data = event.data;
    if (!data) return;

    switch (data.type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;

        case 'WARM_UP_CACHE':
            // La pre-carga la dispara usePWA.js vía axios.get()
            // El SW simplemente confirma que escuchó el mensaje
            console.log('[SW] Recibida señal de pre-carga (Warm Up)');
            break;
    }
});
