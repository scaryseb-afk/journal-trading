/* Couche « app iOS » — téléphone seulement (écran ≤ 700 px). Conception : docs/superpowers/specs/2026-10-30-mobile-app-design.md
   Au-dessus de 700 px, rien ne s'exécute. Le style est dans mobile.css, sous html.m-shell (classe posée ici quand la coque est prête). */
(function(){
  'use strict';

  /* ───────── Fonctions pures (testées sous Node : tests/mobile/) ───────── */
  function plain(html){
    return String(html).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  }

  /* Titre court d'une rangée de résumé : coupe avant « : », retire le point final, puis (si > 44 caractères) coupe avant « — »,
     retire les parenthèses, tronque au mot. « R:R » (sans espaces) n'est pas coupé. */
  function shortTitle(t){
    t = String(t).replace(/\s+/g, ' ').trim();
    var i = t.indexOf(' : ');
    if(i > 0) t = t.slice(0, i);
    t = t.replace(/[\s:.]+$/, '');
    if(t.length > 44){ var d = t.indexOf(' — '); if(d >= 8) t = t.slice(0, d); }
    if(t.length > 44) t = t.replace(/\s*\([^)]*\)/g, '');
    if(t.length > 44) t = t.slice(0, 43).replace(/\s+\S*$/, '') + '…';
    return t;
  }

  /* Découpe le résumé d'une séance (HTML de .note-block) : segments séparés par <br><br> ; le premier est la tête (titre de la journée) ;
     chaque segment suivant qui commence par un <strong> devient une rangée ; un segment sans <strong> initial se rattache au précédent.
     Moins de 3 segments (ou aucune rangée) → null : le résumé reste entier. */
  function splitNote(html){
    var segs = String(html).split(/(?:\s*<br\s*\/?>\s*){2,}/i).map(function(s){ return s.trim(); }).filter(Boolean);
    if(segs.length < 3) return null;
    var head = segs[0], sections = [];
    for(var i = 1; i < segs.length; i++){
      var m = segs[i].match(/^<strong>([\s\S]*?)<\/strong>/i);
      if(m) sections.push({ title: shortTitle(plain(m[1])) || 'Détail', html: segs[i] });
      else if(sections.length) sections[sections.length - 1].html += '<br><br>' + segs[i];
      else head += '<br><br>' + segs[i];
    }
    return sections.length ? { head: head, sections: sections } : null;
  }

  if(typeof module !== 'undefined' && module.exports) module.exports = { plain: plain, shortTitle: shortTitle, splitNote: splitNote };
  if(typeof window === 'undefined' || typeof document === 'undefined') return;

  /* @@DOM@@ */
})();
