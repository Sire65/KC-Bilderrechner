# PC Backup Vault

Öffentliche Quellcode-Ablage für **PC Backup Vault**.

## Bereinigter Veröffentlichungsstand

Der bereitgestellte RAR-Stand wurde vor der Veröffentlichung geprüft.

- Die lokale `.venv` wird **nicht** veröffentlicht.
- `__pycache__` und kompilierte `.pyc`-Dateien werden **nicht** veröffentlicht.
- Der eigentliche Projektcode wurde auf fest eingebettete Passwörter, Tokens, API-Keys, Datenbank-URLs und private Schlüssel geprüft. Dabei wurden keine solchen fest eingebetteten Geheimnisse gefunden.
- Zugangsdaten werden im Programmcode über Konfiguration/Keyring geladen und gehören nicht in Git.

## Import

Der Repository-Workflow `.github/workflows/import-pc-backup-vault.yml` kann das bereinigte Quellpaket automatisch in diesen Ordner importieren und als browsbaren Quellcode unter `PC-Backup-Vault/source/` bereitstellen.
