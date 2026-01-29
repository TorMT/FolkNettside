/* ====================================================================
   SIDEBAR NOTIFICATIONS MODULE v1.2
   Automatisk deteksjon og notifikasjon av nye filer
   ==================================================================== */

/**
 * Notification system som:
 * - Tracker alle filer på kurset
 * - Detekterer nye filer siden sist besøk
 * - Viser notification badge (🔔)
 * - Highlighter nye filer i sidebar
 * - Lagrer state i localStorage
 * - Auto-markerer som sett når fil åpnes
 * - v1.1: Forbedret modal (scrolling, sentrering, theme-støtte)
 * - v1.2: FIKSET modal-sentrering (fixed positioning, korrekt transform)
 */

(function() {
  'use strict';
  
  // ==================== KONFIGURASJON ====================
  const CONFIG = {
    storagePrefix: 'sidebar-notif:',
    checkInterval: 60000,        // Sjekk hver minutt
    notificationDuration: 8000,  // 8 sekunder
    maxNotifications: 5,         // Max 5 notifications samtidig
    animationDelay: 200,         // Delay mellom notifications
    soundEnabled: false,         // Lyd-notifikasjoner (future)
  };
  
  // State
  let knownFiles = new Set();
  let newFiles = new Set();
  let checkInterval = null;
  
  // ==================== STORAGE HELPERS ====================
  
  function getStorageKey(courseDir) {
    return CONFIG.storagePrefix + courseDir;
  }
  
  function loadKnownFiles(courseDir) {
    try {
      const key = getStorageKey(courseDir);
      const stored = localStorage.getItem(key);
      if (stored) {
        const data = JSON.parse(stored);
        return new Set(data.files || []);
      }
    } catch (e) {
      console.warn('Kunne ikke laste kjente filer:', e);
    }
    return new Set();
  }
  
  function saveKnownFiles(courseDir, files) {
    try {
      const key = getStorageKey(courseDir);
      localStorage.setItem(key, JSON.stringify({
        files: Array.from(files),
        lastCheck: Date.now(),
        version: 1
      }));
    } catch (e) {
      console.warn('Kunne ikke lagre kjente filer:', e);
    }
  }
  
  // ==================== FILE DETECTION ====================
  
  function getAllFiles() {
    const files = [];
    document.querySelectorAll('.dropdown-content a').forEach(a => {
      files.push({
        url: a.href,
        name: a.textContent.trim(),
        parent: a.closest('.dropdown-oving')?.querySelector('.dropdown-btn')?.textContent.trim(),
        element: a
      });
    });
    return files;
  }
  
  function detectNewFiles(courseDir) {
    const currentFiles = getAllFiles();
    const currentUrls = new Set(currentFiles.map(f => f.url));
    
    // Load previously known files
    knownFiles = loadKnownFiles(courseDir);
    
    // Find new files
    const newFilesList = currentFiles.filter(f => !knownFiles.has(f.url));
    
    // Update known files
    knownFiles = currentUrls;
    saveKnownFiles(courseDir, knownFiles);
    
    return newFilesList;
  }
  
  // ==================== UI COMPONENTS ====================
  
  function createNotificationBadge(count) {
    let badge = document.getElementById('new-files-badge');
    
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'new-files-badge';
      badge.className = 'new-files-badge';
      
      // Legg til etter søkefeltet eller øverst i sidebar
      const sidebar = document.getElementById('sidebar');
      const searchContainer = sidebar.querySelector('.sidebar-search-container');
      if (searchContainer) {
        searchContainer.appendChild(badge);
      } else {
        sidebar.insertBefore(badge, sidebar.firstChild);
      }
      
      // Click handler
      badge.addEventListener('click', () => {
        showNewFilesModal();
      });
    }
    
    badge.innerHTML = `
      <span class="badge-icon">🔔</span>
      <span class="badge-text">${count} nye ${count === 1 ? 'fil' : 'filer'}</span>
      <span class="badge-pulse"></span>
    `;
    
    badge.style.display = count > 0 ? 'flex' : 'none';
    
    // Animate in
    badge.classList.remove('badge-appear');
    void badge.offsetWidth; // Force reflow
    badge.classList.add('badge-appear');
    
    return badge;
  }
  
  function showFloatingNotification(file, index = 0) {
    const notification = document.createElement('div');
    notification.className = 'floating-notification';
    notification.style.animationDelay = `${index * CONFIG.animationDelay}ms`;
    
    const fileType = getFileType(file.name);
    
    notification.innerHTML = `
      <div class="notif-icon">${fileType.icon}</div>
      <div class="notif-content">
        <div class="notif-title">Ny fil!</div>
        <div class="notif-file">${file.name}</div>
        <div class="notif-parent">${file.parent || 'Ukjent'}</div>
      </div>
      <button class="notif-close" aria-label="Lukk notifikasjon">×</button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove
    setTimeout(() => {
      notification.classList.add('notif-exit');
      setTimeout(() => notification.remove(), 300);
    }, CONFIG.notificationDuration);
    
    // Manual close
    notification.querySelector('.notif-close').addEventListener('click', () => {
      notification.classList.add('notif-exit');
      setTimeout(() => notification.remove(), 300);
    });
    
    // Click to open file
    notification.addEventListener('click', (e) => {
      if (!e.target.classList.contains('notif-close')) {
        if (window.openFile) {
          window.openFile(file.url);
        }
        notification.classList.add('notif-exit');
        setTimeout(() => notification.remove(), 300);
      }
    });
  }
  
  function showNewFilesModal() {
    const currentFiles = getAllFiles();
    const newFilesList = currentFiles.filter(f => newFiles.has(f.url));
    
    if (newFilesList.length === 0) {
      return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'new-files-modal';
    modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>🔔 Nye Filer (${newFilesList.length})</h3>
          <button class="modal-close" aria-label="Lukk">×</button>
        </div>
        <div class="modal-body">
          ${newFilesList.map(file => {
            const fileType = getFileType(file.name);
            return `
              <div class="new-file-item" data-url="${file.url}">
                <div class="file-icon" style="color: ${fileType.color}">${fileType.icon}</div>
                <div class="file-info">
                  <div class="file-name">${file.name}</div>
                  <div class="file-parent">${file.parent || 'Ukjent'}</div>
                </div>
                <button class="file-open-btn" aria-label="Åpne fil">Åpne →</button>
              </div>
            `;
          }).join('')}
        </div>
        <div class="modal-footer">
          <button class="btn-mark-all-seen">✓ Marker alle som sett</button>
          <button class="btn-close">Lukk</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event handlers
    modal.querySelector('.modal-overlay').addEventListener('click', () => closeModal(modal));
    modal.querySelector('.modal-close').addEventListener('click', () => closeModal(modal));
    modal.querySelector('.btn-close').addEventListener('click', () => closeModal(modal));
    
    modal.querySelector('.btn-mark-all-seen').addEventListener('click', () => {
      markAllAsSeen();
      closeModal(modal);
    });
    
    // Gjør hele file-item klikkbar
    modal.querySelectorAll('.new-file-item').forEach(item => {
      item.addEventListener('click', (e) => {
        // Ikke trigger hvis man klikker på knappen (den har sin egen handler)
        if (e.target.classList.contains('file-open-btn')) return;
        
        const url = item.dataset.url;
        const file = newFilesList.find(f => f.url === url);
        
        if (file && window.openFile) {
          window.openFile(file.url);
          markFileAsSeen(file.url);
          item.classList.add('file-opened');
          
          // Update badge
          createNotificationBadge(newFiles.size);
          
          // Close modal after opening file
          setTimeout(() => closeModal(modal), 300);
        }
      });
    });
    
    modal.querySelectorAll('.file-open-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent double-trigger
        const item = e.target.closest('.new-file-item');
        const url = item.dataset.url;
        const file = newFilesList.find(f => f.url === url);
        
        if (file && window.openFile) {
          window.openFile(file.url);
          markFileAsSeen(file.url);
          item.classList.add('file-opened');
          
          // Update badge
          createNotificationBadge(newFiles.size);
          
          // Close modal after opening file
          setTimeout(() => closeModal(modal), 300);
        }
      });
    });
    
    // Animate in
    setTimeout(() => modal.classList.add('modal-show'), 10);
  }
  
  function closeModal(modal) {
    modal.classList.remove('modal-show');
    setTimeout(() => modal.remove(), 300);
  }
  
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
  
  // ==================== NEW FILE HIGHLIGHTING ====================
  
  function highlightNewFiles(files) {
    files.forEach(file => {
      if (file.element) {
        file.element.classList.add('new-file');
        
        // Legg til "NY" badge
        if (!file.element.querySelector('.new-badge')) {
          const badge = document.createElement('span');
          badge.className = 'new-badge';
          badge.textContent = 'NY';
          badge.setAttribute('aria-label', 'Ny fil');
          file.element.appendChild(badge);
        }
        
        // Highlight parent dropdown
        const parentBtn = file.element.closest('.dropdown-oving')?.querySelector('.dropdown-btn');
        if (parentBtn && !parentBtn.querySelector('.new-indicator')) {
          const indicator = document.createElement('span');
          indicator.className = 'new-indicator';
          indicator.textContent = '●';
          indicator.setAttribute('aria-label', 'Inneholder nye filer');
          parentBtn.appendChild(indicator);
        }
      }
    });
  }
  
  function markFileAsSeen(url) {
    newFiles.delete(url);
    
    // Fjern highlighting
    const link = document.querySelector(`.dropdown-content a[href="${url}"]`);
    if (link) {
      link.classList.remove('new-file');
      const badge = link.querySelector('.new-badge');
      if (badge) badge.remove();
    }
    
    // Update parent indicator
    updateParentIndicators();
  }
  
  function markAllAsSeen() {
    newFiles.clear();
    
    // Fjern all highlighting
    document.querySelectorAll('.new-file').forEach(el => {
      el.classList.remove('new-file');
    });
    
    document.querySelectorAll('.new-badge').forEach(badge => {
      badge.remove();
    });
    
    document.querySelectorAll('.new-indicator').forEach(indicator => {
      indicator.remove();
    });
    
    // Update badge
    createNotificationBadge(0);
  }
  
  function updateParentIndicators() {
    document.querySelectorAll('.dropdown-oving').forEach(div => {
      const hasNewFiles = div.querySelectorAll('.new-file').length > 0;
      const indicator = div.querySelector('.new-indicator');
      
      if (!hasNewFiles && indicator) {
        indicator.remove();
      }
    });
  }
  
  // ==================== AUTO-MARK AS SEEN ====================
  
  function setupAutoMarkAsSeen() {
    // Intercept file opens
    const originalOpenFile = window.openFile;
    if (originalOpenFile) {
      window.openFile = function(url) {
        originalOpenFile.call(this, url);
        
        // Mark as seen after 2 seconds
        setTimeout(() => {
          const fullUrl = url.startsWith('http') ? url : new URL(url, window.location.origin).href;
          markFileAsSeen(fullUrl);
          createNotificationBadge(newFiles.size);
        }, 2000);
      };
    }
  }
  
  // ==================== PERIODIC CHECK ====================
  
  function startPeriodicCheck(courseDir) {
    if (checkInterval) {
      clearInterval(checkInterval);
    }
    
    checkInterval = setInterval(() => {
      const newFilesList = detectNewFiles(courseDir);
      
      if (newFilesList.length > 0) {
        console.log(`🔔 ${newFilesList.length} nye filer oppdaget!`);
        
        newFilesList.forEach(f => newFiles.add(f.url));
        
        // Show floating notifications (max 5)
        newFilesList.slice(0, CONFIG.maxNotifications).forEach((file, index) => {
          showFloatingNotification(file, index);
        });
        
        // Update badge
        createNotificationBadge(newFiles.size);
        
        // Highlight in sidebar
        highlightNewFiles(newFilesList);
      }
    }, CONFIG.checkInterval);
  }
  
  // ==================== PUBLIC API ====================
  
  window.SidebarNotifications = {
    init: function(courseDir) {
      // Initial check
      const newFilesList = detectNewFiles(courseDir);
      
      if (newFilesList.length > 0) {
        console.log(`🔔 ${newFilesList.length} nye filer siden sist besøk!`);
        
        newFilesList.forEach(f => newFiles.add(f.url));
        
        // Show badge
        createNotificationBadge(newFiles.size);
        
        // Highlight in sidebar
        highlightNewFiles(newFilesList);
        
        // Show floating notifications for first few
        setTimeout(() => {
          newFilesList.slice(0, CONFIG.maxNotifications).forEach((file, index) => {
            showFloatingNotification(file, index);
          });
        }, 1000);
      }
      
      // Setup auto-mark
      setupAutoMarkAsSeen();
      
      // Start periodic checking
      startPeriodicCheck(courseDir);
      
      console.log('✓ Sidebar Notifications v1.0 initialized');
      console.log(`  - Checking for new files every ${CONFIG.checkInterval / 1000}s`);
      console.log(`  - ${newFiles.size} new files found`);
    },
    
    stop: function() {
      if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
      }
    },
    
    markAsSeen: function(url) {
      markFileAsSeen(url);
      createNotificationBadge(newFiles.size);
    },
    
    markAllAsSeen: function() {
      markAllAsSeen();
    },
    
    showModal: function() {
      showNewFilesModal();
    },
    
    getNewFiles: function() {
      return Array.from(newFiles);
    },
    
    reset: function(courseDir) {
      newFiles.clear();
      knownFiles.clear();
      
      const key = getStorageKey(courseDir);
      localStorage.removeItem(key);
      
      markAllAsSeen();
      console.log('✓ Notification state reset');
    }
  };
  
})();

/* ====================================================================
   CSS FOR NOTIFICATIONS
   ==================================================================== */

const notificationCSS = `
/* ==================== NOTIFICATION BADGE ==================== */
.new-files-badge {
  display: none;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding: 0.6rem 0.8rem;
  background: linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%);
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(255, 82, 82, 0.3);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.new-files-badge:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 82, 82, 0.4);
}

