# KC Bilderkasse – TÜV Remediation 2026-08-18

## Schutzregel

Diese Prüfspur darf den laufenden Produktionsstand nicht verändern. Änderungen erfolgen ausschließlich auf `audit/tuv-hardening-2026-08-18` und werden nicht automatisch gemergt oder ausgerollt.

## Release-Blocker

1. `DEV_ADMIN_ACCESS=true` in `pos/app.js`.
2. Sichtbarer Candidate-Entwicklerzugang `developerAdminLogin` in `pos/index.html`.
3. Finanzielle Aktionen sind noch nicht durchgängig an den vorhandenen SecurityCore gebunden: Rabatt, Entnahme/Reklamationsauszahlung und Tagesabschluss besitzen im jeweiligen Ausführungsweg keine nachgewiesene `requirePermission(...)`-Prüfung.
4. Der SecurityCore kennzeichnet bestimmte Rechte als Step-Up-pflichtig, der aktuelle `requirePermission`-Helper erzwingt diese Step-Up-Prüfung selbst noch nicht.
5. `KCASH1`-Bargeld-QRs verwenden nur eine nicht-kryptografische Prüfsumme. Damit ist Beschädigung erkennbar, aber die Herkunft nicht authentifiziert; ein Angreifer kann prinzipiell einen formal korrekten QR selbst erzeugen.
6. Failover-Restore/Reconcile übernimmt Remote-Transaktionen in den lokalen Bestand, ohne vor dem Merge die Record-Hashes/Prüfkette der empfangenen Daten nachzuweisen.
7. Produktiver TSE-Adapter ist laut Architektur noch nicht vorhanden; fiskalische Freigabe daher separat offen.
8. Failover-Gateway-Authentifizierung wird im Repository `KC-Failover-Gateway` separat geprüft und darf vor Security-Freigabe nicht als abgeschlossen gelten.

## Weitere wichtige Befunde

- `KCB-CHECK-1` schützt Austausch-/Konfigurationspakete nur mit einer Prüfsumme, nicht mit einer kryptografischen Herkunftsprüfung. Für vertrauenswürdige Manager-Pakete Signatur oder HMAC vorsehen.
- Reconcile sendet die vollständige lokale Transaktions-ID-Liste unsegmentiert. Der aktuelle Gateway-Vertrag begrenzt die ID-Liste auf 5000; für größere Journale sind Chunking/Paginierung erforderlich.
- Failover-Sync wird im 5-Sekunden-Takt angestoßen und kann nach leerer Queue erneut einen Voll-Reconcile auslösen. Bei wachsendem Journal sollte Reconcile separat gedrosselt und ereignisbasiert ausgeführt werden.
- Die lokale Transaktions-Prüfkette ist gut geeignet, nachträgliche Änderungen zu erkennen, ist aber ohne externe Verankerung nicht gegen einen Angreifer geschützt, der den gesamten lokalen Datenbestand und alle Hashes neu schreiben kann.
- Dynamische Katalog-/Warenkorbwerte werden teilweise über `innerHTML` aufgebaut. Importdaten werden an mehreren Stellen bereits bereinigt; die vollständige Stored-DOM-XSS-Kette ist trotzdem noch nicht abgeschlossen geprüft.
- Der Admin-Kontext setzt eine vorhandene `adminSession` beim Permission-Check wieder auf `valid:true`; eine feste maximale Sessiondauer bzw. Inaktivitätsablauf ist im geprüften Pfad nicht erkennbar.
- Der lokale PIN-Schutz nutzt eine vierstellige PIN und sperrt nach fünf Fehlversuchen für 30 Sekunden. Für einen unbeaufsichtigten/gestohlenen Kassenclient sollte die Rate-Limit-/Step-Up-Strategie stärker und eskalierend ausgelegt werden.
- Die PBKDF2-Iterationszahl der importierten Superadmin-PIN wird aus dem Freigabepaket übernommen; eine obere/untere Grenze ist im Loginpfad noch nicht erkennbar.
- Dateiimporte lesen die gewählte Datei zunächst vollständig über `File.text()`. Eine explizite Vorabgrenze der Importdateigröße ist in den geprüften Pfaden nicht erkennbar.
- `ProductInfoCore` kann einen Datensatz als `approved` akzeptieren, wenn Quelle und Freigabedatum gesetzt sind, auch wenn Big-14-Felder weiterhin `not-checked` sind. Das ist ein Datenqualitäts-/Freigabepunkt für Produkt- und Allergeninformationen.

## Bereits eingeführte Abhilfe auf der Audit-Spur

- Automatischer statischer Release-Gate-Test `tests/tuv-security-release-gate.test.cjs` wurde um Finanz-Autorisierung, Step-Up, Bargeld-QR-Herkunft, Restore-Integrität und Reconcile-Skalierung erweitert.
- CI beobachtet POS-, SecurityCore-, AuditCore-, HealthCore-, Local-Vault-, Monitor- und Failover-relevante Dateien und läuft auf der Audit-Spur auch bei Pull Requests gegen `main`.
- `AuditCore` V0.2.1 entfernt nun zusätzlich Authorization-Header, API-Keys, Private Keys, Service-Role- und Recovery-Felder aus Audit-Metadaten. Regressionstest: `tests/audit-core-redaction.test.cjs`.
- `HealthCore` V1.0.1 redigiert Geheimnisse auch aus generischen Fehlertexten und sanitisiert den kompletten Diagnose-Status vor dem Export. Regressionstest: `tests/health-core-redaction.test.cjs`.
- `KCSecureSync` V0.3.1 begrenzt PBKDF2-Iterationswerte und Paketgrößen und validiert Salt-/IV-Längen vor der teuren Entschlüsselung. Regressionstest: `tests/secure-sync-envelope.test.cjs`.
- Der Failover-Monitor rendert externe Gateway-Statuswerte auf der Audit-Spur nicht mehr per `innerHTML`, sondern über `textContent`/DOM-Knoten. Regressionstest: `tests/failover-monitor-xss.test.cjs`.
- Die CI führt alle normalen Regressionstests vor dem absichtlich strengen Release-Gate aus. Dadurch ist sichtbar, ob eine Audit-Härtung technisch sauber bleibt, obwohl die Freigabe wegen bekannter Blocker weiterhin rot ist.
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
- Finanzielle Aktionen auf der Audit-Spur mit SecurityCore-Rechten und echter Step-Up-Prüfung kapseln; anschließend UI-/Regressionstest, bevor irgendein Merge diskutiert wird.
- Admin-Sessiondauer, PIN-KDF-Grenzen und eskalierendes Rate-Limit zuerst im Audit-Zweig entwerfen und testen.
- Bargeld-QR und Manager-Austauschpakete auf kryptografische Herkunftsprüfung umstellen; alte Formate nur kontrolliert migrieren.
- Restore-Pfad mit Hash-/Kettenprüfung und Quarantäne für ungültige Remote-Datensätze versehen.
- Reconcile paginieren/chunken und vom 5-Sekunden-Sync entkoppeln.
- Importgrößen begrenzen und ProductInfo-Freigaberegeln gegen die fachlich tatsächlich erforderlichen Pflichtangaben testen.
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
