# Portfolio Template

Denne mappen er en standalone portefolje-template for statisk hosting. Den bruker ikke global navbar/sidebar, og er markert med `noindex,nofollow` samt `.noindex` for å unngå automatisk promotering i sidebar/index-generator.

## Trygg bruk

- Ikke legg ekte persondata i de committede `*.example.json`-filene.
- Bruk lokale filer som:
  - `portfolio-data.local.json`
  - `portfolio-linkedin.local.json`
- Ikke legg LinkedIn- eller GitHub-tokens i repoet.
- Ikke bruk frontend-only OAuth med secrets i browseren.

## LinkedIn-sync

Anbefalt standard er manuell eller server-sanitert sync:

- `portfolio-linkedin.local.json` for lokal manuell oppdatering
- eller en servergenerert safe-public JSON via `integrations.safePublicDataUrl`

Template-en scraper ikke LinkedIn.

## Google Analytics

Google Analytics-støtte finnes, men er av som standard.

- sett `analytics.enabled` til `true`
- fyll inn egen `measurementId`
- eventene er generiske og sender ikke navn, e-post eller andre personfelt

## Lokal test

```powershell
python -m http.server 8000
```

Åpne:

- `http://localhost:8000/diverse/portfolio-template/`
