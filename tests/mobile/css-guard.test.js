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
