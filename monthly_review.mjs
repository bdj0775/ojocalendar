/**
 * monthly_review.mjs — 월말 예측 정확도 점검
 *
 * 매월 말 실행해서 "지난달 예측이 실제와 얼마나 맞았는지"를 확인한다.
 * 앱의 실제 훅(useDesktopStats)을 과거 시점으로 되돌려 실행하므로,
 * 그때 화면에 나왔던 값과 동일하다.
 *
 * 사용법:
 *   node --import ./__loader-reg.mjs monthly_review.mjs [CSV파일]
 *
 * 데이터 준비: FORECAST_SYSTEM.md 의 "월말 점검 절차" 참고
 */
import fs from 'fs';

const FILE = process.argv[2] || 'bookings_latest.csv';
const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

// ── 데이터 로드 ─────────────────────────────────────────────────
const lines = fs.readFileSync(FILE, 'utf8').replace(/^﻿/, '').trim().split(/\r?\n/);
const head = lines[0].split(',').map(h => h.trim());
const ALL = lines.slice(1).map((l, i) => {
  const c = l.split(',');
  const r = Object.fromEntries(head.map((h, j) => [h, (c[j] ?? '').trim()]));
  return {
    id: String(i + 1),
    propertyId: r.property_id || null,
    guestName: r.guestname,
    checkIn: r.checkin, checkOut: r.checkout,
    bookingDate: r.bookingdate || null,
    guests: 2, infants: 0, nationality: '대한민국',
    channel: r.channel || 'Direct',
    status: r.status || 'confirmed',
    amount: Number(r.amount) || 0,
    commission: Number(r.commission) || 0,
    isAutoSynced: false,
  };
}).filter(b => b.checkIn && b.checkOut && b.bookingDate)
  .filter(b => !(b.guestName === 'Not available' && b.amount === 0));

const propIds = [...new Set(ALL.map(b => b.propertyId).filter(Boolean))];
const properties = propIds.map((id, i) => ({
  id, name: '숙소' + (i + 1), basePrice: 189000, weekendPrice: 229000, cleaningFee: 0, color: '#3b82f6',
}));

const ms = s => new Date(s + 'T12:00:00').getTime();
const dim = (y, m) => new Date(y, m + 1, 0).getDate();
const nightsIn = (b, y, m) => {
  const S = new Date(y, m, 1, 12).getTime(), E = new Date(y, m + 1, 1, 12).getTime();
  const s = Math.max(ms(b.checkIn), S), e = Math.min(ms(b.checkOut), E);
  return e <= s ? 0 : Math.round((e - s) / 86400000);
};
const actualOcc = (y, m) => {
  let n = 0, c = 0;
  ALL.forEach(b => { const x = nightsIn(b, y, m); if (x > 0) { n += x; c++; } });
  return { occ: Math.min(100, Math.round(n / (dim(y, m) * properties.length) * 100)), count: c, nights: n };
};

const hook = await import('./src/hooks/useDesktopStats.ts');

function predictAt(y, m, asOfMs) {
  const visible = ALL.filter(b => ms(b.bookingDate) <= asOfMs);
  const d = new Date(asOfMs);
  globalThis.__STORE__ = {
    bookings: visible, properties,
    currentYear: d.getFullYear(), currentMonth: d.getMonth(),
    settings: { profileName: '', profileRole: '', propertyName: '' },
    channelSettings: [], selectedDashboardPropertyId: null,
  };
  const OrigDate = Date, realNow = Date.now;
  globalThis.Date = class extends OrigDate {
    constructor(...a) { if (a.length === 0) super(asOfMs); else super(...a); }
    static now() { return asOfMs; }
  };
  try {
    const t = hook.useDesktopStats().monthlyTrends.find(x => x.year === y && x.month === MONTHS[m]);
    return t ? { pred: t.predictedOcc, conf: t.forecastConfidence } : null;
  } finally { globalThis.Date = OrigDate; Date.now = realNow; }
}

// ── 데이터 기준일 ───────────────────────────────────────────────
// 단순 최댓값을 쓰면 접수일이 잘못 입력된 예약 1건(예: 미래 날짜)이 기준일을
// 미래로 밀어버려, 아직 끝나지 않은 달까지 "완료"로 판정된다.
// 그래서 상위 이상치를 제외한 99퍼센타일을 기준으로 삼는다.
const sortedBd = ALL.map(b => ms(b.bookingDate)).sort((a, b) => a - b);
const lastData = sortedBd[Math.floor(sortedBd.length * 0.99)];
const keys = [...new Set(ALL.map(b => {
  const d = new Date(b.checkIn + 'T12:00:00'); return d.getFullYear() + ':' + d.getMonth();
}))].map(k => k.split(':').map(Number))
  .filter(([y, m]) => new Date(y, m + 1, 1, 12).getTime() <= lastData)
  .sort((a, b) => a[0] - b[0] || a[1] - b[1]);

