# KC Bilderkasse – TÜV Remediation 2026-08-18

## Schutzregel

Diese Prüfspur darf den laufenden Produktionsstand nicht verändern. Änderungen erfolgen ausschließlich auf `audit/tuv-hardening-2026-08-18` und werden nicht automatisch gemergt oder ausgerollt.

## Release-Blocker

1. `DEV_ADMIN_ACCESS=true` in `pos/app.js`.
2. Sichtbarer Candidate-Entwicklerzugang `developerAdminLogin` in `pos/index.html`.
3. Produktiver TSE-Adapter ist laut Architektur noch nicht vorhanden; fiskalische Freigabe daher separat offen.
4. Failover-Gateway-Authentifizierung wird im Repository `KC-Failover-Gateway` separat geprüft und darf vor Security-Freigabe nicht als abgeschlossen gelten.

## Bereits eingeführte Abhilfe auf der Audit-Spur

- Automatischer statischer Release-Gate-Test `tests/tuv-security-release-gate.test.cjs`.
- CI beobachtet nun zusätzlich Änderungen an `pos/app.js`, `pos/index.html` und dem TÜV-Gate-Test.
- Ein Release wird vom Gate abgewiesen, solange der Entwickler-Bypass oder dessen sichtbare Schaltfläche vorhanden ist.
- Dynamische Codeausführung über `eval()` oder `new Function()` wird als Release-Blocker erkannt.
- Local-Vault-Kryptografie, ausgeschalteter Fiskalmodus, dynamische `innerHTML`-Datenwege sowie fehlende CSP/HSTS-Härtung werden als Prüfpunkte ausgewiesen.

## Read-only Live-Prüfung Datenbanken

### Supabase KC Core

- 1 Auth-Benutzer, davon 0 anonym.
- Die vom Advisor gemeldeten Admin-`SECURITY DEFINER`-Funktionen prüfen intern die angemeldete Rolle (`planner`, `duty_manager`, `admin`) bzw. binden Push-Receipts an `auth.uid()`. Die breiten EXECUTE-Grants bleiben ein Härtungspunkt, sind aber nicht gleichbedeutend mit einem offenen Adminzugang.
- `kc_dp_report_error` ist absichtlich auch anonym aufrufbar, begrenzt Eingaben und besitzt für nicht angemeldete Aufrufer ein IP-basiertes Rate-Limit von 100 Meldungen in 5 Minuten.

### Supabase Future Academy

- 38 Auth-Benutzer, davon 35 anonyme Auth-Sitzungen. Das passt zum anonymen Teilnehmermodell.
- Academy-Policies binden Teilnehmer- und Ereignisdaten an `owner_id = auth.uid()`.
- KC-DP-Policies verwenden zusätzlich `kc_dp_is_permanent_user()`, das Nutzer mit `is_anonymous=true` ausdrücklich ausschließt.
- `cron.job` und `cron.job_run_details` besitzen zwar SELECT-Rechte für `anon`/`authenticated`, die RLS-Policy erlaubt jedoch nur Zeilen mit `username = CURRENT_USER`; vorhandene Cron-Zeilen gehören ausschließlich `postgres`. Rechte trotzdem später auf notwendige Rollen minimieren.

### Neon KC Core Mirror

- Für `kc_failover_transactions` existiert die eingeschränkte Rolle `kc_gateway_runtime` mit nur `SELECT` und `INSERT`; es wurden keine PUBLIC-Tabellenrechte in der Prüfung gefunden.
- Aktuelle verschlüsselte Backups: letzter geprüfter Satz 36/36 Tabellen erfolgreich, Restore-/Integritätsprüfung 36 geprüft, 0 Fehler.
- Frühere fehlgeschlagene Backup-/Restore-Testläufe sind historisch vorhanden; die nachfolgenden aktuellen Prüfungen stehen auf `ok`.

## Nächste sichere Schritte

- Entwickler-Bypass in einer isolierten Änderung entfernen und alle bestehenden Regressionstests ausführen.
- Danach UI-Test des Service-/Admin-Zugangs mit PIN und Superadmin-QR durchführen.
- DOM-XSS-Datenwege von Manager/Import bis `innerHTML` vollständig nachverfolgen und dynamische Werte konsequent escapen bzw. mit DOM-APIs setzen.
- Supabase-EXECUTE- und Cron-Grants nach Funktionsbedarf minimieren, aber erst nach Abhängigkeits-/Regressionstest.
- TSE/KassenSichV getrennt als fachliche Freigabestrecke behandeln.

## Nicht durchgeführt

- Keine Änderung an `main`.
- Kein Deployment.
- Keine Supabase-Migration.
- Keine Neon-Schemaänderung.
- Keine Änderung an produktiven Secrets, Tokens oder Cloud-Konfigurationen.
