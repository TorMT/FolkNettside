(function () {
  "use strict";

  function ensureCSS() {
    const id = "course-leaderboard-css";
    if (document.getElementById(id)) return;
    const css = `
.clb{color:var(--text-color,#17212f)}
.clb-card{background:var(--card-bg,#fff);border:1px solid var(--border-color,#dbe3ef);border-radius:18px;box-shadow:0 12px 32px rgba(15,23,42,.08);padding:1rem}
.clb-head{display:flex;justify-content:space-between;gap:.8rem;align-items:flex-start;flex-wrap:wrap;margin-bottom:.9rem}
.clb-head h3{margin:0;font-size:1.1rem}
.clb-muted{color:var(--text-muted,#60748a);font-size:.95rem}
.clb-table{width:100%;border-collapse:collapse}
.clb-table th,.clb-table td{padding:.7rem .65rem;border-bottom:1px solid var(--border-color,#e5edf7);text-align:left}
.clb-table th{font-size:.82rem;text-transform:uppercase;letter-spacing:.04em;color:var(--text-muted,#60748a)}
.clb-me{margin-top:.9rem;padding:.85rem 1rem;border-radius:14px;background:var(--surface-2,#f7faff);border:1px solid var(--border-color,#dbe3ef);font-weight:600}
.clb-empty{padding:.9rem 0;color:var(--text-muted,#60748a)}
@media (max-width: 768px){
  .clb-card{padding:.85rem}
  .clb-table thead{display:none}
  .clb-table,.clb-table tbody,.clb-table tr,.clb-table td{display:block;width:100%}
  .clb-table tr{padding:.7rem 0;border-bottom:1px solid var(--border-color,#e5edf7)}
  .clb-table td{border-bottom:none;padding:.25rem 0}
  .clb-table td::before{content:attr(data-label);display:block;font-size:.78rem;color:var(--text-muted,#60748a);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.15rem}
}
`;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function fmtPct(scoreSum, totalSum) {
    const value = totalSum > 0 ? (scoreSum / totalSum) * 100 : 0;
    return `${(Math.round(value * 10) / 10).toFixed(1)}%`;
  }

  function fmtMs(ms) {
    const totalSeconds = Math.max(0, Math.round((Number(ms) || 0) / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`;
  }

  function getDeviceId() {
    return localStorage.getItem("FQ::device_id") || "";
  }

  async function fetchLeaderboard(endpoint, courseId, quizId) {
    const url = new URL(endpoint, location.origin);
    if (courseId) url.searchParams.set("course_id", courseId);
    if (quizId) url.searchParams.set("quiz_id", quizId);
    const deviceId = getDeviceId();
    if (deviceId) url.searchParams.set("device_id", deviceId);
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
    if (!response.ok) {
      throw new Error(`Server svarte ${response.status}`);
    }
    return response.json();
  }

  async function render(container, { courseId = "", quizId = "", title = "", endpoint = "" } = {}) {
    ensureCSS();
    container.innerHTML = "";
    endpoint = endpoint || window.FOLK_LEADERBOARD_ENDPOINT || "";
    if (!endpoint) {
      container.appendChild(Object.assign(document.createElement("div"), { className: "clb-empty", textContent: "Mangler leaderboard-endpoint." }));
      return;
    }

    const root = document.createElement("section");
    root.className = "clb";
    const card = document.createElement("div");
    card.className = "clb-card";
    root.appendChild(card);
    const head = document.createElement("div");
    head.className = "clb-head";
    const titleWrap = document.createElement("div");
    const h3 = document.createElement("h3");
    h3.textContent = title || (quizId ? "Quiz-toppliste" : "Fag-toppliste");
    const status = document.createElement("div");
    status.className = "clb-muted";
    status.textContent = "Laster toppliste…";
    titleWrap.append(h3, status);
    head.appendChild(titleWrap);
    card.appendChild(head);
    const body = document.createElement("div");
    card.appendChild(body);
    container.appendChild(root);

    try {
      const data = await fetchLeaderboard(endpoint, courseId, quizId);
      const top = Array.isArray(data.top) ? data.top : [];
      const you = data.you || null;
      if (!top.length) {
        body.innerHTML = '<div class="clb-empty">Ingen resultater ennå.</div>';
      } else {
        const table = document.createElement("table");
        table.className = "clb-table";
        table.innerHTML = `
          <thead>
            <tr><th>#</th><th>Navn</th><th>Poeng</th><th>Forsøk</th><th>Tid</th></tr>
          </thead>
        `;
        const tbody = document.createElement("tbody");
        top.forEach((entry, index) => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td data-label="#">${index + 1}</td>
            <td data-label="Navn">${entry.name || "Anonym"}</td>
            <td data-label="Poeng">${fmtPct(entry.score_sum || 0, entry.total_sum || 0)}</td>
            <td data-label="Forsøk">${entry.quizzes || 0}</td>
            <td data-label="Tid">${fmtMs(entry.ms_sum || 0)}</td>
          `;
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        body.appendChild(table);
      }

      if (you) {
        const me = document.createElement("div");
        me.className = "clb-me";
        me.textContent = `Din plass: ${you.rank || "ukjent"} • ${fmtPct(you.score_sum || 0, you.total_sum || 0)} • ${you.quizzes || 0} forsøk • ${fmtMs(you.ms_sum || 0)}`;
        body.appendChild(me);
      }

      status.textContent = top.length ? `Viser topp ${top.length}${quizId ? " for denne quizen" : ""}.` : "Ingen resultater ennå.";
    } catch (error) {
      status.textContent = `Kunne ikke hente toppliste: ${error.message}`;
    }
  }

  window.CourseLeaderboard = {
    fetchLeaderboard,
    render
  };
})();
