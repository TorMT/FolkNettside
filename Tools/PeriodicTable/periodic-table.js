(function() {
  'use strict';

  const DATA_URL = 'https://raw.githubusercontent.com/Bowserinator/Periodic-Table-JSON/master/PeriodicTableJSON.json';
  const STORAGE_KEY = 'periodic_table_preferences_v2';

  let elementsData = [];
  let filteredElements = [];
  let currentProperty = 'atomic_mass';
  let currentTemp = 298;
  let selectedElement = null;
  let activeFilters = {
    search: '',
    category: 'all',
    period: 'all',
    group: 'all',
    phase: 'all',
    crystal: 'all',
    quick: ''
  };

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
    'actinide': '#ffab91',
    unknown: '#cfd8dc'
  };

  const translations = {
    'alkali metal': 'Alkalimetall',
    'alkaline earth metal': 'Jordalkalimetall',
    'transition metal': 'Overgangsmetall',
    'post-transition metal': 'Post-overgangsmetall',
    metalloid: 'Halvmetall',
    nonmetal: 'Ikke-metall',
    halogen: 'Halogen',
    'noble gas': 'Edelgass',
    lanthanide: 'Lantanoid',
    actinide: 'Aktinoid',
    unknown: 'Ukjent'
  };

  const crystalTranslation = {
    bcc: 'BCC',
    fcc: 'FCC',
    hcp: 'HCP',
    cubic: 'Kubisk',
    tetragonal: 'Tetragonal',
    orthorhombic: 'Ortorombisk',
    monoclinic: 'Monoklin',
    triclinic: 'Triklin',
    rhombohedral: 'Rombohedral',
    hexagonal: 'Heksagonal',
    molecular: 'Molekylær',
    amorphous: 'Amorf',
    chain: 'Kjede',
    unknown: 'Ukjent'
  };

  const crystalStructures = {
    Li: 'bcc', Na: 'bcc', K: 'bcc', Rb: 'bcc', Cs: 'bcc', Fr: 'bcc',
    Be: 'hcp', Mg: 'hcp', Ca: 'fcc', Sr: 'fcc', Ba: 'bcc', Ra: 'bcc',
    Sc: 'hcp', Ti: 'hcp', V: 'bcc', Cr: 'bcc', Mn: 'bcc', Fe: 'bcc', Co: 'hcp', Ni: 'fcc',
    Cu: 'fcc', Zn: 'hcp', Y: 'hcp', Zr: 'hcp', Nb: 'bcc', Mo: 'bcc', Tc: 'hcp', Ru: 'hcp',
    Rh: 'fcc', Pd: 'fcc', Ag: 'fcc', Cd: 'hcp', Hf: 'hcp', Ta: 'bcc', W: 'bcc', Re: 'hcp',
    Os: 'hcp', Ir: 'fcc', Pt: 'fcc', Au: 'fcc', Hg: 'rhombohedral', Rf: 'hcp',
    Al: 'fcc', Ga: 'orthorhombic', In: 'tetragonal', Sn: 'tetragonal', Tl: 'hcp', Pb: 'fcc',
    Si: 'cubic', Ge: 'cubic', C: 'hexagonal', B: 'rhombohedral', P: 'molecular', S: 'orthorhombic',
    Se: 'hexagonal', Te: 'hexagonal', As: 'rhombohedral', Sb: 'rhombohedral', Bi: 'rhombohedral',
    H: 'molecular', N: 'molecular', O: 'molecular', F: 'molecular', Cl: 'orthorhombic', Br: 'orthorhombic', I: 'orthorhombic',
    He: 'hcp', Ne: 'fcc', Ar: 'fcc', Kr: 'fcc', Xe: 'fcc', Rn: 'fcc'
  };

  const propertyLabels = {
    atomic_mass: { label: 'Atommasse', unit: 'u', source: 'atomic_mass', format: (v) => Number(v).toFixed(3) },
    density: { label: 'Tetthet', unit: 'g/cm³', source: 'density', format: (v) => Number(v).toFixed(3) },
    melt: { label: 'Smeltepunkt', unit: 'K', source: 'melt', format: (v) => Number(v).toFixed(1) },
    boil: { label: 'Kokepunkt', unit: 'K', source: 'boil', format: (v) => Number(v).toFixed(1) },
    electronegativity_pauling: { label: 'Elektronegativitet', unit: 'Pauling', source: 'electronegativity_pauling', format: (v) => Number(v).toFixed(2) },
    atomic_radius: { label: 'Atomradius', unit: 'pm', source: 'atomic_radius', format: (v) => Number(v).toFixed(0) },
    first_ionization: {
      label: '1. ioniseringsenergi',
      unit: 'eV',
      source: (el) => el.ionization_energies?.[0],
      format: (v) => Number(v).toFixed(2)
    },
    electron_affinity: { label: 'Elektronaffinitet', unit: 'eV', source: 'electron_affinity', format: (v) => Number(v).toFixed(2) },
    abundance: {
      label: 'Mengde i jordskorpe',
      unit: 'mg/kg',
      source: 'abundance',
      format: (v) => Number(v).toFixed(1)
    }
  };

  async function init() {
    try {
      loadPreferences();
      const response = await fetch(DATA_URL);
      const data = await response.json();

      elementsData = data.elements.map((el) => enrichElement(el));
      filteredElements = [...elementsData];

      hydrateFilterDropdowns();
      renderPeriodicTable();
      renderLegend();
      syncUiFromState();
      setupEventListeners();
      applyFilters();
      restoreElementFromHash();
    } catch (error) {
      console.error('Failed to load element data:', error);
      document.getElementById('tableContent').innerHTML =
        '<div style="color: var(--danger); padding: 40px; text-align: center;">⚠️ Kunne ikke laste element-data. Sjekk internettforbindelse.</div>';
    }
  }

  function enrichElement(element) {
    const structure = crystalStructures[element.symbol] || inferCrystalStructure(element);
    const block = inferBlock(element);
    const materialTag = inferMaterialTag(element);
    return {
      ...element,
      crystal_structure: structure,
      block,
      material_tag: materialTag,
      searchable_text: [
        element.name,
        element.symbol,
        element.number,
        element.category,
        element.summary,
        element.discovered_by,
        element.electron_configuration,
        structure,
        crystalTranslation[structure],
        materialTag,
        block
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
    };
  }

  function inferBlock(element) {
    const group = element.group;
    if (!group) return 'f';
    if (group <= 2) return 's';
    if (group >= 13) return 'p';
    return 'd';
  }

  function inferMaterialTag(element) {
    const category = (element.category || '').toLowerCase();
    if (category.includes('metal')) return 'metall';
    if (category.includes('metalloid')) return 'halvmetall';
    return 'ikke-metall';
  }

  function inferCrystalStructure(element) {
    const phase = (element.phase || '').toLowerCase();
    const category = (element.category || '').toLowerCase();

    if (phase === 'gas') return 'molecular';
    if (category.includes('noble gas')) return 'fcc';
    if (category.includes('alkali')) return 'bcc';
    if (category.includes('alkaline earth')) return 'hcp';
    return 'unknown';
  }

  function hydrateFilterDropdowns() {
    const categories = [...new Set(elementsData.map((el) => (el.category || 'unknown').toLowerCase()))].sort();
    const categorySelect = document.getElementById('categoryFilter');

    categorySelect.innerHTML = '<option value="all">Alle kategorier</option>';
    categories.forEach((category) => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = translations[category] || category;
      categorySelect.appendChild(option);
    });
  }

  function applyFilters() {
    filteredElements = elementsData.filter((element) => {
      const category = (element.category || 'unknown').toLowerCase();
      const phase = (element.phase || 'unknown').toLowerCase();
      const crystal = element.crystal_structure || 'unknown';
      const period = String(element.period || '');
      const group = String(element.group || '');

      const matchesSearch = !activeFilters.search || element.searchable_text.includes(activeFilters.search);
      const matchesCategory = activeFilters.category === 'all' || activeFilters.category === category;
      const matchesPeriod = activeFilters.period === 'all' || activeFilters.period === period;
      const matchesGroup = activeFilters.group === 'all' || activeFilters.group === group;
      const matchesPhase = activeFilters.phase === 'all' || activeFilters.phase === phase;
      const matchesCrystal = activeFilters.crystal === 'all' || activeFilters.crystal === crystal;
      const matchesQuick = matchesQuickFilter(element, activeFilters.quick);

      return matchesSearch && matchesCategory && matchesPeriod && matchesGroup && matchesPhase && matchesCrystal && matchesQuick;
    });

    persistPreferences();
    renderPeriodicTable();
    updateFilterCount();
    syncQuickButtons();
  }

  function matchesQuickFilter(element, quickFilter) {
    if (!quickFilter) return true;
    if (quickFilter === 'metall') return element.material_tag === 'metall';
    if (quickFilter === 'ikke-metall') return element.material_tag === 'ikke-metall';
    if (quickFilter === 'stp-gass') return (element.phase || '').toLowerCase() === 'gas';
    if (quickFilter === 'struktur-bcc') return element.crystal_structure === 'bcc';
    if (quickFilter === 'struktur-fcc') return element.crystal_structure === 'fcc';
    if (quickFilter === 'radioaktiv') return element.number >= 84;
    return true;
  }

  function updateFilterCount() {
    const count = document.getElementById('filterCount');
    count.textContent = `${filteredElements.length} / ${elementsData.length} elementer`;
  }

  function renderPeriodicTable() {
    const container = document.getElementById('tableContent');
    container.className = '';
    container.innerHTML = '';

    const visibleNumbers = new Set(filteredElements.map((el) => el.number));

    const table = document.createElement('div');
    table.className = 'periodicTable';

    for (let period = 1; period <= 7; period++) {
      for (let group = 1; group <= 18; group++) {
        const element = findElement(period, group);

        if (element) {
          table.appendChild(createElementCell(element, visibleNumbers.has(element.number)));
        } else if (period === 6 && group === 3) {
          const spacer = document.createElement('div');
          spacer.className = 'spacer';
          spacer.textContent = '57-71';
          table.appendChild(spacer);
        } else if (period === 7 && group === 3) {
          const spacer = document.createElement('div');
          spacer.className = 'spacer';
          spacer.textContent = '89-103';
          table.appendChild(spacer);
        } else {
          const empty = document.createElement('div');
          empty.className = 'empty';
          table.appendChild(empty);
        }
      }
    }

    container.appendChild(table);

    const separateRows = document.createElement('div');
    separateRows.className = 'separateRows';

    for (let z = 57; z <= 71; z++) {
      const element = elementsData.find((el) => el.number === z);
      if (element) separateRows.appendChild(createElementCell(element, visibleNumbers.has(element.number)));
    }

    for (let z = 89; z <= 103; z++) {
      const element = elementsData.find((el) => el.number === z);
      if (element) separateRows.appendChild(createElementCell(element, visibleNumbers.has(element.number)));
    }

    container.appendChild(separateRows);

    if (selectedElement) {
      const same = elementsData.find((el) => el.number === selectedElement.number);
      if (same) showElementInfo(same);
    }
  }

  function findElement(period, group) {
    return elementsData.find((el) => {
      if ((el.number >= 57 && el.number <= 71) || (el.number >= 89 && el.number <= 103)) return false;
      if (el.period !== period) return false;
      if (el.group === group) return true;
      if (group === 3 && (el.number === 21 || el.number === 39)) return true;
      return false;
    });
  }

  function createElementCell(element, isVisible) {
    const cell = document.createElement('div');
    cell.className = 'element';
    if (!isVisible) cell.classList.add('filteredOut');
    cell.dataset.number = element.number;

    const category = (element.category || 'unknown').toLowerCase();
    const color = categoryColors[category] || categoryColors.unknown;
    cell.style.background = `linear-gradient(135deg, ${color}20, ${color}50)`;
    cell.style.borderColor = color;

    const number = document.createElement('div');
    number.className = 'number';
    number.textContent = element.number;
    cell.appendChild(number);

    const symbol = document.createElement('div');
    symbol.className = 'symbol';
    symbol.textContent = element.symbol;
    cell.appendChild(symbol);

    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = element.name;
    cell.appendChild(name);

    const propValue = getPropertyValue(element, currentProperty);
    const prop = document.createElement('div');
    prop.className = 'property';
    prop.textContent = propValue;
    cell.appendChild(prop);

    const crystalBadge = document.createElement('div');
    crystalBadge.className = 'crystalBadge';
    crystalBadge.textContent = crystalTranslation[element.crystal_structure] || 'Ukjent';
    cell.appendChild(crystalBadge);

    const state = getStateAtTemp(element, currentTemp);
    const indicator = document.createElement('div');
    indicator.className = `stateIndicator state-${state}`;
    indicator.title = `Fase ved ${currentTemp} K: ${state}`;
    cell.appendChild(indicator);

    cell.addEventListener('click', () => showElementInfo(element));

    return cell;
  }

  function getPropertyValue(element, property) {
    const config = propertyLabels[property];
    if (!config) return '—';

    const raw = typeof config.source === 'function' ? config.source(element) : element[config.source];
    if (raw === null || raw === undefined || Number.isNaN(Number(raw))) return '—';

    return config.format(raw);
  }

  function getStateAtTemp(element, temp) {
    const mp = element.melt;
    const bp = element.boil;

    if (mp === null || mp === undefined) return 'unknown';
    if (bp === null || bp === undefined) return temp < mp ? 'solid' : 'unknown';

    if (temp < mp) return 'solid';
    if (temp >= mp && temp < bp) return 'liquid';
    if (temp >= bp) return 'gas';
    return 'unknown';
  }

  function renderLegend() {
    const legend = document.getElementById('legend');
    legend.innerHTML = '';

    Object.keys(categoryColors).forEach((category) => {
      if (category === 'unknown') return;
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

  function showElementInfo(element) {
    selectedElement = element;

    document.querySelectorAll('.element').forEach((el) => {
      el.classList.remove('selected');
      if (Number(el.dataset.number) === element.number) el.classList.add('selected');
    });

    document.getElementById('infoSymbol').textContent = element.symbol;
    document.getElementById('infoName').textContent = element.name;

    const category = translations[(element.category || 'unknown').toLowerCase()] || element.category || 'Ukjent';
    document.getElementById('infoMeta').textContent = `Atomnummer ${element.number} • ${category} • Periode ${element.period} • Gruppe ${element.group || '—'} • Blokk ${element.block.toUpperCase()}`;
    window.location.hash = `el=${element.number}`;
    const wiki = document.getElementById('infoWiki');
    const summary = document.getElementById('infoSummary');
    if (element.source) {
      wiki.style.display = 'inline-flex';
      wiki.href = element.source;
    } else {
      wiki.style.display = 'none';
      wiki.href = '#';
    }
    summary.textContent = element.summary || 'Ingen beskrivelse tilgjengelig.';

    const grid = document.getElementById('infoGrid');
    grid.innerHTML = '';

    const props = [
      ['Atommasse', element.atomic_mass, 'u'],
      ['Tetthet', element.density, 'g/cm³'],
      ['Smeltepunkt', element.melt, 'K'],
      ['Kokepunkt', element.boil, 'K'],
      ['Elektronegativitet', element.electronegativity_pauling, 'Pauling'],
      ['1. Ioniseringsenergi', element.ionization_energies?.[0], 'eV'],
      ['Elektronaffinitet', element.electron_affinity, 'eV'],
      ['Krystallstruktur', crystalTranslation[element.crystal_structure] || 'Ukjent', ''],
      ['Materialklasse', element.material_tag, ''],
      ['Periode', element.period, ''],
      ['Gruppe', element.group, ''],
      ['Elektronskall', element.shells ? element.shells.join(', ') : null, ''],
      ['Elektronkonfigurasjon', element.electron_configuration, ''],
      ['Oksidasjonstilstander', element.oxidation_states, ''],
      ['Fase (STP)', element.phase, ''],
      ['Oppdaget av', element.discovered_by, ''],
      ['Oppdaget år', element.year_discovered, '']
    ];

    props.forEach(([labelText, rawValue, unit]) => {
      if (rawValue === null || rawValue === undefined || rawValue === '') return;
      const propEl = document.createElement('div');
      propEl.className = 'infoProp';

      const label = document.createElement('div');
      label.className = 'label';
      label.textContent = labelText;

      const value = document.createElement('div');
      value.className = 'value';
      if (typeof rawValue === 'number') {
        value.textContent = `${rawValue.toFixed(rawValue < 10 ? 3 : 2)}${unit ? ` ${unit}` : ''}`;
      } else {
        value.textContent = `${rawValue}${unit ? ` ${unit}` : ''}`;
      }

      propEl.appendChild(label);
      propEl.appendChild(value);
      grid.appendChild(propEl);
    });

  }

  function setupEventListeners() {
    document.querySelectorAll('.propertyTab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.propertyTab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        currentProperty = tab.dataset.property;
        persistPreferences();
        renderPeriodicTable();
      });
    });

    const tempSlider = document.getElementById('tempSlider');
    const tempValue = document.getElementById('tempValue');

    tempSlider.addEventListener('input', (e) => {
      currentTemp = Number(e.target.value);
      tempValue.textContent = `${currentTemp} K`;
      persistPreferences();
      renderPeriodicTable();
    });

    document.getElementById('searchInput').addEventListener('input', (e) => {
      activeFilters.search = e.target.value.trim().toLowerCase();
      applyFilters();
    });

    document.getElementById('categoryFilter').addEventListener('change', (e) => {
      activeFilters.category = e.target.value;
      applyFilters();
    });

    document.getElementById('periodFilter').addEventListener('change', (e) => {
      activeFilters.period = e.target.value;
      applyFilters();
    });

    document.getElementById('groupFilter').addEventListener('change', (e) => {
      activeFilters.group = e.target.value;
      applyFilters();
    });

    document.getElementById('phaseFilter').addEventListener('change', (e) => {
      activeFilters.phase = e.target.value;
      applyFilters();
    });

    document.getElementById('crystalFilter').addEventListener('change', (e) => {
      activeFilters.crystal = e.target.value;
      applyFilters();
    });

    document.querySelectorAll('.quickBtn').forEach((button) => {
      button.addEventListener('click', () => {
        const key = button.dataset.quick;
        activeFilters.quick = activeFilters.quick === key ? '' : key;
        applyFilters();
      });
    });

    document.getElementById('resetFilters').addEventListener('click', () => {
      activeFilters = { search: '', category: 'all', period: 'all', group: 'all', phase: 'all', crystal: 'all' };
      document.getElementById('searchInput').value = '';
      document.getElementById('categoryFilter').value = 'all';
      document.getElementById('periodFilter').value = 'all';
      document.getElementById('groupFilter').value = 'all';
      document.getElementById('phaseFilter').value = 'all';
      document.getElementById('crystalFilter').value = 'all';
      activeFilters.quick = '';
      applyFilters();
    });

    document.getElementById('clearSelection').addEventListener('click', () => {
      document.querySelectorAll('.element').forEach((el) => el.classList.remove('selected'));
      selectedElement = null;
      document.getElementById('infoSymbol').textContent = '—';
      document.getElementById('infoName').textContent = 'Velg et element';
      document.getElementById('infoMeta').textContent = 'Klikk i tabellen for detaljer.';
      document.getElementById('infoSummary').textContent = 'Ingen element valgt.';
      document.getElementById('infoWiki').style.display = 'none';
      document.getElementById('infoWiki').href = '#';
      document.getElementById('infoGrid').innerHTML = '<div class="placeholder">Ingen element valgt.</div>';
      history.replaceState(null, '', window.location.pathname + window.location.search);
      persistPreferences();
    });
  }

  function syncQuickButtons() {
    document.querySelectorAll('.quickBtn').forEach((button) => {
      button.classList.toggle('active', button.dataset.quick === activeFilters.quick);
    });
  }

  function syncUiFromState() {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const phaseFilter = document.getElementById('phaseFilter');
    const crystalFilter = document.getElementById('crystalFilter');
    const periodFilter = document.getElementById('periodFilter');
    const groupFilter = document.getElementById('groupFilter');
    const tempSlider = document.getElementById('tempSlider');
    const tempValue = document.getElementById('tempValue');

    if (searchInput) searchInput.value = activeFilters.search;
    if (categoryFilter) categoryFilter.value = activeFilters.category;
    if (periodFilter) periodFilter.value = activeFilters.period;
    if (groupFilter) groupFilter.value = activeFilters.group;
    if (phaseFilter) phaseFilter.value = activeFilters.phase;
    if (crystalFilter) crystalFilter.value = activeFilters.crystal;
    if (tempSlider) tempSlider.value = String(currentTemp);
    if (tempValue) tempValue.textContent = `${currentTemp} K`;

    document.querySelectorAll('.propertyTab').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.property === currentProperty);
    });
    syncQuickButtons();
  }

  function persistPreferences() {
    try {
      const payload = {
        currentProperty,
        currentTemp,
        activeFilters,
        selectedElementNumber: selectedElement?.number ?? null
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn('Could not persist preferences:', error);
    }
  }

  function loadPreferences() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.currentProperty && propertyLabels[parsed.currentProperty]) currentProperty = parsed.currentProperty;
      if (Number.isFinite(parsed.currentTemp)) currentTemp = Math.max(0, Math.min(5000, Number(parsed.currentTemp)));
      if (parsed.activeFilters) {
        activeFilters = {
          search: parsed.activeFilters.search || '',
          category: parsed.activeFilters.category || 'all',
          period: parsed.activeFilters.period || 'all',
          group: parsed.activeFilters.group || 'all',
          phase: parsed.activeFilters.phase || 'all',
          crystal: parsed.activeFilters.crystal || 'all',
          quick: parsed.activeFilters.quick || ''
        };
      }
    } catch (error) {
      console.warn('Could not load preferences:', error);
    }
  }

  function restoreElementFromHash() {
    const hash = window.location.hash || '';
    const match = hash.match(/el=(\d+)/);
    const saved = getSavedSelectedElement();
    const number = match ? Number(match[1]) : saved;
    if (!number) return;

    const found = elementsData.find((el) => el.number === number);
    if (found) {
      showElementInfo(found);
    }
  }

  function getSavedSelectedElement() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Number.isFinite(parsed.selectedElementNumber) ? parsed.selectedElementNumber : null;
    } catch (error) {
      return null;
    }
  }

  init();
})();
