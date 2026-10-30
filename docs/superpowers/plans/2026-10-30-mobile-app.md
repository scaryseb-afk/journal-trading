# Couche « app iOS » sur téléphone — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sur un écran de téléphone (≤ 700 px), le journal se comporte comme une app iOS (barre d'onglets, grands titres, gros boutons, Accueil, séances et page d'une séance repensées) sans rien changer au-dessus de 700 px.

**Architecture:** Deux fichiers ajoutés, `_systeme/mobile.css` (tout sous `@media (max-width:700px)` et sous la classe `html.m-shell`) et `_systeme/mobile.js` (fonctions pures testées sous Node + coque DOM construite seulement quand l'écran est étroit, et défaite quand il s'élargit). Le routeur, les données (`window.netActifs`, `COMPTES`, `SESSIONS`) et les adresses du site restent ceux d'aujourd'hui.

**Tech Stack:** HTML/CSS/JS statique sans build, `node --test` (Node 22) pour les tests unitaires, navigateur intégré (fenêtre émulée 375 × 812) et simulateur iOS pour la vérification visuelle.

## Global Constraints

Copiées de `docs/superpowers/specs/2026-10-30-mobile-app-design.md` :

- Seuil téléphone : `@media (max-width: 700px)`. Au-dessus : **aucun changement** (Mac, iPad, paysage).
- Toutes les règles de `mobile.css` sont dans un `@media (max-width:700px)` ; aucune règle à la racine ; tout est préfixé `html.m-shell` (classe posée par `mobile.js` quand la coque est prête : si le script échoue, le site garde sa mise en page actuelle).
- Aucune nouvelle couleur : `--accent` (bleu acier), `--red` / `--green` pour les résultats seulement, thème nuit / jour existant.
- Texte courant 17 px (interligne 1,45) ; grand titre 34 px ; chiffre clé 44 px ; cible tactile ≥ 48 px (boutons principaux 52 px, pleine largeur) ; marges 16 px + `env(safe-area-inset-*)`.
- Mouvement : ressorts existants (`--ease-move`, `--ease-sheet`, `--dur-move`, `--dur-sheet`), seulement `transform` et `opacity` ; `prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-contrast: more` respectés.
- Barre d'onglets : Accueil (`dashboard`), Séances (`sessions`), Avant séance (`brief`), Règles (`regles`), Plus ; icônes SVG en traits fins, pas d'emoji ; tap sur Accueil = « Vue d'ensemble ».
- Résumé d'une séance : premier segment visible ; les suivants en rangées à déplier ; repli « texte entier » si moins de 3 segments.
- Rien n'est poussé sur GitHub sans l'accord de Sébastien ; commits terminés par `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Structure des fichiers

| Fichier | Rôle |
|---|---|
| `_systeme/mobile.css` (nouveau) | Tout le style téléphone, en blocs `@media (max-width:700px)` successifs (un par tâche). |
| `_systeme/mobile.js` (nouveau) | Partie pure (`plain`, `shortTitle`, `splitNote`, exportée pour Node) + partie DOM : coque (onglets, feuille « Plus »), registre de « fonctionnalités » `feature({page,on,off})` (Accueil, page de séance). |
| `tests/mobile/css-guard.test.js` (nouveau) | Garde-fou « Mac inchangé » : rien hors `@media (max-width:700px)`. |
| `tests/mobile/split-note.test.js` (nouveau) | Tests de `shortTitle` / `splitNote`, dont sur la vraie page du 30/10. |
| `index.html` | + `<link … mobile.css>` après `apple.css`, + `<script src="_systeme/mobile.js">` avant `</body>`. |
| `sessions/*.html` (56) + `sessions/_template.html` | + une ligne `<link … ../_systeme/mobile.css>` après `apple.css`. |
| `_systeme/session.js` | + chargeur de `mobile.js` en fin de fichier. |
| `CLAUDE.md`, `docs/superpowers/specs/2026-10-30-mobile-app-design.md` | Documentation. |

## Outils de vérification (réutilisés dans les tâches)

**Serveur local** (arrêt : `pkill -f "http.server 8731"`) :

```bash
cd /Users/seb/Library/CloudStorage/Dropbox/Trading/journal-trading && (python3 -m http.server 8731 >/dev/null 2>&1 &) ; sleep 1 ; curl -sI http://localhost:8731/index.html | head -1
```
Attendu : `HTTP/1.0 200 OK`.

**Recharger sans cache** (le serveur ne pose pas d'en-têtes : le navigateur garde les anciens `mobile.*`). Dans `mcp__Claude_Browser__javascript_tool` :

```js
(async function(){ for (const f of ['/_systeme/mobile.css','/_systeme/mobile.js','/_systeme/session.js','/index.html']) await fetch(f, {cache:'reload'}); return 'ok'; })()
```
puis `mcp__Claude_Browser__navigate` vers la page.

**Taille de fenêtre** : `mcp__Claude_Browser__resize_window` avec `preset:"mobile"` (375 × 812) ; revenir avec `preset:"desktop"` à la fin de chaque tâche.

**Empreinte « Mac inchangé »** (à lancer en fenêtre `desktop`, sur `index.html#dashboard` puis sur une page de séance) :

```js
(function(){
  var c = document.documentElement.cloneNode(true);
  c.querySelectorAll('script[src*="mobile"],link[href*="mobile"]').forEach(function(e){ e.remove(); });
  var s = c.outerHTML, h = 5381;
  for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  var qs = ['.nav','.wrap','.kpi','.tz-card','.sr','.subnav','h1','.sp-header','.note-block','.trades-table'];
  var cs = qs.map(function(q){ var e = document.querySelector(q); if(!e) return q + ':-'; var k = getComputedStyle(e), r = e.getBoundingClientRect(); return q + ':' + k.display + '|' + k.fontSize + '|' + k.padding + '|' + Math.round(r.width) + 'x' + Math.round(r.height); }).join(';');
  return JSON.stringify({ len: s.length, hash: h, cs: cs, shell: document.documentElement.classList.contains('m-shell') });
})()
```

---

### Task 1: Garde-fou CSS et câblage (aucun changement visible)

**Files:**
- Create: `tests/mobile/css-guard.test.js`
- Create: `_systeme/mobile.css`
- Modify: `index.html` (une ligne `<link>`), `sessions/*.html` (56), `sessions/_template.html`

**Interfaces:**
- Produces: `_systeme/mobile.css` (fichier existant, une seule règle `@media (max-width:700px){}` vide) ; le test `tests/mobile/css-guard.test.js` reste vert à chaque tâche suivante.

- [ ] **Step 1: Relever l'empreinte « avant » (Mac)**

Serveur local (voir Outils), fenêtre `desktop`, ouvrir `http://localhost:8731/index.html#dashboard`, lancer l'empreinte, noter la sortie dans `/private/tmp/claude-502/-Users-seb-Library-CloudStorage-Dropbox-Trading-journal-trading/0deb7149-6017-4216-8166-1e023b2d1068/scratchpad/empreinte_index_avant.txt`. Refaire pour `http://localhost:8731/sessions/2026-10-30-vendredi.html` → `empreinte_seance_avant.txt`.

- [ ] **Step 2: Écrire le test du garde-fou (il doit échouer)**

`tests/mobile/css-guard.test.js` :

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

/* Préambules des blocs de premier niveau d'une feuille de style (commentaires déjà retirés). */
function topLevelPreludes(src){
  const out = [];
  let depth = 0, start = 0;
  for (let i = 0; i < src.length; i++){
    const ch = src[i];
    if (ch === '{'){ if (depth === 0) out.push(src.slice(start, i).trim()); depth++; }
    else if (ch === '}'){
      depth--;
      assert.ok(depth >= 0, 'accolade fermante en trop');
      if (depth === 0) start = i + 1;
    }
  }
  assert.strictEqual(depth, 0, 'accolades non équilibrées');
  assert.strictEqual(src.slice(start).trim(), '', 'texte hors bloc à la fin');
  return out;
}
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const PHONE = /^@media\s*\(\s*max-width\s*:\s*700px\s*\)$/;

