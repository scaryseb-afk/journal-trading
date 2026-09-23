/* ============================================================
   Logique partagée des pages de session (sessions/*.html).
   Chaque page définit `SESSION_KEY` (ex. "2026-09-05-samedi")
   avant d'inclure ce fichier, puis appelle initSessionPage().
   Notes (trade + relecture) et captures sont stockées dans le
   localStorage du navigateur, sous une clé propre à la session.
   ============================================================ */

function sjKeyImgs()  { return 'imgs_'  + SESSION_KEY; }
function sjKeyNotes() { return 'notes_' + SESSION_KEY; }
function sjKeyStops() { return 'stops_' + SESSION_KEY; }

function sjEsc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

/* ---------- Notes (trade + relecture, même mécanisme) ---------- */
function sjLoadNotes(){ try{ return JSON.parse(localStorage.getItem(sjKeyNotes())||'{}'); }catch(e){ return {}; } }
function sjSaveNote(el){
  var key = el.getAttribute('data-key');
  var notes = sjLoadNotes();
  var val = el.value.trim();
  if(val) notes[key] = val; else delete notes[key];
  try{ localStorage.setItem(sjKeyNotes(), JSON.stringify(notes)); }catch(e){}
  sjUpdateCopyState();
}

/* ---------- Stop / objectif par trade : saisis à côté de chaque ligne, le R:R se calcule
   tout seul (Tradovate n'exporte pas le stop). Recopiés par "Copier pour Claude" avec la
   relecture, pour que Claude les structure dans window.TRADES (index.html). ---------- */
function sjLoadStops(){ try{ return JSON.parse(localStorage.getItem(sjKeyStops())||'{}'); }catch(e){ return {}; } }
function sjSaveStops(state){ try{ localStorage.setItem(sjKeyStops(), JSON.stringify(state)); }catch(e){} }
function sjFindAcctTrade(key){
  var idx = key.lastIndexOf('_');
  var acct = key.slice(0, idx), n = +key.slice(idx + 1);
  var trades = (window.ACCTS && window.ACCTS[acct]) || [];
  return trades.filter(function(t){ return t.n === n; })[0];
}
function sjTradeRRRow(key){
  var s = sjLoadStops()[key] || {};
  return '<div class="trade-rr">'
    + '<label>Stop <input type="text" inputmode="decimal" class="trade-rr-input" data-field="stop" data-key="' + key + '" value="' + sjEsc(s.stop || '') + '" placeholder="—"></label>'
    + '<label>Objectif <input type="text" inputmode="decimal" class="trade-rr-input" data-field="objectif" data-key="' + key + '" value="' + sjEsc(s.objectif || '') + '" placeholder="—"></label>'
    + '<span class="trade-rr-out" data-key="' + key + '">R:R —</span>'
    + '</div>';
}
function sjUpdateTradeRROut(key){
  var out = document.querySelector('.trade-rr-out[data-key="' + key + '"]');
  if(!out) return;
  var t = sjFindAcctTrade(key);
  var s = sjLoadStops()[key];
  out.textContent = 'R:R ' + (t ? sjComputeRR(t, s) : '—');
}
function sjInitTradeRR(){
  document.querySelectorAll('.trade-rr-input').forEach(function(inp){
    var key = inp.getAttribute('data-key');
    sjUpdateTradeRROut(key);
    inp.addEventListener('input', function(){
      var stops = sjLoadStops();
      stops[key] = stops[key] || {};
      stops[key][inp.getAttribute('data-field')] = inp.value.trim();
      if(!stops[key].stop && !stops[key].objectif) delete stops[key];
      sjSaveStops(stops);
      sjUpdateTradeRROut(key);
      sjUpdateCopyState();
    });
  });
}
function sjStopsSummaryLines(){
  var stops = sjLoadStops();
  var lines = [];
  Object.keys(stops).sort().forEach(function(key){
    var s = stops[key];
    if(!s || !s.stop || !s.objectif) return;
    var t = sjFindAcctTrade(key);
    if(!t) return;
    var idx = key.lastIndexOf('_'), acct = key.slice(0, idx);
    lines.push('Compte ' + acct + ' #' + t.n + ' (' + t.contract + ' ' + t.side + ', entrée ' + t.entry + ', sortie ' + t.exit + ') : stop ' + s.stop + ' · objectif ' + s.objectif + ' · R:R ' + sjComputeRR(t, s));
  });
  return lines;
}

