/* ============================================================================
   FolkNettsideFolk – Mobile Enhancer v3.39.0 - KOMPLETT MOBILLØSNING
   ============================================================================
   
   Fullstendig mobiloptimalisering som fungerer med alle eksisterende moduler.
   Erstatter: mobile-ui.js, bottom-bar.js og gamle mobile-enhancer.js
   
   ENDRINGER I V3.39.0:
   - 📝 QUIZ SVARALTERNATIV STYLING: Tekst vises nå inne i boksene
   - Labels får display: flex med radio button og tekst side-ved-side
   - Radio button: 24px × 24px, margin-right: 1rem
   - Tekst wrappes i span for riktig formatting
   - Hover-effekt: border-color: var(--primary)
   - Valgt alternativ: border og bakgrunn med primary-farge
   - Riktig svar: grønn border og bakgrunn
   - Feil svar: rød border og bakgrunn
   - 🔧 QUIZ STRUKTUR FORBEDRING: enhanceQuizStructure()
   - Flytter radio buttons inn i labels automatisk
   - Wrapper tekst-noder i span for styling
   - Sikrer display: flex på alle labels
   - Kjører automatisk når quiz åpnes
   - LØSER: "tekst ikke synlig på mobile quiz" problem
   
   ENDRINGER I V3.38.0:
   - 📝 QUIZ-LITE STØTTE: Sidebar lukkes automatisk når quiz åpnes
   - Observer quiz-container for synlighetsendringer
   - Lytter på quiz-knapp klikk
   - Lukker sidebar etter 100ms delay (lar quiz åpne seg først)
   - 📦 MODAL/OVERLAY HANDLER: Generell støtte for modals og overlays
   - Lukker sidebar når PDF viewer åpnes
   - Lukker sidebar når modals/overlays/lightbox/dialog åpnes
   - Lukker sidebar ved fullscreen mode
   - setupModalHandler() observer body for nye elementer
   - 🎯 SAMME OPPFØRSEL: Quiz oppfører seg nå likt som PDF viewer
   - LØSER: "sidebar blokkerer quiz" problem
   
   ENDRINGER I V3.37.0:
   - 🎨 KNAPPER FØLGER THEME: Mobile knapper bruker nå CSS-variabler
   - Hamburger-knapp: background: var(--primary)
   - Sidebar-knapp: background: var(--primary)
   - Border: var(--primary-light)
   - Hover: var(--primary-light)
   - Active: var(--primary-dark)
   - 🎨 NAVBAR/SIDEBAR THEME: Bakgrunner oppdatert
   - navbar-left.mobile-open: background: var(--bg-card)
   - sidebar: background: var(--sidebar-bg), color: var(--sidebar-text)
   - 🔄 THEME UPDATE: updateMobileTheme() oppdaterer også knapper
   - Fjerner inline styles fra knapper ved theme-bytte
   - Force reflow for å sikre synlige endringer
   - LØSER: "knapper følger ikke theme" problem
   
   ENDRINGER I V3.36.0:
   - 🎨 THEME INTEGRATION: Fullstendig integrasjon med theme-switcher.js
   - Mobilvennlig theme-velger med touch-optimalisering
   - Theme oppdateres automatisk når navbar/sidebar åpnes
   - Bottom sheet-stil theme menu på mobil (dras opp fra bunnen)
   - Touch-vennlige theme options (48px minimum touch target)
   - Lytter på 'themechange' events og oppdaterer UI automatisk
   - Fjerner hardkodede inline styles fra navbar/sidebar ved theme-bytte
   - setupThemeListener() og updateMobileTheme() funksjoner
   - Theme-switcher plasseres over bottom bar hvis den finnes
   - LØSER: "themes fungerer ikke på mobil" problem
   
   ENDRINGER I V3.35.1:
   - 🎯 CLEAR-SEARCH FIX: Fjerner den mørke blå "clear-search" knappen
   - Lagt til CSS-regler for #clear-search, .search-clear-btn og varianter
   - Oppdatert cleanupSearchOverlay() for å fjerne disse knappene aktivt
   - Lagt til aria-label selektorer for bedre identifisering
   - LØSER: "mørk blå knapp ved siden av søkebar" problem
   
   ENDRINGER I V3.35.0:
   - 🧹 CLEANUP: Fjernet "TIDLIGERE SØK"-funksjonalitet fullstendig
   - Lagt til cleanupSearchOverlay() som aktivt fjerner:
     * #recent-searches-container og lignende elementer
     * "TIDLIGERE SØK"-overskrifter (tekst-basert søk)
     * Ekstra lukkeknapper (bevarer kun top-close-btn)
   - 👁️ OBSERVER: observeSearchOverlay() overvåker DOM for søk-overlays
   - Automatisk cleanup hver gang search overlay åpnes
   - Kraftigere CSS-regler for å skjule disse elementene
   - LØSER: "TIDLIGERE SØK synlig" + "ekstra lukkeknapp" problemer
   
   ENDRINGER I V3.34.0:
   - 🎨 FORENKLET SØKEBAR: Søkebaren er nå enkel og ren
   - Fjernet clear-knapp (X) - ikke nødvendig
   - Fjernet "TIDLIGERE SØK" dropdown og alle search suggestions
   - Søkefelt får normal padding: 0.75rem 1rem (ingen plass til clear-knapp)
   - 📍 SØKEBAR UNDER KNAPPENE: Knappene ligger nå OVER søkebaren
   - Søkebar z-index: 99 (under knappene 10001)
   - Søkebar top padding: 4.5rem (plass til knappene)
   - 🔵 SIDEBAR-KNAPP ALLTID FIXED: Forblir blå fixed knapp
   - Ingen flytting til søkebar lenger
   - position: fixed !important alltid
   - Fjernet all knapp-flyttings-logikk
   - LØSER: "søkebar rotete" + "knapper på feil plass" problemer
   
   ENDRINGER I V3.34.0:
   - 🔄 MUTUAL EXCLUSION: Navbar og sidebar lukker hverandre
   - Åpne navbar → lukker sidebar automatisk
   - Åpne sidebar → lukker navbar automatisk
   - Eksponert toggleSidebar globalt (window.toggleSidebar, state.toggleSidebar)
   - 📍 SIDEBAR-KNAPP FLYTTING: Knapp flyttes inn i søkebaren når åpen
   - position: static når sidebar åpen (ikke fixed)
   - Flytter til .sidebar-search-container ved åpning
   - Flytter tilbake til body ved lukking
   - .sidebar-search-container får display: flex, gap: 0.5rem
   - 🎨 NO OVERLAP: Knappene ligger ikke lenger over søkebaren
   - LØSER: "knapper overlapper søkebar" + "kan ikke lukke den ene fra den andre"
   
   ENDRINGER I V3.34.0:
   - 🔍 SØKEBAR FORBEDRINGER: Clear-knapp (X) i høyre side av søkefeltet
   - position: absolute, right: 0.5rem, width: 1.5rem, border-radius: 50%
   - Input får padding-right: 2.5rem for å gi plass til clear-knapp
   - 🚫 SKJUL SØKEHISTORIKK: datalist, .search-suggestions, .search-history hidden
   - 📍 KNAPPER LÅST TIL TOPPEN: Båt og sidebar-knapper alltid synlige
   - top: 0.75rem (redusert fra 1rem)
   - z-index: 10001 på begge (over sidebar søkebar z-index: 100)
   - 📊 "ØVINGER" HEADER SYNLIG: display: block, padding for bedre struktur
   - font-size: 1.2rem, padding: 1rem 1.5rem
   - LØSER: "rotete topp" + "søkehistorikk" + "knapper forsvinner" problemer
   
   ENDRINGER I V3.34.0:
   - 🎨 STRUKTUR-CLEANUP: Edge-to-edge design for renere layout
   - Fjernet padding på sidebar (0 istedenfor 1rem)
   - Fjernet border-radius på alle elementer (0 istedenfor 6px/4px)
   - Dropdowns: margin: 0, border-bottom for separasjon
   - Links: padding: 1rem 1.5rem 1rem 2rem (indent for hierarchy)
   - 📌 STICKY SØKEBAR: Låst til toppen av sidebar
   - position: sticky, top: 0, z-index: 100
   - Egen bakgrunn, padding, border-bottom, box-shadow
   - Scroller ikke med innhold
   - 🗑️ H3 HEADER SKJULT: display: none for å spare plass
   - Kan aktiveres igjen ved å un-comment alternativ CSS
   - LØSER: "søkebar scroller bort" + "rotete layout" problemer
   
   ENDRINGER I V3.34.0:
   - 🚫 NOTIFIKASJONS-BLOKKERING: Aggressiv CSS for å skjule alle bannere
   - Utvide CSS-selektorer: [class*="notification"], [class*="banner"], [class*="alert"]
   - Ekstra: .sidebar > div[style*="background"] for inline-styled bannere
   - Alle får: display: none, height: 0, opacity: 0, margin: 0, padding: 0
   - 🗑️ JAVASCRIPT-FJERNING: Fjerner notifikasjons-elementer når sidebar åpnes
   - Søker etter tekst: "nye filer", "new files", "notification", "varsel"
   - Logger: "🚫 Removing notification element" når funnet
   - LØSER: "rosa banner '0 nye filer'" problem
   
   ENDRINGER I V3.34.0:
   - 🔧 CRITICAL FIX: Endret link-selector fra 'a' til '.dropdown-content a'
   - Tidligere: sidebar.querySelectorAll('a') fanget ALLE links inkl. dropdown-knapper
   - Nå: sidebar.querySelectorAll('.dropdown-content a') fanger KUN fil-links
   - Dette forhindrer at dropdown-knapper lukker sidebar
   - 🚫 OVERLAY DEAKTIVERT: display: none på .mobile-overlay for testing
   - Hvis overlay fortsatt forårsaker problemer, er den nå helt borte
   - LØSER: "sidebar lukkes ved dropdown-klikk" problem definitivt
   
   ENDRINGER I V3.34.0:
   - 🔧 CRITICAL FIX: Fjernet preventDefault/stopPropagation fra dropdown-handler
   - Disse forhindret normal klikk-oppførsel og gjorde sidebar uklikkbar
   - Dropdowns fungerer nå uten å blokkere andre events
   - 🎯 OVERLAY FIX: Endret overlay z-index fra 9997 til 9990
   - Dette sikrer at overlay ikke blokkerer dropdown-innhold
   - Lagt til pointer-events: none/auto for bedre interaksjon
   - 🚫 DEAKTIVERT AUTO-ÅPNING: Første dropdown åpnes ikke lenger automatisk
   - Brukeren må selv klikke for å åpne dropdowns
   - Dette gir bedre kontroll og forhindrer forvirring
   - LØSER: "sidebar forsvinner ved klikk" + "mørk skjerm" problemer
   
   ENDRINGER I V3.34.0:
   - 🎯 NY DROPDOWN-METODE: Dropdowns "dytter" innhold nedover (ikke accordion)
   - Fjernet "lukk andre dropdowns" logikk - flere kan være åpne samtidig
   - Dropdowns ekspanderer/kollapser uavhengig av hverandre
   - 📜 SCROLLBAR: Dropdown-content er nå scrollbar (max-height: 80vh)
   - overflow-y: auto på dropdown-content
   - -webkit-overflow-scrolling: touch for smooth mobile scrolling
   - 🎨 SMOOTH TRANSITIONS: Forbedret expand/collapse animasjoner
   - Transition: max-height 0.4s, padding 0.4s, opacity 0.3s
   - opacity: 0 når lukket, opacity: 1 når åpen
   - Sidebar er scrollbar og viser alt innhold
   - LØSER: "dropdowns ikke klikkbare" + "kan ikke scrolle" problemer
   
   ENDRINGER I V3.34.0:
   - 🔧 CRITICAL FIX: Desktop hide media query endret fra min-width: 769px til 1025px
   - Dette var hovedproblemet: 769px<skjerm<1024px ga konflikt mellom mobil og desktop CSS
   - På disse størrelsene ble både mobil CSS (max-width: 1024px) og desktop hide (min-width: 769px) aktivert
   - Resultat: Mobile-knapper ble skjult selv om mobil CSS var aktiv!
   - 🎯 LANDSCAPE FIX: Landscape mode tvinger nå også 100vw sidebar (ikke 70vw/280px)
   - Lagt til (max-width: 1024px) på landscape media query
   - LØSER: "sidebar forsvinner på smale skjermer" problem helt
   
   ENDRINGER I V3.34.0:
   - 🔧 CRITICAL FIX: Økt MOBILE_BREAKPOINT fra 768px til 1024px
   - Endret media query fra max-width: 768px til max-width: 1024px
   - Dette sikrer at mobile-enhancer aktiveres på ALLE mobile enheter
   - 🎯 FORCE SYNLIGHET: Sidebar.mobile-open får display/visibility/opacity !important
   - Lagt til right: 0 på .sidebar for å sikre full bredde
   - Lagt til min-width: 100vw for å forhindre shrinking
   - overflow-y: auto !important (før: auto)
   - LØSER: "sidebar forsvinner på smalere skjermer" problem
   
   ENDRINGER I V3.34.0:
   - 🎯 FULL-SCREEN SIDEBAR: Sidebar dekker nå hele skjermen (100vw)
   - Endret fra: width: 85vw, max-width: 320px
   - Til: width: 100vw, max-width: 100vw
   - Samme oppførsel som navbar: full overlay fra venstre
   - 🎨 FJERNET DEBUG-STYLING: Hvit boks og rød border fjernet
   - Tilbake til normal mørk sidebar med lys tekst
   - Dropdown-content: rgba(0, 0, 0, 0.15) bakgrunn
   - Links: hvit tekst med subtil bakgrunn og hover-effekt
   - Padding: 1rem left/right, 5rem top, 3rem bottom
   - LØSER: "sidebar kun synlig på bredere skjermer" problem
   
   ENDRINGER I V3.34.0:
   - 🎯 CRITICAL FIX: Venter nå på at sidebar-loader.js laster innhold
   - Problem: Sidebar åpnet FØR sidebar-loader.js hadde lastet links
   - Løsning: `openFirstDropdownWhenReady()` sjekker om links eksisterer
   - Hvis ikke klar: Retry hver 500ms i maks 10 sekunder (20 forsøk)
   - Logger: "⏳ Retry X/20 - checking for content..."
   - Når klar: Åpner automatisk første dropdown med force-styling
   - Force alle links synlige: display: flex, color: #000000
   - LØSER: "sidebar viser ingenting" - venter på sidebar-loader.js
   
   ENDRINGER I V3.34.0:
   - 🔍 DEBUG FIX: Hvit test-boks for dropdown-content synlighet
   - Hvit bakgrunn: rgba(255, 255, 255, 0.95)
   - Rød border: 2px solid #ff0000 (for å se hvor content er)
   - Gul varsel hvis content er tom: "TEST: Dropdown-content er tom"
   - Sort tekst på links for synlighet: color: #000000
   - 🔕 DEAKTIVERT: Sidebar-notifications på mobil
   - Skjuler: .sidebar-notifications, .notification-badge, .new-file-badge
   - 📊 FORBEDRET LOGGING: Logger nå også contentHTML og hasMobileActive
   - Force visibility på alle links: display: flex, visibility: visible
   - LØSER: "kan ikke se content" + "varsling-spam"
   
   ENDRINGER I V3.34.0:
   - 🎯 SIDEBAR INNHOLD FIX: Første dropdown åpnes automatisk når sidebar åpnes
   - Lagt til `firstDropdown.classList.add('mobile-active')` etter sidebar åpnes
   - 🎨 FORBEDRET UX: Dropdown-knapper er nå tydeligere
   - Subtil bakgrunn: rgba(255, 255, 255, 0.05)
   - Subtil border: rgba(255, 255, 255, 0.1)
   - Hover-effekt: rgba(255, 255, 255, 0.1)
   - Dette gjør det mer åpenbart at knappene er klikkbare
   - LØSER: "sidebar viser ingenting" problem
   
   ENDRINGER I V3.34.0:
   - 🔧 SIDEBAR FIX: Sidebar-knappen forsvinner ikke lenger når sidebar er åpen
   - Endret `body.sidebar-open .mobile-sidebar-toggle` til å beholde opacity: 1
   - innerHTML endres automatisk til ✕ når sidebar åpnes (linje 1836)
   - 🐛 SIDEBAR INNHOLD FIX: Lagt til `.sidebar.mobile-open * { display: block !important }`
   - Økt sidebar z-index til 9998 (fra 1001)
   - Økt overlay z-index til 9997 (fra 999)
   - 📊 OMFATTENDE DEBUGGING: Lagt til detaljert logging når sidebar åpnes
   - Logger: children count, display/visibility/opacity, dropdowns, headers
   - LØSER: "sidebar-knapp forsvinner" + "sidebar viser ingenting"
   
   ENDRINGER I V3.34.0:
   - 🧹 CLEAN UP: Fjernet skip-to-content link (kommentert ut enhanceAccessibility())
   - Fjernet hvit overlay boks (.navbar::before)
   - Stole KUN på CSS-selectors for å skjule Hjem-linken
   - Enklere og mer maintainbar løsning
   - Ingen z-index konflikter
   - LØSER: "skip-to-content synlig" + "overlay boks" problemer
   
   ENDRINGER I V3.34.0:
   - 🔍 MYSTERY LØST: Fant skip-to-content linken (kommer fra mobile-enhancer.js)
   - Endret skip-to-content z-index fra 10000 til 10002 (unngår konflikt med dropdowns)
   - Skjuler skip-to-content på mobil (.skip-to-content { display: none })
   - Skip-to-content er ikke nødvendig på touch-enheter (primært for keyboard nav)
   - LØSER: z-index konflikt med dropdowns
   
   ENDRINGER I V3.34.0:
   - 🎯 CLEAN RESET: Tilbake til enkel og funksjonell løsning
   - Skjuler KUN Hjem-linken: `.navbar-left > a:first-child`
   - Bevarer ALL annen funksjonalitet
   - .navbar::before overlay (200x60px, z-index: 1) for ekstra sikkerhet
   - mobile-menu-toggle har z-index: 10001 for å være synlig
   - 📜 SCROLL FIX: Redusert dropdown max-height til 40vh (fra 50vh)
   - Dette sikrer at "Can scroll" blir true oftere
   - Fjernet alle komplekse skjulings-tricks
   - LØSER: "Hjem-link synlig" + "båt forsvant" + "scroll false"
   
   ENDRINGER I V3.34.0:
   - 🎯 FINAL FIX: Hvit overlay + båt-knappen synlig
   - body::before overlay dekker det blå rektangelet (300x80px, z-index: 10000)
   - .navbar *:not(.mobile-menu-toggle) skjuler ALT unntatt båt-knappen
   - .mobile-menu-toggle får eksplisitt display: flex, opacity: 1, visibility: visible
   - mobile-menu-toggle har z-index: 10001 (over overlay)
   - pointer-events: none på overlay, pointer-events: auto på båt-knappen
   - Fjernet duplikat CSS på mobile-menu-toggle
   - LØSER: "blå rektangel" + "båt forsvant" problem DEFINITIVT
   
   ENDRINGER I V3.34.0:
   - 💀 NUCLEAR OPTION: Navbar er NÅ HELT SKJULT
   - .navbar får: width: 0, height: 0, opacity: 0, visibility: hidden
   - .navbar * får opacity: 0, visibility: hidden
   - mobile-menu-toggle får eksplisitt opacity: 1, visibility: visible
   - 📜 SCROLL FIX: Redusert dropdown max-height til 50vh (fra 70vh)
   - Dette sikrer at "Can scroll" blir true oftere
   - .navbar-left.mobile-open og barn får opacity: 1, visibility: visible
   - LØSER: "blå rektangel" + "scroll false" problem
   
   ENDRINGER I V3.34.0:
   - 💡 NY TILNÆRMING: Bruker ::before overlay i stedet for å skjule elementer
   - .navbar::before dekker hele navbar med hvit overlay (z-index: 1)
   - Båt-knappen får z-index: 10 for å være synlig over overlay
   - Mye enklere og mer robust løsning enn å skjule spesifikke elementer
   - Navbar får tilbake normal min-height: 56px
   - overflow-y: auto (ikke scroll) for bedre scrolling
   - Fjernet alle komplekse left: -9999px tricks
   - LØSER: "blå rektangel" + "scrolling fungerer ikke"
   
   ENDRINGER I V3.34.0:
   - 🐛 SUPER AGGRESSIV FIX: Fjerner det blå rektangelet fullstendig
   - Skjuler: .navbar > a, .navbar > a:first-child, a[href*="index.html"], a[href="/"]
   - Flytter elementer til left: -9999px for ekstra sikkerhet
   - width: 0, height: 0, position: absolute på alle skjulte elementer
   - Skjuler navbar-left/right barn unntatt dropdowns
   - .navbar-left.mobile-open får full synlighet med position: relative, left: auto
   - LØSER: "blå rektangel fortsatt der" problem
   
   ENDRINGER I V3.34.0:
   - 🐛 CRITICAL FIX: Båt-knappen er tilbake!
   - Mer presis navbar-skjuling: skjuler kun .navbar > a og .navbar > div (ikke mobile-menu-toggle)
   - Bruker :not(.mobile-menu-toggle) selector for å bevare båt-knappen
   - Navbar får height: auto for å la båt-knappen definere høyden
   - Alle mobile-open elementer får full synlighet
   - LØSER: "båten forsvant igjen" problem
   
   ENDRINGER I V3.34.0:
   - 🐛 CRITICAL FIX: Aggressiv navbar-skjuling
   - Alle .navbar og .navbar * får width/height: 0, visibility: hidden
   - KUN .mobile-menu-toggle får synlighet tilbake
   - ⚪ SOLID BAKGRUNN: navbar-left.mobile-open har #ffffff (ikke gjennomsiktig)
   - 📜 SCROLLING FIX: navbar-left.mobile-open og alle barn får synlighet
   - Alle barn av .mobile-open får visibility: visible, opacity: 1, pointer-events: auto
   - navbar-right.mobile-open og dens barn får også full synlighet
   - overflow-y: scroll med touch-optimalisering
   - LØSER: "blå bar" + "gjennomsiktig" + "ingen scrolling"
   
   ENDRINGER I V3.34.0:
   - 🐛 CRITICAL FIX: Fjernet blå bar over båt-knappen
   - Navbar er nå position: relative (ikke fixed) for å unngå visuell artefakt
   - 📜 SCROLL IMPROVEMENTS: Forbedret scrolling i hele navbar-menyen
   - overflow-y: scroll (ikke auto) for konsistent scroll-synlighet
   - touch-action: pan-y for å tillate vertikal scroll
   - overscroll-behavior: contain for å forhindre bounce til parent
   - body har overflow-y: auto for generell scrolling på mobil
   - Navbar-elementer får visibility: hidden i tillegg til display: none
   - LØSER: "rare blå baren" + "scrolling problemer"
   
   ENDRINGER I V3.34.0:
   - 🐛 CRITICAL FIX: Båt-knappen vises igjen!
   - Navbar skjuler nå KUN innholdet, ikke mobile-menu-toggle
   - Bruker `.navbar > *:not(.mobile-menu-toggle)` selector
   - overflow: visible på navbar for å vise båt-knappen
   - Fjernet display: none på hele navbar (det skjulte båt-knappen)
   - LØSER: "båten forsvant" problem
   
   ENDRINGER I V3.34.0:
   - 🎨 LAYOUT REFRESH: Byttet knapper i hjørnene
   - Båt-knappen (navbar) flyttet til VENSTRE hjørne
   - Sidebar-toggle flyttet til HØYRE hjørne
   - Navbar er nå FULLSTENDIG skjult (display: none, visibility: hidden)
   - Alle navbar-barn er skjult for å fjerne visuelle artefakter
   - Fjernet det blå rektangelet i venstre hjørne
   - Sidebar-toggle skjules når sidebar er åpen (opacity: 0)
   - Clean layout: Båt (venstre) + Sidebar (høyre)
   - LØSER: "fjerne blått rektangel" + "flytte båt til venstre"
   
   ENDRINGER I V3.34.0:
   - 🎨 MAJOR DESIGN REFRESH: Minimal, clean layout
   - Navbar er nå fullstendig skjult (height: 0, transparent)
   - Båt-knapp flyttet til topp-høyre hjørne (position: fixed, top: 1rem, right: 1rem)
   - Båt-ikon endres til X-ikon når navbar er åpen
   - Sidebar-toggle også i topp-venstre hjørne (top: 1rem, left: 1rem)
   - Fjernet all visuell navbar (ingen blå topp-bar)
   - Fjernet Hjem-link fra navbar på mobil
   - Sidebar starter nå fra toppen (ikke under navbar)
   - Begge knapper har z-index hierarchy (navbar-toggle: 10001, sidebar: 10000)
   - Padding-top på navbar-left.mobile-open: 5rem (plass til knapp)
   - Padding-top på sidebar: 5rem (plass til knapp)
   - LØSER: "fjerne blå i toppen" + "flytte knapp til siden" + "båt til kryss"
   
   ENDRINGER I V3.34.0:
   - 🎨 DESIGN UPDATE: Nye flotte knapper med blå gradient
   - Navbar-toggle har nå båt-ikon (⛵) i blå boks
   - Sidebar-toggle har også blå gradient design
   - Begge knapper har smooth hover-effekter (translateY + shadow)
   - Båt-ikonet roterer når navbar er åpen
   - Sidebar-toggle blir rød når sidebar er åpen
   - Gradient: #4a90e2 → #357abd (blå)
   - Gradient når åpen: #e74c3c → #c0392b (rød)
   - Box-shadow med gradient-farge for bedre dybde
   - 3rem x 3rem størrelse med border-radius: 8px
   - LØSER: "trenger bare en blå rute med båt" problem
   
   ENDRINGER I V3.34.0:
   - CRITICAL FIX: Dropdown skjules nå korrekt visuelt når lukket
   - Lagt til `.navbar .dropdown:not(.mobile-open) .dropdown-content` med display: none
   - Endret `.navbar .dropdown-content` til display: none !important (ikke bare none)
   - Flyttet barn-synlighet til kun når dropdown har mobile-open class
   - Fjernet global `.navbar .dropdown-content > *` regel som alltid viste barn
   - LØSER: "dropdown beveger seg litt men går ikke vekk" problem
   - Toggle fungerer nå både logisk OG visuelt
   
   ENDRINGER I V3.34.0:
   - CRITICAL FIX: Toggle fungerer nå korrekt for både navbar og sidebar
   - Lagt til isHandling flag med 300ms timeout på pointerdown
   - Forhindrer multiple firings av samme event
   - Oppdatert både navbar og sidebar til å bruke samme approach
   - Forbedret logging med event target info
   - Logger også når andre dropdowns lukkes
   - Konsistent ✅ emoji i logging for bedre lesbarhet
   - LØSER: "dropdown åpnes og lukkes umiddelbart" problem
   
   ENDRINGER I V3.34.0:
   - CRITICAL FIX: Toggle fungerer nå korrekt - kan lukke dropdown ved å klikke igjen
   - Byttet fra touchstart+click til pointerdown events
   - Pointerdown håndterer både touch og mus-klikk konsistent
   - Fjernet kompleks touchHandled logic som forårsaket problemer
   - CRITICAL FIX: Dropdown scroll skal nå fungere bedre
   - Fjernet touch-action: pan-y fra navbar-left som blokkerte nested scroll
   - Fjernet unødvendige tomme touch event listeners
   - Forenklet kodebase ved å bruke pointer events API
   - Forbedret logging med event type for debugging
   - LØSER: "toggle fungerer ikke" + "ingen scrolling" problem
   
   ENDRINGER I V3.34.0:
   - CRITICAL FIX: Dropdown scroll fungerer nå på touch devices
   - Lagt til touchstart og touchmove event listeners på dropdown-content
   - Event listeners bruker stopPropagation() for å hindre parent fra å blokkere
   - Lagt til touch-action: pan-y på navbar-left.mobile-open
   - Lagt til pointer-events: auto på dropdown-content
   - Lagt til will-change: scroll-position for performance
   - Økt z-index på dropdown-content til 10000
   - Redusert max-height til 70vh (fra 75vh) for bedre scroll detection
   - Logging av scrollHeight vs clientHeight for debugging
   - LØSER: "får ikke scrolle i dropdown" problem
   
   ENDRINGER I V3.34.0:
   - CRITICAL FIX: Bokser rundt ALLE navbar-elementer
   - Dropdown buttons (1. Semester, etc.) har nå bokser
   - Vanlige lenker (Hjem, Om, Kontakt) har nå bokser
   - Alle bokser har samme stil: rgba(0, 0, 0, 0.03) bakgrunn + border
   - CRITICAL FIX: Dropdown kan nå scrolle og vise alle items
   - Økt max-height til 75vh (fra 60vh)
   - Endret overflow-y fra scroll til auto
   - Forbedret dropdown border: 1px solid border rundt hele dropdown
   - Sterkere box-shadow på dropdown for bedre dybde
   - CRITICAL FIX: Forbedret alignment i dropdown
   - Dropdown-lenker har margin: 0.375rem 0.5rem (horisontal spacing)
   - Første/siste lenke har ekstra margin (0.625rem)
   - Konsistent hover/active states på alle elementer
   - LØSER: "ingen bokser" + "kan ikke scrolle" + "alignment" problem
   
   ENDRINGER I V3.34.0:
   - CRITICAL FIX: Perfect alignment på alle navbar-elementer
   - Fjernet padding fra dropdown-content (padding: 0)
   - Dropdown-lenker aligned perfekt med dropdown-button
   - Ekstra margin på første lenke (0.5rem top) i dropdown
   - Ekstra margin på siste lenke (0.5rem bottom) i dropdown
   - ALT er nå aligned med "Hjem" - ingen innrykk
   - LØSER: "Om og Kontakt lengre til venstre" + "dropdown innrykk" problem
   
   ENDRINGER I V3.34.0:
   - CRITICAL FIX: Dropdown scroll fungerer nå ordentlig
   - Endret overflow-y fra auto til scroll (alltid vis scrollbar)
   - Lagt til touch-action: pan-y for vertikal touch scroll
   - Lagt til overscroll-behavior: contain
   - Redusert max-height til 60vh for bedre scroll detection
   - CRITICAL FIX: Bokser rundt hvert dropdown alternativ
   - Subtil bakgrunn rgba(0, 0, 0, 0.03) på alle lenker
   - Border 1px solid rgba(0, 0, 0, 0.08) rundt lenker
   - CRITICAL FIX: Konsistent alignment på alle navbar-elementer
   - Alle elementer har nå margin: 0.375rem 0 (ingen horisontal margin)
   - Dropdown buttons aligned med andre elementer
   - Smooth transition på lenker (0.2s ease)
   - LØSER: "kan ikke scrolle" + "ingen bokser" + "diverse innrykk" problem
   
   ENDRINGER I V3.34.0:
   - CRITICAL FIX: Navbar dropdown har nå solid hvit bakgrunn
   - Endret fra rgba(0, 0, 0, 0.08) til var(--bg-main, #ffffff)
   - Lagt til border-top for visuell separasjon fra button
   - Forbedret scroll med max-height: 70vh
   - Lagt til litt margin-top (0.25rem) mellom button og dropdown
   - Lagt til scrollbar styling for WebKit browsers
   - Smooth iOS scrolling med -webkit-overflow-scrolling: touch
   - LØSER: "gjennomsiktig dropdown" + "kan ikke scrolle" problem
   
   ENDRINGER I V3.34.0:
   - CRITICAL FIX: Navbar dropdowns legger seg nå OVER andre elementer
   - Endret dropdown-content fra position: relative til position: absolute
   - Dropdown-content starter ved top: 100% (rett under button)
   - Fjernet margin som dyttet andre elementer ned
   - Økt z-index på dropdown-content til 9999
   - Økt z-index på .dropdown.mobile-open til 100
   - Endret box-shadow fra inset til normal shadow
   - LØSER: "dropdown dytte andre elementer ned" problem
   - FIKSET: ReferenceError - navRightOriginalParent er nå definert
   
   ENDRINGER I V3.34.0:
   - CRITICAL FIX: Navbar overlay dekker nå hele skjermen (100vh fra top: 0)
   - CRITICAL FIX: Alle navbar-elementer vises nedover i én kolonne
   - navbar-right flyttes inn i navbar-left når mobil menu åpnes
   - navbar-right gjenopprettes til original posisjon ved lukking
   - navbar-right gjenopprettes også ved viewport resize til desktop
   - Bruker data-attributes for å lagre original parent
   - navbar-left bruker flex-column for vertikal layout
   - Forbedret padding-top (72px) for å unngå overlap med navbar
   - LØSER: "overlay dekker ikke hele" + "organiser nedover" problem
   
   ENDRINGER I V3.34.0:
   - CRITICAL FIX: Navbar og sidebar dropdowns toggler nå riktig
   - Fikset dobbel-firing av touchstart og click events
   - Lagt til touchHandled flag med 500ms timeout
   - Click event skippes hvis touchstart allerede håndterte det
   - Forhindrer at dropdown åpner og lukker samtidig
   - LØSER: "dropdown lukkes ikke ved andre klikk" problem
   
   ENDRINGER I V3.34.0:
   - CRITICAL FIX: Navbar dropdown siste element vises nå helt
   - Økt max-height på dropdown-content fra 50vh til 80vh
   - Lagt til ekstra padding-bottom (3rem) på navbar-left/right
   - Lagt til ekstra padding og margin nederst i dropdown-content
   - Lagt til ekstra margin på siste lenke i dropdown
   - Økt margin mellom lenker fra 0.125rem til 0.25rem
   - LØSER: "Itak legger seg ikke over" / siste element kuttet av
   
   ENDRINGER I V3.34.0:
   - CRITICAL FIX: Navbar dropdown lenker vises nå riktig som lenker
   - Mer spesifikke CSS selectors for .navbar-left/right dropdown-content a
   - Lagt til force visibility på alle barn av dropdown-content
   - Lagt til pointer-events: auto og cursor: pointer på dropdown lenker
   - Forbedret debugging med logging av alle lenker i dropdown
   - Force visibility på lenker når dropdown åpnes (inline styles)
   - Lagt til :active state for touch feedback på dropdown lenker
   - LØSER: "dropdown innhold ser ut som ren tekst" problem
   
   ENDRINGER I V3.34.0:
   - CRITICAL FIX: Forbedret touch handling på navbar og sidebar dropdowns
   - Lagt til både click og touchstart events for bedre mobile responsiveness
   - Lagt til pointer-events: auto og touch-action: manipulation på buttons
   - Lagt til user-select: none for å forhindre tekst-seleksjon ved klikk
   - Lagt til -webkit-tap-highlight-color for visuell feedback
   - Lagt til :active states på buttons for touch feedback
   - Forbedret toggleSidebar med content verification og debugging
   - Force visibility på sidebar dropdowns når sidebar åpnes
   - Bedre debugging output med høyde-informasjon
   - LØSER: "knappene fungerer ikke optimalt" + "tom sidebar ved åpning"
   
   ENDRINGER I V3.4.9:
   - CRITICAL FIX: Navbar dropdowns lukkes nå når navbar lukkes
   - Når hamburger-meny lukkes, fjernes mobile-open fra ALLE dropdowns
   - LØSER: "dropdowns forblir åpne" problem
   - FIXED: Sidebar CSS - eksplisitt top: 56px !important
   - FIXED: Sidebar visibility - alle dropdown-elementer vises nå riktig
   - Overstyrte desktop CSS fra sidebar-loader.js for mobil
   - LØSER: "tom sidebar" + "dropdowns skjules ikke"
   
   ENDRINGER I V3.4.8:
   - CRITICAL FIX: Sidebar background explicit (var(--bg-sidebar, #2c2c2c))
   - Sidebar top: 56px (under navbar) - alltid riktig posisjon
   - Navbar dropdown.mobile-open får z-index: 10
   - Sikrer at åpen dropdown ALLTID vises over andre dropdowns
   - LØSER: "sidebar svart", "sidebar på bunn", "dropdown under andre"
   
   ENDRINGER I V3.4.7:
   - CRITICAL FIX: Navbar toggle logic fikset (remove+add bug)
   - Navbar dropdown lukker nå korrekt ved andre klikk
   - Sidebar scroll til toppen når den åpnes
   - Bedre logging av første dropdown position og visibility
   - LØSER: "dropdown lukkes ikke" + "sidebar tom"
   
   ENDRINGER I V3.4.6:
   - CRITICAL FIX: Flere CSS selectors for dropdown-content display
   - Støtter .navbar .dropdown.mobile-open .dropdown-content
   - Støtter .navbar-left.mobile-open .dropdown.mobile-open .dropdown-content
   - Støtter .navbar-right.mobile-open .dropdown.mobile-open .dropdown-content
   - Støtter .navbar.mobile-open .dropdown.mobile-open .dropdown-content
   - LØSER: Dropdown får mobile-open class men display: none
   
   ENDRINGER I V3.4.5:
   - FIXED: Navbar dropdown z-index økt til 1001 (fra 10)
   - Navbar dropdowns vises nå OVER andre navbar-elementer
   - Already-enhanced check på navbar dropdown buttons
   - Forhindrer multiple event listeners på dropdown buttons
   - LØSER: "dropdowns havner under" + "dropdown toggle ikke"
   
   ENDRINGER I V3.4.4:
   - CRITICAL DEBUG: Massiv forbedret logging i enhanceNavbar()
   - Massiv forbedret logging i enhanceSidebar()
   - Logger navbar found, has content, element details
   - Logger sidebar found, element details, button creation
   - Fallback: Enhance navbar med basic enhancement hvis har links men ikke .navbar-left/.navbar-right
   - LØSER: "Ingen hamburger-knapper" debug problem
   
   ENDRINGER I V3.4.3:
   - FIXED: Navbar dropdown z-index økt til 10 (fra 1)
   - Navbar dropdowns vises nå OVER andre elementer (ikke under)
   - LØSER: "dropdow legges ikke over det andre" problem
   
   KJENT ISSUE - SIDEBAR:
   - Hvis sidebar viser dropdowns men de er tomme (0 filer):
     Dette er sidebar-loader.js som ikke populerer disse dropdowns
     mobile-enhancer kan IKKE fikse dette (sidebar-loader.js må fikses)
   
   ENDRINGER I V3.4.2:
   - CRITICAL: Sidebar timeout økt til 10 sekunder (fra 5s)
   - Eksplisitt visibility: visible og opacity: 1 på .dropdown-oving
   - Eksplisitt color, background, border på .dropdown-btn
   - Sjekk for om sidebar-loader.js er lastet (window.SidebarLoader)
   - MASSIV forbedret logging med detaljert debug info
   - Logger hver dropdown individuelt med button text og file count
   - Logger sidebar HTML hvis ingen dropdowns funnet
   - LØSER: Sidebar helt tom (ingen øvinger vises)
   
   ENDRINGER I V3.4.1:
   - FIXED: Navbar dropdown CSS - tydeligere bakgrunn (rgba(0,0,0,0.08))
   - border-left med accent-color for visuell indikasjon
   - box-shadow inset for dybde-effekt
   - Sidebar timeout økt til 5 sekunder (fra 3s) 
   - Global isProcessingSidebar flag for å forhindre duplicate prosessering
   - Better warning logging hvis ingen filer funnet etter 5s
   - LØSER: Navbar dropdowns usynlige + Sidebar "åpner og lukker" problem
   
   ENDRINGER I V3.4.0:
   - CRITICAL FIX: Navbar innhold synlighet - alle links får nå visibility: visible og opacity: 1
   - display: block på navbar-left/right når mobile-open (ikke flex)
   - Eksplisitt color: var(--text-main, #000000) på alle links for synlighet
   - Dropdown buttons får explicit color og background styling
   - Dropdown-content links får explicit visibility og opacity styling  
   - width: 100vw på navbar overlay for full bredde
   - LØSER: Navbar åpner seg men viser hvit/tom skjerm (innhold usynlig)
   
   ENDRINGER I V3.3.9:
   - CRITICAL FIX: Navbar wrapper approach - kombinerer left/right i én dropdown
   - Sidebar CSS: Ekstra !important for å overstyre sidebar-loader.js CSS
   - Bedre event handler med cloneNode for navbar-elementer
   - Debug logging forbedret med mer detaljert info
   - ⚠️  VIKTIG: Sørg for at du bruker DENNE filen (v3.4.8), ikke gammel v3.2.0!
   
   ENDRINGER I V3.3.8:
   - FIXED: Navbar max-height med !important for å tvinge gjennom
   - Lagt til min-height: fit-content på navbar-left/right
   - Lagt til overflow-x: hidden for å forhindre horisontal scroll
   - Lagt til -webkit-overflow-scrolling: touch for smooth iOS scrolling
   - Navbar dropdown-content får max-height: 40vh og overflow-y: auto
   - Forbedret debug logging: Viser height, scrollHeight, og om innhold er scrollbart
   - CSS ID oppdatert til v3-3-8-styles
   - LØSER: Navbar for kort vertikalt - ikke alle elementer vises
   
   ENDRINGER I V3.3.8:
   - FIXED: Navbar max-height problem - bruker nå bottom: 0 for full viewport
   - Navbar strekker seg nå fra top: 56px til bottom: 0
   - Bedre background: var(--bg-main, #ffffff) for tema-støtte
   - Fjernet max-height/min-height kompleksitet
   - LØSER: Navbar viser ikke alle elementer (for kort vertikalt)
   
   ENDRINGER I V3.3.7:
   - FIXED: Sidebar timeout økt fra 2s til 3s for sidebar-loader.js
   - Bedre logging: Viser antall filer funnet i dropdowns
   - FIXED: Navbar width - lagt til width: 100% !important og margin: 0
   - Navbar z-index: 999 for å sikre at den er på toppen
   - CSS ID oppdatert til v3-3-7-styles for å tvinge refresh
   - LØSER: Navbar dekker ikke hele bredden + tomme sidebar accordions
   
   ENDRINGER I V3.3.6:
   - FIXED: Multiple event listeners problem (navbar åpner/lukker umiddelbart)
   - Lagt til data-mobile-enhanced="true" flag på navbar og sidebar
   - enhanceNavbar() og enhanceSidebar() sjekker nå om allerede enhanced
   - Forhindrer at MutationObserver legger til duplicate event listeners
   - LØSER: Ett klikk → flere handlers → åpner + lukker samtidig
   
   ENDRINGER I V3.3.5:
   - FIXED: insertBefore crash når navbar er nested struktur
   - actuallyEnhanceNavbar finner nå faktisk parent av .navbar-left
   - Støtter struktur: <div id="navbar"><nav><div class="navbar-left">
   - Hamburger-meny settes nå inn i riktig parent-element
   - LØSER: "NotFoundError: node is not a child of this node"
   
   ENDRINGER I V3.3.4:
   - FIXED: MutationObserver for navbar - venter nå på at navbar.html faktisk lastes
   - FIXED: Smart waiting for sidebar content - venter på at dropdown-content har innhold
   - Navbar enhancer venter på .navbar-left/.navbar-right før enhancement
   - Sidebar enhancer venter på faktisk innhold i .dropdown-content
   - Fallback: Prøver uansett etter 2 sekunder hvis innhold ikke lastes
   - LØSER: Timing issues når navbar/sidebar lastes async
   
   ENDRINGER I V3.3.3:
   - FIXED: Timing issue - venter nå 500ms for sidebar-loader.js å laste innhold
   - Debug logging i navbar hamburger-klikk
   - Debug logging i sidebar dropdown-klikk
   - Bedre error messages når innhold mangler
   
   ENDRINGER I V3.3.2:
   - FIXED: Støtter nå både class="navbar" og id="navbar"
   - FIXED: Støtter nå både class="sidebar" og id="sidebar" og <aside>
   - Auto-legger til .navbar og .sidebar class for CSS-kompatibilitet
   - Bedre logging: "tried .navbar and #navbar" osv.
   - Robustere element-deteksjon
   
   ENDRINGER I V3.3.1:
   - FIXED: insertBefore crash i enhanceNavbar - bruker nå navbarLeft som referanse
   - Lagt til try-catch i enhanceNavbar og enhanceSidebar for robusthet
   - Bedre error logging når noe går galt
   - Initialisering stopper ikke lenger hvis navbar enhancement feiler
   
   ENDRINGER I V3.3.0:
   - FIXED: Tomme accordions - overstyrte all desktop flyout CSS
   - Mer spesifikk CSS med !important for å overstyre position: fixed
   - Debug logging i dropdown event handlers
   - Forbedret nested flyout styling
   - Sikrer at innhold faktisk vises når accordion åpnes
   
   ENDRINGER I V3.2.0:
   - DUAL STRUCTURE SUPPORT: Støtter både gammel og ny sidebar-struktur
   - Gammel: .dropdown-oving + .dropdown-btn + .dropdown-content (sidebar-loader.js)
   - Ny: .sidebar-item + .flyout-menu (nested flyouts)
   - Auto-detekterer hvilken struktur som brukes
   
   ✅ Touch-vennlig navbar med dropdowns
   ✅ Sidebar slide-in med overlay
   ✅ Swipe gestures
   ✅ Fungerer med sidebar-loader.js v11.15.1 (.dropdown-oving)
   ✅ Fungerer med nested flyouts (.sidebar-item)
   ✅ Fungerer med søk og notifikasjoner
   ✅ Fungerer med quiz
   ✅ Minimum 48px touch targets
   ✅ Påvirker IKKE desktop
   
   BRUK: 
   <script src="/includes/mobile-enhancer.js"></script>
   
   VIKTIG: Fjern mobile-ui.js og bottom-bar.js fra HTML
   
============================================================================ */

