/* ====================================================================
   SIDEBAR SEARCH MODULE v1.0
   Avansert søkefunksjon med støtte for .py og .ipynb filer
   ==================================================================== */

/**
 * Søkemodul som kan:
 * - Søke i filnavn
 * - Søke i øving-titler
 * - Smart matching (.py = python, .ipynb = notebook)
 * - Keyboard shortcuts (Ctrl+K)
 * - Søkehistorikk
 * - Fuzzy matching
 */

(function() {
  'use strict';
  
  // ==================== KONFIGURASJON ====================
  const CONFIG = {
    maxHistory: 10,
    debounceDelay: 150,
    minSearchLength: 2,
    fuzzyThreshold: 0.7,
    shortcuts: {
      open: ['k'],        // Ctrl+K eller Cmd+K
      clear: 'Escape'
    }
  };
  
  // Søkehistorikk
  let searchHistory = [];
  
  // ==================== SMART MATCHING ====================
  
  // Utvid søket med aliaser
  const SEARCH_ALIASES = {
    'python': ['.py', 'py', 'python'],
    'notebook': ['.ipynb', 'ipynb', 'jupyter'],
    'pdf': ['.pdf', 'pdf'],
    'oppgave': ['oppgave', 'øving', 'oving'],
    'losning': ['løsning', 'losning', 'fasit', 'solution'],
  };
  
  function expandSearchQuery(query) {
    const lower = query.toLowerCase();
    const expanded = [lower];
    
    // Legg til aliaser
    Object.entries(SEARCH_ALIASES).forEach(([key, aliases]) => {
      if (aliases.some(alias => lower.includes(alias))) {
        expanded.push(...aliases);
      }
    });
    
    return [...new Set(expanded)];
  }
  
  // ==================== FUZZY MATCHING ====================
  
  function fuzzyMatch(query, text) {
    query = query.toLowerCase();
    text = text.toLowerCase();
    
    // Exact match
    if (text.includes(query)) return 1.0;
    
    // Fuzzy match - sjekk om alle bokstaver finnes i riktig rekkefølge
    let qIndex = 0;
    let tIndex = 0;
    let matches = 0;
    
    while (qIndex < query.length && tIndex < text.length) {
      if (query[qIndex] === text[tIndex]) {
        matches++;
        qIndex++;
      }
      tIndex++;
    }
    
    const score = matches / query.length;
    return score >= CONFIG.fuzzyThreshold ? score : 0;
  }
  
  // ==================== SØKEHISTORIKK ====================
  
  function loadSearchHistory() {
    try {
      const stored = localStorage.getItem('sidebar-search-history');
      if (stored) {
        searchHistory = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Kunne ikke laste søkehistorikk:', e);
    }
  }
  
  function saveSearchHistory(query) {
    if (!query || query.length < CONFIG.minSearchLength) return;
    
    // Legg til først i array
    searchHistory = [
      query,
      ...searchHistory.filter(q => q !== query)
    ].slice(0, CONFIG.maxHistory);
    
    try {
      localStorage.setItem('sidebar-search-history', JSON.stringify(searchHistory));
    } catch (e) {
      console.warn('Kunne ikke lagre søkehistorikk:', e);
    }
  }
  
  function showSearchHistory(input, dropdown) {
    if (searchHistory.length === 0) {
      dropdown.style.display = 'none';
      return;
    }
    
    dropdown.innerHTML = '<div class="search-history-header">Tidligere søk:</div>';
    
    searchHistory.forEach(query => {
      const item = document.createElement('div');
      item.className = 'search-history-item';
      item.innerHTML = `
        <span class="search-history-query">🕐 ${query}</span>
        <button class="search-history-remove" aria-label="Fjern fra historikk">×</button>
      `;
      
      item.querySelector('.search-history-query').addEventListener('click', () => {
        input.value = query;
        input.dispatchEvent(new Event('input'));
        dropdown.style.display = 'none';
      });
      
      item.querySelector('.search-history-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        searchHistory = searchHistory.filter(q => q !== query);
        localStorage.setItem('sidebar-search-history', JSON.stringify(searchHistory));
        showSearchHistory(input, dropdown);
      });
      
      dropdown.appendChild(item);
    });
    
    dropdown.style.display = 'block';
  }
  
  // ==================== FILTYPE DETECTION ====================
  
  function getFileType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const types = {
      'py': { name: 'Python', icon: '🐍', color: '#3776ab' },
      'ipynb': { name: 'Jupyter Notebook', icon: '📓', color: '#f37626' },
      'pdf': { name: 'PDF', icon: '📄', color: '#d32f2f' },
      'c': { name: 'C', icon: '⚙️', color: '#555555' },
      'cpp': { name: 'C++', icon: '⚙️', color: '#00599c' },
      'java': { name: 'Java', icon: '☕', color: '#007396' },
      'txt': { name: 'Text', icon: '📝', color: '#666666' }
    };
    return types[ext] || { name: 'Fil', icon: '📎', color: '#888888' };
  }
  
  // ==================== SØKEFUNKSJON ====================
  
  function performSearch(query) {
    const items = document.querySelectorAll('.dropdown-oving');
    const queries = expandSearchQuery(query);
    const results = [];
    
    let visibleCount = 0;
    
    items.forEach(item => {
      const btn = item.querySelector('.dropdown-btn');
      const links = item.querySelectorAll('.dropdown-content a');
      
      // Søk i øving-tittel
      const btnText = btn.textContent.toLowerCase();
      const btnScore = Math.max(...queries.map(q => fuzzyMatch(q, btnText)));
      const btnMatch = btnScore > 0;
      
      // Søk i filnavn
      const linkMatches = [];
      links.forEach(a => {
        const linkText = a.textContent.toLowerCase();
        const filename = a.href.split('/FolkNettside/').pop().toLowerCase();
        
        const nameScore = Math.max(...queries.map(q => fuzzyMatch(q, linkText)));
        const fileScore = Math.max(...queries.map(q => fuzzyMatch(q, filename)));
        const maxScore = Math.max(nameScore, fileScore);
        
        if (!query) {
          a.style.display = '';
          a.style.background = '';
          a.style.order = '';
        } else if (maxScore > 0) {
          linkMatches.push({ element: a, score: maxScore });
        } else {
          a.style.display = 'none';
        }
      });
      
      // Vis/skjul dropdown basert på matches
      if (!query || btnMatch || linkMatches.length > 0) {
        item.style.display = '';
        visibleCount++;
        
        // Highlight øving-knapp hvis match
        if (btnMatch && query) {
          btn.style.background = `rgba(255, 255, 0, ${btnScore * 0.3})`;
          btn.style.fontWeight = '700';
        } else {
          btn.style.background = '';
          btn.style.fontWeight = '';
        }
        
        // Sorter og highlight filer basert på score
        if (query && linkMatches.length > 0) {
          linkMatches.sort((a, b) => b.score - a.score);
          
          linkMatches.forEach((match, index) => {
            match.element.style.display = '';
            match.element.style.background = `rgba(255, 255, 0, ${match.score * 0.2})`;
            match.element.style.order = index;
            
            // Legg til score badge for debugging (optional)
            if (window.DEBUG_SEARCH) {
              const scoreText = ` (${Math.round(match.score * 100)}%)`;
              if (!match.element.textContent.includes(scoreText)) {
                match.element.textContent += scoreText;
              }
            }
          });
          
          results.push({
            dropdown: btn.textContent,
            matches: linkMatches.length,
            maxScore: linkMatches[0].score
          });
        }
      } else {
        item.style.display = 'none';
      }
    });
    
    // Vis "ingen resultater" melding
    updateNoResultsMessage(query, visibleCount);
    
    // Vis søkestatistikk
    updateSearchStats(query, results);
    
    return { visibleCount, results };
  }
  
  function updateNoResultsMessage(query, visibleCount) {
    let noResults = document.getElementById('search-no-results');
    
    if (query && visibleCount === 0) {
      if (!noResults) {
        noResults = document.createElement('div');
        noResults.id = 'search-no-results';
        noResults.className = 'search-no-results';
        document.getElementById('sidebar').appendChild(noResults);
      }
      
      noResults.innerHTML = `
        <div class="no-results-icon">🔍</div>
        <div class="no-results-text">Ingen resultater for "${query}"</div>
        <div class="no-results-hint">Prøv et annet søkeord</div>
      `;
      noResults.style.display = 'block';
    } else if (noResults) {
      noResults.style.display = 'none';
    }
  }
  
  function updateSearchStats(query, results) {
    if (!query) {
      const stats = document.getElementById('search-stats');
      if (stats) stats.remove();
      return;
    }
    
    let stats = document.getElementById('search-stats');
    if (!stats) {
      stats = document.createElement('div');
      stats.id = 'search-stats';
      stats.className = 'search-stats';
      const container = document.querySelector('.sidebar-search-container');
      container.appendChild(stats);
    }
    
    const totalMatches = results.reduce((sum, r) => sum + r.matches, 0);
    const dropdownCount = results.length;
    
    stats.innerHTML = `
      <span class="search-stats-icon">✓</span>
      <span>${totalMatches} filer i ${dropdownCount} øvinger</span>
    `;
    stats.style.display = 'block';
  }
  
  // ==================== UI SETUP ====================
  
  function createSearchUI(sidebar) {
    const container = document.createElement('div');
    container.className = 'sidebar-search-container';
    container.innerHTML = `
      <div class="search-input-wrapper">
        <span class="search-icon" aria-hidden="true">🔍</span>
        <input type="search" 
               id="sidebar-search" 
               placeholder="Søk i øvinger og filer... (Ctrl+K)"
               aria-label="Søk i øvinger og filer"
               autocomplete="off"
               spellcheck="false">
        <button id="clear-search" 
                class="search-clear-btn"
                aria-label="Tøm søk" 
                style="display:none;">×</button>
      </div>
      <div id="search-history-dropdown" class="search-history-dropdown"></div>
    `;
    
    return container;
  }
  
  // ==================== EVENT HANDLERS ====================
  
  function setupSearchEvents(container, sidebar) {
    const input = container.querySelector('#sidebar-search');
    const clearBtn = container.querySelector('#clear-search');
    const historyDropdown = container.querySelector('#search-history-dropdown');
    
    let searchTimeout;
    
    // Load history
    loadSearchHistory();
    
    // Input event med debounce
    input.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const query = e.target.value.trim();
      
      clearBtn.style.display = query ? 'block' : 'none';
      
      searchTimeout = setTimeout(() => {
        if (query) {
          performSearch(query);
          saveSearchHistory(query);
        } else {
          performSearch('');
        }
      }, CONFIG.debounceDelay);
    });
    
    // Focus event - vis historikk
    input.addEventListener('focus', () => {
      if (!input.value) {
        showSearchHistory(input, historyDropdown);
      }
    });
    
    // Blur event - skjul historikk (med delay for å tillate klikk)
    input.addEventListener('blur', () => {
      setTimeout(() => {
        historyDropdown.style.display = 'none';
      }, 200);
    });
    
    // Clear button
    clearBtn.addEventListener('click', () => {
      input.value = '';
      performSearch('');
      clearBtn.style.display = 'none';
      input.focus();
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl+K or Cmd+K - Focus search
      if ((e.ctrlKey || e.metaKey) && CONFIG.shortcuts.open.includes(e.key)) {
        e.preventDefault();
        input.focus();
        input.select();
        showSearchHistory(input, historyDropdown);
      }
      
      // Escape - Clear or unfocus
      if (e.key === CONFIG.shortcuts.clear) {
        if (document.activeElement === input) {
          if (input.value) {
            clearBtn.click();
          } else {
            input.blur();
          }
        }
      }
      
      // Arrow up/down in history
      if (document.activeElement === input && historyDropdown.style.display === 'block') {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const first = historyDropdown.querySelector('.search-history-query');
          if (first) first.click();
        }
      }
    });
  }
  
  // ==================== PUBLIC API ====================
  
  window.SidebarSearch = {
    init: function(sidebar) {
      // Sjekk at sidebar er klar
      if (!sidebar) {
        console.error('❌ SidebarSearch.init: No sidebar element provided');
        return;
      }
      
      // Fjern eksisterende søkefelt hvis det finnes
      const existing = sidebar.querySelector('.sidebar-search-container');
      if (existing) {
        existing.remove();
      }
      
      const container = createSearchUI(sidebar);
      
      // Sett inn øverst i sidebar
      if (sidebar.firstChild) {
        sidebar.insertBefore(container, sidebar.firstChild);
      } else {
        sidebar.appendChild(container);
      }
      
      setupSearchEvents(container, sidebar);
      
      // Gjør søkefunksjonen tilgjengelig globalt for debugging
      window.searchSidebar = (query) => performSearch(query);
      
      console.log('✓ Sidebar Search v1.0 initialized');
      console.log('  - Shortcuts: Ctrl+K (focus), Escape (clear)');
      console.log('  - Features: Fuzzy matching, history, smart aliases');
      console.log('  - Search container added to sidebar:', !!sidebar.querySelector('.sidebar-search-container'));
    },
    
    clear: function() {
      const input = document.getElementById('sidebar-search');
      if (input) {
        input.value = '';
        performSearch('');
      }
    },
    
    search: function(query) {
      const input = document.getElementById('sidebar-search');
      if (input) {
        input.value = query;
        performSearch(query);
      }
    },
    
    clearHistory: function() {
      searchHistory = [];
      localStorage.removeItem('sidebar-search-history');
      console.log('✓ Søkehistorikk tømt');
    }
  };
  
})();