.new-files-badge:active {
  transform: translateY(0);
}

.badge-icon {
  font-size: 1.2rem;
  animation: badge-shake 2s ease infinite;
}

@keyframes badge-shake {
  0%, 100% { transform: rotate(0deg); }
  10%, 30% { transform: rotate(-10deg); }
  20%, 40% { transform: rotate(10deg); }
}

.badge-text {
  font-size: 0.9rem;
  font-weight: 600;
}

.badge-pulse {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  animation: badge-pulse 2s ease infinite;
}

@keyframes badge-pulse {
  0%, 100% { opacity: 0; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
}

.badge-appear {
  animation: badge-appear 0.5s ease;
}

@keyframes badge-appear {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.8);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* ==================== FLOATING NOTIFICATIONS ==================== */
.floating-notification {
  position: fixed;
  top: calc(var(--nav-h, 48px) + 1rem);
  right: 1rem;
  width: 320px;
  background: linear-gradient(135deg, #fff 0%, #f5f5f5 100%);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  padding: 1rem;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  cursor: pointer;
  z-index: 10000;
  animation: notif-slide-in 0.4s ease;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.floating-notification:hover {
  transform: translateX(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
}

.floating-notification:nth-child(n+2) {
  margin-top: calc(1rem + (n - 1) * 100px);
}

@keyframes notif-slide-in {
  from {
    opacity: 0;
    transform: translateX(calc(100% + 1rem));
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.notif-exit {
  animation: notif-slide-out 0.3s ease forwards;
}

@keyframes notif-slide-out {
  to {
    opacity: 0;
    transform: translateX(calc(100% + 1rem));
  }
}

.notif-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.notif-content {
  flex: 1;
  min-width: 0;
}

.notif-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 0.25rem;
}

.notif-file {
  font-size: 0.85rem;
  color: #555;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 0.2rem;
}

.notif-parent {
  font-size: 0.75rem;
  color: #888;
}

.notif-close {
  background: rgba(0, 0, 0, 0.05);
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #666;
  font-size: 1.2rem;
  line-height: 1;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.notif-close:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #333;
}

/* ==================== NEW FILE MODAL ==================== */
.new-files-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10001;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.new-files-modal.modal-show {
  opacity: 1;
}

.new-files-modal.modal-show .modal-content {
  transform: translate(-50%, -50%) scale(1);
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}

.modal-content {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0.9);
  width: 90%;
  max-width: 600px;
  max-height: 85vh;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease;
  overflow: hidden;
  z-index: 10002;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: #333;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.8rem;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #333;
}

.modal-body {
  flex: 1 1 auto;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1rem 1.5rem;
  min-height: 0;
  max-height: calc(85vh - 180px);
}

/* Custom scrollbar for modal body */
.modal-body::-webkit-scrollbar {
  width: 8px;
}

.modal-body::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.modal-body::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

.modal-body::-webkit-scrollbar-thumb:hover {
  background: #555;
}

.new-file-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.875rem 1rem;
  border-radius: 8px;
  background: #f9f9f9;
  margin-bottom: 0.75rem;
  transition: all 0.2s ease;
  cursor: pointer;
}

.new-file-item:last-child {
  margin-bottom: 0;
}

.new-file-item:hover {
  background: #f0f0f0;
  transform: translateX(4px);
}

.new-file-item.file-opened {
  opacity: 0.5;
}

.file-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 0.25rem;
}

.file-parent {
  font-size: 0.8rem;
  color: #888;
}

.file-open-btn {
  background: #004f9f;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.file-open-btn:hover {
  background: #003d7a;
  transform: translateX(2px);
}

.modal-footer {
  display: flex;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e0e0e0;
  flex-shrink: 0;
  background: #fff;
}

.modal-footer button {
  flex: 1;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-mark-all-seen {
  background: #4caf50;
  color: #fff;
}

.btn-mark-all-seen:hover {
  background: #45a049;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.btn-close {
  background: #e0e0e0;
  color: #333;
}

.btn-close:hover {
  background: #d0d0d0;
}

/* ==================== NEW FILE HIGHLIGHTING ==================== */
.dropdown-content a.new-file {
  position: relative;
  background: rgba(255, 107, 107, 0.1) !important;
  border-left: 3px solid #ff6b6b;
  animation: new-file-pulse 2s ease infinite;
}

@keyframes new-file-pulse {
  0%, 100% { background: rgba(255, 107, 107, 0.1) !important; }
  50% { background: rgba(255, 107, 107, 0.2) !important; }
}

.new-badge {
  display: inline-block;
  margin-left: 0.5rem;
  padding: 0.15rem 0.4rem;
  background: #ff5252;
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  border-radius: 3px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  animation: new-badge-bounce 0.6s ease;
}

@keyframes new-badge-bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.dropdown-btn .new-indicator {
  display: inline-block;
  margin-left: 0.5rem;
  color: #ff5252;
  font-size: 0.8rem;
  animation: indicator-blink 2s ease infinite;
}

@keyframes indicator-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* ==================== MOBILE ADJUSTMENTS ==================== */
@media (max-width: 768px) {
  .floating-notification {
    width: calc(100% - 2rem);
    right: 1rem;
    left: 1rem;
  }
  
  .modal-content {
    width: 95%;
    max-width: 95vw;
    max-height: 90vh;
  }
  
  .modal-body {
    max-height: calc(90vh - 180px);
    padding: 0.75rem 1rem;
  }
  
  .modal-header {
    padding: 1rem;
  }
  
  .modal-footer {
    padding: 0.75rem 1rem;
    flex-direction: column;
  }
  
  .modal-footer button {
    width: 100%;
  }
  
  .new-files-badge {
    font-size: 0.85rem;
  }
  
  .new-file-item {
    padding: 0.75rem;
    gap: 0.75rem;
  }
  
  .file-name {
    font-size: 0.9rem;
  }
}

/* ==================== ACCESSIBILITY ==================== */
@media (prefers-reduced-motion: reduce) {
  .floating-notification,
  .badge-appear,
  .new-file-item,
  .file-open-btn {
    animation: none;
    transition: none;
  }
  
  .badge-pulse {
    display: none;
  }
}

/* ==================== THEME SUPPORT ==================== */

/* Dark theme */
[data-theme="dark"] .floating-notification {
  background: linear-gradient(135deg, #2c2c2c 0%, #1f1f1f 100%);
  color: #fff;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
}

[data-theme="dark"] .notif-title {
  color: #fff;
}

[data-theme="dark"] .notif-file {
  color: #ddd;
}

[data-theme="dark"] .notif-parent {
  color: #999;
}

[data-theme="dark"] .notif-close {
  color: rgba(255, 255, 255, 0.6);
}

[data-theme="dark"] .notif-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

[data-theme="dark"] .modal-overlay {
  background: rgba(0, 0, 0, 0.8);
}

[data-theme="dark"] .modal-content {
  background: #1e1e1e;
  color: #fff;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
}

[data-theme="dark"] .modal-header {
  border-bottom-color: #333;
}

[data-theme="dark"] .modal-header h3 {
  color: #fff;
}

[data-theme="dark"] .modal-close {
  color: #999;
}

[data-theme="dark"] .modal-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

[data-theme="dark"] .modal-body {
  background: #1e1e1e;
}

[data-theme="dark"] .modal-body::-webkit-scrollbar-track {
  background: #2a2a2a;
}

[data-theme="dark"] .modal-body::-webkit-scrollbar-thumb {
  background: #555;
}

[data-theme="dark"] .modal-body::-webkit-scrollbar-thumb:hover {
  background: #666;
}

[data-theme="dark"] .new-file-item {
  background: #2a2a2a;
  border: 1px solid #333;
}

[data-theme="dark"] .new-file-item:hover {
  background: #333;
  border-color: #444;
}

[data-theme="dark"] .file-name {
  color: #fff;
}

[data-theme="dark"] .file-parent {
  color: #999;
}

[data-theme="dark"] .file-open-btn {
  background: #004f9f;
  color: #fff;
}

[data-theme="dark"] .file-open-btn:hover {
  background: #0066cc;
}

[data-theme="dark"] .modal-footer {
  border-top-color: #333;
  background: #1e1e1e;
}

[data-theme="dark"] .btn-close {
  background: #333;
  color: #ddd;
}

[data-theme="dark"] .btn-close:hover {
  background: #444;
}

[data-theme="dark"] .new-files-badge {
  background: rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255, 0.2);
}

[data-theme="dark"] .new-files-badge:hover {
  background: rgba(0, 0, 0, 0.6);
  border-color: rgba(255, 255, 255, 0.3);
}

/* Purple theme */
[data-theme="purple"] .modal-content {
  background: #2d1b3d;
  color: #e0d4eb;
}

[data-theme="purple"] .modal-header {
  border-bottom-color: #4a2c5e;
}

[data-theme="purple"] .modal-header h3 {
  color: #e0d4eb;
}

[data-theme="purple"] .modal-footer {
  border-top-color: #4a2c5e;
  background: #2d1b3d;
}

[data-theme="purple"] .new-file-item {
  background: #3d2651;
  border: 1px solid #4a2c5e;
}

[data-theme="purple"] .new-file-item:hover {
  background: #4a2c5e;
  border-color: #5e3672;
}

[data-theme="purple"] .file-name {
  color: #e0d4eb;
}

[data-theme="purple"] .file-parent {
  color: #b89fce;
}

[data-theme="purple"] .modal-overlay {
  background: rgba(45, 27, 61, 0.85);
}

[data-theme="purple"] .modal-body::-webkit-scrollbar-track {
  background: #3d2651;
}

[data-theme="purple"] .modal-body::-webkit-scrollbar-thumb {
  background: #6b4e84;
}

[data-theme="purple"] .btn-close {
  background: #4a2c5e;
  color: #e0d4eb;
}

[data-theme="purple"] .btn-close:hover {
  background: #5e3672;
}

/* Lilla theme */
[data-theme="lilla"] .modal-content {
  background: #f8f5fc;
  color: #4a2c5e;
}

[data-theme="lilla"] .modal-header {
  border-bottom-color: #e0d4eb;
}

[data-theme="lilla"] .modal-footer {
  border-top-color: #e0d4eb;
  background: #f8f5fc;
}

[data-theme="lilla"] .new-file-item {
  background: #f0e9f7;
  border: 1px solid #e0d4eb;
}

[data-theme="lilla"] .new-file-item:hover {
  background: #e8dcf3;
  border-color: #d0c0e0;
}

[data-theme="lilla"] .btn-close {
  background: #e0d4eb;
  color: #4a2c5e;
}

[data-theme="lilla"] .btn-close:hover {
  background: #d0c0e0;
}

/* Green/Teal themes */
[data-theme="green"] .file-open-btn,
[data-theme="teal"] .file-open-btn {
  background: #2d8659;
}

[data-theme="green"] .file-open-btn:hover,
[data-theme="teal"] .file-open-btn:hover {
  background: #3da370;
}

[data-theme="green"] .btn-mark-all-seen,
[data-theme="teal"] .btn-mark-all-seen {
  background: #2d8659;
}

[data-theme="green"] .btn-mark-all-seen:hover,
[data-theme="teal"] .btn-mark-all-seen:hover {
  background: #3da370;
}

/* Blue themes */
[data-theme="blue"] .file-open-btn,
[data-theme="sky"] .file-open-btn {
  background: #1e88e5;
}

[data-theme="blue"] .file-open-btn:hover,
[data-theme="sky"] .file-open-btn:hover {
  background: #42a5f5;
}
`;

// Inject CSS
(function injectNotificationCSS() {
  const id = 'sidebar-notification-css';
  if (document.getElementById(id)) return;
  
  const style = document.createElement('style');
  style.id = id;
  style.textContent = notificationCSS;
  document.head.appendChild(style);
})();