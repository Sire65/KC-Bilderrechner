# KC Communication Provider Adapter Contracts

Status: 1.0-dev

## Grundregel
Alle Provideradapter implementieren dieselbe interne Schnittstelle. Fachprogramme sehen Providerdetails nie direkt.

## Standardoperationen
- `health()` – Konfiguration/Erreichbarkeit prüfen, keine Nutzdaten senden.
- `validate(request)` – Kanal- und Provider-spezifische Prüfung.
- `dryRun(request)` – Payload vollständig erzeugen, aber nicht an Provider senden.
- `send(request)` – echten Versand ausführen; nur erlaubt, wenn zentrale Freigabe aktiv ist.
- `normalizeResult(result)` – Providerantwort in KC-Statusmodell überführen.

## Einheitlicher Status
`configured`, `ready`, `degraded`, `error`, `off`.

## Push / Web Push + VAPID
Vorhandene DP2-Laufzeitwerte werden über serverseitige Secrets referenziert:
- `KC_DP_VAPID_PUBLIC_KEY`
- `KC_DP_VAPID_PRIVATE_KEY`
- `KC_DP_VAPID_SUBJECT`

Bestehende DP2-Automatik als Referenzprofil:
- Uhrzeit: 20:00
- Zeitzone: Europe/Berlin
- Empfängerbereich: scheduled

## E-Mail / Resend
Secret-Referenzen:
- `KC_DP_RESEND_API_KEY`
- `KC_DP_RESEND_INBOUND_SECRET`
- alternativ `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`

Bekannte Eingangsadresse aus DP2:
- `dp2@joraejaepe.resend.app`

## E-Mail / Brevo
Secret-Referenz:
- `KC_DP_BREVO_API_KEY`

Bekannte Eingangsadresse aus DP2:
- `dp2@kc-werne.de`

## SMS
Adapterstruktur vorhanden, Provider noch nicht ausgewählt. Keine Freigabe für echten Versand.

## WhatsApp
Adapterstruktur vorhanden, Provider noch nicht ausgewählt. Keine Freigabe für echten Versand.

## Sicherheitsregel
- Keine Secretwerte in GitHub.
- Keine Secretwerte in Browserantworten.
- Echter Versand nur über serverseitige Adapter.
- `dispatchEnabled=false` bleibt bis zur ausdrücklichen Freigabe aktiv.
