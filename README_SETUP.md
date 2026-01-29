FolkNettside — Setup & Personalization Guide

Dette dokumentet beskriver hvordan du bruker `SiteUpdater3.py` og `navbarupdater.py`, hva de viktigste mappene inneholder, og hvor du gjør personaliseringer på siden.

Viktige mapper

- `assets/` — CSS, JS og statiske tema-filer.
- `includes/` — gjenvendbare deler som injiseres i sidene: `navbar.html`, `sidebar.html`, loader-scripts.
- `semestre/` — kursinnhold per semester; hver kursmappe inneholder `index.html` og `filer/`.
- `img/` — delte bilder, f.eks. `welcome-generic.svg`.
- `scripts/` — hjelpeskript for vedlikehold.
- `Quiz/` — quiz-maler og data.
- `export/` — minimal eksport for publisering.

Hvor personaliseres siden?

- `course-template.html` — side-mal: tittel, metadata, preload, og CSS/JS-rekkefølge.
- `includes/navbar.html` — endre top-navigation her.
- `includes/sidebar.html` og `includes/sidebar-*.js` — sidebar og moduler.
- `assets/css/*` — styling og tema.
- `img/welcome-generic.svg` — bytt eller rediger for ønsket velkomstbilde.
- `semestre/<nr>/<kurs>/filer` — legg kursfiler her og oppdater index.

SiteUpdater3.py — bruk

Formål: oppdatere/bygge `index.json` rekursivt, normalisere quiz-bildereferanser og velge velkomstbilder.

Eksempler:

```
python SiteUpdater3.py .
python SiteUpdater3.py . --no-progress
python SiteUpdater3.py . --no-quiz
python SiteUpdater3.py . --only    # kun denne mappen
python SiteUpdater3.py . --shallow # denne + ett nivå
```

Hva den gjør:
- Lager/oppdaterer `index.json` per mappe.
- Velger velkomstbilde (meme/bilde) eller fallback `img/welcome-generic.svg`.
- Normaliserer `quiz/quiz.json` bildestier.

navbarupdater.py — bruk

Formål: CLI for å opprette semester, opprette kurs-sider fra `course-template.html`, og oppdatere `includes/navbar.html`.

Installer (valgfritt):

```
pip install beautifulsoup4 tqdm
```

Eksempler:

```
python navbarupdater.py update-index [root]
python navbarupdater.py add-semester 3
python navbarupdater.py add-course <semester> <slug> "<Tittel>" "<Beskrivelse>"
python navbarupdater.py bulk [courses.json]
```

Hva den gjør:
- `update-index`: genererer `index.json` i mapper.
- `add-semester`: legger til semester-dropdown i navbar og oppretter mappe.
- `add-course`: lager `index.html` under `semestre/<sem>/<slug>/`, oppretter `filer/index.json` og legger lenke i navbar.

Praktiske tips

- Ta backup av `includes/navbar.html` og `course-template.html` før større endringer.
- Etter å ha lagt til filer, kjør `SiteUpdater3.py` for å oppdatere `index.json`.
- Bytt/rediger `img/welcome-generic.svg` for å fjerne uønsket tekst.

Vil du at jeg skal erstatte hoved-`README.md` med denne versjonen? Svar "erstatt README" så gjør jeg det.