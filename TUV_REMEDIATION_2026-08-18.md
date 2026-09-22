# KC Bilderkasse – TÜV Remediation 2026-08-18

## Schutzregel

Diese Prüfspur darf den laufenden Produktionsstand nicht verändern. Änderungen erfolgen ausschließlich auf `audit/tuv-hardening-2026-08-18` und werden nicht automatisch gemergt oder ausgerollt.

## Status des automatisierten Release-Gates

Der aktuelle vollständige CI-Lauf ist auf dem Audit-Zweig **grün**. Der Lauf `KC Failover Regression #82` einschließlich DOM-Safety- und CSP-Regressionsprüfung ist erfolgreich abgeschlossen. Das TÜV-Security-Release-Gate meldet **keinen erkannten kritischen Release-Blocker** mehr.

Die sechs zuletzt offenen POS-Blocker sind auf der Audit-Spur technisch beseitigt und durch Regressionstests abgesichert:

1. `DEV_ADMIN_ACCESS` ist deaktiviert.
2. Der sichtbare und der latente Candidate-Entwicklerzugang `developerAdminLogin` wurden entfernt.
3. Rabatt ist im tatsächlichen Handler an `requirePermission("discount.apply")` gebunden.
4. Entnahme/Reklamationsauszahlung ist im tatsächlichen Handler an `requirePermission("cash.withdraw")` gebunden.
5. Tagesabschluss ist im tatsächlichen Erzeugungsweg an `requirePermission("closing.execute")` gebunden.
6. `KCASH1` wird fail-closed abgelehnt; Bargeldübergaben verwenden auf der Audit-Spur `KCASH2` mit HMAC-SHA-256, Kassen-/Datumsbindung und Gültigkeitsfenster.

Zusätzlich verlangt `SecurityCore` für Rabatt, Entnahme und Tagesabschluss standardmäßig eine frische PIN-/QR-Step-Up-Freigabe. Ein Entwickler-Login kann Step-Up nicht erfüllen.

Der frühere Restore-Integritätsblocker ist ebenfalls beseitigt: neue Failover-Uploads erhalten einen stabilen `KC_TX_DIGEST_V1`-Digest; Restore-Datensätze werden vor dem lokalen Merge verifiziert. Manipulierte Remote-Daten werden fail-closed abgelehnt.

Die zuvor offene kryptografische Herkunftsprüfung für KCB-Austauschpakete ist auf der Audit-Spur ebenfalls umgesetzt: `KCB-CONFIG-1` und `KCB-EVENT-1` werden über `KCB-HMAC-SHA256-1` authentifiziert. Manipulierte, abgelaufene, nicht freigegebene und reine Prüfsummen-Legacy-Pakete werden fail-closed abgelehnt. Export und Import bleiben gesperrt, solange das Authentifizierungsmodul bzw. der geschützte Schlüssel nicht betriebsbereit ist.

Die zuvor offene Stored-DOM-XSS-Strecke ist auf der Audit-Spur ebenfalls gehärtet: `DomSafetyCore` wird vor dem ersten POS-Render geladen, kapselt nachfolgende `innerHTML`-Zuweisungen und entfernt ausführbare Tags/Attribute, unsichere URL-Schemata und nicht freigegebene Inline-Styles. Der PC-Manager-Failover-/Super-GAU-Monitor rendert Gateway-, Test- und Historienwerte zusätzlich ausschließlich über sichere DOM-Methoden und `textContent`.

Die POS-CSP ist auf der Audit-Spur aktiviert und regressionsgeprüft. Sie blockiert nicht freigegebene Inline-/Event-Skripte, Objekte, Framing und unsichere Basis-URLs. Die beiden bestehenden Druckhelfer bleiben ausschließlich über feste SHA-256-CSP-Hashes zugelassen. `style-src` bleibt wegen vorhandener Inline-Layoutregeln gezielt auf `'self' 'unsafe-inline'`; Script-Inline-Ausführung bleibt dagegen gesperrt.

## Verbleibende Warnungen / getrennte Freigabestrecken

Der aktuelle TÜV-Gate-Lauf meldet weiterhin Warnungen, aber keine Blocker:

- Der frühere `KCB-CHECK-1`-Prüfsummenpfad ist im Legacy-Code von `pos/app.js` noch physisch vorhanden. Der Audit-Runtimepfad überschreibt und sperrt diesen Pfad fail-closed. Vor einer finalen Produktionskonsolidierung soll der tote Legacy-Code entfernt werden.
- `fiscalMode` steht standardmäßig auf `off`. TSE/KassenSichV bleibt eine eigene fachlich-regulatorische Freigabestrecke.

Weitere Rollout-/Härtungspunkte außerhalb des aktuellen Blocker-Gates:

- **KCB-Provisionierung:** Vor einem späteren produktiven Rollout muss `kc_exchange_secret_v2` nach dem vorgesehenen Schlüsselkonzept sicher im Local Vault provisioniert und mit dem autorisierten externen Manager abgestimmt werden. Ohne mindestens 32 Zeichen langes geschütztes Geheimnis bleibt der KCB-Austausch gesperrt.
- **KCB-Legacy:** Reine `KCB-CHECK-1`-/`KC_EXCHANGE_PACKAGE`-Pfade sind für vertrauenswürdige Konfigurationsimporte nicht mehr ausreichend und werden vom neuen Audit-Laufzeitpfad gesperrt. Eine eventuelle Bestandsmigration muss separat erfolgen.
- **KCASH2-Provisionierung:** Vor einem späteren produktiven Rollout muss `kc_cash_transfer_secret_v2` je vorgesehenem Sicherheitskonzept sicher provisioniert werden. Ohne mindestens 32 Zeichen langes, im Local Vault geschütztes Geheimnis verweigert der KCASH2-Pfad die Verarbeitung.
- **Legacy-KCASH1:** Alte `KCASH1`-Codes werden bewusst nicht mehr akzeptiert. Eine eventuelle Migration muss separat, kontrolliert und nachvollziehbar erfolgen.
- **Legacy-Restore:** Bereits früher gespeicherte Remote-Transaktionen ohne `KC_TX_DIGEST_V1` werden nicht ungeprüft übernommen. Altbestände müssen vor Rollout migriert, archiviert oder als Legacy-Quarantäne behandelt werden.
- Der lokale PIN-Schutz nutzt weiterhin eine vierstellige PIN und sperrt nach fünf Fehlversuchen für 30 Sekunden. Eine eskalierende Rate-Limit-Strategie bleibt sinnvoll.
- Die PBKDF2-Iterationszahl der importierten Superadmin-PIN sollte im Loginpfad zusätzlich klar nach oben und unten begrenzt werden.
- Der KCB-Austausch begrenzt neue Importdateien im gehärteten Audit-Pfad auf 5 MiB. Andere Dateiimporte sollen weiterhin vor `File.text()` auf explizite Größenlimits geprüft werden.
- Supabase-EXECUTE- und Cron-Grants sollten nach Funktionsbedarf minimiert werden, jedoch erst nach Abhängigkeits- und Regressionstest.

## Bereits eingeführte und getestete Abhilfe auf der Audit-Spur