test('le détecteur repère une règle hors @media téléphone', () => {
  const bad = strip('.a{color:red} @media (max-width:700px){.b{color:blue}}');
  const pre = topLevelPreludes(bad);
  assert.deepStrictEqual(pre, ['.a', '@media (max-width:700px)']);
  assert.ok(pre.some((p) => !PHONE.test(p)));
});

test('mobile.css : toutes les règles sont dans @media (max-width:700px)', () => {
  const file = path.join(__dirname, '..', '..', '_systeme', 'mobile.css');
  const pre = topLevelPreludes(strip(fs.readFileSync(file, 'utf8')));
  assert.ok(pre.length > 0, 'mobile.css est vide');
  pre.forEach((p) => assert.match(p, PHONE, 'règle hors @media téléphone : ' + p));
});
```

- [ ] **Step 3: Lancer le test, vérifier l'échec**

Run: `cd /Users/seb/Library/CloudStorage/Dropbox/Trading/journal-trading && node --test tests/mobile/css-guard.test.js`
Expected: le premier test passe, le second échoue (`ENOENT … mobile.css`).

- [ ] **Step 4: Créer `_systeme/mobile.css`**

```css
/* Couche « app iOS » — téléphone seulement (écran ≤ 700 px de large).
   Conception : docs/superpowers/specs/2026-10-30-mobile-app-design.md
   RÈGLE : tout est dans un @media (max-width:700px) et préfixé html.m-shell (classe posée par mobile.js) — voir tests/mobile/css-guard.test.js. */

@media (max-width:700px){
  /* les blocs des tâches suivantes sont ajoutés à la suite, chacun dans son propre @media */
}
```

- [ ] **Step 5: Lancer le test, vérifier qu'il passe**

Run: `node --test tests/mobile/css-guard.test.js`
Expected: `pass 2`, `fail 0`.

- [ ] **Step 6: Ajouter le `<link>` à `index.html`, aux 56 pages de séance et au template**

Run :

```bash
cd /Users/seb/Library/CloudStorage/Dropbox/Trading/journal-trading && python3 - <<'EOF'
import glob, re
files = ['index.html'] + sorted(glob.glob('sessions/*.html'))
pat = re.compile(r'(<link rel="stylesheet" href="((?:\.\./)?_systeme/)apple\.css">)')
n = 0
for f in files:
    t = open(f, encoding='utf-8').read()
    if 'mobile.css' in t:
        continue
    m = pat.findall(t)
    assert len(m) == 1, (f, len(m))
    t = pat.sub(lambda mo: mo.group(1) + '\n<link rel="stylesheet" href="' + mo.group(2) + 'mobile.css">', t, count=1)
    open(f, 'w', encoding='utf-8').write(t)
    n += 1
print('fichiers modifiés :', n)
EOF
grep -L 'mobile.css' index.html sessions/*.html | wc -l
grep -c 'mobile.css' sessions/_template.html index.html
```
Expected : `fichiers modifiés : 58` ; `0` fichier sans `mobile.css` ; `1` pour chacun des deux derniers.

- [ ] **Step 7: Vérifier l'empreinte « après » (Mac)**

Recharger sans cache, fenêtre `desktop`, relancer l'empreinte sur `index.html#dashboard` et sur la page du 30/10.
Expected : `len`, `hash` et `cs` identiques aux fichiers `*_avant.txt` (le `<link mobile>` est retiré avant le calcul), `shell:false`.

- [ ] **Step 8: Commit**

```bash
cd /Users/seb/Library/CloudStorage/Dropbox/Trading/journal-trading && git add tests/mobile/css-guard.test.js _systeme/mobile.css index.html sessions && git commit -q -F - <<'EOF'
feat: couche téléphone — garde-fou CSS (rien hors @media 700 px) et feuille mobile.css câblée sur le site et les 56 pages de séance

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
git log --oneline -1 | cut -c1-90
```

---

### Task 2: Fonctions pures — titre court et découpage du résumé (TDD)

**Files:**
- Create: `_systeme/mobile.js` (partie pure seulement)
- Create: `tests/mobile/split-note.test.js`

**Interfaces:**
- Produces (exportées par `module.exports` sous Node, internes au navigateur) :
  - `plain(html: string): string` — texte brut d'un fragment HTML.
  - `shortTitle(text: string): string` — titre de rangée, ≤ 44 caractères.
  - `splitNote(html: string): { head: string, sections: { title: string, html: string }[] } | null`.
- Le marqueur de ligne `/* @@DOM@@ */` est l'endroit où la tâche 3 insère la coque.

- [ ] **Step 1: Écrire les tests (ils doivent échouer)**

`tests/mobile/split-note.test.js` :

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { shortTitle, splitNote } = require('../../_systeme/mobile.js');

test('shortTitle : coupe avant « : » et retire le point final', () => {
  assert.strictEqual(shortTitle('1 · 02b — MNQ Short 3 contrats : +1 119 $.'), '1 · 02b — MNQ Short 3 contrats');
  assert.strictEqual(shortTitle('Comptage :'), 'Comptage');
  assert.strictEqual(shortTitle('Plan Daxton (V2).'), 'Plan Daxton (V2)');
});

test('shortTitle : « R:R » sans espaces n\'est pas coupé', () => {
  assert.strictEqual(shortTitle('R:R et R réalisé (indicatifs) :'), 'R:R et R réalisé (indicatifs)');
});

test('shortTitle : titre trop long → coupe avant « — », puis retire les parenthèses, puis tronque', () => {
  assert.strictEqual(shortTitle('Contrôle du plan — respecté en attendant ta réponse :'), 'Contrôle du plan');
  assert.strictEqual(shortTitle('Capture TradingView (M5, 17h53, collée dans le chat) :'), 'Capture TradingView');
  const t = shortTitle('Un titre vraiment très long sans séparateur ni parenthèse du tout, qui déborde');
  assert.ok(t.endsWith('…') && t.length <= 44, t);
});

test('splitNote : tête + rangées, segments sans titre rattachés au précédent', () => {
  const html = '<strong>Titre jour.</strong> blabla<br><br><strong>Comptage :</strong> un<br>deux<br><br>sans titre<br><br><strong>Plan (V2).</strong>';
  const r = splitNote(html);
  assert.strictEqual(r.head, '<strong>Titre jour.</strong> blabla');
  assert.deepStrictEqual(r.sections.map((s) => s.title), ['Comptage', 'Plan (V2)']);
  assert.match(r.sections[0].html, /un<br>deux<br><br>sans titre$/);
});

test('splitNote : moins de 3 segments → null (le résumé reste entier)', () => {
  assert.strictEqual(splitNote('texte seul'), null);
  assert.strictEqual(splitNote('<strong>a</strong> b<br><br><strong>c</strong>'), null);
});

test('splitNote : la vraie page du 30/10', () => {
  const page = fs.readFileSync(path.join(__dirname, '..', '..', 'sessions', '2026-10-30-vendredi.html'), 'utf8');
  const r = splitNote(page.match(/<div class="note-block">([\s\S]*?)<\/div>/)[1]);
  assert.ok(r.head.indexOf('+2 248,50') >= 0, 'la tête doit être le titre de la journée');
  const titles = r.sections.map((s) => s.title);
  ['Comptage', 'Distance du stop (V2.1)', 'Contexte', 'Ce qui manque'].forEach((t) => assert.ok(titles.includes(t), 'titre manquant : ' + t));
  assert.ok(titles.every((t) => t.length <= 44), 'titre trop long : ' + titles.join(' | '));
});
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `node --test tests/mobile/split-note.test.js`
Expected: échec (`Cannot find module '../../_systeme/mobile.js'`).

- [ ] **Step 3: Écrire `_systeme/mobile.js` (partie pure)**

```js
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
```

- [ ] **Step 4: Lancer, vérifier que tout passe**

Run: `node --test tests/mobile/*.test.js`
Expected: `pass 8`, `fail 0` (2 du garde-fou + 6 de `split-note`).

- [ ] **Step 5: Commit**

```bash
cd /Users/seb/Library/CloudStorage/Dropbox/Trading/journal-trading && git add _systeme/mobile.js tests/mobile/split-note.test.js && git commit -q -F - <<'EOF'
feat: couche téléphone — découpage du résumé d'une séance en rangées (shortTitle, splitNote) avec tests

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
git log --oneline -1 | cut -c1-90
```

---

### Task 3: La coque d'app sur `index.html` (barre d'onglets, feuille « Plus », titres, sous-pages)

**Files:**
- Modify: `_systeme/mobile.js` (remplacer la ligne `/* @@DOM@@ */`)
- Modify: `_systeme/mobile.css` (ajouter un bloc à la suite)
- Modify: `index.html` (ajouter `<script src="_systeme/mobile.js"></script>` juste avant `</body>`)

**Interfaces:**
- Consumes: `.nav a[data-goto]` (clic = changement d'onglet du routeur), `#dash-subnav .sn-btn[data-sub="overview"]`, `#theme-toggle`, `[data-open="onglet/sous-page"]` (délégué par `index.html`).
- Produces (dans `mobile.js`) :
  - `feature(f: { page: 'index'|'session', on(): void, off(): void })` — enregistre une fonctionnalité activée / défaite quand l'écran devient / cesse d'être étroit ; **le marqueur `/* @@FEATURES@@ */` est l'endroit où les tâches 4 et 6 ajoutent les leurs.**
  - `el(tag, cls, html)`, `esc(text)`, `fr(n, decimals)`, `usd(n, decimals)`, `ICON` (`dashboard`, `sessions`, `brief`, `regles`, `plus`, `stats`), `goIndexTab(id)`, `openSheet()`, `closeSheet()`, `syncActive()`, `MQ` (la `MediaQueryList`), `IS_SESSION`.
  - Classes posées sur `<html>` : `m-shell` (coque active), `m-session` (page de séance).

