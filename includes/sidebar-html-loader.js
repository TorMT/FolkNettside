/* --------------------------------------------------------------------
   Sidebar HTML Loader v1.1 - KRITISK FIKS
   Laster sidebar.html inn i .sidebar elementet
   -------------------------------------------------------------------- */

(function loadSidebarHTML() {
  'use strict';
  
  async function injectSidebarContent() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) {
      console.error('Fant ikke .sidebar element');
      return;
    }
    
    // Sjekk om sidebar allerede har innhold
    if (sidebar.querySelectorAll('.dropdown-oving, nav a').length > 0) {
      console.log('✓ Sidebar-innhold allerede lastet');
      return;
    }
    
    try {
      // Last sidebar.html fra SAMME mappe som index.html
      const response = await fetch('./sidebar.html', { 
        cache: 'no-store',
        headers: {
          'Accept': 'text/html'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text();
      
      // Parse HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Prøv å finne aside-innhold
      let asideContent = doc.querySelector('aside.sidebar');
      
      // Fallback: Hvis ikke aside, bruk hele body
      if (!asideContent) {
        console.warn('Fant ikke <aside class="sidebar">, bruker hele body');
        asideContent = doc.body;
      }
      
      if (!asideContent || !asideContent.innerHTML.trim()) {
        throw new Error('Tom eller ugyldig sidebar.html');
      }
      
      // Inject innholdet
      sidebar.innerHTML = asideContent.innerHTML;
      
      // Ekstraher og kjør script-tags (for Google Analytics osv.)
      const scripts = doc.querySelectorAll('script');
      scripts.forEach(oldScript => {
        if (oldScript.src) {
          // Eksternt script
          const newScript = document.createElement('script');
          if (oldScript.async) newScript.async = true;
          newScript.src = oldScript.src;
          document.head.appendChild(newScript);
        } else if (oldScript.textContent) {
          // Inline script
          const newScript = document.createElement('script');
          newScript.textContent = oldScript.textContent;
          document.head.appendChild(newScript);
        }
      });
      
      // Ekstraher og injiser style-tags
      const styles = doc.querySelectorAll('style');
      styles.forEach(oldStyle => {
        const newStyle = document.createElement('style');
        newStyle.textContent = oldStyle.textContent;
        document.head.appendChild(newStyle);
      });
      
      console.log('✓ Sidebar-innhold lastet fra sidebar.html');
      console.log(`  - Fant ${sidebar.querySelectorAll('.dropdown-oving').length} dropdown-seksjoner`);
      console.log(`  - Fant ${sidebar.querySelectorAll('.dropdown-content a').length} filer`);
      
      // Trigger en custom event når sidebar er lastet
      const event = new CustomEvent('sidebarLoaded', {
        detail: {
          dropdowns: sidebar.querySelectorAll('.dropdown-oving').length,
          files: sidebar.querySelectorAll('.dropdown-content a').length
        }
      });
      document.dispatchEvent(event);
      
    } catch (error) {
      console.error('KRITISK FEIL - Kunne ikke laste sidebar.html:', error);
      sidebar.innerHTML = `
        <div style="padding: 1rem; color: #ff6b6b; background: rgba(255,107,107,0.1); border-radius: 8px; margin: 1rem;">
          <h4 style="margin: 0 0 0.5rem 0;">❌ Kunne ikke laste sidebar.html</h4>
          <p style="font-size: 0.85rem; opacity: 0.8; margin: 0;">${error.message}</p>
          <p style="font-size: 0.75rem; opacity: 0.6; margin: 0.5rem 0 0 0;">Sjekk at sidebar.html finnes i samme mappe som index.html</p>
        </div>
      `;
      
      // Trigger event selv ved feil så sidebar-loader ikke henger
      const event = new CustomEvent('sidebarLoaded', {
        detail: { error: true }
      });
      document.dispatchEvent(event);
    }
  }
  
  // Last sidebar når DOM er klar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectSidebarContent);
  } else {
    injectSidebarContent();
  }
})();