- `AuditCore` V0.2.1 redigiert Authorization-Header, API-Keys, Private Keys, Service-Role-, Recovery- und weitere Geheimnisfelder. Regression: `tests/audit-core-redaction.test.cjs`.
- `HealthCore` V1.0.1 redigiert Geheimnisse auch aus generischen Fehlertexten und Diagnoseexporten. Regression: `tests/health-core-redaction.test.cjs`.
- `KCSecureSync` V0.3.1 begrenzt PBKDF2-Aufwand und Paketgrößen und validiert Salt-/IV-Längen. Regression: `tests/secure-sync-envelope.test.cjs`.
- `SecurityCore` V0.3.1 erzwingt fail-closed Berechtigungen, maximale Sessiondauer und frisches Step-Up; finanzielle Aktionen Rabatt, Entnahme und Tagesabschluss sind standardmäßig Step-Up-pflichtig. Regression: `tests/security-core-stepup.test.cjs`.
- `ProductInfoCore` V0.2.0 erlaubt `approved` nur mit Quelle, Freigabedatum, freigebender Person und vollständig geprüften Big-14-Allergenen. Regression: `tests/product-info-approval.test.cjs`.
- Der Failover-/Super-GAU-Monitor rendert externe Gateway-Statuswerte, Testresultate und Historieneinträge über sichere DOM-Methoden. Regression: `tests/failover-monitor-xss.test.cjs`.
- `DomSafetyCore` V0.1.0 filtert dynamisches HTML vor dem Rendern, entfernt Script-/Frame-/Object-/SVG-/Math-Pfade, Eventattribute, `srcdoc`, unsichere URL-Schemata und nicht freigegebene Inline-Styles. Regression: `tests/dom-safety-core.test.cjs`.
- Der POS-Audit-Runtimepfad lädt `DomSafetyCore` vor `TransactionIntegrityCore`, `CashTransferAuthCore`, `KCBExchangeAuth`, Dual-Gateway-Bootstrap und dem verschlüsselten Local Vault. Regression: `tests/runtime-bootstrap.test.cjs`.
- Die POS-CSP in `netlify.toml` setzt u. a. `default-src 'self'`, `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'`, `script-src-attr 'none'`, einen auf Self plus zwei feste Druckskript-Hashes beschränkten `script-src`, sowie kontrollierte Worker-/Image-/Connect-Regeln. Regression: `tests/csp-policy.test.cjs`.
- `KCBExchangeAuth` V1.0.0 authentifiziert `KCB-CONFIG-1` und `KCB-EVENT-1` mit HMAC-SHA-256 (`KCB-HMAC-SHA256-1`). Der POS-Bootstrap signiert Exporte, verifiziert Importe vor der Übernahme, blockiert Prüfsummen-Legacy-Pakete und sperrt den Austausch fail-closed, wenn Authentifizierungsmodul oder Schlüssel fehlen. Regressionen: `tests/exchange-auth-core.test.cjs` und `tests/kcb-exchange-pos-bootstrap.test.cjs`.
- `CashTransferAuthCore` V0.1.0 stellt `KCASH2` mit HMAC-SHA-256, Kassenbindung, Gültigkeitszeitraum und Manipulationserkennung bereit. Neue Bargeldübergaben werden signiert und codiert; Import und Scanner verifizieren vor der Übernahme. `KCASH1` wird explizit gesperrt. Regressionen: `tests/cash-transfer-auth-core.test.cjs` und `tests/pos-financial-security.test.cjs`.
- Der Candidate-Entwickler-Bypass wurde auf der Audit-Spur deaktiviert und die sichtbare/latente Entwickler-Anmeldung entfernt. `tests/pos-financial-security.test.cjs` verhindert eine Wiederkehr.
- Rabatt, Entnahme/Reklamation und Tagesabschluss sind im echten POS-Ausführungsweg an SecurityCore-Rechte gebunden. `tests/pos-financial-security.test.cjs` prüft diese Bindung statisch zusätzlich zum SecurityCore-Verhaltenstest.
- Failover-Client V1.4 signiert `/sync/*`-Anfragen mit HMAC-SHA-256, Geräte-ID, Zeitstempel und Nonce. Das Gerätegeheimnis ist an den Local Vault gebunden; ohne Provisionierung wird fail-closed abgebrochen.
- Reconcile arbeitet in maximal 1000er ID-Chunks, liest Remote-IDs und Restore-Daten in 500er Seiten und drosselt automatisch ausgelöste Voll-Reconciles auf mindestens 60 Sekunden Abstand. Die Skalierungsregression prüft 1205 IDs.
- `TransactionIntegrityCore` V0.1.0 erzeugt kanonische SHA-256-Inhaltsdigests. Uploads tragen `KC_TX_DIGEST_V1`; Restore verifiziert den Digest und verweigert manipulierte Daten. Regressionen: `tests/transaction-integrity-core.test.cjs` und `tests/failover-sync.test.cjs`.
- Das Gateway-Audit-Gegenstück besitzt HMAC-Geräteauthentifizierung, Zeitfenster, Nonce-Replay-Schutz, Geräte-zu-Kassen-Bindung, Origin-Allowlist, Rate-Limit, getrennte Diagnoseberechtigung sowie Cursor-Paging und begrenzten Membership-Reconcile. Der Gateway-Draft-PR ist auf seiner Audit-Spur vollständig grün.
- Netlify erhält auf der Audit-Spur `Strict-Transport-Security: max-age=31536000` sowie die getestete POS-CSP. Es erfolgte kein Deployment.
- Der zwischenzeitlich neue `main`-Stand mit dem benutzerfreundlichen Super-GAU-Testcenter wurde in die Audit-Spur übernommen und mit der vorhandenen XSS-Härtung konfliktfrei konsolidiert. `main` selbst wurde dabei nicht verändert.

