# KC Communication 1.0 – Foundation

Entwicklungszweig: `feature/kc-platform-foundation`

## Ziel
Ein zentraler Kommunikationsdienst für alle KC-Fachprogramme. Fachprogramme stoßen nur einen standardisierten Auftrag an. Providerzugänge, Vorlagen, Zeitregeln, Retry, Fallback, Historie und Zustellstatus werden zentral verarbeitet.

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

## Einheitliche Schnittstelle
Aktuell stellt das Browser-Grundgerüst `window.KCCommunication.createRequest(...)` bereit. Dieses API ist nur die lokale Entwicklungsfassade. Produktiv wird die gleiche Auftragsstruktur über einen authentisierten Server-Endpunkt abgewickelt; Provider-Secrets dürfen nie in Fachprogramme oder Browserantworten gelangen.

Beispiel:

```js
KCCommunication.createRequest({
  source: "kc-dp2",
  channel: "push",
  recipient: "MA-018",
  template: "dp2_shift_changed"
});
```

## Sicherheitsregel
- Provider-Secrets zentral und serverseitig speichern.
- Fachprogramme erhalten App-ID/Berechtigungen, aber niemals Provider-Schlüssel.
- Jeder Auftrag benötigt Quellprogramm, Berechtigungskontext und Audit-ID.
- Keine echten Providerzugänge in GitHub committen.

## Status dieser Foundation
- UI-Shell und Tabs: vorhanden
- Responsive KC-Form-/Table-/Card-Muster: vorhanden
- Providerdatenmodell: vorhanden
- Programmliste/Berechtigungskanäle: vorhanden
- Vorlagen-Grundmodell: vorhanden
- Lokale Auftrags-/Historienstruktur: vorhanden
- Testcenter-Grundlage: vorhanden
- Echter Push-/Mail-/SMS-/WhatsApp-Adapter: noch nicht aktiviert
- Serverseitige Secret-Verwaltung: noch nicht aktiviert
- Authentisierung der Fachprogramme: noch nicht aktiviert

## Migrationsprinzip
Bestehende Programme werden nicht per Big Bang umgebaut. DP2 wird erstes Referenzprogramm. Zuerst wird dessen bestehende Push-Funktion über einen Adapter auf KC Communication umgestellt; nach Regression folgt E-Mail. Erst nach stabilem Pilot werden weitere Programme angebunden.
