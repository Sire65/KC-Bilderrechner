'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=rel=>fs.readFileSync(path.join(__dirname,'..',rel),'utf8');
const around=(text,marker,size=5000)=>{const i=text.indexOf(marker);return i<0?'':text.slice(i,i+size)};

const app=read('pos/app.js');
const index=read('pos/index.html');
const runtime=read('shared/runtime-flags.js');
const security=read('cores/security-core/security-core.js');

assert.doesNotMatch(app,/\bDEV_ADMIN_ACCESS\s*=\s*true\b/,'Entwickler-Bypass darf nicht aktiv sein.');
assert.doesNotMatch(index,/id=["']developerAdminLogin["']/,'Sichtbarer Entwicklerzugang darf nicht vorhanden sein.');
assert.doesNotMatch(app,/function\s+developerAdminLogin\s*\(/,'Latenter Entwickler-Login darf nicht im POS verbleiben.');

const discount=around(app,'el("applyDiscountBtn").onclick',5000);
assert.match(discount,/requirePermission\(["']discount\.apply["']\)/,'Rabatt muss im tatsächlichen Handler SecurityCore prüfen.');
const withdrawal=around(app,'el("saveWithdrawal").onclick',7000);
assert.match(withdrawal,/requirePermission\(["']cash\.withdraw["']\)/,'Entnahme/Reklamationsauszahlung muss SecurityCore prüfen.');
const closing=around(app,'function createClosing()',3500);
assert.match(closing,/requirePermission\(["']closing\.execute["']\)/,'Tagesabschluss muss SecurityCore prüfen.');
assert.match(security,/stepUp\|\|\[[^\]]*discount\.apply[^\]]*cash\.withdraw[^\]]*closing\.execute/s,'Finanzaktionen müssen standardmäßig Step-Up verlangen.');

assert.match(runtime,/cash-transfer-auth-core\/cash-transfer-auth-core\.js/,'KCASH2 Auth-Core muss vor app.js geladen werden.');
assert.match(app,/CASH_TRANSFER_SECRET_KEY\s*=\s*["']kc_cash_transfer_secret_v2["']/,'Separates Bargeld-HMAC-Geheimnis fehlt.');
assert.match(app,/KCCashTransferAuth\.verify/,'KCASH2 muss vor Übernahme kryptografisch verifiziert werden.');
assert.match(app,/KCCashTransferAuth\.sign/,'Neue Bargeldübergaben müssen mit KCASH2 signiert werden.');
assert.match(app,/KCCashTransferAuth\.encode/,'Neue Bargeldübergaben müssen als KCASH2 codiert werden.');
assert.match(app,/KCASH1[^\n]{0,180}(gesperrt|Altformat|abgelehnt)/i,'KCASH1 muss explizit fail-closed gesperrt sein.');
assert.match(app,/code\.startsWith\(["']KCASH2:["']\)/,'Scanner muss KCASH2 erkennen.');
assert.match(app,/await\s+applyCashPayload\(/,'Bargeldimport muss die asynchrone Authentifizierung abwarten.');

console.log('PASS POS financial authorization, developer-bypass removal and KCASH2 runtime integration');
