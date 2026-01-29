//<!-- /includes/quiz-lite.js  (FolkQuiz v2.3.3 Theme-Aware + Dynamic) -->
/* ------------------------------------------------------------------
   FolkQuiz v2.3.3 Theme-Aware + Dynamic – NO DEPS + BEAUTIFUL DESIGN
   Endringer:
   • Viser spørsmåls-tekst robust (question|text|q|prompt|title|spm|sporsmal|stem|body|label)
   • Setter tittel/beskrivelse/svaralternativer som tekstnoder (trygt mot HTML/DOM-quirks)
   • Korrekt antall spørsmål: støtter data.max | data.select | data.limit + brukerens valg
   • Antall-kontroll (10, 30, egendefinert input) vises OVER kapittelfilteret
   • Automatisk LaTeX re-typesetting (MathJax/KaTeX hvis tilstede)
   • **NYE: Integrerer med FolkNettsideFolk tema-system og oppdateres automatisk**
   • **NYE: Per-alternativ forklaringer (optionExplanations)**
   • **NYE: Dynamisk generert beskrivelse basert på faktisk tilstand**
-------------------------------------------------------------------*/
(function () {
  "use strict";

  try { if (!window.FolkQuiz) window.FolkQuiz = {}; } catch (_) {}

  // 🔧 Dom-hjelpere
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const el = {
    make(tag, attrs = {}, ...kids) {
      const n = document.createElement(tag);
      Object.entries(attrs || {}).forEach(([k, v]) => {
        if (k === "class") n.className = v;
        else if (k === "html") n.innerHTML = v;
        else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
        else n.setAttribute(k, v);
      });
      kids.flat().forEach(k => {
        if (k == null) return;
        if (typeof k === "string") n.appendChild(document.createTextNode(k));
        else n.appendChild(k);
      });
      return n;
    },
  };

  const toArray = (x) => Array.isArray(x) ? x : (x == null ? [] : [x]);
  const norm = (s) => (s || "").toString().trim().toLowerCase().replace(/\s+/g, " ");

  function mulberry32(a) {
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function sampleN(arr, n, seed) {
    if (!n || n >= arr.length) return arr.slice();
    const rnd = mulberry32(seed || Date.now());
    const idx = Array.from(arr.keys());
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    return idx.slice(0, n).map(i => arr[i]);
  }
  function shuffleArray(arr, seed) {
  const copy = arr.slice();
  const rnd = mulberry32(seed || Date.now());
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

  function scoreQuestion(q, userVal) {
    if (q.type === "text") {
      const u = norm(userVal || "");
      const ok = toArray(q.answer).map(norm);
      const correct = ok.some(a => u.includes(a) || a.includes(u)) && u.length > 0;
      return { correct };
    }
    const a = toArray(q.answer).map(String).sort().join(",");
    const u = (Array.isArray(userVal) ? userVal : (userVal == null ? [] : [userVal]))
      .map(String).sort().join(",");
    return { correct: a === u };
  }

  function guessQuizBase(persistArg, dataObj) {
    const candidates = [];
    if (persistArg && typeof persistArg === "object") {
      const p = persistArg;
      if (p.baseUrl) candidates.push(p.baseUrl);
      if (p.quizUrl) { try { candidates.push(new URL(".", new URL(p.quizUrl, window.location.href)).href); } catch {} }
      if (p.key && /\/[^\/]+\.(json|txt)$/i.test(p.key)) {
        try { candidates.push(new URL(".", new URL(p.key, window.location.href)).href); } catch {}
      }
    }
    const dataUrlKeys = ["_baseUrl", "baseUrl", "__baseUrl", "quizUrl", "__url", "url", "_src"];
    for (const k of dataUrlKeys) {
      const v = dataObj && dataObj[k];
      if (!v) continue;
      try {
        const s = String(v);
        const base = /\.(json|txt)$/i.test(s) ? new URL(".", new URL(s, window.location.href)).href
                                              : new URL(s, window.location.href).href;
        candidates.push(base);
      } catch {}
    }
    if (typeof persistArg === "string" && /\/[^\/]+\.(json|txt)$/i.test(persistArg)) {
      try { candidates.push(new URL(".", new URL(persistArg, window.location.href)).href); } catch {}
    }
    candidates.push(document.baseURI || window.location.href);
    for (const c of candidates) {
      try { return new URL(c, window.location.href).href; } catch {}
    }
    return document.baseURI || window.location.href;
  }

  function buildImageCandidates(imgValue, quizBaseHref) {
    let alt = "Illustrasjon";
    let raw = imgValue;
    if (typeof imgValue === "object" && imgValue !== null) {
      if (imgValue.alt) alt = String(imgValue.alt);
      raw = imgValue.src || imgValue.url || "";
    }
    raw = String(raw || "").trim();

    const out = [];
    const pushAbs = (rel) => { try { out.push(new URL(rel, quizBaseHref).href); } catch {} };

    if (/^(https?:)?\/\//i.test(raw) || raw.startsWith("/")) {
      try { out.push(new URL(raw, window.location.href).href); } catch {}
    } else {
      if (raw.includes("/")) pushAbs(raw);
      if (!raw.includes("/")) pushAbs("bilder/" + raw);
      pushAbs("quiz/bilder/" + raw.replace(/^.*\//, ""));
    }
    try { out.push(new URL(raw, document.baseURI || location.href).href); } catch {}
    return { alt, tries: Array.from(new Set(out)) };
  }

  function readChaptersFromQuestion(q) {
    const raw = q.chapter ?? q.kapittel ?? q.chap ?? q.topic ?? q.tema ?? q.tags ?? null;
    const list = Array.isArray(raw) ? raw : (raw == null ? [] : [raw]);
    return list.map(x => String(x).trim()).filter(Boolean);
  }

  function extractChapterIndex(questions) {
    const map = new Map();
    questions.forEach(q => {
      readChaptersFromQuestion(q).forEach(label => {
        const key = norm(label);
        if (!map.has(key)) map.set(key, label);
      });
    });
    function chapterRankTuple(label) {
      const m = String(label).match(/^\s*(\d+(?:\.\d+)*)(.*)$/);
      if (!m) return [Number.POSITIVE_INFINITY, String(label).toLowerCase()];
      const nums = m[1].split(".").map(n => parseInt(n, 10));
      return [...nums, 0, String(label).toLowerCase()];
    }
    const entries = Array.from(map.entries());
    entries.sort((a, b) => {
      const ra = chapterRankTuple(a[1]);
      const rb = chapterRankTuple(b[1]);
      const len = Math.max(ra.length, rb.length);
      for (let i = 0; i < len; i++) {
        const aa = ra[i] ?? 0, bb = rb[i] ?? 0;
        if (aa < bb) return -1;
        if (aa > bb) return 1;
      }
      return 0;
    });
    return entries;
  }

  function filterQuestionsByChapters(questions, selectedKeys) {
    if (!selectedKeys || selectedKeys.length === 0) return questions.slice();
    const sel = new Set(selectedKeys.map(norm));
    return questions.filter(q => {
      const ch = readChaptersFromQuestion(q).map(norm);
      if (ch.length === 0) return false;
      return ch.some(c => sel.has(c));
    });
  }

  // Henter spørsmåls-teksten robust
  function getQuestionText(q) {
    const keys = [
      "question","text","q","prompt","title",
      "spm","sporsmal","stem","body","label"
    ];
    for (const k of keys) {
      const v = q && q[k];
      if (v != null && String(v).trim() !== "") return String(v);
    }
    return "";
  }
  // === AUTOMATISK LaTeX-STØTTE ===
(function loadMathSupport() {
  // Sjekk om MathJax eller KaTeX allerede er lastet
  const hasMathJax = window.MathJax && typeof window.MathJax.typesetPromise === 'function';
  const hasKaTeX = window.katex || window.renderMathInElement;
  
  if (hasMathJax || hasKaTeX) {
    console.log('FolkQuiz: Matematikkbibliotek allerede lastet');
    return; // Allerede lastet
  }
  
  // Sjekk om noen allerede laster KaTeX (unngå duplikat lasting)
  if (window._folkQuizLoadingKaTeX) return;
  window._folkQuizLoadingKaTeX = true;
  
  console.log('FolkQuiz: Laster KaTeX for matematikkstøtte...');
  
  const katexCSS = document.createElement('link');
  katexCSS.rel = 'stylesheet';
  katexCSS.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
  katexCSS.integrity = 'sha384-n8MVd4RsNIU0tAv4ct0nTaAbDJwPJzDEaqSD1odI+WdtXRGWt2kTvGFasHpSy3SV';
  katexCSS.crossOrigin = 'anonymous';
  document.head.appendChild(katexCSS);
  
  const katexJS = document.createElement('script');
  katexJS.defer = true;
  katexJS.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js';
  katexJS.integrity = 'sha384-XjKyOOlGwcjNTAIQHIpgOno0Hl1YQqzUOEleOLALmuqehneUG+vnGctmUb0ZY0l8';
  katexJS.crossOrigin = 'anonymous';
  
  const autoRender = document.createElement('script');
  autoRender.defer = true;
  autoRender.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js';
  autoRender.integrity = 'sha384-+VBxd3r6XgURycqtZ117nYw44OOcIax56Z4dCRWbxyPt0Koah1uHoK0o4+/RRE05';
  autoRender.crossOrigin = 'anonymous';
  
  katexJS.onload = function() {
    document.head.appendChild(autoRender);
    autoRender.onload = function() {
      console.log('FolkQuiz: KaTeX lastet og klar for matematikk!');
      window._folkQuizLoadingKaTeX = false;
      
      // Re-typesett eventuelle eksisterende quizer
      if (window.FolkQuiz && typeof window.FolkQuiz.retypesetAll === 'function') {
        window.FolkQuiz.retypesetAll();
      }
    };
    autoRender.onerror = function() {
      console.warn('FolkQuiz: Auto-render feilet, men KaTeX er lastet');
      window._folkQuizLoadingKaTeX = false;
    };
  };
  
  katexJS.onerror = function() {
    console.error('FolkQuiz: KaTeX lasting feilet');
    window._folkQuizLoadingKaTeX = false;
  };
  
  document.head.appendChild(katexJS);
})();

// 🔁 LaTeX re-typesetting hvis MathJax/KaTeX er tilgjengelig
  async function typesetMath(root) {
    try {
      if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
        await window.MathJax.typesetPromise([root]);
      } else if (window.renderMathInElement) {
        // KaTeX auto-render
        window.renderMathInElement(root, {
          delimiters: [
            {left: "$$", right: "$$", display: true},
            {left: "\\[", right: "\\]", display: true},
            {left: "$", right: "$", display: false},
            {left: "\\(", right: "\\)", display: false},
          ]
        });
      }
    } catch (e) { /* stille */ }
  }

  // LEGG TIL DENNE FUNKSJONEN HER ↓
  // Global funksjon for re-typesetting av alle quizer
  window.FolkQuiz.retypesetAll = function() {
    const quizContainers = document.querySelectorAll('[data-quiz], .folk-quiz, .quiz-container');
    quizContainers.forEach(container => {
      typesetMath(container);
    });
  };
  function render(container, data, persist) {
    container.innerHTML = "";
    try { document.documentElement.style.background = '#f8fafc'; document.body.style.background = '#f8fafc'; } catch {}

    const persistKey = (persist && typeof persist === "object") ? (persist.key || "folkquiz") : (persist || "folkquiz");
    const quizBase = guessQuizBase(persist, data);

    const allQuestions = (data.questions || []).slice();

    // Kapittel og antall
    const chapterIndex = extractChapterIndex(allQuestions);
    const chapKey = persistKey + ":chaptersSel";
    let selectedChapterKeys = [];
    try { selectedChapterKeys = JSON.parse(localStorage.getItem(chapKey) || "[]"); } catch {}

    const maxKey = persistKey + ":maxSel";
    let userMax = 0;
    try { userMax = JSON.parse(localStorage.getItem(maxKey) || "0"); } catch {}
    const declaredMax = parseInt(data.max || data.select || data.limit || 0, 10) || 0;

    // Bygg kapittelfilter (renderes etter antall-UI)
    let filterUI = null;
    let filtered = allQuestions;

    if (chapterIndex.length > 0) {
      const validKeys = new Set(chapterIndex.map(([k]) => k));
      selectedChapterKeys = selectedChapterKeys.filter(k => validKeys.has(k));

      filterUI = (function buildFilter() {
        const list = el.make("div", { class: "quiz-filter-list" });
        chapterIndex.forEach(([key, label], i) => {
          const id = `fq_ch_${i}`;
          const inp = el.make("input", { type: "checkbox", id, value: key });
          if (selectedChapterKeys.includes(key)) inp.checked = true;
          const item = el.make("label", { for: id, class: "quiz-filter-item" }, inp, " ", label);
          list.appendChild(item);
        });

        const btnApply = el.make("button", { class: "quiz-btn-filter", type: "button" }, "Bruk filter");
        btnApply.addEventListener("click", () => {
          const boxes = list.querySelectorAll("input[type=checkbox]:checked");
          const vals = Array.from(boxes, x => x.value);
          try { localStorage.setItem(chapKey, JSON.stringify(vals)); } catch {}
          render(container, data, persist);
        });

        const btnClear = el.make("button", { class: "quiz-btn-filter-clear", type: "button" }, "Fjern filter");
        btnClear.addEventListener("click", () => {
          try { localStorage.removeItem(chapKey); } catch {}
          render(container, data, persist);
        });

        const exp = el.make("details", { class: "quiz-filter" },
          el.make("summary", {}, `📚 Kapitler (${selectedChapterKeys.length > 0 ? selectedChapterKeys.length + " valgt" : "alle"})`),
          list,
          el.make("div", { class: "quiz-filter-buttons" }, btnApply, " ", btnClear)
        );
        return exp;
      })();

      filtered = filterQuestionsByChapters(allQuestions, selectedChapterKeys);
    }

    
// Nytt av chatGBT endret til dette ----
    // --- KORREKT HÅNDTERING AV ANTALL TILGJENGELIGE SPØRSMÅL ---
    const totalAvailable =
      filtered.length > 0 ? filtered.length : allQuestions.length;

    const effectiveMax = Math.max(
      1,
      Math.min(
        totalAvailable,
        userMax > 0
          ? userMax
          : declaredMax > 0
            ? declaredMax
            : totalAvailable
      )
    );

    let dynamicDescription = "";
    const isFiltered = selectedChapterKeys.length > 0;
    const totalQuestions = allQuestions.length;

    if (effectiveMax === totalAvailable && totalAvailable === totalQuestions) {
      dynamicDescription = `Viser alle ${totalQuestions} spørsmål.`;
    } else if (effectiveMax === totalAvailable && isFiltered) {
      dynamicDescription =
        `Viser alle ${totalAvailable} spørsmål fra valgte kapitler (${totalQuestions} totalt).`;
    } else if (effectiveMax < totalAvailable && !isFiltered) {
      dynamicDescription = `Tilfeldig ${effectiveMax} av ${totalQuestions} spørsmål hver runde.`;
    } else if (effectiveMax < totalAvailable && isFiltered) {
      dynamicDescription =
        `Tilfeldig ${effectiveMax} av ${totalAvailable} spørsmål fra valgte kapitler (${totalQuestions} totalt).`;
    }
// endring slutt

const header = el.make("div", { class: "quiz-header" },
      el.make("h2", {}, data.title || "Quiz"),
      dynamicDescription ? el.make("p", {}, dynamicDescription) : null
    );
    

    const maxUI = (function buildMaxUI() {
      const wrap = el.make("div", { class: "quiz-maxsel" });
      const label = el.make("span", { class: "quiz-maxsel-label" }, "📋 Antall spørsmål:");
      const btn10 = el.make("button", { type: "button", class: "quiz-chip-btn" }, "10");
      const btn30 = el.make("button", { type: "button", class: "quiz-chip-btn" }, "30");
      const input = el.make("input", {
        type: "number", min: "1", step: "1", class: "quiz-maxsel-input",
        value: String(effectiveMax)
      });

      function setMaxAndRerender(n) {
        const v = Math.max(1, Math.min(totalAvailable, parseInt(n, 10) || totalAvailable));
        try { localStorage.setItem(maxKey, JSON.stringify(v)); } catch {}
        render(container, data, persist);
      }
      btn10.addEventListener("click", () => setMaxAndRerender(10));
      btn30.addEventListener("click", () => setMaxAndRerender(30));
      input.addEventListener("change", () => setMaxAndRerender(input.value));
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); setMaxAndRerender(input.value); } });

      wrap.append(label, btn10, btn30, input);
      const topControls = el.make("div", { class: "quiz-topcontrols" }, wrap);
      return topControls;
    })();

    // Velg spørsmål
    const chosenPool = filtered.length ? filtered : allQuestions;
    const chosen = (effectiveMax > 0 && effectiveMax < chosenPool.length)
      ? sampleN(chosenPool, effectiveMax, Date.now())
      : chosenPool.slice();

    chosen.forEach((q, i) => { q.id = `q${i}`; });

    const logKey = persistKey + ":log";
    const bestKey = persistKey + ":best";

    // Form
    const form = el.make("form", { class: "quiz-form" });
    const old = JSON.parse(localStorage.getItem(persistKey) || "{}");

    if (chosen.length === 0) {
      container.append(header, maxUI);
      if (filterUI) container.append(filterUI);
      container.append(el.make("div", { class: "quiz-empty" }, "⚠️ Ingen spørsmål matcher kapittelfiltrene!"));
      return;
    }

    chosen.forEach((q, idx) => {
      const qWrap = el.make("div", { class: "quiz-q" });

      // Spørsmålstittel som tekstnoder (trygt) – støtter mange felter
      const rawTxt = getQuestionText(q);
      const qTitle = el.make("div", { class: "quiz-q-title" },
        `${idx + 1}. `,
        el.make("span", {}, rawTxt || "(mangler spørsmålstekst)")
      );
      qWrap.append(qTitle);

      // Chips for kapittel (vis første 2)
      const qCh = readChaptersFromQuestion(q);
      if (qCh.length) {
        const chipWrap = el.make("span", { class: "quiz-chipwrap" },
          ...qCh.slice(0, 2).map(lbl => el.make("span", { class: "quiz-chip" }, lbl)),
          qCh.length > 2 ? el.make("span", { class: "quiz-chip more" }, `+${qCh.length - 2}`) : null
        );
        qTitle.appendChild(chipWrap);
      }

      // Bilde
      if (q.image || q.illustrasjon || q.bilde || q.img) {
        const imgVal = q.image ?? q.illustrasjon ?? q.bilde ?? q.img;
        const { alt, tries } = buildImageCandidates(imgVal, quizBase);
        const img = el.make("img", { class: "quiz-img", alt });
        img.src = tries[0] || "";
        if (tries.length > 1) {
          let tried = 0;
          img.onerror = () => { tried++; if (tried < tries.length) img.src = tries[tried]; };
        }
        qWrap.append(img);
      }

      // Inputs
      if (q.type === "text") {
        const inp = el.make("input", { type: "text", class: "quiz-text-input", placeholder: "Skriv svaret ditt her..." });
        if (old[q.id]) inp.value = old[q.id];
        qWrap.append(el.make("div", { class: "quiz-text" }, inp));
        } else {
        const opts = q.options || (q.type === "truefalse" ? ["Sant", "Usant"] : []);
        const isMulti = q.type === "multiple";
        const theType = (isMulti ? "checkbox" : "radio");
        const optsWrap = el.make("div", { class: "quiz-options" });

        // 🎲 SHUFFLE ALTERNATIVER - Tilfeldig rekkefølge med mapping til original indeks
        const shuffledIndices = shuffleArray(opts.map((_, i) => i), Date.now() + idx);
        
        // Lagre shuffle-mapping på spørsmålet for å kunne sjekke svar
        if (!q._shuffleMap) q._shuffleMap = shuffledIndices;

        shuffledIndices.forEach((originalIndex) => {
          const opt = opts[originalIndex];
          const id = `${q.id}_${originalIndex}`;
          const inp = el.make("input", { type: theType, id, name: q.id, value: String(originalIndex) });
          const oldVal = old[q.id];

          if (isMulti) {
            if (Array.isArray(oldVal) && oldVal.map(String).includes(String(originalIndex))) inp.checked = true;
          } else {
            if (String(oldVal) === String(originalIndex)) inp.checked = true;
          }

          const lbl = el.make("label", { for: id, class: "quiz-option" },
            inp,
            // Alternativtekst som tekstnode (latex-kompatibel)
            el.make("span", { class: "quiz-option-text" }, String(opt))
          );
          optsWrap.append(lbl);
        });

        qWrap.append(optsWrap);
      }
      const fb = el.make("div", { class: "quiz-feedback" });
      qWrap.append(fb);
      form.append(qWrap);
    });

    const inlineScore = el.make("span", { class: "quiz-inline-score" });
    const btnCheck = el.make("button", { class: "quiz-btn", type: "button" }, "✓ Sjekk svar", inlineScore);
    const btnReset = el.make("button", { class: "quiz-btn quiz-btn-secondary", type: "button" }, "↻ Nullstill");

    const btnToggleLog = el.make("button", { class: "quiz-btn quiz-btn-tertiary", type: "button" }, "📊 Vis historikk");
    const lbWrap = el.make("div", { class: "quiz-lb-wrap", style: "display:none;" });
    btnToggleLog.addEventListener("click", () => {
      lbWrap.style.display = lbWrap.style.display === "none" ? "block" : "none";
    });

    const actions = el.make("div", { class: "quiz-actions" }, btnCheck, btnReset, btnToggleLog);

    // Append-sekvens: header -> antall -> filter -> form
    if (filterUI) container.append(header, maxUI, filterUI, form, actions, lbWrap);
    else container.append(header, maxUI, form, actions, lbWrap);

    // Lokal historikk-tabell
    const log = JSON.parse(localStorage.getItem(logKey) || "[]").slice(-10).reverse();
    if (log.length > 0) {
      const table = el.make("table", { class: "quiz-log-table" });
      table.append(el.make("thead", {},
        el.make("tr", {},
          el.make("th", {}, "#"),
          el.make("th", {}, "Dato"),
          el.make("th", {}, "Score"),
          el.make("th", {}, "Tid")
        )
      ));
      const tb = el.make("tbody");
      log.forEach((e, i) => {
        tb.append(el.make("tr", {},
          el.make("td", {}, String(i+1)),
          el.make("td", {}, new Date(e.ts).toLocaleString()),
          el.make("td", {}, `${e.score}/${e.total}`),
          el.make("td", {}, e.ms ? Math.round(e.ms/1000)+"s" : "-")
        ));
      });
      table.append(tb);
      lbWrap.append(table);
    }

    function readUser() {
      const u = {};
      let textIndex = 0;
      chosen.forEach((q) => {
        if (q.type === "single" || q.type === "truefalse") {
          const chosenEl = form.querySelector(`input[name="${q.id}"]:checked`);
          u[q.id] = chosenEl ? Number(chosenEl.value) : null;
        } else if (q.type === "multiple") {
          const boxes = Array.from(form.querySelectorAll(`[id^="${q.id}_"]`));
          u[q.id] = boxes.filter(x => x.checked).map(x => Number(x.value));
        } else {
          const t = form.querySelectorAll(".quiz-text input")[textIndex++];
          u[q.id] = t ? t.value : "";
        }
      });
      return u;
    }

    function computeScore() {
      const u = readUser();
      localStorage.setItem(persistKey, JSON.stringify(u));
      let correct = 0;
      chosen.forEach(q => { if (scoreQuestion(q, u[q.id]).correct) correct++; });
      const total = chosen.length;
      const pct = total ? Math.round((100 * correct) / total) : 0;
      return { u, correct, total, pct };
    }

    btnCheck.addEventListener("click", () => {
      const { u, correct, total, pct } = computeScore();
      inlineScore.textContent = `  ${correct}/${total} (${pct}%)`;
      const h = header.querySelector("h2");
      if (h) h.textContent = (data.title || "Quiz") + ` – ${correct}/${total} (${pct}%)`;

      chosen.forEach((q, i) => {
        const fb = form.querySelectorAll(".quiz-feedback")[i];
        const res = scoreQuestion(q, u[q.id]);
        let extra = "";

        if (!res.correct) {
          if (q.type === "text") {
            extra = q.explanation ? `<div class="quiz-expl">${q.explanation}</div>` : "";
          } else {
            const ans = toArray(q.answer);
            const opts = q.options || [];
            const labels = ans
              .map(ai => (opts[ai] != null ? opts[ai] : `Alternativ ${ai}`))
              .join("<br>");

            // Vis forklaring for brukerens valgte alternativ(er) hvis det finnes
            let userChoiceExpl = "";
            if (q.optionExplanations && Array.isArray(q.optionExplanations)) {
              const userChoice = u[q.id];
              const userChoices = Array.isArray(userChoice)
                ? userChoice
                : (userChoice != null ? [userChoice] : []);

              userChoices.forEach(choice => {
                const idx = parseInt(choice, 10);
                if (!isNaN(idx) && q.optionExplanations[idx] && q.optionExplanations[idx].trim() !== "") {
                  const optLabel = opts[idx] != null ? opts[idx] : `Alternativ ${idx}`;
                  userChoiceExpl += `<div class="quiz-expl quiz-expl-wrong">
                    <strong>"${optLabel}":</strong> ${q.optionExplanations[idx]}
                  </div>`;
                }
              });
            }

            // Bygg feedback: riktig svar + forklaring for feil valg + generell forklaring
            extra =
              `<div class="quiz-expl"><strong>Riktig svar:</strong><br>${labels}</div>` +
              userChoiceExpl +
              (q.explanation ? `<div class="quiz-expl">${q.explanation}</div>` : "");
          }
        } else {
          // Hvis riktig svar, vis forklaring for riktig alternativ
          if (q.optionExplanations && Array.isArray(q.optionExplanations)) {
            const userChoice = u[q.id];
            const userChoices = Array.isArray(userChoice)
              ? userChoice
              : (userChoice != null ? [userChoice] : []);
            const opts = q.options || [];

            userChoices.forEach(choice => {
              const idx = parseInt(choice, 10);
              if (!isNaN(idx) && q.optionExplanations[idx] && q.optionExplanations[idx].trim() !== "") {
                const optLabel = opts[idx] != null ? opts[idx] : `Alternativ ${idx}`;
                extra += `<div class="quiz-expl quiz-expl-correct">
                  <strong>"${optLabel}":</strong> ${q.optionExplanations[idx]}
                </div>`;
              }
            });
          }

          // Legg til generell forklaring hvis den finnes (og ikke allerede vist per-alternativ forklaring)
          if (q.explanation && !extra) {
            extra = `<div class="quiz-expl">${q.explanation}</div>`;
          }
        }

        fb.innerHTML = (res.correct ? "✅ Riktig" : "❌ Feil") + extra;
        fb.classList.add("quiz-feedback-shown");
      }); // ✅ LUKK forEach HER (viktig!)

      // ✅ LaTeX typeset ETTER at all feedback er satt
      typesetMath(form);

      // ✅ Best-score (fjernet dobbelt const prev)
      try {
        const prev = JSON.parse(localStorage.getItem(bestKey) || "null");
        if (!prev || pct > prev.pct) {
          localStorage.setItem(bestKey, JSON.stringify({ score: correct, total, pct }));
        }
      } catch {}

      // Lås inputs
      $$("input", form).forEach(inp => (inp.disabled = true));

      // Logg
      const entry = { score: correct, total, pct, ms: 0, ts: Date.now() };
      const fullLog = JSON.parse(localStorage.getItem(logKey) || "[]");
      fullLog.push(entry);
      if (fullLog.length > 200) fullLog.splice(0, fullLog.length - 200);
      localStorage.setItem(logKey, JSON.stringify(fullLog));

      // Event for patch
      container.dispatchEvent(new CustomEvent("quiz:done", { detail: entry }));
    }); // ✅ LUKK addEventListener HER (viktig!)


    btnReset.addEventListener("click", () => {
      localStorage.removeItem(persistKey);
      localStorage.removeItem(bestKey);
      render(container, data, persist);
    });

    // LaTeX-typesetting etter render
    typesetMath(container);
  }

  /* === Auto-logg + Leaderboard patch === */
  (function() {
    if (!window.FolkQuiz) return;

    function uuidv4() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
    function getDeviceId() {
      let id = localStorage.getItem('FQ::device_id');
      if (!id) { id = uuidv4(); localStorage.setItem('FQ::device_id', id); }
      return id;
    }

    function saveResult(quizId, entry) {
      const logKey = `FQ::log::${quizId}`;
      const bestKey = `FQ::best::${quizId}`;
      const log = JSON.parse(localStorage.getItem(logKey) || '[]');
      log.push(entry);
      if (log.length > 200) log.splice(0, log.length - 200);
      localStorage.setItem(logKey, JSON.stringify(log));
      const prev = JSON.parse(localStorage.getItem(bestKey) || 'null');
      let best = entry;
      if (prev) {
        const better = (entry.score > prev.score) || (entry.score === prev.score && entry.ms < prev.ms);
        if (!better) best = prev;
      }
      localStorage.setItem(bestKey, JSON.stringify(best));
      return best;
    }

    async function sendResult(quizId, courseId, entry) {
      if (!window.FOLK_LEADERBOARD_ENDPOINT) return;
      try {
        await fetch(window.FOLK_LEADERBOARD_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'submit',
            quiz_id: quizId,
            course_id: courseId || '',
            device_id: getDeviceId(),
            name: localStorage.getItem('FQ::name') || '',
            ...entry
          })
        });
      } catch (e) {
        console.warn("Leaderboard submit feilet:", e);
      }
    }

    const origRender = window.FolkQuiz.render;
    window.FolkQuiz.render = function(container, data, opts) {
      origRender(container, data, opts);
      const quizId = (opts?.quizId || data.id || 'quiz').toLowerCase().replace(/\s+/g,'-');
      const courseId = opts?.courseId || window.FOLK_COURSE_ID || '';
      container.addEventListener('quiz:done', e => {
        const entry = e.detail;
        const best = saveResult(quizId, entry);
        sendResult(quizId, courseId, best);
      });
    };
  })();

  // === Enhanced CSS med tema-integrasjon ===
  (function () {
    const id = "folk-quiz-css";
    if (document.getElementById(id)) return;
    
    const css = `
/* ========== MODERNE QUIZ STYLING (TEMA-INTEGRERT) ========== */

.quiz-header,
.quiz-filter,
.quiz-q,
.quiz-option,
.quiz-btn,
.quiz-chip-btn,
.quiz-maxsel {
  /* Bruk FolkNettsideFolk sine tema-variabler med fallbacks */
  --quiz-primary: var(--primary-color, #3b82f6);
  --quiz-secondary: var(--secondary-color, #10b981);
  --quiz-tertiary: var(--tertiary-color, #8b5cf6);
  --quiz-danger: #ef4444;
  --quiz-txt: var(--text-color, #1e293b);
  --quiz-bg: var(--background-color, #ffffff);
  --quiz-border: var(--border-color, #e2e8f0);
  --quiz-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --quiz-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --quiz-radius: 12px;
  --quiz-radius-sm: 8px;
}

/* Ekstra variabler for alle elementer */
.quiz-header,
.quiz-filter,
.quiz-q,
.quiz-option,
.quiz-btn,
.quiz-chip-btn,
.quiz-maxsel,
.quiz-filter-item,
.quiz-log-table,
.quiz-chip,
.quiz-text-input,
.quiz-expl {
  --quiz-primary-hover: #2563eb;
  --quiz-primary-light: #dbeafe;
  --quiz-txt-light: #64748b;
  --quiz-bg-alt: #f8fafc;
}

/* Beregn hover og light varianter for moderne browsere */
@supports (color: oklch(from white l c h)) {
  .quiz-btn, .quiz-chip-btn, .quiz-btn-filter {
    --quiz-primary-hover: oklch(from var(--quiz-primary) calc(l * 0.85) c h);
  }
  .quiz-option:hover, .quiz-filter-item:hover, .quiz-chip {
    --quiz-primary-light: oklch(from var(--quiz-primary) calc(l * 1.3) calc(c * 0.5) h);
  }
}

/* Header med gradient */
.quiz-header {
  background: linear-gradient(135deg, var(--quiz-primary) 0%, var(--quiz-tertiary) 100%);
  color: white;
  padding: 2rem;
  margin: 0 0 1.0rem 0;
  border-radius: var(--quiz-radius);
  box-shadow: var(--quiz-shadow-lg);
  position: relative;
  overflow: hidden;
}
.quiz-header::before {
  content: '';
  position: absolute; inset: 0;
  background: url('data:image/svg+xml,<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="white" opacity="0.05"/></svg>');
  pointer-events: none;
}
.quiz-header h2 { margin: 0 0 0.5rem 0; font-size: 2rem; font-weight: 700; letter-spacing: -0.02em; }
.quiz-header p { margin: 0; font-size: 1.1rem; opacity: 0.95; font-weight: 400; }

/* Antall-kontroller (plassert over filteret) */
.quiz-topcontrols {
  margin: 0 0 1rem 0;
  display: flex; justify-content: flex-end; align-items: center;
}
.quiz-maxsel {
  background: var(--quiz-bg);
  border: 2px solid var(--quiz-border);
  border-radius: var(--quiz-radius-sm);
  padding: 0.5rem 0.75rem;
  box-shadow: var(--quiz-shadow);
  display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
}
.quiz-maxsel-label { font-weight: 700; color: var(--quiz-txt); margin-right: .25rem; }
.quiz-chip-btn {
  border: none;
  background: linear-gradient(135deg, var(--quiz-primary) 0%, var(--quiz-primary-hover) 100%);
  color: white; font-weight: 700; padding: 0.35rem 0.7rem; border-radius: 999px;
  cursor: pointer; font-size: 0.95rem; transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: var(--quiz-shadow);
}
.quiz-chip-btn:hover { transform: translateY(-1px); box-shadow: var(--quiz-shadow-lg); }
.quiz-maxsel-input {
  width: 5rem; padding: 0.35rem 0.5rem; border: 2px solid var(--quiz-border);
  border-radius: var(--quiz-radius-sm); background: var(--quiz-bg-alt); font-size: 0.95rem;
}
.quiz-maxsel-input:focus { outline: none; border-color: var(--quiz-primary); box-shadow: 0 0 0 3px var(--quiz-primary-light); background: white; }

/* Filter section */
.quiz-filter {
  background: var(--quiz-bg);
  border: 2px solid var(--quiz-border);
  border-radius: var(--quiz-radius);
  padding: 1.25rem;
  margin: 0 0 1.5rem 0;
  box-shadow: var(--quiz-shadow);
  transition: all 0.3s ease;
}
.quiz-filter:hover { box-shadow: var(--quiz-shadow-lg); border-color: var(--quiz-primary-light); }
.quiz-filter summary {
  cursor: pointer; font-weight: 600; font-size: 1.05rem; color: var(--quiz-txt); padding: 0.25rem; user-select: none; list-style: none; display: flex; align-items: center; transition: color 0.2s;
}
.quiz-filter summary::-webkit-details-marker { display: none; }
.quiz-filter summary::before { content: '▶'; margin-right: 0.75rem; transition: transform 0.3s; display: inline-block; }
.quiz-filter[open] summary::before { transform: rotate(90deg); }
.quiz-filter summary:hover { color: var(--quiz-primary); }
.quiz-filter-list { margin-top: 1rem; display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem; }
.quiz-filter-item {
  display: flex; align-items: center; padding: 0.75rem; background: var(--quiz-bg-alt); border: 1px solid var(--quiz-border);
  border-radius: var(--quiz-radius-sm); cursor: pointer; transition: all 0.2s; font-size: 0.95rem;
}
.quiz-filter-item:hover { background: var(--quiz-primary-light); border-color: var(--quiz-primary); transform: translateY(-1px); }
.quiz-filter-item input[type="checkbox"] { margin-right: 0.5rem; cursor: pointer; width: 18px; height: 18px; accent-color: var(--quiz-primary); }
.quiz-filter-buttons { margin-top: 1rem; display: flex; gap: 0.75rem; flex-wrap: wrap; }
.quiz-btn-filter, .quiz-btn-filter-clear {
  padding: 0.65rem 1.25rem; border: none; border-radius: var(--quiz-radius-sm); font-weight: 600; cursor: pointer; transition: all 0.2s; font-size: 0.95rem;
}
.quiz-btn-filter { background: var(--quiz-primary); color: white; }
.quiz-btn-filter:hover { background: var(--quiz-primary-hover); transform: translateY(-1px); box-shadow: var(--quiz-shadow); }
.quiz-btn-filter-clear { background: var(--quiz-bg-alt); color: var(--quiz-txt); border: 1px solid var(--quiz-border); }
.quiz-btn-filter-clear:hover { background: white; border-color: var(--quiz-txt-light); }

/* Form og spørsmål */
.quiz-form { background: var(--quiz-bg); color: var(--quiz-txt); }
.quiz-q {
  background: white; border: 2px solid var(--quiz-border); border-radius: var(--quiz-radius);
  padding: 1.75rem; margin-bottom: 1.5rem; box-shadow: var(--quiz-shadow); transition: all 0.3s ease;
}
.quiz-q:hover { box-shadow: var(--quiz-shadow-lg); border-color: var(--quiz-primary-light); }
.quiz-q-title { font-size: 1.15rem; font-weight: 600; color: var(--quiz-txt); margin-bottom: 1.25rem; line-height: 1.6; }

/* Chips */
.quiz-chipwrap { margin-left: .5rem; }
.quiz-chip {
  display: inline-block; background: var(--quiz-primary-light); color: var(--quiz-txt);
  border: 1px solid var(--quiz-border); border-radius: 999px; padding: 0.1rem 0.6rem; margin-left: 0.25rem; font-size: .8rem; font-weight: 600;
}
.quiz-chip.more { background: #f1f5f9; }

/* Bilder */
.quiz-img { max-width: 100%; height: auto; border-radius: var(--quiz-radius-sm); margin: 1rem 0; box-shadow: var(--quiz-shadow); display: block; }

/* Svaralternativer */
.quiz-options { display: flex; flex-direction: column; gap: 0.75rem; }
.quiz-option {
  display: flex; align-items: center; padding: 1rem 1.25rem; background: var(--quiz-bg-alt);
  border: 2px solid var(--quiz-border); border-radius: var(--quiz-radius-sm); cursor: pointer; transition: all 0.2s; position: relative;
}
.quiz-option:hover { background: var(--quiz-primary-light); border-color: var(--quiz-primary); transform: translateX(4px); }
.quiz-option input[type="radio"], .quiz-option input[type="checkbox"] {
  margin-right: 1rem; cursor: pointer; width: 20px; height: 20px; accent-color: var(--quiz-primary); flex-shrink: 0;
}
.quiz-option-text { flex: 1; font-size: 1rem; line-height: 1.5; }
.quiz-option input:checked ~ .quiz-option-text { font-weight: 600; color: var(--quiz-primary); }
.quiz-option:has(input:checked) { background: var(--quiz-primary-light); border-color: var(--quiz-primary); }

/* Tekstinput */
.quiz-text { margin-top: 0.75rem; }
.quiz-text-input {
  width: 100%; padding: 1rem; border: 2px solid var(--quiz-border); border-radius: var(--quiz-radius-sm);
  font-size: 1rem; transition: all 0.2s; background: var(--quiz-bg-alt); box-sizing: border-box;
}
.quiz-text-input:focus { outline: none; border-color: var(--quiz-primary); box-shadow: 0 0 0 3px var(--quiz-primary-light); background: white; }

/* Feedback */
.quiz-feedback { margin-top: 1rem; padding: 0; opacity: 0; max-height: 0; overflow: hidden; transition: all 0.3s ease; font-weight: 600; font-size: 1rem; }
.quiz-feedback-shown { opacity: 1; max-height: 500px; padding: 1rem 0 0 0; }
.quiz-expl {
  background: var(--quiz-bg-alt); border: 1px solid var(--quiz-border); border-left: 4px solid var(--quiz-primary);
  border-radius: var(--quiz-radius-sm); padding: 1rem; margin-top: 0.75rem; line-height: 1.6; font-weight: normal; animation: slideIn 0.3s ease;
}
.quiz-expl-wrong {
  background: #fef2f2; border-color: #fecaca; border-left-color: #ef4444;
}
.quiz-expl-correct {
  background: #f0fdf4; border-color: #bbf7d0; border-left-color: #10b981;
}
@keyframes slideIn { from { opacity: 0; transform: translateY(-10px);} to { opacity: 1; transform: translateY(0);} }

/* Knapper */
.quiz-actions { display: flex; gap: 1rem; padding: 1.5rem 0; flex-wrap: wrap; }
.quiz-btn {
  border: none; background: linear-gradient(135deg, var(--quiz-primary) 0%, var(--quiz-primary-hover) 100%);
  color: white; font-weight: 600; padding: 0.875rem 1.75rem; border-radius: var(--quiz-radius-sm);
  cursor: pointer; font-size: 1rem; transition: all 0.2s; box-shadow: var(--quiz-shadow);
  display: flex; align-items: center; gap: 0.5rem;
}
.quiz-btn:hover { transform: translateY(-2px); box-shadow: var(--quiz-shadow-lg); }
.quiz-btn:active { transform: translateY(0); }
.quiz-btn-secondary { background: linear-gradient(135deg, var(--quiz-secondary) 0%, #059669 100%); }
.quiz-btn-tertiary { background: linear-gradient(135deg, #64748b 0%, #475569 100%); }
.quiz-inline-score { background: rgba(255, 255, 255, 0.2); padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.95rem; font-weight: 700; }

/* Historikk-tabell */
.quiz-lb-wrap { margin-top: 1.5rem; animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.quiz-log-table { width: 100%; border-collapse: collapse; background: white; border-radius: var(--quiz-radius-sm); overflow: hidden; box-shadow: var(--quiz-shadow); }
.quiz-log-table th, .quiz-log-table td { padding: 0.875rem 1rem; text-align: left; border-bottom: 1px solid var(--quiz-border); }
.quiz-log-table th { background: var(--quiz-bg-alt); font-weight: 700; color: var(--quiz-txt); text-transform: uppercase; font-size: 0.85rem; letter-spacing: 0.05em; }
.quiz-log-table tr:hover { background: var(--quiz-bg-alt); }
.quiz-log-table tr:last-child td { border-bottom: none; }

/* Tom state */
.quiz-empty { color: var(--quiz-danger); font-weight: 600; padding: 2rem; text-align: center; background: white; border: 2px dashed var(--quiz-border); border-radius: var(--quiz-radius); margin-top: 1rem; }

/* Responsiv design */
@media (max-width: 768px) {
  .quiz-header { padding: 1.5rem; }
  .quiz-header h2 { font-size: 1.5rem; }
  .quiz-q { padding: 1.25rem; }
  .quiz-filter-list { grid-template-columns: 1fr; }
  .quiz-actions { flex-direction: column; }
  .quiz-btn { width: 100%; justify-content: center; }
}

/* Smooth scrolling */
html { scroll-behavior: smooth; }

/* Print-styling */
@media print {
  .quiz-actions, .quiz-filter, .quiz-topcontrols { display: none; }
  .quiz-header { background: none; color: black; box-shadow: none; }
  .quiz-q { page-break-inside: avoid; box-shadow: none; border: 1px solid #ddd; }
}
`;
    const st = document.createElement("style");
    st.id = id; st.textContent = css;
    document.head.appendChild(st);
  })();

  window.FolkQuiz.render = render;
})();