/**
 * Konverterer YouTube URL til embed format
 * @param {string} url - Original YouTube URL
 * @returns {string|null} Embed URL eller null hvis ikke YouTube
 */
function toYouTubeEmbed(url) {
  try {
    const urlString = String(url || '').trim();
    
    // youtu.be/<id>
    let match = urlString.match(/youtu\.be\/([-_0-9A-Za-z]+)/i);
    if (match) return 'https://www.youtube.com/embed/' + match[1] + '?rel=0';
    
    // youtube.com/watch?v=<id>
    match = urlString.match(/[?&]v=([-_0-9A-Za-z]+)/i);
    if (match) return 'https://www.youtube.com/embed/' + match[1] + '?rel=0';
    
    // youtube.com/embed/<id> (already embedded)
    match = urlString.match(/youtube\.com\/embed\/([-_0-9A-Za-z]+)/i);
    if (match) return 'https://www.youtube.com/embed/' + match[1] + '?rel=0';
    
    return null;
  } catch (e) {
    return null;
  }
}

/* ============================================================
   FILE VIEWER FUNCTIONS
   Håndterer åpning av forskjellige filtyper
   ============================================================ */

/**
 * Åpner en fil i riktig viewer basert på filtype
 * @param {string} url - URL til fil
 * @param {string} kind - Filtype (pdf, py, ipynb, code, video, youtube, panopto)
 */
function openInViewer(url, kind) {
  
  // === VIDEO/YOUTUBE/PANOPTO HANDLING ===
  if (kind === 'video' || kind === 'youtube' || kind === 'panopto') {
    const { box, holder } = ensureMediaViewer();
    
    // Clear previous content og fallback timer
    try { 
      if (holder._fallbackTimer) { 
        clearTimeout(holder._fallbackTimer); 
        holder._fallbackTimer = null; 
      } 
    } catch (e) {}
    holder.innerHTML = '';
    
    // === YOUTUBE EMBED ===
    if (kind === 'youtube') {
      const embedUrl = toYouTubeEmbed(url);
      const iframeId = 'yt-' + Date.now(); // Unique ID for YouTube player
      
      const iframe = document.createElement('iframe');
      iframe.id = iframeId;
      iframe.src = embedUrl || url;
      iframe.width = '100%';
      iframe.height = '100%';
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('allow', 'autoplay; encrypted-media; fullscreen');
      iframe.allowFullscreen = true;
      holder.appendChild(iframe);
      
      // 5-second fallback: åpne i ny tab hvis iframe ikke laster
      const loadTimestamp = Date.now();
      holder._loadStamp = loadTimestamp;
      
      iframe.addEventListener('load', () => { 
        if (holder._fallbackTimer) { 
          clearTimeout(holder._fallbackTimer); 
          holder._fallbackTimer = null; 
        } 
      });
      
      holder._fallbackTimer = setTimeout(() => { 
        if (holder._loadStamp === loadTimestamp) {
          window.open(url, '_blank');
        }
      }, 5000);
      
      // === YOUTUBE PLAYER API INTEGRATION ===
      // Tracker progress og markerer som watched når ferdig
      try { 
        holder._ytPlayers = holder._ytPlayers || {};
        
        ensureYouTubeAPI(() => {
          try {
            const player = new YT.Player(iframeId, {
              events: {
                // Player ready - load saved position
                onReady: (event) => {
                  try {
                    const savedPosition = loadVideoPos(url);
                    
                    // Resume fra saved position hvis > 5 sekunder
                    if (savedPosition && savedPosition > 5) { 
                      event.target.seekTo(savedPosition, true); 
                    }
                    
                    // Start polling for position updates (hver 2 sekund)
                    const pollInterval = setInterval(() => { 
                      try { 
                        const currentTime = event.target.getCurrentTime();
                        saveVideoPos(url, currentTime);
                      } catch (e) {
                        console.warn('Could not save video position:', e);
                      }
                    }, 2000);
                    
                    // Store player reference og poll interval
                    holder._ytPlayers[iframeId] = {
                      player: event.target,
                      poll: pollInterval
                    };
                  } catch (e) {
                    console.error('YouTube player ready error:', e);
                  }
                },
                
                // State change - sjekk om video er ferdig
                onStateChange: (event) => {
                  try { 
                    if (event.data === YT.PlayerState.ENDED) { 
                      markVideoWatched(url);
                    } 
                  } catch (e) {
                    console.warn('Could not mark video as watched:', e);
                  }
                }
              }
            });
          } catch (e) {
            console.error('YouTube player initialization error:', e);
          }
        });
      } catch (e) {
        console.error('YouTube API integration error:', e);
      }
      
    // === PANOPTO EMBED ===
    } else if (kind === 'panopto') {
      // Konverter Viewer.aspx til Embed.aspx
      let embedUrl = String(url).replace(/Viewer\.aspx/i, 'Embed.aspx');
      
      const iframe = document.createElement('iframe');
      iframe.src = embedUrl;
      iframe.width = '100%';
      iframe.height = '100%';
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('allow', 'autoplay; encrypted-media; fullscreen');
      iframe.allowFullscreen = true;
      holder.appendChild(iframe);
      
      // 5-second fallback
      const loadTimestamp = Date.now();
      holder._loadStamp = loadTimestamp;
      
      iframe.addEventListener('load', () => { 
        if (holder._fallbackTimer) { 
          clearTimeout(holder._fallbackTimer); 
          holder._fallbackTimer = null; 
        } 
      });
      
      holder._fallbackTimer = setTimeout(() => { 
        if (holder._loadStamp === loadTimestamp) {
          window.open(url, '_blank');
        }
      }, 5000);
      
      // Manual "Mark as watched" button for Panopto
      try { 
        const controlDiv = document.createElement('div');
        controlDiv.style.position = 'absolute';
        controlDiv.style.right = '12px';
        controlDiv.style.bottom = '12px';
        controlDiv.style.zIndex = '9999';
        controlDiv.innerHTML = '<button class="mark-watched">Markér som sett</button>';
        holder.appendChild(controlDiv);
        
        controlDiv.querySelector('.mark-watched').addEventListener('click', () => {
          markVideoWatched(url);
        });
      } catch (e) {
        console.warn('Could not add mark-watched button:', e);
      }
      
    // === LOCAL VIDEO FILES ===
    } else {
      const videoElement = document.createElement('video');
      videoElement.controls = true;
      videoElement.autoplay = true;
      videoElement.style.width = '100%';
      videoElement.style.height = '100%';
      
      const sourceElement = document.createElement('source');
      sourceElement.src = url;
      videoElement.appendChild(sourceElement);
      holder.appendChild(videoElement);
      
      // Prøv å auto-play (kan bli blokkert av browser)
      try { 
        videoElement.play().catch(() => {}); 
      } catch (e) {}
      
      // 5-second fallback hvis video ikke laster
      const loadTimestamp = Date.now();
      holder._loadStamp = loadTimestamp;
      
      const clearVideoFallback = () => { 
        if (holder._fallbackTimer) { 
          clearTimeout(holder._fallbackTimer); 
          holder._fallbackTimer = null; 
        } 
      };
      
      videoElement.addEventListener('loadedmetadata', clearVideoFallback);
      videoElement.addEventListener('canplay', clearVideoFallback);
      
      holder._fallbackTimer = setTimeout(() => { 
        if (holder._loadStamp === loadTimestamp) {
          window.open(url, '_blank');
        }
      }, 5000);
    }
    
    // Vis media viewer, skjul andre
    box.style.display = 'block';
    toggleWelcome(false);
    
    const pdfBox = document.getElementById('pdf-viewer-container');
    if (pdfBox) pdfBox.style.display = 'none';
    
    const resizeBar = document.getElementById('pdf-viewer-resize');
    if (resizeBar) resizeBar.style.display = 'none';
    
    const quizContainer = document.getElementById('quiz-container');
    if (quizContainer) quizContainer.style.display = 'none';
    
    return;
  }

  // === PDF/CODE VIEWER HANDLING ===
  const { box } = ensureViewer();
  const useIframeForPdf = kind === 'pdf' && isMobileViewport();
  const frame = useIframeForPdf
    ? (replaceViewerFrame('iframe') || box.firstElementChild)
    : (replaceViewerFrame('object') || box.firstElementChild);
  let targetUrl = url;

  // Map file types til riktige viewers
  if (kind === 'py') {
    targetUrl = `/includes/kodeLesere/pyview.html?file=${encodeURIComponent(url)}`;
  } else if (kind === 'ipynb') {
    targetUrl = `/includes/kodeLesere/nbview.html?file=${encodeURIComponent(url)}`;
  } else if (kind === 'fusion') {
    targetUrl = `/includes/kodeLesere/fusionview.html?file=${encodeURIComponent(url)}`;
  } else if (kind === 'html') {
    targetUrl = `/includes/kodeLesere/htmlview.html?file=${encodeURIComponent(url)}`;
  } else if (kind === 'stl') {
    targetUrl = `/includes/kodeLesere/stlview.html?file=${encodeURIComponent(url)}`;
  } else if (kind === 'fbm') {
    targetUrl = `/includes/kodeLesere/fbmview.html?file=${encodeURIComponent(url)}`;
  } else if (kind === '3mf') {
    targetUrl = `/includes/kodeLesere/3mfhydro.html?file=${encodeURIComponent(url)}`;
  } else if (kind === 'f3d') {
    targetUrl = `/includes/kodeLesere/f3dview.html?file=${encodeURIComponent(url)}`;
  } else if (kind === 'hydrostatics') {
    targetUrl = `/includes/kodeLesere/hydrostaticsview.html?file=${encodeURIComponent(url)}`;
  } else if (kind === 'code') {
    targetUrl = `/includes/kodeLesere/codeview.html?file=${encodeURIComponent(url)}`;
  }

  // Set content type for PDF
  if (kind === 'pdf' && frame.tagName.toLowerCase() === 'object') {
    frame.type = 'application/pdf';
  } else {
    frame.removeAttribute('type');
  }

  // Clear previous fallback timer
  if (frame._fallbackTimer) { 
    clearTimeout(frame._fallbackTimer); 
    frame._fallbackTimer = null; 
  }
  
  // Load content
  if (frame.tagName.toLowerCase() === 'iframe') {
    frame.src = targetUrl;
  } else {
    frame.data = targetUrl;
  }
  box.style.display = 'block';
  toggleWelcome(false);

  // Vis resize bar
  const resizeBar = document.getElementById('pdf-viewer-resize');
  if (resizeBar) resizeBar.style.display = useIframeForPdf ? 'none' : 'block';

  // 3-second fallback for PDF (åpne i ny tab hvis ikke laster)
  const loadTimestamp = Date.now();
  frame._loadStamp = loadTimestamp;
  
  frame.onload = () => { 
    if (frame._fallbackTimer) { 
      clearTimeout(frame._fallbackTimer); 
      frame._fallbackTimer = null; 
    } 
  };

  if (kind === 'pdf') {
    frame._fallbackTimer = setTimeout(() => {
      const loadedUrl = frame.tagName.toLowerCase() === 'iframe' ? frame.src : frame.data;
      if (frame._loadStamp === loadTimestamp && loadedUrl === targetUrl) {
        window.open(url, '_blank');
      }
    }, 3000);
  }
  
  // Skjul media viewer og quiz
  const mediaViewer = document.getElementById('media-viewer-container');
  if (mediaViewer) { 
    mediaViewer.style.display = 'none';
    
    const mediaHolder = document.getElementById('media-viewer');
    try { 
      if (mediaHolder && mediaHolder._fallbackTimer) { 
        clearTimeout(mediaHolder._fallbackTimer); 
        mediaHolder._fallbackTimer = null; 
      } 
    } catch (e) {}
    
    if (mediaHolder) mediaHolder.innerHTML = '';
  }
  
  const quizContainer = document.getElementById('quiz-container');
  if (quizContainer) quizContainer.style.display = 'none';
  
  // Clear active state fra alle dropdowns
  document.querySelectorAll('.dropdown-oving').forEach(d => d.classList.remove('active'));
}

