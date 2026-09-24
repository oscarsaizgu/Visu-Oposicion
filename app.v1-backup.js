/* Visu Cantabria — app de estudio local. Sin servidor: abre index.html en el navegador. */
(function(){
'use strict';
const DATA = (window.ESPECIES || []).concat(window.EXTRA || []);
const FOTOS = window.FOTOS || {};
const CAPS = window.FOTOS_CAP || {};
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fotos = e => FOTOS[e.id] || [];
const DAY = 864e5, INTERVALS = [0, 1, 3, 7, 14, 30];

/* ---------- progreso (localStorage) ---------- */
const KEY = 'visu-cantabria-v1';
let ST = {};
try { ST = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch(e) { ST = {}; }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(ST)); } catch(e) {} };
const st = id => (ST[id] ||= {box:0, due:0, ok:0, ko:0, seen:0});
function grade(id, ok){
  const s = st(id); s.seen++;
  if (ok) { s.ok++; s.box = Math.min(s.box + 1, INTERVALS.length - 1); }
  else { s.ko++; s.box = 1; }
  s.due = Date.now() + INTERVALS[s.box] * DAY - 3600e3;
  s.last = Date.now(); save();
}

/* ---------- filtros ---------- */
const grupos = [...new Set(DATA.map(e => e.grupo))].sort((a,b) => a.localeCompare(b,'es'));
$('#f-grupo').insertAdjacentHTML('beforeend', grupos.map(g => `<option>${esc(g)}</option>`).join(''));
const norm = s => String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9 -]/g,' ').replace(/\s+/g,' ').trim();
function filtered(){
  const g = $('#f-grupo').value, p = $('#f-pri').value, v = $('#f-visu').checked, f = $('#f-foto').checked, q = norm($('#f-q').value);
  return DATA.filter(e => (!g || e.grupo === g) && (!p || e.pri === p) && (!v || e.visu) && (!f || fotos(e).length)
    && (!q || norm(e.sci).includes(q) || norm(e.com).includes(q) || norm(e.familia).includes(q)));
}
['#f-grupo','#f-pri','#f-visu','#f-foto','#f-q'].forEach(s => $(s).addEventListener('input', refresh));
function refresh(){ const n = filtered().length; $('#f-n').textContent = n + ' ejemplares'; if (view === 'explorar') renderGrid(true); if (view === 'repaso') rpNext(); }

/* ---------- vistas ---------- */
let view = 'explorar';
document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => {
  document.querySelectorAll('#tabs button').forEach(x => x.classList.toggle('on', x === b));
  view = b.dataset.view;
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('on', v.id === 'v-' + view));
  if (view === 'explorar') renderGrid(true);
  if (view === 'repaso') rpNext();
  if (view === 'progreso') renderPg();
});

