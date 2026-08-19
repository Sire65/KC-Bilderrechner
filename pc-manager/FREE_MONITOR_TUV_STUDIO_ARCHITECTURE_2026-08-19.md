# KC Free-Monitor – Tiefenkonsolidierung, Regression, TÜV, Studio & Architektur

Stand: 2026-08-19
Branch: `feature/free-monitor-2026-08-19`
PR: #3 (Draft)
Produktionsstatus: **nicht gemergt, nicht deployed**

## Ergebnis

**TÜV-Sicherheits-/Betriebs-Gate: GRÜN mit Restwarnungen.**

- Kritische Blocker: **0**
- Hohe Blocker: **0**
- Restwarnungen / Komfort-Härtung: **3**
- Automatische Provider-Abfrage: **nicht aktiviert**
- Netlify-Production-Deploy durch diese Arbeiten: **durch `[skip netlify]` unterdrückt**

## In der Tiefenkonsolidierung gefundene und geschlossene Fehler

### 1. Unbekannte Quoten wurden rechnerisch als 0 behandelt

Vor der Konsolidierung konnte `Number(null)` zu 0 werden. Dadurch konnten unbekannte Werte wie Supabase Egress, Edge Functions oder Cloudflare Tagesverbrauch fälschlich als 0 % erscheinen und eine zu positive LIVE-SAFE-Prognose erzeugen.

**Geschlossen:** `null`, `undefined` und leere Werte bleiben jetzt unbekannt. Unbekannte Pflichtmetriken verhindern eine uneingeschränkte LIVE-SAFE-Freigabe.

### 2. Stale-Werte waren nicht fail-closed

Ein als `stale` markierter Anbieter konnte in der Prognoselogik noch zu positiv behandelt werden.

**Geschlossen:** stale Anbieter bleiben `UNBEKANNT/OFFEN`, bis ein frischer, quota-sicherer Wert vorliegt. Ein stale Wert kann keine grüne LIVE-SAFE-Freigabe erzeugen.

### 3. Vorbereiteter Live-Adapter wurde implizit aktiviert

Der Core hatte den vorbereiteten `free-monitor-live.js` automatisch nachgeladen. Das widersprach der Entscheidung, die tägliche externe Snapshot-Aktualisierung erst später bewusst zu aktivieren.

**Geschlossen:** Der Core lädt den Live-Adapter nicht mehr automatisch. Der Adapter bleibt vorbereitet, aber dormant. Seine spätere Aktivierung benötigt eine bewusste Freigabe.

### 4. System- & Testcenter verursachte versteckte Dauerabfragen

Das bisherige Testcenter führte beim Öffnen sofort eine Prüfung durch und danach alle 30 Sekunden weitere Abfragen an Cloudflare **und Netlify** aus. Bei dauerhaft geöffnetem Fenster hätte dies unnötig Requests erzeugt und insbesondere Netlify belastet.

**Geschlossen:** Kein automatischer Startcheck, kein `setInterval`, kein 30-Sekunden-Polling mehr.

### 5. Super-GAU-Tests nutzten Netlify zuerst

Einzel- und Gesamttests wurden bisher primär über Netlify gestartet und erst danach über Cloudflare. Das war für den Free-Safe-Betrieb ungünstig.

**Geschlossen:** Tests laufen jetzt Cloudflare-first. Netlify ist nur noch Fallback oder wird über den ausdrücklich sichtbaren Button `Gateway B extra prüfen` angesprochen.

### 6. Remote-Statuswerte im Testcenter

Remote gelieferte Backend-/Fehlertexte wurden teilweise direkt in HTML-Zeichenketten eingesetzt.

**Geschlossen:** Remote-Backend- und Fehlerwerte werden vor der HTML-Ausgabe escaped. Browser-Credentials werden bei Gateway-Prüfungen nicht mitgesendet.

## Regressions-Gate

Der automatisierte Test `tests/free-monitor-core.test.cjs` prüft jetzt unter anderem:

- `null`/unbekannt bleibt unbekannt und wird niemals zu 0 Verbrauch.
- unbekannte Pflichtmetrik => keine LIVE-SAFE-Freigabe.
- stale Anbieter => keine LIVE-SAFE-Freigabe.
- blockierte Anbieter => ROT.
- 10-Tage-Prognose und Reservegrenzen.
- unbekannte Werte werden nicht als Nullverbrauch in die Historie geschrieben.
- Torte, Balken, Linie und Säulen bleiben im UI vorhanden.
- Mobil-/Tablet-Layout bleibt vorhanden.
- kein `fetch`, XHR, WebSocket oder EventSource im aktiven Free-Monitor.
- keine dynamische Codeausführung (`eval`, `new Function`).
- der vorbereitete Live-Adapter darf nicht heimlich aktiviert werden.
- der dormante Live-Adapter besitzt nur einen freigegebenen read-only GitHub-Raw-Pfad.
- keine POST/PUT/PATCH/DELETE-Aufrufe im Live-Adapter.
- Host-Allowlist auf `raw.githubusercontent.com`.
- Snapshot-Dublettenschutz und stale-Übernahme.
- System-/Testcenter besitzt kein periodisches Polling.
- Systemprüfung und Super-GAU-Tests verwenden Cloudflare vor Netlify.
- Netlify wird beim Systemcheck nur nach Cloudflare-Ausfall automatisch angesprochen.
- Remote-Statuswerte im Testcenter werden escaped.

