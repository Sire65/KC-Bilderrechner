// Build V0.31.3.6 Repair 11 / Schulungsintegration V0.27.1
const CACHE="kc-bildrechner-v0-31-3-6-repair-11-training-0271";
const ASSETS=["./","./index.html","./styles.css","./app.js","./training-demo-bridge.js","./version-manifest.json","./cores/adaptive-layout-core/adaptive-layout-core.js","./manifest.webmanifest","./assets/logo.png","./sounds/kassenton.mp3","../pc-manager/vendor/qrcode-generator.js","../shared/runtime-flags.js","../cores/notification-core/notification-core.js","../cores/product-info-core/product-info-core.js","../cores/security-core/security-core.js","../cores/audit-core/audit-core.js","../cores/health-core/health-core.js","../cores/message-core/message-core.js","../cores/sound-core/sound-core.js","../exchange-core-v31/exchange-filter.js"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET"||new URL(e.request.url).origin!==self.location.origin)return;
  e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(resp=>{
    if(!resp||resp.status!==200||resp.type!=="basic")return resp;
    const copy=resp.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return resp;
  }).catch(()=>e.request.mode==="navigate"?caches.match("./index.html"):Response.error())));
});