- [ ] **Step 1: Remplacer `/* @@DOM@@ */` dans `_systeme/mobile.js` par la coque**

```js
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
  /* @@FEATURES@@ */

  function apply(){
    var on = MQ.matches;
    if(on && !built){ built = true; buildTabbar(); buildSheet(); watchNav(); }
    document.documentElement.classList.toggle('m-shell', on);
    document.documentElement.classList.toggle('m-session', on && IS_SESSION);
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
```

- [ ] **Step 2: Ajouter le bloc CSS de la coque à la suite de `_systeme/mobile.css`**

```css

/* ═════ Étape 1 · coque d'app : barre d'onglets, titres, sous-pages, feuille « Plus » ═════ */
@media (max-width:700px){
  html.m-shell{--m-bar:calc(56px + env(safe-area-inset-bottom));--m-gut:16px}
  html.m-shell body{font-size:17px;line-height:1.45}
  html.m-shell .nav,html.m-shell .side-nav{display:none}
  html.m-shell .wrap{padding:calc(12px + env(safe-area-inset-top)) var(--m-gut) calc(var(--m-bar) + 32px)}
  html.m-shell .saveline{right:12px;bottom:calc(var(--m-bar) + 10px)}
  html.m-shell .sj-toast{bottom:calc(var(--m-bar) + 16px)}

  /* grands titres */
  html.m-shell h1{font-size:34px;line-height:1.1;letter-spacing:-.025em;margin:6px 0}
  html.m-shell #view-sessions>h2{font-size:34px;line-height:1.1;letter-spacing:-.025em;margin:6px 0 14px;padding:0;background:none}

  /* sous-pages : une rangée qu'on fait glisser du doigt, collée en haut */
  html.m-shell .subnav{position:sticky;top:0;z-index:50;display:flex;flex-wrap:nowrap;gap:8px;overflow-x:auto;
    margin:calc(-12px - env(safe-area-inset-top)) calc(-1 * var(--m-gut)) 14px;padding:calc(8px + env(safe-area-inset-top)) var(--m-gut) 10px;
    border-bottom:0;background:color-mix(in srgb,var(--bg) 80%,transparent);
    -webkit-backdrop-filter:saturate(1.8) blur(20px);backdrop-filter:saturate(1.8) blur(20px);
    scrollbar-width:none;-webkit-overflow-scrolling:touch}
  html.m-shell .subnav::-webkit-scrollbar{display:none}
  html.m-shell .sn-btn{flex:none;min-height:44px;padding:0 18px;border-radius:22px;font-size:15px;font-weight:600;white-space:nowrap}

  /* barre d'onglets */
  html.m-shell .m-tabbar{position:fixed;left:0;right:0;bottom:0;z-index:300;display:flex;height:var(--m-bar);
    padding:0 4px env(safe-area-inset-bottom);border-top:1px solid var(--line);
    background:color-mix(in srgb,var(--bg) 78%,transparent);
    -webkit-backdrop-filter:saturate(1.8) blur(20px);backdrop-filter:saturate(1.8) blur(20px)}
  html.m-shell .m-tab{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;
    padding:0;border:0;background:none;font:inherit;font-size:11px;font-weight:600;line-height:1.1;color:var(--muted);text-decoration:none;cursor:pointer}
  html.m-shell .m-tab svg{width:26px;height:26px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
  html.m-shell .m-tab.on{color:var(--accent)}
  html.m-shell .m-tab:active{transform:scale(.94)}

  /* feuille « Plus » */
  html.m-shell .m-sheet-bg{position:fixed;inset:0;z-index:310;background:rgba(0,0,0,.4);opacity:0;visibility:hidden;
    transition:opacity .25s linear,visibility 0s linear .25s}
  html.m-shell .m-sheet-bg.is-open{opacity:1;visibility:visible;transition:opacity .25s linear}
  html.m-shell .m-sheet{position:fixed;left:0;right:0;bottom:0;z-index:320;max-height:82vh;overflow-y:auto;
    padding:8px var(--m-gut) calc(24px + env(safe-area-inset-bottom));
    border-radius:20px 20px 0 0;border:1px solid var(--line);border-bottom:0;
    background:color-mix(in srgb,var(--panel) 88%,transparent);
    -webkit-backdrop-filter:saturate(1.8) blur(24px);backdrop-filter:saturate(1.8) blur(24px);
    transform:translate3d(0,105%,0);visibility:hidden;
    transition:transform var(--dur-sheet,.35s) var(--ease-sheet,ease-out),visibility 0s linear var(--dur-sheet,.35s)}
  html.m-shell .m-sheet.is-open{transform:none;visibility:visible;transition:transform var(--dur-sheet,.35s) var(--ease-sheet,ease-out)}
  html.m-shell .m-sheet-grip{width:40px;height:5px;border-radius:3px;background:var(--line);margin:4px auto 12px}
  html.m-shell .m-sheet-title{font-size:22px;margin:0 0 10px;padding:0;background:none}

  /* listes à grosses lignes (feuille « Plus », Accueil) */
  html.m-shell .m-list{border-radius:16px;overflow:hidden;background:var(--panel);border:1px solid var(--line)}
  html.m-shell .m-row{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;min-height:56px;padding:0 16px;
    border:0;border-top:1px solid var(--line);background:none;font:inherit;font-size:17px;color:var(--txt);text-align:left;text-decoration:none;cursor:pointer}
  html.m-shell .m-row:first-child{border-top:0}
  html.m-shell .m-row:active{background:var(--white-dim)}
  html.m-shell .m-row-val{color:var(--muted);font-size:15px}
  html.m-shell .m-chev{flex:none;width:9px;height:9px;margin-right:4px;border-right:2px solid var(--dim);border-top:2px solid var(--dim);transform:rotate(45deg)}

  @media (prefers-reduced-transparency:reduce){
    html.m-shell .m-tabbar,html.m-shell .subnav{background:var(--bg);-webkit-backdrop-filter:none;backdrop-filter:none}
    html.m-shell .m-sheet{background:var(--panel);-webkit-backdrop-filter:none;backdrop-filter:none}
  }
  @media (prefers-reduced-motion:reduce){
    html.m-shell .m-sheet{transform:none;opacity:0;transition:opacity .2s linear,visibility 0s linear .2s}
    html.m-shell .m-sheet.is-open{opacity:1;transition:opacity .2s linear}
  }
}
```

