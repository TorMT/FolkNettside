/* ============================================================================
   Theme Switcher v2.1 - ANTI-DUPLICATE FIX
   ============================================================================
   
   Fikser:
   ✅ Forhindrer duplikate theme-velgere
   ✅ Sikrer at flyout-fix kjører
   ✅ Bedre initialisering
   
============================================================================ */

(function() {
  'use strict';
  
  // ============ FORHINDRE DUPLIKATER ============
  
  // Sjekk om allerede initialisert
  if (window.ThemeSwitcher?.initialized) {
    console.warn('⚠️ Theme Switcher already initialized - skipping duplicate');
    return; // STOPP HER - ikke kjør på nytt!
  }
  
  // Sjekk om UI allerede eksisterer
  if (document.querySelector('.theme-switcher')) {
    console.warn('⚠️ Theme Switcher UI already exists - cleaning up');
    document.querySelectorAll('.theme-switcher').forEach((el, index) => {
      if (index > 0) {
        el.remove(); // Fjern duplikater
      }
    });
  }
  
  // ============ CONFIGURATION ============
  
  const THEMES = {
    default: {
      name: 'Standard Blå',
      color: '#004f9f',
      icon: '🔵'
    },
    dark: {
      name: 'Mørk',
      color: '#1e293b',
      icon: '🌙'
    },
    forest: {
      name: 'Skog',
      color: '#047857',
      icon: '🌲'
    },
    sunset: {
      name: 'Solnedgang',
      color: '#dc2626',
      icon: '🌅'
    },
    ocean: {
      name: 'Hav',
      color: '#0891b2',
      icon: '🌊'
    },
    purple: {
      name: 'Lilla',
      color: '#7c3aed',
      icon: '💜'
    },
    minimal: {
      name: 'Minimal',
      color: '#000000',
      icon: '⚫'
    },
    ntnu: {
      name: 'NTNU',
      color: '#00509e',
      icon: '🎓'
    }
  };
  
  const DEFAULT_THEME = 'default';
  const STORAGE_KEY = 'folk-theme';
  
  // ============ THEME MANAGER ============
  
  class ThemeManager {
    constructor() {
      this.currentTheme = this.loadTheme();
      this.init();
      this.setupCrossTabSync();
    }
    
    init() {
      // Appliser saved theme umiddelbart
      this.applyTheme(this.currentTheme, false);
      
      // Opprett UI når DOM er klar
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.createUI());
      } else {
        // Vent litt for å la andre scripts laste
        setTimeout(() => this.createUI(), 100);
      }
    }
    
    setupCrossTabSync() {
      // Lytt etter storage events for synkronisering på tvers av tabs
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY && e.newValue) {
          const newTheme = e.newValue;
          if (newTheme !== this.currentTheme && THEMES[newTheme]) {
            console.log(`🔄 Theme synced from another tab: ${newTheme}`);
            this.applyTheme(newTheme, true);
          }
        }
      });
      
      // Lytt etter custom theme change events
      window.addEventListener('themechange', (e) => {
        if (e.detail?.theme && e.detail.theme !== this.currentTheme) {
          this.currentTheme = e.detail.theme;
          this.updateUI();
        }
      });
    }
    
    loadTheme() {
      try {
        // Sjekk localStorage
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && THEMES[saved]) {
          return saved;
        }
        
        // Sjekk HTML data-theme attributt
        const htmlTheme = document.documentElement.getAttribute('data-theme');
        if (htmlTheme && THEMES[htmlTheme]) {
          return htmlTheme;
        }
        
        return DEFAULT_THEME;
      } catch (e) {
        console.warn('Could not load theme from localStorage:', e);
        return DEFAULT_THEME;
      }
    }
    
    saveTheme(theme) {
      try {
        localStorage.setItem(STORAGE_KEY, theme);
        console.log(`💾 Theme saved: ${theme}`);
      } catch (e) {
        console.warn('Could not save theme to localStorage:', e);
      }
    }
    
    applyTheme(theme, animate = true) {
      if (!THEMES[theme]) {
        console.warn(`Theme "${theme}" not found, using default`);
        theme = DEFAULT_THEME;
      }
      
      console.log(`🎨 Applying theme: ${THEMES[theme].name}`);
      
      // Fjern animasjoner midlertidig hvis nødvendig
      if (!animate) {
        document.documentElement.style.setProperty('transition', 'none');
      }
      
      // Sett theme attribute
      document.documentElement.setAttribute('data-theme', theme);
      
      // Oppdater current theme
      this.currentTheme = theme;
      
      // Lagre til localStorage
      this.saveTheme(theme);
      
      // Re-enable animasjoner
      if (!animate) {
        // Force reflow
        document.documentElement.offsetHeight;
        document.documentElement.style.removeProperty('transition');
      }
      
      // Oppdater UI hvis det eksisterer
      this.updateUI();
      
      // Oppdater alle elementer som bruker theme-farger
      this.updateThemeElements();
      
      // VIKTIG: Oppdater flyouts
      this.updateFlyouts();
      
      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('themechange', {
        detail: { 
          theme,
          themeName: THEMES[theme].name,
          themeColor: THEMES[theme].color
        }
      }));
      
      console.log(`✓ Theme changed to: ${THEMES[theme].name}`);
    }
    
    updateThemeElements() {
      // Oppdater meta theme-color for mobile browsers
      let metaTheme = document.querySelector('meta[name="theme-color"]');
      if (!metaTheme) {
        metaTheme = document.createElement('meta');
        metaTheme.name = 'theme-color';
        document.head.appendChild(metaTheme);
      }
      metaTheme.content = THEMES[this.currentTheme].color;
      
      // Oppdater title hvis det er en theme-indikator
      const titleThemeIndicator = document.querySelector('.theme-indicator');
      if (titleThemeIndicator) {
        titleThemeIndicator.textContent = THEMES[this.currentTheme].icon;
      }
      
      // Trigger rerender av dynamiske elementer
      document.querySelectorAll('[data-theme-aware]').forEach(el => {
        el.dispatchEvent(new Event('themechange'));
      });
    }
    
    updateFlyouts() {
      // Fjern inline styles fra flyouts
      const flyouts = document.querySelectorAll('.sidebar .flyout, .sidebar .sub-menu, .sidebar-flyout, [class*="flyout"]');
      flyouts.forEach(flyout => {
        // Fjern hardkodede styles
        flyout.style.backgroundColor = '';
        flyout.style.background = '';
        flyout.style.color = '';
        
        // Marker som theme-aware
        flyout.classList.add('theme-aware');
        flyout.setAttribute('data-current-theme', this.currentTheme);
        
        // Oppdater children
        flyout.querySelectorAll('*').forEach(child => {
          child.style.backgroundColor = '';
          child.style.background = '';
          child.style.color = '';
          child.style.fill = '';
        });
      });
      
      console.log(`🔄 Updated ${flyouts.length} flyout(s)`);
    }
    
    createUI() {
      // VIKTIG: Sjekk om UI allerede eksisterer
      const existing = document.querySelectorAll('.theme-switcher');
      if (existing.length > 0) {
        console.log('Theme switcher UI already exists, skipping creation');
        // Fjern duplikater hvis noen
        existing.forEach((el, index) => {
          if (index > 0) {
            console.warn('⚠️ Removing duplicate theme switcher');
            el.remove();
          }
        });
        return;
      }
      
      console.log('Creating theme switcher UI...');
      
      // Opprett theme switcher container
      const container = document.createElement('div');
      container.className = 'theme-switcher';
      container.setAttribute('aria-label', 'Bytt tema');
      container.setAttribute('data-initialized', 'true');
      
      // Opprett toggle button
      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'theme-toggle-btn';
      toggleBtn.setAttribute('aria-label', 'Åpne tema-meny');
      toggleBtn.setAttribute('title', 'Bytt tema');
      toggleBtn.innerHTML = '🎨';
      toggleBtn.addEventListener('click', () => this.toggleMenu());
      
      // Opprett theme menu
      const menu = document.createElement('div');
      menu.className = 'theme-menu';
      menu.setAttribute('role', 'menu');
      
      // Legg til theme options
      Object.entries(THEMES).forEach(([key, theme]) => {
        const option = document.createElement('div');
        option.className = 'theme-option';
        option.setAttribute('role', 'menuitem');
        option.setAttribute('data-theme', key);
        option.setAttribute('tabindex', '0');
        option.setAttribute('title', theme.name);
        
        if (key === this.currentTheme) {
          option.classList.add('active');
        }
        
        const colorBox = document.createElement('div');
        colorBox.className = 'theme-color';
        colorBox.style.background = theme.color;
        
        const label = document.createElement('span');
        label.textContent = `${theme.icon} ${theme.name}`;
        
        option.appendChild(colorBox);
        option.appendChild(label);
        
        option.addEventListener('click', () => {
          this.applyTheme(key);
          this.closeMenu();
        });
        
        // Keyboard support
        option.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.applyTheme(key);
            this.closeMenu();
          }
        });
        
        menu.appendChild(option);
      });
      
      container.appendChild(toggleBtn);
      container.appendChild(menu);
      
      // Inject styles
      this.injectStyles();
      
      // Add to DOM
      document.body.appendChild(container);
      
      console.log('✅ Theme switcher UI created');
      
      // Lukk meny når man klikker utenfor
      document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
          this.closeMenu();
        }
      });
      
      // Keyboard navigation
      toggleBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.closeMenu();
        }
      });
    }
    
    injectStyles() {
      if (document.getElementById('theme-switcher-styles')) return;
      
      const styles = `
        .theme-switcher {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          z-index: 9999;
        }
        
        .theme-toggle-btn {
          width: 3.5rem;
          height: 3.5rem;
          border-radius: 50%;
          border: 2px solid var(--border-color, #e2e8f0);
          background: var(--bg-card, #ffffff);
          color: var(--text-main, #1a202c);
          font-size: 1.75rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-lg, 0 10px 15px rgba(0, 0, 0, 0.1));
          transition: all 0.3s ease;
        }
        
        .theme-toggle-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 12px 20px rgba(0, 0, 0, 0.15);
        }
        
        .theme-toggle-btn:active {
          transform: scale(0.95);
        }
        
        .theme-menu {
          position: absolute;
          bottom: 4.5rem;
          right: 0;
          background: var(--bg-card, #ffffff);
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: var(--radius-md, 8px);
          box-shadow: var(--shadow-lg, 0 10px 15px rgba(0, 0, 0, 0.1));
          min-width: 200px;
          max-width: 250px;
          opacity: 0;
          visibility: hidden;
          transform: translateY(10px);
          transition: all 0.3s ease;
          overflow: hidden;
        }
        
        .theme-menu.open {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }
        
        .theme-option {
          display: flex;
          align-items: center;
          padding: 0.75rem 1rem;
          cursor: pointer;
          transition: background 0.2s ease;
          gap: 0.75rem;
        }
        
        .theme-option:hover {
          background: var(--bg-alt, #f6f7fa);
        }
        
        .theme-option.active {
          background: var(--primary-transparent, rgba(0, 79, 159, 0.1));
          font-weight: 600;
        }
        
        .theme-option.active::after {
          content: '✓';
          margin-left: auto;
          color: var(--primary, #004f9f);
        }
        
        .theme-color {
          width: 1.5rem;
          height: 1.5rem;
          border-radius: 50%;
          border: 2px solid var(--border-color, #e2e8f0);
          flex-shrink: 0;
        }
        
        .theme-option span {
          flex: 1;
          font-size: 0.9rem;
          color: var(--text-main, #1a202c);
        }
        
        @media (max-width: 768px) {
          .theme-switcher {
            bottom: 1rem;
            right: 1rem;
          }
          
          .theme-toggle-btn {
            width: 3rem;
            height: 3rem;
            font-size: 1.5rem;
          }
          
          .theme-menu {
            bottom: 4rem;
            max-height: 60vh;
            overflow-y: auto;
          }
        }
      `;
      
      const styleEl = document.createElement('style');
      styleEl.id = 'theme-switcher-styles';
      styleEl.textContent = styles;
      document.head.appendChild(styleEl);
    }
    
    updateUI() {
      const options = document.querySelectorAll('.theme-option');
      options.forEach(option => {
        const theme = option.getAttribute('data-theme');
        if (theme === this.currentTheme) {
          option.classList.add('active');
        } else {
          option.classList.remove('active');
        }
      });
      
      console.log('🔄 UI updated for theme:', this.currentTheme);
    }
    
    toggleMenu() {
      const menu = document.querySelector('.theme-menu');
      if (menu) {
        const isOpen = menu.classList.toggle('open');
        console.log(isOpen ? '📂 Theme menu opened' : '📁 Theme menu closed');
      }
    }
    
    closeMenu() {
      const menu = document.querySelector('.theme-menu');
      if (menu) {
        menu.classList.remove('open');
      }
    }
    
    // Public API
    setTheme(theme) {
      this.applyTheme(theme);
    }
    
    getTheme() {
      return this.currentTheme;
    }
    
    getThemes() {
      return { ...THEMES };
    }
  }
  
  // ============ INITIALIZE ============
  
  const manager = new ThemeManager();
  
  // Expose public API
  window.ThemeSwitcher = {
    initialized: true,
    version: '2.1.0',
    setTheme: (theme) => manager.setTheme(theme),
    getTheme: () => manager.getTheme(),
    getThemes: () => manager.getThemes(),
    forceUpdate: () => manager.updateFlyouts()
  };
  
  console.log('🎨 Theme Switcher v2.1.0 initialized (anti-duplicate)');
  
})();
