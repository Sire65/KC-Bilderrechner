# KC Free-Monitor Datenbranch

Dieser Branch dient ausschließlich als **quota-schonender Snapshot-Speicher** für den KC Free-Monitor.

## Regeln

- Keine Produktivlogik entwickeln.
- `main` nicht verändern.
- Nur `pc-manager/free-monitor-live.json` und zugehörige reine Dokumentation aktualisieren.
- Automatische Snapshot-Commits müssen `[skip netlify]` enthalten, damit Netlify keinen Branch-/Production-Deploy aus diesem Commit erzeugt.
- Keine Netlify Functions, Cloudflare Worker, Supabase Edge Functions oder schreibenden SQL-Abfragen zum Sammeln von Usage-Werten verwenden.
- Fehlt ein sicherer read-only Usage-Wert, vorhandenen Wert beibehalten und als `stale: true` markieren.
- Keine geschätzten oder erfundenen Verbrauchszahlen eintragen.
- Keine Secrets, Tokens, Connection Strings oder API-Schlüssel in `free-monitor-live.json` speichern.

## Zweck

Die Datei `pc-manager/free-monitor-live.json` enthält den letzten bekannten, nachvollziehbaren Stand für Netlify, Supabase, Neon, GitHub und Cloudflare. Sie ist kein Produktions-Backend und löst selbst keine Provider-Abfragen aus.
