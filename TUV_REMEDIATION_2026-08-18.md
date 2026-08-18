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
- Local-Vault-Kryptografie und ausgeschalteter Fiskalmodus werden als Prüfpunkte ausgewiesen.

## Nächste sichere Schritte

- Entwickler-Bypass in einer isolierten Änderung entfernen und alle bestehenden Regressionstests ausführen.
- Danach UI-Test des Service-/Admin-Zugangs mit PIN und Superadmin-QR durchführen.
- DOM-XSS-Datenwege von Manager/Import bis `innerHTML` vollständig nachverfolgen und dynamische Werte konsequent escapen bzw. mit DOM-APIs setzen.
- TSE/KassenSichV getrennt als fachliche Freigabestrecke behandeln.

## Nicht durchgeführt

- Keine Änderung an `main`.
- Kein Deployment.
- Keine Supabase-Migration.
- Keine Neon-Schemaänderung.
- Keine Änderung an produktiven Secrets, Tokens oder Cloud-Konfigurationen.