/* ---------- explorar ---------- */
let shown = 0, list = [];
function cardHTML(e, reveal){
  const f = fotos(e)[0];
  return `<div class="card" data-id="${esc(e.id)}">
    <div class="ph">${f ? `<img loading="lazy" src="${esc(f)}" alt="">` : 'Sin foto'}</div>
    <div class="nm">${reveal ? `<i>${esc(e.sci)}</i>${esc(e.com)}` : `<span class="q">¿Qué es?</span>`}
      <div class="tag">${e.pri === 'A' ? '<span class="badge">A</span>' : ''}${e.visu ? `<span class="badge v">visu ${esc(e.visu)}</span>` : ''}${esc(e.grupo)}</div></div></div>`;
}
function renderGrid(reset){
  if (reset) { list = filtered(); shown = 0; $('#grid').innerHTML = ''; }
  const rev = $('#x-nombres').checked, next = list.slice(shown, shown + 60);
  $('#grid').insertAdjacentHTML('beforeend', next.map(e => cardHTML(e, rev)).join(''));
  shown += next.length;
  $('#x-more').classList.toggle('hidden', shown >= list.length);
}
$('#x-more').onclick = () => renderGrid(false);
$('#x-nombres').onchange = () => renderGrid(true);
$('#grid').onclick = ev => {
  const c = ev.target.closest('.card'); if (!c) return;
  const e = DATA.find(x => x.id === c.dataset.id);
  const nm = c.querySelector('.nm');
  if (!$('#x-nombres').checked && nm.querySelector('.q')) { nm.innerHTML = `<i>${esc(e.sci)}</i>${esc(e.com)}<div class="tag">${esc(e.grupo)}</div>`; return; }
  openDetail(e);
};
function openDetail(e){
  const fs = fotos(e), s = ST[e.id];
  $('#m-body').innerHTML = `<div class="det">
    <h2 style="margin:0 0 4px"><i>${esc(e.sci)}</i></h2><div class="muted">${esc(e.com)}</div>
    <div class="det-photos">${fs.length ? `<img class="big" id="d-big" src="${esc(fs[0])}"><div class="thumbs">${fs.map((f,i)=>`<img src="${esc(f)}" title="${esc((CAPS[e.id]||[])[i]||'')}" class="${i?'':'on'}">`).join('')}</div><div class="small muted" id="d-cap">${esc((CAPS[e.id]||[])[0]||'')}</div>` : '<p class="muted">Sin foto descargada.</p>'}</div>
    <dl><dt>Grupo</dt><dd>${esc(e.grupo)}</dd><dt>Filum / División</dt><dd>${esc(e.filum)}</dd><dt>Clase</dt><dd>${esc(e.clase)}</dd>
    <dt>Orden</dt><dd>${esc(e.orden)}</dd><dt>Familia</dt><dd>${esc(e.familia)}</dd><dt>Estatus</dt><dd>${esc(e.est) || '—'}</dd>
    <dt>Prioridad</dt><dd>${esc(e.pri)}</dd><dt>Salió en visu</dt><dd>${esc(e.visu) || '—'}</dd>
    <dt>Tu historial</dt><dd>${s ? `${s.ok} aciertos · ${s.ko} fallos` : 'sin practicar'}</dd></dl>
    ${e.url ? `<p><a href="${esc(e.url)}" target="_blank" rel="noopener">Ver ficha en asturnatura ↗</a></p>` : ''}</div>`;
  $('#modal').classList.remove('hidden');
  const big = $('#d-big');
  if (big) $('#m-body').querySelectorAll('.thumbs img').forEach(t => t.onclick = () => { big.src = t.src; $('#d-cap').textContent = t.title; $('#m-body').querySelectorAll('.thumbs img').forEach(x => x.classList.toggle('on', x === t)); });
}
$('#m-close').onclick = () => $('#modal').classList.add('hidden');
$('#modal').onclick = ev => { if (ev.target.id === 'modal') $('#modal').classList.add('hidden'); };

/* ---------- visor de fotos (examen / repaso) ---------- */
function showPhotos(e, img, noph, thumbs){
  const fs = fotos(e);
  img.classList.toggle('hidden', !fs.length); noph.classList.toggle('hidden', !!fs.length);
  if (fs.length) img.src = fs[0];
  thumbs.innerHTML = fs.length > 1 ? fs.map((f,i)=>`<img src="${esc(f)}" class="${i?'':'on'}">`).join('') : '';
  thumbs.querySelectorAll('img').forEach(t => t.onclick = () => { img.src = t.src; thumbs.querySelectorAll('img').forEach(x => x.classList.toggle('on', x === t)); });
}
const solHTML = e => `<i>${esc(e.sci)}</i> <span class="muted">${esc(e.com)}</span><div class="small muted">${esc(e.grupo)} · ${esc(e.familia)}${e.url ? ` · <a href="${esc(e.url)}" target="_blank" rel="noopener">ficha</a>` : ''}</div>`;

/* ---------- corrección de nombres ---------- */
function lev(a, b){
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({length:n+1}, (_,j) => j);
  for (let i = 1; i <= m; i++) { const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j]+1, cur[j-1]+1, prev[j-1] + (a[i-1] === b[j-1] ? 0 : 1));
    prev = cur; }
  return prev[n];
}
function check(answer, e){
  const a = norm(answer).replace(/\bsp+\b\.?/g,'').trim().split(' '), s = norm(e.sci).split(' ');
  if (!a[0]) return {pts:0, txt:'En blanco', cls:'r-ko'};
  const genOk = lev(a[0], s[0]) <= (s[0].length > 6 ? 1 : 0);
  if (!genOk) return {pts:0, txt:'Incorrecto', cls:'r-ko'};
  if (s.length === 1) return {pts:1, txt:'Correcto', cls:'r-ok'};
  if (!a[1]) return {pts:.5, txt:'Solo género', cls:'r-mid'};
  const d = lev(a[1], s[1]);
  if (d === 0 && genOk && lev(a[0], s[0]) === 0) return {pts:1, txt:'Correcto', cls:'r-ok'};
  if (d <= 1) return {pts:1, txt:'Correcto (con errata)', cls:'r-ok'};
  return {pts:.5, txt:'Género bien, especie mal', cls:'r-mid'};
}

