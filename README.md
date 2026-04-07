# FolkNettside — README

Dette repoet inneholder en statisk nettside med tilhørende assets, scripts og verktøy. Denne README forklarer hvordan du setter opp, tilpasser og deployer siden, samt hvordan du retter et vanlig problem med Welcome-generic.svg.

**Rask oversikt**

- Katalogstruktur (viktig):
  - `assets/` — CSS, JS, bilder
  - `includes/` — felles HTML/JS-snippeter som injiseres (navbar, sidebar)
  - `scripts/` — hjelpeskript for bygg/oppdatering
  - `course-template.html`, `index.html` — maler

**Forutsetninger**

- Git installert og konfigurert.
- Node.js ikke påkrevd for å kjøre siden, men nyttig for verktøy. Lokalt kan du enkelt serve filene med Python eller en enkel HTTP-server.

Eksempel: kjør lokal server (fra repo-roten):

```bash
# Python 3
python -m http.server 8000
# Åpne http://localhost:8000
```

**Kompilere / bygge / deploy**

- Repoet har en GitHub Actions workflow: `.github/workflows/export-and-deploy.yml`. Pushing til `main` vil trigge CI hvis workflow er aktiv.
- Lokalt trenger du normalt ikke "bygge" — bare push endringer til `main`.

**Konfigurasjon som ofte må endres**

- Tittel/metadata: sjekk `course-template.html` og `index.json` for `{{TITLE}}` / `{{DESCRIPTION}}`-verdier som systemet fyller inn ved eksport.
- Google Analytics / Looker Studio iframes: i `course-template.html` finnes gtag-id (`G-BJ41MZJP0L`) og en iframe for webstatistikk. Bytt ID eller iframe-URL hvis nødvendig.
- Versjonering av assets: CSS/JS i HTML har `?v=4` query-param for cache-busting — oppdater der hvis du endrer filer.

**Hvordan endre Welcome-generic.svg (fjerner teksten "Tor er treg")**

1. Fil: `img/welcome-generic.svg`. Åpne i en teksteditor eller et SVG-redigeringsprogram (Inkscape, Illustrator).
2. Finn teksten i SVG-koden (ofte `<text>`-element) eller rediger visuelt i Inkscape.
3. Fjern eller endre teksten til ønsket budskap, f.eks. "Velkommen".
4. Lagre filen og sjekk endringer i nettleser (refresh, gjerne hard refresh / clear cache).

Tips: hvis SVG er minifisert, gjør en enkel søk/grep:

```bash
grep -n "Tor er treg" -R img || true
```

Hvis du heller vil bytte bildet, erstatt filen `img/welcome-generic.svg` med et annet SVG/PNG med samme navn.

**Vanlige arbeidsflyter**

- Legg til/endre filer → `git add -A` → `git commit -m "Kort melding"` → `git push`
- Hvis VS Code åpner feil editor for `git commit`, sett editor til VS Code: `git config core.editor "code --wait"`.

**Deploy / CI**

- Workflowen i `.github/workflows/export-and-deploy.yml` håndterer eksport og deploy. Sjekk workflow-filen for detaljer om deploy-mål (GitHub Pages eller annen hosting).

**Scripts og vedlikehold**

- `scripts/` inneholder verktøy for oppdatering og eksport (`export_repo.py`, `export/`, etc.). Les filene for mer detaljer. Kjør Python-skript med et passende virtuelt miljø.
- `scripts/video_topic_enricher.py` kan brukes til å gjøre en videoliste om til JSON med `description` og `themes` (gratis/lokalt, via `yt-dlp` undertekster for YouTube/Panopto, med valgfri AI-klassifisering via lokal Ollama og valgfri Whisper-transkribering).
- `SiteUpdater3.py` støtter nå også `--enrich-video-lists` for å kjøre enrich automatisk etter indeksoppdatering (valgfritt med cookies/ollama/whisper-flagg).
- Enrich-trinnet hopper nå over filer uten endringer (bruk `--enrich-force` for å tvinge full kjøring).
- Etter enrich vises en oppsummering med antall kandidater/kjørte/skippede/feilede filer.

