'use strict';
(function (global) {

  const ATTRIBUTES_TO_NORMALIZE = ['placeholder', 'title', 'aria-label', 'alt'];
  const DIRECT_REPLACEMENTS = [
    ['ÃƒÆ’Ã‚Â¥', 'å'],
    ['ÃƒÂ¥', 'å'],
    ['Ã¥', 'å'],
    ['ÃƒÆ’Ã‚Â¸', 'ø'],
    ['ÃƒÂ¸', 'ø'],
    ['Ã¸', 'ø'],
    ['ÃƒÆ’Ã‚Â¦', 'æ'],
    ['ÃƒÂ¦', 'æ'],
    ['Ã¦', 'æ'],
    ['ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¥', 'Å'],
    ['Ãƒâ€¦', 'Å'],
    ['Ã…', 'Å'],
    ['ÃƒËœ', 'Ø'],
    ['Ã˜', 'Ø'],
    ['Ãƒâ€ ', 'Æ'],
    ['Ã†', 'Æ'],
    ['ÃƒÂ©', 'é'],
    ['Ã©', 'é'],
    ['ÃƒÂ¼', 'ü'],
    ['Ã¼', 'ü'],
    ['Ãƒâ€“', 'Ö'],
    ['Ã–', 'Ö'],
    ['ÃƒÂ¶', 'ö'],
    ['Ã¶', 'ö'],
    ['Ãƒâ€ž', 'Ä'],
    ['Ã„', 'Ä'],
    ['ÃƒÂ¤', 'ä'],
    ['Ã¤', 'ä'],
    ['ÃƒÅ¸', 'ß'],
    ['ÃŸ', 'ß'],
    ['Ã‚Â·', '·'],
    ['Â·', '·'],
    ['Ã‚Â', ''],
    ['Â', ''],
    ['â€“', '–'],
    ['â€”', '—'],
    ['â€˜', '‘'],
    ['â€™', '’'],
    ['â€œ', '“'],
    ['â€�', '”'],
    ['â€¦', '…']
  ];

  const EXTRA_DIRECT_REPLACEMENTS = [
    ['Å¥', 'å'],
    ['Å¸', 'ø'],
    ['Å¦', 'æ'],
    ['Å…', 'Å'],
    ['Å“', 'Ø'],
    ['ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ', '–'],
    ['ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…Â', '–']
  ];
  const ALL_DIRECT_REPLACEMENTS = DIRECT_REPLACEMENTS.concat(EXTRA_DIRECT_REPLACEMENTS);

  function mojibakePenalty(value) {
    return (String(value || '').match(/[ÃÂâÆ]/g) || []).length;
  }

  function decodeUtf8FromLatin1(value) {
    if (typeof global.TextDecoder === 'undefined') return String(value || '');
    const source = String(value || '');
    try {
      const bytes = new Uint8Array(Array.from(source, function (char) {
        return char.charCodeAt(0) & 0xff;
      }));
      return new global.TextDecoder('utf-8', { fatal: false }).decode(bytes);
    } catch (error) {
      return source;
    }
  }

  function pickBetterRepair(current, candidate) {
    const safeCurrent = String(current == null ? '' : current);
    const safeCandidate = String(candidate == null ? '' : candidate);
    if (!safeCandidate || safeCandidate === safeCurrent) return safeCurrent;
    const currentPenalty = mojibakePenalty(safeCurrent);
    const candidatePenalty = mojibakePenalty(safeCandidate);
    if (candidatePenalty < currentPenalty) return safeCandidate;
    if (candidatePenalty === currentPenalty && safeCandidate.length >= safeCurrent.length) return safeCandidate;
    return safeCurrent;
  }

  function applyDirectReplacements(value) {
    let text = String(value == null ? '' : value);
    ALL_DIRECT_REPLACEMENTS.forEach(function (pair) {
      text = text.split(pair[0]).join(pair[1]);
    });
    return text;
  }

  function normalizeUiText(value) {
    const oe = String.fromCharCode(248);
    const aa = String.fromCharCode(229);
    const ae = String.fromCharCode(230);
    let text = String(value == null ? '' : value);

    for (let attempt = 0; attempt < 4; attempt += 1) {
      let next = text;

      if (/[ÃÂâÆ]/.test(next)) {
        try {
          next = pickBetterRepair(next, decodeURIComponent(escape(next)));
        } catch (error) {
          next = next;
        }
        next = pickBetterRepair(next, decodeUtf8FromLatin1(next));
      }

      next = applyDirectReplacements(next);
      if (next === text) break;
      text = next;
    }

    return text
      .replace(/\bStoy\b/g, 'St' + oe + 'y')
      .replace(/\bmaaleutliggere\b/g, 'm' + aa + 'leutliggere')
      .replace(/\bboer\b/g, 'b' + oe + 'r')
      .replace(/\bVaer\b/g, 'V' + ae + 'r')
      .replace(/\bforelopige\b/g, 'forel' + oe + 'pige')
      .replace(/\bsluttomraade\b/g, 'sluttomr' + aa + 'de')
      .replace(/\brestsodme\b/g, 'rests' + oe + 'dme')
      .replace(/\bgravitymaaling\b/g, 'gravitym' + aa + 'ling')
      .replace(/\bnaar\b/g, 'n' + aa + 'r')
      .replace(/\bmaalrettet\b/g, 'm' + aa + 'lrettet')
      .replace(/\bunnga\b/g, 'unng' + aa)
      .replace(/\bennaa\b/g, 'enn' + aa)
      .replace(/\bogsaa\b/g, 'ogs' + aa);
  }

  function normalizeAttributeText(element) {
    if (!element || !element.getAttribute || !element.setAttribute) return;
    ATTRIBUTES_TO_NORMALIZE.forEach(function (attributeName) {
      if (!element.hasAttribute(attributeName)) return;
      const currentValue = element.getAttribute(attributeName);
      const normalizedValue = normalizeUiText(currentValue);
      if (normalizedValue !== currentValue) {
        element.setAttribute(attributeName, normalizedValue);
      }
    });
  }

  function normalizeDomTree(root) {
    if (!root || !global.document) return;
    const nodeFilter = global.NodeFilter;
    if (!nodeFilter) return;

    if (root.nodeType === 1) {
      normalizeAttributeText(root);
    }

    const walker = global.document.createTreeWalker(
      root,
      nodeFilter.SHOW_ELEMENT | nodeFilter.SHOW_TEXT,
      {
        acceptNode: function (node) {
          if (node.nodeType === 3) {
            const parentTag = node.parentNode && node.parentNode.nodeName;
            if (parentTag === 'SCRIPT' || parentTag === 'STYLE' || parentTag === 'NOSCRIPT') {
              return nodeFilter.FILTER_REJECT;
            }
            return nodeFilter.FILTER_ACCEPT;
          }

          if (node.nodeType === 1) {
            const tag = node.nodeName;
            if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') {
              return nodeFilter.FILTER_REJECT;
            }
            return nodeFilter.FILTER_ACCEPT;
          }

          return nodeFilter.FILTER_SKIP;
        }
      }
    );

    let currentNode = walker.currentNode;
    while (currentNode) {
      if (currentNode.nodeType === 3) {
        const normalizedText = normalizeUiText(currentNode.nodeValue);
        if (normalizedText !== currentNode.nodeValue) {
          currentNode.nodeValue = normalizedText;
        }
      } else if (currentNode.nodeType === 1) {
        normalizeAttributeText(currentNode);
      }
      currentNode = walker.nextNode();
    }
  }

  function startDomNormalization() {
    if (!global.document || !global.MutationObserver) return;

    normalizeDomTree(global.document.body || global.document.documentElement);

    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === 'characterData' && mutation.target) {
          const normalizedText = normalizeUiText(mutation.target.nodeValue);
          if (normalizedText !== mutation.target.nodeValue) {
            mutation.target.nodeValue = normalizedText;
          }
          return;
        }

        if (mutation.type === 'attributes' && mutation.target) {
          normalizeAttributeText(mutation.target);
          return;
        }

        mutation.addedNodes.forEach(function (node) {
          if (node && (node.nodeType === 1 || node.nodeType === 3)) {
            normalizeDomTree(node.nodeType === 3 ? node.parentNode : node);
          }
        });
      });
    });

    observer.observe(global.document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRIBUTES_TO_NORMALIZE
    });
  }

  global.normalizeUiText = normalizeUiText;

  if (global.document) {
    if (global.document.readyState === 'loading') {
      global.document.addEventListener('DOMContentLoaded', startDomNormalization, { once: true });
    } else {
      startDomNormalization();
    }
  }
}(window));
