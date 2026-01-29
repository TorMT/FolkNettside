/* --------------------------------------------------------------
.clb{ background:#fff; color:#111; }
.clb .wrap{ max-width:900px; margin:0 auto; padding:16px; }
.clb h3{ margin:0 0 8px; font-size:20px; }
.clb table{ width:100%; border-collapse:collapse; }
.clb th,.clb td{ border-bottom:1px solid #eee; padding:6px 8px; text-align:left; }
.clb .muted{ opacity:.75; margin:8px 0; }
`;
const s=document.createElement('style'); s.id=id; s.textContent=css; document.head.appendChild(s);
}


async function get(endpoint, courseId, deviceId){
const u = new URL(endpoint, location.origin);
u.searchParams.set('course_id', courseId);
if (deviceId) u.searchParams.set('device_id', deviceId);
const r = await fetch(u.toString(), {headers:{'Accept':'application/json'}, cache:'no-store'});
if(!r.ok) throw new Error(`Server svarte ${r.status}`);
return r.json();
}


function fmtPct(n){ return (Math.round(n*1000)/10).toFixed(1) + '%'; }
function fmtMs(ms){ const s=(ms/1000)|0, m=(s/60)|0, r=s%60; return m? `${m}m ${r}s` : `${r}s`; }


async function init(container, {courseId, title, endpoint}){
ensureCSS();
endpoint = endpoint || window.FOLK_LEADERBOARD_ENDPOINT;
if(!endpoint) { container.textContent = 'Mangler FOLK_LEADERBOARD_ENDPOINT'; return; }
if(!courseId){ container.textContent = 'Mangler courseId'; return; }


const root = document.createElement('div'); root.className='clb';
const wrap = document.createElement('div'); wrap.className='wrap'; root.appendChild(wrap);
const h = document.createElement('h3'); h.textContent = title || 'Toppliste (fag)'; wrap.appendChild(h);
const status = document.createElement('div'); status.className='muted'; wrap.appendChild(status);
const table = document.createElement('div'); wrap.appendChild(table);


container.innerHTML=''; container.appendChild(root);


try{
const deviceId = localStorage.getItem('FQ::device_id') || '';
const data = await get(endpoint, courseId, deviceId);
const top = data.top || [];
const you = data.you || null;


const t = document.createElement('table');
const thead = document.createElement('thead');
thead.innerHTML = '<tr><th>#</th><th>Navn</th><th>Poeng%</th><th>Quiz antall</th><th>Total tid</th></tr>';
t.appendChild(thead);
const tb = document.createElement('tbody');
top.forEach((e,ix)=>{
const pct = e.total_sum>0 ? (e.score_sum/e.total_sum) : 0;
const tr = document.createElement('tr');
tr.innerHTML = `<td>${ix+1}</td><td>${e.name||'Anonym'}</td><td>${fmtPct(pct)}</td><td>${e.quizzes}</td><td>${fmtMs(e.ms_sum||0)}</td>`;
tb.appendChild(tr);
});
t.appendChild(tb); table.appendChild(t);


status.textContent = `Viser topp ${top.length}.` + (you? ` Din plass: ${fmtPct((you.score_sum/you.total_sum)||0)} (${you.quizzes} quiz).` : '');
} catch(err){ status.textContent = 'Kunne ikke hente fag-toppliste: ' + err.message; }
}


window.CourseLeaderboard = { init };
})();*/
