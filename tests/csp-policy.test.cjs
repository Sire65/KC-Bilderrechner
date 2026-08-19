'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');

const netlify=fs.readFileSync(path.join(__dirname,'..','netlify.toml'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'..','pos','app.js'),'utf8');
const index=fs.readFileSync(path.join(__dirname,'..','pos','index.html'),'utf8');

const cspMatch=netlify.match(/Content-Security-Policy\s*=\s*"([^"]+)"/);
assert.ok(cspMatch,'POS Content-Security-Policy fehlt.');
const csp=cspMatch[1];

for(const directive of [
  "default-src 'self'",
  "base-uri 'none'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self'",
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "connect-src 'self' https: wss:",
  "worker-src 'self' blob:",
  "manifest-src 'self'"
]) assert.ok(csp.includes(directive),`CSP-Direktive fehlt oder ist unerwartet: ${directive}`);

assert.ok(!/script-src[^;]*'unsafe-inline'/.test(csp),"script-src darf 'unsafe-inline' nicht erlauben.");
assert.ok(!/script-src[^;]*\*/.test(csp),'script-src darf keinen Wildcard-Host enthalten.');
assert.ok(!/<script(?:\s|>)(?![^>]*\bsrc=)/i.test(index),'POS index.html enthält unerwartetes Inline-Script.');

const printScripts=[
  'window.onload=()=>window.print()',
  'window.onload=()=>setTimeout(()=>window.print(),120)'
];
for(const script of printScripts){
  const hash='sha256-'+crypto.createHash('sha256').update(script).digest('base64');
  assert.ok(csp.includes(`'${hash}'`),`CSP-Hash für Druckskript fehlt: ${hash}`);
  assert.ok(app.includes(`<script>${script}<\\/script>`),`Erwartetes Druckskript wurde geändert; CSP-Hash muss neu bewertet werden: ${script}`);
}

assert.ok(csp.includes('https:'),'Dynamische HTTPS-Gateway-/ECB-Verbindungen müssen im connect-src kompatibel bleiben.');
assert.ok(csp.includes('wss:'),'WebSocket-Verbindungen müssen im connect-src kompatibel bleiben.');
assert.ok(csp.includes('upgrade-insecure-requests'),'Unsichere Unterressourcen sollen auf HTTPS hochgestuft werden.');

console.log('PASS POS CSP blocks inline/event scripts, objects, framing and unsafe bases while preserving hashed print helpers, self assets, workers and HTTPS/WSS data connections');
