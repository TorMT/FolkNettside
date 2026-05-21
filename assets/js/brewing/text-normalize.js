'use strict';
(function (global) {

  const ATTRIBUTES_TO_NORMALIZE = ['placeholder', 'title', 'aria-label', 'alt'];
  const MOJIBAKE_HINT = /[\u00c2\u00c3\u00e2]/;
  const ASCII_NORWEGIAN_REPLACEMENTS = [
    [/\bingefaer\b/gi, 'ingef\u00e6r'],
    [/\bmaaleutliggere\b/gi, 'm\u00e5leutliggere'],
    [/\bmaaling\b/gi, 'm\u00e5ling'],
    [/\bmaalrettet\b/gi, 'm\u00e5lrettet'],
    [/\bboer\b/gi, 'b\u00f8r'],
    [/\bVaer\b/g, 'V\u00e6r'],
    [/\bvaer\b/g, 'v\u00e6r'],
    [/\bforelopige\b/gi, 'forel\u00f8pige'],
    [/\bsluttomraade\b/gi, 'sluttomr\u00e5de'],
    [/\brestsodme\b/gi, 'rests\u00f8dme'],
    [/\bgravitymaaling\b/gi, 'gravitym\u00e5ling'],
    [/\bnaar\b/gi, 'n\u00e5r'],
    [/\bunnga\b/gi, 'unng\u00e5'],
    [/\bennaa\b/gi, 'enn\u00e5'],
    [/\bogsaa\b/gi, 'ogs\u00e5'],
    [/\bStoy\b/g, 'St\u00f8y']
  ];
  const EXPLICIT_REPAIRS = [
    ['\u00c3\u00a5', '\u00e5'],
    ['\u00c3\u00b8', '\u00f8'],
    ['\u00c3\u00a6', '\u00e6'],
    ['\u00c3\u2026', '\u00c5'],
    ['\u00c3\u02dc', '\u00d8'],
    ['\u00c3\u2020', '\u00c6'],
    ['\u00c2\u00b7', '\u00b7'],
    ['\u00e2\u20ac\u201c', '\u2013'],
    ['\u00e2\u20ac\u201d', '\u2014'],
    ['\u00e2\u20ac\u02dc', '\u2018'],
    ['\u00e2\u20ac\u2122', '\u2019'],
    ['\u00e2\u20ac\u0153', '\u201c'],
    ['\u00e2\u20ac\ufffd', '\u201d'],
    ['\u00e2\u20ac\u00a6', '\u2026'],
    ['\u00c2', '']
  ];

  function mojibakePenalty(value) {
    return (String(value || '').match(/[\u00c2\u00c3\u00e2]/g) || []).length;
  }

  function decodeUtf8FromSingleByte(value) {
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

  function decodeUtf8ViaEncoding(value, encoding) {
    if (typeof global.TextEncoder === 'undefined' || typeof global.TextDecoder === 'undefined') {
      return String(value || '');
    }

    const source = String(value || '');
    try {
      const bytes = new global.TextEncoder().encode(source);
      return new global.TextDecoder(encoding, { fatal: false }).decode(bytes);
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

  function applyExplicitRepairs(value) {
    let text = String(value == null ? '' : value);
    EXPLICIT_REPAIRS.forEach(function (pair) {
      text = text.split(pair[0]).join(pair[1]);
    });
    return text;
  }

  function applyAsciiNorwegianRepairs(value) {
    let text = String(value == null ? '' : value);
    ASCII_NORWEGIAN_REPLACEMENTS.forEach(function (pair) {
      text = text.replace(pair[0], pair[1]);
    });
    return text;
  }

  function normalizeUiText(value) {
    let text = String(value == null ? '' : value);

    for (let attempt = 0; attempt < 4; attempt += 1) {
      let next = text;

      if (MOJIBAKE_HINT.test(next)) {
        try {
          next = pickBetterRepair(next, decodeURIComponent(escape(next)));
        } catch (error) {
          next = next;
        }
        next = pickBetterRepair(next, decodeUtf8FromSingleByte(next));
        next = pickBetterRepair(next, decodeUtf8ViaEncoding(next, 'windows-1252'));
      }

      next = applyExplicitRepairs(next);
      if (next === text) break;
      text = next;
    }

    text = applyAsciiNorwegianRepairs(text);

    if (typeof text.normalize === 'function') {
      text = text.normalize('NFC');
    }

    return text;
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