**Feilsøking**

- Push feiler med "remote contains work you do not have": kjør `git pull --rebase origin main` og løs eventuelle konflikter før `git push`.
- Feil: VS Code Git-extension `git-editor-main.js` 500 — sett `core.editor` eller bruk `git commit -m "msg"` for å hoppe over editoren.

**Hvordan bruke siden (kort)**

- Navbar og sidebar: `includes/navbar.html` og `includes/sidebar.html` injiseres i sidene ved runtime (f.eks. `course-template.html`). For å endre global navigation, rediger disse filer.
- Legg til nytt innhold i rotmapper som `diverse/`, `docs/`, `semestre/` — hvert område har en `index.json` og `index.html`.
- Quiz-funksjoner finnes i `Quiz/` og `assets/js/course-leaderboard.js`.

**Vedlegg / nyttige kommandoer**

```bash
# Stage + commit
git add -A
git commit -m "Oppdatering: ..."
git push origin main

# Sett VS Code som git-editor (valgfritt)
git config core.editor "code --wait"

# Serve lokalt
python -m http.server 8000
```

Dette dokumentet forklarer hvordan du bruker `SiteUpdater3.py` og `navbarupdater.py`, hvilke mapper som betyr hva, og hvor du personaliserer siden.

### Viktige mapper

- `assets/` — CSS, JS og statiske tema-filer.
- `includes/` — gjenbrukbare deler som injiseres i sidene: `navbar.html`, `sidebar.html`, loader-scripts.
- `semestre/` — kursinnhold per semester; hver kursmappe inneholder `index.html` og `filer/`.
- `img/` — delte bilder, f.eks. `welcome-generic.svg`.
- `scripts/` — hjelpeskript for vedlikehold.
- `Quiz/` — quiz-maler og data.
- `export/` — minimal eksport for publisering.

### Hvor personaliserer du siden?

- `course-template.html` — side-mal: tittel, metadata og CSS/JS-rekkefølge.
- `includes/navbar.html` — endre top-navigation.
- `includes/sidebar.html` og `includes/sidebar-*.js` — sidebar og moduler.
- `assets/css/*` — styling og tema.
- `img/welcome-generic.svg` — bytt eller rediger for ønsket velkomstbilde.
- `semestre/<nr>/<kurs>/filer` — legg kursfiler her og oppdater index.

---
Bruk av `SiteUpdater3.py`
---

Formål: Rekursivt oppdatere/bygge `index.json`, normalisere quiz-bildereferanser og velge velkomstbilder.

Vanlige kommandoer:

```bash
python SiteUpdater3.py .
python SiteUpdater3.py . --no-progress
python SiteUpdater3.py . --no-quiz
python SiteUpdater3.py . --only
python SiteUpdater3.py . --shallow
```

Hva den gjør:
- Genererer `index.json` per mappe.
- Velger velkomstbilde automatisk eller bruker `img/welcome-generic.svg`.
- Normaliserer `quiz/quiz.json` bildestier.

---
Bruk av `navbarupdater.py`
---

Formål: CLI for å opprette semester, lage kurs-sider fra `course-template.html`, og oppdatere `includes/navbar.html`.

Installer (valgfritt):

```bash
pip install beautifulsoup4 tqdm
```

Eksempler:

```bash
python navbarupdater.py update-index [root]
python navbarupdater.py add-semester 3
python navbarupdater.py add-course <semester> <slug> "<Tittel>" "<Beskrivelse>"
python navbarupdater.py bulk [courses.json]
```

Hva den gjør:
- `update-index`: genererer `index.json` (lik SiteUpdater).
- `add-semester`: legger til semester-dropdown i `includes/navbar.html` og oppretter `semestre/<nummer>`.
- `add-course`: lager `index.html` i `semestre/<sem>/<slug>/`, oppretter `filer/index.json` med placeholder og oppdaterer navbar.

---
Praktiske tips
---

- Ta backup av `includes/navbar.html` og `course-template.html` før store endringer.
- Etter å ha lagt til filer, kjør `SiteUpdater3.py` eller `navbarupdater.py update-index`.
- For å endre velkomstbilde, rediger eller bytt `img/welcome-generic.svg`.

