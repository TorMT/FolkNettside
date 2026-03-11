(function() {
  'use strict';
  
  // Data URL - Periodic Table JSON from GitHub
  const DATA_URL = 'https://raw.githubusercontent.com/Bowserinator/Periodic-Table-JSON/master/PeriodicTableJSON.json';
  
  let elementsData = null;
  let currentProperty = 'atomic_mass';
  let currentTemp = 298; // Kelvin (room temperature)
  let selectedElement = null;
  
  // Category colors
  const categoryColors = {
    'alkali metal': '#ff6b6b',
    'alkaline earth metal': '#ffd93d',
    'transition metal': '#ffa07a',
    'post-transition metal': '#b0c4de',
    'metalloid': '#9370db',
    'nonmetal': '#98fb98',
    'halogen': '#ffeb3b',
    'noble gas': '#e1bee7',
    'lanthanide': '#ffccbc',
    'actinide': '#ffab91'
  };
  
  // Norwegian translations
  const translations = {
    'alkali metal': 'Alkalimetall',
    'alkaline earth metal': 'Jordalkalimetall',
    'transition metal': 'Overgangsmetall',
    'post-transition metal': 'Post-overgangsmetall',
    'metalloid': 'Halvmetall',
    'nonmetal': 'Ikke-metall',
    'halogen': 'Halogen',
    'noble gas': 'Edelgass',
    'lanthanide': 'Lantanoid',
    'actinide': 'Aktinoid'
  };
  
  // Property labels
  const propertyLabels = {
    'atomic_mass': { label: 'Atomvekt', unit: 'u', format: (v) => v?.toFixed(3) },
    'density': { label: 'Tetthet', unit: 'g/cm³', format: (v) => v?.toFixed(3) },
    'melting_point': { label: 'Smeltepunkt', unit: 'K', format: (v) => v?.toFixed(1) },
    'boiling_point': { label: 'Kokepunkt', unit: 'K', format: (v) => v?.toFixed(1) },
    'electronegativity': { label: 'Elektronegativitet', unit: 'Pauling', format: (v) => v?.toFixed(2) },
    'atomic_radius': { label: 'Atomradius', unit: 'pm', format: (v) => v?.toFixed(0) },
    'ionization_energy': { label: 'Ioniseringsenergi', unit: 'kJ/mol', format: (v) => v?.toFixed(1) },
    'electron_affinity': { label: 'Elektronaffinitet', unit: 'kJ/mol', format: (v) => v?.toFixed(1) }
  };
  
  // Initialize
  async function init() {
    try {
      const response = await fetch(DATA_URL);
      const data = await response.json();
      elementsData = data.elements;
      
      renderPeriodicTable();
      renderLegend();
      setupEventListeners();
      
    } catch (error) {
      console.error('Failed to load element data:', error);
      document.getElementById('tableContent').innerHTML = 
        '<div style="color: var(--danger); padding: 40px; text-align: center;">' +
        '⚠️ Kunne ikke laste element-data. Sjekk internettforbindelse.' +
        '</div>';
    }
  }
  
  // Render periodic table
  function renderPeriodicTable() {
    const container = document.getElementById('tableContent');
    container.className = '';
    container.innerHTML = '';
    
    // Create main table grid
    const table = document.createElement('div');
    table.className = 'periodicTable';
    
    // Create 18x7 grid (periods 1-7)
    for (let period = 1; period <= 7; period++) {
      for (let group = 1; group <= 18; group++) {
        const element = findElement(period, group);
        
        if (element) {
          table.appendChild(createElementCell(element));
        } else if (period === 6 && group === 3) {
          // Lanthanides spacer
          const spacer = document.createElement('div');
          spacer.className = 'spacer';
          spacer.textContent = '57-71';
          table.appendChild(spacer);
        } else if (period === 7 && group === 3) {
          // Actinides spacer
          const spacer = document.createElement('div');
          spacer.className = 'spacer';
          spacer.textContent = '89-103';
          table.appendChild(spacer);
        } else {
          // Empty cell
          const empty = document.createElement('div');
          empty.className = 'empty';
          table.appendChild(empty);
        }
      }
    }
    
    container.appendChild(table);
    
    // Add lanthanides and actinides rows
    const separateRows = document.createElement('div');
    separateRows.className = 'separateRows';
    
    // Lanthanides (57-71)
    for (let z = 57; z <= 71; z++) {
      const element = elementsData.find(el => el.number === z);
      if (element) {
        separateRows.appendChild(createElementCell(element));
      }
    }
    
    // Actinides (89-103)
    for (let z = 89; z <= 103; z++) {
      const element = elementsData.find(el => el.number === z);
      if (element) {
        separateRows.appendChild(createElementCell(element));
      }
    }
    
    container.appendChild(separateRows);
  }
  
  // Find element by period and group
  function findElement(period, group) {
    return elementsData.find(el => {
      // Skip lanthanides and actinides from main table
      if ((el.number >= 57 && el.number <= 71) || (el.number >= 89 && el.number <= 103)) {
        return false;
      }
      
      // Match period
      if (el.period !== period) return false;
      
      // Match group (handle special cases)
      if (el.group === group) return true;
      
      // Handle group 3 (Sc, Y should be in group 3)
      if (group === 3 && (el.number === 21 || el.number === 39)) return true;
      
      return false;
    });
  }
  
  // Create element cell
  function createElementCell(element) {
    const cell = document.createElement('div');
    cell.className = 'element';
    cell.dataset.number = element.number;
    
    // Apply category color
    const category = element.category?.toLowerCase() || 'unknown';
    const color = categoryColors[category] || '#cccccc';
    cell.style.background = `linear-gradient(135deg, ${color}22, ${color}44)`;
    cell.style.borderColor = color;
    
    // Atomic number
    const number = document.createElement('div');
    number.className = 'number';
    number.textContent = element.number;
    cell.appendChild(number);
    
    // Symbol
    const symbol = document.createElement('div');
    symbol.className = 'symbol';
    symbol.textContent = element.symbol;
    cell.appendChild(symbol);
    
    // Name
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = element.name;
    cell.appendChild(name);
    
    // Property value
    const propValue = getPropertyValue(element, currentProperty);
    if (propValue !== null && propValue !== undefined) {
      const prop = document.createElement('div');
      prop.className = 'property';
      prop.textContent = propValue;
      cell.appendChild(prop);
    }
    
    // State indicator (at current temperature)
    const state = getStateAtTemp(element, currentTemp);
    const indicator = document.createElement('div');
    indicator.className = `stateIndicator state-${state}`;
    cell.appendChild(indicator);
    
    // Click handler
    cell.addEventListener('click', () => showElementInfo(element));
    
    return cell;
  }
  
  // Get property value formatted
  function getPropertyValue(element, property) {
    const value = element[property];
    if (value === null || value === undefined) return '—';
    
    const config = propertyLabels[property];
    if (!config) return value;
    
    const formatted = config.format(value);
    return formatted || '—';
  }
  
  // Get state at temperature
  function getStateAtTemp(element, temp) {
    const mp = element.melt;
    const bp = element.boil;
    
    if (mp === null || mp === undefined) return 'unknown';
    if (bp === null || bp === undefined) {
      return temp < mp ? 'solid' : 'unknown';
    }
    
    if (temp < mp) return 'solid';
    if (temp >= mp && temp < bp) return 'liquid';
    if (temp >= bp) return 'gas';
    
    return 'unknown';
  }
  
  // Render legend
  function renderLegend() {
    const legend = document.getElementById('legend');
    legend.innerHTML = '';
    
    Object.keys(categoryColors).forEach(category => {
      const item = document.createElement('div');
      item.className = 'legendItem';
      
      const colorBox = document.createElement('div');
      colorBox.className = 'legendColor';
      colorBox.style.background = categoryColors[category];
      
      const label = document.createElement('span');
      label.textContent = translations[category] || category;
      
      item.appendChild(colorBox);
      item.appendChild(label);
      legend.appendChild(item);
    });
  }
  
  // Show element info panel
  function showElementInfo(element) {
    selectedElement = element;
    
    // Update selected state
    document.querySelectorAll('.element').forEach(el => {
      el.classList.remove('selected');
      if (el.dataset.number == element.number) {
        el.classList.add('selected');
      }
    });
    
    // Update info panel
    document.getElementById('infoSymbol').textContent = element.symbol;
    document.getElementById('infoName').textContent = element.name;
    
    const category = translations[element.category?.toLowerCase()] || element.category || 'Ukjent';
    document.getElementById('infoMeta').textContent = 
      `Atomnummer ${element.number} • ${category}`;
    
    // Build properties grid
    const grid = document.getElementById('infoGrid');
    grid.innerHTML = '';
    
    const props = [
      { key: 'atomic_mass', label: 'Atomvekt', value: element.atomic_mass, unit: 'u' },
      { key: 'density', label: 'Tetthet', value: element.density, unit: 'g/cm³' },
      { key: 'melt', label: 'Smeltepunkt', value: element.melt, unit: 'K' },
      { key: 'boil', label: 'Kokepunkt', value: element.boil, unit: 'K' },
      { key: 'electronegativity_pauling', label: 'Elektronegativitet', value: element.electronegativity_pauling, unit: '' },
      { key: 'atomic_radius', label: 'Atomradius', value: element.atomic_radius, unit: 'pm' },
      { key: 'ionization_energies', label: '1. Ioniseringsenergi', value: element.ionization_energies?.[0], unit: 'eV' },
      { key: 'electron_affinity', label: 'Elektronaffinitet', value: element.electron_affinity, unit: 'eV' },
      { key: 'electron_configuration', label: 'Elektronkonfigurasjon', value: element.electron_configuration, unit: '' },
      { key: 'discovered_by', label: 'Oppdaget av', value: element.discovered_by, unit: '' },
      { key: 'year_discovered', label: 'Oppdaget år', value: element.year_discovered, unit: '' },
      { key: 'phase', label: 'Fase (STP)', value: element.phase, unit: '' }
    ];
    
    props.forEach(prop => {
      if (prop.value !== null && prop.value !== undefined && prop.value !== '') {
        const propEl = document.createElement('div');
        propEl.className = 'infoProp';
        
        const label = document.createElement('div');
        label.className = 'label';
        label.textContent = prop.label;
        
        const value = document.createElement('div');
        value.className = 'value';
        
        if (typeof prop.value === 'number') {
          value.textContent = prop.value.toFixed(prop.value < 10 ? 3 : 1) + (prop.unit ? ' ' + prop.unit : '');
        } else {
          value.textContent = prop.value;
        }
        
        propEl.appendChild(label);
        propEl.appendChild(value);
        grid.appendChild(propEl);
      }
    });
    
    // Show panel
    document.getElementById('infoPanel').classList.add('show');
    document.getElementById('infoPanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  
  // Setup event listeners
  function setupEventListeners() {
    // Property tabs
    document.querySelectorAll('.propertyTab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.propertyTab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        currentProperty = tab.dataset.property;
        renderPeriodicTable();
      });
    });
    
    // Temperature slider
    const tempSlider = document.getElementById('tempSlider');
    const tempValue = document.getElementById('tempValue');
    
    tempSlider.addEventListener('input', (e) => {
      currentTemp = parseInt(e.target.value);
      tempValue.textContent = `${currentTemp} K`;
      renderPeriodicTable();
    });
    
    // Close info panel
    document.getElementById('closeInfo').addEventListener('click', () => {
      document.getElementById('infoPanel').classList.remove('show');
      document.querySelectorAll('.element').forEach(el => el.classList.remove('selected'));
    });
  }
  
  // Start
  init();
})();