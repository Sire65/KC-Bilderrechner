# KC Bilderkasse – TÜV Remediation 2026-08-18

## Schutzregel

Diese Prüfspur darf den laufenden Produktionsstand nicht verändern. Änderungen erfolgen ausschließlich auf `audit/tuv-hardening-2026-08-18` und werden nicht automatisch gemergt oder ausgerollt.

## Aktuell verbleibende Release-Blocker

Der automatisierte TÜV-Gate-Test weist derzeit **sechs** kritische Punkte aus:

1. `DEV_ADMIN_ACCESS=true` in `pos/app.js`.
2. Sichtbarer Candidate-Entwicklerzugang `developerAdminLogin` in `pos/index.html`.
3. Rabatt ist im tatsächlichen Ausführungsweg noch nicht an `requirePermission("discount.apply")` gebunden.
4. Entnahme/Reklamationsauszahlung ist im tatsächlichen Ausführungsweg noch nicht an `requirePermission("cash.withdraw")` gebunden.
5. Tagesabschluss ist im tatsächlichen Ausführungsweg noch nicht an `requirePermission("closing.execute")` gebunden.
6. Das produktiv verwendete Altformat `KCASH1` besitzt nur eine nicht-kryptografische Prüfsumme und damit keine Herkunftsauthentifizierung.

Der frühere Restore-Integritätsblocker ist auf der Audit-Spur beseitigt: neue Failover-Uploads erhalten einen stabilen `KC_TX_DIGEST_V1`-Digest; Restore-Datensätze werden vor dem lokalen Merge verifiziert und Transportmetadaten anschließend wieder entfernt. Manipulierte Remote-Daten werden fail-closed abgelehnt.

## Getrennte Freigabestrecken und verbleibende Warnungen

Der aktuelle TÜV-Gate-Lauf meldet nur noch vier Warnklassen:

- **Legacy-Restore-Migration:** Bereits früher gespeicherte Remote-Transaktionen ohne `KC_TX_DIGEST_V1` werden vom neuen Restore bewusst nicht ungeprüft übernommen. Vor einem späteren Deployment muss entschieden werden, ob vorhandene Altbestände kontrolliert migriert, archiviert oder als Legacy-Quarantäne behandelt werden.
- Der produktive TSE-/KassenSichV-Adapter ist weiterhin eine eigene fachlich-regulatorische Freigabestrecke; `fiscalMode` steht standardmäßig auf `off`.
- `KCB-CHECK-1` schützt Austausch-/Konfigurationspakete nur mit einer Prüfsumme, nicht mit einer kryptografischen Herkunftsprüfung. Für vertrauenswürdige Manager-Pakete Signatur oder HMAC vorsehen.
- Dynamische Katalog-/Warenkorbwerte werden teilweise über `innerHTML` aufgebaut. Die vollständige Stored-DOM-XSS-Kette ist noch nicht abgeschlossen geprüft.
- Netlify besitzt auf der Audit-Spur jetzt einen HSTS-Header. Eine getestete Content-Security-Policy fehlt weiterhin; sie darf wegen vorhandener Inline-/Service-Worker-Pfade nicht blind aktiviert werden.

Zusätzlich bleiben als Härtungsaufgaben außerhalb des aktuellen Gate-Outputs:

- Der lokale PIN-Schutz nutzt weiterhin eine vierstellige PIN und sperrt nach fünf Fehlversuchen für 30 Sekunden. Eine stärkere eskalierende Rate-Limit-Strategie bleibt sinnvoll.
- Die PBKDF2-Iterationszahl der importierten Superadmin-PIN wird im Loginpfad noch nicht mit einer klaren Ober-/Untergrenze validiert.
- Dateiimporte lesen ausgewählte Dateien zunächst vollständig über `File.text()`. Eine explizite Vorabgrenze der Importdateigröße ist noch nicht nachgewiesen.

## Bereits eingeführte und getestete Abhilfe auf der Audit-Spur

