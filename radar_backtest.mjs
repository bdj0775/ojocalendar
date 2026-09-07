/**
 * radar_backtest.mjs — 빈방 레이더의 "팔릴 가능성"이 실제와 맞는지 확인한다.
 *
 * 앱의 실제 계산 함수(computeRadar)를 그대로 실행한다 (재현 스크립트 금지 — FORECAST.md).
 * 방법: 과거 기준일 t(주 1회)마다 "t까지 접수된 예약"만 넣어 레이더를 돌리고,
 *       그때 비어 있던 향후 3주 밤의 가능성 p를 실제 결과(결국 팔렸나)와 비교한다.
 *
 * 출력: 캘리브레이션 표(예측 구간별 실제 판매율), Brier 점수 vs 기준선, 결정 시점 안정성.
 * 사용법: node radar_backtest.mjs [CSV파일]   (기본 bookings_latest.csv)
 */
import fs from 'fs';
import { register } from 'node:module';
register('./__loader.mjs', import.meta.url);

const FILE = process.argv[2] || 'bookings_latest.csv';
const DAY = 86400000;

// ── CSV → bookings (run_hook_check.mjs와 동일 규칙) ─────────────────
const lines = fs.readFileSync(FILE, 'utf8').replace(/^﻿/, '').trim().split(/\r?\n/);
const head = lines[0].split(',').map(h => h.trim());
const rows = lines.slice(1).map(l => {
  const c = l.split(',');
  return Object.fromEntries(head.map((h, i) => [h, (c[i] ?? '').trim()]));
});
const bookings = rows.map((r, i) => ({
  id: String(i + 1),
  propertyId: r.property_id || null,
  guestName: r.guestname,
  checkIn: r.checkin,
  checkOut: r.checkout,
  bookingDate: r.bookingdate || null,
  guests: 2, infants: 0, nationality: '대한민국',
  channel: r.channel || 'Direct',
  status: r.status || 'confirmed',
  amount: Number(r.amount) || 0,
  commission: Number(r.commission) || 0,
  isAutoSynced: false,
}));
const propIds = [...new Set(bookings.map(b => b.propertyId).filter(Boolean))];
const properties = propIds.map((id, i) => ({
  id, name: '숙소' + (i + 1), baseGuests: 2, basePrice: 189000, weekendPrice: 229000,
  extraGuestFee: 0, noExtraGuestFee: true, checkInTime: '15:00', checkOutTime: '11:00', cleaningFee: 0,
}));

const { computeRadar } = await import('./src/hooks/useLastMinuteRadar.ts');

const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parse = s => new Date(s + 'T12:00:00');

// 정답: 전체 데이터 기준으로 "숙소|날짜"가 결국 팔렸는가
const finalSold = new Set();
bookings.filter(b => ['confirmed', 'checked in', 'completed'].includes(b.status)).forEach(b => {
  const ci = parse(b.checkIn), co = parse(b.checkOut);
  const n = Math.round((co - ci) / DAY);
  for (let i = 0; i < n; i++) finalSold.add(`${b.propertyId || propIds[0]}|${iso(new Date(ci.getTime() + i * DAY))}`);
});

// 접수일 정규화 (훅과 동일): 없거나 체크인보다 늦으면 체크인일
const knownAt = t => bookings.filter(b => {
  const ci = parse(b.checkIn).getTime();
  const bd = b.bookingDate ? Math.min(parse(b.bookingDate).getTime(), ci) : ci;
  return bd <= t.getTime();
});

// ── 기준일: 데이터 시작 + 6개월부터 오늘 − 3주까지, 주 1회 ─────────────
const allDates = bookings.map(b => b.checkIn).sort();
const firstDate = parse(allDates[0]);
// 오늘(또는 FAKE_TODAY) 기준. 오늘 이후의 밤은 결과를 모르므로 기준일은 오늘 − 3주까지만.
const TODAY = process.env.FAKE_TODAY ? parse(process.env.FAKE_TODAY) : new Date();
TODAY.setHours(12, 0, 0, 0);
const start = new Date(firstDate.getTime() + 182 * DAY);
const end = new Date(TODAY.getTime() - 21 * DAY);

