'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const exists=rel=>fs.existsSync(path.join(root,rel));

const required=[
  'pos/index.html','pos/app.js','pos/service-worker.js','pos/local-vault-bootstrap.js','pos/dual-gateway-bootstrap.js',
  'pos/kcb-exchange-auth-bootstrap.js','shared/runtime-flags.js','netlify.toml','pos/version-manifest.json',
  'cores/security-core/security-core.js','cores/security-core/crypto-secure-sync.js','cores/audit-core/audit-core.js',
  'cores/health-core/health-core.js','cores/dom-safety-core/dom-safety-core.js','cores/transaction-integrity-core/transaction-integrity-core.js',
  'cores/cash-transfer-auth-core/cash-transfer-auth-core.js','exchange-core-v31/exchange-auth.js'
];
for(const rel of required)assert.ok(exists(rel),`Pflichtbestandteil fehlt: ${rel}`);

const index=read('pos/index.html');
const app=read('pos/app.js');
const sw=read('pos/service-worker.js');
const runtime=read('shared/runtime-flags.js');
const netlify=read('netlify.toml');
const vault=read('pos/local-vault-bootstrap.js');
const security=read('cores/security-core/security-core.js');
const tx=read('cores/transaction-integrity-core/transaction-integrity-core.js');
const cash=read('cores/cash-transfer-auth-core/cash-transfer-auth-core.js');
const exchange=read('exchange-core-v31/exchange-auth.js');
const manifest=JSON.parse(read('pos/version-manifest.json'));

// Konsolidierung / Versionsvertrag
assert.match(app,/const VERSION="V0\.31\.3\.6 Repair 11"/,'App-Version weicht vom freigegebenen Repair-11-Vertrag ab.');
assert.equal(manifest.displayVersion,'V0.31.3.6 Repair 11','Version-Manifest und App-Version widersprechen sich.');
assert.match(index,/KC Bildrechner V0\.31\.3\.6 Repair 11/,'UI-Titel ist nicht auf Repair 11 konsolidiert.');
assert.match(sw,/v0-31-3-6-r11/i,'Service-Worker-Cache ist nicht an Repair 11 gebunden.');

// Architektur / Boot-Reihenfolge
for(const token of [
  'dom-safety-core/dom-safety-core.js','transaction-integrity-core/transaction-integrity-core.js',
  'cash-transfer-auth-core/cash-transfer-auth-core.js','exchange-core-v31/exchange-auth.js',
  'kcb-exchange-auth-bootstrap.js','dual-gateway-bootstrap.js','local-vault-bootstrap.js'
]) assert.ok(runtime.includes(token),`Runtime-Architektur bindet ${token} nicht ein.`);
assert.ok(runtime.indexOf('dom-safety-core.js')<runtime.indexOf('transaction-integrity-core.js'),'DOM-Safety muss vor Integritäts-/Anwendungslogik aktiv sein.');
assert.match(runtime,/KC_RUNTIME_SECURITY_BLOCKED/,'Fail-closed Runtime-Sicherheitsblock fehlt.');

// Kritische Finanz-/Admin-Sicherheit
assert.match(app,/DEV_ADMIN_ACCESS=false/,'Entwickler-Bypass ist nicht explizit deaktiviert.');
assert.doesNotMatch(app,/function\s+developerAdminLogin\s*\(/,'Latenter Entwicklerzugang ist zurückgekehrt.');
for(const permission of ['discount.apply','cash.withdraw','closing.execute'])assert.ok(app.includes(`requirePermission("${permission}")`),`SecurityCore-Bindung fehlt: ${permission}`);
assert.ok(/STEP_UP_REQUIRED/.test(security)&&/stepUpSatisfied/.test(security),'SecurityCore-Step-Up ist nicht fail-closed nachweisbar.');
assert.doesNotMatch(app,/\beval\s*\(|new\s+Function\s*\(/,'Dynamische Codeausführung im POS gefunden.');

// Kryptografie / Integrität
assert.ok(/AES-GCM/.test(vault)&&/generateKey\([^\n]+false/.test(vault),'Local Vault muss AES-GCM mit nicht exportierbarem Schlüssel verwenden.');
assert.ok(/KC_TX_DIGEST_V1/.test(tx),'Transaktions-Digest-Vertrag fehlt.');
assert.ok(/HMAC/.test(cash)&&/subtle\.sign/.test(cash)&&/subtle\.verify/.test(cash),'KCASH2-HMAC-Vertrag unvollständig.');
assert.ok(/KCB-HMAC-SHA256-1/.test(exchange)&&/subtle\.sign/.test(exchange)&&/subtle\.verify/.test(exchange),'KCB-HMAC-Vertrag unvollständig.');

// CSP / Transport
for(const requiredHeader of ['Content-Security-Policy','Strict-Transport-Security','X-Content-Type-Options','Referrer-Policy','Permissions-Policy'])assert.ok(netlify.includes(requiredHeader),`Security-Header fehlt: ${requiredHeader}`);
assert.match(netlify,/script-src-attr 'none'/,'Inline-Eventhandler müssen per CSP gesperrt bleiben.');
assert.doesNotMatch(netlify,/script-src[^;]*'unsafe-inline'/,'Inline-Skripte dürfen nicht pauschal erlaubt werden.');

// UI-Struktur / eindeutige IDs
const ids=[...index.matchAll(/\bid=["']([^"']+)["']/g)].map(m=>m[1]);
const duplicates=[...new Set(ids.filter((id,i)=>ids.indexOf(id)!==i))];
assert.deepEqual(duplicates,[],`Doppelte HTML-IDs gefunden: ${duplicates.join(', ')}`);
for(const id of ['productGrid','cartList','servicePin','serviceLogin','fiscalModeSelect','healthDeepTestBtn','tuvDialog','systemHint'])assert.ok(ids.includes(id),`Kritisches UI-Element fehlt: #${id}`);
assert.doesNotMatch(index,/\son[a-z]+\s*=/i,'Inline-Eventhandler widersprechen der CSP-/Studio-Vorgabe.');

// Lokale Script-Referenzen müssen physisch existieren.
for(const src of [...index.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m=>m[1].split('?')[0])){
  if(/^(?:https?:|data:|blob:)/i.test(src))continue;
  const rel=path.normalize(path.join('pos',src));
  assert.ok(exists(rel),`Script-Referenz zeigt ins Leere: ${src}`);
}

// Kein offensichtliches produktives Geheimnis in ausführbaren/Deployment-Dateien.
const scanExt=new Set(['.js','.cjs','.html','.toml','.json','.yml','.yaml']);
const findings=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(['.git','node_modules'].includes(entry.name))continue;const full=path.join(dir,entry.name);if(entry.isDirectory())walk(full);else if(scanExt.has(path.extname(entry.name))){const rel=path.relative(root,full);if(rel==='tests/deep-system-consolidation.test.cjs')continue;const s=fs.readFileSync(full,'utf8');for(const re of [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,/postgres(?:ql)?:\/\/[^\s"']+:[^\s"']+@/i,/service[_-]?role[_-]?key\s*[:=]\s*["'][A-Za-z0-9._-]{20,}/i])if(re.test(s))findings.push(rel);}}}}
walk(root);
assert.deepEqual([...new Set(findings)],[],`Mögliche produktive Secrets im Repository: ${[...new Set(findings)].join(', ')}`);

console.log(JSON.stringify({status:'PASS',scope:'deep-consolidation',requiredFiles:required.length,htmlIds:ids.length,architecture:true,security:true,crypto:true,csp:true,secretScan:true}));
