# Full analyse av FolkNettside (struktur, funksjoner og forbedringsplan)

_Dato: 20. mai 2026_

## 1) Kort oppsummering

Repoet er funksjonsrikt, men har tydelige tegn på organisk vekst: blanding av produksjonsfiler, engangsskript, midlertidige artefakter og flere overlappende implementasjoner av lignende funksjoner. Dette gir høy vedlikeholdskost, øker risiko for regresjoner og gjør onboarding treg.

Hovedgrepene som anbefales:

1. **Skille produksjon og utviklingsartefakter tydelig** (særlig i repo-roten).
2. **Konsolidere dupliserte loadere/visere og temalogikk**.
3. **Innføre en enkel bygg-/kvalitetsport** (lint, formattering, dead-file-sjekk, pre-commit).
4. **Etablere tydelig API-kontrakt og versjonering** for `includes/*/api`.
5. **Definere modulgrenser** (frontend runtime, verktøy, data pipeline, 3D-viewers).

---

## 2) Strukturell status (nå)

### Det som fungerer bra

- Klar toppnivådeling mellom `assets/`, `includes/`, `scripts/` og `Tools/`.
- Flere domener er allerede modularisert i egne filer (f.eks. hydrometer, brewing, 3D, quiz).
- Dokumentasjon finnes (`README.md`, `README_SETUP.md`, `NTNU_WEBEDIT.md`), som er et godt utgangspunkt.

### Friksjonspunkter

- **Rotmappen inneholder mange midlertidige filer** (`tmp_*`, `temp_subs/*`, `.pyc`) som burde være ignorert eller flyttet til egen `scratch/`-struktur.
- **Blandet språk/konvensjon i filnavn** (engelsk/norsk, camel/snake/mix) gjør søk og standardisering vanskelig.
- **Flere «gamle/backup»-filer i aktiv trestruktur** (`*.bak`, `*.orig`, `*.backup_*`) skaper usikkerhet om hva som er «source of truth».
- **Funksjonell overlapp** mellom scripts som ser ut til å gjøre lignende mobil/tema-injeksjon og oppdatering.

---

## 3) Hva som mangler

1. **Tydelig arkitekturkart**
   - Mangler en kort `docs/ARCHITECTURE.md` med ansvar per mappe/modul, dataflyt og avhengigheter.

2. **Kodekvalitets-gates**
   - Mangler standardisert kjede for formattering/lint/typecheck/test (både JS og Python).

3. **Miljøprofilering**
   - Mangler eksplisitt separasjon mellom lokal dev, staging og prod-konfig (særlig for API-nøkler, feature toggles).

4. **Observability i frontend**
   - Mangler konsistent feillogging/telemetri for runtime-feil i viewer-moduler.

5. **Standard for deprekering**
   - Mangler prosess for å fase ut gamle filer uten å beholde permanent «gammel-versjoner» i samme trær.

---

## 4) Hva bør fjernes eller flyttes

### Fjernes fra versjonert produksjonsflate (eller flyttes til `archive/`)

- Midlertidige artefakter i rot (`tmp_*`, `temp_subs/*`).
- Bytecode/cache (`__pycache__/`, `*.pyc`).
- Manuelle backupfiler (`*.bak`, `*.orig`, `*.backup_*`) fra aktive mapper.

### Legges i `.gitignore` / standardiseres

- `__pycache__/`, `*.pyc`
- `tmp_*`
- `temp_*`
- `*.bak`, `*.orig`, `*.backup_*`

Dette reduserer støy i PR-er og risiko for at feil filer deployes.

---

## 5) Hva bør generaliseres

1. **Tema- og layoutsystem**
   - Samle spredt temalogikk (`theme-switcher`, `flyout-theme-updater`, flere theme-fix CSS-er) til ett sentralt API (f.eks. `ThemeManager`).

2. **Viewer-plugin modell**
   - `includes/kodeLesere/*` og `includes/three/*` bør få en felles registreringsmekanisme (mime/extension -> renderer), i stedet for ad-hoc linking.