- [ ] **Step 3: Ajouter le script à `index.html`**

Run :

```bash
cd /Users/seb/Library/CloudStorage/Dropbox/Trading/journal-trading && python3 - <<'EOF'
t = open('index.html', encoding='utf-8').read()
assert t.count('</body>') == 1 and 'mobile.js' not in t
t = t.replace('</body>', '<script src="_systeme/mobile.js"></script>\n</body>', 1)
open('index.html', 'w', encoding='utf-8').write(t)
EOF
grep -c 'mobile.js' index.html; node --test tests/mobile/*.test.js 2>&1 | grep -E "^# (pass|fail)"
```
Expected : `1` ; `# pass 8` et `# fail 0` (le garde-fou valide le nouveau bloc CSS ; `mobile.js` se charge encore sous Node).

- [ ] **Step 4: Vérifier sur téléphone émulé**

Serveur local, `resize_window` preset `mobile`, recharger sans cache, `navigate` vers `http://localhost:8731/index.html#dashboard`, puis exécuter :

```js
(function(){
  var t = document.querySelector('.m-tabbar'), r = t && t.getBoundingClientRect();
  return JSON.stringify({
    shell: document.documentElement.classList.contains('m-shell'),
    tabs: t ? [].map.call(t.querySelectorAll('.m-tab'), function(n){ return n.textContent.trim() + (n.classList.contains('on') ? '*' : ''); }) : null,
    barBottom: r ? Math.round(r.bottom) : null, innerHeight: innerHeight,
    navHidden: getComputedStyle(document.querySelector('.nav')).display
  });
})()
```
Expected : `shell:true`, onglets `["Accueil*","Séances","Avant séance","Règles","Plus"]`, `barBottom == innerHeight`, `navHidden:"none"`.

Puis, avec de vrais clics (`mcp__Claude_Browser__find` + `computer left_click`) :
1. Taper « Séances » → `#view-sessions` visible (`document.getElementById('view-sessions').classList.contains('active')` = `true`), l'onglet « Séances » porte `*`.
2. Taper « Plus » → la feuille monte (`document.querySelector('.m-sheet').classList.contains('is-open')` = `true`) ; taper « Progression » → la feuille se ferme et `document.querySelector('#view-dashboard .subview[data-subview="progression"]').classList.contains('active')` = `true`.
3. Taper « Accueil » → `document.querySelector('#view-dashboard .subview[data-subview="overview"]').classList.contains('active')` = `true`.
4. Taper « Thème » dans la feuille → `document.documentElement.getAttribute('data-theme')` change ; retaper jusqu'à revenir au réglage de départ.
5. `mcp__Claude_Browser__read_console_messages` avec `onlyErrors:true` → aucune erreur. Capture d'écran à l'échelle 0,5 pour contrôler le rendu (barre en bas, rangée de sous-pages qui défile, titre 34 px).

- [ ] **Step 5: Vérifier que le Mac retrouve son DOM (élargissement sans rechargement)**

Sans recharger, `resize_window` preset `desktop`, puis l'empreinte.
Expected : `shell:false`, `document.querySelector('.m-tabbar').hidden === true`, et `hash` / `len` / `cs` identiques à `empreinte_index_avant.txt` (relancer aussi après un retour en `mobile` puis `desktop` : même résultat).

- [ ] **Step 6: Commit**

```bash
cd /Users/seb/Library/CloudStorage/Dropbox/Trading/journal-trading && pkill -f "http.server 8731"; git add _systeme/mobile.js _systeme/mobile.css index.html && git commit -q -F - <<'EOF'
feat: couche téléphone — coque d'app sur index.html : barre d'onglets en bas, feuille « Plus », grands titres, rangée de sous-pages qui défile

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
git log --oneline -1 | cut -c1-90
```

---

### Task 4: L'Accueil (résumé + gros boutons)

**Files:**
- Modify: `_systeme/mobile.js` (insérer avant `/* @@FEATURES@@ */`)
- Modify: `_systeme/mobile.css` (ajouter un bloc à la suite)

**Interfaces:**
- Consumes: `feature`, `el`, `esc`, `fr`, `usd`, `ICON`, `goIndexTab`, `openSheet`, `syncActive`, `MQ` (tâche 3) ; `window.netActifs()` → `{ n, base, sol, net, act: [{ l, c, d }], out }` avec `c = { solde, depart, objectif, buffer }` ; `window.SESSIONS[]` (`{ jour, label, fichier, pnl, trades }`, le plus récent en premier) ; `#day-banner` ; `#view-dashboard .tz-card` (`.lbl`, `.val` ou `.tz-ring-val`, `.tz-sub`).
- Produces: `#m-home` (en tête de la sous-page « Vue d'ensemble ») ; `<details class="m-all">` « Tout le tableau de bord » qui reçoit, **déplacés et non copiés**, tous les anciens enfants de la sous-page ; `buildHome(): boolean` (vrai si construit ou déjà construit), `unbuildHome(): void` (remet les nœuds à leur place d'origine).

- [ ] **Step 1: Insérer la fonctionnalité « Accueil » avant `/* @@FEATURES@@ */`**

```js
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

    var accts = N.act.map(function(x){
      var c = x.c, cib = (c.objectif != null && c.depart != null) ? c.objectif - c.depart : 3000;
      var p = Math.max(0, Math.min(100, x.d / cib * 100));
      return '<div class="m-acct">'
        + '<div class="m-acct-top"><b>' + esc(x.l) + '</b><span class="m-acct-bal">' + fr(c.solde) + ' $</span></div>'
        + '<div class="m-acct-d ' + (x.d < 0 ? 'neg' : 'pos') + '">' + usd(x.d) + ' <span>depuis le départ</span></div>'
        + '<div class="m-bar"><i style="width:' + p.toFixed(0) + '%"></i></div>'
        + '<div class="m-acct-f">Objectif ' + fr(cib) + ' $ · ' + Math.round(p) + ' %' + (typeof c.buffer === 'number' ? '<br>Marge avant perte : ' + fr(c.buffer) + ' $' : '') + '</div>'
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

    var nodes = [].slice.call(host.children), banner = document.getElementById('day-banner');
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

```

- [ ] **Step 2: Ajouter le bloc CSS de l'Accueil à la suite de `_systeme/mobile.css`**

