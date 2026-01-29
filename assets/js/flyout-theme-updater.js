/* ============================================================================
   Sidebar Flyout Theme Updater
   ============================================================================
   Oppdaterer flyout-menyer når theme byttes
============================================================================ */

(function() {
  'use strict';
  
  // ============ FLYOUT THEME UPDATER ============
  
  class FlyoutThemeUpdater {
    constructor() {
      this.init();
    }
    
    init() {
      // Vent til theme-switcher er klar
      const checkThemeSwitcher = setInterval(() => {
        if (window.ThemeSwitcher) {
          clearInterval(checkThemeSwitcher);
          this.setupEventListeners();
          console.log('✅ Flyout Theme Updater initialized');
        }
      }, 100);
      
      // Stopp etter 5 sekunder hvis ikke funnet
      setTimeout(() => clearInterval(checkThemeSwitcher), 5000);
    }
    
    setupEventListeners() {
      // Lytt på theme changes
      window.addEventListener('themechange', (e) => {
        console.log('🎨 Flyout updater: Theme changed to', e.detail.theme);
        this.updateAllFlyouts();
      });
      
      // Oppdater flyouts når de åpnes
      this.observeFlyouts();
      
      // Initial oppdatering
      this.updateAllFlyouts();
    }
    
    updateAllFlyouts() {
      // Finn alle flyout-elementer
      const selectors = [
        '.sidebar .flyout',
        '.sidebar .sub-menu',
        '.sidebar .nested-menu',
        '.sidebar-flyout',
        '.nested-flyout',
        '[class*="flyout"]'
      ];
      
      selectors.forEach(selector => {
        const flyouts = document.querySelectorAll(selector);
        flyouts.forEach(flyout => {
          this.updateFlyout(flyout);
        });
      });
    }
    
    updateFlyout(flyout) {
      if (!flyout) return;
      
      // Få current theme
      const currentTheme = window.ThemeSwitcher?.getTheme() || 'default';
      
      // Fjern hardkodede inline styles
      this.removeInlineStyles(flyout);
      
      // Legg til theme-aware class
      flyout.classList.add('theme-aware');
      flyout.setAttribute('data-current-theme', currentTheme);
      
      // Trigger rerender
      flyout.dispatchEvent(new Event('themechange'));
      
      // Oppdater alle child-elementer
      this.updateChildElements(flyout);
    }
    
    removeInlineStyles(element) {
      // Fjern hardkodede inline styles som overstyrer themes
      const stylesToRemove = [
        'background-color',
        'background',
        'color',
        'border-color'
      ];
      
      stylesToRemove.forEach(style => {
        if (element.style[style]) {
          // Lagre original i data-attributt hvis nødvendig
          element.setAttribute(`data-original-${style}`, element.style[style]);
          element.style[style] = '';
        }
      });
      
      // Oppdater alle children
      const children = element.querySelectorAll('*');
      children.forEach(child => {
        stylesToRemove.forEach(style => {
          if (child.style[style]) {
            child.setAttribute(`data-original-${style}`, child.style[style]);
            child.style[style] = '';
          }
        });
      });
    }
    
    updateChildElements(flyout) {
      // Oppdater links
      const links = flyout.querySelectorAll('a');
      links.forEach(link => {
        link.classList.add('theme-aware');
      });
      
      // Oppdater ikoner
      const icons = flyout.querySelectorAll('svg, .icon, [class*="icon"]');
      icons.forEach(icon => {
        icon.classList.add('theme-aware');
        // Fjern fill og stroke hvis de er hardkodet
        if (icon.hasAttribute('fill') && icon.getAttribute('fill') !== 'currentColor') {
          icon.setAttribute('data-original-fill', icon.getAttribute('fill'));
          icon.setAttribute('fill', 'currentColor');
        }
        if (icon.hasAttribute('stroke') && icon.getAttribute('stroke') !== 'currentColor') {
          icon.setAttribute('data-original-stroke', icon.getAttribute('stroke'));
          icon.setAttribute('stroke', 'currentColor');
        }
      });
      
      // Oppdater text-elementer
      const textElements = flyout.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6');
      textElements.forEach(el => {
        el.classList.add('theme-aware');
      });
    }
    
    observeFlyouts() {
      // Bruk MutationObserver for å fange opp nye flyouts
      const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) { // Element node
              // Sjekk om det er en flyout
              if (this.isFlyout(node)) {
                console.log('🆕 New flyout detected, updating theme...');
                this.updateFlyout(node);
              }
              
              // Sjekk children
              const flyouts = node.querySelectorAll?.('.flyout, .sub-menu, .nested-menu, .sidebar-flyout, .nested-flyout, [class*="flyout"]');
              flyouts?.forEach(flyout => {
                this.updateFlyout(flyout);
              });
            }
          });
        });
      });
      
      // Observer hele document body
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
    
    isFlyout(element) {
      if (!element.classList) return false;
      
      const flyoutClasses = [
        'flyout',
        'sub-menu',
        'nested-menu',
        'sidebar-flyout',
        'nested-flyout'
      ];
      
      return flyoutClasses.some(cls => {
        return element.classList.contains(cls) || 
               element.className.includes(cls);
      });
    }
  }
  
  // ============ FORCE UPDATE FUNCTION ============
  
  function forceUpdateFlyouts() {
    console.log('🔄 Force updating all flyouts...');
    
    // Finn alle elementer som kan ha flyouts
    const allElements = document.querySelectorAll('*');
    
    allElements.forEach(el => {
      // Fjern inline styles fra elementer i sidebar
      if (el.closest('.sidebar') || el.classList.contains('flyout') || el.classList.contains('nested-flyout')) {
        // Fjern hardkodede farger
        if (el.style.backgroundColor) el.style.backgroundColor = '';
        if (el.style.background) el.style.background = '';
        if (el.style.color) el.style.color = '';
        if (el.style.fill) el.style.fill = '';
        if (el.style.stroke) el.style.stroke = '';
      }
    });
    
    // Trigger en forced reflow
    document.body.offsetHeight;
  }
  
  // ============ INITIALIZE ============
  
  // Kjør umiddelbart hvis DOM er klar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new FlyoutThemeUpdater();
      // Force update etter initialisering
      setTimeout(forceUpdateFlyouts, 500);
    });
  } else {
    new FlyoutThemeUpdater();
    // Force update etter initialisering
    setTimeout(forceUpdateFlyouts, 500);
  }
  
  // Expose force update function
  window.forceUpdateFlyouts = forceUpdateFlyouts;
  
  console.log('🎨 Flyout Theme Updater v1.1 loaded');
    
})();