/* ====================================================================
   CSS FOR SØKEMODUL
   ==================================================================== */

const searchCSS = `
/* Search Container */
.sidebar-search-container {
  position: relative;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
}

/* Search Input Wrapper */
.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  font-size: 1rem;
  opacity: 0.6;
  pointer-events: none;
}

#sidebar-search {
  width: 100%;
  padding: 0.6rem 2.5rem 0.6rem 2.5rem;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 0.9rem;
  font-family: inherit;
  transition: all 0.25s ease;
}

#sidebar-search:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.5);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
}

#sidebar-search::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.search-clear-btn {
  position: absolute;
  right: 0.5rem;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  padding: 0.25rem 0.6rem;
  font-size: 1.3rem;
  line-height: 1;
  transition: all 0.2s ease;
}

.search-clear-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
  transform: scale(1.1);
}

/* Search Stats */
.search-stats {
  display: none;
  margin-top: 0.5rem;
  padding: 0.4rem 0.6rem;
  background: rgba(76, 175, 80, 0.15);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.search-stats-icon {
  color: #4caf50;
}

/* Search History Dropdown */
.search-history-dropdown {
  display: none;
  position: absolute;
  top: 100%;
  left: 0.75rem;
  right: 0.75rem;
  margin-top: 0.25rem;
  background: rgba(0, 0, 0, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 1200;
  max-height: 300px;
  overflow-y: auto;
}

.search-history-header {
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.search-history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: background 0.15s ease;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.search-history-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.search-history-item:last-child {
  border-bottom: none;
}

.search-history-query {
  flex: 1;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.85rem;
}

.search-history-remove {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  font-size: 1.2rem;
  line-height: 1;
  transition: all 0.2s ease;
  border-radius: 3px;
}

.search-history-remove:hover {
  background: rgba(255, 0, 0, 0.3);
  color: #ff5252;
}

/* No Results Message */
.search-no-results {
  display: none;
  padding: 2rem 1.5rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
}

.no-results-icon {
  font-size: 3rem;
  margin-bottom: 0.5rem;
  opacity: 0.3;
}

.no-results-text {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.no-results-hint {
  font-size: 0.85rem;
  opacity: 0.6;
}

/* Search Highlight Animation */
@keyframes search-highlight {
  0% { background: rgba(255, 255, 0, 0.3); }
  100% { background: rgba(255, 255, 0, 0.15); }
}

.dropdown-content a[style*="background"] {
  animation: search-highlight 0.6s ease;
}

/* Mobile Adjustments */
@media (max-width: 768px) {
  .sidebar-search-container {
    padding: 0.5rem;
  }
  
  #sidebar-search {
    font-size: 0.85rem;
    padding: 0.5rem 2.25rem 0.5rem 2.25rem;
  }
  
  .search-stats {
    font-size: 0.75rem;
  }
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
  #sidebar-search,
  .search-clear-btn,
  .search-history-item {
    transition: none;
  }
}

/* High Contrast */
@media (prefers-contrast: high) {
  #sidebar-search {
    border-width: 2px;
  }
  
  .search-history-dropdown {
    border-width: 2px;
  }
}
`;

// Inject CSS
(function injectSearchCSS() {
  const id = 'sidebar-search-css';
  if (document.getElementById(id)) return;
  
  const style = document.createElement('style');
  style.id = id;
  style.textContent = searchCSS;
  document.head.appendChild(style);
})();