(function() {
  'use strict';

  if (!window.normalizeUiText && !document.querySelector('script[data-text-normalize-loader]')) {
    const normalizeScript = document.createElement('script');
    normalizeScript.src = '/assets/js/brewing/text-normalize.js?v=2';
    normalizeScript.dataset.textNormalizeLoader = 'true';
    (document.head || document.documentElement).appendChild(normalizeScript);
  }
  
  // ============ KONFIGURASJON ============
  const CONFIG = {
    MOBILE_BREAKPOINT: 1024,  // Økt til 1024px for å dekke tablets også
    MIN_TOUCH_TARGET: 48,
    SWIPE_THRESHOLD: 50,
    ANIMATION_SPEED: 300
  };

  // ============ STATE ============
  let state = {
    sidebarOpen: false,
    navMenuOpen: false,
    activeDropdown: null,
    touchStartX: 0,
    touchStartY: 0
  };

  // ============ UTILITY FUNCTIONS ============
  
  function isMobile() {
    return window.innerWidth <= CONFIG.MOBILE_BREAKPOINT;
  }
  
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }
  
  function isNotebookPage() {
    return document.querySelector('.jp-Notebook') !== null ||
           document.body.classList.contains('notebook-page');
  }

  // Body scroll lock
  let scrollY = 0;
  function lockBodyScroll() {
    scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
  }

  function unlockBodyScroll() {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    window.scrollTo(0, scrollY);
  }

  // ============ MOBILE CSS ============
  
  function injectMobileCSS() {
    const cssId = 'mobile-enhancer-v3-34-0-styles';
    if (document.getElementById(cssId)) return;
    
    const css = `
/* ========================================
   MOBILE STYLES - KUN AKTIV PÅ MOBIL
======================================== */

@media (max-width: 1024px) {
  
  /* ===== NAVBAR ===== */
  .navbar {
    position: fixed !important;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    min-height: 0 !important;
    height: auto !important;
    padding: 0 !important;
    margin: 0 !important;
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
  }
  
  /* CRITICAL: Skjul KUN Hjem-linken (det blå rektangelet) */
  .navbar-left > a[href="/index.html"],
  .navbar-left > a[href*="index.html"]:first-child,
  .navbar-left > a:first-child {
    display: none !important;
    visibility: hidden !important;
  }
  
  /* mobile-menu-toggle får normal posisjonering */
  .mobile-menu-toggle {
    position: relative;
  }
  
  /* Skjul navbar-left og navbar-right når ikke åpen */
  .navbar-left:not(.mobile-open),
  .navbar-right:not(.mobile-open) {
    display: none !important;
  }
  
  /* CRITICAL: Hele body skal kunne scrolle på mobil */
  body {
    overflow-y: auto !important;
    -webkit-overflow-scrolling: touch !important;
  }
  
  /* CRITICAL: navbar-left dekker hele skjermen når åpen */
  .navbar-left.mobile-open {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    display: flex !important;
    flex-direction: column !important;
    background: var(--bg-card, #ffffff) !important;
    padding-top: 5rem !important;
    padding-bottom: 3rem !important;
    padding-left: 1rem !important;
    padding-right: 1rem !important;
    margin: 0 !important;
    overflow-y: auto !important;
    overflow-x: hidden !important;
    z-index: 9999 !important;
    opacity: 1 !important;
    visibility: visible !important;
    -webkit-overflow-scrolling: touch !important;
  }
  
  /* Alle barn av mobile-open får synlighet */
  .navbar-left.mobile-open *,
  .navbar-right.mobile-open * {
    opacity: 1 !important;
    visibility: visible !important;
  }
  
  /* navbar-right vises INNE I navbar-left på mobil */
  .navbar-left.mobile-open ~ .navbar-right.mobile-open,
  .navbar-right.mobile-open {
    display: flex !important;
    flex-direction: column !important;
    position: relative !important;
    top: auto !important;
    left: auto !important;
    right: auto !important;
    bottom: auto !important;
    width: 100% !important;
    height: auto !important;
    background: transparent !important;
    padding: 0.5rem 0 0 0 !important;
    margin: 0 !important;
    z-index: 1 !important;
    visibility: visible !important;
    opacity: 1 !important;
  }
  
  /* CRITICAL: navbar-right barn skal også være synlige */
  .navbar-right.mobile-open * {
    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;
  }
  
  /* Navbar links synlige */
  .navbar-left.mobile-open > *,
  .navbar-right.mobile-open > * {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    position: relative !important;
    transform: none !important;
  }
  
  /* Navbar links styling */
  .navbar-left.mobile-open a:not(.dropdown-content a),
  .navbar-right.mobile-open a:not(.dropdown-content a) {
    display: block !important;
    padding: 0.875rem 1rem !important;
    color: var(--text-main, #000000) !important;
    text-decoration: none !important;
    background: rgba(0, 0, 0, 0.03) !important;  /* Subtil boks */
    border: 1px solid rgba(0, 0, 0, 0.08) !important;  /* Ramme */
    border-radius: 6px !important;
    margin: 0.375rem 0 !important;
    font-size: 1rem !important;
    visibility: visible !important;
    opacity: 1 !important;
    transition: all 0.2s ease !important;
  }
  
  .navbar-left.mobile-open a:not(.dropdown-content a):hover,
  .navbar-right.mobile-open a:not(.dropdown-content a):hover {
    background: rgba(0, 0, 0, 0.06) !important;
  }
  
  .navbar-left.mobile-open a:not(.dropdown-content a):active,
  .navbar-right.mobile-open a:not(.dropdown-content a):active {
    background: rgba(0, 0, 0, 0.08) !important;
  }
  
  /* Sørg for at navbar-right får egen posisjon hvis navbar-left er åpen */
  .navbar-left.mobile-open ~ .navbar-right.mobile-open {
    top: auto !important;
    bottom: 0 !important;
    max-height: 50vh !important;
  }
  
  /* Navbar dropdowns */
  .navbar .dropdown {
    width: 100%;
  }
  
  /* Navbar dropdowns i mobile-open navbar */
  .navbar-left.mobile-open .dropdown,
  .navbar-right.mobile-open .dropdown {
    display: block !important;
    width: 100% !important;
    visibility: visible !important;
    opacity: 1 !important;
    position: relative !important;  /* Viktig for absolute dropdown-content */
  }
  
  /* CRITICAL: Åpen dropdown må ha høyere z-index enn andre dropdowns */
  .navbar .dropdown.mobile-open {
    z-index: 100 !important;        /* Høyere z-index når åpen */
    position: relative !important;
  }
  
  .navbar .dropbtn {
    width: 100%;
    padding: 0.875rem 1rem;
    min-height: ${CONFIG.MIN_TOUCH_TARGET}px;
    text-align: left;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(0, 0, 0, 0.03) !important;  /* Subtil boks */
    border: 1px solid rgba(0, 0, 0, 0.08) !important;  /* Ramme */
    border-radius: 6px;
    margin: 0.375rem 0 !important;
    color: var(--text-main, #000000) !important;
    cursor: pointer;
    pointer-events: auto !important;
    touch-action: manipulation !important;
    user-select: none !important;
    -webkit-user-select: none !important;
    -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1) !important;
    transition: all 0.2s ease !important;
  }
  
  .navbar .dropbtn:hover {
    background: rgba(0, 0, 0, 0.06) !important;
  }
  
  .navbar .dropbtn:active {
    background: rgba(0, 0, 0, 0.08) !important;
  }
  
  .navbar .dropbtn::after {
    content: '▼';
    font-size: 0.75rem;
    opacity: 0.6;
    transition: transform 0.3s ease;
  }
  
  .navbar .dropdown.mobile-open .dropbtn::after {
    transform: rotate(180deg);
  }
  
  .navbar .dropdown-content {
    position: absolute !important;
    top: 100% !important;
    left: 0 !important;
    right: 0 !important;
    display: none !important;  /* CRITICAL: Skjult by default */
    width: 100% !important;
    padding: 0 !important;
    background: var(--bg-main, #ffffff) !important;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2) !important;
    border: 1px solid rgba(0, 0, 0, 0.12) !important;
    border-radius: 6px !important;
    margin: 0.25rem 0 0 0 !important;
    max-height: 40vh !important;  /* Redusert til 40vh for bedre scroll detection */
    overflow-y: auto !important;
    overflow-x: hidden !important;
    z-index: 10000 !important;
    -webkit-overflow-scrolling: touch !important;
    touch-action: pan-y !important;
    overscroll-behavior: contain !important;
    pointer-events: auto !important;
    will-change: scroll-position !important;
  }
  
  /* CRITICAL: Skjul dropdown-content når dropdown ikke har mobile-open */
  .navbar .dropdown:not(.mobile-open) .dropdown-content {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
  }
  
  /* Scrollbar styling for dropdown (WebKit browsers) */
  .navbar .dropdown-content::-webkit-scrollbar {
    width: 6px !important;
  }
  
  .navbar .dropdown-content::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.05) !important;
    border-radius: 3px !important;
  }
  
  .navbar .dropdown-content::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2) !important;
    border-radius: 3px !important;
  }
  
  .navbar .dropdown-content::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.3) !important;
  }
  
  /* Sikre at alle barn av dropdown-content er synlige NÅR DROPDOWN ER ÅPEN */
  .navbar .dropdown.mobile-open .dropdown-content > *,
  .navbar-left.mobile-open .dropdown.mobile-open .dropdown-content > *,
  .navbar-right.mobile-open .dropdown.mobile-open .dropdown-content > * {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
  }
  
  /* Multiple selectors to catch all possible structures */
  .navbar .dropdown.mobile-open .dropdown-content,
  .navbar-left.mobile-open .dropdown.mobile-open .dropdown-content,
  .navbar-right.mobile-open .dropdown.mobile-open .dropdown-content,
  .navbar.mobile-open .dropdown.mobile-open .dropdown-content {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
  }
  
  /* CRITICAL: Navbar dropdown links - mer spesifikke selectors */
  .navbar-left.mobile-open .dropdown-content a,
  .navbar-right.mobile-open .dropdown-content a,
  .navbar .dropdown.mobile-open .dropdown-content a,
  .navbar-left.mobile-open .dropdown.mobile-open .dropdown-content a,
  .navbar-right.mobile-open .dropdown.mobile-open .dropdown-content a {
    padding: 0.875rem 1rem !important;
    min-height: ${CONFIG.MIN_TOUCH_TARGET}px !important;
    display: block !important;
    color: var(--text-main, #000000) !important;
    text-decoration: none !important;
    visibility: visible !important;
    opacity: 1 !important;
    background: rgba(0, 0, 0, 0.03) !important;
    border: 1px solid rgba(0, 0, 0, 0.08) !important;
    border-radius: 6px !important;
    margin: 0.375rem 0.5rem !important;  /* Horisontal margin for spacing fra kanten */
    pointer-events: auto !important;
    cursor: pointer !important;
    font-size: 1rem !important;
    line-height: 1.5 !important;
    transition: all 0.2s ease !important;
  }
  
  /* Ekstra margin på første lenke i dropdown */
  .navbar .dropdown-content a:first-child {
    margin-top: 0.625rem !important;
  }
  
  /* Ekstra margin på siste lenke i dropdown */
  .navbar .dropdown-content a:last-child {
    margin-bottom: 0.625rem !important;
  }
  
  .navbar-left.mobile-open .dropdown-content a:hover,
  .navbar-right.mobile-open .dropdown-content a:hover,
  .navbar .dropdown.mobile-open .dropdown-content a:hover {
    background: rgba(0, 0, 0, 0.08) !important;
  }
  
  .navbar-left.mobile-open .dropdown-content a:active,
  .navbar-right.mobile-open .dropdown-content a:active,
  .navbar .dropdown.mobile-open .dropdown-content a:active {
    background: rgba(0, 0, 0, 0.12) !important;
  }
  
  .navbar a {
    width: 100%;
    padding: 0.875rem 1rem;
    min-height: ${CONFIG.MIN_TOUCH_TARGET}px;
    display: flex;
    align-items: center;
    border-radius: 6px;
    margin: 0.125rem 0;
  }
  
  /* Hamburger button - ALLTID synlig */
  .mobile-menu-toggle {
    display: flex !important;
    align-items: center;
    justify-content: center;
    position: fixed !important;
    top: 0.75rem !important;  /* Litt høyere opp */
    left: 0.75rem !important;
    width: 3rem;
    height: 3rem;
    background: var(--primary, #4a90e2) !important;
    border: 2px solid var(--primary-light, rgba(255, 255, 255, 0.2)) !important;
    cursor: pointer;
    padding: 0;
    border-radius: 8px;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    z-index: 10001 !important;  /* Over alt annet */
    overflow: hidden;
    opacity: 1 !important;
    visibility: visible !important;
    pointer-events: auto !important;
  }
  
  .mobile-menu-toggle:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    background: var(--primary-light, #5a9ff2) !important;
  }
  
  .mobile-menu-toggle:active {
    transform: translateY(0);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    background: var(--primary-dark, #3a80d2) !important;
  }
  
  /* Båt-ikon i SVG format - NÅR LUKKET */
  .mobile-menu-toggle::before {
    content: '';
    position: absolute;
    width: 24px;
    height: 24px;
    background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.65 2.62.99 4 .99h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.78s-.34-.42-.6-.5L20 10.62V6c0-1.1-.9-2-2-2h-3V1H9v3H6c-1.1 0-2 .9-2 2v4.62l-1.29.42c-.26.08-.48.26-.6.5s-.15.52-.06.78L3.95 19zM6 6h12v3.97L12 8 6 9.97V6z"/></svg>');
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    transition: all 0.3s ease;
    opacity: 1;
  }
  
  /* X-ikon når åpen - erstatter båt */
  .mobile-menu-toggle.open::before {
    background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>');
    transform: rotate(0deg) scale(1);  /* Ingen rotasjon, normal størrelse */
  }
  
  /* Fjern de gamle hamburger-linjene */
  .mobile-menu-toggle span {
    display: none;
  }
  
  /* ===== SIDEBAR ===== */
  .sidebar {
    position: fixed !important;
    left: 0 !important;
    top: 0 !important;
    bottom: 0 !important;
    right: 0 !important;  /* Sikrer full bredde */
    width: 100vw !important;
    max-width: 100vw !important;
    min-width: 100vw !important;  /* Force full bredde */
    z-index: 9998 !important;
    background: var(--sidebar-bg, #2c3e50) !important;
    color: var(--sidebar-text, #ffffff) !important;
    transform: translateX(-100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    overflow-y: auto !important;
    overflow-x: hidden !important;
    -webkit-overflow-scrolling: touch;
    padding-top: 0 !important;  /* Fjernet padding siden søkebar er sticky */
    padding-left: 0 !important;  /* Fjernet for ren edge-to-edge */
    padding-right: 0 !important;  /* Fjernet for ren edge-to-edge */
    padding-bottom: 3rem !important;
  }
  
  .sidebar.mobile-open {
    transform: translateX(0);
    box-shadow: 4px 0 20px rgba(0, 0, 0, 0.3);
    display: block !important;  /* Force synlig */
    visibility: visible !important;  /* Force synlig */
    opacity: 1 !important;  /* Force synlig */
  }
  
  /* CRITICAL: Sikre alt sidebar-innhold er synlig når åpen */
  .sidebar.mobile-open * {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
  }
  
  /* Men skjul flyout-menyer */
  .sidebar.mobile-open .flyout-menu {
    display: none !important;
  }
  
  /* Skjul flyout-menyer på mobil (vi bruker accordion i stedet) */
  .sidebar .flyout-menu {
    display: none !important;
    position: static !important;
  }
  
  /* CRITICAL: Skjul sidebar-notifications på mobil */
  .sidebar-notifications,
  .sidebar .sidebar-notifications,
  .sidebar .notification-badge,
  .sidebar .new-file-badge,
  [class*="notification"],
  [class*="badge"],
  .notification-banner,
  .alert-banner,
  [class*="banner"],
  [class*="alert"],
  /* Ekstra aggressive selektorer for å fange rosa banner */
  .sidebar > div[style*="background"],
  .sidebar > div[class*="alert"],
  .sidebar > div[class*="notification"],
  .sidebar > div[class*="banner"],
  .sidebar > .alert,
  .sidebar > .notification {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    height: 0 !important;
    max-height: 0 !important;
    overflow: hidden !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  
  /* CRITICAL: Overstyr desktop CSS fra sidebar-loader.js */
  .sidebar .dropdown-oving,
  .sidebar .dropdown-btn,
  .sidebar h3 {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    position: relative !important;
  }
  
  /* Accordion-stil for sidebar items med flyouts */
  .sidebar .sidebar-item.mobile-accordion {
    display: block !important;
    cursor: pointer !important;
    padding: 0.875rem 1rem !important;
    min-height: ${CONFIG.MIN_TOUCH_TARGET}px !important;
    border-radius: 6px !important;
    margin: 0.25rem 0.5rem !important;
    transition: all 0.2s ease !important;
    position: relative !important;
  }
  
  .sidebar .sidebar-item.mobile-accordion:hover {
    background: var(--sidebar-hover, rgba(0, 0, 0, 0.05)) !important;
  }
  
  /* Accordion content container */
  .sidebar .mobile-accordion-content {
    max-height: 0 !important;
    overflow: hidden !important;
    transition: max-height 0.3s ease-out !important;
    padding: 0 !important;
    background: rgba(0, 0, 0, 0.05) !important;
    border-radius: 0 0 6px 6px !important;
    margin-top: 0.5rem !important;
  }
  
  .sidebar .sidebar-item.mobile-active .mobile-accordion-content {
    max-height: 2000px !important;
    padding: 0.5rem 0 !important;
  }
  
  /* Style accordion items (kopierer fra flyout) */
  .sidebar .mobile-accordion-content .flyout-item {
    padding: 0.75rem 1rem 0.75rem 1.5rem !important;
    min-height: ${CONFIG.MIN_TOUCH_TARGET}px !important;
    display: flex !important;
    align-items: center !important;
    border-left: 3px solid transparent !important;
    transition: all 0.2s ease !important;
  }
  
  .sidebar .mobile-accordion-content .flyout-item:hover {
    background: var(--sidebar-hover, rgba(0, 0, 0, 0.08)) !important;
    border-left-color: var(--primary, #004f9f) !important;
  }
  
  .sidebar .mobile-accordion-content a {
    color: var(--sidebar-text, #333) !important;
    text-decoration: none !important;
    display: block !important;
    width: 100% !important;
    font-size: 0.9rem !important;
  }
  
  /* Arrow indicator for accordion */
  .sidebar .mobile-arrow {
    margin-left: auto !important;
    transition: transform 0.3s ease !important;
    font-size: 0.8rem !important;
    color: var(--sidebar-text, #333) !important;
  }
  
  .sidebar .sidebar-item.mobile-active .mobile-arrow {
    transform: rotate(180deg) !important;
  }
  
  /* Sidebar header - skjul eller minimer på mobil */
  .sidebar h3 {
    display: block !important;  /* Vis header */
    font-size: 1.2rem !important;
    margin: 0 !important;
    padding: 1rem 1.5rem 0.75rem 1.5rem !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
    background: var(--bg-sidebar, #2c2c2c) !important;
  }
  
  /* Sidebar search container - UNDER knappene */
  .sidebar-search-container {
    position: sticky !important;
    top: 0 !important;
    z-index: 99 !important;  /* Under knappene (10001) */
    background: var(--bg-sidebar, #2c2c2c) !important;
    padding: 4.5rem 1rem 0.75rem 1rem !important;  /* Ekstra top padding for knappene */
    margin: 0 !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
  }
  
  /* Søkefelt styling - ingen clear-knapp */
  .sidebar-search-container input {
    width: 100% !important;
    padding: 0.75rem 1rem !important;  /* Normal padding */
    background: rgba(255, 255, 255, 0.1) !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
    border-radius: 8px !important;
    color: var(--sidebar-text, #ffffff) !important;
    font-size: 0.95rem !important;
  }
  
  .sidebar-search-container input::placeholder {
    color: rgba(255, 255, 255, 0.5) !important;
  }
  
  /* Skjul søkehistorikk/suggestions dropdown og "TIDLIGERE SØK" */
  .sidebar-search-container datalist,
  .sidebar-search-container .search-suggestions,
  .sidebar-search-container .search-history,
  .sidebar-search-container button,
  .sidebar-search-container .clear-search,
  [class*="search-dropdown"],
  [class*="search-results"]:not(.search-results-content),
  [class*="tidligere"],
  [class*="recent"] {
    display: none !important;
    visibility: hidden !important;
  }
  
  /* KRAFTIG SKJULING AV "TIDLIGERE SØK" OG EKSTRA LUKKEKNAPPER */
  /* Skjuler "TIDLIGERE SØK"-seksjonen fra search overlay */
  #recent-searches-container,
  .recent-searches,
  [id*="recent-search"],
  [class*="recent-search"] {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    height: 0 !important;
    overflow: hidden !important;
    pointer-events: none !important;
  }
  
  /* Skjuler den mørke blå knappen med kryss (ikke top-close-btn) */
  .search-overlay .close-btn:not(.top-close-btn),
  .mobile-search-overlay .close-btn:not(.top-close-btn),
  .search-modal .close-btn:not(.top-close-btn),
  #clear-search,
  .search-clear-btn,
  [id*="clear-search"],
  [class*="clear-search"],
  [class*="search-clear"] {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    width: 0 !important;
    height: 0 !important;
    pointer-events: none !important;
  }
  
  /* Skjuler alle "TIDLIGERE SØK"-overskrifter */
  div[style*="text-transform: uppercase"]:has(*),
  div:has(> div:contains("TIDLIGERE SØK")),
  *:contains("TIDLIGERE SØK"):not(script):not(style) {
    display: none !important;
  }
  
  /* Sidebar dropdowns (.dropdown-oving style from sidebar-loader.js) */
  .sidebar .dropdown-oving {
    margin: 0 !important;  /* Edge-to-edge */
    padding: 0 !important;
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    position: relative !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
  }
  
  .sidebar .dropdown-btn {
    padding: 1rem 1.5rem !important;  /* Mer padding for touch */
    min-height: ${CONFIG.MIN_TOUCH_TARGET}px !important;
    font-size: 1rem !important;
    border-radius: 0 !important;  /* Edge-to-edge, ingen avrundede hjørner */
    transition: all 0.2s ease !important;
    position: relative !important;
    width: 100% !important;
    text-align: left !important;
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    color: var(--sidebar-text, #ffffff) !important;
    background: rgba(255, 255, 255, 0.03) !important;  /* Veldig subtil */
    border: none !important;
    border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
    cursor: pointer !important;
    pointer-events: auto !important;
    touch-action: manipulation !important;
    user-select: none !important;
    -webkit-user-select: none !important;
    -webkit-tap-highlight-color: rgba(255, 255, 255, 0.1) !important;
  }
  
  .sidebar .dropdown-btn:hover {
    background: rgba(255, 255, 255, 0.1) !important;  /* Tydeligere på hover */
  }
  
  .sidebar .dropdown-btn:active {
    background: var(--sidebar-hover, rgba(255, 255, 255, 0.2)) !important;
  }
  
  /* Accordion-stil for dropdown-content på mobil */
  .sidebar .dropdown-content {
    /* Overstyr desktop flyout styling */
    display: none !important;
    position: static !important;
    width: 100% !important;
    left: auto !important;
    top: auto !important;
    right: auto !important;
    bottom: auto !important;
    padding: 0 !important;
    margin: 0 !important;
    box-shadow: none !important;
    background: rgba(0, 0, 0, 0.15) !important;  /* Mørk bakgrunn for innhold */
    border-radius: 0 !important;  /* Edge-to-edge */
    max-height: 0 !important;
    overflow: hidden !important;
    opacity: 0 !important;
    transform: none !important;
    transition: max-height 0.4s ease, padding 0.4s ease, opacity 0.3s ease !important;
  }
  
  .sidebar .dropdown-oving.mobile-active > .dropdown-content {
    display: block !important;
    max-height: 80vh !important;  /* Høy nok til å vise mye, men ikke uendelig */
    padding: 0.5rem 0 !important;
    background: rgba(0, 0, 0, 0.15) !important;
    overflow-y: auto !important;  /* Scrollbar hvis for mye innhold */
    overflow-x: hidden !important;
    -webkit-overflow-scrolling: touch;
    opacity: 1 !important;  /* Synlig når aktiv */
  }
  
  /* Fjernet :empty::after test-tekst - ikke lenger nødvendig */
  
  .sidebar .dropdown-content a {
    padding: 1rem 1.5rem 1rem 2rem !important;  /* Mer padding, indent for hierarchy */
    min-height: ${CONFIG.MIN_TOUCH_TARGET}px !important;
    display: flex !important;
    align-items: center !important;
    border-radius: 0 !important;  /* Edge-to-edge */
    margin: 0 !important;
    color: var(--sidebar-text, #ffffff) !important;  /* Hvit tekst på mørk bakgrunn */
    background: transparent !important;
    text-decoration: none !important;
    transition: all 0.2s ease !important;
    border: none !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.03) !important;
    font-weight: 400 !important;
  }
  
  .sidebar .dropdown-content a:hover {
    background: rgba(255, 255, 255, 0.08) !important;
  }
  
  .sidebar .dropdown-content a:active {
    background: rgba(255, 255, 255, 0.12) !important;
  }
    font-size: 0.9rem !important;
    position: static !important;
    left: auto !important;
    right: auto !important;
    top: auto !important;
    white-space: normal !important;
    color: var(--sidebar-text, #fff) !important;
    text-decoration: none !important;
  }
  
  /* Nested folder items på mobil */
  .sidebar .dropdown-content .nested-folder-item {
    padding: 0.75rem 1rem 0.75rem 1.5rem !important;
    min-height: ${CONFIG.MIN_TOUCH_TARGET}px !important;
    position: relative !important;
    cursor: pointer !important;
  }
  
  .sidebar .dropdown-content .nested-folder-item::after {
    content: '▸' !important;
    position: absolute !important;
    right: 1rem !important;
    transition: transform 0.3s ease !important;
  }
  
  .sidebar .dropdown-content .nested-folder-item.mobile-active::after {
    transform: rotate(90deg) !important;
  }
  
  /* Nested flyouts - vis som accordion på mobil */
  .sidebar .nested-flyout {
    display: none !important;
    position: static !important;
    width: 100% !important;
    left: auto !important;
    top: auto !important;
    right: auto !important;
    bottom: auto !important;
    padding: 0 0 0 1rem !important;
    margin: 0 !important;
    box-shadow: none !important;
    background: rgba(0, 0, 0, 0.15) !important;
    max-height: 0 !important;
    overflow: hidden !important;
    opacity: 1 !important;
    transform: none !important;
    transition: max-height 0.3s ease !important;
  }
  
  .sidebar .nested-folder-item.mobile-active + .nested-flyout {
    display: block !important;
    max-height: 2000px !important;
    padding: 0.25rem 0 0.25rem 1rem !important;
  }
  
  .sidebar .nested-flyout a {
    padding: 0.75rem 1rem 0.75rem 1.5rem !important;
    min-height: ${CONFIG.MIN_TOUCH_TARGET}px !important;
    display: flex !important;
    align-items: center !important;
    position: static !important;
    left: auto !important;
    right: auto !important;
    color: var(--sidebar-text, #fff) !important;
    text-decoration: none !important;
  }
  
  /* Sidebar toggle button */
  .mobile-sidebar-toggle {
    display: flex !important;
    position: fixed !important;  /* Alltid fixed */
    right: 0.75rem !important;
    top: 0.75rem !important;
    z-index: 10001 !important;
    background: var(--primary, #4a90e2) !important;
    color: white;
    border: 2px solid var(--primary-light, rgba(255, 255, 255, 0.2)) !important;
    border-radius: 8px;
    padding: 0;
    cursor: pointer;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
    font-size: 1.5rem;
    width: 3rem;
    height: 3rem;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
  }
  
  .mobile-sidebar-toggle:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    background: var(--primary-light, #5a9ff2) !important;
  }
  
  .mobile-sidebar-toggle:active {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    background: var(--primary-dark, #3a80d2) !important;
  }
  
  /* Overlay */
  .mobile-overlay {
    display: none !important;  /* DEAKTIVERT for testing */
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 9990 !important;
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s ease;
    pointer-events: none;
  }
  
  .mobile-overlay.show {
    display: none !important;  /* DEAKTIVERT for testing */
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }
  
  /* ===== CONTENT AREA ===== */
  .wrapper {
    margin-left: 0 !important;
    width: 100% !important;
    padding-top: 56px;
  }
  
  .content {
    padding: 1rem !important;
    width: 100% !important;
  }
  
  .content h1 {
    font-size: 1.75rem !important;
    margin-top: 0.5rem;
  }
  
  /* ===== QUIZ OPTIMALISERING ===== */
  #quiz-container {
    margin-top: 1rem;
  }
  
  .quiz-header {
    padding: 1rem;
  }
  
  .quiz-header h2 {
    font-size: 1.35rem;
  }
  
  .quiz-topcontrols {
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .quiz-q {
    padding: 1rem;
    margin: 0.75rem 0;
  }
  
  .quiz-choice,
  .quiz-q label {
    padding: 1rem !important;
    min-height: ${CONFIG.MIN_TOUCH_TARGET}px !important;
    font-size: 1rem !important;
    margin: 0.5rem 0 !important;
  }
  
  /* QUIZ RADIO BUTTONS: Plasser tekst inne i boksene på mobil */
  .quiz-q label {
    display: flex !important;
    align-items: center !important;
    justify-content: flex-start !important;
    position: relative !important;
    cursor: pointer !important;
    border: 2px solid var(--border-color, #e2e8f0) !important;
    border-radius: 8px !important;
    background: var(--bg-card, #ffffff) !important;
    transition: all 0.2s ease !important;
  }
  
  .quiz-q label:hover {
    border-color: var(--primary, #004f9f) !important;
    background: var(--primary-transparent, rgba(0, 79, 159, 0.05)) !important;
  }
  
  /* Radio button styling */
  .quiz-q input[type="radio"] {
    width: 24px !important;
    height: 24px !important;
    min-width: 24px !important;
    margin-right: 1rem !important;
    cursor: pointer !important;
    flex-shrink: 0 !important;
  }
  
  /* Tekst ved siden av radio button */
  .quiz-q label span,
  .quiz-q label > *:not(input) {
    flex: 1 !important;
    text-align: left !important;
    line-height: 1.5 !important;
  }
  
  /* Valgt alternativ */
  .quiz-q input[type="radio"]:checked + span,
  .quiz-q label:has(input[type="radio"]:checked) {
    border-color: var(--primary, #004f9f) !important;
    background: var(--primary-transparent, rgba(0, 79, 159, 0.1)) !important;
    font-weight: 600 !important;
  }
  
  /* Riktig svar (grønn) */
  .quiz-q label.correct,
  .quiz-q label:has(input.correct) {
    border-color: var(--success, #10b981) !important;
    background: rgba(16, 185, 129, 0.1) !important;
  }
  
  /* Feil svar (rød) */
  .quiz-q label.incorrect,
  .quiz-q label:has(input.incorrect) {
    border-color: var(--error, #ef4444) !important;
    background: rgba(239, 68, 68, 0.1) !important;
  }
  
  .quiz-btn {
    width: 100% !important;
    padding: 1rem !important;
    min-height: ${CONFIG.MIN_TOUCH_TARGET}px !important;
    font-size: 1rem !important;
    margin: 0.5rem 0 !important;
  }
  
  /* ===== THEME SWITCHER ===== */
  .theme-switcher {
    bottom: 20px !important;
    right: 20px !important;
    z-index: 998;
  }
  
  .theme-toggle-btn {
    width: 50px !important;
    height: 50px !important;
    font-size: 1.5rem !important;
  }
  
  .theme-menu {
    bottom: 60px !important;
    right: 0 !important;
  }
  
  /* ===== BOTTOM NAVIGATION (OPTIONAL) ===== */
  .bottom-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--navbar-bg, linear-gradient(135deg, #667eea 0%, #764ba2 100%));
    display: flex;
    justify-content: space-around;
    padding: 0.5rem;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
    z-index: 997;
  }
  
  .bottom-bar button {
    flex: 1;
    padding: 0.75rem 0.5rem;
    background: transparent;
    border: none;
    color: var(--navbar-text, #ffffff);
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s ease;
    border-radius: 6px;
  }
  
  .bottom-bar button:active {
    background: rgba(255, 255, 255, 0.1);
    transform: scale(0.95);
  }
  
  /* Hvis bottom bar er aktiv, legg til padding på content */
  body.has-bottom-bar .wrapper {
    padding-bottom: 60px;
  }
  
  body.has-bottom-bar .content,
  body.has-bottom-bar main,
  body.has-bottom-bar .main-content {
    padding-bottom: calc(76px + env(safe-area-inset-bottom, 0px)) !important;
  }
  
  /* ===== ACCESSIBILITY ===== */
  *:focus-visible {
    outline: 2px solid var(--primary, #004f9f) !important;
    outline-offset: 2px !important;
  }
  
  /* ===== LANDSCAPE MODE ===== */
  @media (orientation: landscape) and (max-width: 1024px) {
    /* Sidebar forblir full-screen også i landscape */
    .sidebar {
      width: 100vw !important;
      max-width: 100vw !important;
    }
    
    .navbar-left,
    .navbar-right {
      max-height: calc(100vh - 56px);
    }
  }
}

  /* ============ THEME SWITCHER MOBILE OPTIMALISERING ============ */
  
  /* Theme switcher plassering på mobil */
  @media (max-width: 1024px) {
    .theme-switcher {
      position: fixed !important;
      bottom: 5rem !important; /* Over bottom bar hvis den finnes */
      right: 1rem !important;
      z-index: 9999 !important; /* Under mobile-knapper (10001) */
    }
    
    .theme-toggle-btn {
      width: 3rem !important;
      height: 3rem !important;
      min-width: 3rem !important;
      min-height: 3rem !important;
      font-size: 1.5rem !important;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2) !important;
      background: var(--bg-card, #ffffff) !important;
      border: 2px solid var(--border-color, #e2e8f0) !important;
      color: var(--text-main, #1a202c) !important;
    }
    
    .theme-toggle-btn:active {
      transform: scale(0.9) !important;
    }
    
    /* Theme menu på mobil */
    .theme-menu {
      position: fixed !important;
      bottom: 0 !important;
      left: 0 !important;
      right: 0 !important;
      width: 100% !important;
      max-width: 100% !important;
      border-radius: 1rem 1rem 0 0 !important;
      max-height: 70vh !important;
      overflow-y: auto !important;
      -webkit-overflow-scrolling: touch !important;
      padding: 1rem 0 !important;
      transform: translateY(100%) !important;
    }
    
    .theme-menu.open {
      transform: translateY(0) !important;
    }
    
    /* Touch-vennlige theme options */
    .theme-option {
      padding: 1rem 1.5rem !important;
      min-height: ${CONFIG.MIN_TOUCH_TARGET}px !important;
      font-size: 1rem !important;
      touch-action: manipulation !important;
      -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1) !important;
    }
    
    .theme-option span {
      font-size: 1rem !important;
    }
    
    .theme-color {
      width: 2rem !important;
      height: 2rem !important;
    }
    
    /* Overlay for theme menu */
    .theme-menu::before {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: -1;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
    }
    
    .theme-menu.open::before {
      opacity: 1;
      pointer-events: auto;
    }
  }
  
  /* Juster hvis bottom-bar er aktiv */
  body.has-bottom-bar .theme-switcher {
    bottom: 6rem !important;
  }

/* ===== HIDE PÅ DESKTOP ===== */
@media (min-width: 1025px) {
  .mobile-menu-toggle,
  .mobile-sidebar-toggle,
  .mobile-overlay,
  .bottom-bar {
    display: none !important;
  }
}
`;
    
    const style = document.createElement('style');
    style.id = cssId;
    style.textContent = css;
    document.head.appendChild(style);
    
    console.log('✓ Mobile CSS injected');
  }

  // ============ NAVBAR ENHANCEMENTS ============
  
  function enhanceNavbar() {
    if (!isMobile()) {
      console.log('⚠️  Not mobile - skipping navbar enhancement');
      return;
    }
    
    console.log('📱 Starting navbar enhancement...');
    
    // Støtt både class="navbar" og id="navbar"
    const navbar = document.querySelector('.navbar') || document.querySelector('#navbar');
    if (!navbar) {
      console.error('❌ No navbar found (tried .navbar and #navbar)');
      return;
    }
    
    console.log('✓ Navbar found:', navbar.tagName, navbar.className, navbar.id);
    
    // Legg til .navbar class hvis den mangler (for CSS-kompatibilitet)
    if (!navbar.classList.contains('navbar')) {
      navbar.classList.add('navbar');
      console.log('✓ Added .navbar class for CSS compatibility');
    }
    
    // VIKTIG: Sjekk om navbar har innhold
    const hasContent = navbar.querySelector('.navbar-left') || navbar.querySelector('.navbar-right');
    
    console.log('Navbar has content:', !!hasContent);
    
    if (!hasContent) {
      console.log('⚠️  Navbar found but empty - waiting for content to load...');
      
      // Sett opp MutationObserver for å vente på innhold
      const observer = new MutationObserver((mutations) => {
        const navLeft = navbar.querySelector('.navbar-left');
        const navRight = navbar.querySelector('.navbar-right');
        
        if (navLeft || navRight) {
          console.log('✓ Navbar content loaded - enhancing now...');
          observer.disconnect();
          // Kjør enhancement
          actuallyEnhanceNavbar(navbar);
        }
      });
      
      observer.observe(navbar, {
        childList: true,
        subtree: true
      });
      
      // Fallback: Prøv igjen etter 2 sekunder
      setTimeout(() => {
        observer.disconnect();
        if (navbar.querySelector('.navbar-left') || navbar.querySelector('.navbar-right')) {
          console.log('✓ Navbar content found after timeout - enhancing...');
          actuallyEnhanceNavbar(navbar);
        } else {
          console.error('❌ Navbar content still not loaded after 2s');
          console.log('   Navbar HTML:', navbar.innerHTML.substring(0, 200));
          // FALLBACK: Enhance uansett hvis navbar har lenker
          const links = navbar.querySelectorAll('a');
          if (links.length > 0) {
            console.log('⚠️  Found', links.length, 'links - attempting basic enhancement...');
            actuallyEnhanceNavbar(navbar);
          }
        }
      }, 2000);
      
      return;
    }
    
    // Navbar har innhold - enhance umiddelbart
    actuallyEnhanceNavbar(navbar);
  }
  
  function actuallyEnhanceNavbar(navbarContainer) {
    try {
      console.log('📱 Enhancing navbar for mobile...');
    
    // VIKTIG: Sjekk om allerede enhanced
    if (navbarContainer.dataset.mobileEnhanced === 'true') {
      console.log('⚠️  Navbar already enhanced - skipping');
      return;
    }
    
    // VIKTIG: Finn den FAKTISKE navbar som er parent av .navbar-left
    // navbarContainer kan være en wrapper-div, mens navbar-left er i en nested <nav>
    const navbarLeft = navbarContainer.querySelector('.navbar-left');
    const navbarRight = navbarContainer.querySelector('.navbar-right');
    
    if (!navbarLeft && !navbarRight) {
      console.error('❌ No .navbar-left or .navbar-right found in navbar!');
      return;
    }
    
    // CRITICAL: Lagre original parent av navbar-right for å gjenopprette senere
    // Lagrer som data-attributes så det er tilgjengelig senere
    const navRightOriginalParent = navbarRight?.parentElement;
    const navRightNextSibling = navbarRight?.nextSibling;
    
    if (navbarRight && navRightOriginalParent) {
      navbarRight.dataset.originalParentId = navRightOriginalParent.id || 'navbar-parent';
      if (!navRightOriginalParent.id) {
        navRightOriginalParent.id = 'navbar-parent-' + Date.now();
        navbarRight.dataset.originalParentId = navRightOriginalParent.id;
      }
      navbarRight.dataset.hadNextSibling = navRightNextSibling ? 'true' : 'false';
    }
    
    // Finn den faktiske navbar (parent av navbarLeft/navbarRight)
    const actualNavbar = navbarLeft?.parentElement || navbarRight?.parentElement || navbarContainer;
    
    console.log('✓ Navbar structure:', {
      container: navbarContainer.tagName + (navbarContainer.id ? '#' + navbarContainer.id : ''),
      actual: actualNavbar.tagName + (actualNavbar.className ? '.' + actualNavbar.className.split(' ')[0] : ''),
      hasLeft: !!navbarLeft,
      hasRight: !!navbarRight
    });
    
    // Opprett hamburger menu hvis den ikke finnes
    let menuToggle = actualNavbar.querySelector('.mobile-menu-toggle');
    if (!menuToggle) {
      menuToggle = document.createElement('button');
      menuToggle.className = 'mobile-menu-toggle';
      menuToggle.setAttribute('aria-label', 'Åpne meny');
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.innerHTML = '<span></span><span></span><span></span>';
      
      // Sett inn først i ACTUAL navbar (ikke wrapper!)
      if (navbarLeft && navbarLeft.parentElement === actualNavbar) {
        actualNavbar.insertBefore(menuToggle, navbarLeft);
      } else {
        actualNavbar.insertBefore(menuToggle, actualNavbar.firstChild);
      }
    }
    
    // Toggle navbar menu
    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const navLeft = navbarContainer.querySelector('.navbar-left');
      const navRight = navbarContainer.querySelector('.navbar-right');
      
      const isOpen = navLeft?.classList.contains('mobile-open') || 
                     navRight?.classList.contains('mobile-open');
      
      console.log('🍔 Hamburger clicked!', { isOpen, navLeft: !!navLeft, navRight: !!navRight });
      
      if (isOpen) {
        navLeft?.classList.remove('mobile-open');
        navRight?.classList.remove('mobile-open');
        // CRITICAL: Lukk også alle dropdowns når navbar lukkes
        navbarContainer.querySelectorAll('.dropdown.mobile-open').forEach(dd => {
          dd.classList.remove('mobile-open');
        });
        menuToggle.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
        state.navMenuOpen = false;
        
        // Gjenopprett navbar-right til original posisjon
        if (navRight && isMobile()) {
          const originalParentId = navRight.dataset.originalParentId;
          const originalParent = originalParentId ? document.getElementById(originalParentId) : null;
          
          if (originalParent && navRight.parentElement !== originalParent) {
            originalParent.appendChild(navRight);
            console.log('   ✓ Restored navbar-right to original position');
          }
        }
        
        console.log('   Closed navbar menu and all dropdowns');
      } else {
        // CRITICAL: Lukk sidebar hvis den er åpen
        const sidebar = document.querySelector('.sidebar');
        if (sidebar?.classList.contains('mobile-open')) {
          console.log('   Closing sidebar before opening navbar');
          const toggleSidebarFunc = window.toggleSidebar || state.toggleSidebar;
          if (toggleSidebarFunc) {
            toggleSidebarFunc(false);
          } else {
            sidebar.classList.remove('mobile-open');
            document.body.classList.remove('sidebar-open');
          }
        }
        
        // CRITICAL: Flytt navbar-right inn i navbar-left for mobil
        if (navLeft && navRight && isMobile()) {
          // Append navbar-right som barn av navLeft
          navLeft.appendChild(navRight);
          console.log('   ✓ Moved navbar-right into navbar-left');
        }
        
        navLeft?.classList.add('mobile-open');
        navRight?.classList.add('mobile-open');
        menuToggle.classList.add('open');
        menuToggle.setAttribute('aria-expanded', 'true');
        state.navMenuOpen = true;
        
        // THEME: Oppdater theme når navbar åpnes
        setTimeout(updateMobileTheme, 50);
        
        console.log('   Opened navbar menu');
        
        // Debug CSS og innhold
        if (navLeft) {
          setTimeout(() => {
            const style = window.getComputedStyle(navLeft);
            const dropdowns = navLeft.querySelectorAll('.dropdown');
            const links = navLeft.querySelectorAll('a');
            console.log('   NavLeft display:', style.display);
            console.log('   NavLeft position:', style.position);
            console.log('   NavLeft height:', style.height);
            console.log('   NavLeft scrollHeight:', navLeft.scrollHeight + 'px');
            console.log('   NavLeft max-height:', style.maxHeight);
            console.log('   NavLeft overflow-y:', style.overflowY);
            console.log('   Dropdowns:', dropdowns.length);
            console.log('   Links:', links.length);
            console.log('   → Scrollable:', navLeft.scrollHeight > navLeft.clientHeight);
          }, 100);
        }
      }
    });
    
    // Håndter dropdown-klikk i navbar
    navbarContainer.querySelectorAll('.dropdown .dropbtn').forEach(btn => {
      const dropdown = btn.closest('.dropdown');
      
      // Skip hvis allerede har event listener
      if (btn.dataset.mobileEnhanced === 'true') return;
      btn.dataset.mobileEnhanced = 'true';
      
      const handleDropdownToggle = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Toggle denne dropdown
        const isOpen = dropdown.classList.contains('mobile-open');
        const content = dropdown.querySelector('.dropdown-content');
        
        console.log('📂 Navbar dropdown toggle triggered');
        console.log('   Button:', btn.textContent?.trim());
        console.log('   Event type:', e.type);
        console.log('   Event target:', e.target.tagName + '.' + e.target.className);
        console.log('   Currently open:', isOpen);
        console.log('   Has content:', !!content);
        console.log('   Content children:', content?.children.length || 0);
        console.log('   Dropdown classes:', dropdown.className);
        
        // Lukk alle andre dropdowns først
        navbarContainer.querySelectorAll('.dropdown').forEach(dd => {
          if (dd !== dropdown) {
            const wasOpen = dd.classList.contains('mobile-open');
            if (wasOpen) {
              dd.classList.remove('mobile-open');
              console.log('   Closed other dropdown:', dd.querySelector('.dropbtn')?.textContent?.trim());
            }
          }
        });
        
        // Toggle current - RIKTIG LOGIC!
        if (isOpen) {
          dropdown.classList.remove('mobile-open');
          console.log('   ✅ Closed dropdown (was open)');
        } else {
          dropdown.classList.add('mobile-open');
          console.log('   ✅ Opened dropdown (was closed)');
          
          // Force visibility og debugging
          if (content) {
            setTimeout(() => {
              const links = content.querySelectorAll('a');
              console.log('   Links in dropdown:', links.length);
              
              links.forEach((link, i) => {
                console.log(`      ${i+1}. ${link.textContent?.trim()} - href: ${link.getAttribute('href')}`);
                // Force visibility
                link.style.display = 'block';
                link.style.visibility = 'visible';
                link.style.opacity = '1';
                link.style.pointerEvents = 'auto';
              });
              
              const style = window.getComputedStyle(content);
              console.log('   Content display:', style.display);
              console.log('   Content visibility:', style.visibility);
              console.log('   Content position:', style.position);
              console.log('   Content z-index:', style.zIndex);
              console.log('   Content height:', content.offsetHeight + 'px');
              console.log('   Content scrollHeight:', content.scrollHeight + 'px');
              console.log('   Can scroll:', content.scrollHeight > content.clientHeight);
            }, 100);
          }
        }
      };
      
      // CRITICAL: Bruk pointerdown for å håndtere både touch og click
      // Men vi må forhindre multiple firings
      let isHandling = false;
      
      btn.addEventListener('pointerdown', (e) => {
        if (isHandling) {
          console.log('⚠️  Already handling event - skipping');
          return;
        }
        
        e.preventDefault();
        e.stopPropagation();
        isHandling = true;
        
        console.log('🖱️  Pointerdown event on dropdown button');
        handleDropdownToggle(e);
        
        // Reset etter kort tid
        setTimeout(() => {
          isHandling = false;
        }, 300);
      });
    });
    
    // Lukk navbar når man klikker utenfor
    document.addEventListener('click', (e) => {
      if (!navbarContainer.contains(e.target) && state.navMenuOpen) {
        navbarContainer.querySelector('.navbar-left')?.classList.remove('mobile-open');
        navbarContainer.querySelector('.navbar-right')?.classList.remove('mobile-open');
        navbarContainer.querySelectorAll('.dropdown').forEach(dd => dd.classList.remove('mobile-open'));
        menuToggle.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
        state.navMenuOpen = false;
      }
    });
    
    // Lukk navbar når man klikker på en link
    navbarContainer.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        if (isMobile()) {
          navbarContainer.querySelector('.navbar-left')?.classList.remove('mobile-open');
          navbarContainer.querySelector('.navbar-right')?.classList.remove('mobile-open');
          navbarContainer.querySelectorAll('.dropdown').forEach(dd => dd.classList.remove('mobile-open'));
          menuToggle.classList.remove('open');
          menuToggle.setAttribute('aria-expanded', 'false');
          state.navMenuOpen = false;
        }
      });
    });
    
    // Marker som enhanced
    navbarContainer.dataset.mobileEnhanced = 'true';
    
    console.log('✓ Navbar enhanced for mobile');
    
    // CLEANUP: Fjern "TIDLIGERE SØK" og ekstra lukkeknapper
    cleanupSearchOverlay();
    
    } catch (error) {
      console.error('❌ Error enhancing navbar:', error);
      console.error('Navbar HTML:', navbarContainer?.outerHTML?.substring(0, 500));
      // Don't throw - continue with sidebar enhancement
    }
  }
  
  // ============ CLEANUP SEARCH OVERLAY ============
  
  function cleanupSearchOverlay() {
    console.log('🧹 Cleaning up search overlay...');
    
    // Fjern "TIDLIGERE SØK"-seksjonen
    const recentSearchesSelectors = [
      '#recent-searches-container',
      '.recent-searches',
      '[id*="recent-search"]',
      '[class*="recent-search"]',
      '[class*="tidligere"]'
    ];
    
    recentSearchesSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        console.log('   🚫 Removing element:', selector);
        el.remove();
      });
    });
    
    // Fjern "TIDLIGERE SØK"-overskrifter (tekst-basert)
    document.querySelectorAll('div').forEach(div => {
      if (div.textContent.trim().toUpperCase().includes('TIDLIGERE SØK') || 
          div.textContent.trim().toUpperCase().includes('TIDLIGE SØK')) {
        console.log('   🚫 Removing "TIDLIGERE SØK" header');
        div.remove();
      }
    });
    
    // Fjern ekstra lukkeknapper (ikke top-close-btn)
    const closeButtonSelectors = [
      '.search-overlay .close-btn:not(.top-close-btn)',
      '.mobile-search-overlay .close-btn:not(.top-close-btn)',
      '.search-modal .close-btn:not(.top-close-btn)'
    ];
    
    closeButtonSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(btn => {
        console.log('   🚫 Removing extra close button:', selector);
        btn.remove();
      });
    });
    
    // Fjern clear-search knappen (den mørke blå knappen)
    const clearSearchSelectors = [
      '#clear-search',
      '.search-clear-btn',
      '[id*="clear-search"]',
      '[class*="clear-search"]',
      '[class*="search-clear"]',
      'button[aria-label*="Tøm søk"]',
      'button[aria-label*="Clear search"]'
    ];
    
    clearSearchSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(btn => {
        console.log('   🚫 Removing clear-search button:', selector);
        btn.remove();
      });
    });
    
    console.log('✓ Search overlay cleaned up');
  }
  
  // Kjør cleanup hver gang search overlay åpnes
  function observeSearchOverlay() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) { // Element node
            // Sjekk om dette er search overlay eller inneholder søkeelementer
            if (node.classList?.contains('search-overlay') || 
                node.classList?.contains('mobile-search-overlay') ||
                node.querySelector?.('[class*="search"]')) {
              console.log('🔍 Search overlay detected - cleaning up...');
              setTimeout(cleanupSearchOverlay, 100);
            }
          }
        });
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    console.log('✓ Search overlay observer active');
  }
  
  // ============ THEME INTEGRATION ============
  
  function updateMobileTheme() {
    // Sjekk om ThemeSwitcher er tilgjengelig
    if (!window.ThemeSwitcher) {
      console.log('⚠️  ThemeSwitcher not loaded yet');
      return;
    }
    
    console.log('🎨 Updating mobile theme...');
    
    // Force update av alle theme-elementer
    if (window.ThemeSwitcher.forceUpdate) {
      window.ThemeSwitcher.forceUpdate();
    }
    
    // Oppdater navbar theme
    const navbar = document.querySelector('.navbar');
    if (navbar) {
      navbar.style.background = '';
      navbar.style.backgroundColor = '';
    }
    
    // Oppdater sidebar theme
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      sidebar.style.background = '';
      sidebar.style.backgroundColor = '';
      sidebar.style.color = '';
      
      // Oppdater alle sidebar-elementer
      sidebar.querySelectorAll('*').forEach(el => {
        el.style.background = '';
        el.style.backgroundColor = '';
        el.style.color = '';
      });
    }
    
    // Oppdater dropdowns
    document.querySelectorAll('.dropdown-content').forEach(dropdown => {
      dropdown.style.background = '';
      dropdown.style.backgroundColor = '';
    });
    
    // Oppdater mobile knapper
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const sidebarToggle = document.querySelector('.mobile-sidebar-toggle');
    
    if (menuToggle) {
      menuToggle.style.background = '';
      menuToggle.style.backgroundColor = '';
      menuToggle.style.borderColor = '';
    }
    
    if (sidebarToggle) {
      sidebarToggle.style.background = '';
      sidebarToggle.style.backgroundColor = '';
      sidebarToggle.style.borderColor = '';
    }
    
    // Force reflow
    document.body.offsetHeight;
    
    console.log('✓ Mobile theme updated');
  }
  
  // Lytt på theme changes
  function setupThemeListener() {
    window.addEventListener('themechange', (e) => {
      console.log('🎨 Theme changed to:', e.detail?.theme);
      
      // Oppdater mobile UI
      if (isMobile()) {
        setTimeout(updateMobileTheme, 100);
      }
    });
    
    console.log('✓ Theme listener setup');
  }

  // ============ SIDEBAR ENHANCEMENTS ============
  
  function enhanceSidebar() {
    if (!isMobile()) {
      console.log('⚠️  Not mobile - skipping sidebar enhancement');
      return;
    }
    
    if (isNotebookPage()) {
      console.log('⚠️  Notebook page detected - skipping sidebar enhancement');
      return;
    }
    
    console.log('📱 Starting sidebar enhancement...');
    
    // Støtt både class="sidebar" og id="sidebar" eller <aside>
    const sidebar = document.querySelector('.sidebar') || 
                    document.querySelector('#sidebar') || 
                    document.querySelector('aside.sidebar') ||
                    document.querySelector('aside');
    if (!sidebar) {
      console.error('❌ No sidebar found (tried .sidebar, #sidebar, aside)');
      return;
    }
    
    console.log('✓ Sidebar found:', sidebar.tagName, sidebar.className, sidebar.id);
    
    // Legg til .sidebar class hvis den mangler (for CSS-kompatibilitet)
    if (!sidebar.classList.contains('sidebar')) {
      sidebar.classList.add('sidebar');
      console.log('✓ Added .sidebar class for CSS compatibility');
    }
    
    // VIKTIG: Sjekk om allerede enhanced
    if (sidebar.dataset.mobileEnhanced === 'true') {
      console.log('⚠️  Sidebar already enhanced - skipping');
      return;
    }
    
    try {
      console.log('📱 Enhancing sidebar for mobile...');
    
    // Opprett sidebar toggle button
    let sidebarToggle = document.querySelector('.mobile-sidebar-toggle');
    if (!sidebarToggle) {
      console.log('Creating sidebar toggle button...');
      sidebarToggle = document.createElement('button');
      sidebarToggle.className = 'mobile-sidebar-toggle';
      sidebarToggle.setAttribute('aria-label', 'Toggle sidebar');
      sidebarToggle.innerHTML = '☰';
      document.body.appendChild(sidebarToggle);
      console.log('✓ Sidebar toggle button created');
    } else {
      console.log('✓ Sidebar toggle button already exists');
    }
    
    // Opprett overlay
    let overlay = document.querySelector('.mobile-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'mobile-overlay';
      document.body.appendChild(overlay);
    }
    
    // Toggle sidebar
    function toggleSidebar(show) {
      if (show === undefined) {
        show = !state.sidebarOpen;
      }
      
      if (show) {
        // CRITICAL: Lukk navbar hvis den er åpen
        const navLeft = document.querySelector('.navbar-left');
        const navRight = document.querySelector('.navbar-right');
        if (navLeft?.classList.contains('mobile-open') || navRight?.classList.contains('mobile-open')) {
          console.log('   Closing navbar before opening sidebar');
          navLeft?.classList.remove('mobile-open');
          navRight?.classList.remove('mobile-open');
          const menuToggle = document.querySelector('.mobile-menu-toggle');
          if (menuToggle) {
            menuToggle.classList.remove('open');
            menuToggle.setAttribute('aria-expanded', 'false');
          }
          state.navMenuOpen = false;
        }
        
        sidebar.classList.add('mobile-open');
        overlay.classList.add('show');
        document.body.classList.add('sidebar-open');
        lockBodyScroll();
        sidebarToggle.innerHTML = '✕';
        state.sidebarOpen = true;
        
        // THEME: Oppdater theme når sidebar åpnes
        setTimeout(updateMobileTheme, 50);
        
        // CRITICAL: Fjern notifikasjons-bannere når sidebar åpnes
        setTimeout(() => {
          // Fjern alle elementer som kan være notifikasjoner
          const notificationSelectors = [
            '[class*="notification"]',
            '[class*="banner"]',
            '[class*="alert"]',
            '[class*="badge"]'
          ];
          
          notificationSelectors.forEach(selector => {
            sidebar.querySelectorAll(selector).forEach(el => {
              // Sjekk om elementet inneholder tekst som "nye filer" eller "new files"
              const text = el.textContent?.toLowerCase() || '';
              if (text.includes('nye filer') || text.includes('new files') || 
                  text.includes('notification') || text.includes('varsel')) {
                console.log('🚫 Removing notification element:', el.className, text.substring(0, 50));
                el.remove();
              }
            });
          });
        }, 100);
        
        // CRITICAL: Scroll sidebar til toppen når den åpnes
        setTimeout(() => {
          sidebar.scrollTop = 0;
          
          // DEBUG: Omfattende logging av sidebar-innhold
          console.log('====================================');
          console.log('📊 SIDEBAR OPENED - FULL DIAGNOSTIC');
          console.log('====================================');
          console.log('Sidebar element:', sidebar);
          console.log('Sidebar children count:', sidebar.children.length);
          console.log('Sidebar innerHTML length:', sidebar.innerHTML.length);
          
          // Sjekk alle barn
          Array.from(sidebar.children).forEach((child, i) => {
            console.log(`Child ${i+1}:`, {
              tagName: child.tagName,
              className: child.className,
              id: child.id,
              display: window.getComputedStyle(child).display,
              visibility: window.getComputedStyle(child).visibility,
              opacity: window.getComputedStyle(child).opacity,
              childrenCount: child.children.length
            });
          });
          
          // Sjekk dropdowns
          const dropdowns = sidebar.querySelectorAll('.dropdown-oving');
          console.log('Dropdowns found:', dropdowns.length);
          
          dropdowns.forEach((dd, i) => {
            const btn = dd.querySelector('.dropdown-btn');
            const content = dd.querySelector('.dropdown-content');
            const files = content?.querySelectorAll('a').length || 0;
            console.log(`Dropdown ${i+1}:`, {
              button: btn?.textContent?.trim(),
              files: files,
              btnDisplay: btn ? window.getComputedStyle(btn).display : 'N/A',
              contentDisplay: content ? window.getComputedStyle(content).display : 'N/A',
              contentMaxHeight: content ? window.getComputedStyle(content).maxHeight : 'N/A',
              hasMobileActive: dd.classList.contains('mobile-active'),
              contentHTML: content ? content.innerHTML.substring(0, 200) : 'N/A'
            });
            
            // Force visibility på dropdown-elementer
            if (btn) {
              btn.style.display = 'block';
              btn.style.visibility = 'visible';
              btn.style.opacity = '1';
            }
            if (content) {
              content.style.display = 'block';
              content.style.visibility = 'visible';
              
              // Force alle links synlige
              const links = content.querySelectorAll('a');
              links.forEach(link => {
                link.style.display = 'flex';
                link.style.visibility = 'visible';
                link.style.opacity = '1';
              });
            }
          });
          
          // Sjekk h3 elementer
          const headers = sidebar.querySelectorAll('h3');
          console.log('H3 headers found:', headers.length);
          headers.forEach((h, i) => {
            console.log(`Header ${i+1}:`, h.textContent.trim());
          });
          
          // DEAKTIVERT: Ikke auto-åpne første dropdown
          // Brukeren åpner dropdowns selv ved å klikke
          /*
          const openFirstDropdownWhenReady = () => {
            // ... kode fjernet
          };
          */
          
          console.log('====================================');
          console.log('✓ Sidebar diagnostic complete');
        }, 100);
      } else {
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('show');
        document.body.classList.remove('sidebar-open');
        unlockBodyScroll();
        sidebarToggle.innerHTML = '☰';
        state.sidebarOpen = false;
      }
    }
    
    // Event listeners
    sidebarToggle.addEventListener('click', () => toggleSidebar());
    overlay.addEventListener('click', () => toggleSidebar(false));
    
    // Eksponer toggleSidebar globalt for å kunne lukke fra navbar
    state.toggleSidebar = toggleSidebar;
    window.toggleSidebar = toggleSidebar;
    
    // ===== KONVERTER FLYOUTS TIL ACCORDION PÅ MOBIL =====
    
    console.log('🔍 Detecting sidebar structure...');
    
    // Sjekk om sidebar-loader.js er lastet
    if (window.SidebarLoader) {
      console.log('✓ sidebar-loader.js detected');
    } else {
      console.warn('⚠️  sidebar-loader.js NOT detected - sidebar may not work!');
    }
    
    // Global flag for å forhindre multiple prosesseringer
    let isProcessingSidebar = false;
    
    // Smart waiting: Sjekk om dropdown-content allerede har innhold
    const checkAndProcess = () => {
      if (isProcessingSidebar) {
        console.log('⚠️  Already processing sidebar - skipping duplicate call');
        return true; // Return true for å stoppe observer
      }
      
      const dropdownOvinger = sidebar.querySelectorAll('.dropdown-oving');
      
      if (dropdownOvinger.length === 0) {
        console.log('⚠️  No .dropdown-oving elements found yet');
        return false;
      }
      
      // Sjekk om minst én dropdown har innhold
      let hasContent = false;
      let totalFiles = 0;
      dropdownOvinger.forEach(dropdown => {
        const content = dropdown.querySelector('.dropdown-content');
        if (content && content.children.length > 0) {
          hasContent = true;
          totalFiles += content.children.length;
        }
      });
      
      if (!hasContent) {
        console.log(`⚠️  Found ${dropdownOvinger.length} dropdowns but no content yet`);
        return false;
      }
      
      console.log(`✅ Found ${dropdownOvinger.length} dropdowns with ${totalFiles} total files - processing now`);
      isProcessingSidebar = true; // Sett flag
      processDropdowns(dropdownOvinger);
      return true;
    };
    
    // Prøv umiddelbart
    if (checkAndProcess()) {
      // Ferdig!
    } else {
      // Sett opp MutationObserver for å vente på innhold
      const observer = new MutationObserver(() => {
        if (checkAndProcess()) {
          observer.disconnect();
        }
      });
      
      observer.observe(sidebar, {
        childList: true,
        subtree: true
      });
      
      // Fallback: Prøv uansett etter 10 sekunder (økt fra 5s)
      setTimeout(() => {
        if (isProcessingSidebar) {
          console.log('✓ Sidebar already processed - skipping timeout call');
          return;
        }
        
        observer.disconnect();
        const dropdownOvinger = sidebar.querySelectorAll('.dropdown-oving');
        
        console.log(`⏰ TIMEOUT (10s): Checking sidebar state...`);
        console.log(`   Dropdowns found: ${dropdownOvinger.length}`);
        
        if (dropdownOvinger.length > 0) {
          let totalFiles = 0;
          let emptyDropdowns = 0;
          
          dropdownOvinger.forEach((d, i) => {
            const c = d.querySelector('.dropdown-content');
            const files = c?.children.length || 0;
            totalFiles += files;
            if (files === 0) emptyDropdowns++;
            
            console.log(`   Dropdown ${i+1}:`, {
              button: d.querySelector('.dropdown-btn')?.textContent?.trim(),
              files: files,
              hasContent: !!c,
              contentHTML: c ? c.innerHTML.substring(0, 100) : 'NO CONTENT'
            });
          });
          
          console.log(`⚠️  Processing ${dropdownOvinger.length} dropdowns after 10s timeout`);
          console.log(`   Total files: ${totalFiles}`);
          console.log(`   Empty dropdowns: ${emptyDropdowns}`);
          
          if (totalFiles === 0) {
            console.error('❌ CRITICAL: Still no files found after 10s!');
            console.error('   Possible causes:');
            console.error('   1. sidebar-loader.js not loaded');
            console.error('   2. Script order wrong (mobile-enhancer before sidebar-loader)');
            console.error('   3. Sidebar structure different than expected');
            console.log('   Sidebar HTML:', sidebar.innerHTML.substring(0, 500));
          }
          
          isProcessingSidebar = true;
          processDropdowns(dropdownOvinger);
        } else {
          console.error('❌ NO .dropdown-oving elements found after 10s!');
          console.log('   Sidebar HTML:', sidebar.innerHTML.substring(0, 500));
          console.log('   Sidebar structure:', {
            className: sidebar.className,
            id: sidebar.id,
            children: sidebar.children.length
          });
        }
      }, 10000); // ØKT til 10 sekunder
    }
    
    function processDropdowns(dropdownOvinger) {
      
    // STRUKTUR 1: sidebar-loader.js style (.dropdown-oving)
    console.log(`Found ${dropdownOvinger.length} .dropdown-oving elements`);
    
    if (dropdownOvinger.length > 0) {
      console.log('✅ Using sidebar-loader.js structure (.dropdown-oving)');
      
      dropdownOvinger.forEach(dropdown => {
        // Skip hvis allerede prosessert
        if (dropdown.dataset.mobileEnhanced === 'true') return;
        dropdown.dataset.mobileEnhanced = 'true';
        
        const btn = dropdown.querySelector('.dropdown-btn');
        const content = dropdown.querySelector('.dropdown-content');
        
        if (!btn || !content) return;
        
        // Marker som accordion
        dropdown.classList.add('mobile-accordion');
        
        // Legg til pil hvis ikke finnes
        if (!btn.querySelector('.mobile-arrow')) {
          const arrow = document.createElement('span');
          arrow.className = 'mobile-arrow';
          arrow.innerHTML = ' ▼';
          arrow.style.cssText = 'float: right; transition: transform 0.3s;';
          btn.appendChild(arrow);
        }
        
        // Klikk-handler
        const handleDropdownToggle = (e) => {
          if (!isMobile()) return;
          
          // IKKE bruk preventDefault/stopPropagation - de forhindrer normal klikk-oppførsel
          
          const isActive = dropdown.classList.contains('mobile-active');
          
          console.log(`📱 Sidebar dropdown clicked: ${btn.textContent?.trim()}`);
          console.log(`   Currently active: ${isActive}`);
          console.log(`   Content exists: ${!!content}`);
          console.log(`   Content children: ${content?.children.length || 0}`);
          
          // NYTT: Ikke lukk andre - tillat flere åpne samtidig
          // Bare toggle denne dropdown
          dropdown.classList.toggle('mobile-active', !isActive);
          console.log(`   ✓ New state: ${dropdown.classList.contains('mobile-active') ? 'OPEN' : 'CLOSED'}`);
          
          // Force visibility if needed
          if (!isActive && content) {
            setTimeout(() => {
              const computedStyle = window.getComputedStyle(content);
              console.log(`   Content display: ${computedStyle.display}`);
              console.log(`   Content max-height: ${computedStyle.maxHeight}`);
              console.log(`   Content position: ${computedStyle.position}`);
              console.log(`   Content height: ${content.offsetHeight}px`);
            }, 100);
          }
        };
        
        // CRITICAL: Bruk pointerdown for å håndtere både touch og click
        // Men vi må forhindre multiple firings
        let isHandling = false;
        
        btn.addEventListener('pointerdown', (e) => {
          if (isHandling) {
            console.log('⚠️  Sidebar: Already handling event - skipping');
            return;
          }
          
          // IKKE bruk preventDefault/stopPropagation - lar klikket fungere normalt
          isHandling = true;
          
          handleDropdownToggle(e);
          
          // Reset etter kort tid
          setTimeout(() => {
            isHandling = false;
          }, 300);
        });
        
        // Håndter nested folder items
        const nestedFolders = content.querySelectorAll('.nested-folder-item');
        nestedFolders.forEach(folder => {
          if (folder.dataset.mobileEnhanced === 'true') return;
          folder.dataset.mobileEnhanced = 'true';
          
          folder.addEventListener('click', (e) => {
            if (!isMobile()) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            // Finn nested flyout
            const nestedFlyout = folder.nextElementSibling;
            if (nestedFlyout && nestedFlyout.classList.contains('nested-flyout')) {
              folder.classList.toggle('mobile-active');
              nestedFlyout.classList.toggle('mobile-active');
            }
          });
        });
      });
    }
    
    // STRUKTUR 2: Ny style med .sidebar-item og .flyout-menu
    const sidebarItems = sidebar.querySelectorAll('.sidebar-item');
    console.log(`Found ${sidebarItems.length} .sidebar-item elements`);
    
    if (sidebarItems.length > 0) {
      console.log('✅ Using new structure (.sidebar-item + .flyout-menu)');
      
      sidebarItems.forEach(item => {
        // Sjekk om allerede prosessert
        if (item.dataset.mobileEnhanced === 'true') return;
        
        // Sjekk om denne item har en flyout-menu
        const flyoutMenu = item.querySelector('.flyout-menu');
        if (!flyoutMenu) return; // Denne item har ingen flyout
        
        // Marker item som accordion på mobil
        item.classList.add('mobile-accordion');
        item.dataset.mobileEnhanced = 'true'; // Marker som prosessert
        
        // Opprett accordion innhold container hvis den ikke finnes
        let accordionContent = item.querySelector('.mobile-accordion-content');
        if (!accordionContent) {
          accordionContent = document.createElement('div');
          accordionContent.className = 'mobile-accordion-content';
          
          // Kopier innholdet fra flyout-menu til accordion-content
          const flyoutItems = flyoutMenu.querySelectorAll('.flyout-item');
          flyoutItems.forEach(flyoutItem => {
            const accordionItem = flyoutItem.cloneNode(true);
            accordionContent.appendChild(accordionItem);
          });
          
          item.appendChild(accordionContent);
        }
        
        // Legg til pil-indikator hvis ikke finnes
        let arrow = item.querySelector('.mobile-arrow');
        if (!arrow) {
          const itemText = item.querySelector('.item-text, .folder-name, span');
          if (itemText) {
            arrow = document.createElement('span');
            arrow.className = 'mobile-arrow';
            arrow.innerHTML = '▼';
            itemText.appendChild(arrow);
          }
        }
        
        // Klikk-handler for å toggle accordion
        item.addEventListener('click', function(e) {
          if (!isMobile()) return; // Kun på mobil
          
          // Ikke toggle hvis man klikket på en link i accordion-content
          if (e.target.closest('.mobile-accordion-content a')) {
            return;
          }
          
          // Ikke toggle hvis man klikket på selve flyout-menu (for desktop)
          if (e.target.closest('.flyout-menu') && !e.target.closest('.mobile-accordion-content')) {
            return;
          }
          
          e.preventDefault();
          e.stopPropagation();
          
          // Toggle active class
          const isActive = item.classList.contains('mobile-active');
          
          // Lukk alle andre accordions
          sidebar.querySelectorAll('.sidebar-item.mobile-active').forEach(otherItem => {
            if (otherItem !== item) {
              otherItem.classList.remove('mobile-active');
            }
          });
          
          // Toggle current item
          item.classList.toggle('mobile-active', !isActive);
        });
      });
    }
    
    if (dropdownOvinger.length === 0 && sidebarItems.length === 0) {
      console.log('⚠️  No recognizable sidebar structure found');
    }
    
    // Lukk sidebar kun når man klikker på fil-links INNE I dropdown-content
    sidebar.querySelectorAll('.dropdown-content a').forEach(link => {
      link.addEventListener('click', (e) => {
        if (isMobile()) {
          console.log('📎 File link clicked in dropdown - closing sidebar:', link.textContent?.trim());
          setTimeout(() => toggleSidebar(false), 300);
        }
      });
    });
    
    // IKKE lukk sidebar for andre links (dropdown-knapper osv)
    
    // Lukk sidebar når man klikker på links i accordion-content
    sidebar.querySelectorAll('.mobile-accordion-content a').forEach(link => {
      link.addEventListener('click', () => {
        if (isMobile()) {
          setTimeout(() => toggleSidebar(false), 300);
        }
      });
    });
    
    // Swipe gestures
    let touchStartX = 0;
    let touchStartY = 0;
    
    document.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });
    
    document.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      
      const diffX = touchEndX - touchStartX;
      const diffY = touchEndY - touchStartY;
      
      // Sjekk om det er en horisontal swipe
      if (Math.abs(diffX) > Math.abs(diffY)) {
        // Høyre swipe fra venstre kant = åpne sidebar
        if (diffX > CONFIG.SWIPE_THRESHOLD && touchStartX < 50 && !state.sidebarOpen) {
          toggleSidebar(true);
        }
        // Venstre swipe = lukke sidebar
        else if (diffX < -CONFIG.SWIPE_THRESHOLD && state.sidebarOpen) {
          toggleSidebar(false);
        }
      }
    }, { passive: true });
    
    // Escape key lukker sidebar
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.sidebarOpen) {
        toggleSidebar(false);
      }
    });
    
    // Marker sidebar som enhanced
    sidebar.dataset.mobileEnhanced = 'true';
    
    // Debug: Log første dropdown position
    setTimeout(() => {
      const firstDropdown = sidebar.querySelector('.dropdown-oving');
      if (firstDropdown) {
        const btn = firstDropdown.querySelector('.dropdown-btn');
        const rect = btn?.getBoundingClientRect();
        const style = window.getComputedStyle(firstDropdown);
        
        console.log('📍 First dropdown position:', {
          button: btn?.textContent?.trim().substring(0, 20),
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity,
          top: rect?.top,
          left: rect?.left,
          visible: rect && rect.top >= 0 && rect.left >= 0 && rect.top < window.innerHeight
        });
      }
    }, 500);
    
    console.log('✓ Sidebar enhanced for mobile (dual-structure support)');
    
    } // End processDropdowns
    
  } catch (error) {
    console.error('❌ Error enhancing sidebar:', error);
    console.error('Sidebar HTML preview:', sidebar?.outerHTML?.substring(0, 500));
    // Don't throw - continue with other enhancements
  }
}

  // ============ QUIZ ENHANCEMENTS ============
  
  function enhanceQuiz() {
    if (!isMobile()) return;
    
    const quizContainer = document.getElementById('quiz-container');
    if (!quizContainer) return;
    
    console.log('📝 Setting up quiz-lite mobile support...');
    
    // Funksjon for å lukke sidebar når quiz åpnes
    function closeSidebarOnQuizOpen() {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar?.classList.contains('mobile-open')) {
        console.log('📝 Quiz opened - closing sidebar');
        
        // Bruk toggleSidebar hvis tilgjengelig
        if (window.toggleSidebar || state.toggleSidebar) {
          const toggleFunc = window.toggleSidebar || state.toggleSidebar;
          toggleFunc(false);
        } else {
          // Fallback: manuell lukking
          sidebar.classList.remove('mobile-open');
          document.body.classList.remove('sidebar-open');
          const overlay = document.querySelector('.mobile-overlay');
          if (overlay) overlay.classList.remove('show');
          const sidebarToggle = document.querySelector('.mobile-sidebar-toggle');
          if (sidebarToggle) sidebarToggle.innerHTML = '☰';
          state.sidebarOpen = false;
          unlockBodyScroll();
        }
      }
    }
    
    // Funksjon for å forbedre quiz-struktur
    function enhanceQuizStructure() {
      // Finn alle quiz-spørsmål
      const questions = quizContainer.querySelectorAll('.quiz-q');
      
      questions.forEach(question => {
        // Finn alle labels i dette spørsmålet
        const labels = question.querySelectorAll('label');
        
        labels.forEach(label => {
          // Sjekk om label har input
          let input = label.querySelector('input[type="radio"]');
          
          // Hvis input ikke er inne i label, flytt den inn
          if (!input) {
            const questionInputs = question.querySelectorAll('input[type="radio"]');
            questionInputs.forEach(inp => {
              const inputId = inp.id;
              const labelFor = label.getAttribute('for');
              if (inputId && labelFor && inputId === labelFor) {
                input = inp;
              }
            });
            
            // Flytt input inn i label
            if (input && input.parentElement !== label) {
              label.insertBefore(input, label.firstChild);
            }
          }
          
          // Sikre at label har display: flex
          if (input) {
            label.style.display = 'flex';
            label.style.alignItems = 'center';
            
            // Wrapper tekst i span hvis ikke allerede wrapppet
            const textNodes = Array.from(label.childNodes).filter(
              node => node.nodeType === 3 && node.textContent.trim()
            );
            
            textNodes.forEach(textNode => {
              const span = document.createElement('span');
              span.textContent = textNode.textContent;
              label.replaceChild(span, textNode);
            });
          }
        });
      });
    }
    
    // Observer for når quiz blir synlig
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        // Sjekk om quiz-container blir synlig
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const display = window.getComputedStyle(quizContainer).display;
          if (display !== 'none') {
            closeSidebarOnQuizOpen();
          }
        }
        
        // Sjekk om quiz-container får klasser som indikerer åpning
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          if (quizContainer.classList.contains('show') || 
              quizContainer.classList.contains('visible') ||
              quizContainer.classList.contains('active')) {
            closeSidebarOnQuizOpen();
          }
        }
        
        // Sjekk om quiz-innhold blir lagt til
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Hvis quiz-content dukker opp, lukk sidebar
          const hasQuizContent = quizContainer.querySelector('.quiz-q, .quiz-header, .quiz-content');
          if (hasQuizContent) {
            closeSidebarOnQuizOpen();
          }
        }
      });
      
      // Legg til touch feedback på quiz-elementer
      if (!isMobile()) return;
      
      // Forbedre quiz-struktur for mobil
      enhanceQuizStructure();
      
      quizContainer.querySelectorAll('.quiz-btn, .quiz-option, .quiz-choice').forEach(el => {
        el.style.webkitTapHighlightColor = 'rgba(0, 79, 159, 0.2)';
        el.style.cursor = 'pointer';
      });
    });
    
    // Observer quiz-container for endringer
    observer.observe(quizContainer, {
      attributes: true,
      childList: true,
      subtree: true
    });
    
    // Observer document body for quiz-knapp klikk
    document.addEventListener('click', (e) => {
      // Sjekk om det er en quiz-knapp som ble klikket
      const quizBtn = e.target.closest('#quiz-btn, .quiz-btn, [data-quiz], [onclick*="quiz"]');
      if (quizBtn && isMobile()) {
        console.log('📝 Quiz button clicked - preparing to close sidebar');
        // Vent litt for at quiz skal åpne seg
        setTimeout(closeSidebarOnQuizOpen, 100);
      }
    });
    
    // Sjekk umiddelbart om quiz allerede er synlig
    const isQuizVisible = window.getComputedStyle(quizContainer).display !== 'none';
    if (isQuizVisible) {
      closeSidebarOnQuizOpen();
      enhanceQuizStructure();
    }
    
    console.log('✓ Quiz-lite mobile support enabled');
  }

  // ============ MODAL & OVERLAY HANDLER ============
  
  function setupModalHandler() {
    if (!isMobile()) return;
    
    console.log('📱 Setting up modal/overlay handler for mobile...');
    
    // Funksjon for å lukke sidebar
    function closeSidebar() {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar?.classList.contains('mobile-open')) {
        console.log('📦 Modal/overlay opened - closing sidebar');
        
        if (window.toggleSidebar || state.toggleSidebar) {
          const toggleFunc = window.toggleSidebar || state.toggleSidebar;
          toggleFunc(false);
        } else {
          sidebar.classList.remove('mobile-open');
          document.body.classList.remove('sidebar-open');
          const overlay = document.querySelector('.mobile-overlay');
          if (overlay) overlay.classList.remove('show');
          const sidebarToggle = document.querySelector('.mobile-sidebar-toggle');
          if (sidebarToggle) sidebarToggle.innerHTML = '☰';
          state.sidebarOpen = false;
          unlockBodyScroll();
        }
      }
    }
    
    // Observer for å oppdage når modals/overlays åpnes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) { // Element node
            // Sjekk for PDF viewer
            if (node.classList?.contains('pdf-viewer') ||
                node.classList?.contains('pdf-container') ||
                node.id === 'pdf-viewer' ||
                node.id === 'pdf-container') {
              console.log('📄 PDF viewer detected');
              closeSidebar();
            }
            
            // Sjekk for generelle modals/overlays
            if (node.classList?.contains('modal') ||
                node.classList?.contains('overlay') ||
                node.classList?.contains('lightbox') ||
                node.classList?.contains('dialog') ||
                node.classList?.contains('popup')) {
              console.log('📦 Modal/overlay detected');
              closeSidebar();
            }
            
            // Sjekk for fullscreen-elementer
            if (node.classList?.contains('fullscreen') ||
                node.classList?.contains('full-screen')) {
              console.log('🖥️ Fullscreen element detected');
              closeSidebar();
            }
          }
        });
      });
    });
    
    // Observer hele document body
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Lytt også på fullscreenchange event
    document.addEventListener('fullscreenchange', () => {
      if (document.fullscreenElement) {
        console.log('🖥️ Entered fullscreen mode');
        closeSidebar();
      }
    });
    
    console.log('✓ Modal/overlay handler setup complete');
  }

  // ============ VIEWPORT ADJUSTMENTS ============
  
  function handleViewportChanges() {
    const updateViewport = debounce(() => {
      // Oppdater CSS custom properties
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      
      // Vis/skjul mobile controls
      const sidebarToggle = document.querySelector('.mobile-sidebar-toggle');
      const menuToggle = document.querySelector('.mobile-menu-toggle');
      const overlay = document.querySelector('.mobile-overlay');
      
      if (isMobile()) {
        if (sidebarToggle && !isNotebookPage()) {
          sidebarToggle.style.display = 'flex';
        }
        if (menuToggle) menuToggle.style.display = 'flex';
        if (overlay) overlay.style.display = 'block';
      } else {
        if (sidebarToggle) sidebarToggle.style.display = 'none';
        if (menuToggle) menuToggle.style.display = 'none';
        if (overlay) overlay.style.display = 'none';
        
        // Reset mobile states
        document.querySelector('.sidebar')?.classList.remove('mobile-open');
        document.querySelector('.navbar-left')?.classList.remove('mobile-open');
        document.querySelector('.navbar-right')?.classList.remove('mobile-open');
        
        // Gjenopprett navbar-right til original posisjon hvis flyttet
        const navRight = document.querySelector('.navbar-right');
        if (navRight) {
          const originalParentId = navRight.dataset.originalParentId;
          const originalParent = originalParentId ? document.getElementById(originalParentId) : null;
          
          if (originalParent && navRight.parentElement !== originalParent) {
            originalParent.appendChild(navRight);
            console.log('✓ Restored navbar-right on desktop resize');
          }
        }
        
        document.body.classList.remove('sidebar-open');
        unlockBodyScroll();
        state.sidebarOpen = false;
        state.navMenuOpen = false;
      }
    }, 150);
    
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);
    updateViewport();
  }

  // ============ ACCESSIBILITY ============
  
  function enhanceAccessibility() {
    // Skip to content link
    if (!document.querySelector('.skip-to-content')) {
      const skipLink = document.createElement('a');
      skipLink.href = '#main-content';
      skipLink.className = 'skip-to-content';
      skipLink.textContent = 'Hopp til innhold';
      skipLink.style.cssText = `
        position: absolute;
        top: -40px;
        left: 0;
        background: var(--primary, #004f9f);
        color: white;
        padding: 8px;
        text-decoration: none;
        z-index: 10002;
      `;
      skipLink.addEventListener('focus', () => {
        skipLink.style.top = '0';
      });
      skipLink.addEventListener('blur', () => {
        skipLink.style.top = '-40px';
      });
      document.body.insertBefore(skipLink, document.body.firstChild);
    }
    
    // Legg til main content ID
    const content = document.querySelector('.content');
    if (content && !content.id) {
      content.id = 'main-content';
    }
    
    console.log('✓ Accessibility enhanced');
  }

  // ============ BOTTOM BAR (OPTIONAL) ============
  
  function createBottomBar() {
    // Denne er optional - kommenter ut hvis ikke ønsket
    if (!isMobile()) return;
    
    let bottomBar = document.querySelector('.bottom-bar');
    if (bottomBar) return; // Allerede opprettet
    
    bottomBar = document.createElement('div');
    bottomBar.className = 'bottom-bar';
    bottomBar.innerHTML = `
      <button id="bb-home" title="Hjem">🏠 Hjem</button>
      <button id="bb-prev" title="Forrige">⬅ Forrige</button>
      <button id="bb-next" title="Neste">➡ Neste</button>
      <button id="bb-quiz" title="Quiz">🧩 Quiz</button>
    `;
    document.body.appendChild(bottomBar);
    document.body.classList.add('has-bottom-bar');
    
    // Event handlers
    bottomBar.querySelector('#bb-home')?.addEventListener('click', () => {
      if (window.resetView) window.resetView();
      location.reload();
    });
    
    bottomBar.querySelector('#bb-prev')?.addEventListener('click', () => {
      navigateFile(-1);
    });
    
    bottomBar.querySelector('#bb-next')?.addEventListener('click', () => {
      navigateFile(1);
    });
    
    bottomBar.querySelector('#bb-quiz')?.addEventListener('click', () => {
      document.getElementById('quiz-btn')?.click();
    });
    
    console.log('✓ Bottom bar created');
  }
  
  function navigateFile(delta) {
    const links = Array.from(document.querySelectorAll('.sidebar .dropdown-content a'));
    if (!links.length) return;
    
    const active = document.querySelector('.dropdown-oving.active .dropdown-content a');
    let idx = active ? links.indexOf(active) : -1;
    let targetIdx = idx + delta;
    
    if (targetIdx < 0) targetIdx = links.length - 1;
    if (targetIdx >= links.length) targetIdx = 0;
    
    const link = links[targetIdx];
    if (link) link.click();
  }

  // ============ INITIALIZATION ============
  
  function init() {
    // Sjekk om allerede initialisert
    if (window.MobileEnhancer?.initialized) {
      console.log('Mobile Enhancer already initialized');
      return;
    }
    
    console.log('🔥 Mobile Enhancer v3.39.1 initializing...');
    
    // Sjekk viewport meta tag
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) {
      console.warn('⚠️  WARNING: No viewport meta tag found!');
      console.warn('   Add this to <head>: <meta name="viewport" content="width=device-width, initial-scale=1.0">');
      console.warn('   Without it, mobile detection may not work correctly.');
    } else {
      console.log('✓ Viewport meta tag found');
    }
    
    try {
      // Marker notebook-sider
      if (isNotebookPage()) {
        document.body.classList.add('notebook-page');
        console.log('📓 Notebook page detected - limited mobile features');
      }
      
      injectMobileCSS();
      enhanceNavbar();
      enhanceSidebar();
      handleViewportChanges();
      observeSearchOverlay(); // Overvåk og fjern "TIDLIGERE SØK" automatisk
      setupThemeListener(); // Lytt på theme changes og oppdater mobile UI
      setupModalHandler(); // Lukk sidebar når modals/PDF/quiz åpnes
      // enhanceAccessibility(); // Deaktivert - skip-to-content ikke nødvendig på mobil
      
      // Optional: Aktiver bottom bar (kommenter ut hvis ikke ønsket)
      // createBottomBar();
      
      // Forbedre quiz når det lastes
      const checkQuiz = setInterval(() => {
        if (document.getElementById('quiz-container')) {
          enhanceQuiz();
          clearInterval(checkQuiz);
        }
      }, 500);
      
      setTimeout(() => clearInterval(checkQuiz), 10000);
      
      // Observer for dynamisk lasting av sidebar
      const sidebar = document.querySelector('.sidebar') || document.getElementById('sidebar');
      if (sidebar && sidebar.dataset.mobileEnhanced !== 'true') {
        const sidebarObserver = new MutationObserver(() => {
          if (!isMobile()) {
            sidebarObserver.disconnect();
            return;
          }
          if (!sidebar.isConnected || sidebar.dataset.mobileEnhanced === 'true') {
            sidebarObserver.disconnect();
            return;
          }
          enhanceSidebar();
          if (sidebar.dataset.mobileEnhanced === 'true') {
            sidebarObserver.disconnect();
          }
        });
        
        sidebarObserver.observe(sidebar, {
          childList: true,
          subtree: true
        });
      }
      
      // Marker som initialisert
      window.MobileEnhancer = {
        initialized: true,
        version: '3.39.1',
        config: CONFIG,
        isMobile,
        isNotebookPage,
        state,
        updateMobileTheme // Eksporter for ekstern bruk
      };
      
      console.log('✅ Mobile Enhancer v3.39.1 initialized successfully');
    } catch (error) {
      console.error('❌ Mobile Enhancer initialization failed:', error);
    }
  }

  // ============ AUTO-INIT ============
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Re-init on page show (for bfcache)
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      init();
    }
  });

})();
