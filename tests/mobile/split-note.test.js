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