## Aktueller CI-Nachweis

Der vollständige Lauf `KC Failover Regression #82` bestätigt erfolgreich:

- Syntaxchecks,
- AuditCore Secret-Redaction,
- HealthCore Secret-Redaction,
- SecureSync Envelope/KDF,
- SecurityCore Finanz-Step-Up und Sessionablauf,
- Failover-/Super-GAU-Monitor-XSS,
- DOM-Safety,
- CSP-Policy,
- ProductInfo-Freigabe,
- Runtime-Bootstrap einschließlich DOM-Safety, KCASH2 und KCB-Austauschauthentifizierung,
- Transaction-Integrity,
- KCASH2-Authentizität,
- KCB-HMAC-Authentizität und POS-Integrationspfad,
- POS-Finanzautorisierung und Entfernung des Entwickler-Bypasses,
- verschlüsselten Local Vault,
- Dual-Gateway-Failover,
- Offline-Queue, Replay, Reconcile, Konflikterhalt, Restore-Manipulation, Chunking, Paging und Drosselung,
- TÜV-Security-Release-Gate.

Ergebnis des Gate-Tests: `PASS: Keine durch diesen Gate-Test erkannten Release-Blocker.`

## Read-only Live-Prüfung Datenbanken

### Supabase KC Core

- 1 Auth-Benutzer, davon 0 anonym.
- Die vom Advisor gemeldeten Admin-`SECURITY DEFINER`-Funktionen prüfen intern die angemeldete Rolle (`planner`, `duty_manager`, `admin`) bzw. binden Push-Receipts an `auth.uid()`. Breite EXECUTE-Grants bleiben ein Härtungspunkt.
- `kc_dp_report_error` ist absichtlich auch anonym aufrufbar, begrenzt Eingaben und besitzt für nicht angemeldete Aufrufer ein IP-basiertes Rate-Limit.

### Supabase Future Academy

- 38 Auth-Benutzer, davon 35 anonyme Auth-Sitzungen; dies passt zum anonymen Teilnehmermodell.
- Academy-Policies binden Teilnehmer- und Ereignisdaten an `owner_id = auth.uid()`.
- KC-DP-Policies verwenden zusätzlich `kc_dp_is_permanent_user()`, das Nutzer mit `is_anonymous=true` ausschließt.
- `cron.job` und `cron.job_run_details` besitzen breite SELECT-Rechte, die RLS-Policy begrenzt sichtbare Zeilen jedoch auf `username = CURRENT_USER`; Rechte später nach Funktionsbedarf minimieren.

### Neon KC Core Mirror

- Für `kc_failover_transactions` existiert die eingeschränkte Rolle `kc_gateway_runtime` mit nur `SELECT` und `INSERT`; es wurden keine PUBLIC-Tabellenrechte gefunden.
- Letzter geprüfter verschlüsselter Backup-Satz: 36/36 Tabellen erfolgreich; Restore-/Integritätsprüfung 36 geprüft, 0 Fehler.

## Nächste sichere Schritte

1. Audit-Draft weiter unveröffentlicht lassen und keine automatische Freigabe aus dem grünen Gate ableiten.
2. KCB- und KCASH2-Geheimnisse sowie Legacy-Regeln für einen späteren Rollout separat provisionieren und mit den autorisierten Gegenstellen testen.
3. Den physisch verbliebenen `KCB-CHECK-1`-Legacy-Code bei der finalen Produktionskonsolidierung entfernen, ohne den laufenden Stand vorzeitig zu verändern.
4. PIN-/weitere Import-Härtung und Supabase-Grants separat bearbeiten.
5. TSE/KassenSichV als eigene fachlich-regulatorische Freigabestrecke abschließen.

## Nicht durchgeführt

- Keine Änderung an `main`.
- Kein Merge von PR #2.
- Kein Deployment.
- Keine Supabase-Migration.
- Keine Neon-Schemaänderung.
- Keine Provisionierung oder Rotation produktiver Secrets/Tokens.
- Keine Änderung an Cloudflare-/Netlify-Produktivkonfigurationen.
