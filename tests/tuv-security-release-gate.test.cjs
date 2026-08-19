'use strict';

const fs = require('node:fs');
const path = require('node:path');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}
function around(text, marker, size = 4000) {
  const i = text.indexOf(marker);
  return i < 0 ? '' : text.slice(i, i + size);
}

const app = read('pos/app.js');
const index = read('pos/index.html');
const vault = read('pos/local-vault-bootstrap.js');
const netlify = read('netlify.toml');
const runtimeFlags = read('shared/runtime-flags.js');
const securityCore = read('cores/security-core/security-core.js');
const secureSync = read('cores/security-core/crypto-secure-sync.js');
const notification = read('cores/notification-core/notification-core.js');

const blockers = [];
const warnings = [];

if (/\bDEV_ADMIN_ACCESS\s*=\s*true\b/.test(app)) {
  blockers.push('DEV_ADMIN_ACCESS ist aktiv. Ein Release darf keinen Entwickler-Bypass enthalten.');
}
if (/id=["']developerAdminLogin["']/.test(index) || /function\s+developerAdminLogin\s*\(/.test(app)) {
  blockers.push('Der Candidate-Entwicklerzugang ist im POS noch vorhanden.');
}
if (/\beval\s*\(/.test(app) || /new\s+Function\s*\(/.test(app)) {
  blockers.push('Dynamische Codeausführung (eval/new Function) im POS gefunden.');
}

const discountHandler = around(app, 'el("applyDiscountBtn").onclick', 4500);
if (discountHandler && !/requirePermission\(["']discount\.apply["']/.test(discountHandler)) {
  blockers.push('Rabatt ist im Handler nicht an SecurityCore permission discount.apply gebunden.');
}
const withdrawalHandler = around(app, 'el("saveWithdrawal").onclick', 7000);
if (withdrawalHandler && !/requirePermission\(["']cash\.withdraw["']/.test(withdrawalHandler)) {
  blockers.push('Entnahme/Reklamationsauszahlung ist im Speicher-Handler nicht an cash.withdraw gebunden.');
}
const closingHandler = around(app, 'function createClosing()', 3000);
if (closingHandler && !/requirePermission\(["']closing\.execute["']/.test(closingHandler)) {
  blockers.push('Tagesabschluss ist im Erzeugungsweg nicht an closing.execute gebunden.');
}
const permissionHelper = around(app, 'function requirePermission', 2200);
const stepUpEnforcedInCore = /STEP_UP_REQUIRED/.test(securityCore) && /stepUpSatisfied/.test(securityCore);
const financialStepUpDefault = /stepUp\s*:\s*Array\.from\(new Set\(policy\.stepUp\|\|\[[^\]]*["']discount\.apply["'][^\]]*["']cash\.withdraw["'][^\]]*["']closing\.execute["']/s.test(securityCore);
if (!stepUpEnforcedInCore || !financialStepUpDefault) {
  blockers.push('SecurityCore erzwingt Step-Up nicht vollständig für Rabatt, Entnahme und Tagesabschluss.');
}
if (!/SESSION_EXPIRED/.test(securityCore) || !/sessionMaxAgeMs/.test(securityCore)) {
  warnings.push('Admin-/SecurityCore-Sitzungen besitzen keinen eindeutig nachweisbaren maximalen Session-Zeitraum.');
}
if (!/STEP_UP_REQUIRED/.test(permissionHelper) || !/PIN-\/QR-Freigabe/.test(permissionHelper)) {
  warnings.push('POS-Berechtigungshelper erklärt eine erforderliche Step-Up-Freigabe dem Bediener nicht eindeutig.');
}

const cashSecretArea = around(app, 'const CASH_TRANSFER_SECRET_KEY', 8000);
const cashDecode = around(app, 'async function decodeCashPayload', 5000);
const cashCreate = around(app, 'async function kcCreateSharedCash', 6500);
const cashAuthRuntime = /cash-transfer-auth-core\/cash-transfer-auth-core\.js/.test(runtimeFlags);
const cashSecretProtected = /CASH_TRANSFER_SECRET_KEY\s*=\s*["']kc_cash_transfer_secret_v2["']/.test(cashSecretArea) && /KCStorageVault/.test(cashSecretArea) && /protectedKey\(CASH_TRANSFER_SECRET_KEY\)/.test(cashSecretArea);
const cashVerify = /KCCashTransferAuth/.test(cashDecode) && /\.verify\(/.test(cashDecode) && /registerId:state\.master\.registerId/.test(cashDecode) && /effectiveDate:localBusinessDate\(\)/.test(cashDecode);
const cashCreateAuthenticated = /\.sign\(/.test(cashCreate) && /\.encode\(/.test(cashCreate) && /expiresAt/.test(cashCreate);
const legacyCashBlocked = /KCASH1:[^\n]{0,220}(gesperrt|Altformat)/i.test(cashDecode);
const scannerCash2 = /code\.startsWith\(["']KCASH2:["']\)/.test(app) && /await\s+applyCashPayload\(code/.test(app);
if (!(cashAuthRuntime && cashSecretProtected && cashVerify && cashCreateAuthenticated && legacyCashBlocked && scannerCash2)) {
  blockers.push('KCASH2-Herkunftsauthentifizierung ist nicht vollständig fail-closed in Erzeugung, Import und Scannerpfad integriert.');
}
if (/KCB-CHECK-1/.test(app) && !/(HMAC|subtle\.verify|signature)/i.test(around(app, 'function validatePosExchange', 7000))) {
  warnings.push('KCB-Konfigurations-/Austauschpakete nutzen eine Prüfsumme statt kryptografischer Herkunftsprüfung. Signatur/HMAC für vertrauenswürdige Manager-Pakete vorsehen.');
}

const dualGatewayWired=/dual-gateway-bootstrap\.js/.test(index)||/dual-gateway-bootstrap\.js/.test(runtimeFlags);
const localVaultWired=/local-vault-bootstrap\.js/.test(index)||/local-vault-bootstrap\.js/.test(runtimeFlags);
const txIntegrityWired=/transaction-integrity-core\.js/.test(index)||/transaction-integrity-core\.js/.test(runtimeFlags);
if(!dualGatewayWired)blockers.push('Der POS-Runtimepfad aktiviert den vorhandenen Dual-Gateway-Bootstrap nicht.');
if(!localVaultWired)blockers.push('Der POS-Runtimepfad aktiviert den verschlüsselten Local Vault nicht.');
if(!txIntegrityWired)blockers.push('Der POS-Runtimepfad lädt den TransactionIntegrityCore nicht vor dem Failover-Client.');
const gatewayClientAuth=/HMAC/.test(notification)&&/x-kc-signature/.test(notification)&&/x-kc-device/.test(notification)&&/GATEWAY_DEVICE_NOT_PROVISIONED/.test(notification);
if(!gatewayClientAuth)blockers.push('Failover-Client signiert Sync-/Restore-/Reconcile-Anfragen nicht mit einer fail-closed Geräteidentität.');
if(!/LOCAL_VAULT_AUTH_UNAVAILABLE/.test(notification)||!/AUTH_SECRET_KEY/.test(notification))blockers.push('Gateway-Gerätegeheimnis ist im Failover-Client nicht zwingend an den verschlüsselten Local Vault gebunden.');

const reconcile = around(notification, 'async function reconcile(', 18000);
const restoreDigestVerified=/verifyRemoteTransactions\(received\)/.test(reconcile)&&/verifyDigest/.test(notification)&&/stripTransportDigest/.test(notification);
if (reconcile && /missingLocal/.test(reconcile) && /setItemDurable/.test(reconcile) && !restoreDigestVerified) {
  blockers.push('Failover-Restore übernimmt Remote-Transaktionen in den lokalen Bestand, ohne einen stabilen Inhaltsdigest vor dem Merge nachzuweisen.');
}
const reconcileChunked=/RECONCILE_CHUNK_SIZE\s*=\s*1000/.test(notification)&&/for\(const part of chunks\(localIds\)\)/.test(reconcile)&&/fetchRemoteIds\(registerId\)/.test(reconcile)&&/\/sync\/ids/.test(notification)&&/REMOTE_PAGE_SIZE\s*=\s*500/.test(notification);
if(!reconcileChunked){
  warnings.push('Reconcile besitzt keinen eindeutig nachweisbaren 1000er Chunk-Vertrag plus paginierte Remote-ID-Liste.');
}
const reconcileThrottled=/RECONCILE_MIN_INTERVAL_MS\s*=\s*60000/.test(notification)&&/THROTTLED/.test(reconcile)&&/await reconcile\(false\)/.test(notification);
if (/setInterval\(kick,5000\)/.test(notification) && !reconcileThrottled) {
  warnings.push('Failover-Sync läuft im 5-Sekunden-Takt, ohne den Voll-Reconcile separat zu drosseln.');
}

if (!/AES-GCM/.test(vault) || !/extractable\s*:\s*false/.test(vault)) {
  warnings.push('Local Vault: AES-GCM bzw. nicht exportierbarer Schlüssel nicht eindeutig nachweisbar.');
}
if (!/MAX_KDF_ITERATIONS/.test(secureSync) || !/MAX_CIPHERTEXT_BYTES/.test(secureSync)) {
  warnings.push('Secure-Sync-Import besitzt keine eindeutig nachweisbaren Grenzen für KDF-Aufwand/Nutzlast.');
}
if (/fiscalMode\s*:\s*["']off["']/.test(app)) {
  warnings.push('Fiskalmodus steht standardmäßig auf off; TSE/KassenSichV-Freigabe separat prüfen.');
}
if (/innerHTML\s*=/.test(app) && (/\$\{p\.name\}/.test(app) || /\$\{x\.name\}/.test(app) || /\$\{c\.label\}/.test(app))) {
  warnings.push('Dynamische Katalog-/Warenkorbwerte werden teilweise per innerHTML aufgebaut; Stored-DOM-XSS-Datenwege vollständig prüfen und escapen.');
}
if (!/Content-Security-Policy/i.test(netlify)) {
  warnings.push('Netlify-Konfiguration enthält noch keine Content-Security-Policy. CSP erst nach Kompatibilitätstest mit Service Worker/Inline-Code aktivieren.');
}
if (!/Strict-Transport-Security/i.test(netlify)) {
  warnings.push('Netlify-Konfiguration enthält keinen expliziten HSTS-Header.');
}

console.log('KC TÜV Security Release Gate');
for (const warning of warnings) console.warn('WARN:', warning);
for (const blocker of blockers) console.error('BLOCKER:', blocker);

if (blockers.length) {
  console.error(`Release gesperrt: ${blockers.length} kritische(r) Punkt(e).`);
  process.exit(1);
}

console.log('PASS: Keine durch diesen Gate-Test erkannten Release-Blocker.');
