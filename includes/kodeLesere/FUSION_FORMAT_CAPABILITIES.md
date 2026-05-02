# Fusion/CAD format – hva kan vi hente ut?

Denne oversikten beskriver hva vieweren kan trekke ut **i nettleser uten backend/API**.

> Standardoppsett: Fusion-viewer-ruting er aktiv som default for støttede CAD-filer. Du kan slå den av med `?fusionviewer=0` eller `window.ENABLE_FUSION_VIEWER = false`.

## Kort oppsummert

- **Best for komponentstruktur + highlighting**: `OBJ`, `STEP/STP`.
- **Best for slicer/mesh pipeline**: `3MF`, `STL`.
- **Begrenset uten Autodesk API**: `F3D/F3Z` (containerinnhold kan leses, men ikke full feature tree).

## Format-matrise

| Filtype | Metadata (size/date/type) | Komponentnavn | Geometri-statistikk | Container-innhold | Mulig 3D highlighting* |
|---|---:|---:|---:|---:|---:|
| `.stl` | Ja | Begrenset (typisk 1 mesh) | Ja (triangelestimat/binær-ascii) | Nei | Begrenset |
| `.obj` | Ja | Ja (`o` / `g`) | Ja (v/vt/vn/f) | Nei | Ja, hvis renderer bruker grupper som egne mesh |
| `.step` / `.stp` | Ja | Ja (`PRODUCT(...)`) | Delvis (entity-telling) | Nei | Ja, hvis import/render pipeline beholder parts |
| `.iges` / `.igs` | Ja | Begrenset | Delvis (S/G/D/P/T-seksjoner) | Nei | Begrenset |
| `.3mf` | Ja | Delvis (via model-fil/entries) | Delvis | Ja (ZIP entries) | Ja, hvis modellen importeres som separate objekter |
| `.f3d` / `.f3z` | Ja | Delvis (container entries) | Begrenset | Ja (ZIP entries) | Krever Fusion/API/import-konvertering |
| `.fbm` / `.fm3` | Ja | Delvis (container entries) | Begrenset | Ja (hvis zip-lignende) | Vanligvis via eksport til STL/3MF/OBJ |
| `.sat` / `.smt` / `.x_t` / `.x_b` / `.sldprt` / `.sldasm` | Ja | Som regel nei uten dedikert parser | Begrenset | Avhenger av format | Krever dedikert parser/import |

\* "Mulig 3D highlighting" betyr at vieweren må ha scenegraph med separate deler/mesh.

## Hva er realistisk nå?

1. **Komponentliste + chosen/muted UI**: allerede mulig for formater der vi får delnavn.
2. **Faktisk isolering/farging i 3D**: mulig hvis filen lastes i renderer med delstruktur.
3. **Full Fusion timeline/feature tree**: krever Autodesk API eller Fusion-native eksportpipeline.


## Nettfunn: hvordan hente materialdata fra `.f3z` / `.3fz`

Praktisk konklusjon fra Autodesk-dokumentasjon:

- Fusion-assembly eksporteres som **`.f3z`**, og Autodesk beskriver dette som en **ZIP-konteiner** med én eller flere `f3d`-filer.
- Fordi dette er en konteiner, kan vi indeksere innholdet ved å lese ZIP entries i nettleser (JSZip), og deretter parse underfiler.
- Materialer hentes sikrest via innholdet i 3D-modellfilene (typisk 3MF-XML når tilgjengelig), ikke bare fra toppnivå i `.f3z`.

Anbefalt pipeline for vår indeks:

1. Åpne `.f3z`/`.3fz` som ZIP.
2. Bygg filindeks (sti, størrelse, hash, type).
3. Prioriter parsing av `*.3mf` inni arkivet; hent ut `basematerials`, `colorgroup`, `materialid/pid/pindex` og mapping til objekter/mesh.
4. Fallback: hvis bare `*.f3d` finnes, merk filen som “krever Fusion/APS-oversettelse” for full materialliste.
5. Lagre et normalisert materialkart: `materialName`, `density` (hvis finnes), `color`, `usageCount`, `sourcePath`.

Dette matcher også dagens begrensning i prosjektet: full Fusion feature tree/material-system krever Autodesk-API eller konverteringssteg.
