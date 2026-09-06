/**
 * backtest_forecast.mjs — 점유율 예측 백테스트
 *
 * 과거 완료된 각 달에 대해 "그 달 시작 D일 전 시점"으로 되돌아가,
 * 그때 알 수 있었던 정보만으로 예측을 수행하고 실제 결과와 비교한다.
 *
 * 사용법:
 *   node backtest_forecast.mjs [데이터파일]
 *   (기본값: parsed_bookings.json)
 *
 * 데이터 형식: [{ checkIn, checkOut, bookingDate, amount, channel, status, propertyId? }]
 * Supabase에서 내보낸 snake_case(checkin/checkout/bookingdate/property_id)도 자동 인식.
 */
import fs from 'fs';

const FILE = process.argv[2] || 'parsed_bookings.json';
const MIN_RELIABLE_BOOKINGS = 3;
const VALID_STATUS = new Set(['confirmed', 'checked in', 'completed']);

// ── 데이터 로드 (camelCase / snake_case 모두 수용) ──────────────────
function load(file) {
  const text = fs.readFileSync(file, 'utf8').trim();
  let rows;
  if (text.startsWith('[')) {
    rows = JSON.parse(text);
  } else {
    // CSV
    const lines = text.split(/\r?\n/).filter(Boolean);
    const head = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    rows = lines.slice(1).map(line => {
      const cells = [];
      let cur = '', inQ = false;
      for (const ch of line) {
        if (ch === '"') inQ = !inQ;
        else if (ch === ',' && !inQ) { cells.push(cur); cur = ''; }
        else cur += ch;
      }
      cells.push(cur);
      return Object.fromEntries(head.map((h, i) => [h, (cells[i] ?? '').trim()]));
    });
  }
  return rows
    .map(b => ({
      checkIn: b.checkIn ?? b.checkin,
      checkOut: b.checkOut ?? b.checkout,
      bookingDate: b.bookingDate ?? b.bookingdate ?? null,
      guestName: b.guestName ?? b.guestname ?? '',
      amount: Number(b.amount) || 0,
      channel: b.channel || 'Direct',
      status: b.status || 'confirmed',
      propertyId: b.propertyId ?? b.property_id ?? null,
    }))
    .filter(b => b.checkIn && b.checkOut && VALID_STATUS.has(b.status))
    .filter(b => b.guestName !== 'Not available');
}

// ── 기본 유틸 ────────────────────────────────────────────────────
const ms = d => new Date(d + 'T12:00:00').getTime();
const daysIn = (y, m) => new Date(y, m + 1, 0).getDate();

/** 특정 달에 걸치는 박수 (일할 계산) */
function nightsIn(b, y, m) {
  const mS = new Date(y, m, 1, 12).getTime();
  const mE = new Date(y, m + 1, 1, 12).getTime();
  const s = Math.max(ms(b.checkIn), mS);
  const e = Math.min(ms(b.checkOut), mE);
  return e <= s ? 0 : Math.round((e - s) / 86400000);
}

/**
 * 그 달의 점유율. asOfMs를 주면 "그 시점까지 접수된 예약만"으로 계산(OTB 재현).
 * 분모는 일수 × 객실 수 (앱의 calcMonthStats와 동일 정의).
 */
function occupancy(bookings, y, m, rooms, asOfMs = Infinity) {
  const dim = daysIn(y, m);
  let nights = 0, count = 0;
  for (const b of bookings) {
    if (b.bookingDate && ms(b.bookingDate) > asOfMs) continue;
    const n = nightsIn(b, y, m);
    if (n > 0) { nights += n; count++; }
  }
  return {
    occ: Math.min(100, Math.round((nights / (dim * rooms)) * 100)),
    rawOcc: (nights / (dim * rooms)) * 100,
    nights, count,
  };
}

// ── 예측 모델들 ──────────────────────────────────────────────────
// 공통 입력: { stly, hist2y, otb, D, histAvgOcc, tau }
// 반환: 예측 점유율(%)

/** 현재 앱 로직 (useDesktopStats.computeForecastRaw) */
function modelCurrent({ stly, hist2y, otb, D, tau }) {
  const hist = [stly, hist2y].filter(v => v != null);
  const histAvg = hist.length ? hist.reduce((s, v) => s + v, 0) / hist.length : 65;
  const cc = D > 0 ? Math.exp(-D / tau) : 1;
  const paceVar = otb - histAvg * cc;
  const remaining = histAvg * (1 - cc);
  const capped = Math.max(-histAvg * 0.5, Math.min(histAvg * 0.5, paceVar));
  const rawPace = otb + remaining + capped * 0.5 * (1 - cc);
  const pace = Math.min(100, Math.max(otb, rawPace));

  let w = 0, t = 0;
  if (stly != null) { w += stly * 40; t += 40; }
  if (hist2y != null) { w += hist2y * 30; t += 30; }
  w += pace * 30; t += 30;
  return Math.min(100, Math.max(otb, Math.round(w / t)));
}

