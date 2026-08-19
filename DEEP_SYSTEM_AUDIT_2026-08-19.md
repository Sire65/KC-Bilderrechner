# KC Bilderrechner – Deep System Audit 2026-08-19

## Zweck und Schutzregel

Dieser Audit prüft Konsolidierung, Regression, Architektur, Sicherheit, Offline-/Failover-Verhalten, Vorgaben- und Studio-Vertrag sowie die angebundenen Datenbanken. Er ist eine technische Eigenprüfung und keine amtliche Zertifizierung.

Alle Codeänderungen dieses Audits wurden ausschließlich auf `audit/tuv-hardening-2026-08-18` vorgenommen. `main` wurde nicht verändert, PR #2 bleibt Draft, es erfolgte kein Merge und kein Deployment.

## Finaler automatisierter Nachweis

Finaler Referenzlauf: `KC Failover Regression #103`.

Ergebnis: **SUCCESS**. Sämtliche ausführbaren CI-Schritte bestanden:

- Syntax aller relevanten Cores, Bootstraps, Service-Worker- und Testdateien
- AuditCore Secret Redaction
- HealthCore Secret Redaction
- SecureSync Envelope/KDF/Paketgrenzen
- SecurityCore Berechtigungen, Sessionablauf und Finanz-Step-Up
- Failover-/Super-GAU-Monitor-XSS
- DOM-Safety
- CSP-Policy
- ProductInfo-Freigabevertrag
- Runtime-Bootstrap
- TransactionIntegrity / Restore-Manipulationsschutz
- KCASH2-HMAC
- KCB-HMAC und POS-Integration
- POS-Finanzautorisierung / Entwickler-Bypass-Entfernung
- Deep-System-Konsolidierung
- Service-Worker-Offline-Sicherheit
- Vorgaben-/Studio-Audit
- verschlüsselter Local Vault
- Dual-Gateway A/B
- Offline Queue / Replay / Reconcile / Conflict / Restore / Chunking / Paging / Throttle
- TÜV-Security-Release-Gate

Das Security Release Gate meldet weiterhin: **keine erkannten kritischen Release-Blocker**.

## Im Tiefenaudit zusätzlich gefundene und behobene Fehler

### 1. Offline-Precache unvollständig

Die neue Tiefenregression hat nachgewiesen, dass mehrere zur Audit-Härtung dynamisch geladene Sicherheitsmodule nicht im Service-Worker-Precache enthalten waren. Ein frischer Offline-Start hätte diese Schutzmodule deshalb nicht zuverlässig laden können.

Abhilfe: Der Service Worker precacht jetzt unter anderem DOM-Safety, TransactionIntegrity, KCASH2-Auth, KCB-Auth, KCB-POS-Bootstrap, Local Vault, Vault-App-Loader und Dual-Gateway. Der Regressionstest `tests/service-worker-offline-security.test.cjs` verhindert die Wiederkehr.

### 2. CSP-Inkompatibilität im Service-Worker-Start

Der Service Worker erzeugte beim kontrollierten Start einen Inline-JavaScript-Loader. Die gehärtete CSP blockiert jedoch generische Inline-Skripte. Dadurch bestand eine reale Startinkompatibilität zwischen Offline-/Vault-Bootstrap und CSP.

Abhilfe: Die Startlogik wurde in `pos/vault-app-loader.js` ausgelagert und wird jetzt als Self-Origin-Skript geladen. Der Loader wartet fail-closed auf `KCStorageVault.ready`, kontrolliert Vault-Auditmerkmale und lädt erst danach Kassen-App und Trainingsbridge. Die Offline-Sicherheitsregression bestätigt den CSP-konformen Pfad.

### 3. Gateway-B-Konfigurationsdrift

POS-Dual-Gateway und PC-Manager-Testcenter verwendeten unterschiedliche Netlify-B-Adressen. Dies wurde als Architekturdrift erkannt.

Abhilfe: Der POS-Default wurde auf die aktuelle Adresse des PC-Manager-Testcenters konsolidiert: `https://kc-failover-gateway.netlify.app`. Die Vorgaben-/Studio-Regression verlangt jetzt identische B-Ziele.

### 4. CI-Tiefenprüfung erweitert

Neu eingeführt wurden:

- `tests/deep-system-consolidation.test.cjs`
- `tests/service-worker-offline-security.test.cjs`
- `tests/requirements-studio-audit.test.cjs`

Die Deep-System-Konsolidierung prüft unter anderem Versionskonsistenz, Pflichtdateien, Bootstrap-Reihenfolge, Finanz-/Admin-Sicherheit, Kryptografieverträge, Security-Header, doppelte HTML-IDs, kritische UI-Elemente, lokale Scriptreferenzen und offensichtliche produktive Secrets. Im Referenzlauf wurden 17 Pflichtkomponenten und 455 HTML-IDs geprüft; der Test bestand.

## Live Read-only Datenbankprüfung

### Supabase KC Core

