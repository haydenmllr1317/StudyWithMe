const STATIC_CACHE="studywithme-static-v3";
const OFFLINE_URL="/offline.html";
const PRECACHE=[OFFLINE_URL,"/app-icon-192.png","/app-icon-512.png","/apple-touch-icon.png"];
self.addEventListener("install",event=>event.waitUntil(caches.open(STATIC_CACHE).then(cache=>cache.addAll(PRECACHE))));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==STATIC_CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener("message",event=>{if(event.data?.type==="SKIP_WAITING")self.skipWaiting()});
self.addEventListener("fetch",event=>{const request=event.request;if(request.method!=="GET")return;const url=new URL(request.url);if(url.origin!==self.location.origin)return;if(request.mode==="navigate"){event.respondWith(fetch(request).catch(()=>caches.match(OFFLINE_URL)));return}const isVersionedAsset=url.pathname.startsWith("/_next/static/");const isPrecachedAsset=PRECACHE.includes(url.pathname);if(isVersionedAsset||isPrecachedAsset){event.respondWith(caches.match(request).then(hit=>hit||fetch(request).then(response=>{if(!response.ok||response.type!=="basic")return response;const copy=response.clone();return caches.open(STATIC_CACHE).then(cache=>cache.put(request,copy)).then(()=>response)})));}});
