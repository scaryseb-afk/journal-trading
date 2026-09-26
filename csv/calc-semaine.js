/* Recalcule, jour par jour, depuis csv/comptes/*.csv :
   n  = trades (une position sortie/construite en plusieurs fills = 1 ; copy trading = 1),
   r  = ré-entrées : entrées moins de 10 min après la dernière perte terminée (tous comptes confondus),
   rp = P&L de ces ré-entrées.
   Usage : node csv/calc-semaine.js [AAAA-MM-JJ]   (défaut : 2026-08-21)
   Sortie : les valeurs `rt:[n,r,rp]` à recopier dans window.SESSIONS (index.html). */
const fs = require('fs');
const from = process.argv[2] || '2026-08-21';
const ts = s => { const m = s.match(/(\d+)\/(\d+)\/(\d+) (\d+):(\d+):(\d+)/); return new Date(+m[3], +m[1] - 1, +m[2], +m[4], +m[5], +m[6]).getTime() / 1000; };
const money = s => { const neg = /\(/.test(s); const v = parseFloat(s.replace(/[$(),]/g, '')); return neg ? -v : v; };
let rows = [];
for (const f of fs.readdirSync(__dirname + '/comptes')) {
  if (!f.endsWith('.csv')) continue;
  const acct = f.replace('.csv', '');
  fs.readFileSync(__dirname + '/comptes/' + f, 'utf8').split(/\r?\n/).filter(Boolean).slice(1).forEach(l => {
    const c = l.split(','); const b = ts(c[10]), s = ts(c[11]); const long = b < s;
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
const sig = clusters.map(c => ({ entry: Math.min(...c.map(x => x.entry)), exit: Math.max(...c.map(x => x.exit)), pnl: c.reduce((s, x) => s + x.pnl, 0) })).sort((a, b) => a.entry - b.entry);
const pad = n => (n < 10 ? '0' : '') + n;
const dayKey = t => { const d = new Date(t * 1000); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const days = {};
sig.forEach((s, i) => {
  const k = dayKey(s.entry); if (k < from) return;
  let last = null;
  for (let j = i - 1; j >= 0; j--) { if (sig[j].pnl < 0 && sig[j].exit <= s.entry && (!last || sig[j].exit > last.exit)) last = sig[j]; if (s.entry - sig[j].exit > 86400) break; }
  const d = days[k] = days[k] || { n: 0, r: 0, rp: 0 };
  d.n++; if (last && s.entry - last.exit < 600) { d.r++; d.rp += s.pnl; }
});
Object.keys(days).sort().forEach(k => console.log(k.slice(8) + '/' + k.slice(5, 7), 'rt:[' + days[k].n + ',' + days[k].r + ',' + (Math.round(days[k].rp * 100) / 100) + ']'));
