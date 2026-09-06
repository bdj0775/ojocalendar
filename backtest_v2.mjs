/** backtest_v2.mjs — 달 진행 중(D=0 이후) 구간까지 포함한 검증 */
import fs from 'fs';
const L = fs.readFileSync(process.argv[2] || 'bookings_latest.csv', 'utf8').trim().split(/\r?\n/);
const R = L.slice(1).map(l => { const c = l.split(','); return { g: c[0], ci: c[1], co: c[2], bd: c[3] }; })
  .filter(r => r.g !== 'Not available' && r.bd);
const ms = s => new Date(s + 'T12:00:00').getTime();
const dim = (y, m) => new Date(y, m + 1, 0).getDate();
const nl = (r, y, m) => { const S = new Date(y, m, 1, 12).getTime(), E = new Date(y, m + 1, 1, 12).getTime();
  const s = Math.max(ms(r.ci), S), e = Math.min(ms(r.co), E); return e <= s ? 0 : Math.round((e - s) / 86400000); };
/** asOf 시점까지 접수된 예약 기준 점유율 */
function occ(y, m, asOf = Infinity) { let n = 0, c = 0;
  R.forEach(r => { if (ms(r.bd) > asOf) return; const x = nl(r, y, m); if (x > 0) { n += x; c++; } });
  return { o: Math.min(100, Math.round(n / dim(y, m) * 100)), c }; }

const TAU = 60;
/** 현재 로직 */
function cur({ stly, h2y, otb, D, elapsed, dm }) {
  const h = [stly, h2y].filter(v => v != null); const a = h.reduce((s, v) => s + v, 0) / h.length;
  const cc = D > 0 ? Math.exp(-D / TAU) : Math.min(dm, Math.max(1, elapsed)) / dm;
  const pv = otb - a * cc, rem = a * (1 - cc);
  const cap = Math.max(-a * 0.5, Math.min(a * 0.5, pv));
  const p = Math.min(100, Math.max(otb, otb + rem + cap * 0.5 * (1 - cc)));
  let w = 0, t = 0; if (stly != null) { w += stly * 40; t += 40; } if (h2y != null) { w += h2y * 30; t += 30; }
  w += p * 30; t += 30;
  return Math.min(100, Math.max(otb, Math.round(w / t)));
}
/** 개선: 만실체감 + 동적가중 */
function neo({ stly, h2y, otb, D, elapsed, dm }) {
  const h = [stly, h2y].filter(v => v != null); const a = h.reduce((s, v) => s + v, 0) / h.length;
  const cc = D > 0 ? Math.exp(-D / TAU) : Math.min(dm, Math.max(1, elapsed)) / dm;
  const hr = Math.max(0, 100 - otb) / 100;                 // ① 만실 근처 체감
  const p = Math.min(100, Math.max(otb, otb + a * (1 - cc) * hr));
  const pw = 30 + 50 * cc, hw = 100 - pw;                  // ③ 동적 가중
  let w = p * pw, t = pw; const per = hw / h.length; h.forEach(x => { w += x * per; t += per; });
  let pred = Math.min(100, Math.max(otb, Math.round(w / t)));
  // 진행 중인 달: 지나간 공실은 복구 불가 (앱의 maxAchievableOcc와 동일)
  if (D === 0 && elapsed > 0) {
    const past = otb * dm / 100;                            // 근사
    pred = Math.min(pred, Math.round(((past + (dm - elapsed)) / dm) * 100));
  }
  return pred;
}

const PROBES = [
  ['D-90', -90], ['D-60', -60], ['D-30', -30], ['D-14', -14], ['D-7', -7],
  ['달5일차', 5], ['달10일차', 10], ['달15일차', 15], ['달20일차', 20], ['달25일차', 25],
];
const lastData = Math.max(...R.map(r => ms(r.bd)));
const rows = [];
const monthSet = new Set(R.map(r => { const d = new Date(r.ci + 'T12:00:00'); return d.getFullYear() + '-' + d.getMonth(); }));
for (const key of monthSet) {
  const [y, m] = key.split('-').map(Number);
  if (new Date(y, m + 1, 1, 12).getTime() > lastData) continue;
  const act = occ(y, m); if (act.c < 3) continue;
  const s1 = occ(y - 1, m), s2 = occ(y - 2, m);
  const stly = s1.c >= 3 ? s1.o : null, h2y = s2.c >= 3 ? s2.o : null;
  if (stly == null && h2y == null) continue;
  const S = new Date(y, m, 1, 12).getTime(), dm = dim(y, m);
  for (const [label, off] of PROBES) {
    const asOf = S + off * 86400000;
    const D = off < 0 ? -off : 0, elapsed = off > 0 ? off : 0;
    const o = occ(y, m, asOf).o;
    rows.push({ y, m, label, actual: act.o, otb: o,
      cur: cur({ stly, h2y, otb: o, D, elapsed, dm }),
      neo: neo({ stly, h2y, otb: o, D, elapsed, dm }) });
  }
}
console.log(`검증 대상: ${new Set(rows.map(r => r.y + '-' + r.m)).size}개 달 · ${rows.length}개 시점\n`);
console.log('시점'.padEnd(12) + 'OTB평균'.padStart(9) + '현재로직'.padStart(11) + '개선안'.padStart(11) + '  개선폭');
console.log('-'.repeat(58));
for (const [label] of PROBES) {
  const s = rows.filter(r => r.label === label); if (!s.length) continue;
  const mae = k => s.reduce((a, r) => a + Math.abs(r[k] - r.actual), 0) / s.length;
  const otbAvg = s.reduce((a, r) => a + r.otb, 0) / s.length;
  const c = mae('cur'), n = mae('neo');
  console.log(label.padEnd(12) + (otbAvg.toFixed(0) + '%').padStart(9)
    + (c.toFixed(1) + '%p').padStart(11) + (n.toFixed(1) + '%p').padStart(11)
    + ('  ' + (c - n >= 0 ? '-' : '+') + Math.abs(c - n).toFixed(1) + '%p'));
}
const all = k => rows.reduce((a, r) => a + Math.abs(r[k] - r.actual), 0) / rows.length;
const bias = k => rows.reduce((a, r) => a + (r[k] - r.actual), 0) / rows.length;
console.log('-'.repeat(58));
console.log('전체 MAE'.padEnd(12) + ''.padStart(9) + (all('cur').toFixed(1) + '%p').padStart(11) + (all('neo').toFixed(1) + '%p').padStart(11));
console.log('전체 편향'.padEnd(12) + ''.padStart(9) + ((bias('cur') >= 0 ? '+' : '') + bias('cur').toFixed(1) + '%p').padStart(11) + ((bias('neo') >= 0 ? '+' : '') + bias('neo').toFixed(1) + '%p').padStart(11));