```css

/* ═════ Étape 1 · Accueil ═════ */
@media (max-width:700px){
  html.m-shell .m-home{display:flex;flex-direction:column;gap:14px;margin-bottom:18px}
  html.m-shell .m-home-head{display:flex;flex-direction:column;gap:2px}
  html.m-shell .m-home-eyebrow{font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--accent)}
  html.m-shell .m-home-title{font-size:34px;font-weight:700;letter-spacing:-.025em;line-height:1.1;margin:0}
  html.m-shell .m-home .day-banner{margin:0}
  html.m-shell .m-net{padding:20px 18px;border-radius:20px;background:var(--panel);border:1px solid var(--line);box-shadow:var(--shadow-1)}
  html.m-shell .m-net small{display:block;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
  html.m-shell .m-net-val{font-size:44px;font-weight:750;letter-spacing:-.03em;line-height:1.1;margin:6px 0 14px;font-variant-numeric:tabular-nums}
  html.m-shell .m-bar{height:10px;border-radius:5px;background:var(--line);overflow:hidden}
  html.m-shell .m-bar i{display:block;height:100%;border-radius:5px;background:var(--accent)}
  html.m-shell .m-net-sub{margin-top:10px;font-size:15px;color:var(--muted)}

  html.m-shell .m-accts{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  html.m-shell .m-acct{display:flex;flex-direction:column;gap:6px;min-width:0;padding:16px;border-radius:18px;background:var(--panel);border:1px solid var(--line)}
  html.m-shell .m-acct-top{display:flex;justify-content:space-between;align-items:baseline;gap:6px}
  html.m-shell .m-acct-top b{font-size:17px}
  html.m-shell .m-acct-bal{font-size:19px;font-weight:750;font-variant-numeric:tabular-nums}
  html.m-shell .m-acct-d{font-size:17px;font-weight:700;font-variant-numeric:tabular-nums}
  html.m-shell .m-acct-d span{font-size:13px;font-weight:500;color:var(--muted)}
  html.m-shell .m-acct-f{font-size:13px;line-height:1.35;color:var(--muted)}

  html.m-shell .m-last{min-height:64px}
  html.m-shell .m-last-l{display:flex;flex-direction:column;flex:1;line-height:1.25}
  html.m-shell .m-last-l small{font-size:13px;color:var(--muted)}
  html.m-shell .m-last-p{font-size:20px;font-weight:750;font-variant-numeric:tabular-nums}

  html.m-shell .m-mini{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
  html.m-shell .m-mini-c{display:flex;flex-direction:column;align-items:flex-start;gap:4px;min-height:72px;padding:12px;border-radius:16px;
    border:1px solid var(--line);background:var(--panel);font:inherit;color:var(--txt);text-align:left;cursor:pointer}
  html.m-shell .m-mini-c small{font-size:12px;line-height:1.2;color:var(--muted)}
  html.m-shell .m-mini-c b{font-size:22px;font-weight:750;font-variant-numeric:tabular-nums}

  html.m-shell .m-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  html.m-shell .m-big{display:flex;flex-direction:column;align-items:flex-start;justify-content:space-between;gap:10px;min-height:96px;padding:14px 16px;
    border-radius:20px;border:1px solid var(--line);background:var(--panel);font:inherit;font-size:17px;font-weight:650;color:var(--txt);text-align:left;cursor:pointer}
  html.m-shell .m-big svg{width:30px;height:30px;fill:none;stroke:var(--accent);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
  html.m-shell .m-big:active,html.m-shell .m-mini-c:active{transform:scale(.97)}

  html.m-shell .m-all{border-radius:16px;border:1px solid var(--line);background:var(--panel);overflow:hidden}
  html.m-shell .m-all>summary{display:flex;align-items:center;justify-content:space-between;min-height:56px;padding:0 16px;font-size:17px;font-weight:650;list-style:none;cursor:pointer}
  html.m-shell .m-all>summary::-webkit-details-marker{display:none}
  html.m-shell .m-all>summary::after{content:'';flex:none;width:9px;height:9px;margin-right:4px;border-right:2px solid var(--dim);border-top:2px solid var(--dim);transform:rotate(135deg);transition:transform .25s}
  html.m-shell .m-all[open]>summary::after{transform:rotate(-45deg)}
  html.m-shell .m-all-body{padding:4px 12px 16px}
}
```

- [ ] **Step 3: Tests et vérification**

Run: `node --test tests/mobile/*.test.js 2>&1 | grep -E "^# (pass|fail)"` → `# pass 8`, `# fail 0`.

Serveur local, fenêtre `mobile`, recharger sans cache, `index.html#dashboard`, puis :

```js
(function(){
  var h = document.getElementById('m-home');
  var q = function(s){ var e = h && h.querySelector(s); return e ? e.textContent.replace(/\s+/g,' ').trim() : null; };
  return JSON.stringify({
    built: !!h, title: q('.m-home-title'), net: q('.m-net-val'), sub: q('.m-net-sub'),
    accts: h ? [].map.call(h.querySelectorAll('.m-acct'), function(a){ return a.textContent.replace(/\s+/g,' ').trim(); }) : null,
    last: q('.m-last'), minis: h ? [].map.call(h.querySelectorAll('.m-mini-c'), function(a){ return a.textContent.trim(); }) : null,
    bigs: h ? [].map.call(h.querySelectorAll('.m-big'), function(a){ return a.textContent.trim(); }) : null,
    bannerInHome: !!document.querySelector('#m-home #day-banner'),
    allClosed: document.querySelector('.m-all') && !document.querySelector('.m-all').open
  });
})()
```
Expected (chiffres du 30/10) : `net` `+3 265 $`, `sub` contient `54 % de 6 000 $` et `il reste 2 735 $`, deux comptes (`001` à `52 288 $`, `02b` à `50 977 $`), `last` contient `Vendredi 30 oct.` et `+2 249 $`, trois mini-chiffres (`32 %`, `0,78`, `41 %`), quatre boutons `Avant la séance`, `Séances`, `Règles`, `Stats`, `bannerInHome:true`, `allClosed:true`.

Vrais clics : « Règles » (gros bouton) → l'onglet Règles s'ouvre ; revenir à « Accueil » ; « Stats » → la feuille « Plus » monte ; la rangée « Dernière séance » ouvre `sessions/2026-10-30-vendredi.html` ; « Tout le tableau de bord » se déplie et montre les cartes d'origine (Net P&L, Trade win %…).
`read_console_messages` (`onlyErrors:true`) → rien.

- [ ] **Step 4: Vérifier que le Mac retrouve son DOM**

Sans recharger : `resize_window` preset `desktop`, puis l'empreinte de `index.html#dashboard`.
Expected : identique à `empreinte_index_avant.txt` (les nœuds déplacés sont revenus à leur place, `#m-home` et `.m-all` ont disparu : `document.querySelector('#m-home')` = `null`). Repasser en `mobile` : l'Accueil se reconstruit.

- [ ] **Step 5: Commit**

```bash
cd /Users/seb/Library/CloudStorage/Dropbox/Trading/journal-trading && pkill -f "http.server 8731"; git add _systeme/mobile.js _systeme/mobile.css && git commit -q -F - <<'EOF'
feat: couche téléphone — Accueil : net P&L en grand et barre vers l'objectif, cartes des comptes, dernière séance, mini-chiffres, quatre gros boutons ; ancien tableau de bord replié dessous

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
git log --oneline -1 | cut -c1-90
```

---

### Task 5: La liste des séances (CSS seul)

**Files:**
- Modify: `_systeme/mobile.css` (ajouter un bloc à la suite)

**Interfaces:**
- Consumes: le HTML généré par `renderSessions()` dans `index.html` : `.sf-filters` > `.sf-filter`, `.sf-legend`, `details.sf-month` > `summary.sf-mh` (`.sf-mh-name`, `.sf-mh-sum`) + `.sf` > `.sf-wk` / `a.sr.win|lose|flat` (`.sr-date`, `.sr-pnl`, `.sr-r`, `.sr-trades`, `.sr-wr`, `.sr-note`).
- Produces: rien de nouveau côté JS (la liste se regénère à chaque filtre : le CSS suffit).

- [ ] **Step 1: Ajouter le bloc CSS à la suite de `_systeme/mobile.css`**

```css

/* ═════ Étape 1 · liste des séances ═════ */
@media (max-width:700px){
  html.m-shell .sf-filters{gap:10px;margin-bottom:14px}
  html.m-shell .sf-filter{min-height:44px;padding:0 18px;border-radius:22px;font-size:15px}
  html.m-shell .sf-legend{display:none}
  html.m-shell .sf-mh{position:sticky;top:0;z-index:20;min-height:52px;margin:10px 0 4px;padding:calc(6px + env(safe-area-inset-top)) 0 6px;background:var(--bg)}
  html.m-shell .sf-mh-name,html.m-shell .sf-mh-sum{font-size:17px}
  html.m-shell .sf{gap:8px}
  html.m-shell .sf-wk{margin:14px 0 4px}
  html.m-shell .sf-wk-name{font-size:13px}
  html.m-shell .sr{grid-template-columns:1fr auto;grid-template-areas:"date pnl" "meta r";gap:4px 12px;align-items:center;min-height:64px;padding:12px 16px;border-radius:14px}
  html.m-shell .sr-date{grid-area:date;flex-wrap:wrap;font-size:17px;font-weight:650}
  html.m-shell .sr-pnl{grid-area:pnl;font-size:20px}
  html.m-shell .sr-trades{grid-area:meta;text-align:left;font-size:14px;color:var(--muted)}
  html.m-shell .sr-r{grid-area:r;font-size:14px}
  html.m-shell .sr-wr,html.m-shell .sr-note{display:none}
}
```

