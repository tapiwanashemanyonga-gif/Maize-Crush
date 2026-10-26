const CACHE_NAME="maize-crush-v2";
const APP_SHELL=["./","./index.html","./styles.css","./game.js","./manifest.webmanifest","./icon.svg"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(APP_SHELL)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{const r=e.request;if(r.method!=="GET")return;const u=new URL(r.url);if(u.origin!==self.location.origin)return;e.respondWith(caches.match(r).then(hit=>hit||fetch(r).then(res=>{if(res&&res.ok&&res.type==="basic"){const cp=res.clone();caches.open(CACHE_NAME).then(c=>c.put(r,cp))}return res}).catch(()=>caches.match("./index.html"))))});