/** 개선①: 만실 근처 체감 — 90% 초과분을 압축해서 더한다 */
function modelDiminishing({ stly, hist2y, otb, D, tau }) {
  const hist = [stly, hist2y].filter(v => v != null);
  const histAvg = hist.length ? hist.reduce((s, v) => s + v, 0) / hist.length : 65;
  const cc = D > 0 ? Math.exp(-D / tau) : 1;
  const remaining = histAvg * (1 - cc);
  // 남은 여유 공간에 비례해 픽업을 줄인다 (100%에 가까울수록 덜 팔림)
  const headroom = Math.max(0, 100 - otb) / 100;
  const damped = remaining * headroom;
  const pace = Math.min(100, Math.max(otb, otb + damped));

  let w = 0, t = 0;
  if (stly != null) { w += stly * 40; t += 40; }
  if (hist2y != null) { w += hist2y * 30; t += 30; }
  w += pace * 30; t += 30;
  return Math.min(100, Math.max(otb, Math.round(w / t)));
}

/** 개선③: D가 가까울수록 페이스(실측) 비중을 높인다 */
function modelDynamicWeight({ stly, hist2y, otb, D, tau }) {
  const hist = [stly, hist2y].filter(v => v != null);
  const histAvg = hist.length ? hist.reduce((s, v) => s + v, 0) / hist.length : 65;
  const cc = D > 0 ? Math.exp(-D / tau) : 1;
  const remaining = histAvg * (1 - cc);
  const headroom = Math.max(0, 100 - otb) / 100;
  const pace = Math.min(100, Math.max(otb, otb + remaining * headroom));

  // cc(진행률)가 높을수록 = 달이 가까울수록 페이스 신뢰
  const paceW = 30 + 50 * cc;          // 30 → 80
  const histW = 100 - paceW;
  let w = pace * paceW, t = paceW;
  if (hist.length) {
    const per = histW / hist.length;
    for (const h of hist) { w += h * per; t += per; }
  } else { t = paceW; }
  return Math.min(100, Math.max(otb, Math.round(w / t)));
}

/** 개선②: 취소 여지 — 하한을 otb가 아니라 otb×(1-cancelRate)로 */
function modelWithCancel({ stly, hist2y, otb, D, tau, cancelRate = 0.03 }) {
  const base = modelDynamicWeight({ stly, hist2y, otb, D, tau });
  const floor = otb * (1 - cancelRate);
  return Math.min(100, Math.max(floor, base));
}

const MODELS = {
  '현재로직': modelCurrent,
  '①만실체감': modelDiminishing,
  '①+③동적가중': modelDynamicWeight,
  '①+②+③전체': modelWithCancel,
};

// ── 백테스트 실행 ────────────────────────────────────────────────
function backtest(bookings, rooms, probeDs = [60, 45, 30, 21, 14, 7]) {
  // 예약이 있는 달 목록
  const monthSet = new Set();
  for (const b of bookings) {
    const d = new Date(b.checkIn + 'T12:00:00');
    monthSet.add(`${d.getFullYear()}-${d.getMonth()}`);
  }
  const months = [...monthSet].map(k => k.split('-').map(Number)).sort((a, c) => a[0] - c[0] || a[1] - c[1]);

  // "완료된" 달만 대상: 데이터상 마지막 체크아웃보다 이전에 끝난 달
  // 완료 기준일: 마지막 예약접수일(bookingDate) = 데이터를 뽑은 시점
  const lastMs = Math.max(...bookings.filter(b=>b.bookingDate).map(b => ms(b.bookingDate)));

  const results = [];
  for (const [y, m] of months) {
    const monthEndMs = new Date(y, m + 1, 1, 12).getTime();
    if (monthEndMs > lastMs) continue;              // 아직 안 끝난 달 제외 (미래 달은 실제값이 확정 안 됨)

    const actual = occupancy(bookings, y, m, rooms);
    if (actual.count < MIN_RELIABLE_BOOKINGS) continue;

    const stlyS = occupancy(bookings, y - 1, m, rooms);
    const h2yS = occupancy(bookings, y - 2, m, rooms);
    const stly = stlyS.count >= MIN_RELIABLE_BOOKINGS ? stlyS.occ : null;
    const hist2y = h2yS.count >= MIN_RELIABLE_BOOKINGS ? h2yS.occ : null;
    if (stly == null && hist2y == null) continue;   // 과거 근거 없으면 스킵

    const monthStartMs = new Date(y, m, 1, 12).getTime();
    for (const D of probeDs) {
      const asOf = monthStartMs - D * 86400000;
      const otbS = occupancy(bookings, y, m, rooms, asOf);
      const row = { y, m, D, actual: actual.occ, otb: otbS.occ, preds: {} };
      for (const [name, fn] of Object.entries(MODELS)) {
        row.preds[name] = fn({ stly, hist2y, otb: otbS.occ, D, tau: 60 });
      }
      results.push(row);
    }
  }
  return results;
}

