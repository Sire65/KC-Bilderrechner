# KC Free-Monitor – vorbereitete tägliche Überwachung

Status: **vorbereitet, nicht aktiviert**

Ziel: Alle verwendeten Zusatzdienste im Free-Rahmen halten und vor dem 10-tägigen Weihnachtsmarkt sicherstellen, dass kein kritischer Dienst wegen Credits, Quotas, Pausierung oder Freeze ausfällt.

## Geplanter Rhythmus

- Täglich einmal am Morgen, Zielzeit ca. 08:00 Uhr Ortszeit.
- Kein Minutentakt, kein Polling, keine Dauerschleifen.
- Während des Weihnachtsmarkts weiterhin höchstens einmal täglich automatisch; zusätzliche Prüfungen nur manuell bei begründetem Anlass.

## Harte 0-Kosten-/0-Credit-Regeln

1. Keine kostenpflichtigen Upgrades oder Auto-Recharge-Aktionen.
2. Keine Netlify Production Deployments durch die Überwachung.
3. Keine Netlify Functions, Cloudflare Worker oder Supabase Edge Functions nur zum Einsammeln von Verbrauchswerten.
4. Keine schreibenden SQL-Abfragen, Migrationen oder Testbuchungen für das Monitoring.
5. Read-only Management-/Metadatenzugriffe nur, wenn sie im Free-Rahmen liegen und selbst keinen kostenrelevanten Runtime-Verbrauch erzeugen.
6. Wenn ein Anbieter keinen sicheren Usage-Zugriff bereitstellt, bleibt der letzte bekannte Wert erhalten und wird als `stale` markiert. Niemals schätzen.
7. Jede automatische GitHub-Aktualisierung erfolgt ausschließlich auf `monitor-free-usage-data`, niemals auf `main`, mit Commit-Nachricht `[skip netlify]`.
8. Der vorbereitete Browser-Live-Adapter bleibt bis zur ausdrücklichen Freigabe dormant und wird weder vom HTML noch vom Core automatisch geladen.
9. Das System- & Testcenter besitzt kein Hintergrund-Polling; Netlify ist bei Tests nur Fallback bzw. ausdrücklich manuell auswählbar.

## Datenziel

Die tägliche Sammlung aktualisiert ausschließlich:

`pc-manager/free-monitor-live.json`

auf Branch:

`monitor-free-usage-data`

Der Manager selbst bleibt lokal-first. Er darf die Provider nicht im Hintergrund pollen. Der Snapshot kann später kontrolliert importiert bzw. über den bereits vorbereiteten, aber derzeit **nicht aktivierten** read-only Adapter übernommen werden.

Der Adapter ist zusätzlich gehärtet:

- nur `https://raw.githubusercontent.com` ist als Quelle erlaubt,
- nur ein read-only GET-Pfad,
- keine Browser-Credentials,
- maximale Snapshot-Größe 256 KiB,
- `null`, leer oder negative Werte werden nicht als Verbrauch übernommen,
- stale-Status und Dublettenschutz werden berücksichtigt.

## Zu prüfende Anbieter

- Netlify: Monatscredits, Operational Credits, Deploy-Sperre, Reset-Datum, Production-Deploy-Freeze.
- Supabase KC Core: Projektstatus, DB-Größe sowie weitere quota-sichere Usage-Werte, wenn verfügbar.
- Supabase FUTURA: Projektstatus, DB-Größe sowie weitere quota-sichere Usage-Werte, wenn verfügbar.
- Neon KC Core Mirror: Storage, Transfer, Compute/Quota-Reset, Projekt-/Branchstatus.
- GitHub: Repository-/Workflow-Zustand; bei öffentlichen Repositories kostenrelevante Actions-Minuten nicht als Verbrauch vortäuschen.
- Cloudflare: Worker-/Hyperdrive-Tageslimits nur dann live erfassen, wenn ein quota-sicherer Account-Usage-Zugriff verfügbar ist; sonst `stale`.

## LIVE-SAFE-Regeln Weihnachtsmarkt

- Dauer: 10 Tage.
- Netlify: Zielreserve bei Marktstart mindestens 80 % der Monatscredits; Production-Deploy-Freeze während des Livebetriebs.
- Andere harte Free-Limits: Zielreserve mindestens 50 %.
- Ein unbekannter/staler kritischer Wert verhindert eine uneingeschränkte LIVE-SAFE-Freigabe.
- Ein bereits gesperrter Anbieter ist ROT, auch wenn die veröffentlichte Seite noch erreichbar ist.
- Vor Marktstart wird ein kompletter Failover-/Offline-Test durchgeführt, ohne die Free-Limits unnötig zu belasten.
- Während des Marktbetriebs keine regelmäßigen Super-GAU-Testserien; Testcenter nur bei begründetem Anlass.

## Vorbereiteter Automationsauftrag

> Aktualisiere den KC-Free-Monitor kosten- und quota-schonend. Lies ausschließlich read-only den aktuellen Zustand der verbundenen Free-Dienste: Supabase-Projektstatus und Datenbankgrößen, Neon-Projekt-/Branch-Metadaten sowie GitHub-Status, soweit verfügbar. Nutze keine schreibenden SQL-Abfragen, keine Migrationen, keine Edge Functions, keine Cloudflare-Worker-Aufrufe, keine Netlify-Functions oder Production-Deployments und keine kostenpflichtigen Aktionen. Für Netlify und Cloudflare: Wenn kein quota-sicherer Account-Usage-Zugriff verfügbar ist, behalte den letzten bekannten Wert bei und markiere ihn als stale, statt zu raten oder einen kostenrelevanten Aufruf zu erzeugen. Aktualisiere danach ausschließlich die Datei pc-manager/free-monitor-live.json im Repository Sire65/KC-Bilderrechner auf dem Branch monitor-free-usage-data; Commit-Nachricht muss [skip netlify] enthalten. Berühre main und Produktionsbranches nicht. Bewerte anschließend die 10-Tage-Weihnachtsmarkt-Reserve: Netlify soll mindestens 80 % seiner Monatscredits als Reserve haben; bei anderen harten Free-Limits mindestens 50 %. Melde deutlich, wenn ein Anbieter kritisch, gesperrt, nahe am Limit oder die Datenerfassung fehlgeschlagen ist; ansonsten bestätige knapp, dass der Free-Monitor aktualisiert wurde.

## Aktivierung später

Die ChatGPT-Aufgabe und der Browser-Live-Adapter werden erst aktiviert, wenn bewusst entschieden wurde, welcher vorhandene Task pausiert oder ersetzt wird und der read-only Snapshot-Weg freigegeben ist. Bis dahin entstehen durch diese Vorbereitung keine automatischen Provider-Abfragen.
