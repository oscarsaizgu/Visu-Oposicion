/* Visu Cantabria — app de estudio local. Sin servidor: abre index.html en el navegador. */
(function(){
'use strict';
const DATA = (window.ESPECIES || []).concat(window.EXTRA || []);
const FOTOS = window.FOTOS || {};
const CAPS = window.FOTOS_CAP || {};
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fotos = e => FOTOS[e.id] || [];
const isBio = e => !e.tipo || e.tipo === 'bio';
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
  const t = $('#f-tipo').value, g = $('#f-grupo').value, p = $('#f-pri').value, v = $('#f-visu').checked, f = $('#f-foto').checked, q = norm($('#f-q').value);
  return DATA.filter(e => (!t || (e.tipo || 'bio') === t) && (!g || e.grupo === g) && (!p || e.pri === p) && (!v || e.visu) && (!f || fotos(e).length)
    && (!q || norm(e.sci).includes(q) || norm(e.com).includes(q) || norm(e.familia).includes(q) || norm(e.grupo).includes(q)));
}
['#f-tipo','#f-grupo','#f-pri','#f-visu','#f-foto','#f-q'].forEach(s => $(s).addEventListener('input', refresh));
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
  if (view === 'estudiar') stHome();
  $('#filtros').classList.toggle('hidden', view === 'estudiar');
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
    ${isBio(e) ? '' : `<dl><dt>Grupo</dt><dd>${esc(e.grupo)}</dd><dt>Rasgos clave</dt><dd>${esc(e.rasgos) || '—'}</dd>
    <dt>Cantabria / notas</dt><dd>${esc(e.cant) || '—'}</dd><dt>Nombres aceptados</dt><dd>${esc([e.sci].concat(e.alt || []).join(' · '))}</dd>
    <dt>Prioridad</dt><dd>${esc(e.pri)}</dd><dt>Salió en visu</dt><dd>${esc(e.visu) || '—'}</dd>${e.otros ? `<dt>Otros visus</dt><dd>${esc(e.otros)}</dd>` : ''}
    <dt>Tu historial</dt><dd>${s ? `${s.ok} aciertos · ${s.ko} fallos` : 'sin practicar'}</dd></dl>`}
    ${!isBio(e) ? '' : `<dl><dt>Grupo</dt><dd>${esc(e.grupo)}</dd><dt>Filum / División</dt><dd>${esc(e.filum)}</dd><dt>Clase</dt><dd>${esc(e.clase)}</dd>
    <dt>Orden</dt><dd>${esc(e.orden)}</dd><dt>Familia</dt><dd>${esc(e.familia)}</dd><dt>Estatus</dt><dd>${esc(e.est) || '—'}</dd>
    <dt>Prioridad</dt><dd>${esc(e.pri)}${e.lote ? ' (añadida desde el lote MaterialVinted)' : ''}</dd><dt>Salió en visu</dt><dd>${esc(e.visu) || '—'}</dd>${e.otros ? `<dt>Otros visus</dt><dd>${esc(e.otros)}</dd>` : ''}
    <dt>Tu historial</dt><dd>${s ? `${s.ok} aciertos · ${s.ko} fallos` : 'sin practicar'}</dd></dl>`}
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
function checkExtra(answer, e){
  const a = norm(answer); if (!a) return {pts:0, txt:'En blanco', cls:'r-ko'};
  const noms = [e.sci].concat(e.alt || []).map(norm);
  const tol = x => x.length > 12 ? 2 : (x.length > 5 ? 1 : 0);
  if (noms.some(n => lev(a, n) <= tol(n))) return {pts:1, txt: noms.includes(a) ? 'Correcto' : 'Correcto (con errata)', cls:'r-ok'};
  const w0 = s => s.split(' ')[0];
  if (e.tipo !== 'fosil' && noms.some(n => n.includes(' ') && lev(a, w0(n)) <= tol(w0(n)))) return {pts:.5, txt:'Incompleto (falta variedad o detalle)', cls:'r-mid'};
  return {pts:0, txt:'Incorrecto', cls:'r-ko'};
}
function check(answer, e){
  if (!isBio(e)) return checkExtra(answer, e);
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
  let items = shuffle(pool.slice()).slice(0, n);
  if ($('#ex-mix').checked) {
    const cuota = {mineral: .10, roca: .05, geomorf: .025, fosil: .05, micro: .125}; items = [];
    const by = t => shuffle(pool.filter(e => (e.tipo || 'bio') === t));
    Object.keys(cuota).forEach(t => items.push(...by(t).slice(0, Math.round(n * cuota[t]))));
    items.push(...by('bio').slice(0, n - items.length));
    const usados = new Set(items.map(e => e.id));
    items.push(...shuffle(pool.filter(e => !usados.has(e.id))).slice(0, n - items.length));
    items = shuffle(items);
  }
  EX = {items, i: 0, ans: [], t: +$('#ex-t').value || 25, modo: $('#ex-modo').value, timer: null};
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

/* ---------- estudiar por bloques (juego) ---------- */
const BLOQUES = [
  ['Mamíferos', e => e.grupo === 'Mamíferos'],
  ['Aves', e => e.grupo === 'Aves'],
  ['Reptiles', e => e.grupo === 'Reptiles'],
  ['Anfibios', e => e.grupo === 'Anfibios'],
  ['Peces', e => /^Peces|Mixinos|Anfioxo/.test(e.grupo)],
  ['Insectos', e => /^Insectos|Hexápodos/.test(e.grupo)],
  ['Arácnidos y miriápodos', e => /Arácnidos|Miriápodos/.test(e.grupo)],
  ['Crustáceos', e => /^Crustáceos/.test(e.grupo)],
  ['Moluscos', e => /Bivalvos|Gasterópodos|Cefalópodos|Poliplacóforos|Escafópodos|Aplacóforos|moluscos/i.test(e.grupo)],
  ['Equinodermos', e => /Erizos|Estrellas|Ofiuras|Holoturias|Crinoideos/.test(e.grupo)],
  ['Cnidarios, esponjas y ctenóforos', e => /Antozoos|Escifozoos|Hidrozoos|Esponjas|Ctenóforos/.test(e.grupo)],
  ['Gusanos y otros invertebrados', e => /Poliquetos|Clitelados|Briozoos|Tunicados|Platelmintos|Nematodos|Quetognatos|^Artrópodos$/.test(e.grupo)],
  ['Plantas con flor', e => e.grupo === 'Angiospermas' || (e.grupo === 'Plantas y algas verdes' && !/^Sequoia/.test(e.sci))],
  ['Gimnospermas', e => /^Gimnospermas/.test(e.grupo) || /^Sequoia/.test(e.sci)],
  ['Helechos y afines', e => /Helechos|Equisetos|Licopodios/.test(e.grupo)],
  ['Musgos y hepáticas', e => /Musgos|Hepáticas/.test(e.grupo)],
  ['Algas', e => /^Algas/.test(e.grupo)],
  ['Hongos y líquenes', e => e.reino === 'Hongos' || /Mixomicetos|^Hongos$/.test(e.grupo)],
  ['Minerales', e => e.tipo === 'mineral'],
  ['Rocas', e => e.tipo === 'roca'],
  ['Fósiles', e => e.tipo === 'fosil'],
  ['Microscopía', e => e.tipo === 'micro'],
  ['Geomorfología y otros', e => e.tipo === 'geomorf'],
];
const PACK = 12, SKEY = 'visu-cantabria-estudio-v1';
let SS = {};
try { SS = JSON.parse(localStorage.getItem(SKEY) || '{}'); } catch(e) { SS = {}; }
const ssave = () => { try { localStorage.setItem(SKEY, JSON.stringify(SS)); } catch(e) {} };
const bloqueDe = e => { for (const [n, f] of BLOQUES) if (f(e)) return n; return 'Otros'; };
const BYB = {};
DATA.forEach(e => { if (!fotos(e).length) return; (BYB[bloqueDe(e)] ||= []).push(e); });
const soloA = () => $('#st-a').checked;
function especiesBloque(b){
  return (BYB[b] || []).filter(e => !soloA() || e.pri === 'A')
    .sort((x, y) => (x.pri > y.pri) - (x.pri < y.pri) || (y.visu ? 1 : 0) - (x.visu ? 1 : 0) || String(x.familia).localeCompare(String(y.familia), 'es') || x.sci.localeCompare(y.sci, 'es'));
}
function packs(b){ const L = especiesBloque(b), out = []; for (let i = 0; i < L.length; i += PACK) out.push(L.slice(i, i + PACK)); return out; }
const pkey = (b, i) => (soloA() ? 'A|' : 'T|') + b + '|' + i;
const dominada = e => ST[e.id] && ST[e.id].box >= 3;
const starsHTML = n => '<span class="stars">' + '★'.repeat(n) + '<span class="off">' + '★'.repeat(3 - n) + '</span></span>';
function stHome(){
  $('#st-home').classList.remove('hidden'); $('#st-block').classList.add('hidden'); $('#st-play').classList.add('hidden');
  const html = BLOQUES.map(([b]) => b).concat(['Otros']).filter(b => especiesBloque(b).length).map(b => {
    const L = especiesBloque(b), dom = L.filter(dominada).length, P = packs(b);
    const est = P.reduce((s, _, i) => s + ((SS[pkey(b, i)] || {}).stars || 0), 0);
    const f = fotos(L.find(e => e.visu) || L[0])[0];
    return `<div class="bloque" data-b="${esc(b)}"><div class="ph">${f ? `<img loading="lazy" src="${esc(f)}" alt="">` : ''}</div>
      <div class="bl-body"><b>${esc(b)}</b><div class="small muted">${L.length} ejemplares · ${P.length} niveles · ★ ${est}/${P.length * 3}</div>
      <div class="bar"><div style="width:${100 * dom / L.length}%"></div></div><div class="small muted">${dom} dominadas</div></div></div>`;
  }).join('');
  $('#st-grid').innerHTML = html;
}
$('#st-grid').onclick = ev => { const c = ev.target.closest('.bloque'); if (c) stBlock(c.dataset.b); };
$('#st-a').onchange = () => { if (!$('#st-block').classList.contains('hidden')) stBlock(CUR.b); else stHome(); };
let CUR = {};
function stBlock(b){
  CUR = {b};
  $('#st-home').classList.add('hidden'); $('#st-play').classList.add('hidden'); $('#st-block').classList.remove('hidden');
  const P = packs(b), L = especiesBloque(b);
  const fallos = L.filter(e => ST[e.id] && ST[e.id].box <= 1 && ST[e.id].ko);
  $('#st-block-body').innerHTML = `<h2>${esc(b)}</h2>
    <p class="muted small">Cada nivel tiene ${PACK} ejemplares, parecidos entre sí (ordenados por familia; primero prioridad A y los que han salido en visu). Primero <b>Aprender</b> (tarjetas con nombre) y luego <b>Jugar</b> (eliges el nombre entre 4). Con 3 estrellas el nivel está superado.</p>
    <div class="row"><button class="primary" id="st-mix">Mezcla del bloque (20 al azar)</button>${fallos.length ? `<button id="st-fail">Repasar mis fallos (${fallos.length})</button>` : ''}</div>
    <div class="niveles">${P.map((p, i) => {
      const s = SS[pkey(b, i)] || {}, fam = [...new Set(p.map(e => e.familia).filter(Boolean))].slice(0, 4).join(', ');
      return `<div class="nivel${s.stars === 3 ? ' done' : ''}"><div><b>Nivel ${i + 1}</b> ${starsHTML(s.stars || 0)} ${s.best != null ? `<span class="small muted">mejor: ${s.best}/${p.length}</span>` : ''}
        <div class="small muted">${esc(fam || p.map(e => e.sci).slice(0, 3).join(', '))}${p.some(e => e.visu) ? ' · <span class="badge v">visu</span>' : ''}</div></div>
        <div class="nv-btn"><button data-a="learn" data-i="${i}">Aprender</button><button class="primary" data-a="play" data-i="${i}">Jugar</button></div></div>`;
    }).join('')}</div>`;
  $('#st-block-body').querySelectorAll('.nivel button').forEach(bt => bt.onclick = () => {
    const i = +bt.dataset.i; bt.dataset.a === 'learn' ? stLearn(P[i], i) : stGame(P[i], i);
  });
  $('#st-mix').onclick = () => stGame(shuffle(L.slice()).slice(0, 20), null);
  if (fallos.length) $('#st-fail').onclick = () => stGame(shuffle(fallos.slice()).slice(0, 20), null);
}
$('#st-back').onclick = stHome;
function playShell(title){
  $('#st-block').classList.add('hidden'); $('#st-play').classList.remove('hidden');
  $('#st-play-title').textContent = title;
}
$('#st-back2').onclick = () => stBlock(CUR.b);
/* aprender: tarjetas */
function stLearn(p, i){
  playShell(`${CUR.b} · Nivel ${i + 1} · Aprender`);
  let k = 0;
  const show = () => {
    const e = p[k], fs = fotos(e);
    $('#st-play-body').innerHTML = `<div class="st-count">${k + 1} / ${p.length}</div>
      <div class="ex-photo"><img id="st-img" src="${esc(fs[0] || '')}" alt=""></div>
      <div class="thumbs" id="st-thumbs">${fs.length > 1 ? fs.map((f, j) => `<img src="${esc(f)}" class="${j ? '' : 'on'}">`).join('') : ''}</div>
      <div class="sol"><i>${esc(e.sci)}</i> <span class="muted">${esc(e.com)}</span>
        <div class="small muted">${esc(e.familia || e.grupo)}${e.visu ? ` · <span class="badge v">visu ${esc(e.visu)}</span>` : ''}</div>
        ${e.rasgos ? `<div class="small" style="margin-top:6px">${esc(e.rasgos)}</div>` : ''}</div>
      <div class="row"><button id="st-prev" ${k ? '' : 'disabled'}>← Anterior</button>
        ${k < p.length - 1 ? '<button class="primary" id="st-next">Siguiente →</button>' : '<button class="primary" id="st-go">¡A jugar!</button>'}</div>`;
    $('#st-thumbs').querySelectorAll('img').forEach(t => t.onclick = () => { $('#st-img').src = t.src; $('#st-thumbs').querySelectorAll('img').forEach(x => x.classList.toggle('on', x === t)); });
    $('#st-prev').onclick = () => { k--; show(); };
    if ($('#st-next')) $('#st-next').onclick = () => { k++; show(); };
    if ($('#st-go')) $('#st-go').onclick = () => stGame(p, i);
  };
  show();
  CUR.keys = ev => { if (ev.key === 'ArrowRight' && $('#st-next')) $('#st-next').click(); if (ev.key === 'ArrowLeft' && k) $('#st-prev').click(); };
}
/* jugar: 4 opciones */
function opciones(e){
  const pool = (BYB[CUR.b] || []).filter(x => x.id !== e.id && x.sci !== e.sci);
  const fam = shuffle(pool.filter(x => x.familia && x.familia === e.familia)).slice(0, 2);
  const gen = shuffle(pool.filter(x => x.sci.split(' ')[0] === e.sci.split(' ')[0] && !fam.includes(x))).slice(0, 1);
  const rest = shuffle(pool.filter(x => !fam.includes(x) && !gen.includes(x)));
  return shuffle([e, ...gen, ...fam, ...rest].slice(0, 4));
}
function stGame(p, i){
  playShell(`${CUR.b} · ${i == null ? 'Mezcla' : 'Nivel ' + (i + 1)} · Jugar`);
  const items = shuffle(p.slice()); let k = 0, ok = 0, pts = 0, racha = 0; const fallos = [];
  const show = () => {
    const e = items[k], fs = fotos(e), ops = opciones(e);
    $('#st-play-body').innerHTML = `<div class="st-count">${k + 1} / ${items.length} <span class="st-pts">${pts} pts${racha > 1 ? ` · racha ×${racha}` : ''}</span></div>
      <div class="ex-photo"><img id="st-img" src="${esc(fs[Math.floor(Math.random() * fs.length)] || '')}" alt=""></div>
      <div class="opts">${ops.map(o => `<button class="opt" data-id="${esc(o.id)}"><i>${esc(o.sci)}</i>${(o.tipo || 'bio') === 'bio' && o.com ? `<span class="small muted">${esc(o.com.split(',')[0])}</span>` : ''}</button>`).join('')}</div>
      <div id="st-fb" class="small"></div>`;
    $('#st-play-body').querySelectorAll('.opt').forEach(b => b.onclick = () => {
      if (b.parentNode.classList.contains('done')) return;
      b.parentNode.classList.add('done');
      const acierto = b.dataset.id === e.id;
      b.classList.add(acierto ? 'good' : 'bad');
      $('#st-play-body').querySelector(`.opt[data-id="${CSS.escape(e.id)}"]`).classList.add('good');
      grade(e.id, acierto);
      if (acierto) { ok++; racha++; pts += 10 * Math.min(racha, 5); } else { racha = 0; fallos.push(e); }
      $('#st-fb').innerHTML = acierto ? '<span class="r-ok">¡Bien!</span>' : `<span class="r-ko">Era <i>${esc(e.sci)}</i></span> <span class="muted">${esc(e.com)}</span>`;
      setTimeout(() => { k++; k < items.length ? show() : fin(); }, acierto ? 700 : 1800);
    });
  };
  const fin = () => {
    const pc = ok / items.length, stars = pc >= .9 ? 3 : pc >= .75 ? 2 : pc >= .5 ? 1 : 0;
    if (i != null) { const s = SS[pkey(CUR.b, i)] ||= {}; s.stars = Math.max(s.stars || 0, stars); s.best = Math.max(s.best || 0, ok); ssave(); }
    const P = packs(CUR.b);
    $('#st-play-body').innerHTML = `<h2>${ok} / ${items.length} ${starsHTML(stars)}</h2><p class="score">${pts} puntos</p>
      ${fallos.length ? `<p class="muted">Fallaste estos (vuelven en el Repaso espaciado):</p><div class="grid">${fallos.map(e => cardHTML(e, true)).join('')}</div>` : '<p>¡Sin fallos!</p>'}
      <div class="row"><button id="st-again">Repetir</button>${fallos.length ? '<button id="st-refail">Jugar solo los fallos</button>' : ''}
      ${i != null && i + 1 < P.length ? '<button class="primary" id="st-nextlvl">Siguiente nivel →</button>' : ''}<button id="st-toblock">Volver al bloque</button></div>`;
    $('#st-again').onclick = () => stGame(p, i);
    if ($('#st-refail')) $('#st-refail').onclick = () => stGame(fallos, null);
    if ($('#st-nextlvl')) $('#st-nextlvl').onclick = () => stLearn(P[i + 1], i + 1);
    $('#st-toblock').onclick = () => stBlock(CUR.b);
  };
  CUR.keys = ev => { const n = +ev.key; if (n >= 1 && n <= 4) { const b = $('#st-play-body').querySelectorAll('.opt')[n - 1]; if (b) b.click(); } };
  show();
}
document.addEventListener('keydown', ev => { if (view === 'estudiar' && CUR.keys && !$('#st-play').classList.contains('hidden')) CUR.keys(ev); });

/* ---------- arranque ---------- */
if (!Object.keys(FOTOS).length) { $('#f-foto').checked = false; }
refresh();
})();