// ── 리포트 ──────────────────────────────────────────────────────
function report(results) {
  if (!results.length) {
    console.log('⚠️  백테스트 가능한 달이 없습니다.');
    console.log('   (완료된 달 + 예약 3건 이상 + 전년 데이터 존재 조건을 모두 만족해야 합니다)');
    return;
  }
  const names = Object.keys(MODELS);

  console.log('\n' + '='.repeat(78));
  console.log('모델별 정확도 — 낮을수록 좋음');
  console.log('='.repeat(78));
  console.log('모델'.padEnd(16) + 'MAE(평균오차)'.padStart(14) + '편향(+과대)'.padStart(13)
    + '100%예측'.padStart(11) + '그중빗나감'.padStart(12));
  console.log('-'.repeat(78));
  for (const n of names) {
    const errs = results.map(r => r.preds[n] - r.actual);
    const mae = errs.reduce((s, e) => s + Math.abs(e), 0) / errs.length;
    const bias = errs.reduce((s, e) => s + e, 0) / errs.length;
    const hundreds = results.filter(r => r.preds[n] >= 100);
    const missed = hundreds.filter(r => r.actual < 100);
    console.log(
      n.padEnd(16)
      + (mae.toFixed(1) + '%p').padStart(14)
      + ((bias >= 0 ? '+' : '') + bias.toFixed(1) + '%p').padStart(13)
      + (hundreds.length + '회').padStart(11)
      + (missed.length + '회').padStart(12),
    );
  }

  // D별 상세
  console.log('\n' + '='.repeat(78));
  console.log('D(달 시작 전 일수)별 MAE');
  console.log('='.repeat(78));
  const Ds = [...new Set(results.map(r => r.D))].sort((a, b) => b - a);
  console.log('D'.padEnd(8) + names.map(n => n.padStart(15)).join(''));
  console.log('-'.repeat(78));
  for (const D of Ds) {
    const sub = results.filter(r => r.D === D);
    const cells = names.map(n => {
      const mae = sub.reduce((s, r) => s + Math.abs(r.preds[n] - r.actual), 0) / sub.length;
      return (mae.toFixed(1) + '%p').padStart(15);
    });
    console.log(('D-' + D).padEnd(8) + cells.join(''));
  }

  // 100% 예측이 빗나간 사례
  const bad = results.filter(r => r.preds['현재로직'] >= 100 && r.actual < 100);
  if (bad.length) {
    console.log('\n' + '='.repeat(78));
    console.log('현재 로직이 100%로 예측했으나 실제는 미달한 사례');
    console.log('='.repeat(78));
    console.log('연월'.padEnd(12) + 'D'.padEnd(7) + 'OTB'.padStart(7) + '실제'.padStart(8)
      + names.slice(1).map(n => n.padStart(15)).join(''));
    console.log('-'.repeat(78));
    for (const r of bad.slice(0, 25)) {
      console.log(
        `${r.y}-${String(r.m + 1).padStart(2, '0')}`.padEnd(12)
        + ('D-' + r.D).padEnd(7)
        + (r.otb + '%').padStart(7)
        + (r.actual + '%').padStart(8)
        + names.slice(1).map(n => (r.preds[n] + '%').padStart(15)).join(''),
      );
    }
    if (bad.length > 25) console.log(`... 외 ${bad.length - 25}건`);
  }
}

// ── main ────────────────────────────────────────────────────────
const bookings = load(FILE);
const propIds = new Set(bookings.map(b => b.propertyId).filter(Boolean));
const rooms = Math.max(1, propIds.size);

console.log(`데이터: ${FILE}`);
console.log(`예약 ${bookings.length}건 · 객실 수 ${rooms} (분모 = 일수 × ${rooms})`);
const withBD = bookings.filter(b => b.bookingDate).length;
console.log(`bookingDate 보유 ${withBD}건 (${Math.round(withBD / bookings.length * 100)}%) — OTB 재현에 필수`);

report(backtest(bookings, rooms));
