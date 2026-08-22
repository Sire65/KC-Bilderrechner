# KC Communication – Dispatch Engine 1.0

## Ziel
Zentraler Worker zwischen Queue und Provideradaptern. Kein Fachprogramm spricht einen Provider direkt an.

## Ablauf
1. Auftrag authentisieren / Programmrecht prüfen.
2. Idempotency-Key prüfen.
3. Vorlage rendern und Pflichtvariablen validieren.
4. Empfänger und Kommunikationsfreigaben auflösen.
5. Kanalberechtigung prüfen.
6. Quiet Hours / geplanten Zeitpunkt prüfen.
7. Rate Limit prüfen.
8. Queue-Claim mit Lock durchführen.
9. passenden Provideradapter auswählen.
10. Versand ausführen.
11. provider_message_id und Delivery-Event speichern.
12. bei temporärem Fehler Retry mit exponentiellem Backoff.
13. bei permanentem Fehler oder Max-Attempts Dead-Letter.
14. optional Fallback-Kanal als neuen korrelierten Auftrag erzeugen.

## Retry-Klassen
- retryable: HTTP 408, 425, 429, 5xx, Netzwerkfehler, Provider timeout.
- permanent: ungültiger Empfänger, Auth/Secret ungültig, Template nicht freigegeben, 4xx außer Retry-Klassen.
- stale subscription: Push 404/410 -> Subscription deaktivieren; Auftrag je nach Empfängerlage abschließen.

## Backoff
`min(retry_max_seconds, retry_base_seconds * 2^(attempt-1))` plus kleiner Jitter.

## Provideradapter
### Web Push
- Web Push / VAPID
- TTL und urgency
- Subscription-Status
- 404/410 Cleanup
- opened/acknowledged Event

### E-Mail / Resend
- API-Key ausschließlich serverseitig
- From / Reply-To
- HTML + Text
- Attachments später über Storage-Referenzen
- Provider-ID persistieren
- Delivery/Bounce/Complaint über signierten Webhook

### E-Mail / Brevo
- API-Key ausschließlich serverseitig
- Sender-ID / Sender-Adresse
- HTML + Text
- Provider-ID persistieren
- Delivery/Bounce über Webhook

### SMS
- Adaptervertrag vollständig vorbereitet
- Provider noch nicht ausgewählt
- Kostenlimit, Längen-/Segmentprüfung, Opt-in/Opt-out erforderlich

### WhatsApp
- Adaptervertrag vollständig vorbereitet
- Business Provider noch nicht eingerichtet
- genehmigte Templates, Opt-in und Session-Regeln erforderlich

## Killswitch / Test Gate
Echter Dispatch darf nur erfolgen wenn ALLE Bedingungen wahr sind:
- global `dispatch_enabled=true`
- Provider `enabled=true`
- Quellprogramm `can_send=true`
- Kanal im Programm erlaubt
- Auftrag nicht Dry-Run
- expliziter Test-/Produktionsmodus passend
- Empfänger gültig

Für den ersten Testlauf wird `dispatch_enabled` nur kurz für einen einzelnen Testauftrag aktiviert und anschließend wieder deaktiviert.

## Observability
Jeder Zustandswechsel erzeugt ein Delivery-Event:
- accepted
- queued
- deferred_quiet_hours
- rate_limited
- claimed
- provider_accepted
- sent
- delivered
- opened
- retry_scheduled
- failed
- dead_lettered
- fallback_created

Dashboard-KPIs werden ausschließlich aus diesen Events/Requests abgeleitet.
