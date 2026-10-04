/* P&L jour par jour de chaque compte, recalculé depuis csv/comptes/*.csv (somme des lignes du CSV :
   c'est l'argent réel du compte). Sert à la table « R & % par compte » (Tableau de bord → Comptes & Analyse) :
   le R est calculé dans la page avec le budget de risque du jour (window.budgetOf, même barème que
   Progression et l'onglet Sessions) — ce n'est pas le R réel de chaque trade, aucun stop n'étant enregistré.
   Le jour d'un trade est celui de son entrée.
   Usage : node csv/calc-comptes.js
   Sortie : la ligne `window.PAR_COMPTE = {...}` à recopier dans index.html. */
const fs = require('fs');
const splitCsv = l => { const out = []; let cur = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out; }; // montants >= 1 000 $ entre guillemets
const ts = s => { const m = s.match(/(\d+)\/(\d+)\/(\d+) (\d+):(\d+):(\d+)/); return new Date(+m[3], +m[1] - 1, +m[2], +m[4], +m[5], +m[6]).getTime() / 1000; };
const money = s => { const neg = /\(/.test(s); const v = parseFloat(s.replace(/[$(),]/g, '')); return neg ? -v : v; };
const pad = n => (n < 10 ? '0' : '') + n;
const r2 = v => Math.round(v * 100) / 100;
const out = {};
for (const f of fs.readdirSync(__dirname + '/comptes').filter(f => f.endsWith('.csv')).sort()) {
  const acct = f.replace('.csv', '');
  const days = {};
  fs.readFileSync(__dirname + '/comptes/' + f, 'utf8').split(/\r?\n/).filter(Boolean).slice(1).forEach(l => {
    const c = splitCsv(l);
    const d = new Date(Math.min(ts(c[10]), ts(c[11])) * 1000);
    const k = pad(d.getDate()) + '/' + pad(d.getMonth() + 1);
    days[k] = (days[k] || 0) + money(c[9]);
  });
  out[acct] = {};
  Object.keys(days).sort((a, b) => a.slice(3) === b.slice(3) ? a.localeCompare(b) : a.slice(3).localeCompare(b.slice(3))).forEach(k => { out[acct][k] = r2(days[k]); });
}
console.log('window.PAR_COMPTE = ' + JSON.stringify(out) + ';');
