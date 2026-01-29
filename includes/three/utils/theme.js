
// /includes/three/utils/theme.js
// Theme utilities for STL Viewer.
// Leser CSS-variabler fra :root og lar andre moduler abonnere på endringer.
// • getVar("--bg-main") => hex/rgb-streng
// • onChange(fn) -> kall fn() når tema endres
// • Når tema endres: observer DOM-attributes på <html> (data-theme / class)
//
// Bruk:
//   import { Theme } from "/includes/three/utils/theme.js";
//   Theme.onChange(() => {
//       const bg = Theme.getVar("--bg-main", "#ffffff");
//       core.setBackground(bg);
//   });
//   // Kall en gang ved init også.

export const Theme = (() => {

    // Registrerte lyttere
    const listeners = new Set();

    // Leser CSS-variabel fra :root
    function getVar(name, fallback = "") {
        const v = getComputedStyle(document.documentElement)
                  .getPropertyValue(name)
                  .trim();
        return v || fallback;
    }

    // Internt: kall alle lyttere
    function _notify() {
        for (const fn of listeners) {
            try { fn(); } catch(e) {}
        }
    }

    // Abonner på temaendringer
    function onChange(fn) {
        if (typeof fn === "function") listeners.add(fn);
    }

    function off(fn) {
        listeners.delete(fn);
    }

    // Oppsett: observer endringer i data-theme, class og style på <html>.
    // Dette fanger opp både mørk/lys tema og custom theme-switching.
    const obs = new MutationObserver(() => _notify());
    obs.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme", "class", "style"]
    });

    // Offentlig API
    return {
        getVar,
        onChange,
        off,
    };
})();