## Koble til NTNU webedit (nettverksområde)

Hvis dere bruker NTNUs webedit-område, bruk `\\webedit.ntnu.no\\brukernavn` som mål for opplasting/redigering. Bytt `brukernavn` med ditt NTNU-brukernavn.

Offisielle veiledninger (NTNU):

- Lag nettside på folk-ntnu: https://i.ntnu.no/wiki/-/wiki/Norsk/Lag+nettside+p%C3%A5+folk-ntnu-no
- Koble til nettverksområde (Windows): https://i.ntnu.no/wiki/-/wiki/Norsk/Koble+til+nettverksomr%C3%A5de+med+Windows
- Koble til nettverksområde (Mac OS X): https://i.ntnu.no/wiki/-/wiki/Norsk/Koble+til+nettverksomr%C3%A5de+med+Mac+OS+X
- Koble til nettverksområde (Linux): https://i.ntnu.no/wiki/-/wiki/Norsk/Koble+til+nettverksomr%C3%A5de+med+Linux

Korte eksempler for tilkobling:

Windows (File Explorer / PowerShell):

```powershell
net use Z: \\\\webedit.ntnu.no\\brukernavn
New-PSDrive -Name "W" -PSProvider FileSystem -Root "\\webedit.ntnu.no\\brukernavn" -Persist
```

Mac (Finder eller terminal):

```bash
# Fra Finder: Connect to Server -> smb://webedit.ntnu.no/brukernavn
# Terminal (eksempel):
# mkdir -p /Volumes/webedit
# mount_smbfs //brukernavn@webedit.ntnu.no/brukernavn /Volumes/webedit
```

Linux (GUI eller CLI):

```bash
# GUI: smb://webedit.ntnu.no/brukernavn
sudo mkdir -p /mnt/webedit
sudo mount -t cifs //webedit.ntnu.no/brukernavn /mnt/webedit -o username=brukernavn,uid=$(id -u),gid=$(id -g)
```

Merk: noen miljøer krever ekstra opsjoner (f.eks. `domain=ntnu.no` eller `sec=ntlmssp`). Følg NTNUs offisielle guider hvis det oppstår autentiseringsproblemer.

Når du er koblet opp: kopier publiserbare filer (for eksempel fra `export/` eller `index.html` + `assets/`) inn i `\\webedit.ntnu.no\\brukernavn` og test via folk-ntnu.

---
## Oppsett: trinn for trinn

1. Klon repo og gå til roten:

```bash
git clone https://github.com/DITT_BRUKERNAVN/repo.git
cd repo
```

2. Installer Python (3.11+ anbefales). Lag helst venv:

```bash
python -m venv .venv
.venv\Scripts\activate    # Windows
source .venv/bin/activate # macOS/Linux
pip install -U pip
pip install beautifulsoup4 tqdm
```

3. Kontroller `index.json`/`index.html` i `semestre/`, og kjør oppdatering:

```bash
python SiteUpdater3.py .
python navbarupdater.py update-index .
```

4. Lokal test:

```bash
python -m http.server 8000
# åpne http://localhost:8000
```

5. Legg til, commit og push:

```bash
git add -A
git commit -m "Oppdatering: README og oppsett"
git push origin main
```

6. Deploy: push til main trigger GitHub Actions (hvis workflow aktiv).


## AI-hjelp (ekstra)

- Denne repoen kan vedlikeholdes med AI-assistert arbeidsflyt. Bruk GitHub Copilot eller ChatGPT for å generere tekst, scripts eller kommandoeksempler.
- Legg inn en lokal `scripts/ai/` mappe for eksperimenter: `scripts/ai/README.md` og `scripts/ai/quick_start.md`.
- Gjør alltid manuell kontroll av generert kode før produksjon. AI bidrar med forslag, men du kan oppdage logiske eller sikkerhetsrelaterte feil.

> Tipset: Documenter alltid endringer i `README.md` og `index.json` slik at både styringsteam og automasjoner har samme referanse.

---
