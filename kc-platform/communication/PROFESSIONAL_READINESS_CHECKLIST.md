# KC Communication 1.0 – Professional Readiness Checklist

## Architektur
- [x] Einheitlicher Communication Contract
- [x] Zentrale Providerverwaltung
- [x] Fachprogramme ohne Provider-Secrets
- [x] Zentrale Queue / Request-Tabelle
- [x] Korrelations-ID
- [x] Idempotency-Key pro Quellprogramm
- [x] Prioritäten
- [x] Geplanter Versand
- [x] Fallback-Kanal im Datenmodell
- [x] Delivery-Event-Historie

## Zuverlässigkeit
- [x] Retry-Zähler
- [x] Exponentielles Backoff vorbereitet
- [x] Max-Attempts
- [x] Dead-Letter-Felder
- [x] Worker-Lock / Claim
- [x] stale-lock recovery vorbereitet
- [x] Rate-Limit-Konfiguration
- [x] Provider-Health-Service
- [x] Dry-Run-Service
- [ ] echter Provider-Dispatch – bewusst noch gesperrt

## Sicherheit
- [x] Secrets nur serverseitig
- [x] Tabellen mit RLS
- [x] kein direkter Tabellenzugriff für Fachprogramme
- [x] interne Claim-RPC nur service_role
- [x] authentisierte Edge Functions
- [x] keine Secrets in GitHub
- [x] Audit-Metadaten
- [x] Programmberechtigungen / canSend vorbereitet

## Bedienung
- [x] einheitliche KC-UI
- [x] Dashboard
- [x] Push / E-Mail / SMS / WhatsApp Tabs
- [x] Programme & Schnittstellen
- [x] Vorlagen
- [x] Historie
- [x] Testcenter
- [x] verständliche Providerstatus
- [x] Pflichtfelder / Statusbadges

## Betriebsregeln
- [x] globale Zeitzone Europe/Berlin
- [x] Quiet Hours 22:00–07:00 vorbereitet
- [x] Dispatch-Killswitch
- [x] globales Rate Limit vorbereitet
- [x] Testbetrieb ohne Programmanbindung

## Vor erstem echten Test
1. Provider-Health grün prüfen.
2. Testempfänger explizit festlegen.
3. Nur Testmodus / einzelne Nachricht aktivieren.
4. Push zuerst, danach E-Mail.
5. Ergebnis in Delivery-Events und Historie prüfen.
6. Killswitch anschließend wieder auf `dispatch_enabled=false` setzen.

## Noch vor Produktionsfreigabe
- Provider-spezifische Webhook-Signaturprüfung für Zustell-/Bounce-Events.
- Bounce-/Complaint-Verarbeitung für E-Mail.
- SMS-Provider auswählen und Kosten-/Consent-Regeln hinterlegen.
- WhatsApp Business Provider und Template-Freigaben hinterlegen.
- automatische Queue-Worker-Ausführung / Scheduler aktivieren.
- Last-/Fehlertests und Regression vollständig durchführen.
