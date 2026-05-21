# Locked Pages

`locked=1` er en egen visningsmodus for deling av viewer-/verktøysider uten global navbar, sidebar og annen UI-støy.

Viktig skille:

- `beskyttet` er eksisterende passord-gating i navigasjonen og skal behandles som et eget spor.
- `locked=1` er ikke tilgangskontroll. Det er bare en renere presentasjonsmodus for offentlige sider.

## Sikkerhetsgrense

- Ikke legg sensitivt innhold bak `locked=1` alene.
- Hvis innhold faktisk må beskyttes, bruk server-side begrensning eller hold filene utenfor publisert flate.
- Bruk `.noindex` for mapper som ikke skal inn i generert index/sidebar.
- Bruk `.siteignore` for local/private filer som ikke skal dukke opp i indekserte fillister.

## Hvordan bruke

Eksempler:

- `/includes/kodeLesere/stlview.html?file=/path/model.stl&locked=1`
- `/includes/kodeLesere/fusionview.html?file=/path/model.f3d&locked=true`
- `/includes/kodeLesere/3mfhydro.html?file=/path/model.3mf&locked=yes`

Når `locked` er aktiv:

- skjules global UI
- utvides viewer til full flate
- propagere `locked=1` videre til interne same-origin-lenker og iframes

## Støttede sider i denne implementasjonen

- `includes/kodeLesere/stlview.html`
- `includes/kodeLesere/fusionview.html`
- `includes/kodeLesere/3mfview.html`
- `includes/kodeLesere/f3dview.html`
- `includes/kodeLesere/aps-viewer.html`
- `includes/kodeLesere/3mfhydro.html`
- `includes/kodeLesere/hydrostaticsview.html`