const samples = []; // { t, p, y, group, D, window }
const decisionLog = [];
for (let t = new Date(start); t <= end; t = new Date(t.getTime() + 7 * DAY)) {
  const r = computeRadar(knownAt(t), properties, { today: t, selectedPropertyId: null });
  if (!r.dataQuality.enough) continue;
  decisionLog.push({ t: iso(t), weekday: r.summary.decisionDay.weekday, weekend: r.summary.decisionDay.weekend });
  r.rows.forEach(row => {
    if (row.probability === null) return;
    const y = finalSold.has(`${row.propertyId}|${row.date}`) ? 1 : 0;
    samples.push({ t: iso(t), p: row.probability / 100, y, group: row.group, D: row.daysBefore, window: row.windowUsed });
  });
}

console.log(`데이터: ${FILE} · 예약 ${bookings.length}건 · 기준일 ${decisionLog.length}개 (${decisionLog[0]?.t} ~ ${decisionLog.at(-1)?.t}) · 표본 ${samples.length}개\n`);

// ── 캘리브레이션 표 ─────────────────────────────────────────────────
const bins = [[0, .2], [.2, .3], [.3, .4], [.4, .5], [.5, .6], [.6, .7], [.7, .8], [.8, .9], [.9, 1.01]];
const calib = (list, title) => {
  console.log(`■ ${title} — 예측 구간별 실제 판매율`);
  console.log('예측 구간     표본   실제 판매율   구간 중앙   차이');
  for (const [lo, hi] of bins) {
    const s = list.filter(x => x.p >= lo && x.p < hi);
    if (!s.length) continue;
    const actual = s.reduce((a, x) => a + x.y, 0) / s.length;
    const mid = s.reduce((a, x) => a + x.p, 0) / s.length;
    console.log(`${String(Math.round(lo * 100)).padStart(3)}~${String(Math.round(Math.min(hi, 1) * 100)).padStart(3)}%   ${String(s.length).padStart(5)}   ${String(Math.round(actual * 100)).padStart(6)}%   ${String(Math.round(mid * 100)).padStart(7)}%   ${(Math.round((actual - mid) * 100) >= 0 ? '+' : '') + Math.round((actual - mid) * 100)}%p`);
  }
  console.log();
};
calib(samples, '전체');
calib(samples.filter(s => s.group === 'weekday'), '일~목');
calib(samples.filter(s => s.group === 'weekend'), '금·토·공휴일 전날');

// ── Brier 점수 (낮을수록 좋음) vs 기준선 ───────────────────────────────
const brier = (list, f) => list.reduce((a, x) => a + (f(x) - x.y) ** 2, 0) / list.length;
const meanY = samples.reduce((a, x) => a + x.y, 0) / samples.length;
console.log('■ Brier 점수 (0 = 완벽, 0.25 = 동전 던지기) — 낮을수록 좋다');
console.log(`레이더 예측            ${brier(samples, x => x.p).toFixed(3)}`);
console.log(`기준선: 항상 ${Math.round(meanY * 100)}%       ${brier(samples, () => meanY).toFixed(3)}  (전체 평균 판매율을 그대로 씀)`);
console.log(`기준선: 항상 50%       ${brier(samples, () => 0.5).toFixed(3)}`);
console.log();

// D 구간별
console.log('■ 남은 날수별 — 표본 · 예측 평균 · 실제 판매율');
for (const [lo, hi, lab] of [[0, 0, '당일'], [1, 3, '1~3일'], [4, 7, '4~7일'], [8, 14, '8~14일'], [15, 20, '15~20일']]) {
  const s = samples.filter(x => x.D >= lo && x.D <= hi);
  if (!s.length) continue;
  const pm = s.reduce((a, x) => a + x.p, 0) / s.length, ym = s.reduce((a, x) => a + x.y, 0) / s.length;
  console.log(`${lab.padEnd(8)} ${String(s.length).padStart(5)}   예측 ${String(Math.round(pm * 100)).padStart(3)}%   실제 ${String(Math.round(ym * 100)).padStart(3)}%   Brier ${brier(s, x => x.p).toFixed(3)}`);
}
console.log();

// ── 결정 시점 안정성 ───────────────────────────────────────────────────
const fmtD = v => (v === null ? '당일까지' : `D-${v}`);
console.log('■ 결정 시점(가능성 50% 아래로 떨어지는 날) — 기준일별');
const byMonth = new Map();
decisionLog.forEach(d => { const k = d.t.slice(0, 7); if (!byMonth.has(k)) byMonth.set(k, []); byMonth.get(k).push(d); });
byMonth.forEach((list, k) => {
  console.log(`${k}  일~목 [${list.map(d => fmtD(d.weekday)).join(', ')}]  금·토 [${list.map(d => fmtD(d.weekend)).join(', ')}]`);
});