- `AuditCore` V0.2.1 entfernt Authorization-Header, API-Keys, Private Keys, Service-Role-, Recovery- und weitere Geheimnisfelder aus Audit-Metadaten. Regressionstest: `tests/audit-core-redaction.test.cjs`.
- `HealthCore` V1.0.1 redigiert Geheimnisse auch aus generischen Fehlertexten und sanitisiert den Diagnose-Status vor dem Export. Regressionstest: `tests/health-core-redaction.test.cjs`.
- `KCSecureSync` V0.3.1 begrenzt PBKDF2-Iterationswerte und Paketgrößen und validiert Salt-/IV-Längen vor der Entschlüsselung. Regressionstest: `tests/secure-sync-envelope.test.cjs`.
- `SecurityCore` V0.3.0 erzwingt fail-closed Berechtigungen, maximale Sessiondauer und frisches Step-Up. Ein Entwickler-Login erfüllt Step-Up ausdrücklich nicht. Regressionstest: `tests/security-core-stepup.test.cjs`.
- `ProductInfoCore` V0.2.0 erlaubt `approved` nur noch mit Quelle, Freigabedatum, freigebender Person und vollständig geprüften Big-14-Allergenen. Regressionstest: `tests/product-info-approval.test.cjs`.
- Der Failover-Monitor rendert externe Gateway-Statuswerte auf der Audit-Spur über sichere DOM-Methoden statt über ungeprüftes `innerHTML`. Regressionstest: `tests/failover-monitor-xss.test.cjs`.
- Der POS-Audit-Runtimepfad bindet `TransactionIntegrityCore`, Dual-Gateway-Bootstrap und den verschlüsselten Local Vault ein. Regressionstest: `tests/runtime-bootstrap.test.cjs`.
- Failover-Client V1.4 signiert `/sync/*`-Anfragen mit HMAC-SHA-256, Geräte-ID, Zeitstempel und Nonce. Das Gerätegeheimnis muss aus einem durch den Local Vault geschützten Schlüssel kommen; ohne Provisionierung wird fail-closed abgebrochen.
- Reconcile arbeitet clientseitig in maximal 1000er ID-Chunks, liest Remote-IDs und Restore-Daten in 500er Seiten und drosselt automatisch ausgelöste Voll-Reconciles auf mindestens 60 Sekunden Abstand. Die Skalierungsregression prüft 1205 IDs, mehrere Paging-Aufrufe und einen maximalen Reconcile-Batch von 1000.
- `TransactionIntegrityCore` V0.1.0 erzeugt rekursiv kanonische SHA-256-Inhaltsdigests. Der Failover-Client versieht neue Uploads mit diesem Digest, verifiziert Remote-Datensätze vor Restore und verweigert einen Merge bei fehlendem oder falschem Digest. Regressionen prüfen sowohl erfolgreiche Wiederherstellung als auch manipulierte Remote-Daten. `tests/transaction-integrity-core.test.cjs` und `tests/failover-sync.test.cjs`.
- Das Gateway-Audit-Gegenstück besitzt HMAC-Geräteauthentifizierung, Zeitfenster, Nonce-Replay-Schutz, Geräte-zu-Kassen-Bindung, Origin-Allowlist, Rate-Limit, getrennte Diagnoseberechtigung sowie Cursor-Paging und begrenzten Membership-Reconcile. Der Gateway-PR besteht Auth-, Paging- und TÜV-Regression vollständig grün. Das gilt nur für den Audit-Zweig; Produktion ist dadurch nicht verändert.
- `CashTransferAuthCore` V0.1.0 definiert das neue Format `KCASH2` mit HMAC-SHA-256, Kassenbindung, Gültigkeitszeitraum und Manipulationserkennung. Regressionstest: `tests/cash-transfer-auth-core.test.cjs`. Das aktuell verwendete `KCASH1` bleibt bis zur kontrollierten Integration/Migration ein Blocker.
- Netlify erhält auf der Audit-Spur `Strict-Transport-Security: max-age=31536000`. Es erfolgte kein Deployment.
- Die CI führt alle normalen Regressionstests vor dem absichtlich strengen Release-Gate aus. Der aktuelle Lauf bestätigt: Syntax, AuditCore, HealthCore, SecureSync, SecurityCore, Monitor-XSS, ProductInfo, Runtime-Bootstrap, TransactionIntegrity, KCASH2, Local Vault, Dual-Gateway sowie Offline-/Replay-/Reconcile-/Conflict-, Restore-Manipulations-, Chunking-, Paging- und Drosselungstests sind grün. Erst das Release-Gate stoppt erwartungsgemäß wegen der sechs verbleibenden Punkte.

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

- `KCASH2` kontrolliert in Erzeugung und Einlesepfad integrieren; `KCASH1` danach nur noch explizit als Legacy-Migration akzeptieren oder vollständig sperren.
- Entwickler-Bypass und sichtbare Candidate-Schaltfläche in einer isolierten Änderung entfernen.
- Rabatt, Entnahme/Reklamation und Tagesabschluss im echten Handler an SecurityCore-Rechte binden und anschließend UI-/Regressionstest durchführen.
- Vor einem späteren Failover-Deployment die Behandlung bereits vorhandener Remote-Datensätze ohne neuen Digest festlegen und testen.
- PIN-KDF-Grenzen, eskalierendes Rate-Limit und Importgrößenbegrenzung ergänzen.
- DOM-XSS-Datenwege von Manager/Import bis `innerHTML` vollständig nachverfolgen und dynamische Werte konsequent escapen bzw. mit DOM-APIs setzen.
- CSP erst nach Kompatibilitätstest mit den vorhandenen Inline-/Service-Worker-Pfaden aktivieren.
- Supabase-EXECUTE- und Cron-Grants nach Funktionsbedarf minimieren, aber erst nach Abhängigkeits-/Regressionstest.
- TSE/KassenSichV getrennt als fachliche Freigabestrecke behandeln.

## Nicht durchgeführt

- Keine Änderung an `main`.
- Kein Deployment.
- Keine Supabase-Migration.
- Keine Neon-Schemaänderung.
- Keine Änderung an produktiven Secrets, Tokens oder Cloud-Konfigurationen.
