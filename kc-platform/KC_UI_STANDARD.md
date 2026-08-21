# KC UI Standard 0.1

## Ziel
Alle KC Anwendungen und Module sollen visuell und funktional wie aus einem Guss wirken.

## Verbindliche Grundsätze
- Gleiche Komponenten für gleiche Aufgaben.
- Keine abweichenden Eigenvarianten in einzelnen Programmen ohne zentralen Core-Entscheid.
- Pflichtfelder mit rotem Sternchen.
- Einheitliche Statuslogik: grün = OK, gelb = Warnung/Hinweis, rot = Fehler/Aktion nötig.
- Gleiche Position und Beschriftung für Speichern, Abbrechen, Löschen, Testen und Senden.
- Löschen immer mit Bestätigung.
- Einheitliche Meldungs- und Fehlerdarstellung.
- Tablet- und Desktop-Bedienung werden gemeinsam berücksichtigt.

## Gemeinsame Komponenten
Geplant bzw. zu konsolidieren:
- KCWindow
- KCDialog
- KCTable
- KCCard
- KCTabs
- KCForm
- KCComboBox
- KCDatePicker
- KCTimePicker
- KCButton
- KCStatusBadge
- KCMessageBar
- KCConfirmDialog
- KCSearch
- KCPagination
- KCTooltip
- KCChart
- KCKpiCard
- KCEmptyState
- KCErrorState
- KCLoadingState

## Kommunikationsoberfläche
Die Versandseite wird als gemeinsame Komponente bereitgestellt. Fachprogramme konfigurieren lediglich Kontext, zulässige Kanäle, Empfängerquellen und Vorlagen.

Standardfelder:
- Empfänger *
- Kanal
- Vorlage
- Betreff, falls Kanal dies unterstützt
- Nachricht
- Versand: sofort / geplant
- Datum / Uhrzeit
- Lesebestätigung
- Fallback-Kanal
- Vorschau
- Test
- Senden

Die visuelle Struktur und Bedienlogik ist in DP2, KC Verwaltung, Academy, Money Butler und allen weiteren angebundenen Anwendungen identisch.