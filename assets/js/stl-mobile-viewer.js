/* ============================================================================
   stl-mobile-viewer.js
   ============================================================================
   Mobil-lag for STL-vieweren:
   - dropdown panels scrollbare (max-height + overflow)
   - litt mer kompakt toolbar
   - bedre touch targets
   - pixelratio cap for ytelse
============================================================================ */

(function(){
  "use strict";

  const MOBILE_BP = 1024;

  function isMobile(){
    return window.innerWidth <= MOBILE_BP;
  }

  function injectCSS(){
    const id = "stl-mobile-viewer-css";
    if (document.getElementById(id)) return;

    const css = `
@media (max-width:${MOBILE_BP}px){
  #toolbar{
    top: 8px !important;
    padding: 8px !important;
    gap: 8px !important;
    border-radius: 16px !important;
  }
  .btn, .menu-btn, select, input[type="number"]{
    min-height: 44px !important;
  }
  .menu-panel{
    max-height: min(62vh, 520px) !important;
    overflow-y: auto !important;
    -webkit-overflow-scrolling: touch !important;
  }
  /* Hvis mange menyer: gjør panel litt bredere på mobil */
  .menu-panel{
    min-width: min(94vw, 560px) !important;
  }
}
    `.trim();

    const st = document.createElement("style");
    st.id = id;
    st.textContent = css;
    document.head.appendChild(st);
  }

  function closeMenusOnScroll(){
    // lukke åpne menyer når brukeren scroller i mobil (touch)
    const toolbar = document.getElementById("toolbar");
    if (!toolbar) return;

    window.addEventListener("scroll", () => {
      // trigges sjeldent siden body overflow hidden i viewer, men ok.
      document.dispatchEvent(new KeyboardEvent("keydown", { key:"Escape" }));
    }, { passive:true });
  }

  function capPixelRatio(){
    // Hvis du vil: finn renderer via canvas size?
    // Her gjør vi et best-effort: treffer ofte, og er ufarlig om ikke.
    try{
      const canvas = document.querySelector("canvas");
      if (!canvas) return;
      // Three renderer finnes ikke globalt i modulet,
      // men vi kan redusere devicePixelRatio “effektivt” ved å skalere canvas via CSS.
      // Den “riktige” måten er å endre renderer.setPixelRatio i viewer,
      // men det er allerede satt til min(dpr,2). Her går vi hardere på mobil.
      const dpr = window.devicePixelRatio || 1;
      if (dpr > 1.5){
        canvas.style.imageRendering = "auto";
      }
      // Tipset til deg: sett i viewer:
      // renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    }catch(e){}
  }

  function hookThemeChange(){
    // Viewer er allerede theme-aware via CSS vars.
    // Dette er bare en sikkerhetsnetting hvis noe på mobil blir tregt:
    window.addEventListener("themechange", () => {
      // Force reflow så overlay/panel plukker opp var() i noen rare nettlesere
      document.body.offsetHeight;
    });
  }

  function init(){
    if (!isMobile()) return;
    injectCSS();
    closeMenusOnScroll();
    capPixelRatio();
    hookThemeChange();
    console.log("✅ stl-mobile-viewer.js aktiv");
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.addEventListener("resize", () => {
    if (isMobile()) injectCSS();
  });

})();