/* ---------- examen ---------- */
let EX = null;
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
$('#ex-go').onclick = () => {
  const pool = filtered();
  if (!pool.length) { alertMsg('No hay ejemplares con esos filtros.'); return; }
  const n = Math.min(+$('#ex-n').value || 40, pool.length);
  EX = {items: shuffle(pool.slice()).slice(0, n), i: 0, ans: [], t: +$('#ex-t').value || 25, modo: $('#ex-modo').value, timer: null};
  $('#ex-setup').classList.add('hidden'); $('#ex-res').classList.add('hidden'); $('#ex-run').classList.remove('hidden');
  $('#ex-write').classList.toggle('hidden', EX.modo !== 'escribir'); $('#ex-auto').classList.toggle('hidden', EX.modo !== 'auto');
  exShow();
};
function exShow(){
  const e = EX.items[EX.i];
  $('#ex-count').textContent = `Ejemplar ${EX.i + 1} de ${EX.items.length}`;
  showPhotos(e, $('#ex-img'), $('#ex-nophoto'), $('#ex-thumbs'));
  $('#ex-answer').value = ''; $('#ex-sol').classList.add('hidden'); $('#ex-mark').classList.add('hidden'); $('#ex-reveal').classList.remove('hidden');
  if (EX.modo === 'escribir') setTimeout(() => $('#ex-answer').focus(), 30);
  let left = EX.t; const tEl = $('#ex-timer');
  clearInterval(EX.timer); tEl.textContent = left + ' s'; tEl.classList.remove('low');
  EX.timer = setInterval(() => {
    left--; tEl.textContent = Math.max(left,0) + ' s'; tEl.classList.toggle('low', left <= 5);
    if (left <= 0) { clearInterval(EX.timer); if (EX.modo === 'escribir') exNext(); else exReveal(); }
  }, 1000);
}
function exNext(){
  if (!EX) return;
  const e = EX.items[EX.i];
  if (EX.modo === 'escribir') { const r = check($('#ex-answer').value, e); EX.ans.push({e, a: $('#ex-answer').value, r}); grade(e.id, r.pts === 1); }
  EX.i++;
  if (EX.i >= EX.items.length) exEnd(); else exShow();
}
function exReveal(){ clearInterval(EX.timer); $('#ex-sol').innerHTML = solHTML(EX.items[EX.i]); $('#ex-sol').classList.remove('hidden'); $('#ex-mark').classList.remove('hidden'); $('#ex-reveal').classList.add('hidden'); }
function exMark(ok){ const e = EX.items[EX.i]; EX.ans.push({e, a: '', r: ok ? {pts:1, txt:'Acertado', cls:'r-ok'} : {pts:0, txt:'Fallado', cls:'r-ko'}}); grade(e.id, ok); EX.i++; if (EX.i >= EX.items.length) exEnd(); else exShow(); }
$('#ex-next').onclick = exNext;
$('#ex-answer').onkeydown = ev => { if (ev.key === 'Enter') exNext(); };
$('#ex-reveal').onclick = exReveal;
$('#ex-ok').onclick = () => exMark(true);
$('#ex-ko').onclick = () => exMark(false);
$('#ex-stop').onclick = () => { if (EX) { clearInterval(EX.timer); exEnd(); } };
function exEnd(){
  clearInterval(EX.timer);
  const tot = EX.ans.reduce((s,x) => s + x.r.pts, 0), n = EX.ans.length || 1;
  $('#ex-run').classList.add('hidden');
  $('#ex-res').innerHTML = `<h2>Resultado</h2><div class="score">${tot.toLocaleString('es')} / ${EX.ans.length} <span class="muted small">(${Math.round(100*tot/n)} %)</span></div>
    <p class="muted small">Criterio de corrección orientativo: nombre científico completo = 1; solo género = 0,5. El tribunal puede ser más estricto.</p>
    <table class="res"><tr><th></th><th>Solución</th><th>Tu respuesta</th><th></th></tr>
    ${EX.ans.map(x => `<tr><td>${fotos(x.e)[0] ? `<img src="${esc(fotos(x.e)[0])}">` : ''}</td><td>${solHTML(x.e)}</td><td>${esc(x.a) || '<span class="muted">—</span>'}</td><td class="${x.r.cls}">${x.r.txt}</td></tr>`).join('')}</table>
    <div class="row"><button class="primary" id="ex-again">Otro simulacro</button></div>`;
  $('#ex-res').classList.remove('hidden');
  $('#ex-again').onclick = () => { $('#ex-res').classList.add('hidden'); $('#ex-setup').classList.remove('hidden'); };
  EX = null;
}