Letzter geprüfter Workflow-Lauf nach der Konsolidierung: **SUCCESS**.

## Zielarchitektur

```text
┌─────────────────────────────┐
│ KC PC-Manager               │
│ Free-Monitor UI             │
│ Torte/Balken/Linie/Säulen   │
└──────────────┬──────────────┘
               │ lokal
               v
┌─────────────────────────────┐
│ Free-Monitor Core           │
│ Grenzwerte / Risiko         │
│ 10-Tage-Prognose            │
│ fail-closed unknown/stale   │
└──────────────┬──────────────┘
               │
               v
┌─────────────────────────────┐
│ localStorage Historie       │
│ Snapshots / Einstellungen   │
└─────────────────────────────┘

Später, nur nach Freigabe:

Supabase / Neon / GitHub Metadaten
        │ read-only, quota-safe
        v
monitor-free-usage-data
free-monitor-live.json
        │ max. 1 kleiner GitHub-Raw-Read/Tag
        v
vorbereiteter Live-Adapter
```

### Harte Architektur-Invarianten

1. `main` und Produktion werden durch Monitoring-Sammlungen nicht beschrieben.
2. Provider-Usage-Erfassung darf keine Netlify Functions, Cloudflare Worker oder Supabase Edge Functions nur für Monitoring starten.
3. Unbekannt ist **nicht** 0.
4. Stale ist **nicht** grün.
5. Netlify ist nicht der Standardpfad für Testverkehr.
6. Keine Hintergrund-Dauerschleifen.
7. Automations-Snapshot-Commits nur auf `monitor-free-usage-data` mit `[skip netlify]`.
8. Während des Weihnachtsmarkts keine experimentellen Testserien oder Deployments.

## Studio-/Bedienprüfung

### Positiv

- zentrale Seite statt verstreuter Anbieterwerte
- Tablet-/Mobil-Layout vorhanden
- Ampel plus Prozentwerte statt reine Farbkommunikation
- Torten-, Balken-, Linien- und Säulendiagramme
- Reset-/Freeze-Tabelle
- sichtbarer 10-Tage-LIVE-SAFE-Bereich
- manuelle Wertepflege möglich, falls ein Anbieter keinen kostenlosen Usage-Zugriff liefert
- Export/Import für lokale Sicherung
- klare Trennung zwischen Free-Monitor und Super-GAU-Testcenter

### Restwarnungen – keine aktuellen Release-Blocker

1. **Import-Härtung:** JSON-Import besitzt noch keine harte Vorab-Dateigrößengrenze und Settings werden noch nicht über eine vollständige Feld-Whitelist normalisiert. Vor öffentlicher Fremddaten-Importnutzung sollte das nachgezogen werden.
2. **Barrierefreiheit:** Canvas-Diagramme besitzen noch keine vollständige textuelle/ARIA-Ersatzdarstellung; der Werte-/Tabellenbereich liefert die Daten jedoch bereits textuell.
3. **Dialog-Komfort:** Das Werte-Dialogfenster besitzt noch keinen vollständigen Fokus-Trap/ESC-Komfort wie ein ausgereiftes Desktop-Dialogsystem.

Diese Punkte beeinflussen den Free-Safe-Kern und die Kostenkontrolle derzeit nicht.

## Weihnachtsmarkt-Freigaberegel

Eine uneingeschränkte LIVE-Freigabe ist nur zulässig, wenn:

- kein Provider blockiert ist,
- kein kritisches hartes Limit stale/unbekannt ist,
- Netlify zu Marktstart mindestens 80 % Monatsreserve besitzt,
- andere harte Free-Limits mindestens 50 % Reserve besitzen,
- der 10-Tage-Verbrauch aus der lokalen Historie innerhalb der Reserve hochgerechnet wird,
- Failover/Offline vorab einmal kontrolliert getestet wurde,
- während des Marktes Deployment-Freeze und Testdisziplin gelten.

## Aktueller Freigabestatus

Der **Code-/Architekturstand des Free-Monitors ist nach der Tiefenkonsolidierung grün**. Eine reale Weihnachtsmarkt-LIVE-Freigabe ist heute absichtlich noch **nicht** möglich, weil Netlify aktuell bereits am Monatslimit liegt und mehrere echte Provider-Usage-Werte noch unbekannt/stale sind. Genau diese Unsicherheit wird jetzt fail-closed behandelt und nicht mehr fälschlich als 0 Verbrauch gewertet.
