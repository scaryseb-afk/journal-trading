/* Répartition du résultat par instrument, recalculée depuis csv/comptes/*.csv.
   Même pipeline que calc-semaine.js : une position construite/sortie en plusieurs fills = 1 trade,
   copy trading = 1 signal (règle de dédoublonnage de csv/README.md). Le P&L, lui, est celui de
   chaque compte (argent réel). Un signal est « gagnant » si la somme de ses P&L est > 0
   (les break-even déclarés ne sont PAS isolés ici : le CSV n'en porte pas la trace).
   Familles : MNQ ; Or = MGC + GC ; Pétrole = MCL + CL ; Euro = 6E.
   Usage : node csv/calc-instruments.js
   Sortie : la ligne `window.PAR_INSTRUMENT = {...}` à recopier dans index.html (page « Par instrument »). */
const fs = require('fs');
const ts = s => { const m = s.match(/(\d+)\/(\d+)\/(\d+) (\d+):(\d+):(\d+)/); return new Date(+m[3], +m[1] - 1, +m[2], +m[4], +m[5], +m[6]).getTime() / 1000; };
const splitCsv = l => { const out = []; let cur = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out; }; // les montants >= 1 000 $ sont exportés entre guillemets ("$(1,200.00)")
const EXCL = new Set(JSON.parse(require('fs').readFileSync(__dirname + '/exclus.json', 'utf8')).flatMap(e => e.fills)); // lignes du CSV exclues des statistiques (bug de plateforme…) : voir exclus.json
const money = s => { const neg = /\(/.test(s); const v = parseFloat(s.replace(/[$(),]/g, '')); return neg ? -v : v; };
const files = fs.readdirSync(__dirname + '/comptes').filter(f => f.endsWith('.csv'));
let rows = [];
for (const f of files) {
  const acct = f.replace('.csv', '');
  fs.readFileSync(__dirname + '/comptes/' + f, 'utf8').split(/\r?\n/).filter(Boolean).slice(1).forEach(l => {
    const c = splitCsv(l); if (EXCL.has(c[4]) || EXCL.has(c[5])) return; const b = ts(c[10]), s = ts(c[11]); const long = b < s;
    rows.push({ acct, sym: c[0], bid: c[4], sid: c[5], long, entry: Math.min(b, s), exit: Math.max(b, s), ep: long ? +c[7] : +c[8], tick: +c[3], pnl: money(c[9]) });
  });
}
rows.sort((a, b) => a.entry - b.entry);
const par = rows.map((_, i) => i); const find = i => par[i] === i ? i : (par[i] = find(par[i])); const seen = {};
rows.forEach((r, i) => [r.bid, r.sid].forEach(id => { const k = r.acct + '|' + id; if (seen[k] !== undefined) par[find(i)] = find(seen[k]); else seen[k] = i; }));
const groups = {}; rows.forEach((r, i) => (groups[find(i)] = groups[find(i)] || []).push(r));
const pos = Object.values(groups).map(a => { const first = a.slice().sort((x, y) => x.entry - y.entry)[0]; return Object.assign({}, first, { pnl: a.reduce((t, x) => t + x.pnl, 0), exit: Math.max(...a.map(x => x.exit)), entry: Math.min(...a.map(x => x.entry)) }); }).sort((a, b) => a.entry - b.entry);
const match = (a, b) => { if (a.acct === b.acct || a.sym !== b.sym || a.long !== b.long) return false; const de = Math.abs(a.entry - b.entry); if (de > 20) return false; return Math.abs(a.ep - b.ep) / a.tick <= 3 || (de <= 2 && Math.abs(a.exit - b.exit) <= 3); };
const clusters = []; pos.forEach(r => { let done = false; for (let i = clusters.length - 1; i >= 0 && !done; i--) { const c = clusters[i]; if (c.some(x => x.acct === r.acct)) continue; if (c.some(x => match(x, r))) { c.push(r); done = true; } } if (!done) clusters.push([r]); });

const root = s => s.replace(/[FGHJKMNQUVXZ]\d$/, '');
const FAMILLE = { MNQ: 'MNQ', MGC: 'Or', GC: 'Or', MCL: 'Pétrole', CL: 'Pétrole', '6E': 'Euro' };
const r2 = v => Math.round(v * 100) / 100;
const pad = n => (n < 10 ? '0' : '') + n;
const jj = t => { const d = new Date(t * 1000); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1); };
const S = {}; let tot = 0;
// Sens du signal : Long = acheté avant d'être vendu. Tous les comptes d'un signal copié vont dans le même sens (condition du dédoublonnage).
const blank = () => ({ n: 0, w: 0, l: 0, pnl: 0, gains: 0, pertes: 0 });
const addSens = (b, p) => { b.n++; b.pnl += p; if (p > 0) { b.w++; b.gains += p; } else if (p < 0) { b.l++; b.pertes -= p; } };
const fmtSens = b => ({ n: b.n, w: b.w, l: b.l, pnl: r2(b.pnl), gains: r2(b.gains), pertes: r2(b.pertes) });
const SENS = { Long: blank(), Short: blank() };
clusters.forEach(c => {
  const sym = root(c[0].sym); const id = FAMILLE[sym] || sym;
  const p = c.reduce((s, x) => s + x.pnl, 0);
  const o = S[id] = S[id] || { id, pnl: 0, n: 0, w: 0, l: 0, gains: 0, pertes: 0, pire: 0, meilleur: 0, sous: {}, sens: { Long: blank(), Short: blank() } };
  o.pnl += p; o.n++; tot += p;
  if (p > 0) { o.w++; o.gains += p; } else if (p < 0) { o.l++; o.pertes -= p; }
  o.pire = Math.min(o.pire, p); o.meilleur = Math.max(o.meilleur, p);
  const sens = c[0].long ? 'Long' : 'Short'; addSens(o.sens[sens], p); addSens(SENS[sens], p);
  c.forEach(x => { const k = root(x.sym); o.sous[k] = (o.sous[k] || 0) + x.pnl; });
});
const items = Object.values(S).sort((a, b) => a.pnl - b.pnl).map(o => ({
  id: o.id, pnl: r2(o.pnl), n: o.n, w: o.w, l: o.l, gains: r2(o.gains), pertes: r2(o.pertes),
  pire: r2(o.pire), meilleur: r2(o.meilleur), sous: Object.entries(o.sous).map(([k, v]) => [k, r2(v)]),
  sens: { Long: fmtSens(o.sens.Long), Short: fmtSens(o.sens.Short) }
}));
const out = { du: jj(clusters[0][0].entry), au: jj(clusters[clusters.length - 1][0].entry), fichiers: files.length, signaux: clusters.length, pnl: r2(tot), sens: { Long: fmtSens(SENS.Long), Short: fmtSens(SENS.Short) }, items };
console.log('window.PAR_INSTRUMENT = ' + JSON.stringify(out) + ';');
