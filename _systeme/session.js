/* ============================================================
   Logique partagée des pages de session (sessions/*.html).
   Chaque page définit `SESSION_KEY` (ex. "2026-09-05-samedi")
   avant d'inclure ce fichier, puis appelle initSessionPage().
   Notes (trade + relecture) et captures sont stockées dans le
   localStorage du navigateur, sous une clé propre à la session.
   ============================================================ */

function sjKeyImgs()  { return 'imgs_'  + SESSION_KEY; }
function sjKeyNotes() { return 'notes_' + SESSION_KEY; }

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
  var hasContent = SJ_REFLECT_FIELDS.some(function(f){ return sjReflectValue(f.key); });
  btn.disabled = !hasContent;
}
function sjCopyReflect(){
  var lines = ['Relecture — ' + SESSION_KEY];
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

/* ---------- Point d'entrée ---------- */
function initSessionPage(){
  sjInitImages();
  sjInitReflect();
  sjInitPaste();
}
window.addEventListener('DOMContentLoaded', initSessionPage);
