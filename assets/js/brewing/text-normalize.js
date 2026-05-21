(function (global) {
  'use strict';

  function normalizeUiText(value) {
    const oe = String.fromCharCode(248);
    const aa = String.fromCharCode(229);
    const ae = String.fromCharCode(230);
    let text = String(value == null ? '' : value);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const repaired = decodeURIComponent(escape(text));
        if (!repaired || repaired === text) break;
        text = repaired;
      } catch (error) {
        break;
      }
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

  global.normalizeUiText = normalizeUiText;
}(window));
