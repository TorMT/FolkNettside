(function (global) {
  'use strict';

  const STYLE_LIBRARY = [
    {
      id: 'hard_ginger_beer',
      name: 'Hard ginger beer',
      aliases: ['ingefaer', 'ingefaer ol', 'ginger beer', 'hard ginger', 'gingerbug', 'ginger sats', 'ingefaer sats'],
      ogRange: [1.025, 1.042],
      fgRange: [0.995, 1.008],
      abvRange: [3.5, 5.5],
      typicalDays: [6, 10],
      tempRangeC: [20, 27],
      sourceLabel: 'Coopers DIY, Australian Home Brewing og Brew Your Own',
      sourceUrls: [
        'https://www.beer101.diybeer.com/ginger-beer-alcoholic',
        'https://www.australianhomebrewing.com.au/learn/beer/hard-ginger-beer/',
        'https://byo.com/recipes/hard-ginger-beer/'
      ]
    },
    {
      id: 'cream_ale',
      name: 'Cream ale / maize-drevet lys ale',
      aliases: ['cream ale', 'cream', 'maize', 'mais', 'corn', 'maisol', 'maisoel'],
      ogRange: [1.042, 1.055],
      fgRange: [1.006, 1.012],
      abvRange: [4.2, 5.6],
      typicalDays: [4, 7],
      tempRangeC: [18, 21],
      sourceLabel: 'BJCP 2021 Cream Ale',
      sourceUrls: [
        'https://www.bjcp.org/style/2021/beer/'
      ]
    },
    {
      id: 'american_ipa',
      name: 'American IPA',
      aliases: ['american ipa', 'ipa', 'india pale', 'west coast'],
      ogRange: [1.056, 1.070],
      fgRange: [1.008, 1.014],
      abvRange: [5.5, 7.5],
      typicalDays: [5, 8],
      tempRangeC: [18, 22],
      sourceLabel: 'BJCP 2021 American IPA',
      sourceUrls: [
        'https://www.bjcp.org/style/2021/21/21A/american-ipa/'
      ]
    },
    {
      id: 'witbier',
      name: 'Witbier',
      aliases: ['witbier', 'wit', 'blanche', 'belgisk hvete'],
      ogRange: [1.044, 1.052],
      fgRange: [1.008, 1.012],
      abvRange: [4.5, 5.5],
      typicalDays: [4, 7],
      tempRangeC: [18, 22],
      sourceLabel: 'BJCP 2021 Witbier',
      sourceUrls: [
        'https://www.bjcp.org/style/2021/24/24A/witbier/'
      ]
    },
    {
      id: 'american_wheat',
      name: 'American Wheat / hveteol',
      aliases: ['american wheat', 'hvete', 'wheat', 'weizen', 'weiss', 'hefe'],
      ogRange: [1.040, 1.055],
      fgRange: [1.008, 1.013],
      abvRange: [4.0, 5.5],
      typicalDays: [4, 7],
      tempRangeC: [18, 22],
      sourceLabel: 'BJCP 2021 American Wheat Beer',
      sourceUrls: [
        'https://www.bjcp.org/style/2021/1/standard-american-beer/'
      ]
    },
    {
      id: 'german_pils',
      name: 'German Pils',
      aliases: ['german pils', 'pils', 'pilsner', 'pilsen'],
      ogRange: [1.044, 1.050],
      fgRange: [1.008, 1.013],
      abvRange: [4.4, 5.2],
      typicalDays: [7, 14],
      tempRangeC: [9, 14],
      sourceLabel: 'BJCP German Pils',
      sourceUrls: [
        'https://www.bjcp.org/beer-styles/2a-german-pilsner-pils/'
      ]
    },
    {
      id: 'munich_helles',
      name: 'Munich Helles',
      aliases: ['helles', 'lys lager', 'munich helles'],
      ogRange: [1.044, 1.048],
      fgRange: [1.006, 1.012],
      abvRange: [4.7, 5.4],
      typicalDays: [7, 14],
      tempRangeC: [9, 14],
      sourceLabel: 'BJCP 2021 Munich Helles',
      sourceUrls: [
        'https://www.bjcp.org/style/2021/4/4A/munich-helles/'
      ]
    },
    {
      id: 'american_lager',
      name: 'Standard American Lager',
      aliases: ['lager', 'american lager', 'standard lager'],
      ogRange: [1.040, 1.050],
      fgRange: [1.004, 1.010],
      abvRange: [4.2, 5.3],
      typicalDays: [7, 12],
      tempRangeC: [10, 14],
      sourceLabel: 'BJCP American Lager',
      sourceUrls: [
        'https://www.bjcp.org/beer-styles/1b-standard-american-lager/'
      ]
    },
    {
      id: 'saison',
      name: 'Saison',
      aliases: ['saison', 'farmhouse', 'grisette'],
      ogRange: [1.048, 1.065],
      fgRange: [1.002, 1.008],
      abvRange: [5.0, 7.0],
      typicalDays: [4, 10],
      tempRangeC: [20, 28],
      sourceLabel: 'BJCP 2021 Saison',
      sourceUrls: [
        'https://www.bjcp.org/style/2021/25/25B/saison/'
      ]
    },
    {
      id: 'irish_stout',
      name: 'Irish Stout',
      aliases: ['irish stout', 'stout', 'dry stout'],
      ogRange: [1.036, 1.044],
      fgRange: [1.007, 1.011],
      abvRange: [3.8, 5.0],
      typicalDays: [4, 8],
      tempRangeC: [17, 21],
      sourceLabel: 'BJCP 2021 Irish Stout',
      sourceUrls: [
        'https://styles.bjcp.org/bjcp-2021-beer/15/15b-irish-stout'
      ]
    }
  ];

  const SOURCE_LIBRARY = {
    stillSpiritsStuck: {
      label: 'Still Spirits: stuck sugar wash',
      url: 'https://help.stillspirits.com/hc/en-us/articles/360005358138-My-wash-started-to-ferment-but-stopped-and-the-SG-reading-is-not-down-to-990-what-do-I-do'
    },
    stillSpiritsRange: {
      label: 'Still Spirits: Turbo Yeast Range',
      url: 'https://help.stillspirits.com/hc/en-us/articles/360005510257-Turbo-Yeast-Range'
    },
    stillSpiritsNutrient: {
      label: 'Still Spirits: Distiller’s Nutrient Light Spirits',
      url: 'https://www.stillspirits.com/products/nutrient-light-spirits'
    },
    scottNutrition: {
      label: 'Scott Labs: Yeast Nutrition 101',
      url: 'https://scottlab.com/yeast-nutrition-101'
    },
    scottTroubleshooting: {
      label: 'Scott Labs: Troubleshooting sluggish/stuck fermentations',
      url: 'https://scottlab.com/troubleshooting-stuck-sluggish-alcoholic-fermentations'
    },
    scottSugarGuide: {
      label: 'Scott Labs: low nutrient sugar fermentation',
      url: 'https://scottlab.com/best-practices-hard-seltzer-fermentation'
    },
    moreBeerGinger: {
      label: 'MoreBeer: alcoholic ginger ale',
      url: 'https://www.morebeer.com/questions/202'
    },
    audeamusTomato: {
      label: 'Audeamus: tomato paste wash',
      url: 'https://www.audeamusdistilling.com/blogs/news/tomato-paste-wash'
    },
    bryggolDAP: {
      label: 'Brygg Øl: DAP',
      url: 'https://bryggol.no/produkt/diammonium-phosphate-dap-500g/'
    },
    bryggolFermaidO: {
      label: 'Brygg Øl: Fermaid O',
      url: 'https://bryggol.no/produkt/fermaid-o-yeast-nutrient-50g/'
    }
  };

  function normalizeText(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function stableHash(value) {
    let hash = 0;
    const text = String(value || '');
    for (let i = 0; i < text.length; i += 1) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function pickVariant(seed, options) {
    if (!Array.isArray(options) || !options.length) return '';
    return options[stableHash(seed) % options.length];
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function midpoint(range) {
    if (!Array.isArray(range) || range.length < 2) return NaN;
    if (!Number.isFinite(range[0]) || !Number.isFinite(range[1])) return NaN;
    return (range[0] + range[1]) / 2;
  }

  function defaultParseGravityToSpecific(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return NaN;
    return numeric >= 10 ? numeric / 1000 : numeric;
  }

  function defaultAverage(values) {
    const valid = (Array.isArray(values) ? values : []).filter(Number.isFinite);
    if (!valid.length) return NaN;
    return valid.reduce((sum, value) => sum + value, 0) / valid.length;
  }

  function defaultSlopePerHour(rows, field, lookbackCount) {
    const safeRows = Array.isArray(rows) ? rows : [];
    const subset = safeRows.slice(-Math.max(3, lookbackCount || 8));
    if (subset.length < 2) return NaN;
    const first = subset[0];
    const last = subset[subset.length - 1];
    const firstValue = Number(first ? first[field] : NaN);
    const lastValue = Number(last ? last[field] : NaN);
    const firstTs = new Date(first ? first.createdOn : '').getTime();
    const lastTs = new Date(last ? last.createdOn : '').getTime();
    if (!Number.isFinite(firstValue) || !Number.isFinite(lastValue) || !Number.isFinite(firstTs) || !Number.isFinite(lastTs) || lastTs <= firstTs) {
      return NaN;
    }
    return (lastValue - firstValue) / ((lastTs - firstTs) / 36e5);
  }

  function formatSg(value) {
    return Number.isFinite(value) ? value.toFixed(3) : '--';
  }

  function formatAbv(value) {
    return Number.isFinite(value) ? value.toFixed(2) + '%' : '--';
  }

  function formatTemp(value) {
    return Number.isFinite(value) ? value.toFixed(1) + ' C' : '--';
  }

  function formatRange(range, digits, suffix) {
    if (!Array.isArray(range) || range.length < 2) return '--';
    const useDigits = Number.isFinite(digits) ? digits : 3;
    const end = suffix || '';
    return range[0].toFixed(useDigits) + '–' + range[1].toFixed(useDigits) + end;
  }

  function classifyRangeFit(value, range, tolerance) {
    if (!Number.isFinite(value) || !Array.isArray(range) || range.length < 2) return 'unknown';
    const tol = Number.isFinite(tolerance) ? tolerance : 0;
    if (value < range[0]) {
      return value >= (range[0] - tol) ? 'near-low' : 'low';
    }
    if (value > range[1]) {
      return value <= (range[1] + tol) ? 'near-high' : 'high';
    }
    return 'within';
  }

  function scoreFromFits(fits) {
    return fits.reduce((sum, fit) => {
      if (fit === 'within') return sum + 2;
      if (fit === 'near-low' || fit === 'near-high') return sum + 1;
      return sum;
    }, 0);
  }

  function includesAny(haystack, candidates) {
    return candidates.some((candidate) => haystack.includes(normalizeText(candidate)));
  }

  function inferProcessContext(meta, styleMatch) {
    const haystack = [
      normalizeText(meta && meta.deviceName),
      normalizeText(meta && meta.profileName),
      normalizeText(meta && meta.batchName)
    ].filter(Boolean).join(' | ');

    const isSats = includesAny(haystack, ['sats', 'sukker sats', 'sugar wash', 'sukkerwash', 'wash']);
    const isGinger = (styleMatch && styleMatch.id === 'hard_ginger_beer')
      || includesAny(haystack, ['ginger', 'ingefaer']);
    const isTurbo = includesAny(haystack, ['turbo', 'pure turbo', 'classic 8', 'classic 6']);
    const isLowNutrientSugar = isSats || (isGinger && includesAny(haystack, ['sats', 'wash', 'sukker']));

    return {
      haystack,
      isSats,
      isGinger,
      isTurbo,
      isLowNutrientSugar
    };
  }

  function inferStyle(meta) {
    const haystackParts = [
      normalizeText(meta && meta.deviceName),
      normalizeText(meta && meta.profileName),
      normalizeText(meta && meta.batchName)
    ].filter(Boolean);

    if (!haystackParts.length) return null;
    const haystack = haystackParts.join(' | ');

    let bestMatch = null;
    STYLE_LIBRARY.forEach((style) => {
      const matchedAliases = style.aliases.filter((alias) => haystack.includes(normalizeText(alias)));
      if (!matchedAliases.length) return;

      const score = matchedAliases.reduce((sum, alias) => {
        const normalized = normalizeText(alias);
        return sum + (normalized.includes(' ') ? 5 : 3);
      }, 0);

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = {
          ...style,
          score,
          matchedAliases,
          confidenceLabel: matchedAliases.length >= 2 ? 'Høy' : 'Moderat'
        };
      }
    });

    if (bestMatch) {
      bestMatch.processContext = inferProcessContext(meta, bestMatch);
    }

    return bestMatch;
  }

  function buildStyleAssessment(options) {
    const rows = Array.isArray(options && options.rows) ? options.rows : [];
    const device = options && options.device;
    const styleMatch = options && options.styleMatch;
    const helpers = options && options.helpers ? options.helpers : {};
    const parseGravityToSpecific = helpers.parseGravityToSpecific || defaultParseGravityToSpecific;
    const estimateAbvFromRows = helpers.estimateAbvFromRows || function (safeRows) {
      if (!Array.isArray(safeRows) || safeRows.length < 2) return NaN;
      const og = parseGravityToSpecific(safeRows[0] && safeRows[0].gravity);
      const fg = parseGravityToSpecific(safeRows[safeRows.length - 1] && safeRows[safeRows.length - 1].gravity);
      if (!Number.isFinite(og) || !Number.isFinite(fg) || og <= fg) return NaN;
      return (og - fg) * 131.25;
    };

    if (!styleMatch) {
      return 'Navn og aktiv profil gir ikke et tydelig stiltreff ennå, så denne delen holder seg bevisst konservativ og beskriver prosessen uten å låse batchen til en bestemt ølstil.';
    }

    const seed = styleMatch.id + ':' + (device && device.name ? device.name : '') + ':' + rows.length;
    const intro = pickVariant(seed, [
      'Navn og profil peker tydelig mot ' + styleMatch.name + '.',
      'Ordvalget i enhetsnavn og profil leses mest plausibelt som ' + styleMatch.name + '.',
      'Batchen ser ut til å være ment som ' + styleMatch.name + ', basert på navnet og den aktive profilen.'
    ]);

    const og = rows.length > 1 ? parseGravityToSpecific(rows[0] && rows[0].gravity) : NaN;
    const fg = rows.length ? parseGravityToSpecific(rows[rows.length - 1] && rows[rows.length - 1].gravity) : parseGravityToSpecific(device && device.gravity);
    const abvEstimate = Number.isFinite(options && options.abvEstimate) ? options.abvEstimate : estimateAbvFromRows(rows);
    const ogFit = classifyRangeFit(og, styleMatch.ogRange, 0.002);
    const fgFit = classifyRangeFit(fg, styleMatch.fgRange, 0.002);
    const abvFit = classifyRangeFit(abvEstimate, styleMatch.abvRange, 0.4);
    const fitScore = scoreFromFits([ogFit, fgFit, abvFit]);

    if (rows.length < 2 || !Number.isFinite(og)) {
      const currentGravity = parseGravityToSpecific(rows.length ? rows[rows.length - 1] && rows[rows.length - 1].gravity : device && device.gravity);
      const ogMid = midpoint(styleMatch.ogRange);
      const fgMid = midpoint(styleMatch.fgRange);
      let phaseText = 'Det finnes foreløpig for lite gjæringshistorikk til å vurdere utgjæringen mot stilvinduet.';

      if (Number.isFinite(currentGravity) && Number.isFinite(ogMid) && Number.isFinite(fgMid) && ogMid > fgMid) {
        const progress = clamp(1 - ((currentGravity - fgMid) / (ogMid - fgMid)), 0, 1);
        if (progress < 0.25) {
          phaseText = 'Den observerte gravityen på ' + formatSg(currentGravity) + ' plasserer batchen tidlig i et typisk forløp for denne stilen.';
        } else if (progress < 0.8) {
          phaseText = 'Nåværende gravity på ' + formatSg(currentGravity) + ' ligger mellom stilens vanlige start- og sluttområde, noe som peker mot en arbeidende mellomfase.';
        } else {
          phaseText = 'Gravityen på ' + formatSg(currentGravity) + ' ligger nær et vanlig sluttområde for denne stilen og tyder på sen fase eller nær stabilisering.';
        }
      }

      return [
        intro,
        phaseText,
        'Referansevinduet som brukes her er omtrent OG ' + formatRange(styleMatch.ogRange, 3, '') + ', FG ' + formatRange(styleMatch.fgRange, 3, '') + ' og ABV ' + formatRange(styleMatch.abvRange, 1, '%') + '.'
      ].join(' ');
    }

    const ogTextMap = {
      within: 'OG-en på ' + formatSg(og) + ' ligger pent innenfor stilens vanlige startstyrke.',
      'near-low': 'OG-en på ' + formatSg(og) + ' ligger like under det klassiske stilvinduet, men fortsatt tett på en plausibel tolkning.',
      'near-high': 'OG-en på ' + formatSg(og) + ' ligger i overkant av stilens kjerne, men ikke så langt at stiltreffet bryter sammen.',
      low: 'OG-en på ' + formatSg(og) + ' er merkbart lavere enn det som er typisk for denne stilen.',
      high: 'OG-en på ' + formatSg(og) + ' er tydelig sterkere enn det som normalt forventes i denne stilen.',
      unknown: 'OG-en kan ikke vurderes sikkert mot stilvinduet.'
    };

    const fgTextMap = {
      within: 'Sluttgravityen som vises nå, ' + formatSg(fg) + ', stemmer godt med et stilriktig sluttpunkt.',
      'near-low': 'Sluttgravityen på ' + formatSg(fg) + ' ligger litt tørrere enn kjernen, men fortsatt innenfor et troverdig utfall.',
      'near-high': 'Sluttgravityen på ' + formatSg(fg) + ' ligger litt fyldigere enn kjernen, men fortsatt innenfor et forsvarlig spenn.',
      low: 'Sluttgravityen på ' + formatSg(fg) + ' peker mot et tørrere og mer utgjæret resultat enn det som vanligvis forbindes med stilen.',
      high: 'Sluttgravityen på ' + formatSg(fg) + ' peker mot mer restsødme og mer kropp enn det stilen normalt tilsier.',
      unknown: 'Sluttgravityen kan ikke vurderes sikkert mot stilvinduet.'
    };

    const abvTextMap = {
      within: 'Estimert alkohol på ' + formatAbv(abvEstimate) + ' samsvarer godt med stilens normalområde.',
      'near-low': 'Estimert alkohol på ' + formatAbv(abvEstimate) + ' ligger marginalt i nedre kant, men fortsatt innenfor et naturlig uttrykk.',
      'near-high': 'Estimert alkohol på ' + formatAbv(abvEstimate) + ' ligger marginalt i øvre kant, men fortsatt innenfor et rimelig stiluttrykk.',
      low: 'Estimert alkohol på ' + formatAbv(abvEstimate) + ' havner lavere enn det som normalt er typisk for stilen.',
      high: 'Estimert alkohol på ' + formatAbv(abvEstimate) + ' havner høyere enn det som normalt er typisk for stilen.',
      unknown: 'Alkoholnivået kan ikke vurderes sikkert mot stilvinduet ennå.'
    };

    let verdict = '';
    if (fitScore >= 5) {
      verdict = pickVariant(seed + ':verdict', [
        'Helhetsbildet ligger derfor tett på et klassisk stiluttrykk.',
        'Samlet sett ser batchen stilfaglig godt kalibrert ut.',
        'Tallene samsvarer overraskende godt med stilreferansen og gir et troverdig stiltreff.'
      ]);
    } else if (fitScore >= 3) {
      verdict = pickVariant(seed + ':verdict', [
        'Helhetsbildet er fortsatt gjenkjennelig, men med noen avvik fra en streng stilmal.',
        'Dette ligner fortsatt stilen, men batchen drar i retning av en personlig eller friere tolkning.',
        'Stilsamsvaret virker moderat: nok til at stilen kan leses, men ikke uten egne preg.'
      ]);
    } else {
      verdict = pickVariant(seed + ':verdict', [
        'Samlet peker tallene mot en mer fri tolkning enn en stilren skolebokversjon.',
        'Det er fortsatt mulig å lese intensjonen, men batchen ligger et godt stykke fra den typiske statistikken.',
        'Tallene avviker så mye at stilen bør behandles som en løs referanse heller enn en presis mal.'
      ]);
    }

    return [
      intro,
      ogTextMap[ogFit],
      fgTextMap[fgFit],
      abvTextMap[abvFit],
      verdict
    ].join(' ');
  }

  function buildStyleFallbackForecast(options) {
    const rows = Array.isArray(options && options.rows) ? options.rows : [];
    const device = options && options.device;
    const styleMatch = options && options.styleMatch;
    const helpers = options && options.helpers ? options.helpers : {};
    const parseGravityToSpecific = helpers.parseGravityToSpecific || defaultParseGravityToSpecific;
    const calculateSlopePerHour = helpers.calculateSlopePerHour || defaultSlopePerHour;
    const estimateAbvFromRows = helpers.estimateAbvFromRows || function (safeRows) {
      if (!Array.isArray(safeRows) || safeRows.length < 2) return NaN;
      const og = parseGravityToSpecific(safeRows[0] && safeRows[0].gravity);
      const fg = parseGravityToSpecific(safeRows[safeRows.length - 1] && safeRows[safeRows.length - 1].gravity);
      if (!Number.isFinite(og) || !Number.isFinite(fg) || og <= fg) return NaN;
      return (og - fg) * 131.25;
    };

    if (!styleMatch) {
      return 'Det finnes foreløpig for lite gjæringsdata til å kjøre den numeriske modellen med trygghet, og uten et tydelig stiltreff blir reserveestimatet med vilje holdt tilbake til flere målinger er inne.';
    }

    const safeRows = rows.map((row) => ({
      ...row,
      gravity: parseGravityToSpecific(row && row.gravity)
    }));
    const currentGravity = safeRows.length
      ? Number(safeRows[safeRows.length - 1] && safeRows[safeRows.length - 1].gravity)
      : parseGravityToSpecific(device && device.gravity);
    const currentTemp = safeRows.length
      ? Number(safeRows[safeRows.length - 1] && safeRows[safeRows.length - 1].temperature)
      : Number(device && device.temperature);
    const typicalOg = midpoint(styleMatch.ogRange);
    const typicalFg = midpoint(styleMatch.fgRange);
    const typicalDays = midpoint(styleMatch.typicalDays);
    const recentSlope = safeRows.length >= 2 ? calculateSlopePerHour(safeRows, 'gravity', Math.min(6, safeRows.length)) : NaN;
    const currentAbv = estimateAbvFromRows(safeRows);

    let stageText = 'Reserveprognosen hviler derfor på stilreferansen alene.';
    let remainingDays = Number.isFinite(typicalDays) ? typicalDays : 7;

    if (Number.isFinite(currentGravity) && Number.isFinite(typicalOg) && Number.isFinite(typicalFg) && typicalOg > typicalFg) {
      const progress = clamp(1 - ((currentGravity - typicalFg) / (typicalOg - typicalFg)), 0, 1);
      if (progress < 0.2) {
        stageText = 'Dagens gravity på ' + formatSg(currentGravity) + ' ligner en tidlig fase i et typisk ' + styleMatch.name + '-forløp.';
      } else if (progress < 0.75) {
        stageText = 'Dagens gravity på ' + formatSg(currentGravity) + ' peker mot en arbeidende mellomfase der det fortsatt er meningsfull fremdrift igjen.';
      } else {
        stageText = 'Dagens gravity på ' + formatSg(currentGravity) + ' ligger nær et normalt sluttområde for stilen, så batchen ser ut til å være sent i forløpet.';
      }
      remainingDays = Math.max(0.5, typicalDays * (1 - progress));
    }

    if (Number.isFinite(recentSlope) && recentSlope < -0.0001 && Number.isFinite(currentGravity) && Number.isFinite(typicalFg)) {
      const remainingSg = Math.max(currentGravity - typicalFg, 0);
      remainingDays = clamp((remainingSg / Math.abs(recentSlope)) / 24, 0.4, (styleMatch.typicalDays[1] || 10) * 2);
    }

    let tempText = '';
    if (Array.isArray(styleMatch.tempRangeC) && styleMatch.tempRangeC.length === 2 && Number.isFinite(currentTemp)) {
      if (currentTemp < styleMatch.tempRangeC[0] - 0.5) {
        tempText = 'Temperaturen på ' + formatTemp(currentTemp) + ' ligger under det som ofte brukes for denne stilen, så tempoet kan være mer dempet enn normalt.';
        remainingDays *= 1.15;
      } else if (currentTemp > styleMatch.tempRangeC[1] + 0.5) {
        tempText = 'Temperaturen på ' + formatTemp(currentTemp) + ' ligger over et vanlig arbeidsområde for stilen, noe som ofte gir raskere drift men også mer sensorisk risiko.';
        remainingDays *= 0.9;
      } else {
        tempText = 'Temperaturen på ' + formatTemp(currentTemp) + ' ligger innenfor et ganske plausibelt arbeidsområde for denne stilen.';
      }
    }

    const abvText = Number.isFinite(currentAbv)
      ? 'Den forelopige alkoholdannelsen ligger rundt ' + formatAbv(currentAbv) + ', mens et typisk sluttomraade for stilen ofte ender rundt ' + formatRange(styleMatch.abvRange, 1, '%') + '.'
      : 'Stilreferansen som brukes her er omtrent OG ' + formatRange(styleMatch.ogRange, 3, '') + ', FG ' + formatRange(styleMatch.fgRange, 3, '') + ' og ABV ' + formatRange(styleMatch.abvRange, 1, '%') + '.';

    return [
      'Det finnes ennå ikke nok filtrert historikk til å la den numeriske modellen stå alene, så prognosen faller tilbake på en modulbasert stilreferanse for ' + styleMatch.name + '.',
      stageText,
      tempText,
      abvText,
      'Som arbeidsanslag ligger det igjen omtrent ' + remainingDays.toFixed(1) + ' døgn til et sannsynlig sluttområde rundt ' + formatSg(typicalFg) + ', gitt at utviklingen fortsetter uten et nytt prosesskifte.'
    ].filter(Boolean).join(' ');
  }

  function buildForecast(options) {
    const rows = Array.isArray(options && options.rows) ? options.rows : [];
    const styleMatch = options && options.styleMatch;
    const helpers = options && options.helpers ? options.helpers : {};
    const parseGravityToSpecific = helpers.parseGravityToSpecific || defaultParseGravityToSpecific;
    const calculateSlopePerHour = helpers.calculateSlopePerHour || defaultSlopePerHour;
    const average = helpers.average || defaultAverage;
    const fmtSg = helpers.fmtSg || formatSg;

    if (rows.length < 6) {
      return buildStyleFallbackForecast(options);
    }

    const gravities = rows.map((row) => parseGravityToSpecific(row && row.gravity)).filter(Number.isFinite);
    const temps = rows.map((row) => Number(row && row.temperature)).filter(Number.isFinite);
    if (gravities.length < 6 || temps.length < 3) {
      return buildStyleFallbackForecast(options);
    }

    const slopeRows = rows.map((row) => ({
      ...row,
      gravity: parseGravityToSpecific(row && row.gravity)
    }));
    const currentGravity = gravities[gravities.length - 1];
    const startGravity = gravities[0];
    const gravityDropObserved = startGravity - currentGravity;
    const recentSlopeSgPerHour = calculateSlopePerHour(slopeRows, 'gravity', 12);
    const avgTemp = average(temps);
    const styleFgRange = styleMatch && Array.isArray(styleMatch.fgRange) ? styleMatch.fgRange : null;
    const styleFgMid = midpoint(styleFgRange);
    let fgFloor = Math.max(0.998, currentGravity - Math.max(0.0015, gravityDropObserved * 0.12));

    if (Number.isFinite(styleFgMid) && currentGravity > styleFgMid) {
      fgFloor = clamp(fgFloor, styleFgRange[0] - 0.002, styleFgRange[1] + 0.003);
    }

    if (!Number.isFinite(recentSlopeSgPerHour) || recentSlopeSgPerHour >= -0.0002) {
      if (styleMatch && Number.isFinite(styleFgMid) && currentGravity <= styleFgRange[1] + 0.002) {
        return 'Den modulare fermenteringsmodellen leser forløpet som nær praktisk stabilt. Gravityen ligger allerede tett på et normalt sluttområde for ' + styleMatch.name + ', så videre endring ventes å bli beskjeden uten et nytt temperatur- eller gjærskifte.';
      }
      return 'Den modulare fermenteringsmodellen leser forløpet som nær praktisk stabilt. Videre endring ventes å bli liten uten et nytt temperatur- eller gjærskifte.';
    }

    let sugar = Math.max((currentGravity - fgFloor) * 1000, 0.2);
    let yeast = 1;
    const K = 5.0;
    const yx = 0.1;
    const umaxBase = 0.5;
    const tempFactor = Math.exp(0.055 * ((Number.isFinite(avgTemp) ? avgTemp : 20) - 20));
    const effectiveUmax = umaxBase * tempFactor;
    const observedRatePtsPerHour = Math.max(0.0001, -recentSlopeSgPerHour * 1000);
    yeast = observedRatePtsPerHour / Math.max(0.0001, effectiveUmax * (sugar / (K + sugar)));
    yeast = clamp(yeast, 0.05, 25);

    const dt = 0.25;
    const maxHours = 24 * 21;
    let hours = 0;

    while (hours < maxHours && sugar > 0.35) {
      const rate = effectiveUmax * (sugar / (K + sugar)) * yeast;
      const sugarMid = sugar - (rate * dt * 0.5);
      const yeastMid = yeast + (yx * rate * dt * 0.5);
      const rateMid = effectiveUmax * (Math.max(sugarMid, 0) / (K + Math.max(sugarMid, 0))) * yeastMid;
      sugar = Math.max(0, sugar - rateMid * dt);
      yeast = Math.max(0, yeast + yx * rateMid * dt);
      hours += dt;
    }

    const predictedGravity = fgFloor + (sugar / 1000);
    const days = hours / 24;
    let styleTail = '';
    if (styleMatch && Number.isFinite(predictedGravity) && Array.isArray(styleMatch.fgRange)) {
      const fgFit = classifyRangeFit(predictedGravity, styleMatch.fgRange, 0.002);
      if (fgFit === 'within' || fgFit === 'near-low' || fgFit === 'near-high') {
        styleTail = ' Det predikerte sluttpunktet ligger fortsatt innenfor et plausibelt stilvindu for ' + styleMatch.name + '.';
      } else if (fgFit === 'low') {
        styleTail = ' Prognosen peker mot et tørrere sluttpunkt enn stilens kjerne tilsier.';
      } else if (fgFit === 'high') {
        styleTail = ' Prognosen peker mot mer restsodme enn stilens kjerne normalt tilsier.';
      }
    }

    if (days <= 1.2) {
      return 'Den modulare prognosen, bygget videre på Monod-inspirert vekstlogikk og enkel midtpunktsintegrasjon, antyder at batchen kan være nær praktisk slutt innen omtrent ' + hours.toFixed(0) + ' timer med estimert sluttgravity rundt ' + fmtSg(predictedGravity) + ' dersom dagens trend holder seg.' + styleTail;
    }
    if (days <= 7) {
      return 'Den modulare fermenteringsmodellen antyder cirka ' + days.toFixed(1) + ' døgn til tilnærmet stabil gravity, med mulig sluttpunkt rundt ' + fmtSg(predictedGravity) + ' dersom temperaturbildet og gjæraktiviteten fortsetter omtrent som nå.' + styleTail;
    }
    return 'Modellprognosen peker mot et roligere og seigere sluttforløp, med omtrent ' + days.toFixed(1) + ' døgn til nær stabil gravity og beregnet sluttpunkt rundt ' + fmtSg(predictedGravity) + '. Dette bør fortsatt leses som prosessindikasjon, ikke som eksakt sluttdato.' + styleTail;
  }

  function buildAlerts(options) {
    const rows = Array.isArray(options && options.rows) ? options.rows : [];
    const device = options && options.device;
    const styleMatch = options && options.styleMatch;
    const meta = options && options.meta ? options.meta : {};
    const helpers = options && options.helpers ? options.helpers : {};
    const parseGravityToSpecific = helpers.parseGravityToSpecific || defaultParseGravityToSpecific;
    const calculateSlopePerHour = helpers.calculateSlopePerHour || defaultSlopePerHour;
    const average = helpers.average || defaultAverage;
    const estimateAbvFromRows = helpers.estimateAbvFromRows || function (safeRows) {
      if (!Array.isArray(safeRows) || safeRows.length < 2) return NaN;
      const og = parseGravityToSpecific(safeRows[0] && safeRows[0].gravity);
      const fg = parseGravityToSpecific(safeRows[safeRows.length - 1] && safeRows[safeRows.length - 1].gravity);
      if (!Number.isFinite(og) || !Number.isFinite(fg) || og <= fg) return NaN;
      return (og - fg) * 131.25;
    };
    const estimateAttenuation = helpers.estimateApparentAttenuation || function (safeRows) {
      if (!Array.isArray(safeRows) || safeRows.length < 2) return NaN;
      const og = parseGravityToSpecific(safeRows[0] && safeRows[0].gravity);
      const fg = parseGravityToSpecific(safeRows[safeRows.length - 1] && safeRows[safeRows.length - 1].gravity);
      if (!Number.isFinite(og) || !Number.isFinite(fg) || og <= 1 || fg > og) return NaN;
      return ((og - fg) / (og - 1)) * 100;
    };

    if (rows.length < 3) return [];

    const context = inferProcessContext(meta, styleMatch);
    const gravities = rows.map((row) => parseGravityToSpecific(row && row.gravity)).filter(Number.isFinite);
    const temps = rows.map((row) => Number(row && row.temperature)).filter(Number.isFinite);
    if (gravities.length < 2) return [];

    const currentGravity = gravities[gravities.length - 1];
    const startGravity = gravities[0];
    const currentTemp = temps.length ? temps[temps.length - 1] : NaN;
    const minTemp = temps.length ? Math.min.apply(null, temps) : NaN;
    const maxTemp = temps.length ? Math.max.apply(null, temps) : NaN;
    const avgTemp = average(temps);
    const tempSwing = Number.isFinite(minTemp) && Number.isFinite(maxTemp) ? (maxTemp - minTemp) : NaN;
    const attenuation = estimateAttenuation(rows);
    const recentSlope = calculateSlopePerHour(rows.map((row) => ({ ...row, gravity: parseGravityToSpecific(row && row.gravity) })), 'gravity', 12);
    const styleFgRange = styleMatch && Array.isArray(styleMatch.fgRange) ? styleMatch.fgRange : null;
    const expectedFg = styleFgRange ? midpoint(styleFgRange) : (context.isLowNutrientSugar ? 0.998 : NaN);
    const fgHigh = styleFgRange ? styleFgRange[1] : (context.isLowNutrientSugar ? 1.004 : NaN);
    const looksStalled = Number.isFinite(recentSlope) && recentSlope > -0.00018
      && Number.isFinite(currentGravity)
      && ((Number.isFinite(fgHigh) && currentGravity > fgHigh + 0.004) || (Number.isFinite(attenuation) && attenuation < 75));

    const alerts = [];

    if (Number(device && device.filteredOutCount) >= 3) {
      alerts.push({
        severity: 'info',
        title: 'Stoy i maaleserien',
        summary: 'Flere maaleutliggere er filtrert bort i perioden. Det styrker trenden, men tilsier at enkelthopp ikke boer tolkes som prosessendring.',
        actionSummary: 'Bruk filtrerte trendlinjer som hovedgrunnlag.',
        proActions: ['Kontroller kalibrering og fysisk plassering av Pillen.'],
        hobbyActions: ['Vaer forsiktig med enkeltspikes som ikke gjenfinnes i nabomaalingene.'],
        links: []
      });
    }

    if (looksStalled) {
      alerts.push({
        severity: 'warning',
        title: 'Tegn til treg eller stoppende gjæring',
        summary: 'Gravitykurven har flatet merkbart ut mens det fortsatt ser ut til å være gjærbart ekstrakt igjen. Dette ligner en treg eller delvis stuck fermentering.',
        actionSummary: 'Bekreft temperatur og gravity, resuspender gjær forsiktig og vurder restart eller næring ut fra batchtype.',
        proActions: [
          'Verifiser med en ny gravitymaaling og bygg en kontrollert restartstarter dersom batchen faktisk har stoppet.',
          'Ved sen stuck fermentering: bruk acclimatisert restartgjær fremfor å pitche tørr gjær direkte.'
        ],
        hobbyActions: [
          'Sving fermentoren forsiktig for å løfte gjær opp igjen hvis du fortsatt er i aktiv fase.',
          'Se etter 12–24 timer med ekte platå før du griper hardt inn.'
        ],
        links: [SOURCE_LIBRARY.scottTroubleshooting, SOURCE_LIBRARY.stillSpiritsStuck]
      });
    }

    if (context.isLowNutrientSugar && looksStalled) {
      alerts.push({
        severity: 'warning',
        title: context.isSats ? 'Satsen kan mangle nitrogen og mikronæring' : 'Sukkerbasen kan mangle nitrogen og mikronæring',
        summary: 'Lav-nærings sukkerfermenter er næringsfattige sammenlignet med maltbasert vørter. Hvis gravity stanser før forventet sluttpunkt, er nitrogenmangel og generell gjærstress en av de mest sannsynlige forklaringene.',
        actionSummary: 'Proff: organisk gjærnæring eller styrt DAP-tilførsel. Hobby: restartstarter med enkel næringskilde som tomatpure, heller enn å la batchen sulte videre.',
        proActions: [
          'Fermaid O er en kontrollert organisk næringskilde for treg eller krevende fermentering.',
          'DAP kan brukes som direkte nitrogenkilde naar du faktisk mistenker nitrogenunderskudd og vil korrigere mer maalrettet.'
        ],
        hobbyActions: [
          'Tomatpure er en kjent husholdningsløsning i sukkerfermenter fordi den bidrar med næring i en ellers næringsfattig base.',
          'I en enkel ginger-batch nevnes hakkede rosiner som en nødløsning dersom du ikke har kommersiell gjærnæring.'
        ],
        links: [
          SOURCE_LIBRARY.scottSugarGuide,
          SOURCE_LIBRARY.moreBeerGinger,
          SOURCE_LIBRARY.audeamusTomato,
          SOURCE_LIBRARY.bryggolFermaidO,
          SOURCE_LIBRARY.bryggolDAP
        ]
      });
    }

    const styleTempMin = styleMatch && Array.isArray(styleMatch.tempRangeC) ? styleMatch.tempRangeC[0] : NaN;
    const styleTempMax = styleMatch && Array.isArray(styleMatch.tempRangeC) ? styleMatch.tempRangeC[1] : NaN;

    if (Number.isFinite(currentTemp) && ((Number.isFinite(styleTempMax) && currentTemp > styleTempMax + 2.0) || (!Number.isFinite(styleTempMax) && currentTemp > 28))) {
      alerts.push({
        severity: 'warning',
        title: 'Høy gjæringstemperatur',
        summary: 'Temperaturen ligger klart over et komfortabelt arbeidsvindu. Høy varme kan gi stresset gjær, rask men ujevn drift og tidligere stopp.',
        actionSummary: 'Senk temperaturen gradvis og unnga at batchen fortsetter oppover.',
        proActions: ['Bruk aktiv temperaturstyring eller kjølt vannbad for å få batchen tilbake i et smalere vindu.'],
        hobbyActions: ['Flytt karet kaldere eller bruk vannbad og vått håndkle for å bremse varmeutviklingen.'],
        links: [SOURCE_LIBRARY.stillSpiritsRange, SOURCE_LIBRARY.stillSpiritsStuck]
      });
    }

    if (Number.isFinite(currentTemp) && ((Number.isFinite(styleTempMin) && currentTemp < styleTempMin - 2.0) || (!Number.isFinite(styleTempMin) && currentTemp < 16)) && looksStalled) {
      alerts.push({
        severity: 'warning',
        title: 'For lav temperatur til å holde gjæren i arbeid',
        summary: 'Temperaturen ligger lavt samtidig som gravity nesten ikke beveger seg. Dette ligner mer en passiv batch enn en naturlig sluttfase.',
        actionSummary: 'Varm opp gradvis og få gjæren i bevegelse igjen før sterkere tiltak vurderes.',
        proActions: ['Hev temperaturen kontrollert i små steg og følg med på om gravity begynner å røre på seg.'],
        hobbyActions: ['Sett karet lunere eller bruk varmebelte forsiktig etter den mest intense startfasen.'],
        links: [SOURCE_LIBRARY.stillSpiritsStuck]
      });
    }

    if (Number.isFinite(tempSwing) && tempSwing >= 5.0) {
      alerts.push({
        severity: 'info',
        title: 'Urolig temperaturhistorikk',
        summary: 'Temperaturkurven har flyttet seg mye gjennom perioden. Slike svingninger gjør både gjærtempo og diagnose mindre forutsigbar.',
        actionSummary: 'Les alltid gravity sammen med temperatur, ikke alene.',
        proActions: ['Hold fermentoren tettere rundt et definert temperaturvindu.'],
        hobbyActions: ['Unngå trekk, direkte sol og raske romskifter.'],
        links: [SOURCE_LIBRARY.scottTroubleshooting]
      });
    }

    if (Number.isFinite(startGravity) && startGravity >= 1.110 && looksStalled) {
      alerts.push({
        severity: 'warning',
        title: 'Høy startstyrke kan ha stresset gjæren',
        summary: 'Batchen startet tungt nok til at osmotisk stress og senere alkoholtoleranse kan være en del av bildet, selv om temperaturen ellers virker akseptabel.',
        actionSummary: 'Ved restart: bygg opp ny gjær i et gradvis sterkere miljø i stedet for å pitche rett i hele batchen.',
        proActions: ['Bruk acclimatisert restartgjær dersom batchen må reddes videre.'],
        hobbyActions: ['Planlegg heller trinnvis sukkeradding i neste tilsvarende sats enn å starte altfor høyt.'],
        links: [SOURCE_LIBRARY.scottTroubleshooting, SOURCE_LIBRARY.stillSpiritsStuck]
      });
    }

    if (context.isLowNutrientSugar && Number.isFinite(avgTemp) && avgTemp >= 30 && context.isTurbo) {
      alerts.push({
        severity: 'info',
        title: 'Turbo-/satsferment bygger egenvarme',
        summary: 'Denne typen sukkerferment kan produsere betydelig egenvarme. Kombinasjonen av høy varme og svak næring gir ofte hardere stress enn kurven først ser ut til å vise.',
        actionSummary: 'Bruk temperaturkurven aktivt som styrepinne, spesielt tidlig i forløpet.',
        proActions: ['Mål faktisk væsketemperatur, ikke bare romtemperatur.'],
        hobbyActions: ['Ikke legg på ekstra varme tidlig hvis satsen allerede bygger temperatur selv.'],
        links: [SOURCE_LIBRARY.stillSpiritsRange, SOURCE_LIBRARY.stillSpiritsStuck]
      });
    }

    return alerts;
  }

  global.HydrometerIntelligence = {
    STYLE_LIBRARY: STYLE_LIBRARY.slice(),
    inferStyle,
    inferProcessContext,
    buildStyleAssessment,
    buildStyleFallbackForecast,
    buildForecast,
    buildAlerts,
    SOURCE_LIBRARY
  };
}(window));
