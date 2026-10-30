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

  /* ───────── Téléphone : coque d'app ───────── */
  var MQ = window.matchMedia ? window.matchMedia('(max-width:700px)') : null;
  if(!MQ) return;
  var IS_SESSION = !!document.querySelector('.sp-header');
  var IS_INDEX = !!document.querySelector('.nav a[data-goto]');
  if(!IS_SESSION && !IS_INDEX) return;

  function el(tag, cls, html){ var e = document.createElement(tag); if(cls) e.className = cls; if(html != null) e.innerHTML = html; return e; }
  function esc(t){ return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function fr(v, d){ return Math.abs(v).toLocaleString('fr-FR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function usd(v, d){ return (v > 0.004 ? '+' : (v < -0.004 ? '−' : '')) + fr(v, d) + ' $'; }

  var ICON = {
    dashboard: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/></svg>',
    sessions:  '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
    brief:     '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/></svg>',
    regles:    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11"/><path d="m3.5 6 1 1 2-2M3.5 12l1 1 2-2M3.5 18l1 1 2-2"/></svg>',
    plus:      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>',
    stats:     '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V11M12 20V4M19 20v-6"/></svg>'
  };
  var TABS = [
    { id: 'dashboard', label: 'Accueil', sub: 'overview' },
    { id: 'sessions',  label: 'Séances' },
    { id: 'brief',     label: 'Avant séance', sub: 'essentiel' },
    { id: 'regles',    label: 'Règles', sub: 'outils' },
    { id: 'plus',      label: 'Plus' }
  ];
  var PLUS_ROWS = [
    ['dashboard', 'progression', 'Progression'], ['dashboard', 'economie', 'Économie & risque'], ['dashboard', 'comptes', 'Comptes & Analyse'],
    ['dashboard', 'risque', 'Risque & R:R'], ['dashboard', 'bilan', 'Constats d’août']
  ];
  var tabbar = null, sheet = null, sheetBg = null, built = false;

  function goIndexTab(id){ var tab = document.querySelector('.nav a[data-goto="' + id + '"]'); if(tab) tab.click(); }
  function themeBtn(){ return document.getElementById('theme-toggle') || document.querySelector('.side-nav .theme-btn'); }

  function syncActive(){
    if(!tabbar) return;
    var on = IS_SESSION ? 'sessions' : 'dashboard';
    if(!IS_SESSION){ var a = document.querySelector('.nav a.on'); if(a) on = a.getAttribute('data-goto'); }
    if(sheet && sheet.classList.contains('is-open')) on = 'plus';
    [].forEach.call(tabbar.querySelectorAll('.m-tab'), function(n){
      var is = n.getAttribute('data-tab') === on;
      n.classList.toggle('on', is);
      if(is) n.setAttribute('aria-current', 'page'); else n.removeAttribute('aria-current');
    });
  }

  function setThemeLabel(){
    var b = themeBtn(), v = sheet && sheet.querySelector('.m-row-val');
    if(b && v) v.textContent = b.textContent.trim();
  }
  function openSheet(){ if(!sheet) return; setThemeLabel(); sheetBg.classList.add('is-open'); sheet.classList.add('is-open'); syncActive(); }
  function closeSheet(){ if(!sheet) return; sheetBg.classList.remove('is-open'); sheet.classList.remove('is-open'); syncActive(); }
  function toggleSheet(){ if(sheet.classList.contains('is-open')) closeSheet(); else openSheet(); }

  function buildTabbar(){
    tabbar = el('nav', 'm-tabbar');
    tabbar.setAttribute('aria-label', 'Navigation');
    TABS.forEach(function(t){
      var n;
      if(t.id === 'plus'){ n = el('button', 'm-tab'); n.type = 'button'; }
      else { n = el('a', 'm-tab'); n.href = IS_SESSION ? '../index.html#' + t.id + (t.sub ? '/' + t.sub : '') : '#' + t.id; }
      n.setAttribute('data-tab', t.id);
      n.innerHTML = ICON[t.id] + '<span>' + t.label + '</span>';
      tabbar.appendChild(n);
    });
    document.body.appendChild(tabbar);
    tabbar.addEventListener('click', function(e){
      var n = e.target.closest ? e.target.closest('.m-tab') : null;
      if(!n) return;
      var id = n.getAttribute('data-tab');
      if(id === 'plus'){ toggleSheet(); return; }
      closeSheet();
      if(IS_SESSION) return;                       // simple lien vers index.html#onglet
      e.preventDefault();
      goIndexTab(id);
      if(id === 'dashboard'){ var o = document.querySelector('#dash-subnav .sn-btn[data-sub="overview"]'); if(o) o.click(); }
      syncActive();
    });
  }

  function buildSheet(){
    sheetBg = el('div', 'm-sheet-bg');
    sheet = el('section', 'm-sheet');
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-label', 'Plus');
    var h = '<div class="m-sheet-grip"></div><h2 class="m-sheet-title">Plus</h2><div class="m-list">';
    PLUS_ROWS.forEach(function(r){
      h += '<a class="m-row" href="' + (IS_SESSION ? '../index.html#' : '#') + r[0] + '/' + r[1] + '"' + (IS_SESSION ? '' : ' data-open="' + r[0] + '/' + r[1] + '"') + '><span>' + esc(r[2]) + '</span><i class="m-chev" aria-hidden="true"></i></a>';
    });
    h += '<button type="button" class="m-row m-theme"><span>Thème</span><span class="m-row-val"></span></button></div>';
    sheet.innerHTML = h;
    document.body.appendChild(sheetBg);
    document.body.appendChild(sheet);
    sheetBg.addEventListener('click', closeSheet);
    sheet.addEventListener('click', function(e){
      var t = e.target.closest ? e.target.closest('.m-row') : null;
      if(!t) return;
      if(t.classList.contains('m-theme')){ var b = themeBtn(); if(b){ b.click(); setThemeLabel(); } return; }
      closeSheet();
    });
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeSheet(); });
  }

  /* l'onglet actif suit le routeur d'index.html (classe « on » du menu d'origine, masqué sur téléphone) */
  function watchNav(){
    var nav = document.querySelector('.nav');
    if(nav && window.MutationObserver) new MutationObserver(syncActive).observe(nav, { attributes: true, subtree: true, attributeFilter: ['class'] });
  }

  /* la pastille de sous-page active se centre dans la rangée qui défile */
  function centerPills(){
    [].forEach.call(document.querySelectorAll('.subnav .sn-btn.active'), function(b){
      var s = b.parentElement;
      if(s && s.scrollTo) s.scrollTo({ left: b.offsetLeft - (s.clientWidth - b.offsetWidth) / 2, behavior: 'smooth' });
    });
  }
  document.addEventListener('click', function(e){ if(MQ.matches && e.target.closest && e.target.closest('.sn-btn')) setTimeout(centerPills, 30); });

  /* fonctionnalités par page : on() quand l'écran devient étroit, off() quand il s'élargit (le Mac retrouve exactement son DOM) */
  var features = [];
  function feature(f){ features.push(f); }
  /* ───────── Accueil (onglet Tableau de bord → Vue d'ensemble) ───────── */
  var homeState = null;

  function tzCard(re){   // valeur et sous-titre d'une carte .tz-card déjà remplie par le script du tableau de bord
    var out = null;
    [].forEach.call(document.querySelectorAll('#view-dashboard .tz-card'), function(c){
      var l = c.querySelector('.lbl');
      if(l && re.test(l.textContent)){
        var v = c.querySelector('.tz-ring-val, .val'), s = c.querySelector('.tz-sub');
        out = { val: v ? v.textContent.trim() : '', sub: s ? s.textContent.trim() : '' };
      }
    });
    return out;
  }

  function buildHome(){
    var host = document.querySelector('#view-dashboard .subview[data-subview="overview"]');
    if(!host) return true;
    if(homeState) return true;
    var N = window.netActifs ? window.netActifs() : null;
    if(!N || !N.n) return false;                       // données pas encore prêtes : on réessaie au chargement complet

    var cible = 3000 * N.n, pct = Math.max(0, Math.min(100, N.net / cible * 100));
    var tone = N.net < 0 ? 'neg' : (N.net > 0 ? 'pos' : '');
    var reste = cible - N.net;
    var dateTxt = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

    var accts = N.act.slice().sort(function(a, b){ return a.l < b.l ? -1 : 1; }).map(function(x){
      var c = x.c, cib = (c.objectif != null && c.depart != null) ? c.objectif - c.depart : 3000;
      var p = Math.max(0, Math.min(100, x.d / cib * 100));
      return '<div class="m-acct">'
        + '<div class="m-acct-top"><b>' + esc(x.l) + '</b><span class="m-acct-bal">' + fr(c.solde) + ' $</span></div>'
        + '<div class="m-acct-d ' + (x.d < 0 ? 'neg' : 'pos') + '">' + usd(x.d) + ' <span>depuis le départ</span></div>'
        + '<div class="m-bar"><i style="width:' + p.toFixed(0) + '%"></i></div>'
        + '<div class="m-acct-f">' + Math.round(p) + ' % de l’objectif' + (typeof c.buffer === 'number' ? '<br>Marge avant perte : ' + fr(c.buffer) + ' $' : '') + '</div>'
        + '</div>';
    }).join('');

    var last = (window.SESSIONS || []).filter(function(s){ return s.pnl !== null && s.fichier; })[0];
    var lastRow = last
      ? '<div class="m-list"><a class="m-row m-last" href="sessions/' + esc(last.fichier) + '"><span class="m-last-l"><small>Dernière séance</small><b>' + esc(last.label || last.jour) + '</b></span>'
        + '<span class="m-last-p ' + (last.pnl < 0 ? 'neg' : (last.pnl > 0 ? 'pos' : '')) + '">' + usd(last.pnl) + '</span><i class="m-chev" aria-hidden="true"></i></a></div>'
      : '';

    function mini(label, re){
      var o = tzCard(re);
      return o ? '<button type="button" class="m-mini-c" data-m-stats><small>' + label + '</small><b>' + esc(o.val) + '</b></button>' : '';
    }
    var BTNS = [['brief', 'Avant la séance', 'brief'], ['sessions', 'Séances', 'sessions'], ['regles', 'Règles', 'regles'], ['stats', 'Stats', 'stats']];

    var home = el('div', 'm-home');
    home.id = 'm-home';
    home.innerHTML =
        '<div class="m-home-head"><span class="m-home-eyebrow">Aujourd’hui</span><h1 class="m-home-title">' + esc(dateTxt.charAt(0).toUpperCase() + dateTxt.slice(1)) + '</h1></div>'
      + '<div class="m-banner-slot"></div>'
      + '<div class="m-net"><small>Net P&amp;L</small><div class="m-net-val ' + tone + '">' + usd(N.net) + '</div>'
      +   '<div class="m-bar"><i style="width:' + pct.toFixed(0) + '%"></i></div>'
      +   '<div class="m-net-sub">' + Math.round(pct) + ' % de ' + fr(cible) + ' $ · ' + (reste > 0 ? 'il reste ' + fr(reste) + ' $' : 'objectif atteint') + ' · ' + N.n + ' comptes actifs</div></div>'
      + '<div class="m-accts">' + accts + '</div>'
      + lastRow
      + '<div class="m-mini">' + mini('Trades gagnants', /trade win/i) + mini('Profit factor', /profit factor/i) + mini('Jours gagnants', /day win/i) + '</div>'
      + '<div class="m-grid">' + BTNS.map(function(b){ return '<button type="button" class="m-big" data-m-go="' + b[0] + '">' + ICON[b[2]] + '<span>' + b[1] + '</span></button>'; }).join('') + '</div>';

    var nodes = [].slice.call(host.childNodes), banner = document.getElementById('day-banner');   // nœuds texte compris : le Mac retrouve exactement son DOM
    var det = el('details', 'm-all', '<summary>Tout le tableau de bord</summary><div class="m-all-body"></div>');
    var body = det.querySelector('.m-all-body');
    nodes.forEach(function(n){ if(n !== banner) body.appendChild(n); });
    host.appendChild(home);
    host.appendChild(det);
    if(banner) home.querySelector('.m-banner-slot').appendChild(banner);

    home.addEventListener('click', function(e){
      var t = e.target.closest ? e.target.closest('[data-m-go],[data-m-stats]') : null;
      if(!t) return;
      if(t.hasAttribute('data-m-stats') || t.getAttribute('data-m-go') === 'stats'){ openSheet(); return; }
      goIndexTab(t.getAttribute('data-m-go'));
      syncActive();
    });
    homeState = { host: host, home: home, det: det, nodes: nodes };
    return true;
  }

  function unbuildHome(){
    if(!homeState) return;
    var s = homeState;
    homeState = null;
    s.nodes.forEach(function(n){ s.host.insertBefore(n, s.home); });   // dans l'ordre d'origine, bandeau du jour compris
    s.host.removeChild(s.home);
    s.host.removeChild(s.det);
  }

  feature({
    page: 'index',
    on: function(){ if(!buildHome()) window.addEventListener('load', function(){ if(MQ.matches) buildHome(); }, { once: true }); },
    off: unbuildHome
  });

  /* ───────── Page d'une séance ───────── */
  var noteSaved = null, backSaved = null;

  feature({
    page: 'session',
    on: function(){
      var back = document.querySelector('.sp-back');
      if(back && backSaved === null){ backSaved = back.textContent; back.textContent = '‹ Séances'; }
      var nb = document.querySelector('.sp-header ~ .note-block');
      if(nb && noteSaved === null){
        var r = splitNote(nb.innerHTML);
        if(r){
          noteSaved = nb.innerHTML;
          nb.innerHTML = '<div class="m-head">' + r.head + '</div>' + r.sections.map(function(s){
            return '<details class="m-sec"><summary>' + esc(s.title) + '</summary><div class="m-sec-body">' + s.html + '</div></details>';
          }).join('');
        }
      }
    },
    off: function(){
      var back = document.querySelector('.sp-back');
      if(back && backSaved !== null){ back.textContent = backSaved; backSaved = null; }
      var nb = document.querySelector('.sp-header ~ .note-block');
      if(nb && noteSaved !== null){ nb.innerHTML = noteSaved; noteSaved = null; }
    }
  });

  /* @@FEATURES@@ */

  function apply(){
    var on = MQ.matches;
    if(on && !built){ built = true; buildTabbar(); buildSheet(); watchNav(); }
    document.documentElement.classList.toggle('m-shell', on);
    document.documentElement.classList.toggle('m-session', on && IS_SESSION);
    if(!document.documentElement.className) document.documentElement.removeAttribute('class');
    features.forEach(function(f){
      if(f.page !== (IS_SESSION ? 'session' : 'index')) return;
      if(on) f.on(); else f.off();
    });
    if(built){ [tabbar, sheetBg, sheet].forEach(function(n){ n.hidden = !on; }); if(!on) closeSheet(); }
    syncActive();
  }
  function start(){ if(MQ.matches || built) apply(); }
  if(MQ.addEventListener) MQ.addEventListener('change', start); else if(MQ.addListener) MQ.addListener(start);
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