/* ---------- repaso espaciado ---------- */
let RP = null;
function rpNext(){
  const now = Date.now(), pool = filtered();
  const due = pool.filter(e => ST[e.id] && ST[e.id].due <= now).sort((a,b) => ST[a.id].box - ST[b.id].box || ST[a.id].due - ST[b.id].due);
  const nuevos = pool.filter(e => !ST[e.id]).sort((a,b) => (a.pri > b.pri) - (a.pri < b.pri) || (b.visu ? 1 : 0) - (a.visu ? 1 : 0));
  $('#rp-info').innerHTML = `<p><b>${due.length}</b> para repasar hoy · <b>${nuevos.length}</b> sin ver todavía</p>`;
  RP = due[0] || nuevos[0] || null;
  $('#rp-card').classList.toggle('hidden', !RP);
  if (!RP) { $('#rp-info').insertAdjacentHTML('beforeend', '<p>¡Nada pendiente con estos filtros! Vuelve mañana o cambia los filtros.</p>'); return; }
  showPhotos(RP, $('#rp-img'), $('#rp-nophoto'), $('#rp-thumbs'));
  $('#rp-sol').classList.add('hidden'); $('#rp-mark').classList.add('hidden'); $('#rp-reveal').classList.remove('hidden');
}
$('#rp-reveal').onclick = () => { $('#rp-sol').innerHTML = solHTML(RP); $('#rp-sol').classList.remove('hidden'); $('#rp-mark').classList.remove('hidden'); $('#rp-reveal').classList.add('hidden'); };
$('#rp-ok').onclick = () => { grade(RP.id, true); rpNext(); };
$('#rp-ko').onclick = () => { grade(RP.id, false); rpNext(); };
document.addEventListener('keydown', ev => {
  if (view !== 'repaso' || !RP || ev.target.tagName === 'INPUT') return;
  if (ev.key === ' ') { ev.preventDefault(); if (!$('#rp-reveal').classList.contains('hidden')) $('#rp-reveal').click(); }
  if (ev.key === 'ArrowRight' && !$('#rp-mark').classList.contains('hidden')) $('#rp-ok').click();
  if (ev.key === 'ArrowLeft' && !$('#rp-mark').classList.contains('hidden')) $('#rp-ko').click();
});

/* ---------- progreso ---------- */
function renderPg(){
  const by = {};
  DATA.forEach(e => { const g = (by[e.grupo] ||= {n:0, vistos:0, dom:0}); g.n++; const s = ST[e.id]; if (s) { g.vistos++; if (s.box >= 3) g.dom++; } });
  const tot = Object.values(by).reduce((a,g) => ({n:a.n+g.n, vistos:a.vistos+g.vistos, dom:a.dom+g.dom}), {n:0, vistos:0, dom:0});
  const rowH = (name, g) => `<tr><td>${esc(name)}</td><td>${g.n}</td><td>${g.vistos}</td><td>${g.dom}</td><td><div class="bar"><div style="width:${g.n ? 100*g.dom/g.n : 0}%"></div></div></td></tr>`;
  $('#pg').innerHTML = `<p class="muted small">"Dominadas" = acertadas varias veces seguidas (caja 3 o más del repaso espaciado).</p>
    <table class="pg"><tr><th>Grupo</th><th>Total</th><th>Vistas</th><th>Dominadas</th><th></th></tr>
    ${rowH('TOTAL', tot)}${Object.keys(by).sort((a,b)=>a.localeCompare(b,'es')).map(k => rowH(k, by[k])).join('')}</table>`;
}
$('#pg-export').onclick = () => {
  const blob = new Blob([JSON.stringify(ST)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'progreso-visu-' + new Date().toISOString().slice(0,10) + '.json'; a.click();
};
$('#pg-import').onchange = ev => {
  const f = ev.target.files[0]; if (!f) return;
  f.text().then(t => { ST = JSON.parse(t); save(); renderPg(); alertMsg('Progreso importado.'); }).catch(() => alertMsg('Archivo no válido.'));
};
$('#pg-reset').onclick = () => { if (confirm('¿Seguro que quieres borrar todo tu progreso?')) { ST = {}; save(); renderPg(); } };
function alertMsg(t){ $('#m-body').innerHTML = `<p>${esc(t)}</p>`; $('#modal').classList.remove('hidden'); }

/* ---------- arranque ---------- */
if (!Object.keys(FOTOS).length) { $('#f-foto').checked = false; }
refresh();
})();