/**
 * Åpner en fil basert på URL/filtype
 * Auto-detekterer filtype og sender til riktig viewer
 * @param {string} url - URL til fil
 */
function openFile(url) {
  const lowerUrl = String(url || '').toLowerCase();
  const cleanUrl = lowerUrl.split('?')[0].split('#')[0];
  const fusionFlag = new URLSearchParams(window.location.search).get('fusionviewer');
  const fusionViewerEnabled =
    window.ENABLE_FUSION_VIEWER !== false &&
    fusionFlag !== '0';
  
  // PDF files
  if (cleanUrl.endsWith('.pdf')) {
    return openInViewer(url, 'pdf');
  }
  
  // Jupyter notebooks
  if (cleanUrl.endsWith('.ipynb')) {
    return openInViewer(url, 'ipynb');
  }
  
  // Python files
  if (cleanUrl.endsWith('.py')) {
    return openInViewer(url, 'py');
  }

  // HTML files
  if (cleanUrl.endsWith('.html')) {
    return openInViewer(url, 'html');
  }

  // STL files
  if (cleanUrl.endsWith('.stl')) {
    return openInViewer(url, 'stl');
  }

  // FBM / FM3 files
  if (cleanUrl.endsWith('.fbm') || cleanUrl.endsWith('.fm3')) {
    return openInViewer(url, 'fbm');
  }

  // Fusion/CAD/mesh filer
  if (fusionViewerEnabled && /\.(f3d|f3z|step|stp|iges|igs|obj|3mf|stl|sat|smt|x_t|x_b|sldprt|sldasm)$/i.test(cleanUrl)) {
    return openInViewer(url, 'fusion');
  }
  
  // Video files
  if (cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.webm') ||
      cleanUrl.endsWith('.ogg') || cleanUrl.endsWith('.mov') ||
      cleanUrl.endsWith('.m4v')) {
    return openInViewer(url, 'video');
  }
  
  // YouTube links
  if (/^https?:\/\/(?:www\.)?(youtube\.com|youtu\.be)\//i.test(url)) {
    return openInViewer(url, 'youtube');
  }
  
  // Panopto links
  if (/^https?:\/\/(?:[\w.-]+\.)?panopto\.eu\//i.test(url) || /panopto.*Viewer\.aspx/i.test(url)) {
    return openInViewer(url, 'panopto');
  }
  
  // 3MF model files
  if (lowerUrl.split('?')[0].split('#')[0].endsWith('.3mf')) {
    return openInViewer(url, '3mf');
  }
  
  // F3D format files (STEP, IGES, FBX, OBJ, PLY, VTK, GLTF, GLB, ABC, USD, IFC, DRACO, VDB)
  if (/\.(step|iges|fbx|abc|usd|usda|usdc|usdz|ifc|draco|vdb|obj|ply|vtk|gltf|glb)$/.test(lowerUrl)) {
    return openInViewer(url, 'f3d');
  }
  
  // 3MF model files
  if (lowerUrl.split('?')[0].split('#')[0].endsWith('.3mf')) {
    return openInViewer(url, '3mf');
  }
  
  // F3D format files (STEP, IGES, FBX, OBJ, PLY, VTK, GLTF, GLB, ABC, USD, IFC, DRACO, VDB)
  if (/\.(step|iges|fbx|abc|usd|usda|usdc|usdz|ifc|draco|vdb|obj|ply|vtk|gltf|glb)$/.test(lowerUrl)) {
    return openInViewer(url, 'f3d');
  }
  
  // Hydrostatistic reports (JSON/CSV from DELFSHIP, Hydrometer, etc.)
  if (/\/(hydro|stab|equilibrium|delfship).*\.(json|csv)$/.test(lowerUrl) || /Hydrometer/.test(url) && /\.(json|csv)$/.test(lowerUrl)) {
    return openInViewer(url, 'hydrostatics');
  }
  
  // Code files (C, C++, C#, Java)
  if (/\.(c|cc|cpp|cxx|h|hh|hpp|cs|java)$/.test(cleanUrl)) {
    return openInViewer(url, 'code');
  }
  
  // Fallback: åpne i ny tab
  window.open(url, '_blank');
}

// Expose globally så den kan kalles fra HTML onclick attributes
window.openFile = openFile;

/**
 * Auto-finner quiz.json i standard locations
 * @param {string} courseDir - Base course directory
 * @returns {Promise<string|null>} Relativ path til quiz.json eller null
 */
async function autoFindQuizRel(courseDir) {
  const candidates = ['quiz/quiz.json', 'filer/quiz/quiz.json'];
  
  for (const relativePath of candidates) {
    const quizUrl = toAbsUrl(relativePath, courseDir);
    try {
      const response = await fetch(quizUrl, { cache: 'no-store', method: 'GET' });
      if (response.ok) return relativePath;
    } catch (e) {
      // Continue til neste kandidat
    }
  }
  
  return null;
}

/************************************************************************
 * 3) DISPLAY NAME & SORTING FUNCTIONS
 * 
 * Håndterer formatering av øvingsnavn og sortering av sidebar keys
 ************************************************************************/

/**
 * Konverterer key til display-vennlig navn
 * @param {string} key - Key fra index.json
 * @returns {string} Formatert display navn
 * 
 * Eksempler:
 *   "oving05" → "Øving 05"
 *   "Øving 12" → "Øving 12"
 *   "PythonØving1" → "PythonØving1"
 */
function displayName(key) {
  // Match "øving"/"oving" + number (case insensitive)
  const match = key.match(/^\s*[øo]ving(?:er)?\s*0*(\d{1,3})\b/i);
  if (match) {
    const ovingNum = parseInt(match[1], 10);
    return `Øving ${String(ovingNum).padStart(2, '0')}`;
  }
  
  // Match "ovingXX" format
  const match2 = key.match(/^oving(\d{1,3})$/i);
  if (match2) {
    const ovingNum = parseInt(match2[1], 10);
    return `Øving ${String(ovingNum).padStart(2, '0')}`;
  }
  
  // Fallback: fjern file extension og returner som-er
  return key.replace(/\.[^/.]+$/, "");
}

/**
 * Sorterer sidebar keys i riktig rekkefølge
 * Rekkefølge: Øving01-99 → PythonØvinger → Andre → Beskyttede
 * 
 * @param {Object} indexData - Index.json data object
 * @returns {string[]} Sorterte keys
 */
function sortSidebarKeys(indexData) {
  // Filtrer ut special keys (welcome, quiz)
  const keys = Object.keys(indexData).filter(k => k !== 'welcome' && k !== 'quiz');
  
  /**
   * Ekstraherer øvingsnummer fra key
   * @param {string} k - Key å sjekke
   * @returns {number|null} Øvingsnummer eller null
   */
  const getOvingNumber = (k) => {
    // oving01, oving02, etc.
    if (/^oving\d{2}$/i.test(k)) {
      return parseInt(k.slice(5), 10);
    }
    
    // "Øving 5", "oving 12", etc.
    const match = k.match(/^\s*[øo]ving(?:er)?\s*0*(\d{1,3})\b/i);
    return match ? parseInt(match[1], 10) : null;
  };
  
  /**
   * Sjekker om key er en PythonØving
   */
  const isPythonOving = k => /^pythonøving/i.test(k);
  
  /**
   * Sjekker om key er beskyttet
   */
  const isProtected = k => {
    return !!(indexData[k]?.beskyttet) || /beskyttet|hemmelig/i.test(k);
  };
  
  // Kategoriser keys
  const ovinger = keys.filter(k => {
    const num = getOvingNumber(k);
    return num !== null && !isProtected(k);
  }).sort((a, b) => getOvingNumber(a) - getOvingNumber(b));
  
  const pythonOvinger = keys.filter(k => {
    return !ovinger.includes(k) && isPythonOving(k) && !isProtected(k);
  }).sort((a, b) => a.localeCompare(b, 'nb'));
  
  const others = keys.filter(k => {
    return !ovinger.includes(k) && 
           !pythonOvinger.includes(k) && 
           !isProtected(k);
  }).sort((a, b) => a.localeCompare(b, 'nb'));
  
  const protected = keys.filter(isProtected).sort((a, b) => a.localeCompare(b, 'nb'));
  
  // Kombiner i riktig rekkefølge
  return [...ovinger, ...pythonOvinger, ...others, ...protected];
}

/************************************************************************
 * 4) NESTED FLYOUT BUILDER
 * 
 * Bygger HTML for nested folder struktur basert på "/" i filnavn
 ************************************************************************/

/**
 * Grupperer filer etter mapper (basert på "/" i filnavn)
 * @param {string[]} files - Array av filnavn
 * @returns {Object} { folders: {folderName: [files]}, rootFiles: [files] }
 * 
 * Eksempel:
 *   Input: ["DelA/fil1.pdf", "DelA/fil2.pdf", "fil3.pdf"]
 *   Output: {
 *     folders: { "DelA": ["DelA/fil1.pdf", "DelA/fil2.pdf"] },
 *     rootFiles: ["fil3.pdf"]
 *   }
 */
