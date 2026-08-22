# KC Communication – Ereignisregeln & Protokollpflege

## Ereignisregeln pro Fachprogramm
Jedes registrierte KC-Fachprogramm kann eigene automatische Kommunikationsereignisse definieren. Ein Ereignis wird über `source_program + event_key` eindeutig identifiziert.

Beispiel:
- Programm: `kc-dp2`
- Ereignis: `shift_changed`
- Kanäle: `push`, `email`
- Modus: `all`
- Ergebnis: Push **und** E-Mail werden als getrennte Kommunikationsaufträge erzeugt.

Alternativ kann `channel_mode=fallback` verwendet werden:
- primärer Kanal zuerst
- Fallback-Kanal nur bei definiertem Fehlerzustand

Konfigurierbar pro Ereignis:
- aktiv/inaktiv
- Kanäle
- Versandmodus `all` oder `fallback`
- Vorlage
- Priorität
- Ruhezeiten beachten / bei `critical` übersteuern
- Lesebestätigung
- Empfängerregel
- Bedingungen
- Fallback-Kanal

Die Fachlogik entscheidet nur, **dass** ein Ereignis eingetreten ist. Providerdetails und Geheimnisse bleiben zentral in KC Communication.

## Tabellen- und Protokollpflege
Zentrale Regeln überwachen die Größe der Communication-Tabellen.

Standardwerte:
- `kc_communication_requests`: Warnung ab 5.000, kritisch ab 10.000 Zeilen
- `kc_communication_delivery_events`: Warnung ab 10.000, kritisch ab 25.000 Zeilen
- Standard-Aufbewahrung: 180 Tage

Die Oberfläche soll bei `warning` sichtbar warnen und bei `critical` einen deutlichen Aufräumhinweis zeigen.

### Löschbutton
Ein zentraler Button `Alte Protokolle löschen` darf nur freigegebene Communication-Tabellen bereinigen. Standardmäßig ist eine Bestätigung erforderlich.

Sicherheitsregeln:
- keine ungeprüften Tabellen-Namen
- nur Datensätze älter als die definierte Retention
- Requests nur aus abgeschlossenen Zuständen (`sent`, `partially_sent`, `failed`, `cancelled`, `dead_lettered`)
- Batch-Löschung statt Massendelete
- `auto_cleanup_enabled` standardmäßig `false`
- automatisches Löschen erst nach expliziter Administrationsfreigabe

## UX-Regel
Bei Erreichen der Warnschwelle:
`Protokollspeicher wird groß. Alte Einträge prüfen?`

Bei Erreichen der Hartgrenze:
`Protokollspeicher hat die definierte Obergrenze erreicht. Alte abgeschlossene Protokolle jetzt bereinigen?`

Aktionen:
- `Später`
- `Details anzeigen`
- `Alte Protokolle löschen`

Der Löschvorgang zeigt anschließend Anzahl gelöschter Datensätze und verbleibenden Status an.