- [ ] **Step 2: Tests et vérification**

Run: `node --test tests/mobile/*.test.js 2>&1 | grep -E "^# (pass|fail)"` → `# pass 8`, `# fail 0`.

Serveur local, fenêtre `mobile`, recharger sans cache, `index.html#sessions` :

```js
(function(){
  var r = document.querySelector('#sessions-feed a.sr'), b = r.getBoundingClientRect(), k = getComputedStyle(r);
  return JSON.stringify({
    first: r.innerText.replace(/\s+/g, ' ').trim().slice(0, 80),
    h: Math.round(b.height), w: Math.round(b.width), cols: k.gridTemplateColumns,
    noteHidden: getComputedStyle(r.querySelector('.sr-note')).display,
    legendHidden: getComputedStyle(document.querySelector('.sf-legend')).display,
    filterH: Math.round(document.querySelector('.sf-filter').getBoundingClientRect().height),
    overflowX: document.documentElement.scrollWidth > innerWidth
  });
})()
```
Expected : première ligne `Ven. 30 Oct. … +2249 $ …`, `h ≥ 64`, deux colonnes, `noteHidden:"none"`, `legendHidden:"none"`, `filterH ≥ 44`, `overflowX:false`.
Vrais clics : « Gagnantes ✓ » filtre la liste (les lignes restent au bon format) ; taper une ligne ouvre sa page de séance ; faire défiler : l'en-tête du mois reste collé en haut. Capture d'écran à 0,5.

- [ ] **Step 3: Mac inchangé**

`resize_window` preset `desktop` → relancer l'empreinte de `index.html#sessions` : `shell:false` (toutes les règles sont sous `html.m-shell`).
Expected : `shell:false`, `.sr` en `grid-template-columns` à 6 colonnes (`document.querySelector('a.sr') && getComputedStyle(document.querySelector('a.sr')).gridTemplateColumns.split(' ').length === 6`).

- [ ] **Step 4: Commit**

```bash
cd /Users/seb/Library/CloudStorage/Dropbox/Trading/journal-trading && pkill -f "http.server 8731"; git add _systeme/mobile.css && git commit -q -F - <<'EOF'
feat: couche téléphone — liste des séances : lignes de 64 px (date, P&L en grand, trades, ≈ R), filtres en gros boutons, en-tête du mois collant

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
git log --oneline -1 | cut -c1-90
```

---

### Task 6: La page d'une séance

**Files:**
- Modify: `_systeme/session.js` (ajouter un chargeur de `mobile.js` en fin de fichier)
- Modify: `_systeme/mobile.js` (insérer avant `/* @@FEATURES@@ */`)
- Modify: `_systeme/mobile.css` (ajouter un bloc à la suite)