- Alle im öffentlichen Schema gelisteten Anwendungstabellen besitzen RLS.
- Die Spiegelung Supabase → Neon arbeitet aktuell ohne sichtbare Abweichung. Im abschließenden 10-Minuten-Fenster wurden 74 erfolgreiche Runs, 0 nicht erfolgreiche Runs und 0 Mismatches gemessen; letzter Lauf: 2026-08-19 09:47 UTC.
- Die aktuelle SQL-Verbindung verwendet TLS 1.3 mit `TLS_AES_256_GCM_SHA384`.
- Die vom Supabase-Advisor gemeldeten SECURITY-DEFINER-Funktionen für Adminfehlerlisten und Push-Receipts wurden inhaltlich geprüft. Die Adminfunktionen kontrollieren intern aktive KC-WERNE-Mitgliedschaften und Rollen; Push-Receipts sind an `auth.uid()` gebunden.
- `kc_dp_report_error` ist bewusst auch anonym erreichbar, begrenzt Eingaben und besitzt für anonyme Aufrufe ein IP-basiertes Rate-Limit, soweit eine IP vorliegt.
- Supabase Leaked Password Protection ist derzeit deaktiviert und bleibt ein Härtungspunkt, sofern Passwortauthentifizierung eingesetzt wird.

### Supabase Future Academy

- Die gelisteten Public-Tabellen besitzen RLS.
- Das anonyme Teilnehmermodell erklärt einen Teil der Advisor-Warnungen. Die KC-DP-Policies rufen zusätzlich `kc_dp_is_permanent_user()` auf; anonyme Auth-Sitzungen werden dort ausgeschlossen.
- `kc_admin_learning_report()` verlangt `superadmin`; Claim/Register-Funktionen verlangen einen angemeldeten Benutzer und validieren Eigentum bzw. Recovery-Daten.
- Für Teilnehmer-Recovery bleibt Rate-Limiting/Recovery-Secret-Entropie ein gesonderter Härtungspunkt.
- Auch hier ist Leaked Password Protection derzeit deaktiviert.

### Neon KC Core Mirror

- 52 öffentliche Basistabellen wurden im Mirror gefunden.
- `kc_gateway_runtime` besitzt nur definierte Rechte auf Failover-/Security-Laufzeittabellen; PUBLIC besitzt keine Tabellenrechte im Public-Schema.
- Die produktive Neon-Branch ist technisch nicht als protected markiert.
- Öffentliche Verbindungen sind nicht per IP-Allowlist eingeschränkt; Zugriff erfordert weiterhin gültige Zugangsdaten. Für einen gehärteten Produktivbetrieb sollte geprüft werden, ob Netzwerkzugriff stärker eingeschränkt werden kann.
- `pg_stat_statements` ist nicht installiert. Deshalb konnte keine belastbare historische Slow-Query-Auswertung aus diesem Modul erfolgen; es wurde bewusst keine Extension ohne Freigabe installiert.

## Vorgaben-/Studio-Audit: verbleibende Warnungen

Der Vorgaben-/Studio-Test ist technisch erfolgreich, meldet aber vier bewusst sichtbare Restpunkte:

1. **Manager-only Stammdatenpflege:** In der POS-Datei sind weiterhin geschützte Panels für Warengruppen, Artikel, Packages und Angebote vorhanden. Dies kollidiert mit der Zielvorgabe, dass Stammdatenpflege ausschließlich im PC-Manager erfolgen soll. Vor finaler Produktionskonsolidierung sollte dieser Altpfad entfernt oder sicher in einen reinen Managerpfad migriert werden.
2. **KCB-CHECK-1 Legacy-Code:** Der alte Prüfsummenpfad ist physisch noch in `pos/app.js` vorhanden. Im Audit-Runtimepfad wird er fail-closed gesperrt; tote Legacy-Implementierung sollte vor finaler Konsolidierung entfernt werden.
3. **TSE/KassenSichV:** `fiscalMode` ist standardmäßig `off`. Dies ist eine eigene regulatorische Freigabestrecke und kann nicht durch den technischen Security-Audit ersetzt werden.
4. **Erster unkontrollierter Browserstart:** Die statische `index.html` lädt `app.js` beim allerersten, noch nicht durch den Service Worker kontrollierten Aufruf vor dem Local Vault. Nach Installation übernimmt der Service Worker und lädt Vault-first. Für maximale Fail-Closed-Härtung sollte der statische Einstieg bei der finalen Konsolidierung ebenfalls Vault-first aufgebaut werden.

Weitere Härtungspunkte: KCB-/KCASH2-Secret-Provisionierung, Legacy-Restore-Behandlung, stärkere PIN-Rate-Limits/Parametergrenzen, weitere Importgrößenlimits, Supabase-Grant-Minimierung, Performance-Advisor-Punkte und optional signierte/geschützte Release-Commits.

## Supply Chain / Release-Provenienz

Der aktuelle Audit-Head wurde über die GitHub-Dateiaktionen erzeugt und ist nicht kryptografisch signiert. Das ist kein funktionaler Programmfehler, aber für eine strengere Release-Provenienz sollte vor einer späteren Produktion entschieden werden, ob signierte Commits/Tags und Branch-Protection verpflichtend werden.

## Bewertung

**Technischer Zustand des Audit-Zweigs: sehr stark, alle finalen automatisierten Regressionen grün, keine im aktuellen Gate erkannten kritischen Release-Blocker.**

Eine Aussage „es kann keinerlei Fehler mehr geben“ wäre technisch unseriös. Der Tiefenaudit hat tatsächlich zusätzliche Fehler gefunden und behoben und hat die Testabdeckung deutlich erweitert. Vor einer Produktionsfreigabe bleiben die oben genannten fachlichen, regulatorischen und Architektur-Restpunkte bewusst offen.
