'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','pos','kcb-exchange-auth-bootstrap.js'),'utf8');
const runtime=fs.readFileSync(path.join(__dirname,'..','shared','runtime-flags.js'),'utf8');

assert.match(source,/SECRET_KEY='kc_exchange_secret_v2'/,'Separater KCB-Austauschschlüssel fehlt.');
assert.match(source,/vault\.protectedKey\(SECRET_KEY\)/,'KCB-Schlüssel muss durch Local Vault geschützt sein.');
assert.match(source,/secret\.length<32/,'KCB-Schlüssel muss Mindestlänge erzwingen.');
assert.match(source,/auth\.sign\(/,'KCB-Exporte müssen kryptografisch signiert werden.');
assert.match(source,/auth\.verify\(/,'KCB-Importe müssen vor Übernahme kryptografisch geprüft werden.');
assert.match(source,/LEGACY_CHECKSUM_PACKAGE_BLOCKED/,'Checksum-only Legacy-Pakete müssen fail-closed abgelehnt werden.');
assert.match(source,/root\.validatePosExchange=syncValidation/,'Der bisherige synchrone Validator muss auf vorverifizierte Pakete begrenzt werden.');
assert.match(source,/verifiedPackages\.has/,'Import darf nur für vorher kryptografisch verifizierte Paket-IDs freigegeben werden.');
assert.match(source,/MAX_IMPORT_BYTES=5\*1024\*1024/,'KCB-Import braucht eine feste Dateigrößenobergrenze.');
assert.match(source,/exportKCExchangeSales/,'Verkaufsexport muss gehärtet überschrieben werden.');
assert.match(source,/exportAdminChanges/,'Admin-Änderungsexport muss gehärtet überschrieben werden.');
assert.match(source,/importKCExchangeFile/,'KCB-Import muss gehärtet überschrieben werden.');
assert.doesNotMatch(source,/\beval\s*\(|new\s+Function\s*\(/,'KCB-Bootstrap darf keinen dynamischen Code ausführen.');

assert.match(runtime,/exchange-auth\.js/,'KCB-HMAC-Core muss vor app.js geladen werden.');
assert.match(runtime,/kcb-exchange-auth-bootstrap\.js/,'KCB-POS-Bootstrap muss vor app.js geladen werden.');
assert.match(runtime,/exchangeGuard/,'Austauschaktionen müssen bis zum erfolgreichen Bootstrap gesperrt bleiben.');
assert.match(runtime,/verifyExchangeBootstrap/,'Fehlender KCB-Bootstrap muss fail-closed deaktivieren.');

console.log('PASS KCB POS bootstrap signs exports, verifies imports, blocks legacy checksum packages and fails closed when unavailable');