console.log('='.repeat(72));
console.log('월말 예측 정확도 점검');
console.log('='.repeat(72));
console.log(`데이터: ${FILE} · 예약 ${ALL.length}건 · 객실 ${properties.length}개`);
console.log(`데이터 기준일: ${new Date(lastData).toISOString().slice(0, 10)}`);
console.log(`완료된 달: ${keys.length}개\n`);

// ── 1. 최근 완료 달 상세 ─────────────────────────────────────────
const recent = keys.slice(-6);
console.log('■ 최근 완료된 달 — 시점별 예측 vs 실제');
console.log('-'.repeat(72));
console.log('월'.padEnd(10) + '실제'.padStart(6) + 'D-30'.padStart(9) + 'D-7'.padStart(9)
  + '1일차'.padStart(9) + '15일차'.padStart(9) + '월말'.padStart(9));
console.log('-'.repeat(72));
const detail = [];
for (const [y, m] of recent) {
  const act = actualOcc(y, m);
  if (act.count < 3) continue;
  const S = new Date(y, m, 1, 12).getTime();
  const pts = [[-30, 'D-30'], [-7, 'D-7'], [1, '1일차'], [15, '15일차'], [dim(y, m), '월말']];
  const cells = pts.map(([off]) => {
    const asOf = S + off * 86400000;
    if (asOf > lastData) return '   –';
    const r = predictAt(y, m, asOf);
    if (!r || r.pred == null) return '   –';
    const err = r.pred - act.occ;
    detail.push({ y, m, off, pred: r.pred, actual: act.occ, err });
    return `${r.pred}%(${err >= 0 ? '+' : ''}${err})`;
  });
  console.log(
    `${y}-${String(m + 1).padStart(2, '0')}`.padEnd(10)
    + (act.occ + '%').padStart(6)
    + cells.map(c => c.padStart(9)).join(''),
  );
}

// ── 2. 전체 정확도 요약 ─────────────────────────────────────────
const PROBES = [['D-60', -60], ['D-30', -30], ['D-14', -14], ['D-7', -7],
  ['1일차', 1], ['10일차', 10], ['20일차', 20]];
const rows = [];
for (const [y, m] of keys) {
  const act = actualOcc(y, m);
  if (act.count < 3) continue;
  const S = new Date(y, m, 1, 12).getTime();
  for (const [label, off] of PROBES) {
    const asOf = S + off * 86400000;
    if (asOf > lastData || (off > 0 && off > dim(y, m))) continue;
    const r = predictAt(y, m, asOf);
    if (!r || r.pred == null) continue;
    rows.push({ label, pred: r.pred, actual: act.occ });
  }
}
console.log('\n■ 전체 정확도 (완료된 모든 달)');
console.log('-'.repeat(72));
console.log('시점'.padEnd(10) + 'MAE(평균오차)'.padStart(14) + '편향'.padStart(12) + '샘플'.padStart(8));
console.log('-'.repeat(72));
for (const [label] of PROBES) {
  const s = rows.filter(r => r.label === label);
  if (!s.length) continue;
  const mae = s.reduce((a, r) => a + Math.abs(r.pred - r.actual), 0) / s.length;
  const bias = s.reduce((a, r) => a + (r.pred - r.actual), 0) / s.length;
  console.log(label.padEnd(10) + (mae.toFixed(1) + '%p').padStart(14)
    + ((bias >= 0 ? '+' : '') + bias.toFixed(1) + '%p').padStart(12) + (s.length + '개').padStart(8));
}
const mae = rows.reduce((a, r) => a + Math.abs(r.pred - r.actual), 0) / rows.length;
const bias = rows.reduce((a, r) => a + (r.pred - r.actual), 0) / rows.length;
console.log('-'.repeat(72));
console.log('전체'.padEnd(10) + (mae.toFixed(1) + '%p').padStart(14)
  + ((bias >= 0 ? '+' : '') + bias.toFixed(1) + '%p').padStart(12) + (rows.length + '개').padStart(8));

// ── 3. 판정 ─────────────────────────────────────────────────────
console.log('\n■ 판정');
console.log('-'.repeat(72));
const B = Math.abs(bias);
if (mae <= 12) console.log('  정확도: 양호 (MAE 12%p 이하)');
else if (mae <= 20) console.log('  정확도: 보통 (MAE 12~20%p) — 데이터가 쌓이면 개선될 여지');
else console.log('  ⚠️ 정확도: 낮음 (MAE 20%p 초과) — 조정 검토 필요');

if (B <= 5) console.log('  편향: 양호 (±5%p 이내)');
else if (bias > 0) console.log(`  ⚠️ 편향: 과대예측 경향 +${bias.toFixed(1)}%p — FORECAST_SYSTEM.md "조정 가이드" 참고`);
else console.log(`  ⚠️ 편향: 과소예측 경향 ${bias.toFixed(1)}%p — FORECAST_SYSTEM.md "조정 가이드" 참고`);

console.log('\n  ※ 이 수치를 FORECAST_SYSTEM.md 의 "정확도 이력" 표에 기록해 두면');
console.log('     달마다 나아지는지 추세를 볼 수 있습니다.');