/* ---------- Relecture : recopie tout dans le presse-papiers pour le coller à Claude ---------- */
var SJ_REFLECT_FIELDS = [
  { key:'reflect_erreur', label:"Erreur commise" },
  { key:'reflect_correction', label:"Ce que j'aurais dû faire" },
  { key:'reflect_ok', label:"Ce qui a bien fonctionné" }
];
function sjReflectValue(key){
  // Priorité au texte affiché dans le champ (localStorage restauré, ou pré-rempli en dur
  // dans la page) plutôt qu'au localStorage seul — sinon un texte pré-rempli par Claude
  // dans le HTML n'active pas le bouton "Copier" tant qu'il n'a pas été ré-enregistré.
  var ta = document.querySelector('.reflect-note[data-key="' + key + '"]');
  return ta ? ta.value.trim() : '';
}
function sjUpdateCopyState(){
  var btn = document.getElementById('reflect-copy-btn');
  if(!btn) return;
  var hasContent = SJ_REFLECT_FIELDS.some(function(f){ return sjReflectValue(f.key); }) || sjStopsSummaryLines().length > 0;
  btn.disabled = !hasContent;
}
function sjCopyReflect(){
  var lines = ['Relecture — ' + SESSION_KEY];
  var stopLines = sjStopsSummaryLines();
  if(stopLines.length){
    lines.push('', 'Stops / objectifs saisis :');
    stopLines.forEach(function(l){ lines.push('  ' + l); });
  }
  SJ_REFLECT_FIELDS.forEach(function(f){
    var v = sjReflectValue(f.key);
    if(v) lines.push(f.label + ' : ' + v);
  });
  var text = lines.join('\n');
  var btn = document.getElementById('reflect-copy-btn');
  function done(ok){
    if(!btn) return;
    btn.textContent = ok ? '✓ Copié — colle-le dans le chat Claude' : 'Échec de la copie';
    setTimeout(function(){ btn.textContent = '📋 Copier pour Claude'; }, 2200);
  }
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(function(){ done(true); }, function(){ done(false); });
  } else {
    done(false);
  }
}
function sjInitReflect(){
  var notes = sjLoadNotes();
  document.querySelectorAll('.reflect-note').forEach(function(ta){
    var key = ta.getAttribute('data-key');
    if(notes[key]) ta.value = notes[key]; // un texte déjà en localStorage écrase un pré-remplissage HTML
    ta.addEventListener('blur', function(){ sjSaveNote(ta); });
    ta.addEventListener('input', sjUpdateCopyState);
  });
  sjUpdateCopyState();
}

/* ---------- Captures d'écran : redimensionnées + compressées avant stockage ---------- */
var SJ_IMG_MAX_WIDTH = 1400;   // px — au-delà, une capture d'écran n'apporte rien de plus
var SJ_IMG_QUALITY   = 0.82;   // JPEG — largement suffisant pour relire un graphique

function sjSetupDrop(zoneId, inputId, handler){
  var dz = document.getElementById(zoneId);
  var fi = document.getElementById(inputId);
  if(!dz || !fi) return;
  dz.addEventListener('click', function(e){ if(e.target !== fi) fi.click(); });
  dz.addEventListener('dragover', function(e){ e.preventDefault(); dz.classList.add('drag-over'); });
  dz.addEventListener('dragleave', function(){ dz.classList.remove('drag-over'); });
  dz.addEventListener('drop', function(e){
    e.preventDefault(); dz.classList.remove('drag-over');
    Array.from(e.dataTransfer.files).forEach(handler);
  });
  fi.addEventListener('change', function(){ Array.from(fi.files).forEach(handler); fi.value = ''; });
}