3. **Script-automatisering**
   - Flere Python-skript med overlapp bør samles bak én CLI (`python -m tools ...`) med subcommands.

4. **API-common-lag**
   - Tilsvarende `common.php` finnes i flere API-mapper. Standardiser autentisering, responsformat, feilobjekt og logging i ett delt lag.

---

## 6) Hva bør oppdateres

1. **README-struktur**
   - Del opp i: quickstart, arkitektur, drift, scripts, feilsøking.
   - Flytt lange historiske detaljer til `docs/` for mindre kognitiv last.

2. **Navngivning**
   - Velg én standard: kebab-case for frontendfiler, snake_case for Python.
   - Marker «legacy» eksplisitt med mappe (`legacy/`) i stedet for tilfeldige suffikser.

3. **Avhengighetsstyring**
   - Lås JS/Python tooling med egne filer (`package.json`/`requirements.txt` eller `pyproject.toml`) hvis ikke allerede etablert.

4. **Sikkerhetspraksis**
   - Innfør enkel secret scanning i CI og eksplisitt policy for `.env.*`-filer.

---

## 7) Konkrete funksjoner som bør legges til

1. **Automatisk «repo hygiene»-jobb i CI**
   - Feiler build hvis temp/backup/cache-filer er med i commit.

2. **Rask helsesjekk-kommando**
   - Én kommando som validerer sentrale filer/lenker/viewer-registrering.

3. **Feature flags for eksperimentelle viewers**
   - Slå av/på nye moduler uten manuell filkommentering.

4. **Kontrakt-tester for PHP API-endepunkter**
   - Enkle smoke-tester for at JSON-struktur er stabil.

5. **Modul-indeks for sidebar/viewers**
   - Generert manifest som brukes av loader, i stedet for hardkodede imports i flere steder.

---

## 8) Prioritert 30/60/90-dagers plan

### 0–30 dager (høy verdi, lav risiko)

- Rydd repo: flytt/ignorer temp-, backup- og cachefiler.
- Lag `docs/ARCHITECTURE.md` + `docs/CONTRIBUTING.md`.
- Innfør grunnleggende lint/format-check i CI.

### 31–60 dager

- Konsolider temahåndtering til ett JS-grensesnitt + opprydding av theme-fix CSS.
- Etabler felles viewer-manifest og enkel pluginregistrering.
- Samle Python-skript under en konsistent CLI-struktur.

### 61–90 dager

- Innfør API-kontrakt-tester og felles feilhåndtering for PHP API.
- Migrer legacy-filer til `archive/legacy/` med deprekeringslogg.
- Mål ytelse (LCP/CLS/JS-feilrate) og sett baseline.

---

## 9) Foreslått målstruktur (forenklet)

```text
/
  app/                  # runtime frontend (html, js, css)
  includes/             # injiserbare fellesmoduler
  api/                  # php-endepunkter (evt. samling av includes/*/api)
  tools/                # brukerrettede mini-verktøy
  scripts/              # interne vedlikeholdsskript
  docs/
    ARCHITECTURE.md
    CONTRIBUTING.md
    OPERATIONS.md
  archive/
    legacy/
    snapshots/
```

Poenget er ikke å flytte alt med én gang, men å gi en tydelig migrasjonsretning.

---

## 10) Risiko ved å la dagens struktur stå uendret

- Økt sannsynlighet for utilsiktet produksjonsendring.
- Høyere onboarding-tid for nye bidragsytere.
- Vanskeligere feilsøking pga. overlappende moduler og «nesten-like» filer.
- Mer tid brukt på manuell koordinering enn på funksjonell videreutvikling.

---

## 11) Konklusjon

Prosjektet har høy funksjonell bredde og mye verdifull logikk, men trenger nå en **strukturell konsolideringsfase**. Med 2–3 målrettede sprints på repo-hygiene, modularisering og minimum CI-kvalitetsgates vil dere få lavere vedlikeholdskost, tryggere deploy og raskere utviklingstempo.
