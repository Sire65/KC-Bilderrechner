'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const index=fs.readFileSync('pos/index.html','utf8');
const app=fs.readFileSync('pos/app.js','utf8');
const styles=fs.readFileSync('pos/styles.css','utf8');
const dual=fs.readFileSync('pos/dual-gateway-bootstrap.js','utf8');
const manager=fs.readFileSync('pc-manager/failover-monitor.html','utf8');
const sw=fs.readFileSync('pos/service-worker.js','utf8');

const warnings=[];
const checks=[];
const check=(name,condition,message)=>{assert.ok(condition,message);checks.push(name)};

// Studio-/Bedienvertrag: Tablet, Touch, eindeutige geschützte Servicewege.
check('viewport',/viewport-fit=cover/.test(index),'Tablet-/Safe-Area-Viewport fehlt.');
check('touch-targets',/min-height:\s*46px/.test(index+styles)||/min-height:\s*4[6-9]px/.test(styles),'Touch-Zielgröße ist nicht nachweisbar.');
check('service-pin',/id="servicePin"[^>]+pattern="\[0-9\]\{4\}"[^>]+maxlength="4"/.test(index),'Service-PIN-Feld entspricht nicht dem aktuellen 4-stelligen Vertrag.');
check('admin-protected',/id="settingsDialog"[^>]+data-admin-only="true"/.test(index),'Einstellungsdialog ist nicht als Adminbereich markiert.');
check('panic-return',/id="panicDialog"/.test(index)&&/id="panicReturnBtn"/.test(index),'Sofort-zurück-zur-Kasse-Weg fehlt.');
check('tuv-selftest',/id="tuvButton"/.test(index)&&/id="tuvDialog"/.test(index),'Interner System-Selbsttest fehlt.');
check('no-dev-login',!/(developerAdminLogin|DEV_ADMIN_ACCESS\s*=\s*true)/.test(index+app),'Entwicklerzugang darf im Releasepfad nicht aktiv sein.');

// Architektur-Konsistenz: beide UIs müssen dasselbe Failover-B-Ziel kennen.
const dualB=dual.match(/B_DEFAULT='([^']+)'/)?.[1]||'';
const managerB=manager.match(/B='([^']+)'/)?.[1]||'';
check('gateway-b-consistency',!!dualB&&!!managerB&&dualB===managerB,`Gateway-B-Drift: POS=${dualB||'?'}, Manager=${managerB||'?'}`);

// Offline-Start: kontrollierter SW-Pfad muss Vault vor App laden.
check('sw-vault-loader',/vault-app-loader\.js/.test(sw)&&/local-vault-bootstrap\.js/.test(sw),'Service Worker wartet beim kontrollierten Start nicht auf den Local Vault.');
check('sw-security-precache',/dom-safety-core\/dom-safety-core\.js/.test(sw)&&/transaction-integrity-core\/transaction-integrity-core\.js/.test(sw),'Offline-Precache enthält nicht alle kritischen Schutzmodule.');

// Vorgaben-Audit: diese Punkte sind bewusst als Warnung sichtbar, bis die Produktionskonsolidierung sie auflöst.
const masterPanels=['groups','articles','packages','offers'].filter(name=>index.includes(`data-settings-panel="${name}"`));
if(masterPanels.length)warnings.push(`MANAGER_ONLY_CONFIG: POS enthält weiterhin geschützte Stammdaten-Panels (${masterPanels.join(', ')}). Laut Zielarchitektur soll Stammdatenpflege ausschließlich im PC-Manager erfolgen.`);
if(/KCB-CHECK-1/.test(app))warnings.push('LEGACY_KCB_CHECKSUM: KCB-CHECK-1 ist physisch noch im Legacy-Code vorhanden, obwohl der Audit-Runtimepfad ihn sperrt.');
if(/fiscalMode:\s*"off"/.test(app))warnings.push('FISCAL_RELEASE: Fiskalmodus ist standardmäßig off; TSE/KassenSichV bleibt getrennte Freigabestrecke.');
if(/<script src="app\.js\?build=0\.31\.3\.6-r11"><\/script>/.test(index)&&!/<script src="local-vault-bootstrap\.js/.test(index))warnings.push('FIRST_UNCONTROLLED_LOAD: Der statische Erstaufruf lädt app.js vor dem Local Vault; der Service Worker korrigiert dies nach Installation/Reload. Für maximale Fail-Closed-Härtung sollte der statische Einstieg bei der finalen Konsolidierung ebenfalls Vault-first werden.');

console.log(JSON.stringify({status:warnings.length?'PASS_WITH_WARNINGS':'PASS',checks:checks.length,warnings},null,2));
