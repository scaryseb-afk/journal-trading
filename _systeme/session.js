/* ============================================================
   Logique partagée des pages de session (sessions/*.html).
   Chaque page définit `SESSION_KEY` (ex. "2026-09-05-samedi")
   avant d'inclure ce fichier, puis appelle initSessionPage().
   Notes (trade + relecture) et captures sont stockées dans le
   localStorage du navigateur, sous une clé propre à la session.
   ============================================================ */

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
/* Niveaux enregistrés dans la page par Claude (SJ_LEVELS, lus sur une capture collée dans le chat : { stop, objectif, rr, entry, src }) : ils servent de
   valeurs de départ ; ce que Sébastien saisit lui-même dans les champs (localStorage) prime. `src` s'affiche à côté du R:R tant que ce sont ces valeurs.
   `entry` (facultatif) = prix d'entrée de l'outil de position quand il est décalé du fill du CSV (ex. 26/10 : outil 8 pts sous le fill) : le R:R se calcule alors
   avec lui plutôt qu'avec le fill, pour retrouver celui de l'outil. */
function sjLevels(key){
  var d = (window.SJ_LEVELS && window.SJ_LEVELS[key]) || {}, l = sjLoadStops()[key] || {};
  var mine = !!(l.stop || l.objectif || l.rr);
  return { stop: l.stop || d.stop || '', objectif: l.objectif || d.objectif || '', rr: l.rr || d.rr || '', entry: mine ? '' : (d.entry || ''), src: mine ? '' : (d.src || '') };
}
function sjTradeRRRow(key){
  var s = sjLevels(key);
  return '<div class="trade-rr">'
    + '<label>Stop <input type="text" inputmode="decimal" class="trade-rr-input" data-field="stop" data-key="' + key + '" value="' + sjEsc(s.stop || '') + '" placeholder="—"></label>'
    + '<label>Objectif <input type="text" inputmode="decimal" class="trade-rr-input" data-field="objectif" data-key="' + key + '" value="' + sjEsc(s.objectif || '') + '" placeholder="—"></label>'
    + '<label title="Si tu n\'as pas noté le stop et l\'objectif : ton R:R à la main (ex. 2 ou 2,5)">R:R <input type="text" inputmode="decimal" class="trade-rr-input" data-field="rr" data-key="' + key + '" value="' + sjEsc(s.rr || '') + '" placeholder="manuel"></label>'
    + '<span class="trade-rr-out" data-key="' + key + '">R:R —</span>'
    + '</div>';
}
function sjComputeRR(t, rr){
  if(!rr || !rr.stop || !rr.objectif) return '—';
  var entry = parseFloat(rr.entry || t.entry), stop = parseFloat(rr.stop), obj = parseFloat(rr.objectif);
  if(!isFinite(entry) || !isFinite(stop) || !isFinite(obj)) return '—';
  var risk = Math.abs(entry - stop);
  if(risk === 0) return '—';
  var reward = Math.abs(obj - entry);
  return (reward / risk).toFixed(2) + ':1';
}
/* R:R saisi à la main (« 2 », « 2,5 », « 2:1 ») : sert quand stop/objectif ne sont pas notés */
function sjParseRR(v){
  var n = parseFloat(String(v == null ? '' : v).trim().replace(',', '.').replace(/:\s*1$/, ''));
  return (isFinite(n) && n > 0) ? n : null;
}
function sjRRText(t, s){
  var auto = t ? sjComputeRR(t, s) : '—';
  if(auto !== '—') return auto;
  var man = s ? sjParseRR(s.rr) : null;
  return man ? man.toFixed(2) + ':1 (manuel)' : '—';
}
function sjUpdateTradeRROut(key){
  var out = document.querySelector('.trade-rr-out[data-key="' + key + '"]');
  if(!out) return;
  var t = sjFindAcctTrade(key);
  var s = sjLevels(key);
  out.textContent = 'R:R ' + sjRRText(t, s) + (s.src ? ' · ' + s.src : '');
}
function sjInitTradeRR(){
  document.querySelectorAll('.trade-rr-input').forEach(function(inp){
    var key = inp.getAttribute('data-key');
    sjUpdateTradeRROut(key);
    inp.addEventListener('input', function(){
      var stops = sjLoadStops();
      stops[key] = stops[key] || {};
      stops[key][inp.getAttribute('data-field')] = inp.value.trim();
      if(!stops[key].stop && !stops[key].objectif && !stops[key].rr) delete stops[key];
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
    if(!s) return;
    var t = sjFindAcctTrade(key);
    if(!t) return;
    var idx = key.lastIndexOf('_'), acct = key.slice(0, idx);
    var head = 'Compte ' + acct + ' #' + t.n + ' (' + t.contract + ' ' + t.side + ', entrée ' + t.entry + ', sortie ' + t.exit + ') : ';
    if(s.stop && s.objectif){
      lines.push(head + 'stop ' + s.stop + ' · objectif ' + s.objectif + ' · R:R ' + sjComputeRR(t, s));
    } else if(sjParseRR(s.rr)){
      lines.push(head + 'R:R ' + sjParseRR(s.rr).toFixed(2) + ':1 (saisi à la main, stop/objectif non notés)');
    }
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
  sjSetupDropEl(document.getElementById(zoneId), document.getElementById(inputId), handler);
}
function sjSetupDropEl(dz, fi, handler){
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

function sjReadImage(file, key){
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
      sjStoreImage(dataUrl, file.size, dataUrl.length, key);
    };
    img.onerror = function(){ alert("Impossible de lire cette image."); };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
function sjStoreImage(dataUrl, origBytes, newBytes, key){
  sjImgReady.then(function(){
    var prev = sjLoadTradeImgs(key), timgs = prev.concat([dataUrl]);
    sjSaveTradeImgs(key, timgs, function(ok){
      if(ok) return;
      if(SJ_IDB) SJ_IMG_MEM[sjKeyTradeImgs(key)] = prev;   // écriture refusée : retour à l'état d'avant
      sjRenderTradeShots(key);
      alert("Stockage plein : le navigateur limite l'espace disponible pour ce site. Supprime une ancienne capture avant d'en ajouter une nouvelle.");
    });
    sjRenderTradeShots(key);
  });
}

/* ---------- Captures sous chaque trade (clé imgs_<session>__<compte>_<n>) ----------
   Stockage : IndexedDB (base « journal-images », magasin « imgs », même clé, valeur = tableau de data-URL JPEG). Les captures
   étaient avant des data-URL dans localStorage : ~5 Mo pour tout le site, soit 15 à 30 captures toutes séances confondues avant
   « Stockage plein ». localStorage ne garde plus qu'un témoin sous la même clé — un tableau de 1, un par capture — pour que
   l'onglet Sessions d'index.html (icône 📷) fonctionne sans rien changer. Les anciennes captures encore en localStorage (toutes
   séances) sont migrées au chargement : copiées dans IndexedDB, remplacées par le témoin seulement une fois l'écriture confirmée.
   Sans IndexedDB (navigation privée restrictive), repli sur l'ancien stockage localStorage. */
var sjHoverKey = null;
var SJ_IDB = null;       // connexion IndexedDB une fois ouverte (null : indisponible, repli localStorage)
var SJ_IMG_MEM = {};     // clé complète → tableau de data-URL, pour les captures de cette séance (chargées depuis IndexedDB)
function sjKeyTradeImgs(key){ return 'imgs_' + SESSION_KEY + '__' + key; }
function sjIsDataUrl(x){ return typeof x === 'string' && x.indexOf('data:') === 0; }
function sjLoadTradeImgs(key){
  var k = sjKeyTradeImgs(key);
  if(SJ_IMG_MEM[k]) return SJ_IMG_MEM[k];
  try{ return JSON.parse(localStorage.getItem(k) || '[]').filter(sjIsDataUrl); }catch(e){ return []; }   // ancien format, pas encore migré
}
function sjFlag(k, n){ var a = []; for(var i = 0; i < n; i++) a.push(1); localStorage.setItem(k, JSON.stringify(a)); }
function sjSaveTradeImgs(key, imgs, cb){
  var k = sjKeyTradeImgs(key);
  if(SJ_IDB){
    SJ_IMG_MEM[k] = imgs;   // l'affichage n'attend pas l'écriture
    sjIdbPut(k, imgs).then(function(ok){
      if(ok){ try{ if(imgs.length) sjFlag(k, imgs.length); else localStorage.removeItem(k); }catch(e){} }
      if(cb) cb(ok);
    });
    return;
  }
  var ok = true;
  try{
    if(imgs.length) localStorage.setItem(k, JSON.stringify(imgs));
    else localStorage.removeItem(k);
  }catch(e){ ok = false; }
  if(cb) cb(ok);
}
function sjIdbOpen(){
  return new Promise(function(resolve){
    try{
      if(!window.indexedDB){ resolve(null); return; }
      var rq = indexedDB.open('journal-images', 1);
      rq.onupgradeneeded = function(){ rq.result.createObjectStore('imgs'); };
      rq.onsuccess = function(){ resolve(rq.result); };
      rq.onerror = rq.onblocked = function(){ resolve(null); };
    }catch(e){ resolve(null); }
  });
}
function sjIdbReq(mode, fn){   // une transaction ; résout { ok, … } quand elle est terminée
  return new Promise(function(resolve){
    if(!SJ_IDB){ resolve({ ok: false }); return; }
    try{
      var tx = SJ_IDB.transaction('imgs', mode), out = {};
      fn(tx.objectStore('imgs'), out);
      tx.oncomplete = function(){ out.ok = true; resolve(out); };
      tx.onerror = tx.onabort = function(){ out.ok = false; resolve(out); };
    }catch(e){ resolve({ ok: false }); }
  });
}
function sjIdbPut(k, arr){ return sjIdbReq('readwrite', function(st){ if(arr.length) st.put(arr, k); else st['delete'](k); }).then(function(r){ return r.ok; }); }
function sjIdbGet(k){ return sjIdbReq('readonly', function(st, out){ var rq = st.get(k); rq.onsuccess = function(){ out.val = rq.result; }; }).then(function(r){ return r.ok ? r.val : undefined; }); }
function sjIdbSession(){   // toutes les captures de la séance courante
  var pre = 'imgs_' + SESSION_KEY + '__';
  return sjIdbReq('readonly', function(st, out){
    out.map = {};
    var cur = st.openCursor(IDBKeyRange.bound(pre, pre + '￿'));
    cur.onsuccess = function(){ var c = cur.result; if(c){ out.map[c.key] = c.value; c['continue'](); } };
  }).then(function(r){ return r.map || {}; });
}
function sjMigrateLegacy(){   // anciennes captures (data-URL en localStorage), toutes séances confondues
  var keys = [];
  try{ for(var i = 0; i < localStorage.length; i++){ var k = localStorage.key(i); if(k && k.indexOf('imgs_') === 0) keys.push(k); } }
  catch(e){ return Promise.resolve(); }
  return keys.reduce(function(p, k){
    return p.then(function(){
      var urls = [];
      try{ urls = JSON.parse(localStorage.getItem(k) || '[]').filter(sjIsDataUrl); }catch(e){}
      if(!urls.length) return;
      return sjIdbGet(k).then(function(old){
        old = old || [];
        var merged = old.concat(urls.filter(function(u){ return old.indexOf(u) < 0; }));
        return sjIdbPut(k, merged).then(function(ok){
          if(!ok) return;                                  // écriture non confirmée : l'original n'est pas touché
          try{ sjFlag(k, merged.length); }catch(e){}       // remplacer par un témoin plus petit ne peut pas dépasser le quota
        });
      });
    });
  }, Promise.resolve());
}
function sjRefreshAllShots(){
  document.querySelectorAll('.trade-shots[data-key]').forEach(function(box){ sjRenderTradeShots(box.getAttribute('data-key')); });
  document.querySelectorAll('.shots-pair.no-fix').forEach(function(pair){
    var has = [].slice.call(pair.querySelectorAll('.shots-col.fix .trade-shots')).some(function(b){ return sjHasShots(b.getAttribute('data-key')); });
    if(has) pair.classList.remove('no-fix');
  });
}
function sjInitImgStore(){
  return sjIdbOpen().then(function(db){
    SJ_IDB = db;
    if(!db) return;
    return sjMigrateLegacy().then(sjIdbSession).then(function(map){ SJ_IMG_MEM = map; sjRefreshAllShots(); });
  })['catch'](function(){});   // jamais bloquant : au pire, repli sur localStorage
}
var sjImgReady = sjInitImgStore();
/* Captures enregistrées dans la page par Claude (SJ_SHOTS : { clé de zone : ['img/….jpg', …] }, fichiers dans sessions/img/) : versionnées avec le site, donc visibles sur
   tous les appareils et en ligne ; affichées avant celles que Sébastien dépose lui-même (stockées dans son navigateur), sans bouton de suppression. */
function sjPageShots(key){ return (window.SJ_SHOTS && window.SJ_SHOTS[key]) || []; }
function sjHasShots(key){ return sjPageShots(key).length > 0 || sjLoadTradeImgs(key).length > 0; }
function sjRenderTradeShots(key){
  var box = document.querySelector('.trade-shots[data-key="' + key + '"]');
  if(!box) return;
  var imgs = sjLoadTradeImgs(key);
  var pre = sjPageShots(key).map(function(src){
    return '<div class="screenshot-wrap" title="Capture enregistrée dans la page"><img src="' + sjEsc(src) + '" onclick="sjOpenLB(this.src)"></div>';
  }).join('');
  box.querySelector('.trade-shots-list').innerHTML = pre + imgs.map(function(src, i){
    return '<div class="screenshot-wrap"><img src="' + src + '" onclick="sjOpenLB(this.src)">'
         + '<button type="button" class="screenshot-del" onclick="sjDelTradeShot(\'' + key + '\',' + i + ')" title="Supprimer">×</button></div>';
  }).join('');
  var lg = box.closest('.shots-col.legacy');   // anciennes captures « ce que j'aurais dû faire » : la zone n'existe que tant qu'il en reste
  if(lg) lg.style.display = [].some.call(lg.querySelectorAll('.trade-shots-list'), function(l){ return l.children.length; }) ? '' : 'none';
}
function sjDelTradeShot(key, i){
  var imgs = sjLoadTradeImgs(key).slice();
  imgs.splice(i, 1);
  sjSaveTradeImgs(key, imgs);
  sjRenderTradeShots(key);
}
/* Zone de capture (clé = trade, ou trade + « :fix:daxton » pour « ce que j'aurais dû faire » selon Daxton) */
function sjShotsBox(key, label){
  return '<div class="trade-shots" data-key="' + key + '">'
    + '<div class="screenshots trade-shots-list"></div>'
    + '<div class="trade-shots-drop">📸 ' + label + ' <span>— glisser, cliquer, ou survoler puis Ctrl+V</span></div>'
    + '<input type="file" accept="image/*" multiple style="display:none">'
    + '</div>';
}
function sjShotsList(key){   // liste seule, sans zone de dépôt (anciennes captures)
  return '<div class="trade-shots" data-key="' + key + '"><div class="screenshots trade-shots-list"></div></div>';
}
/* « Ce que j'aurais dû faire » : une zone de capture, celle de Daxton (stratégie V2) — clé <compte>_<n>:fix:daxton. La zone « Matt » (clé
   :fix:matt, 16→20/10, retirée à la demande de Sébastien) et l'ancienne zone unique (clé :fix, avant le 16/10) n'ont plus de zone de dépôt ;
   leurs captures éventuelles restent visibles (et supprimables) dans une zone « Anciennes captures » qui disparaît quand elle est vide —
   rien n'est perdu en silence. */
var SJ_FIX_WHO = [['daxton', 'Daxton']];
var SJ_FIX_OLD = [':fix', ':fix:matt'];   // clés sans zone de dépôt, affichées dans « Anciennes captures »
function sjFixKeys(key){ return SJ_FIX_WHO.map(function(w){ return key + ':fix:' + w[0]; }); }
/* Sous chaque trade : deux colonnes — à gauche ce qui s'est passé, puis « ce que j'aurais dû faire » selon Daxton — puis
   une petite remarque pleine largeur dessous. Visible d'office quand le trade est perdant ; sinon repliée derrière un bouton (un trade
   gagnant peut aussi être raté). Au survol d'une capture, l'aperçu montre côte à côte celles des colonnes remplies (voir sjInitHoverPreview). */
function sjInitTradeShots(){
  document.querySelectorAll('tr.note-row').forEach(function(row){
    var ta = row.querySelector('textarea.trade-note'), cell = row.querySelector('td');
    if(!ta || !cell || cell.querySelector('.shots-pair')) return;
    var key = ta.getAttribute('data-key'), fixKey = key + ':fix', fixKeys = sjFixKeys(key);
    var tr = row.previousElementSibling;
    var failed = !!(tr && tr.querySelector('.td-pnl.td-l'));
    var fixNote = sjLoadNotes()[fixKey] || '';
    var fixImgs = fixKeys.concat(SJ_FIX_OLD.map(function(x){ return key + x; })).some(function(k){ return sjHasShots(k); });
    var pair = document.createElement('div');
    pair.className = 'shots-pair' + ((failed || fixNote || fixImgs) ? '' : ' no-fix');
    pair.innerHTML =
        '<div class="shots-col main"><div class="shots-col-h">Ce qui s\'est passé</div>' + sjShotsBox(key, 'Ajouter une capture')
      + '<button type="button" class="fix-toggle">＋ Ce que j\'aurais dû faire</button></div>'
      + SJ_FIX_WHO.map(function(w){
          return '<div class="shots-col fix" data-who="' + w[0] + '"><div class="shots-col-h">✅ Ce que j\'aurais dû faire · ' + w[1] + '</div>'
               + sjShotsBox(key + ':fix:' + w[0], 'Capture ' + w[1]) + '</div>';
        }).join('')
      + '<div class="shots-col fix legacy" style="display:none"><div class="shots-col-h">✅ Anciennes captures <span>(anciennes zones de « ce que j\'aurais dû faire »)</span></div>' + SJ_FIX_OLD.map(function(x){ return sjShotsList(key + x); }).join('') + '</div>'
      + '<div class="fix-remark"><div class="shots-col-h">✅ Ce que j\'aurais dû faire — petite remarque</div>'
      + '<textarea class="fix-note" rows="2" data-key="' + fixKey + '" placeholder="Ce que tu aurais fait à la place, en une ou deux phrases…"></textarea></div>';
    cell.appendChild(pair);
    var fixTa = pair.querySelector('.fix-note');
    fixTa.value = fixNote;
    fixTa.addEventListener('blur', function(){ sjSaveNote(fixTa); });
    fixTa.addEventListener('change', function(){ sjSaveNote(fixTa); });
    pair.querySelector('.fix-toggle').addEventListener('click', function(){ pair.classList.remove('no-fix'); });
    pair.querySelectorAll('.trade-shots').forEach(function(box){
      var k = box.getAttribute('data-key');
      sjSetupDropEl(box.querySelector('.trade-shots-drop'), box.querySelector('input'), function(f){ sjReadImage(f, k); });
      sjRenderTradeShots(k);
    });
    // Ctrl+V : la capture va dans la zone survolée ; la colonne qui la recevra est entourée (sinon le reste de la ligne = « ce qui s'est passé »)
    var cols = { main: pair.querySelector('.shots-col.main') }, allKeys = [key].concat(fixKeys);
    SJ_FIX_WHO.forEach(function(w){ cols[w[0]] = pair.querySelector('.shots-col.fix[data-who="' + w[0] + '"]'); });
    function target(which){
      Object.keys(cols).forEach(function(n){ cols[n].classList.remove('paste-target'); });
      if(which && !pair.classList.contains('no-fix')) cols[which].classList.add('paste-target');
    }
    row.addEventListener('mouseenter', function(){ sjHoverKey = key; target('main'); });
    row.addEventListener('mouseleave', function(){ if(allKeys.indexOf(sjHoverKey) >= 0) sjHoverKey = null; target(null); });
    SJ_FIX_WHO.forEach(function(w, i){
      cols[w[0]].addEventListener('mouseenter', function(){ sjHoverKey = fixKeys[i]; target(w[0]); });
      cols[w[0]].addEventListener('mouseleave', function(){ if(sjHoverKey === fixKeys[i]) sjHoverKey = key; target('main'); });
    });
    fixTa.addEventListener('focus', function(){ target(null); });   // au clavier, aucune colonne n'est ciblée : la zone se choisit à la souris
    fixTa.addEventListener('blur', function(){ target(null); });
  });
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

/* ---------- Aperçu en grand au survol d'une capture (écrans à souris ; au toucher, le clic ouvre le zoom) ----------
   Dans une paire « ce qui s'est passé » / « ce que j'aurais dû faire », l'aperçu montre les deux côte à côte, chacun en grand
   (ce qui s'est passé à gauche, ce que tu aurais dû faire à droite, la capture survolée soulignée) : on compare d'un coup d'œil. */
function sjInitHoverPreview(){
  if(!(window.matchMedia && window.matchMedia('(hover: hover)').matches)) return;
  var pv = document.createElement('div');
  pv.className = 'shot-preview';
  pv.innerHTML = '<div class="shot-pv-grid"></div>';
  document.body.appendChild(pv);
  var grid = pv.querySelector('.shot-pv-grid');
  function fig(src, label, hot){
    return '<figure class="shot-pv-fig' + (hot ? ' hot' : '') + '">' + (label ? '<figcaption>' + label + '</figcaption>' : '') + '<img alt="" src="' + src + '"></figure>';
  }
  document.addEventListener('mouseover', function(e){
    var t = e.target;
    if(!(t && t.matches && t.matches('.screenshot-wrap img'))) return;
    var col = t.closest('.shots-col'), pair = t.closest('.shots-pair'), h = '', n = 0;
    var who = col ? (col.classList.contains('main') ? 'main' : col.getAttribute('data-who')) : null;   // main, daxton (ou rien : anciennes captures)
    if(who && pair){
      var idx = [].slice.call(col.querySelectorAll('.screenshot-wrap img')).indexOf(t), figs = [];
      [['main', 'Ce qui s\'est passé'], ['daxton', '✅ Daxton']].forEach(function(w){
        if(w[0] === who){ figs.push(fig(t.src, w[1], true)); return; }
        var oc = pair.querySelector(w[0] === 'main' ? '.shots-col.main' : '.shots-col.fix[data-who="' + w[0] + '"]');
        var oImgs = oc ? [].slice.call(oc.querySelectorAll('.screenshot-wrap img')) : [];
        if(oImgs.length) figs.push(fig((oImgs[idx] || oImgs[0]).src, w[1], false));
      });
      if(figs.length > 1){ h = figs.join(''); n = figs.length; }
    }
    grid.className = 'shot-pv-grid' + (n === 3 ? ' three' : (n === 2 ? ' two' : ''));
    grid.innerHTML = h || fig(t.src, '', false);
    pv.classList.add('show');
  });
  document.addEventListener('mouseout', function(e){
    var t = e.target;
    if(t && t.matches && t.matches('.screenshot-wrap img')) pv.classList.remove('show');
  });
}

/* ---------- Coller une capture (Ctrl+V / Cmd+V) directement dans la page ---------- */
function sjInitPaste(){
  document.addEventListener('paste', function(e){
    var items = (e.clipboardData && e.clipboardData.items) || [];
    var used = false;
    var key = sjHoverKey;
    if(!key){
      var ae = document.activeElement, row = ae && ae.closest ? ae.closest('tr.note-row') : null;
      var ta = row ? row.querySelector('textarea.trade-note') : null;
      if(ae && ae.classList && ae.classList.contains('fix-note')) return;   // remarque en cours d'écriture : la zone se choisit en la survolant
      else if(ta) key = ta.getAttribute('data-key');
    }
    if(!key) return;  // pas de trade ciblé (survolé ou en cours d'écriture) : rien à faire, plus de zone générale
    for(var i = 0; i < items.length; i++){
      if(items[i].type && items[i].type.indexOf('image/') === 0){
        var file = items[i].getAsFile();
        if(file){ sjReadImage(file, key); used = true; }
      }
    }
    if(used) e.preventDefault(); // n'empêche le collage normal que si une image a été trouvée
  });
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

/* ---------- Copier un trade : texte prêt à coller (chat Claude, notes…), sous les infos de chaque trade ---------- */
function sjCopyText(text, done){
  function fallback(){
    try{
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = document.execCommand('copy'); document.body.removeChild(ta); done(ok);
    }catch(e){ done(false); }
  }
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(function(){ done(true); }, fallback);
  } else { fallback(); }
}
function sjSessionDate(){
  var m = String(typeof SESSION_KEY === 'string' ? SESSION_KEY : '').match(/^(\d{4})_(\d{2})_(\d{2})/);
  return m ? m[3] + '/' + m[2] + '/' + m[1] : '';
}
function sjTradeText(noteRow){
  var tr = noteRow.previousElementSibling;
  var cells = tr ? [].map.call(tr.children, function(c){ return c.textContent.trim(); }) : [];
  var ta = noteRow.querySelector('textarea.trade-note');
  var key = ta ? ta.getAttribute('data-key') : '';
  var acct = key ? key.slice(0, key.lastIndexOf('_')) : '';
  var parts = [sjSessionDate() + (acct ? ' · Compte ' + acct : '')];
  if(cells.length >= 8) parts.push(cells[1] + ' ' + cells[2] + ' ×' + cells[3] + ' · entrée ' + cells[4] + ' → sortie ' + cells[5] + ' · ' + cells[6] + ' · P&L ' + cells[7]);
  else parts.push(cells.slice(1).join(' · '));
  var st = key ? (sjLoadStops()[key] || null) : null;
  if(st){
    if(st.stop) parts.push('stop ' + st.stop);
    if(st.objectif) parts.push('objectif ' + st.objectif);
  }
  var rr = sjRRText(key ? sjFindAcctTrade(key) : null, st);
  if(rr !== '—') parts.push('R:R ' + rr);
  var reason = ta ? ta.value.trim() : '';
  var fix = key ? (sjLoadNotes()[key + ':fix'] || '') : '';
  return parts.join(' · ') + ' — ' + (reason ? 'Raison : ' + reason : 'raison non renseignée') + (fix ? ' · Ce que j\'aurais dû faire : ' + fix : '');
}
function sjInitTradeCopy(){
  document.querySelectorAll('tr.note-row').forEach(function(row){
    var cell = row.querySelector('td');
    if(!cell || cell.querySelector('.trade-copy')) return;
    var box = document.createElement('div');
    box.className = 'trade-copy';
    box.innerHTML = '<button type="button" class="trade-copy-btn">📋 Copier ce trade</button><span class="trade-copy-msg"></span>';
    cell.appendChild(box);
    var msg = box.querySelector('.trade-copy-msg');
    box.querySelector('button').addEventListener('click', function(){
      sjCopyText(sjTradeText(row), function(ok){
        msg.textContent = ok ? '✓ Copié' : 'Échec de la copie';
        setTimeout(function(){ msg.textContent = ''; }, 2000);
      });
    });
  });
}

/* ---------- Menu latéral : même navigation que index.html, thème partagé (clé localStorage « journal-theme ») ---------- */
/* Même menu qu'index.html : onglets + sous-entrées toujours dépliées (≥ 960 px). Pour chaque onglet : [id, libellé, sous-page ouverte par le lien parent, [[sous-page, libellé], …]].
   Les sous-pages sont celles des .sn-btn d'index.html (la première de chaque onglet, marquée data-nosidebar, n'est pas répétée) : à tenir à jour ici quand
   un .sn-btn y est ajouté. Les liens ouvrent index.html#<onglet>/<sous-page> (routage dans le script de navigation d'index.html). */
var SJ_NAV = [
  ['dashboard','📊 Tableau de bord','overview',[['progression','📈 Progression'],['economie','💶 Économie & risque'],['comptes','🧮 Comptes & Analyse'],['risque','⚖️ Risque & R:R'],['bilan','📑 Bilan & Règles']]],
  ['brief','🧭 Avant la séance','essentiel',[['consignes','✅ Consignes & actions'],['interdits','🚫 Interdits & repères'],['checklist','☑️ Checklist'],['comptes','🏦 Comptes']]],
  ['sessions','🗓️ Sessions',null,[]],
  ['regles','⛔ Règles','outils',[['bilan','🧾 Bilan & discipline'],['communes','📜 Règles communes'],['v2','⚡ Stratégie V2 · iFVG M5']]]
];
function sjEsc(t){ return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
var SJ_THEMES = ['system','dark','light'];
var SJ_THEME_LABELS = {system:'⚙️ Système', dark:'🌙 Sombre', light:'☀️ Clair'};
function sjApplyTheme(t){
  if(t === 'dark') document.documentElement.setAttribute('data-theme','dark');
  else if(t === 'light') document.documentElement.setAttribute('data-theme','light');
  else document.documentElement.removeAttribute('data-theme');
  var btn = document.querySelector('.side-nav .theme-btn');
  if(btn) btn.textContent = SJ_THEME_LABELS[t] || t;
  try{ localStorage.setItem('journal-theme', t); }catch(e){}
}
function sjCurrentTheme(){
  var t = 'system';
  try{ t = localStorage.getItem('journal-theme') || 'system'; }catch(e){}
  return SJ_THEMES.indexOf(t) >= 0 ? t : 'system';
}
sjApplyTheme(sjCurrentTheme());
function sjInitSidebar(){
  if(document.querySelector('.side-nav')) return;
  var nav = document.createElement('nav');
  nav.className = 'side-nav';
  nav.innerHTML = '<div class="side-nav-brand"><b>Journal de trading</b><span>Futures · Tradovate / Lucid</span></div>'
    + SJ_NAV.map(function(n){
        var a = '<a href="../index.html#' + n[0] + (n[2] ? '/' + n[2] : '') + '"' + (n[0] === 'sessions' ? ' class="on"' : '') + '>' + sjEsc(n[1]) + '</a>';
        if(!n[3].length) return a;
        return a + '<div class="nav-sub">' + n[3].map(function(s){ return '<a href="../index.html#' + n[0] + '/' + s[0] + '">' + sjEsc(s[1]) + '</a>'; }).join('') + '</div>';
      }).join('')
    + '<button type="button" class="theme-btn"></button>';
  document.body.insertBefore(nav, document.body.firstChild);
  document.body.classList.add('has-side-nav');
  var btn = nav.querySelector('.theme-btn');
  btn.textContent = SJ_THEME_LABELS[sjCurrentTheme()];
  btn.addEventListener('click', function(){
    sjApplyTheme(SJ_THEMES[(SJ_THEMES.indexOf(sjCurrentTheme()) + 1) % SJ_THEMES.length]);
  });
}

/* ---------- Point d'entrée ---------- */
function initSessionPage(){
  sjInitSidebar();
  sjInitReflect();
  sjInitPaste();
  sjInitTradeNotes();
  sjInitTradeRR();
  sjInitTradeCopy();
  sjInitTradeShots();
  sjInitHoverPreview();
}
window.addEventListener('DOMContentLoaded', initSessionPage);
