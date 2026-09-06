/**
 * run_hook_check.mjs — 앱의 실제 useDesktopStats 훅을 그대로 실행해 예측값을 확인한다.
 *
 * 재현 스크립트를 따로 만들면 앱과 미묘하게 달라져(실제로 그런 일이 있었다) 잘못된
 * 결론을 내게 된다. 그래서 훅 파일을 직접 import하고, React와 스토어만 가짜로 채운다.
 *
 * 사용법: node run_hook_check.mjs [CSV파일]
 */
import fs from 'fs';
import path from 'path';

const FILE = process.argv[2] || 'bookings_latest.csv';

// ── CSV 로드 ────────────────────────────────────────────────────
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
  guests: 2,
  infants: 0,
  nationality: '대한민국',
  channel: r.channel || 'Direct',
  status: r.status || 'confirmed',
  amount: Number(r.amount) || 0,
  commission: Number(r.commission) || 0,
  isAutoSynced: false,
}));

const propIds = [...new Set(bookings.map(b => b.propertyId).filter(Boolean))];
const properties = propIds.map((id, i) => ({
  id, name: '숙소' + (i + 1), basePrice: 189000, weekendPrice: 229000,
  cleaningFee: 0, color: '#3b82f6',
}));

// ── 오늘 날짜 고정 (앱은 new Date()를 쓰므로 시스템 시간에 의존) ──
const TODAY = process.env.FAKE_TODAY || new Date().toISOString().slice(0, 10);
console.log(`기준일(오늘): ${TODAY}`);
console.log(`데이터: ${FILE} · 예약 ${bookings.length}건 · 숙소 ${properties.length}개\n`);

// ── react / zustand store를 가짜로 대체 ─────────────────────────
const storeState = {
  bookings,
  properties,
  currentYear: Number(TODAY.slice(0, 4)),
  currentMonth: Number(TODAY.slice(5, 7)) - 1,
  settings: { profileName: '', profileRole: '', propertyName: '' },
  channelSettings: [],
  selectedDashboardPropertyId: null,
};

globalThis.__STORE__ = storeState;
globalThis.__DBG__ = true;

// ── 훅 실행 ─────────────────────────────────────────────────────
const mod = await import('./src/hooks/useDesktopStats.ts?' + Date.now());
const stats = mod.useDesktopStats();

// ── 결과 출력 ───────────────────────────────────────────────────
console.log('■ 월별 추이 (11개월) — 앱이 실제로 계산한 값');
console.log('월          점유율   예상점유율   신뢰도');
console.log('-'.repeat(48));
for (const t of stats.monthlyTrends) {
  const pred = t.predictedOcc == null ? '   –' : String(t.predictedOcc).padStart(4) + '%';
  const conf = t.predictedOcc == null ? '  –' : String(Math.round(t.forecastConfidence * 100)).padStart(3) + '%';
  const mark = t.isCurrent ? ' ← 이번달' : '';
  console.log(
    `${t.year}-${String(stats.monthlyTrends.indexOf(t)).padStart(2)} ${t.month.padEnd(5)}`
      .replace(/-\s*\d+ /, ' ')
      .padEnd(12)
    + String(t.occupancy).padStart(4) + '%'
    + pred.padStart(11)
    + conf.padStart(9) + mark,
  );
}

