# KC Communication 1.0 – Testreife

Entwicklungszweig: `feature/kc-platform-foundation`

## Ziel
Ein zentraler Kommunikationsdienst für alle KC-Fachprogramme. Fachprogramme stoßen nur standardisierte Aufträge an. Providerzugänge, Vorlagen, Zeitregeln, Retry, Fallback, Historie und Zustellstatus werden zentral verarbeitet.

## Register
- Dashboard
- Push
- E-Mail
- SMS
- WhatsApp
- Vorlagen
- Programme & Schnittstellen
- Historie
- Testcenter

## Serverseitige Komponenten
- `kc-communication-api` v3: Status, Test-/Versandauftrag, Idempotenz, Korrelations-ID, Request-/Event-Abfrage.
- `kc-communication-dispatch` v1: Web-Push, Resend, Brevo, Retry/Backoff, Dead-Letter, Providerstatus.
- `kc-communication-provider-health` v2: reale Secret-/Readiness-Prüfung ohne Geheimnisse auszugeben.
- `kc-communication-health`: zentraler Systemstatus.
- `kc-communication-dry-run`: Payload- und Dry-Run-Prüfung.
- `kc-communication-push-devices` v2: eigenständige, JWT-geschützte KC-Communication-Geräteregistrierung und Testversand an das eigene Gerät.

## Schutzmechanismen
- Provider-Secrets ausschließlich serverseitig.
- Keine Klartext-Secrets im Browser oder GitHub.
- RLS auf allen Communication-Tabellen; kein direkter Fachprogramm-/Browserzugriff.
- Globaler Killswitch `dispatch_enabled` standardmäßig `false`.
- Programme sind vorbereitet, aber `canSend=false` bis zur bewussten Freigabe.
- Idempotenz eindeutig pro Quellprogramm.
- Korrelations-ID für Ende-zu-Ende-Nachverfolgung.
- Retry mit exponentiellem Backoff.
- Dead-Letter nach konfigurierbarer Zahl von Fehlversuchen.
- Queue-Locking/Claiming gegen parallele Doppelverarbeitung.
- Rate-Limit-Konfiguration.
- Quiet Hours standardmäßig 22:00–07:00 Europe/Berlin.
- Delivery-Event-Historie.
- Abgelaufene Web-Push-Subscriptions werden bei HTTP 404/410 deaktiviert.

## Eigenständige Anmeldung und Push-Geräte
KC Communication verwendet eine eigene Supabase-Anmeldung im Communication-Frontend. Die Geräteverwaltung ist nicht von KC DP2 abhängig.

- Eigene Tabelle `kc_communication_push_devices`.
- Geräte werden ausschließlich dem aktuell authentifizierten KC-Communication-Benutzer zugeordnet.
- Der Browser erzeugt die Subscription erst nach einer ausdrücklichen Benutzeraktion.
- Bei manueller Neuregistrierung wird eine vorhandene Browser-Subscription bewusst verworfen und frisch erzeugt.
- Die vollständige Subscription bleibt serverseitig; in der UI erscheint nur ein gekürzter Endpoint-Hinweis.
- Deaktivieren und Löschen funktionieren nur für eigene Geräte.
- `Test an dieses Gerät` sendet ausschließlich an ein eigenes aktives Gerät.
- Der frühere temporäre One-Shot-Test ist geschlossen und wieder JWT-geschützt.
- Bestehende DP2-Subscriptions werden nicht übernommen und nicht verändert.

## Providerstatus
### Push
- Web Push / VAPID: Outbound-Adapter implementiert.
- Bestehende DP2-VAPID-Secrets können serverseitig während der Migration als Fallback weiterverwendet werden; KC-Communication-eigene Secret-Namen haben Vorrang.
- Test kann gezielt auf ein eigenes registriertes Communication-Gerät begrenzt werden.

### E-Mail
- Resend: Outbound-Adapter implementiert; API-Key + Absenderadresse erforderlich.
- Brevo: Outbound-Adapter implementiert; API-Key + Absenderadresse erforderlich.
- Beide Provider bleiben bis zum echten Test deaktiviert.

### SMS / WhatsApp
- Datenmodell, UI, Request-Vertrag, Queue und Dry-Run vorhanden.
- Echter Provider noch nicht ausgewählt/eingerichtet.

## Statusmaschine
`queued → processing → provider_accepted/sent → delivered/opened`

Fehlerpfad:
`processing → retry_scheduled → processing ... → dead_lettered`

Weitere zulässige Zustände: `scheduled`, `partially_sent`, `failed`, `cancelled`, `suppressed`, `expired`.

## Erste echte Testfreigabe
Die erste echte Nachricht wird ausschließlich als isolierter Systemtest gesendet; kein Fachprogramm wird dabei angebunden.

1. Bei KC Communication anmelden.
2. Ein Gerät direkt in der Push-Registerkarte registrieren.
3. Prüfen, dass genau dieses Gerät in `kc_communication_push_devices` aktiv erscheint.
4. `Test an dieses Gerät` verwenden.
5. Inhalt eindeutig mit `KC Communication – TEST` kennzeichnen.
6. Providerantwort und Gerätestatus prüfen.
7. Bei 404/410 Gerät automatisch deaktivieren.
8. Erst nach erfolgreichem Push-Test denselben Ablauf für E-Mail durchführen.

## Regression
Ein transaktionaler Datenbanktest der erweiterten Statusmaschine (`queued`, `retry_scheduled`, `dead_lettered`) wurde erfolgreich durchgeführt und danach vollständig zurückgerollt. Dadurch entstand kein Versand und kein persistenter Testauftrag.

## Migrationsprinzip
Bestehende Programme werden nicht per Big Bang umgebaut. Kein KC-Fachprogramm ist aktuell an KC Communication angeschlossen. Eine spätere DP2-Anbindung erfolgt erst nach erfolgreichen isolierten Push- und E-Mail-Systemtests und einer Regression des bisherigen DP2-Verhaltens.