function sjReadImage(file){
  if(!file.type.startsWith('image/')) return;
  var reader = new FileReader();
  reader.onload = function(e){
    var img = new Image();
    img.onload = function(){
      var scale = Math.min(1, SJ_IMG_MAX_WIDTH / img.width);
      var w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      var canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      var dataUrl = canvas.toDataURL('image/jpeg', SJ_IMG_QUALITY);
      sjStoreImage(dataUrl, file.size, dataUrl.length);
    };
    img.onerror = function(){ alert("Impossible de lire cette image."); };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
function sjStoreImage(dataUrl, origBytes, newBytes){
  var imgs = [];
  try{ imgs = JSON.parse(localStorage.getItem(sjKeyImgs()) || '[]'); }catch(e){}
  imgs.push(dataUrl);
  try{
    localStorage.setItem(sjKeyImgs(), JSON.stringify(imgs));
  }catch(e){
    imgs.pop();
    alert("Stockage plein : le navigateur limite l'espace disponible pour ce site. Supprime une ancienne capture avant d'en ajouter une nouvelle.");
    return;
  }
  sjRenderScreenshots(imgs);
}
function sjRenderScreenshots(imgs){
  var c = document.getElementById('screenshots');
  if(!c) return;
  c.innerHTML = imgs.map(function(src, i){
    return '<div class="screenshot-wrap"><img src="' + src + '" onclick="sjOpenLB(this.src)">'
         + '<button class="screenshot-del" onclick="sjDelShot(' + i + ')" title="Supprimer">×</button></div>';
  }).join('');
  var clearWrap = document.getElementById('img-clear-wrap');
  if(clearWrap) clearWrap.style.display = imgs.length ? 'block' : 'none';
}
function sjDelShot(i){
  var imgs = [];
  try{ imgs = JSON.parse(localStorage.getItem(sjKeyImgs()) || '[]'); }catch(e){}
  imgs.splice(i, 1);
  try{ localStorage.setItem(sjKeyImgs(), JSON.stringify(imgs)); }catch(e){}
  sjRenderScreenshots(imgs);
}
function sjClearScreenshots(){
  if(!confirm('Supprimer toutes les captures de cette session ?')) return;
  try{ localStorage.removeItem(sjKeyImgs()); }catch(e){}
  sjRenderScreenshots([]);
}
function sjInitImages(){
  try{
    var imgs = JSON.parse(localStorage.getItem(sjKeyImgs()) || '[]');
    if(imgs.length) sjRenderScreenshots(imgs);
  }catch(e){}
  sjSetupDrop('img-zone', 'img-input', sjReadImage);
}

/* ---------- Lightbox (zoom plein écran sur une capture) ---------- */
function sjOpenLB(src){
  var img = document.getElementById('lb-img');
  var lb = document.getElementById('lb');
  if(!img || !lb) return;
  img.src = src;
  lb.classList.add('open');
}
function sjCloseLB(e){
  var lb = document.getElementById('lb');
  if(e.target === lb) lb.classList.remove('open');
}
document.addEventListener('keydown', function(e){
  if(e.key === 'Escape'){
    var lb = document.getElementById('lb');
    if(lb) lb.classList.remove('open');
  }
});

/* ---------- Coller une capture (Ctrl+V / Cmd+V) directement dans la page ---------- */
function sjInitPaste(){
  document.addEventListener('paste', function(e){
    var items = (e.clipboardData && e.clipboardData.items) || [];
    var used = false;
    for(var i = 0; i < items.length; i++){
      if(items[i].type && items[i].type.indexOf('image/') === 0){
        var file = items[i].getAsFile();
        if(file){ sjReadImage(file); used = true; }
      }
    }
    if(used) e.preventDefault(); // n'empêche le collage normal que si une image a été trouvée
  });
}

/* ============================================================
   Import CSV — calcule tout dans le navigateur dès qu'un export
   Tradovate est déposé : compte (par plage d'ID de fill), sens,
   entrée/sortie, P&L, dédoublonnage inter-comptes. Le R:R se calcule
   dès que tu remplis le stop et l'objectif d'un trade (pas dans le
   CSV — Tradovate n'exporte pas le stop prévu).
   Reste 100% local à ce navigateur : rien n'est publié tout seul.
   ============================================================ */
var SJ_ACCOUNT_PREFIXES = {
  '63005715': '001',
  '63115902': '002',
  '61958986': '004a', /* ancien 004, cramé et clôturé le 10/09 */
  '62052092': '005',
  '63088436': '006',
  '65595938': '003',
  '66467594': '004b', /* nouveau 004, racheté le 17/09 */
  '66586596': 'A'      /* nouveau compte, ouvert le 18/09 */
};
function sjKeyCsv(){ return 'csvimport_' + SESSION_KEY; }

function sjGuessAccount(fillId){
  var prefix = String(fillId).slice(0, 8);
  return SJ_ACCOUNT_PREFIXES[prefix] || null;
}

/* Parseur CSV minimal — gère les champs entre guillemets avec virgule, suffisant pour un export Tradovate */
function sjParseCsv(text){
  var lines = text.replace(/\r\n/g, '\n').split('\n').filter(function(l){ return l.trim().length; });
  if(!lines.length) return [];
  function splitLine(line){
    var out = [], cur = '', inQ = false;
    for(var i = 0; i < line.length; i++){
      var c = line[i];
      if(c === '"'){ inQ = !inQ; }
      else if(c === ',' && !inQ){ out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out;
  }
  var headers = splitLine(lines[0]);
  return lines.slice(1).map(function(line){
    var cells = splitLine(line);
    var row = {};
    headers.forEach(function(h, i){ row[h] = cells[i]; });
    return row;
  });
}

function sjParsePnl(s){
  if(!s) return 0;
  s = s.replace(/\$/g, '').replace(/,/g, '').trim();
  var neg = s.indexOf('(') === 0;
  s = s.replace(/[()]/g, '');
  var v = parseFloat(s) || 0;
  return neg ? -v : v;
}

function sjParseTradovateDate(s){
  // "09/08/2026 15:44:39" → Date
  var m = /(\d\d)\/(\d\d)\/(\d{4})\s+(\d\d):(\d\d):(\d\d)/.exec(s || '');
  if(!m) return null;
  return new Date(+m[3], +m[1]-1, +m[2], +m[4], +m[5], +m[6]);
}

function sjShortSymbol(sym){
  if(!sym) return sym;
  if(sym.indexOf('MNQ') === 0) return 'MNQ';
  if(sym.indexOf('MGC') === 0) return 'MGC';
  if(sym.indexOf('MCL') === 0) return 'MCL';
  if(sym.indexOf('CL') === 0)  return 'CL';
  if(sym.indexOf('6E') === 0)  return '6E';
  return sym;
}

function sjRowsToTrades(rows, fallbackAcct){
  var seen = {}, trades = [];
  rows.forEach(function(r){
    if(!r.symbol) return;
    var b = sjParseTradovateDate(r.boughtTimestamp);
    var s = sjParseTradovateDate(r.soldTimestamp);
    if(!b || !s) return;
    var side, entryP, exitP, entryT;
    if(b < s){ side = 'Long'; entryP = r.buyPrice; exitP = r.sellPrice; entryT = b; }
    else     { side = 'Short'; entryP = r.sellPrice; exitP = r.buyPrice; entryT = s; }
    var pnl = sjParsePnl(r.pnl);
    var acct = sjGuessAccount(r.buyFillId) || fallbackAcct || '???';
    var dupKey = acct + '|' + r.symbol + '|' + side + '|' + r.qty + '|' + entryP + '|' + exitP + '|' + entryT.getTime();
    if(seen[dupKey]) return; // doublon d'export exact (même compte, même ligne)
    seen[dupKey] = true;
    trades.push({
      acct: acct, symbol: sjShortSymbol(r.symbol), side: side, qty: r.qty,
      entry: entryP, exit: exitP, time: entryT, pnl: pnl,
      signalKey: r.symbol + '|' + r.boughtTimestamp + '|' + r.soldTimestamp
    });
  });
  trades.sort(function(a, b){ return a.time - b.time; });
  return trades;
}

function sjLoadCsvState(){ try{ return JSON.parse(localStorage.getItem(sjKeyCsv()) || '{}'); }catch(e){ return {}; } }
function sjSaveCsvState(state){ try{ localStorage.setItem(sjKeyCsv(), JSON.stringify(state)); }catch(e){} }

function sjFmtMoney(v){
  var s = Math.abs(v).toLocaleString('fr-FR', {minimumFractionDigits:2, maximumFractionDigits:2});
  return (v >= 0 ? '+' : '−') + s + ' $';
}

function sjRenderCsvImport(){
  var host = document.getElementById('csv-import-result');
  if(!host) return;
  var state = sjLoadCsvState();
  var trades = state.trades || [];
  if(!trades.length){ host.innerHTML = ''; return; }
  trades.forEach(function(t){ if(typeof t.time === 'string') t.time = new Date(t.time); }); // survit au round-trip JSON

  // Dédoublonnage inter-comptes pour le décompte de "signaux" (mêmes trades copiés sur plusieurs comptes)
  var bySignal = {};
  trades.forEach(function(t){ (bySignal[t.signalKey] = bySignal[t.signalKey] || []).push(t); });
  var uniqueSignals = Object.keys(bySignal).length;

  var byAcct = {};
  trades.forEach(function(t){ (byAcct[t.acct] = byAcct[t.acct] || []).push(t); });

  var totalPnl = trades.reduce(function(a, t){ return a + t.pnl; }, 0);
  var h = '<div class="kpis" style="margin-top:16px">'
    + '<div class="kpi"><div class="lbl">Total (tous comptes)</div><div class="val ' + (totalPnl>=0?'pos':'neg') + '">' + sjFmtMoney(totalPnl) + '</div><div class="note">' + trades.length + ' lignes CSV</div></div>'
    + '<div class="kpi"><div class="lbl">Comptes détectés</div><div class="val">' + Object.keys(byAcct).length + '</div><div class="note">' + Object.keys(byAcct).sort().join(', ') + '</div></div>'
    + '<div class="kpi"><div class="lbl">Signaux uniques</div><div class="val">' + uniqueSignals + '</div><div class="note">' + (trades.length - uniqueSignals) + ' doublon(s) inter-comptes</div></div>'
    + '</div>';

  Object.keys(byAcct).sort().forEach(function(acct){
    var accTrades = byAcct[acct];
    var accTotal = accTrades.reduce(function(a, t){ return a + t.pnl; }, 0);
    h += '<div class="acct-header" style="margin-top:24px">'
      + '<span class="acct-label">' + (acct === '???' ? 'Compte non identifié' : 'Compte ' + acct) + '</span>'
      + '<span class="acct-pnl ' + (accTotal>=0?'td-w':'td-l') + '">' + sjFmtMoney(accTotal) + '</span></div>';
    h += '<div class="tbl-wrap"><table class="trades-table"><thead><tr>'
      + '<th>#</th><th>Contrat</th><th>Sens</th><th>Qté</th><th>Entrée</th><th>Sortie</th><th>Heure</th><th>P&amp;L</th>'
      + '<th>Stop</th><th>Objectif</th><th>R:R</th></tr></thead><tbody>';
    accTrades.forEach(function(t, i){
      var rid = acct + '_' + i;
      var rr = sjComputeRR(t, state.rr && state.rr[rid]);
      h += '<tr>'
        + '<td>' + (i+1) + '</td>'
        + '<td><strong>' + sjEsc(t.symbol) + '</strong></td>'
        + '<td>' + sjEsc(t.side) + '</td>'
        + '<td>' + sjEsc(t.qty) + '</td>'
        + '<td>' + sjEsc(t.entry) + '</td>'
        + '<td>' + sjEsc(t.exit) + '</td>'
        + '<td style="color:var(--muted);font-size:12px">' + t.time.toTimeString().slice(0,5) + '</td>'
        + '<td class="td-pnl ' + (t.pnl>=0?'td-w':'td-l') + '">' + (t.pnl>=0?'+':'') + t.pnl.toFixed(2) + ' $</td>'
        + '<td><input type="text" inputmode="decimal" class="csv-rr-input" data-rid="' + rid + '" data-field="stop" value="' + (state.rr && state.rr[rid] && state.rr[rid].stop || '') + '" placeholder="—" style="width:64px"></td>'
        + '<td><input type="text" inputmode="decimal" class="csv-rr-input" data-rid="' + rid + '" data-field="objectif" value="' + (state.rr && state.rr[rid] && state.rr[rid].objectif || '') + '" placeholder="—" style="width:64px"></td>'
        + '<td class="csv-rr-out" data-rid="' + rid + '">' + rr + '</td>'
        + '</tr>';
    });
    h += '</tbody></table></div>';
  });

  h += '<button class="clear-btn" style="margin-top:16px" onclick="sjClearCsvImport()">Effacer cet import</button>';
  host.innerHTML = h;

  host.querySelectorAll('.csv-rr-input').forEach(function(inp){
    inp.addEventListener('input', function(){
      var st = sjLoadCsvState();
      st.rr = st.rr || {};
      var rid = inp.getAttribute('data-rid');
      st.rr[rid] = st.rr[rid] || {};
      st.rr[rid][inp.getAttribute('data-field')] = inp.value;
      sjSaveCsvState(st);
      var t = sjFindTradeByRid(st, rid);
      var out = host.querySelector('.csv-rr-out[data-rid="' + rid + '"]');
      if(out && t) out.textContent = sjComputeRR(t, st.rr[rid]);
    });
  });
}

function sjFindTradeByRid(state, rid){
  var parts = rid.split('_'); var acct = parts[0], idx = +parts[1];
  var accTrades = (state.trades || []).filter(function(t){ return t.acct === acct; });
  return accTrades[idx];
}

function sjComputeRR(t, rr){
  if(!rr || !rr.stop || !rr.objectif) return '—';
  var entry = parseFloat(t.entry), stop = parseFloat(rr.stop), obj = parseFloat(rr.objectif);
  if(!isFinite(entry) || !isFinite(stop) || !isFinite(obj)) return '—';
  var risk = Math.abs(entry - stop);
  if(risk === 0) return '—';
  var reward = Math.abs(obj - entry);
  return (reward / risk).toFixed(2) + ':1';
}

function sjHandleCsvFile(file){
  var reader = new FileReader();
  reader.onload = function(e){
    var rows = sjParseCsv(e.target.result);
    var parsed = sjRowsToTrades(rows);
    var state = sjLoadCsvState();
    state.trades = (state.trades || []).concat(parsed);
    // re-sort et re-dédoublonne l'ensemble (imports cumulés)
    var seen = {}, merged = [];
    state.trades.sort(function(a,b){ return new Date(a.time) - new Date(b.time); });
    state.trades.forEach(function(t){
      var k = t.acct + '|' + t.signalKey;
      if(seen[k]) return;
      seen[k] = true;
      merged.push(t);
    });
    state.trades = merged;
    sjSaveCsvState(state);
    sjRenderCsvImport();
  };
  reader.readAsText(file);
}

function sjClearCsvImport(){
  if(!confirm("Effacer les trades importés depuis un CSV sur cette page ?")) return;
  try{ localStorage.removeItem(sjKeyCsv()); }catch(e){}
  sjRenderCsvImport();
}

function sjInitCsvImport(){
  var input = document.getElementById('csv-input');
  var zone = document.getElementById('csv-zone');
  if(!input || !zone) return;
  zone.addEventListener('click', function(e){ if(e.target !== input) input.click(); });
  zone.addEventListener('dragover', function(e){ e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', function(){ zone.classList.remove('drag-over'); });
  zone.addEventListener('drop', function(e){
    e.preventDefault(); zone.classList.remove('drag-over');
    Array.from(e.dataTransfer.files).forEach(function(f){ if(/\.csv$/i.test(f.name)) sjHandleCsvFile(f); });
  });
  input.addEventListener('change', function(){
    Array.from(input.files).forEach(sjHandleCsvFile);
    input.value = '';
  });
  sjRenderCsvImport();
}

/* ---------- Raison du trade obligatoire : signalé en rouge si vide ---------- */
function sjNoteWarnEl(ta){
  var warn = ta.nextElementSibling;
  if(!warn || !warn.classList || !warn.classList.contains('note-warn')){
    warn = document.createElement('div');
    warn.className = 'note-warn';
    warn.textContent = '⚠️ Raison du trade manquante — remplis-la pour justifier la position';
    ta.insertAdjacentElement('afterend', warn);
  }
  return warn;
}
function sjUpdateNoteState(ta){
  var empty = !ta.value.trim();
  ta.classList.toggle('missing', empty);
  sjNoteWarnEl(ta).classList.toggle('show', empty);
}
function sjInitTradeNotes(){
  document.querySelectorAll('.trade-note').forEach(function(ta){
    sjUpdateNoteState(ta);
    ta.addEventListener('input', function(){ sjUpdateNoteState(ta); });
    ta.addEventListener('blur', function(){ sjUpdateNoteState(ta); });
  });
}

/* ---------- Point d'entrée ---------- */
function initSessionPage(){
  sjInitImages();
  sjInitReflect();
  sjInitPaste();
  sjInitCsvImport();
  sjInitTradeNotes();
  sjInitTradeRR();
}
window.addEventListener('DOMContentLoaded', initSessionPage);