function groupFilesByFolders(files) {
  const folders = {};      // { folderName: [files in folder] }
  const rootFiles = [];    // Files ikke i folder
  
  files.forEach(file => {
    const fileString = String(file || '').trim();
    
    // Håndter "label|url" format
    if (fileString.indexOf('|') >= 0) {
      const pipePos = fileString.indexOf('|');
      const slashPos = fileString.indexOf('/');
      const parts = fileString.split('|');
      const urlPart = (parts[1] || parts[0] || '').trim();
      
      // Hvis "/" er ETTER "|", er dette en URL (ikke folder struktur)
      if ((slashPos === -1 || slashPos > pipePos) && 
          (/^https?:\/\//i.test(urlPart) || urlPart.startsWith('//'))) {
        rootFiles.push(fileString);
        return;
      }
    }
    
    // Absolutte URLs → root files
    if (/^https?:\/\//i.test(fileString)) {
      rootFiles.push(fileString);
      return;
    }

    // Files med "/" → folder structure
    if (fileString.includes('/')) {
      const parts = fileString.split('/');
      const folderName = parts[0];
      
      if (!folders[folderName]) {
        folders[folderName] = [];
      }
      folders[folderName].push(fileString);
    } else {
      // Ingen "/" → root file
      rootFiles.push(fileString);
    }
  });
  
  return { folders, rootFiles };
}

/**
 * Genererer riktig ikon HTML for en fil basert på type
 * @param {string} file - Filnavn eller URL
 * @returns {string} HTML string med SVG ikon
 */
function iconForFile(file) {
  try {
    let fileString = String(file || '').trim();
    
    // Håndter "label|url" format - bruk URL-delen for detection
    if (fileString.indexOf('|') >= 0) { 
      const parts = fileString.split('|'); 
      fileString = (parts[1] || parts[0] || '').trim(); 
    }
    
    const lowerFile = fileString.toLowerCase();
    
    // === YOUTUBE IKON ===
    if (/^https?:\/\/(?:www\.)?(youtube\.com|youtu\.be)\//i.test(fileString)) {
      return '<span class="file-icon youtube" style="background:#FF0000;border-radius:3px">' +
        '<svg viewBox="0 0 24 16" width="18" height="12" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">' +
        '<rect rx="2" x="0" y="0" width="24" height="16" fill="transparent"/>' +
        '<polygon points="9,4 16,8 9,12" style="fill:#ffffff"/>' +
        '</svg>' +
        '</span>';
    }
    
    // === PANOPTO IKON ===
    if (/^https?:\/\/(?:[\w.-]+\.)?panopto\.eu\//i.test(fileString) || /panopto/i.test(fileString)) {
      return '<span class="file-icon panopto" style="background:#6A1B9A;border-radius:3px">' +
        '<svg viewBox="0 0 24 16" width="18" height="12" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">' +
        '<rect rx="2" x="0" y="0" width="24" height="16" fill="transparent"/>' +
        '<polygon points="9,4 16,8 9,12" style="fill:#ffffff"/>' +
        '</svg>' +
        '</span>';
    }
    
    // === PYTHON IKON ===
    if (lowerFile.endsWith('.py') || lowerFile.endsWith('.ipynb')) {
      return '<span class="file-icon python" style="background:#3572A5;border-radius:3px">' +
        '<svg viewBox="0 0 24 16" width="18" height="12" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">' +
        '<rect rx="2" x="0" y="0" width="24" height="16" fill="transparent"/>' +
        '<path d="M7 11c2-1 3-3 4-4 1-1 2-2 2-2" style="stroke:#ffffff; stroke-width:1.6; fill:none; stroke-linecap:round; stroke-linejoin:round"/>' +
        '</svg>' +
        '</span>';
    }
    
    // === PDF IKON ===
    if (lowerFile.endsWith('.pdf')) {
      return '<span class="file-icon pdf" style="background:#D32F2F;border-radius:3px">' +
        '<svg viewBox="0 0 24 16" width="18" height="12" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">' +
        '<rect rx="2" x="0" y="0" width="24" height="16" fill="transparent"/>' +
        '<rect x="4" y="3" width="12" height="10" rx="1" style="fill:#ffffff"/>' +
        '<rect x="6" y="5" width="2" height="6" rx="0.5" style="fill:#D32F2F"/>' +
        '<rect x="9" y="5" width="2" height="6" rx="0.5" style="fill:#D32F2F"/>' +
        '</svg>' +
        '</span>';
    }
    
    // === IMAGE IKON ===
    if (lowerFile.endsWith('.png') || lowerFile.endsWith('.jpg') || 
        lowerFile.endsWith('.jpeg') || lowerFile.endsWith('.gif') || 
        lowerFile.endsWith('.svg')) {
      return '<span class="file-icon image" style="background:#4CAF50;border-radius:3px">' +
        '<svg viewBox="0 0 24 16" width="18" height="12" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">' +
        '<rect rx="2" x="0" y="0" width="24" height="16" fill="transparent"/>' +
        '<circle cx="6" cy="5" r="2" style="fill:#ffffff"/>' +
        '<path d="M3 12l5-5 6 6 7-6v6z" style="fill:#ffffff"/>' +
        '</svg>' +
        '</span>';
    }
    
    // === VIDEO IKON ===
    if (lowerFile.endsWith('.mp4') || lowerFile.endsWith('.webm') || 
        lowerFile.endsWith('.ogg') || lowerFile.endsWith('.mov') || 
        lowerFile.endsWith('.m4v')) {
      return '<span class="file-icon video" style="background:#444;border-radius:3px">' +
        '<svg viewBox="0 0 24 16" width="18" height="12" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">' +
        '<rect rx="2" x="0" y="0" width="24" height="16" fill="transparent"/>' +
        '<polygon points="9,4 16,8 9,12" style="fill:#ffffff"/>' +
        '</svg>' +
        '</span>';
    }
    
    // === SHORTCUT FILES IKON (.url, .webloc) ===
    if (lowerFile.endsWith('.url') || lowerFile.endsWith('.webloc')) {
      return '<span class="file-icon link" style="background:#2196F3;border-radius:3px">' +
        '<svg viewBox="0 0 24 16" width="18" height="12" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">' +
        '<rect rx="2" x="0" y="0" width="24" height="16" fill="transparent"/>' +
        '<path d="M8 5h8M8 11h8M6 8h12" style="stroke:#ffffff;stroke-width:1.5;fill:none;stroke-linecap:round"/>' +
        '</svg>' +
        '</span>';
    }
  } catch (e) {
    console.warn('Error generating icon:', e);
  }
  
  // Ingen ikon
  return '';
}

/**
 * Bygger nested flyout HTML rekursivt
 * @param {string[]} files - Array av filnavn
 * @param {Function} makeHrefFunc - Function(filename) => href
 * @param {boolean} isPyGroup - Om dette er en PythonØving gruppe (DEPRECATED, brukes ikke lenger)
 * @returns {string} HTML string for flyout content
 */
function buildNestedFlyoutHTML(files, makeHrefFunc, isPyGroup) {
  const { folders, rootFiles } = groupFilesByFolders(files);
  let html = '';

  /**
   * Genererer display label for en fil
   * Håndterer URLs, shortcuts, og vanlige filer
   */
  function makeLabel(file) {
    try {
      let fileString = String(file || '').trim();
      let labelPart = null;
      let urlPart = null;
      
      // Parse "label|url" format
      if (fileString.indexOf('|') >= 0) {
        const parts = fileString.split('|');
        labelPart = parts[0] || null;
        urlPart = parts[1] || null;
      }
      
      if (urlPart) fileString = urlPart;
      
      // YouTube URLs - extract video ID
      const youtubeMatch = String(fileString).match(/[?&]v=([^&]+)/i);
      if (/^https?:\/\//i.test(fileString) || youtubeMatch) {
        const match = youtubeMatch || fileString.match(/[?&]v=([^&]+)/i);
        if (match) {
          if (labelPart) return labelPart;
          return 'YouTube – ' + decodeURIComponent(match[1]);
        }
        
        // youtu.be/<id>
        const youtubeShortMatch = fileString.match(/youtu\.be\/([-_0-9A-Za-z]+)/i);
        if (youtubeShortMatch) {
          if (labelPart) return labelPart;
          return 'YouTube – ' + decodeURIComponent(youtubeShortMatch[1]);
        }
        
        // Generic URL - extract last path segment
        try {
          const url = new URL(fileString);
          const pathSegments = url.pathname.split('/').filter(Boolean);
          if (pathSegments.length) {
            return decodeURIComponent(pathSegments[pathSegments.length - 1]);
          }
        } catch (e) {
          // Invalid URL
        }
        
        return labelPart || fileString.replace(/^https?:\/\//i, '');
      }

      // Local file - remove extension and return basename
      const baseName = labelPart || String(file).split(/[\\\/]/).pop().replace(/\.[^/.]+$/, '');
      return baseName;
    } catch (e) {
      return String(file);
    }
  }

  // === BUILD ROOT FILES ===
  const rootItems = rootFiles.map(f => ({ f, label: makeLabel(f) }));
  
  // Natural sort (handles numbers correctly: fil1, fil2, fil10)
  rootItems.sort((a, b) => 
    a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' })
  );
  
  rootItems.forEach(item => {
    const file = item.f;
    const href = makeHrefFunc(file);
    const icon = iconForFile(file);
    
    // Truncate long labels
    const displayLabel = item.label.length > 40 
      ? item.label.slice(0, 38) + '…' 
      : item.label;
    
    html += `<a href="${href}" data-file="${file}">${icon}<span class="file-label">${displayLabel}</span></a>`;
  });
  
  // === BUILD NESTED FOLDERS ===
  // Sort folder names naturally
  Object.keys(folders).sort((a, b) => 
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  ).forEach(folderName => {
    let folderFiles = folders[folderName] || [];
    
    // Sort files inside folder
    folderFiles = folderFiles.slice().sort((x, y) => {
      const labelX = makeLabel(x.substring(folderName.length + 1));
      const labelY = makeLabel(y.substring(folderName.length + 1));
      return labelX.localeCompare(labelY, undefined, { numeric: true, sensitivity: 'base' });
    });
    
    // Build folder item HTML
    html += `<div class="nested-folder-item" data-folder="${folderName}">`;
    
    // Folder icon
    html += `<span class="file-icon folder" style="background:#6B6B6B;border-radius:3px" aria-hidden="true">`;
    html += '<svg viewBox="0 0 24 16" width="18" height="12" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">';
    html += '<rect rx="2" x="0" y="0" width="24" height="16" fill="transparent"/>';
    html += '<path d="M3 6h6l2 2h8v6H3z" style="fill:#fff"/>';
    html += '</svg></span>';
    
    html += `<span class="file-label">${folderName}</span>`;
    html += `<div class="nested-flyout">`;
    
    // Recursively build nested content (remove folder prefix from filenames)
    const subFiles = folderFiles.map(f => f.substring(folderName.length + 1));
    
    // VIKTIG: Send false som isPyGroup for nested flyouts (ikke vis Python emoji på mapper)
    html += buildNestedFlyoutHTML(
      subFiles, 
      (subFile) => makeHrefFunc(`${folderName}/${subFile}`), 
      false  // Always false for nested content
    );
    
    html += `</div></div>`;
  });
  
  return html;
}

/************************************************************************
 * 5) SIDEBAR INITIALIZATION
 * 
 * Main initialization function - loads index.json og bygger sidebar UI
 ************************************************************************/
async function initSidebar() {
  // === LOAD INDEX.JSON ===
  const indexData = await fetch('filer/index.json', { cache: 'no-store' })
    .then(r => r.json())
    .catch(() => null);
  
  if (!indexData) {
    console.error('Could not load index.json');
    return;
  }

  // === SANITIZE INDEX DATA ===
  // Normalize backslashes to forward slashes, ensure files arrays
  try {
    Object.keys(indexData).forEach(key => {
      const value = indexData[key];
      
      if (Array.isArray(value)) {
        // Legacy format: direct array
        indexData[key] = value.map(x => String(x).replace(/\\+/g, '/'));
      } else if (value && typeof value === 'object') {
        // Object format with .files property
        if (value.files && Array.isArray(value.files)) {
          value.files = value.files.map(x => String(x).replace(/\\+/g, '/'));
        } else if (value.files && !Array.isArray(value.files)) {
          console.warn(`[sidebar] Non-array files for key "${key}":`, typeof value.files);
          value.files = [String(value.files)];
        }
      }
    });
  } catch (e) {
    console.error('Error sanitizing index data:', e);
  }

  const sidebar = document.getElementById('sidebar');
  const courseDir = getCourseDir();

  // === WELCOME IMAGE ===
  if (indexData.welcome) {
    const contentArea = document.querySelector('.content');
    let welcomeImg = document.getElementById('welcome-img');
    
    if (!welcomeImg) {
      welcomeImg = document.createElement('img');
      welcomeImg.id = 'welcome-img';
      welcomeImg.alt = 'Velkomst';
      Object.assign(welcomeImg.style, {
        maxWidth: '420px',
        display: 'block',
        margin: '2rem auto'
      });
    }
    
    // Handle relative vs absolute paths
    const imageSrc = /^(https?:|\.\/|\/)/.test(indexData.welcome) 
      ? indexData.welcome 
      : 'filer/' + indexData.welcome;
    
    welcomeImg.src = imageSrc || '/img/welcome-generic.svg';
    
    const description = document.querySelector('.course-description');
    if (description) {
      description.after(welcomeImg);
    } else {
      contentArea.append(welcomeImg);
    }
  }

  // === AUTO-DETECT QUIZ ===
  if (!indexData.quiz) {
    const foundQuiz = await autoFindQuizRel(courseDir);
    if (foundQuiz) {
      indexData.quiz = foundQuiz;
    }
  }

  const sortedKeys = sortSidebarKeys(indexData);

  /**
   * Genererer href for en fil i index
   * @param {string} key - Index key (e.g., "oving01")
   * @param {Object} obj - Index object for denne key
   * @param {string} file - Filnavn
   * @returns {string} Full href URL
   */
  function makeHref(key, obj, file) {
    const isFileKey = /\.[a-z0-9]{1,8}$/i.test(key);
    let relativePath = String(file || '');
    
    // Parse "label|url" format - use URL part
    if (relativePath.indexOf('|') >= 0) {
      const parts = relativePath.split('|');
      relativePath = parts[1] || parts[0] || '';
    }
    
    relativePath = String(relativePath).trim();
    
    // Normalize URLs without protocol
    if (!/^https?:\/\//i.test(relativePath)) {
      if (/^(?:www\.|youtube\.com|youtu\.be|panopto\.|watch\?|watch=)/i.test(relativePath) || 
          /[?&]v=[-_0-9A-Za-z]+/i.test(relativePath)) {
        relativePath = 'https://' + relativePath.replace(/^\//, '');
      }
      // Protocol-relative URLs
      if (relativePath.startsWith('//')) {
        relativePath = 'https:' + relativePath;
      }
    }
    
    // Extract absolute URL from path if embedded
    const httpIndex = String(relativePath).search(/https?:\/\//i);
    if (httpIndex >= 0) return relativePath.substring(httpIndex);
    
    // Absolute path
    if (relativePath.startsWith('/')) return relativePath;
    
    // Check for dir property in object
    const dir = (obj && typeof obj === 'object' && obj.dir) ? String(obj.dir) : null;
    
    // Prepend dir if exists and not already prefixed
    if (!isFileKey && dir) {
      if (!relativePath.startsWith(dir + '/') && !relativePath.startsWith('filer/')) {
        relativePath = `${dir}/${relativePath}`;
      }
    }
    
    // Add filer/ prefix if not present
    const underFiler = relativePath.startsWith('filer/') 
      ? relativePath 
      : `filer/${relativePath}`;
    
    // Encode path segments
    const encoded = encodePathSegments(underFiler.replace(/\\/g, '/'));
    return new URL(encoded, location.origin + courseDir).href;
  }

  // === BUILD SIDEBAR HTML ===
  let sidebarHTML = '<h3>Øvinger</h3>';
  
  sidebarHTML += sortedKeys.map(key => {
    const obj = indexData[key];
    const isLocked = !!(obj && obj.beskyttet);
    const lockIcon = isLocked ? '🔒 ' : '';
    
    // Get files array
    let files = [];
    if (Array.isArray(obj)) {
      files = obj;
    } else if (obj?.files) {
      files = obj.files;
    }

    // Don't show locked content if not authenticated
    if (isLocked && !isOk()) {
      return `<div class="dropdown-oving"><div class="dropdown-btn beskyttet">${lockIcon}${displayName(key)}</div></div>`;
    }

    // Build dropdown if has files
    if (files && files.length) {
      const isPyGroup = /^pythonøving/i.test(String(key));
      
      // Build content HTML with nested flyout support
      const contentHTML = buildNestedFlyoutHTML(
        files, 
        (f) => makeHref(key, obj, f), 
        isPyGroup
      );
      
      return `<div class="dropdown-oving">
        <div class="dropdown-btn${isLocked ? ' beskyttet' : ''}">${lockIcon}${displayName(key)}</div>
        <div class="dropdown-content">${contentHTML}</div>
      </div>`;
    }
    
    // Empty dropdown
    return `<div class="dropdown-oving"><div class="dropdown-btn${isLocked ? ' beskyttet' : ''}">${lockIcon}${displayName(key)}</div></div>`;
  }).join('');

  // Add quiz button if quiz exists
  if (indexData.quiz) { 
    sidebarHTML += `<div class="dropdown-oving"><div class="dropdown-btn" id="quiz-btn">🧩 Quiz</div></div>`; 
  }
  
  sidebar.innerHTML = sidebarHTML;
  refreshWatchedStatus();

  /* ================================================================
     DESKTOP FLYOUT INTERACTION SETUP
     ================================================================ */
  
  let lockedMenu = null;  // Currently locked flyout menu
  let _nestedZCounter = 2000;  // Z-index counter for nested flyouts

  /**
   * Sets up interaction handlers for a nested flyout
   * @param {HTMLElement} folderItem - Folder item element
   * @param {HTMLElement} parentMenu - Parent flyout menu
   */
  function setupNestedFlyout(folderItem, parentMenu) {
    const nestedFlyout = folderItem.querySelector('.nested-flyout');
    if (!nestedFlyout) return;

    let nestedHoverTimer = null;
    let nestedLockedFlyout = null;

    // Move nested flyout to document.body for proper fixed positioning
    if (nestedFlyout.parentElement !== document.body) {
      document.body.appendChild(nestedFlyout);
      nestedFlyout.dataset.movedToBody = '1';
      nestedFlyout.style.zIndex = 2000;
    }

    /**
     * Shows the nested flyout next to the folder item
     */
    const showNested = () => {
      // Hide other nested flyouts in same parent
      parentMenu.querySelectorAll('.nested-flyout').forEach(nf => {
        if (nf !== nestedFlyout) nf.style.display = 'none';
      });

      const parentRect = parentMenu.getBoundingClientRect();
      const itemRect = folderItem.getBoundingClientRect();
      
      // Show for measuring
      nestedFlyout.style.display = 'block';
      nestedFlyout.style.opacity = '0';
      void nestedFlyout.offsetHeight;  // Force reflow
      
      const menuHeight = nestedFlyout.scrollHeight;
      const viewportHeight = window.innerHeight;
      
      // Position to the right of parent
      let left = parentRect.right;
      let top = itemRect.top;
      
      // Adjust if would overflow bottom
      if (top + menuHeight > viewportHeight - 10) {
        top = Math.max(10, viewportHeight - menuHeight - 10);
      }
      
      // Position to left if would overflow right
      const menuWidth = 260;
      if (left + menuWidth > window.innerWidth - 10) {
        left = parentRect.left - menuWidth;
      }
      
      // Ensure higher z-index than previous flyouts
      try { 
        nestedFlyout.style.zIndex = String(++_nestedZCounter); 
      } catch (e) {}
      
      nestedFlyout.style.left = left + 'px';
      nestedFlyout.style.top = top + 'px';
      nestedFlyout.style.opacity = '1';
    };

    /**
     * Hides the nested flyout
     */
    const hideNested = () => {
      if (nestedLockedFlyout === nestedFlyout) return;  // Don't hide if locked
      
      nestedFlyout.style.opacity = '0';
      setTimeout(() => {
        if (nestedLockedFlyout !== nestedFlyout && nestedFlyout.style.opacity === '0') {
          nestedFlyout.style.display = 'none';
        }
      }, 100);
    };

    // === EVENT HANDLERS ===
    
    // Mouse enter folder item - show after 200ms
    folderItem.addEventListener('mouseenter', () => {
      if (nestedHoverTimer) clearTimeout(nestedHoverTimer);
      nestedHoverTimer = setTimeout(showNested, 200);
    });

    // Mouse leave folder item
    folderItem.addEventListener('mouseleave', (e) => {
      if (nestedHoverTimer) clearTimeout(nestedHoverTimer);
      
      const relatedTarget = e.relatedTarget;
      if (relatedTarget && (nestedFlyout.contains(relatedTarget) || relatedTarget === nestedFlyout)) {
        return;  // Moving into nested flyout - don't hide
      }
      
      setTimeout(hideNested, 200);
    });

    // Mouse enter nested flyout - cancel hide timer
    nestedFlyout.addEventListener('mouseenter', () => {
      if (nestedHoverTimer) clearTimeout(nestedHoverTimer);
    });

    // Mouse leave nested flyout
    nestedFlyout.addEventListener('mouseleave', (e) => {
      const relatedTarget = e.relatedTarget;
      if (relatedTarget && (folderItem.contains(relatedTarget) || relatedTarget === folderItem)) {
        return;  // Moving back to folder item - don't hide
      }
      
      setTimeout(hideNested, 200);
    });

    // Click to lock/unlock nested flyout
    folderItem.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (nestedHoverTimer) clearTimeout(nestedHoverTimer);
      
      if (nestedLockedFlyout === nestedFlyout) {
        // Unlock
        nestedLockedFlyout = null;
        hideNested();
      } else {
        // Lock
        showNested();
        nestedLockedFlyout = nestedFlyout;
      }
    });

    // Recursively setup nested folders inside this flyout
    nestedFlyout.querySelectorAll('.nested-folder-item').forEach(nfi => {
      setupNestedFlyout(nfi, nestedFlyout);
    });
  }
  
  // === SETUP MAIN FLYOUT MENUS ===
  sidebar.querySelectorAll('.dropdown-oving').forEach(dropdownDiv => {
    const menu = dropdownDiv.querySelector('.dropdown-content');
    if (!menu) return;
    
    let hoverTimer = null;
    let isCalculating = false;
    
    /**
     * Calculates optimal position for flyout menu
     */
    const calculatePosition = () => {
      if (isCalculating) return;
      isCalculating = true;
      
      const rect = dropdownDiv.getBoundingClientRect();
      const navHeight = 48;
      
      // Show invisibly for measuring
      menu.style.visibility = 'hidden';
      menu.style.display = 'block';
      menu.style.opacity = '0';
      
      const menuHeight = menu.getBoundingClientRect().height;
      const viewportHeight = window.innerHeight;
      
      // Position below navbar, adjust if would overflow
      let top = Math.max(rect.top, navHeight);
      if (top + menuHeight > viewportHeight - 10) {
        top = Math.max(navHeight, viewportHeight - menuHeight - 10);
      }
      
      menu.style.top = top + 'px';
      menu.style.visibility = 'visible';
      
      isCalculating = false;
      return true;
    };
    
    /**
     * Shows the flyout menu
     */
    const show = () => {
      if (lockedMenu && lockedMenu !== menu) return;
      clearTimeout(hoverTimer);
      
      calculatePosition();
      
      hoverTimer = setTimeout(() => {
        if (lockedMenu && lockedMenu !== menu) return;
        requestAnimationFrame(() => {
          menu.style.opacity = '1';
        });
      }, 150);
    };
    
    /**
     * Hides the flyout menu
     */
    const hide = () => {
      if (lockedMenu === menu) return;
      clearTimeout(hoverTimer);
      
      // Don't hide if nested flyout is open
      const hasOpenNested = Array.from(menu.querySelectorAll('.nested-flyout')).some(nf => 
        nf.style.display === 'block' && nf.style.opacity === '1'
      );
      
      if (hasOpenNested) return;
      
      menu.style.opacity = '0';
      setTimeout(() => {
        if (lockedMenu !== menu && menu.style.opacity === '0') {
          menu.style.display = 'none';
        }
      }, 100);
    };
    
    // === CLICK TO LOCK/UNLOCK ===
    dropdownDiv.querySelector('.dropdown-btn')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('beskyttet')) return;
      
      e.stopPropagation();
      clearTimeout(hoverTimer);
      
      if (lockedMenu === menu) {
        // Unlock
        lockedMenu = null;
        menu.style.opacity = '0';
        setTimeout(() => {
          if (lockedMenu !== menu) menu.style.display = 'none';
        }, 100);
      } else {
        // Lock
        if (lockedMenu) {
          lockedMenu.style.opacity = '0';
          const prevMenu = lockedMenu;
          setTimeout(() => {
            if (lockedMenu !== prevMenu) prevMenu.style.display = 'none';
          }, 100);
        }
        
        lockedMenu = menu;
        calculatePosition();
        requestAnimationFrame(() => {
          menu.style.opacity = '1';
        });
      }
    });
    
    // Hover handlers
    dropdownDiv.addEventListener('mouseenter', show);
    dropdownDiv.addEventListener('mouseleave', hide);
    menu.addEventListener('mouseenter', () => clearTimeout(hoverTimer));
    menu.addEventListener('mouseleave', hide);
    
    // Setup nested flyouts in this menu
    menu.querySelectorAll('.nested-folder-item').forEach(folderItem => {
      setupNestedFlyout(folderItem, menu);
    });
  });
  
  // === GLOBAL CLICK HANDLER - Close locked menus ===
  document.addEventListener('click', (e) => {
    if (!lockedMenu) return;
    
    const clickedLink = e.target.closest('.dropdown-content a, .nested-flyout a');
    const clickedInLockedMenu = clickedLink && lockedMenu.contains(clickedLink);
    const clickedNestedFolder = e.target.closest('.nested-folder-item');
    const lockedDiv = lockedMenu.closest('.dropdown-oving');
    
    const shouldUnlock = (!lockedDiv || !lockedDiv.contains(e.target)) && !clickedNestedFolder;
    
    if (shouldUnlock || clickedInLockedMenu) {
      const menuToHide = lockedMenu;
      lockedMenu = null;
      menuToHide.style.opacity = '0';
      
      setTimeout(() => {
        if (lockedMenu !== menuToHide) {
          menuToHide.style.display = 'none';
          
          // Close all nested flyouts too
          document.querySelectorAll('.nested-flyout').forEach(nf => {
            nf.style.display = 'none';
          });
        }
      }, 100);
    }
  });

  /* ================================================================
     MOBILE DROPDOWN TOGGLE
     ================================================================ */
  if (window.matchMedia('(max-width: 768px)').matches) {
    sidebar.querySelectorAll('.dropdown-oving').forEach(dropdownDiv => {
      const btn = dropdownDiv.querySelector('.dropdown-btn');
      const menu = dropdownDiv.querySelector('.dropdown-content');
      if (!btn || !menu) return;
      
      btn.addEventListener('click', e => {
        e.preventDefault();
        
        // Close all other menus
        sidebar.querySelectorAll('.dropdown-content').forEach(m => m.style.display = 'none');
        
        // Toggle this menu
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
      });
      
      // Close when clicking outside
      document.addEventListener('click', e => { 
        if (!dropdownDiv.contains(e.target)) {
          menu.style.display = 'none';
        }
      });
    });
  }

  /* ================================================================
     PASSWORD-PROTECTED SECTIONS
     ================================================================ */
  sidebar.querySelectorAll('.dropdown-btn.beskyttet').forEach(btn => {
    btn.addEventListener('click', e => {
      if (!isOk()) {
        e.preventDefault();
        askPass().then(success => {
          if (success) location.reload();
        });
      }
    });
  });

  /* ================================================================
     FILE CLICK HANDLERS
     ================================================================ */
  
  /**
   * Handles clicking on a file link in flyout
   * @param {Event} e - Click event
   * @param {HTMLElement} anchor - Anchor element clicked
   */
  function handleFlyoutAnchorClick(e, anchor) {
    e.preventDefault();
    
    // Hide quiz if open
    const quizContainer = document.getElementById('quiz-container');
    if (quizContainer) quizContainer.style.display = 'none';
    
    const href = anchor.getAttribute('href');
    if (!href) return;
    
    const lowerHref = href.toLowerCase();
    
    // Check if this is a viewable file type
    if (
      lowerHref.endsWith('.pdf') || lowerHref.endsWith('.py') || lowerHref.endsWith('.ipynb') ||
      lowerHref.endsWith('.mp4') || lowerHref.endsWith('.webm') || lowerHref.endsWith('.ogg') || 
      lowerHref.endsWith('.mov') || lowerHref.endsWith('.m4v') ||
      /^https?:\/\/(?:www\.)?(youtube\.com|youtu\.be)\//i.test(href) ||
      /^https?:\/\/(?:[\w.-]+\.)?panopto\.eu\//i.test(href) ||
      /\.(c|cc|cpp|cxx|h|hh|hpp|cs|java)$/.test(lowerHref)
    ) {
      openFile(href);
    } else {
      // Not viewable - open in new tab
      window.open(href, '_blank');
    }

    // Mark dropdown as active
    sidebar.querySelectorAll('.dropdown-oving').forEach(d => d.classList.remove('active'));
    anchor.closest('.dropdown-oving')?.classList.add('active');
  }

  // Attach handlers to sidebar links
  sidebar.querySelectorAll('.dropdown-content a').forEach(anchor => {
    anchor.addEventListener('click', e => handleFlyoutAnchorClick(e, anchor));
  });

  // Delegate handler for nested flyout links (moved to body)
  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('.nested-flyout a');
    if (anchor) handleFlyoutAnchorClick(e, anchor);
  });

  /* ================================================================
     CLICK TITLE TO RELOAD
     ================================================================ */
  document.querySelector('.content h1')?.addEventListener('click', () => {
    location.reload();
  });

  /* ================================================================
     QUIZ FUNCTIONALITY
     ================================================================ */
  
  /**
   * Fixes relative image paths in quiz data
   * @param {Object} quizData - Quiz JSON data
   * @param {string} quizUrl - Full URL to quiz.json
   * @returns {Object} Modified quiz data
   */
  function fixRelativeImages(quizData, quizUrl) {
    try {
      const baseUrl = quizUrl.slice(0, quizUrl.lastIndexOf('/') + 1);
      
      (quizData?.questions || []).forEach(question => {
        if (!question || !question.image) return;

        const rawPath = String(question.image).trim();

        // Already absolute
        if (/^https?:\/\//i.test(rawPath) || rawPath.startsWith('/')) {
          question.image = rawPath;
          question._imgTry = [rawPath];
          return;
        }

        // Clean path
        let cleanPath = rawPath.replace(/^\.\/+/, '');
        cleanPath = cleanPath.replace(/^quiz\//i, '');

        // Try multiple possible paths
        const primary = new URL(cleanPath.includes('/') ? cleanPath : `bilder/${cleanPath}`, baseUrl).href;
        const alt1 = new URL(`quiz/${cleanPath.replace(/^quiz\//i, '')}`, baseUrl).href;
        const alt2 = new URL(cleanPath.replace(/^bilder\//i, ''), baseUrl).href;
        const alt3 = new URL(cleanPath, baseUrl).href;

        const uniquePaths = Array.from(new Set([primary, alt1, alt2, alt3]));
        question.image = uniquePaths[0];
        question._imgTry = uniquePaths;
      });
    } catch (e) {
      console.error('Error fixing quiz images:', e);
    }
    
    return quizData;
  }

  /**
   * Robust JSON loader with BOM stripping and error messages
   * @param {string} url - URL to JSON file
   * @returns {Promise<Object>} Parsed JSON data
   */
  async function loadJsonRobust(url) {
    const response = await fetch(url, { cache: 'no-store' });
    const text = await response.text();
    
    if (!response.ok) {
      const snippet = text.slice(0, 200).replace(/\s+/g, ' ');
      throw new Error(`[${response.status} ${response.statusText}] ${snippet}`);
    }
    
    // Strip BOM if present
    const cleanText = text.replace(/^\uFEFF/, '');
    
    try {
      return JSON.parse(cleanText);
    } catch (e) {
      const snippet = cleanText.slice(0, 200).replace(/\s+/g, ' ');
      throw new Error(`JSON parse error: ${e.message}. Excerpt: ${snippet}`);
    }
  }

  // Quiz button handler
  const quizBtn = document.getElementById('quiz-btn');
  if (quizBtn) {
    quizBtn.addEventListener('click', async () => {
      // Hide PDF viewer
      try { 
        document.getElementById('pdf-viewer-container')?.style.setProperty('display', 'none'); 
      } catch (e) {}
      
      const contentArea = document.querySelector('.content');
      let quizBox = document.getElementById('quiz-container');
      
      if (!quizBox) {
        quizBox = document.createElement('div');
        quizBox.id = 'quiz-container';
        contentArea.prepend(quizBox);
      }
      
      quizBox.style.display = 'block';

      // Load quiz-lite.js if not already loaded
      await new Promise(resolve => {
        if (window.FolkQuiz) return resolve();
        
        const script = document.createElement('script');
        script.src = '/includes/quiz-lite.js?v=7';
        script.onload = resolve;
        document.head.appendChild(script);
      });

      const persistKey = 'folkQuiz:' + getCourseDir();

      // Try multiple possible quiz locations
      const tried = [];
      const candidates = Array.from(new Set([
        indexData.quiz, 
        'quiz/quiz.json', 
        'filer/quiz/quiz.json'
      ].filter(Boolean)));
      
      for (const relativePath of candidates) {
        const quizUrl = toAbsUrl(relativePath, courseDir);
        tried.push(quizUrl);
        
        try {
          const quizData = fixRelativeImages(await loadJsonRobust(quizUrl), quizUrl);
          
          if (!window.FolkQuiz || typeof window.FolkQuiz.render !== 'function') {
            alert('Kunne ikke laste quizen: quiz-lite.js lastet, men window.FolkQuiz mangler.');
            return;
          }

          window.FolkQuiz.render(quizBox, quizData, persistKey);
          toggleWelcome(false);
          return;
        } catch (err) {
          tried[tried.length - 1] += `  [${err.message}]`;
        }
      }

      alert('Quiz-modulen er ikke tilgjengelig.\nForsøkte:\n- ' + tried.join('\n- '));
    });
  }

  /* ================================================================
     MODULE INITIALIZATION
     Optional modules that can be loaded separately
     ================================================================ */
  
  // Sidebar Search Module
  if (window.SidebarSearch && typeof window.SidebarSearch.init === 'function') {
    try {
      window.SidebarSearch.init(sidebar);
      console.log('✓ Sidebar Search Module initialized');
    } catch (err) {
      console.error('[sidebar-loader] Could not initialize search module:', err);
    }
  }
  
  // Sidebar Notifications Module
  if (window.SidebarNotifications && typeof window.SidebarNotifications.init === 'function') {
    try {
      window.SidebarNotifications.init(courseDir);
      console.log('✓ Sidebar Notifications Module initialized');
    } catch (err) {
      console.error('[sidebar-loader] Could not initialize notification module:', err);
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSidebar);
} else {
  initSidebar();
}

/************************************************************************
 * 6) VERSION BADGE
 * 
 * Displays version number in bottom-right corner
 ************************************************************************/
(function displayVersionBadge() {
  const badgeId = 'version-badge';
  const versionText = 'v11.15.3';
  
  let badge = document.getElementById(badgeId);
  
  if (!badge) {
    badge = document.createElement('div');
    badge.id = badgeId;
    
    // Style the badge
    Object.assign(badge.style, {
      position: 'fixed',
      right: '8px',
      bottom: '8px',
      background: '#444',
      color: '#fff',
      padding: '3px 6px',
      fontSize: '12px',
      borderRadius: '4px',
      opacity: '0.6',
      zIndex: '1000',
      fontFamily: 'monospace'
    });
    
    document.body.appendChild(badge);
  }
  
  badge.textContent = versionText;
})();

/* ====================================================================
   END OF sidebar-loader.js v11.15.3
   ==================================================================== *//* ====================================================================
   FolkNettsideFolk – sidebar-loader.js  v11.15.3
   ====================================================================
   
   HOVEDFUNKSJONER:
   • Dynamisk sidebar med hierarkisk dropdown-meny
   • Automatisk sortering: Øving01-99 → PythonØvinger → Andre → Beskyttet
   • Nested flyouts for undermapper (filer med "/" i navnet)
   • Multi-format fil-viewer (PDF, Python, Jupyter, Video, YouTube, Panopto)
   • Interaktiv quiz med bildeoptimalisering
   • Video progress tracking og "watched" status
   • Password-beskyttede seksjoner (SHA-256 hashing)
   • Responsive design (desktop hover, mobile click)
   
   VERSJONHISTORIKK:
   v11.15.3 - Fikset Python-emoji på mapper, lagt til .url/.webloc ikoner
   v11.15.2 - Fikset CSS/JS-blanding som ødela fil-ikoner
   v11.15.1 - Fikset URL-bygging for nested filer
   v11.15.0 - Nested flyouts support
   v11.11.0 - Stable base version
   
==================================================================== */

/************************************************************************
 * 1) DYNAMISK CSS INJEKSJON
 * 
 * Injiserer all nødvendig styling for sidebar, flyouts, viewers og ikoner.
 * Bruker CSS custom properties (variables) for enkel theming.
 ************************************************************************/
(function injectCSS() {
  const styleId = 'folknettside-css-v11153';
  
  // Unngå duplikat injeksjon
  if (document.getElementById(styleId)) return;

  const cssContent = `
    /* ============================================================
       ROOT VARIABLES - Endre disse for å tilpasse layout
       ============================================================ */
    :root{ 
      --nav-h: 48px;                    /* Navbar høyde */
      --side-w: 198px;                  /* Sidebar bredde */
      --gap: 28px;                      /* Gap mellom sidebar og innhold */
      --pad-left: calc(var(--side-w) + var(--gap)); /* Total venstre padding */
      --safe-area-bottom: env(safe-area-inset-bottom, 0px); /* iOS notch support */
    }
    
    /* ============================================================
       GLOBAL RESET & BODY LAYOUT
       ============================================================ */
    html, body { 
      margin: 0;
      padding: 0;
      height: 100%;
      font-family: sans-serif;
      background: #555;
      overflow-y: scroll;      /* Alltid vis scrollbar for å unngå layout shift */
      overflow-x: hidden;
    }
    
    body {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    /* ============================================================
       SIDEBAR - Fixed venstre navigasjon
       ============================================================ */
    .sidebar { 
      position: fixed;
      top: var(--nav-h);
      left: 0;
      width: var(--side-w);
      height: calc(100vh - var(--nav-h));
      background: var(--sidebar-bg, #004f9f);
      color: var(--sidebar-text, #fff);
      overflow-y: auto;                   /* Scrollbar når innhold overflyter */
      -webkit-overflow-scrolling: touch;  /* Smooth momentum scroll på iOS */
      -ms-overflow-style: -ms-autohiding-scrollbar;
      overscroll-behavior: auto;
      z-index: 1000;
      
      /* Ekstra bottom padding så siste elementer ikke skjules av footers/badges */
      padding-bottom: calc(3.5rem + var(--safe-area-bottom));
      scroll-padding-bottom: calc(3.5rem + var(--safe-area-bottom));
    }
    
    /* Sidebar heading */
    .sidebar h3 {
      margin: 0 0 0.25rem 0.75rem;
      font-size: 1.75rem;
    }
    
    /* ============================================================
       DROPDOWN ØVING BUTTONS
       ============================================================ */
    .dropdown-oving {
      position: relative;
      width: 100%;
    }
    
    .dropdown-btn { 
      width: 100%;
      padding: 0.6rem 1rem 0.6rem 1.25rem;
      background: none;
      border: none;
      color: var(--sidebar-text, #fff);
      font-weight: 600;
      text-align: left;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    
    .dropdown-btn:hover {
      background: var(--sidebar-hover, rgba(255,255,255,0.14));
    }
    
    /* Active state når en fil er åpen */
    .dropdown-oving.active > .dropdown-btn {
      background: var(--sidebar-active, #2e5e96);
    }
    
    /* ============================================================
       DESKTOP FLYOUT MENUS (min-width: 769px)
       Flyouts vises til høyre for sidebar ved hover/click
       ============================================================ */
    @media(min-width: 769px) {
      /* Main dropdown flyout */
      .sidebar .dropdown-content { 
        position: fixed;
        left: var(--side-w);
        top: calc(var(--nav-h) - 6px);
        width: 260px;
        display: none;                    /* Skjult by default */
        background: var(--sidebar-bg, #004f9f);
        color: var(--sidebar-text, #fff);
        box-shadow: 0 2px 8px rgba(0,0,0,.15);
        z-index: 1100;
        opacity: 1;
        transition: opacity 0.1s ease;
        max-height: calc(100vh - var(--nav-h) - 20px);
        overflow-y: auto;
        overflow-x: hidden;
        -webkit-overflow-scrolling: touch;
      }
      
      /* Custom scrollbar styling for flyouts */
      .sidebar .dropdown-content::-webkit-scrollbar {
        width: 8px;
      }
      
      .sidebar .dropdown-content::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
      }
      
      .sidebar .dropdown-content::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.3);
        border-radius: 4px;
      }
      
      .sidebar .dropdown-content::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.5);
      }
      
      /* File links inside flyouts - flexbox layout for icon + text */
      .sidebar .dropdown-content a,
      .nested-flyout a { 
        display: flex;
        align-items: center;
        padding: 0.5rem 1rem;
        color: var(--sidebar-text, #fff);
        text-decoration: none;
        transition: background 0.15s ease;
      }
      
      .sidebar .dropdown-content a:hover,
      .nested-flyout a:hover {
        background: var(--sidebar-hover, rgba(255,255,255,0.12));
      }
      
      /* ============================================================
         NESTED FLYOUTS - For undermapper
         Vises til høyre av parent flyout
         ============================================================ */
      .nested-flyout {
        position: fixed;                  /* Fixed positioning i forhold til viewport */
        width: 260px;
        display: none;
        background: var(--sidebar-bg, #004f9f);
        color: var(--sidebar-text, #fff);
        box-shadow: 0 2px 8px rgba(0,0,0,.15);
        z-index: 2000;                    /* Høyere enn main flyout */
        opacity: 0;                       /* Fade-in animation */
        transition: opacity 0.1s ease;
        max-height: calc(100vh - var(--nav-h) - 20px);
        overflow-y: auto;
        overflow-x: hidden;
        -webkit-overflow-scrolling: touch;
      }
      
      /* Nested flyout scrollbar styling */
      .nested-flyout::-webkit-scrollbar {
        width: 8px;
      }
      
      .nested-flyout::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
      }
      
      .nested-flyout::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.3);
        border-radius: 4px;
      }
      
      .nested-flyout::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.5);
      }
      
      /* Folder items som trigger nested flyouts */
      .nested-folder-item {
        position: relative;
        display: flex;
        align-items: center;
        padding: 0.5rem 1rem;
        cursor: pointer;
        transition: background 0.15s ease;
      }
      
      .nested-folder-item:hover {
        background: var(--sidebar-hover, rgba(255,255,255,0.12));
      }
      
      /* Right arrow indicator for nested folders */
      .nested-folder-item::after { 
        content: '▸';
        position: absolute;
        right: 8px;
        font-size: 1.1em;
      }
    }

    /* ============================================================
       CONTENT WRAPPER - Main innholdsområde
       ============================================================ */
    .wrapper { 
      margin-left: var(--pad-left) !important;
      width: calc(100% - var(--pad-left)) !important;
      padding-top: calc(var(--nav-h) - 12px);
      display: flex;
      flex: 1 1 auto;
      background: #fff;
      box-sizing: border-box;
      position: relative;
      z-index: 0;
    }
    
    .content { 
      flex: 1 1 auto;
      overflow: visible;
      padding: 0 1rem 0 var(--gap);
      box-sizing: border-box;
      position: relative;
      background: #fff;
    }
    
    /* Course title - clickable for reload */
    .content h1 {
      margin: 1rem 0 0.5rem 0;
      color: #004f9f;
      cursor: pointer;
    }
    
    .course-description {
      margin: 0 0 1rem 0;
      max-width: 42rem;
      line-height: 1.5;
    }

    /* ============================================================
       FILE VIEWERS - PDF, Code, Media containers
       ============================================================ */
    
    /* PDF/Code viewer container */
    #pdf-viewer-container {
      display: none;
      height: calc(100vh - var(--nav-h) - 3rem);
      overflow: auto;
    }
    
    /* Media viewer (video/youtube/panopto) container */
    #media-viewer-container {
      display: none;
      height: calc(100vh - var(--nav-h) - 3rem);
      overflow: auto;
    }
    
    #media-viewer {
      width: 100%;
      height: 100%;
      border: none;
      background: #000;
    }
    
    #pdf-viewer {
      width: 100%;
      height: 100%;
      border: none;
    }
    
    /* Resize handle for PDF viewer */
    #pdf-viewer-resize {
      display: none;
      height: 10px;
      cursor: ns-resize;
      background: repeating-linear-gradient(90deg, #e5e5e5 0 16px, #d4d4d4 16px 32px);
      border: 1px solid #cfcfcf;
      border-top: none;
      opacity: .8;
      user-select: none;
    }
    
    /* Quiz container */
    #quiz-container {
      margin-top: 0.75rem;
    }
    
    /* ============================================================
       FILE ICONS - SVG ikoner for forskjellige filtyper
       ============================================================ */
    .file-icon {
      display: inline-flex;
      width: 20px;
      height: 14px;
      margin-right: 10px;
      align-items: center;
      justify-content: center;
      vertical-align: middle;
      flex: 0 0 20px;                    /* Fixed size, ingen flex grow */
      overflow: hidden;
    }
    
    .file-icon svg {
      width: 100%;
      height: 100%;
      display: block;
    }
    
    /* File label med text truncation */
    .file-label {
      display: block;
      flex: 1;                           /* Tar opp resterende plass */
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    /* Ensure icons have proper spacing in all contexts */
    .dropdown-content a .file-icon,
    .nested-flyout a .file-icon,
    .nested-folder-item .file-icon {
      margin-right: 10px;
    }
    
    /* ============================================================
       WATCHED STATUS - Grønn checkmark for sette videoer
       ============================================================ */
    .file-label.watched::before {
      content: "✓ ";
      color: #8BC34A;                    /* Material Design Green */
      margin-right: 6px;
      font-weight: 700;
    }
    
    /* Watched indicator for folders (all files watched) */
    .nested-folder-item.watched > .file-label::after {
      content: " ✓";
      color: #8BC34A;
      margin-left: 6px;
    }
    
    /* ============================================================
       ERROR/WARNING MESSAGES
       ============================================================ */
    .msg { 
      background: #fdecec;
      color: #932323;
      border: 1px solid #f2bbbb;
      padding: .6rem .8rem;
      border-radius: 6px;
      max-width: 56rem;
      line-height: 1.4;
      font-size: .95rem;
      margin: .75rem 0;
    }
  `;
  
  const styleElement = document.createElement('style');
  styleElement.id = styleId;
  styleElement.textContent = cssContent;
  document.head.appendChild(styleElement);
})();

/************************************************************************
 * 2) UTILITY FUNCTIONS
 * 
 * Hjelpefunksjoner for passord-beskyttelse, URL-håndtering,
 * viewer setup, og video progress tracking.
 ************************************************************************/

/* ============================================================
   PASSWORD PROTECTION
   Bruker SHA-256 hash for client-side password verification.
   MERK: Dette er ikke sikker kryptering, kun obfuscation.
   ============================================================ */

// SHA-256 hash av passordet (generer med: python -c "import hashlib; print(hashlib.sha256(b'YourPassword').hexdigest())")
const BESKYTTET_HASH = '818728143377c056986a23cbcdb765add0aa174625da9c5afc34b8b9ef712500';

/**
 * Sjekker om bruker har godkjent passord denne sesjonen
 * @returns {boolean} True hvis passord er godkjent
 */
function isOk() { 
  return sessionStorage.getItem('beskyttet_ok') === '1'; 
}

/**
 * Beregner SHA-256 hash av en string
 * @param {string} str - String å hashe
 * @returns {Promise<string>} Hex-representasjon av hash
 */
async function sha256Hex(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(String(str));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Spør bruker om passord og verifiserer det
 * @returns {Promise<boolean>} True hvis riktig passord
 */
async function askPass() {
  if (isOk()) return true;
  
  const userPassword = prompt('Dette dokumentet er beskyttet. Skriv inn passord:');
  if (!userPassword) return false;
  
  try {
    const hash = await sha256Hex(userPassword);
    if (hash === BESKYTTET_HASH) {
      sessionStorage.setItem('beskyttet_ok', '1');
      return true;
    }
  } catch (e) {
    console.error('Password hashing failed:', e);
  }
  
  alert('Feil passord!');
  return false;
}

/* ============================================================
   URL & PATH UTILITIES
   ============================================================ */

/**
 * Henter kursets base directory (uten index.html)
 * @returns {string} Base path for kurset
 */
function getCourseDir() { 
  return location.pathname.replace(/\/index\.html?$/, '/'); 
}

function isMobileViewport() {
  return window.matchMedia('(max-width: 1024px)').matches;
}

/**
 * Encoder hvert segment av en path individuelt (for å håndtere special chars)
 * @param {string} relativePath - Relativ path å encode
 * @returns {string} Encoded path
 */
function encodePathSegments(relativePath) { 
  return relativePath.split('/').map(s => encodeURIComponent(s)).join('/'); 
}

/**
 * Konverterer relativ path til absolutt URL
 * @param {string} relativePath - Relativ path eller URL
 * @param {string} baseDir - Base directory
 * @returns {string} Absolutt URL
 */
function toAbsUrl(relativePath, baseDir) {
  const pathString = String(relativePath || '');
  
  // Allerede absolutt URL
  if (/^https?:\/\//i.test(pathString)) return pathString;
  
  // Absolutt path fra root
  if (pathString.startsWith('/')) {
    return new URL(pathString, location.origin).href;
  }
  
  // Relativ path - encode og kombiner med baseDir
  const encoded = encodePathSegments(pathString.replace(/\\/g, '/'));
  return new URL(encoded, location.origin + baseDir).href;
}

/* ============================================================
   VIEWER SETUP & RESIZE FUNCTIONALITY
   ============================================================ */

/**
 * Setter opp resize functionality for en viewer
 * @param {HTMLElement} resizeBar - Resize handle element
 * @param {HTMLElement} viewerBox - Viewer container å resize
 */
function setupResize(resizeBar, viewerBox) {
  let startY = 0;
  let startHeight = 0;
  let isDragging = false;
  
  // LocalStorage key for persistent height
  const storageKey = 'viewerH:' + getCourseDir();

  // Mouse/touch move handler
  const onMove = (e) => {
    if (!isDragging) return;
    
    const currentY = e.clientY || e.touches?.[0]?.clientY;
    const deltaY = currentY - startY;
    
    // Beregn ny høyde med min/max constraints
    let newHeight = Math.max(280, startHeight + deltaY);
    const maxHeight = Math.max(window.innerHeight * 2, 800);
    newHeight = Math.min(newHeight, maxHeight);
    
    viewerBox.style.height = newHeight + 'px';
  };
  
  // Mouse/touch up handler - lagre height til localStorage
  const onUp = () => {
    if (!isDragging) return;
    isDragging = false;
    
    // Cleanup event listeners
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onUp);
    
    // Lagre height til localStorage
    try {
      const finalHeight = Math.round(viewerBox.getBoundingClientRect().height);
      localStorage.setItem(storageKey, String(finalHeight));
    } catch (e) {
      console.warn('Could not save viewer height:', e);
    }
  };
  
  // Mouse/touch down handler - start dragging
  const onDown = (e) => {
    e.preventDefault();
    startY = e.clientY || e.touches?.[0]?.clientY;
    startHeight = viewerBox.getBoundingClientRect().height;
    isDragging = true;
    
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
  };
  
  resizeBar.addEventListener('mousedown', onDown);
  resizeBar.addEventListener('touchstart', onDown, { passive: false });
}

/**
 * Sikrer at PDF/code viewer og resize bar eksisterer
 * Gjenbruker eksisterende elements hvis de finnes
 * @returns {Object} { box: container element, frame: viewer element }
 */
function ensureViewer() {
  const contentArea = document.querySelector('.content');
  
  // Finn eller opprett viewer container
  let viewerBox = document.getElementById('pdf-viewer-container');
  if (!viewerBox) {
    viewerBox = document.createElement('div');
    viewerBox.id = 'pdf-viewer-container';
    
    // Opprett <object> element for PDF/code viewing
    const viewerFrame = document.createElement('object');
    viewerFrame.id = 'pdf-viewer';
    viewerFrame.type = 'application/pdf';
    
    viewerBox.appendChild(viewerFrame);
    contentArea.appendChild(viewerBox);
  }

  // Finn eller opprett resize bar
  let resizeBar = document.getElementById('pdf-viewer-resize');
  if (!resizeBar) {
    resizeBar = document.createElement('div');
    resizeBar.id = 'pdf-viewer-resize';
    contentArea.appendChild(resizeBar);
    setupResize(resizeBar, viewerBox);
  }
  
  // Last inn saved height fra localStorage
  try {
    const storageKey = 'viewerH:' + getCourseDir();
    const savedHeight = localStorage.getItem(storageKey);
    if (savedHeight && /^\d+$/.test(savedHeight)) {
      viewerBox.style.height = savedHeight + 'px';
    }
  } catch (e) {
    console.warn('Could not load saved viewer height:', e);
  }

  return { 
    box: viewerBox, 
    frame: viewerBox.firstElementChild 
  };
}

function replaceViewerFrame(tagName) {
  const viewerBox = document.getElementById('pdf-viewer-container');
  if (!viewerBox) return null;

  const currentFrame = viewerBox.firstElementChild;
  if (currentFrame && currentFrame.tagName.toLowerCase() === tagName) {
    return currentFrame;
  }

  const newFrame = document.createElement(tagName);
  newFrame.id = 'pdf-viewer';
  newFrame.style.width = '100%';
  newFrame.style.height = '100%';
  newFrame.style.border = 'none';

  if (tagName === 'iframe') {
    newFrame.setAttribute('loading', 'lazy');
    newFrame.setAttribute('allow', 'fullscreen');
    newFrame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  } else {
    newFrame.type = 'application/pdf';
  }

  if (currentFrame) {
    currentFrame.replaceWith(newFrame);
  } else {
    viewerBox.appendChild(newFrame);
  }

  return newFrame;
}

/**
 * Sikrer at media viewer (video/youtube/panopto) eksisterer
 * @returns {Object} { box: container element, holder: media holder div }
 */
function ensureMediaViewer() {
  const contentArea = document.querySelector('.content');
  
  let viewerBox = document.getElementById('media-viewer-container');
  if (!viewerBox) {
    viewerBox = document.createElement('div');
    viewerBox.id = 'media-viewer-container';
    
    const mediaHolder = document.createElement('div');
    mediaHolder.id = 'media-viewer';
    mediaHolder.style.width = '100%';
    mediaHolder.style.height = '100%';
    
    viewerBox.appendChild(mediaHolder);
    contentArea.appendChild(viewerBox);
  }
  
  return { 
    box: viewerBox, 
    holder: document.getElementById('media-viewer') 
  };
}

/* ============================================================
   VIDEO PROGRESS & WATCHED STATUS TRACKING
   Bruker localStorage for persistent tracking
   ============================================================ */

/**
 * Genererer localStorage key for video position
 * @param {string} videoUrl - URL til video
 * @returns {string} Storage key
 */
function _videoKey(videoUrl) { 
  try { 
    return 'videoPos:' + encodeURIComponent(String(videoUrl)); 
  } catch (e) { 
    return 'videoPos:' + String(videoUrl); 
  } 
}

/**
 * Genererer localStorage key for watched status
 * @param {string} videoUrl - URL til video
 * @returns {string} Storage key
 */
function _watchedKey(videoUrl) { 
  try { 
    return 'videoWatched:' + encodeURIComponent(String(videoUrl)); 
  } catch (e) { 
    return 'videoWatched:' + String(videoUrl); 
  } 
}

/**
 * Lagrer video position til localStorage
 * @param {string} videoUrl - URL til video
 * @param {number} seconds - Posisjon i sekunder
 */
function saveVideoPos(videoUrl, seconds) { 
  try { 
    localStorage.setItem(_videoKey(videoUrl), String(Math.floor(seconds || 0))); 
  } catch (e) {
    console.warn('Could not save video position:', e);
  }
}

/**
 * Laster video position fra localStorage
 * @param {string} videoUrl - URL til video
 * @returns {number} Posisjon i sekunder (0 hvis ikke funnet)
 */
function loadVideoPos(videoUrl) { 
  try { 
    const saved = localStorage.getItem(_videoKey(videoUrl)); 
    return saved ? parseInt(saved, 10) : 0; 
  } catch (e) { 
    return 0; 
  }
}

/**
 * Markerer en video som sett
 * @param {string} videoUrl - URL til video
 */
function markVideoWatched(videoUrl) { 
  try { 
    localStorage.setItem(_watchedKey(videoUrl), '1'); 
  } catch (e) {
    console.warn('Could not mark video as watched:', e);
  }
  refreshWatchedStatus(); 
}

/**
 * Sjekker om en video er markert som sett
 * @param {string} videoUrl - URL til video
 * @returns {boolean} True hvis sett
 */
function isVideoWatched(videoUrl) { 
  try { 
    return localStorage.getItem(_watchedKey(videoUrl)) === '1'; 
  } catch (e) { 
    return false; 
  }
}

/**
 * Oppdaterer alle watched indicators i UI
 * Legger til .watched class på sette videoer og mapper
 */
function refreshWatchedStatus() { 
  try { 
    // Oppdater alle video links
    document.querySelectorAll('#sidebar .dropdown-content a, .nested-flyout a').forEach(anchor => { 
      const href = anchor.getAttribute('href') || ''; 
      if (!href) return;
      
      try { 
        const url = new URL(href, location.origin); 
        const fullUrl = url.href;
        
        const label = anchor.querySelector('.file-label');
        if (!label) return;
        
        if (isVideoWatched(fullUrl)) {
          label.classList.add('watched');
        } else {
          label.classList.remove('watched');
        }
      } catch (e) { 
        // Ignorer invalid URLs
      }
    });
    
    // Oppdater folder status (alle filer i folder sett = folder sett)
    document.querySelectorAll('.nested-folder-item').forEach(folderItem => {
      const links = folderItem.querySelectorAll('.nested-flyout a');
      if (!links.length) return;
      
      let allWatched = true;
      links.forEach(link => { 
        const href = link.getAttribute('href') || '';
        try { 
          const url = new URL(href, location.origin);
          if (!isVideoWatched(url.href)) {
            allWatched = false;
          }
        } catch (e) { 
          allWatched = false;
        }
      });
      
      if (allWatched) {
        folderItem.classList.add('watched');
      } else {
        folderItem.classList.remove('watched');
      }
    });
  } catch (e) {
    console.error('Error refreshing watched status:', e);
  }
}

/* ============================================================
   YOUTUBE API LOADER
   Lazy-loader for YouTube IFrame API
   ============================================================ */

// Global state for YouTube API loading
const _ytApiState = { loaded: false, callbacks: [] };

/**
 * Sikrer at YouTube IFrame API er lastet
 * @param {Function} callback - Callback å kjøre når API er klar
 */
function ensureYouTubeAPI(callback) { 
  // Allerede lastet
  if (_ytApiState.loaded) {
    if (callback) callback();
    return;
  }
  
  // API allerede tilgjengelig
  if (window.YT && window.YT.Player) { 
    _ytApiState.loaded = true;
    if (callback) callback();
    return;
  }
  
  // Legg til callback i kø
  _ytApiState.callbacks.push(callback);
  
  // Last inn API script hvis ikke allerede lastet
  if (document.getElementById('yt-api')) return;
  
  const script = document.createElement('script');
  script.id = 'yt-api';
  script.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(script);
  
  // Global callback som YouTube API kaller
  window.onYouTubeIframeAPIReady = function() { 
    _ytApiState.loaded = true;
    _ytApiState.callbacks.forEach(fn => fn && fn());
    _ytApiState.callbacks = [];
  };
}

/* ============================================================
   UI HELPERS
   ============================================================ */

/**
 * Toggle visibility av welcome image og description
 * @param {boolean} visible - True for å vise, false for å skjule
 */
function toggleWelcome(visible) {
  const display = visible ? 'block' : 'none';
  document.querySelector('.course-description')?.style.setProperty('display', display);
  document.getElementById('welcome-img')?.style.setProperty('display', display);
}

/**
 * Konverterer YouTube URL til embed format
 * @param {string} url - Original YouTube URL
 * @returns {string|null} Embed URL eller null hvis ikke YouTube
 */
function toYouTubeEmbed(url) {
  try {
    const urlString = String(url || '').trim();
    
    // youtu.be/<id>
    let match = urlString.match(/youtu\.be\/([-_
