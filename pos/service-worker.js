// Build V0.31.3.6 Repair 11 / KC Local Vault V1 / Dual Gateway V1.0.1 / Deep Audit 2
const CACHE="kc-bildrechner-v0-31-3-6-r11-security-deep-audit-v2";
const ASSETS=[
  "./","./index.html","./styles.css","./app.js","./local-vault-bootstrap.js","./vault-app-loader.js","./dual-gateway-bootstrap.js","./kcb-exchange-auth-bootstrap.js","./training-demo-bridge.js","./version-manifest.json","./cores/adaptive-layout-core/adaptive-layout-core.js","./manifest.webmanifest","./assets/logo.png","./sounds/kassenton.mp3",
  "../pc-manager/vendor/qrcode-generator.js","../shared/runtime-flags.js","../cores/notification-core/notification-core.js","../cores/product-info-core/product-info-core.js","../cores/security-core/security-core.js","../cores/security-core/crypto-secure-sync.js","../cores/audit-core/audit-core.js","../cores/health-core/health-core.js","../cores/message-core/message-core.js","../cores/sound-core/sound-core.js","../cores/dom-safety-core/dom-safety-core.js","../cores/transaction-integrity-core/transaction-integrity-core.js","../cores/cash-transfer-auth-core/cash-transfer-auth-core.js","../exchange-core-v31/exchange-filter.js","../exchange-core-v31/exchange-auth.js"
];
const APP_TAG='<script src="app.js?build=0.31.3.6-r11"></script>\n<script src="training-demo-bridge.js?build=0.27.0"></script>';
const VAULT_TAG='<script src="local-vault-bootstrap.js?build=1.0.1"></script>\n<script src="vault-app-loader.js?build=1.0.0"></script>';
const NOTIFY_TAG='<script src="../cores/notification-core/notification-core.js"></script>';
const DUAL_NOTIFY_TAG='<script src="dual-gateway-bootstrap.js?build=1.0.1"></script>\n'+NOTIFY_TAG;
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil((async()=>{
  const keys=await caches.keys();await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim();
  const clients=await self.clients.matchAll({type:"window",includeUncontrolled:true});
  for(const client of clients){try{const u=new URL(client.url);if(u.origin===self.location.origin&&/\/pos\/?(?:index\.html)?$/.test(u.pathname))await client.navigate(client.url)}catch{}}
})()));
async function baseResponse(request){
  try{const network=await fetch(request);if(network&&network.status===200&&network.type==="basic"){const copy=network.clone();caches.open(CACHE).then(c=>c.put(request,copy));return network}}catch{}
  return (await caches.match(request))||(request.mode==="navigate"?await caches.match("./index.html"):null);
}
async function navigationResponse(request){
  const response=await baseResponse(request);if(!response)return Response.error();
  const type=response.headers.get("content-type")||"";if(!type.includes("text/html"))return response;
  let html=await response.text();
  if(!html.includes('dual-gateway-bootstrap.js'))html=html.replace(NOTIFY_TAG,DUAL_NOTIFY_TAG);
  if(html.includes(APP_TAG))html=html.replace(APP_TAG,VAULT_TAG);
  else if(!html.includes('vault-app-loader.js'))html=html.replace(/<script src="app\.js[^>]*><\/script>\s*<script src="training-demo-bridge\.js[^>]*><\/script>/,VAULT_TAG);
  const headers=new Headers(response.headers);headers.set("content-type","text/html; charset=utf-8");headers.set("cache-control","no-store");
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET"||new URL(e.request.url).origin!==self.location.origin)return;
  if(e.request.mode==="navigate"){e.respondWith(navigationResponse(e.request));return}
  e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(resp=>{if(!resp||resp.status!==200||resp.type!=="basic")return resp;const copy=resp.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return resp}).catch(()=>Response.error())));
});
