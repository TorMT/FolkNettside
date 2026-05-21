# Architecture

Kort oversikt over hoveddelene i repoet og hva de eier.

## Runtime-struktur

- `assets/`
  - delte CSS- og JS-filer for tema, viewerintegrasjoner og domenespesifikke verktøy
- `includes/`
  - gjenbrukbare runtime-moduler som navbar, sidebar, viewer-sider og 3D-loadere
- `diverse/`, `semestre/`, `Tools/`
  - publisert innhold og brukerrettede sider
- `scripts/`
  - vedlikehold, eksport, enrich og batch-jobber
- `docs/`
  - driftsnotater, sikkerhetsnotater og implementasjonsdokumentasjon

## Viktige ansvar

- `SiteUpdater3.py`
  - genererer `index.json`
  - velger velkomstfiler
  - håndterer `quiz`
  - respekterer nå `.noindex` og `.siteignore`
- `includes/sidebar-loader.js`
  - bygger navigasjon og viewer-innlasting fra `index.json`
  - håndterer `beskyttet`-seksjoner
- `includes/kodeLesere/*`
  - egne viewere for filtyper og verktøy
- `includes/three/*`
  - 3D-loadere, hydrostatikk og renderingslogikk

## Sikkerhetsgrenser

- `beskyttet` er passord-gating i navigasjonen, ikke server-side sikkerhet.
- `locked=1` er bare en ren visningsmodus for deling.
- local/private filer skal holdes ute av Git og indeksgenerering via `.gitignore` og `.siteignore`.

## Retning for videre opprydding

- hold nye runtime-moduler i `includes/` eller `assets/`, ikke i repo-roten
- flytt midlertidige artefakter og backups ut av produksjonsflater
- dokumenter nye indekserings- eller viewer-kontrakter i `docs/`
