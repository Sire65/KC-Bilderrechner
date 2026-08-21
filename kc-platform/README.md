# KC Plattform – gemeinsame technische Basis

Status: Entwurf 0.1.0

## Ziel
Die KC Fachprogramme bleiben eigenständig. Gemeinsame technische Funktionen werden zentral bereitgestellt und über stabile Schnittstellen genutzt.

## Ebenen
1. KC Core – gemeinsame UI- und Basisbausteine
2. KC Module – Kommunikation, Security, Logging/Audit, Backup, Data/Sync, Dokumente, Monitoring
3. KC Fachprogramme – DP2, KC Verwaltung, Academy, Money Butler, Bilderrechner, WM Präsentation u. a.

## Verbindliche Regeln
- Keine Provider-Zugangsdaten in Fachprogrammen.
- Keine parallelen Eigenimplementierungen von Table, Window, Dialog, Message/Notification, Security oder Logging, wenn ein freigegebener KC Core existiert.
- Gleiche Versandoberfläche in allen Fachprogrammen.
- Fachprogramme übergeben nur standardisierte Aufträge an KC Module.
- Secrets bleiben serverseitig bzw. verschlüsselt und werden nie an Fachprogramme zurückgegeben.
- Core- und Modulversionen werden zentral versioniert und kontrolliert aktualisiert.

## Bereits vorhandene Kandidaten
Aus KC-Bilderrechner / KC-Futura-Academy werden insbesondere geprüft:
- message-core
- notification-core
- audit-core
- health-core
- security-core
- database-security-core
- universal-database-connector-core

## Erste Referenzimplementierung
KC Communication 1.0 mit:
- Dashboard
- Push
- E-Mail
- SMS
- WhatsApp
- Vorlagen
- Empfänger/Gruppen
- Programme & Schnittstellen
- Versandhistorie
- Testcenter

DP2 wird erstes Referenzprogramm für die Anbindung, zunächst ohne Entfernung bestehender Funktionen.