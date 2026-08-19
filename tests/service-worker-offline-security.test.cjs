'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const sw=fs.readFileSync('pos/service-worker.js','utf8');
const netlify=fs.readFileSync('netlify.toml','utf8');

const requiredOffline=[
  '../shared/runtime-flags.js',
  '../cores/dom-safety-core/dom-safety-core.js',
  '../cores/transaction-integrity-core/transaction-integrity-core.js',
  '../cores/cash-transfer-auth-core/cash-transfer-auth-core.js',
  '../exchange-core-v31/exchange-auth.js',
  './kcb-exchange-auth-bootstrap.js',
  './local-vault-bootstrap.js',
  './dual-gateway-bootstrap.js'
];
for(const asset of requiredOffline)assert.ok(sw.includes(`"${asset}"`),`Kritisches Sicherheitsmodul fehlt im Offline-Precache: ${asset}`);

// Eine CSP ohne unsafe-inline darf durch den Service Worker keine neuen Inline-Skripte erzeugt bekommen.
assert.doesNotMatch(netlify,/script-src[^;]*'unsafe-inline'/,'CSP darf Inline-Skripte nicht global erlauben.');
const htmlRewriteArea=sw.slice(Math.max(0,sw.indexOf('navigationResponse')-1500));
assert.doesNotMatch(htmlRewriteArea,/<script>(?!window\.onload)/i,'Service Worker erzeugt CSP-inkompatibles Inline-JavaScript im Navigations-HTML.');

// Offline-Start muss fail-closed und versionsgebunden bleiben.
assert.ok(sw.includes('headers.set("cache-control","no-store")'),'Navigationsantwort muss no-store signalisieren.');
assert.match(sw,/caches\.delete/,'Alte Cache-Versionen müssen beim Aktivieren entfernt werden.');
assert.match(sw,/self\.clients\.claim/,'Neuer Service Worker muss Clients kontrolliert übernehmen.');

console.log('PASS service worker pre-caches all critical security modules and does not create CSP-incompatible inline application scripts');