**Interfaces:**
- Consumes: `feature`, `esc`, `splitNote` (tâches 2–3) ; le HTML des pages de séance : `a.sp-back`, `.sp-header` (`.sp-title`, `.sp-pnl.td-w|td-l`), `.sp-meta`, `.note-block`, `.acct-header`, `.tbl-wrap > table.trades-table` (`tr.trade-row` de 8 cellules : #, contrat, sens, qté, entrée, sortie, heure, P&L ; `tr.note-row` avec `.trade-note`, `.trade-rr`, `.trade-copy`, `.shots-pair`), `.total-bar`, `.reflect-grid`, `.reflect-copy`.
- Produces: chargement de `mobile.js` par `session.js` (toutes les pages) ; fonctionnalité `page:'session'` (texte du lien retour « ‹ Séances » et résumé en rangées, défaits au passage en large).

- [ ] **Step 1: Ajouter le chargeur à la fin de `_systeme/session.js`**

Ajouter après la dernière ligne (`window.addEventListener('DOMContentLoaded', initSessionPage);`) :

```js

/* ---------- Couche « app iOS » du téléphone (≤ 700 px) : mobile.js décide seul s'il s'active (rien au-dessus de 700 px) ---------- */
(function(){
  var me = document.currentScript && document.currentScript.src;
  if(!me) return;
  var s = document.createElement('script');
  s.src = me.replace(/session\.js(\?.*)?$/, 'mobile.js');
  document.head.appendChild(s);
})();
```

- [ ] **Step 2: Insérer la fonctionnalité « page de séance » avant `/* @@FEATURES@@ */` dans `_systeme/mobile.js`**

```js
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

```

- [ ] **Step 3: Ajouter le bloc CSS de la page de séance à la suite de `_systeme/mobile.css`**

```css

/* ═════ Étape 1 · page d'une séance ═════ */
@media (max-width:700px){
  @keyframes m-push{from{opacity:0;transform:translate3d(28px,0,0)}to{opacity:1;transform:none}}
  html.m-session .wrap{animation:m-push var(--dur-move,.5s) var(--ease-move,ease-out) both}

  html.m-shell .sp-back{display:inline-flex;align-items:center;min-height:48px;margin:0 0 2px;font-size:17px;font-weight:600;color:var(--accent)}
  html.m-shell .sp-header{flex-direction:column;align-items:flex-start;gap:10px;margin:2px 0 8px}
  html.m-shell .sp-title{font-size:34px;line-height:1.1;letter-spacing:-.025em}
  html.m-shell .sp-pnl{font-size:40px;padding:4px 18px}
  html.m-shell .sp-meta{font-size:15px;margin-bottom:18px}

  /* résumé : tête visible, le reste en rangées à déplier */
  html.m-shell .note-block{padding:16px;font-size:17px;line-height:1.5;border-radius:16px}
  html.m-shell .m-head{margin-bottom:6px}
  html.m-shell .m-sec{border-top:1px solid var(--line)}
  html.m-shell .m-sec>summary{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:56px;font-size:17px;font-weight:650;list-style:none;cursor:pointer}
  html.m-shell .m-sec>summary::-webkit-details-marker{display:none}
  html.m-shell .m-sec>summary::after{content:'';flex:none;width:9px;height:9px;border-right:2px solid var(--dim);border-top:2px solid var(--dim);transform:rotate(45deg);transition:transform .25s}
  html.m-shell .m-sec[open]>summary::after{transform:rotate(135deg)}
  html.m-shell .m-sec-body{padding:2px 0 14px;font-size:16px;line-height:1.55}

  /* trades : une carte par ligne au lieu d'un tableau qui défile de côté */
  html.m-shell .tbl-wrap{overflow:visible;border:0;border-radius:0;background:none;box-shadow:none}
  html.m-shell .trades-table,html.m-shell .trades-table tbody{display:block;width:100%}
  html.m-shell .trades-table thead{display:none}
  html.m-shell .trades-table tr.trade-row{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 10px;margin-top:12px;padding:16px 16px 6px;border-radius:16px 16px 0 0;background:var(--panel)}
  html.m-shell .trades-table tr.trade-row::after{content:'';order:5;flex-basis:100%;height:0}
  html.m-shell .trades-table td{display:block;padding:0;border:0;background:none !important}
  html.m-shell .trades-table td:nth-child(1){display:none}
  html.m-shell .trades-table td:nth-child(3){order:1;font-size:22px;font-weight:750}
  html.m-shell .trades-table td:nth-child(4){order:2;font-size:17px;font-weight:650;color:var(--muted)}
  html.m-shell .trades-table td:nth-child(4)::before{content:'× '}
  html.m-shell .trades-table td:nth-child(2){order:3;font-size:14px;color:var(--muted)}
  html.m-shell .trades-table td:nth-child(8){order:4;margin-left:auto;font-size:24px;font-weight:800}
  html.m-shell .trades-table td:nth-child(5){order:6;font-size:17px}
  html.m-shell .trades-table td:nth-child(6){order:7;font-size:17px}
  html.m-shell .trades-table td:nth-child(6)::before{content:'→ ';color:var(--dim)}
  html.m-shell .trades-table td:nth-child(7){order:8;flex-basis:100%;font-size:14px !important;color:var(--muted)}
  html.m-shell .trades-table tr.note-row{display:block;padding:0 16px 16px;border-radius:0 0 16px 16px;background:var(--panel)}
  html.m-shell .trades-table tr.trade-row:has(.td-w),html.m-shell .trades-table tr.trade-row:has(.td-w)+tr.note-row{background:color-mix(in srgb,var(--green) 10%,var(--panel))}
  html.m-shell .trades-table tr.trade-row:has(.td-l),html.m-shell .trades-table tr.trade-row:has(.td-l)+tr.note-row{background:color-mix(in srgb,var(--red) 10%,var(--panel))}

  /* saisies : grands champs, sans zoom Safari */
  html.m-shell .trade-rr{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;align-items:end;margin-top:12px;padding-top:12px}
  html.m-shell .trade-rr label{display:flex;flex-direction:column;align-items:stretch;gap:6px;font-size:13px;font-weight:600}
  html.m-shell .trade-rr .trade-rr-input,html.m-shell .trade-rr .trade-rr-input[data-field="rr"]{width:100%;min-height:48px;padding:0 12px;border-radius:12px;font-size:17px !important}
  html.m-shell .trade-rr-out{grid-column:1/-1;font-size:15px}
  html.m-shell .trade-note{min-height:96px;padding:12px 14px;border-radius:12px;font-size:17px !important}
  html.m-shell .trade-copy-btn{min-height:44px;padding:0 16px;border-radius:12px;font-size:15px}
  html.m-shell .trade-shots-drop{display:flex;align-items:center;justify-content:center;min-height:56px;padding:0 14px;border-radius:14px;font-size:16px}
  html.m-shell .trade-shots-drop span{display:none}
  html.m-shell .shot-act{width:44px;height:44px;font-size:20px}

  /* relecture */
  html.m-shell .section-title{font-size:13px;margin:28px 0 12px}
  html.m-shell .reflect-grid{grid-template-columns:1fr}
  html.m-shell .reflect-item{padding:14px 16px;border-radius:14px}
  html.m-shell .reflect-note{min-height:110px;padding:12px 14px;border-radius:12px;font-size:17px !important}
  html.m-shell .reflect-copy{flex-direction:column;align-items:stretch;gap:8px}
  html.m-shell .reflect-copy button{min-height:52px;border-radius:14px;font-size:17px;background:var(--accent);border-color:var(--accent);color:var(--on-accent)}
  html.m-shell .reflect-copy button:disabled{opacity:.4}
  html.m-shell .total-bar{padding:16px;border-radius:14px}
  html.m-shell .total-val{font-size:22px}

  @media (prefers-reduced-motion:reduce){
    @keyframes m-push{from{opacity:0}to{opacity:1}}
  }
}
```

- [ ] **Step 4: Tests**

Run: `node --test tests/mobile/*.test.js 2>&1 | grep -E "^# (pass|fail)"` → `# pass 8`, `# fail 0`.

- [ ] **Step 5: Vérifier une séance gagnante (30/10), fenêtre `mobile`**

Serveur local, recharger sans cache (incluant `session.js`), `navigate` vers `http://localhost:8731/sessions/2026-10-30-vendredi.html` :

```js
(function(){
  var nb = document.querySelector('.note-block'), secs = [].map.call(nb.querySelectorAll('.m-sec > summary'), function(s){ return s.textContent.trim(); });
  var rows = document.querySelectorAll('tr.trade-row'), r0 = rows[0].getBoundingClientRect(), t = document.querySelector('.m-tabbar');
  return JSON.stringify({
    shell: document.documentElement.classList.contains('m-shell'), session: document.documentElement.classList.contains('m-session'),
    back: document.querySelector('.sp-back').textContent.trim(),
    head: nb.querySelector('.m-head').textContent.trim().slice(0, 60), sections: secs,
    cards: rows.length, cardW: Math.round(r0.width), tableOverflow: document.querySelector('.tbl-wrap').scrollWidth > document.querySelector('.tbl-wrap').clientWidth,
    inputH: Math.round(document.querySelector('.trade-rr-input').getBoundingClientRect().height),
    daxton: !!document.querySelector('.shots-col.fix[data-who="daxton"]') && document.querySelector('.shots-col.fix[data-who="daxton"]').offsetParent !== null,
    tabbar: !!t && !t.hidden, overflowX: document.documentElement.scrollWidth > innerWidth
  });
})()
```
Expected : `shell:true`, `session:true`, `back:"‹ Séances"`, `head` commence par `+2 248,50 $`, `sections` contient `Comptage`, `Distance du stop (V2.1)`, `Contexte`, `Daxton, le même jour`, `Ce qui manque`, `cards:2`, `cardW ≈ 343`, `tableOverflow:false`, `inputH ≥ 48`, `daxton:true`, `tabbar:true`, `overflowX:false`.

Vrais clics : taper la rangée « Comptage » → elle se déplie (`details.open`) ; saisir « 28798.50 » dans un champ Stop → le R:R se recalcule ; taper l'onglet « Séances » de la barre → `index.html#sessions` s'ouvre avec la bonne vue ; taper « ‹ Séances » → retour à la liste. Capture d'écran (échelle 0,5) du haut de page et d'une carte de trade.

- [ ] **Step 6: Vérifier une séance perdante et une page ancienne**

1. `sessions/2026-10-29-jeudi.html` (perdante) : mêmes contrôles ; cartes teintées rouge ; colonne Daxton visible.
2. Une page d'août (la plus ancienne : `ls sessions | head -3`) : la page s'affiche sans erreur console, le résumé est soit en rangées soit, s'il a moins de 3 segments, en texte entier en gros caractères (`document.querySelector('.m-sec') === null` est alors correct), pas de défilement horizontal de la page.

- [ ] **Step 7: Mac inchangé (page de séance)**

Sans recharger : `resize_window` preset `desktop` → l'empreinte de la page du 30/10.
Expected : identique à `empreinte_seance_avant.txt` (`.sp-back` a retrouvé « ← Journal », le résumé est redevenu un seul bloc, `.m-tabbar` est `hidden`).

- [ ] **Step 8: Commit**

```bash
cd /Users/seb/Library/CloudStorage/Dropbox/Trading/journal-trading && pkill -f "http.server 8731"; git add _systeme/session.js _systeme/mobile.js _systeme/mobile.css && git commit -q -F - <<'EOF'
feat: couche téléphone — page d'une séance : titre et P&L en grand, résumé en rangées à déplier, trades en cartes, champs de 48 px, relecture empilée, barre d'onglets ; mobile.js chargé par session.js

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
git log --oneline -1 | cut -c1-90
```

---

### Task 7: Documentation et vérification finale

**Files:**
- Modify: `CLAUDE.md` (nouvelle section avant « ## Données CSV »)
- Modify: `docs/superpowers/specs/2026-10-30-mobile-app-design.md` (écarts d'implémentation)

- [ ] **Step 1: Ajouter la section « Couche téléphone » à `CLAUDE.md`**

Insérer, juste avant la ligne `## Données CSV — voir [csv/README.md](csv/README.md)` :

```markdown
## Couche téléphone (« app iOS », ≤ 700 px) — demande de Sébastien, 30/10/2026

« Repenser le site pour faire comme si c'était une app sur iOS, gros boutons, facile à lire — uniquement sur téléphone, sur Mac c'est parfait. » Conception : `docs/superpowers/specs/2026-10-30-mobile-app-design.md` ; plan : `docs/superpowers/plans/2026-10-30-mobile-app.md`. **Fichiers** : `_systeme/mobile.css` (tout sous `@media (max-width:700px)` ET sous `html.m-shell`, classe posée par le script : s'il échoue, le site garde sa mise en page d'avant) et `_systeme/mobile.js` (chargé par `index.html` ; chargé par `session.js` dans les pages de séance ; ne fait rien au-dessus de 700 px, et **défait** tout ce qu'il a changé quand la fenêtre s'élargit : l'Accueil, le résumé en rangées, le lien retour). `tests/mobile/` : `node --test tests/mobile/*.test.js` — le garde-fou refuse toute règle de `mobile.css` hors `@media (max-width:700px)` ; les tests de `splitNote` / `shortTitle` s'appuient sur la vraie page du 30/10. Chaque page de séance (et `_template.html`) porte une ligne `<link … mobile.css>` après `apple.css`.
**Ce que ça fait** : barre d'onglets en bas (Accueil · Séances · Avant séance · Règles · Plus ; icônes SVG, pas d'emoji ; « Plus » = feuille avec les pages de stats du Tableau de bord et le thème), menu du haut masqué, grands titres, sous-pages en rangée qui défile, **Accueil** généré depuis `window.netActifs()` / `COMPTES` / `SESSIONS` et les cartes `.tz-card` (net P&L en 44 px, barre vers l'objectif, une carte par compte actif, dernière séance, trois mini-chiffres, quatre gros boutons) avec l'ancien tableau de bord **déplacé** (pas copié : les IDs restent uniques) dans « Tout le tableau de bord » ; liste des séances en lignes de 64 px (CSS seul : elle se régénère à chaque filtre) ; page d'une séance : le premier paragraphe du résumé reste visible, les suivants deviennent des rangées à déplier (titre = début du `<strong>` du paragraphe, coupé avant « : » / « — » ; moins de 3 paragraphes = texte entier), trades en cartes, champs de 48 px, zone Daxton visible. **Pour qu'un résumé se découpe bien** : commencer chaque paragraphe par un `<strong>Titre :</strong>` et séparer les paragraphes par `<br><br>` (comme dans les pages récentes).
**Si on ajoute un `.sn-btn` ou un onglet** : mettre à jour `PLUS_ROWS` / `TABS` de `mobile.js` (feuille « Plus ») en plus de `SJ_NAV`. Limites assumées : téléphone en paysage et iPad gardent la mise en page d'avant ; sur téléphone, un navigateur Mac réduit sous 700 px prend aussi la mise en page téléphone (c'est comme ça qu'on teste).

```

- [ ] **Step 2: Noter les écarts d'implémentation dans la spec**

Dans `docs/superpowers/specs/2026-10-30-mobile-app-design.md`, ajouter à la fin du fichier :

```markdown

## 10. Écarts constatés à l'implémentation

- Libellé de l'onglet : « **Avant séance** » (et non « Avant la séance », trop large sous une icône sur 375 px) ; le bouton de l'Accueil garde « Avant la séance ».
- Toutes les règles sont aussi préfixées `html.m-shell` : si `mobile.js` échoue, le site garde sa mise en page téléphone d'avant (pas de page sans navigation).
- Sous-pages ouvertes depuis « Plus » ou l'Accueil : elles s'affichent dans leur onglet avec la rangée de sous-pages ; seul l'écran « page d'une séance » est « poussé » (arrivée par la droite, bouton ‹ Séances).
- La rangée « Dernière séance » de l'Accueil affiche la date et le P&L (pas le ≈ R, calculé à l'intérieur de la liste des séances).
- `mobile.js` défait ses changements au passage en large (fenêtre élargie sans rechargement) : l'empreinte du Mac reste identique.
```

- [ ] **Step 3: Vérification finale — Mac, thèmes, accessibilité**

Serveur local. Dans la fenêtre `desktop`, relancer l'empreinte sur `index.html#dashboard`, `index.html#sessions` et la page du 30/10 : identiques aux relevés « avant ». Puis `resize_window` preset `mobile` avec `colorScheme:"light"` puis `"dark"` : parcourir Accueil, Séances, une séance, « Plus », « Règles » ; contrôler que les chiffres rouges / verts restent lisibles et que seul le bleu acier sert d'accent. Contrôler aussi que toute règle du fichier est bien sous `html.m-shell` (donc inactive si `mobile.js` échoue) avec la commande ci-dessous.

Run: `cd /Users/seb/Library/CloudStorage/Dropbox/Trading/journal-trading && grep -nE "^  [a-z.#\[*]" _systeme/mobile.css | grep -vE "^[0-9]+:  html\.m-(shell|session)" | head`
Expected : aucune sortie (toute règle de premier niveau du bloc commence par `html.m-shell` ou `html.m-session`).

- [ ] **Step 4: Vérification sur le simulateur iOS (Safari réel)**

1. `mcp__Claude_Code_iOS_Simulator__control` `action:"attach"` (ouvre le panneau ; si aucun simulateur n'est démarré, la réponse l'indique : démarrer un iPhone via les outils de build ou signaler à Sébastien que le contrôle sur le simulateur n'a pas pu être fait).
2. `action:"open_url"` avec `http://localhost:8731/index.html` (le simulateur atteint le serveur du Mac par `localhost`).
3. `action:"screenshot"` : barre d'onglets au-dessus de la zone de sécurité du bas, pas de défilement horizontal.
4. `action:"tap"` sur un champ Stop d'une page de séance : **Safari ne zoome pas** (texte ≥ 16 px).
5. Noter dans le message de fin ce qui a été vérifié et ce qui ne l'a pas été.

- [ ] **Step 5: Tests, commit, arrêt du serveur**

```bash
cd /Users/seb/Library/CloudStorage/Dropbox/Trading/journal-trading && pkill -f "http.server 8731"; node --test tests/mobile/*.test.js 2>&1 | grep -E "^# (pass|fail)"
git add CLAUDE.md docs/superpowers/specs/2026-10-30-mobile-app-design.md docs/superpowers/plans/2026-10-30-mobile-app.md && git commit -q -F - <<'EOF'
docs: couche téléphone — section CLAUDE.md, écarts d'implémentation notés dans la conception, plan d'implémentation

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
git log --oneline -1 | cut -c1-90; git status --short; git rev-list --count origin/main..HEAD
```
Expected : `# pass 8`, `# fail 0`, commit créé, seul `.DS_Store` modifié ; rien n'est poussé (demander l'accord de Sébastien).

---

## Auto-relecture du plan

- **Couverture de la spec** : §3 garde-fou → Tâche 1 (+ empreintes aux tâches 3–7) ; §4 fichiers → tâches 1, 3, 6, 7 ; §5 navigation (barre, icônes, Plus, thème, Accueil→Vue d'ensemble, sous-pages, barre du haut masquée, grand titre, pages de séance) → tâches 3 et 6 ; §6.1 Accueil → tâche 4 ; §6.2 séances → tâche 5 ; §6.3 page de séance (en-tête, résumé à déplier avec repli, trades en cartes, saisies, relecture) → tâche 6 ; §7 jetons → contraintes globales + CSS ; accessibilité → blocs `prefers-reduced-*` (tâches 3 et 6) ; §8 vérification → tâches 1–7. Aucun trou ; les écarts (libellé « Avant séance », ≈ R absent de l'Accueil, sous-pages non « poussées ») sont consignés en tâche 7.
- **Cohérence des noms** : `feature`, `el`, `esc`, `fr`, `usd`, `ICON`, `goIndexTab`, `openSheet`, `closeSheet`, `syncActive`, `MQ`, `IS_SESSION`, `buildHome` / `unbuildHome`, `splitNote` / `shortTitle` / `plain` sont définis une fois (tâches 2–3) et réutilisés tels quels (tâches 4 et 6). Classes CSS : `m-tabbar`, `m-tab`, `m-sheet`, `m-sheet-bg`, `m-list`, `m-row`, `m-chev`, `m-home`, `m-net`, `m-acct`, `m-bar`, `m-mini-c`, `m-big`, `m-all`, `m-sec`, `m-head` — mêmes noms dans le JS et le CSS.
- **Points d'attention à l'exécution** : le cache du navigateur (utiliser la commande de rechargement sans cache) ; `html.m-shell .subnav` a une marge haute négative égale au padding haut de `.wrap` (le premier enfant des vues Tableau de bord / Avant la séance / Règles est bien la rangée de sous-pages) ; `@keyframes` et `@media` imbriqués sont valides dans un `@media` et le garde-fou ne regarde que le premier niveau.
