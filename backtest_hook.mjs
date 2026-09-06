/**
 * backtest_hook.mjs — 앱의 실제 훅으로 예측 정확도를 백테스트한다.
 *
 * 재현 공식을 따로 쓰지 않는다. useDesktopStats.ts를 그대로 import하고,
 * "오늘"을 과거 시점으로 되돌린 뒤 그 시점에 알 수 있었던 예약만 스토어에 넣어
 * 훅을 실행한다. 즉 화면에 나왔을 값과 동일하다.
 *
 * 검증 구간: 달 시작 전(D-90~D-1) + 달 진행 중(1일차~30일차)
 *
 * 사용법: node --import ./__loader-reg.mjs backtest_hook.mjs [CSV]
 */
import fs from 'fs';

const FILE = process.argv[2] || 'bookings_latest.csv';

const lines = fs.readFileSync(FILE, 'utf8').replace(/^﻿/, '').trim().split(/\r?\n/);
const head = lines[0].split(',').map(h => h.trim());
const raw = lines.slice(1).map(l => {
  const c = l.split(',');
  return Object.fromEntries(head.map((h, i) => [h, (c[i] ?? '').trim()]));
});

const ALL = raw.map((r, i) => ({
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
})).filter(b => b.checkIn && b.checkOut && b.bookingDate)
  // 금액 0원의 장기 블록(iCal 차단)은 예약이 아니므로 제외
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
/** 그 달의 최종 실제 점유율 (모든 예약 반영) */
const actualOcc = (y, m) => {
  let n = 0, c = 0;
  ALL.forEach(b => { const x = nightsIn(b, y, m); if (x > 0) { n += x; c++; } });
  return { occ: Math.min(100, Math.round(n / (dim(y, m) * properties.length) * 100)), count: c };
};

const hookMod = await import('./src/hooks/useDesktopStats.ts');

/**
 * asOf 시점에서 (y,m)월 예측값을 훅으로 계산.
 * Date.now를 그 시점으로 바꾸고, 그때까지 접수된 예약만 스토어에 넣는다.
 */
function predictAt(y, m, asOfMs) {
  const visible = ALL.filter(b => ms(b.bookingDate) <= asOfMs);
  const d = new Date(asOfMs);
  globalThis.__STORE__ = {
    bookings: visible, properties,
    currentYear: d.getFullYear(), currentMonth: d.getMonth(),
    settings: { profileName: '', profileRole: '', propertyName: '' },
    channelSettings: [], selectedDashboardPropertyId: null,
  };
  const realNow = Date.now;
  Date.now = () => asOfMs;
  const OrigDate = Date;
  // new Date() 인자 없는 호출만 asOf로 고정
  globalThis.Date = class extends OrigDate {
    constructor(...a) { if (a.length === 0) super(asOfMs); else super(...a); }
    static now() { return asOfMs; }
  };
  try {
    const stats = hookMod.useDesktopStats();
    const t = stats.monthlyTrends.find(x => x.year === y && x.month === MONTHS[m]);
    return t ? t.predictedOcc : null;
  } finally {
    globalThis.Date = OrigDate;
    Date.now = realNow;
  }
}
const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

// ── 검증 대상 달: 데이터가 끝나기 전에 완료된 달 ──
// 접수일이 잘못 입력된 1건이 기준일을 미래로 밀지 않도록 99퍼센타일 사용
const sortedBd = ALL.map(b => ms(b.bookingDate)).sort((a, b) => a - b);
const lastBooking = sortedBd[Math.floor(sortedBd.length * 0.99)];
const monthKeys = [...new Set(ALL.map(b => {
  const d = new Date(b.checkIn + 'T12:00:00'); return d.getFullYear() + ':' + d.getMonth();
}))].map(k => k.split(':').map(Number)).sort((a, b) => a[0] - b[0] || a[1] - b[1]);

const PROBES = [
  ['D-90', -90], ['D-60', -60], ['D-30', -30], ['D-14', -14], ['D-7', -7],
  ['1일차', 1], ['5일차', 5], ['10일차', 10], ['15일차', 15],
  ['20일차', 20], ['25일차', 25], ['30일차', 30],
];

const rows = [];
for (const [y, m] of monthKeys) {
  const monthEnd = new Date(y, m + 1, 1, 12).getTime();
  if (monthEnd > lastBooking) continue;          // 아직 결과가 확정되지 않은 달
  const act = actualOcc(y, m);
  if (act.count < 3) continue;
  const S = new Date(y, m, 1, 12).getTime();
  for (const [label, off] of PROBES) {
    if (off > 0 && off > dim(y, m)) continue;    // 그 달에 없는 날짜
    const asOf = S + off * 86400000;
    if (asOf > lastBooking) continue;
    const pred = predictAt(y, m, asOf);
    if (pred == null) continue;
    rows.push({ y, m, label, actual: act.occ, pred });
  }
}

console.log(`데이터: ${FILE} · 예약 ${ALL.length}건 · 객실 ${properties.length}개`);
console.log(`검증: ${new Set(rows.map(r => r.y + ':' + r.m)).size}개 달 · ${rows.length}개 시점`);
console.log('※ 앱의 실제 훅을 그 시점 데이터로 실행한 결과\n');

console.log('시점        MAE(평균오차)   편향(+과대)   100%예측  그중빗나감');
console.log('-'.repeat(64));
for (const [label] of PROBES) {
  const s = rows.filter(r => r.label === label);
  if (!s.length) continue;
  const mae = s.reduce((a, r) => a + Math.abs(r.pred - r.actual), 0) / s.length;
  const bias = s.reduce((a, r) => a + (r.pred - r.actual), 0) / s.length;
  const h = s.filter(r => r.pred >= 100), miss = h.filter(r => r.actual < 100);
  console.log(
    label.padEnd(12)
    + (mae.toFixed(1) + '%p').padStart(11)
    + ((bias >= 0 ? '+' : '') + bias.toFixed(1) + '%p').padStart(13)
    + (h.length + '회').padStart(10)
    + (miss.length + '회').padStart(11),
  );
}
const mae = rows.reduce((a, r) => a + Math.abs(r.pred - r.actual), 0) / rows.length;
const bias = rows.reduce((a, r) => a + (r.pred - r.actual), 0) / rows.length;
console.log('-'.repeat(64));
console.log('전체'.padEnd(12) + (mae.toFixed(1) + '%p').padStart(11)
  + ((bias >= 0 ? '+' : '') + bias.toFixed(1) + '%p').padStart(13));

// 100% 예측이 빗나간 사례
const bad = rows.filter(r => r.pred >= 100 && r.actual < 100);
if (bad.length) {
  console.log('\n100%로 예측했으나 실제 미달한 사례');
  console.log('-'.repeat(40));
  bad.slice(0, 20).forEach(r =>
    console.log(`  ${r.y}-${String(r.m + 1).padStart(2, '0')} ${r.label.padEnd(8)} 실제 ${r.actual}%`));
  if (bad.length > 20) console.log(`  ... 외 ${bad.length - 20}건`);
}
