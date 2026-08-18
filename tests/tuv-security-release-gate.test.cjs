'use strict';

const fs = require('node:fs');
const path = require('node:path');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

const app = read('pos/app.js');
const index = read('pos/index.html');
const vault = read('pos/local-vault-bootstrap.js');

const blockers = [];
const warnings = [];

if (/\bDEV_ADMIN_ACCESS\s*=\s*true\b/.test(app)) {
  blockers.push('DEV_ADMIN_ACCESS ist aktiv. Ein Release darf keinen Entwickler-Bypass enthalten.');
}
if (/id=["']developerAdminLogin["']/.test(index)) {
  blockers.push('Der sichtbare Candidate-Entwicklerzugang ist noch im POS-Dialog vorhanden.');
}
if (/\beval\s*\(/.test(app) || /new\s+Function\s*\(/.test(app)) {
  blockers.push('Dynamische Codeausführung (eval/new Function) im POS gefunden.');
}
if (!/AES-GCM/.test(vault) || !/extractable\s*:\s*false/.test(vault)) {
  warnings.push('Local Vault: AES-GCM bzw. nicht exportierbarer Schlüssel nicht eindeutig nachweisbar.');
}
if (/fiscalMode\s*:\s*["']off["']/.test(app)) {
  warnings.push('Fiskalmodus steht standardmäßig auf off; TSE/KassenSichV-Freigabe separat prüfen.');
}

console.log('KC TÜV Security Release Gate');
for (const warning of warnings) console.warn('WARN:', warning);
for (const blocker of blockers) console.error('BLOCKER:', blocker);

if (blockers.length) {
  console.error(`Release gesperrt: ${blockers.length} kritische(r) Punkt(e).`);
  process.exit(1);
}

console.log('PASS: Keine durch diesen Gate-Test erkannten Release-Blocker.');
