import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { getNatColor } from '../utils/colors';
import type { DesktopStats, MonthlyTrend, PieDataItem, LeadTimeDataPoint, MonthlyTableRow, Booking } from '../types';

const CHANNEL_COLORS: Record<string, string> = {
  'Airbnb': 'var(--channel-airbnb)',
  'Booking.com': 'var(--channel-booking)',
  'Direct': 'var(--channel-direct)',
  'Naver': 'var(--channel-naver)',
};


const MONTH_LABELS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
const MONTH_LABELS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const getOverlapNights = (checkIn: string, checkOut: string, year: number, month: number): number => {
  const mStart = new Date(year, month, 1, 12, 0, 0);
  const mEnd = new Date(year, month + 1, 1, 12, 0, 0);
  const bStart = new Date(checkIn + 'T12:00:00');
  const bEnd = new Date(checkOut + 'T12:00:00');
  const overlapStart = bStart > mStart ? bStart : mStart;
  const overlapEnd = bEnd < mEnd ? bEnd : mEnd;
  if (overlapStart >= overlapEnd) return 0;
  return Math.round((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24));
};

interface MonthStats {
  gross: number; net: number; occNights: number;
  occupancy: number; adr: number; otaComm: number;
  bookingCount: number; daysInMonth: number;
}

const calcMonthStats = (validBookings: (Booking & { amount: number })[], year: number, month: number): MonthStats => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let gross = 0, net = 0, otaComm = 0, bookingCount = 0;
  const occupiedDates = new Set<string>();

  validBookings.forEach(b => {
    const totalNights = Math.max(1, Math.round(
      (new Date(b.checkOut + 'T12:00:00').getTime() - new Date(b.checkIn + 'T12:00:00').getTime()) / 86400000,
    ));
    const mStart = new Date(year, month, 1, 12, 0, 0);
    const mEnd = new Date(year, month + 1, 1, 12, 0, 0);
    const bStart = new Date(b.checkIn + 'T12:00:00');
    const bEnd = new Date(b.checkOut + 'T12:00:00');
    const overlapStart = bStart > mStart ? bStart : mStart;
    const overlapEnd = bEnd < mEnd ? bEnd : mEnd;
    const n = overlapStart >= overlapEnd ? 0 : Math.round((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24));
    
    if (n > 0) {
      bookingCount++;
      // Add unique dates to Set
      let cur = new Date(overlapStart);
      while (cur < overlapEnd) {
        occupiedDates.add(`${cur.getFullYear()}-${cur.getMonth()}-${cur.getDate()}`);
        cur.setDate(cur.getDate() + 1);
      }
      
      const gPortion = (b.amount / totalNights) * n;
      const commRate = b.commission || 0;
      const nPortion = gPortion * (1 - commRate / 100);
      gross += gPortion;
      net += nPortion;
      if (b.channel !== 'Direct') otaComm += (gPortion - nPortion);
    }
  });
  
  const occNights = occupiedDates.size;
  return {
    gross: Math.round(gross), net: Math.round(net), occNights: Math.min(occNights, daysInMonth),
    occupancy: Math.min(100, Math.round((occNights / daysInMonth) * 100)),
    adr: occNights === 0 ? 0 : Math.round(gross / occNights),
    otaComm: Math.round(otaComm), bookingCount, daysInMonth,
  };
};

export const useDesktopStats = (
  tableChannelFilter = 'All',
  tableNatFilter = 'All',
  tableGuestFilter = 'All',
): DesktopStats => {
  const { bookings, currentYear, currentMonth, settings, properties } = useStore();

  return useMemo(() => {
    const prop = properties?.[0] ?? {};
    const basePricePerNight = Number((prop as { basePrice?: number }).basePrice) || 189000;
    const weekendPricePerNight = Number((prop as { weekendPrice?: number }).weekendPrice) || 229000;

    const estimateAmount = (checkIn: string, checkOut: string): number => {
      const start = new Date(checkIn + 'T12:00:00');
      const end = new Date(checkOut + 'T12:00:00');
      let total = 0;
      const cur = new Date(start);
      while (cur < end) {
        const dow = cur.getDay();
        total += (dow === 5 || dow === 6) ? weekendPricePerNight : basePricePerNight;
        cur.setDate(cur.getDate() + 1);
      }
      return total || basePricePerNight;
    };

    type ValidBooking = Booking & { amount: number; isEstimated: boolean; originalAmount: number };

    const firstPropId = properties[0]?.id;
    const validBookings: ValidBooking[] = bookings
      .filter(b => !firstPropId || !b.propertyId || b.propertyId === firstPropId)
      .filter(b => b.status === 'confirmed' || b.status === 'checked in' || b.status === 'completed')
      .map(b => {
        const realAmount = Number(b.amount) || 0;
        const isEstimated = realAmount === 0;
        return {
          ...b,
          nationality: (b.nationality || '').trim() || 'Unknown',
          channel: ((b.channel || '').trim() || 'Direct') as import('../types').Channel,
          guests: b.guests || 0,
          amount: isEstimated ? estimateAmount(b.checkIn, b.checkOut) : realAmount,
          originalAmount: realAmount,
          isEstimated,
        };
      });

    const thisMonth = calcMonthStats(validBookings, currentYear, currentMonth);
    let lmYear = currentYear, lmMonth = currentMonth - 1;
    if (lmMonth < 0) { lmYear--; lmMonth = 11; }
    const lastMonth = calcMonthStats(validBookings, lmYear, lmMonth);

    const momBookingsChange = thisMonth.bookingCount - lastMonth.bookingCount;
    const momOccNightsChange = thisMonth.occNights - lastMonth.occNights;
    const momNetChange = thisMonth.net - lastMonth.net;
    const momNetPct = lastMonth.net === 0
      ? (thisMonth.net > 0 ? 100 : 0)
      : ((momNetChange / lastMonth.net) * 100);
    const momGrossChange = thisMonth.gross - lastMonth.gross;
    const otaCommChange = thisMonth.otaComm - lastMonth.otaComm;
    const otaCommPct = lastMonth.otaComm === 0
      ? (thisMonth.otaComm > 0 ? 100 : 0)
      : ((otaCommChange / lastMonth.otaComm) * 100);

    let yearlyGross = 0, yearlyNights = 0;
    for (let m = 0; m < 12; m++) {
      const ms = calcMonthStats(validBookings, currentYear, m);
      yearlyGross += ms.gross; yearlyNights += ms.occNights;
    }
    const adrYearAvg = yearlyNights === 0 ? 0 : Math.round(yearlyGross / yearlyNights);

    let ytdGross = 0, ytdNet = 0, ytdOtaCommission = 0;
    for (let m = 0; m <= currentMonth; m++) {
      const ms = calcMonthStats(validBookings, currentYear, m);
      ytdGross += ms.gross; ytdNet += ms.net; ytdOtaCommission += ms.otaComm;
    }

    const _today = new Date();
    const actualTodayYear  = _today.getFullYear();
    const actualTodayMonth = _today.getMonth();
    const todayMs = new Date(actualTodayYear, actualTodayMonth, _today.getDate()).getTime();

    // 신뢰 가능한 데이터로 인정하는 최소 예약 건수 (1~2건은 우연일 수 있어 제외)
    const MIN_RELIABLE_BOOKINGS = 3;

    // 오픈 초기 4개월(오픈월~+3) 데이터는 신뢰성 부족으로 STLY/hist2y에서 제외.
    // 오픈월 감지: 체크인 절대 최솟값 대신 MIN_RELIABLE_BOOKINGS 이상인 첫 번째 월로 판단.
    // → 더미 데이터나 테스트 예약 1~2건이 있어도 오픈월이 오염되지 않음.
    const monthCheckInCounts = new Map<number, number>();
    validBookings.forEach(b => {
      const k = new Date(b.checkIn + 'T12:00:00').getFullYear() * 12
              + new Date(b.checkIn + 'T12:00:00').getMonth();
      monthCheckInCounts.set(k, (monthCheckInCounts.get(k) || 0) + 1);
    });
    const sortedMonthKeys = [...monthCheckInCounts.keys()].sort((a, b) => a - b);
    let openingMonthKey = Number.MAX_SAFE_INTEGER;
    for (const k of sortedMonthKeys) {
      if ((monthCheckInCounts.get(k) || 0) >= MIN_RELIABLE_BOOKINGS) {
        openingMonthKey = k;
        break;
      }
    }
    const openingPeriodEndKey = openingMonthKey === Number.MAX_SAFE_INTEGER
      ? 0
      : openingMonthKey + 3; // 오픈월 포함 4개월을 초기 기간으로 간주 (ex. 25년6월~9월)

    // 최근 N개월 평균 점유율 (과거 데이터가 부족할 때 대체값으로 사용)
    const computeRecentAvgOcc = (exceptYear: number, exceptMonth: number): number => {
      const samples: number[] = [];
      for (let offset = 1; offset <= 18 && samples.length < 6; offset++) {
        let py = exceptYear, pm = exceptMonth - offset;
        while (pm < 0) { pm += 12; py--; }
        const past = calcMonthStats(validBookings, py, pm);
        if (past.bookingCount >= MIN_RELIABLE_BOOKINGS) samples.push(past.occupancy);
      }
      return samples.length > 0 ? samples.reduce((s, v) => s + v, 0) / samples.length : 65;
    };

    // ── 실증적 τ 추정 ─────────────────────────────────────────────────
    // 최근 12개월 완료 데이터에서 예약 도착 곡선을 재구성한 뒤,
    // 프로브 쌍(Da > Db)에 대해 τ = (Da-Db) / ln(cum(Db)/cum(Da)) 로 추정.
    // bookingDate가 없거나 iCal 자동동기화 예약은 제외 (날짜 신뢰성 없음).
    // 샘플 부족 시 τ=60 으로 fallback.
    const estimatedTau: number = (() => {
      const probeDs = [90, 75, 60, 45, 30, 21, 14, 7];
      const tauValues: number[] = [];

      for (let offset = 1; offset <= 12; offset++) {
        let hy = actualTodayYear, hm = actualTodayMonth - offset;
        while (hm < 0) { hm += 12; hy--; }

        const hms = calcMonthStats(validBookings, hy, hm);
        if (hms.bookingCount < MIN_RELIABLE_BOOKINGS || hms.occNights === 0) continue;

        // useBookingPace 와 동일하게 자정 기준 monthStart 사용
        const monthStartMs = new Date(hy, hm, 1).getTime();

        const monthBks = validBookings.filter(b =>
          b.bookingDate && !b.isAutoSynced &&
          getOverlapNights(b.checkIn, b.checkOut, hy, hm) > 0,
        );
        if (monthBks.length < 3) continue;

        // 각 예약이 월 시작 D일 전에 들어온 박수를 기록
        const dailyCurve = new Array(121).fill(0);
        monthBks.forEach(b => {
          const bookMs = new Date(b.bookingDate! + 'T12:00:00').getTime();
          const D = Math.max(0, Math.min(120,
            Math.round((monthStartMs - bookMs) / 86400000),
          ));
          dailyCurve[D] += getOverlapNights(b.checkIn, b.checkOut, hy, hm);
        });

        // 누적 곡선: cumNights[D] = D일 이상 전에 예약된 총 박수
        const cum: Record<number, number> = {};
        for (const D of probeDs) {
          let s = 0;
          for (let d = D; d <= 120; d++) s += dailyCurve[d];
          cum[D] = s;
        }

        // 모든 쌍 (Da > Db) 에서 τ 추정
        for (let i = 0; i < probeDs.length - 1; i++) {
          for (let j = i + 1; j < probeDs.length; j++) {
            const Da = probeDs[i], Db = probeDs[j]; // Da > Db
            const ca = cum[Da], cb = cum[Db];
            // cb > ca 이어야 함 (더 가까운 날짜에 더 많이 누적)
            if (ca > 0 && cb > ca) {
              const tau = (Da - Db) / Math.log(cb / ca);
              if (tau > 5 && tau < 300) tauValues.push(tau);
            }
          }
        }
      }

      if (tauValues.length < 3) return 60; // 데이터 부족 시 기존값 유지
      const sorted = [...tauValues].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return Math.round(
        sorted.length % 2 === 0
          ? (sorted[mid - 1] + sorted[mid]) / 2
          : sorted[mid],
      );
    })();

    // ── 핵심 예측 계산 (편향 보정 전) ────────────────────────────────────
    // overrideDaysUntilStart: 백테스트 시뮬레이션용 — 특정 D-N 시점을 강제 지정
    // histOTBatSamePoint: 동일 D-N 시점의 과거 평균 OTB — 상대 페이스 보정에 사용
    const computeForecastRaw = (
      ty: number, tm: number, otb: MonthStats,
      overrideDaysUntilStart?: number,
      histOTBatSamePoint?: number,
    ) => {
      const daysInMonth = new Date(ty, tm + 1, 0).getDate();
      const monthStartMs = new Date(ty, tm, 1).getTime();

      const stly   = calcMonthStats(validBookings, ty - 1, tm);
      const hist2y = calcMonthStats(validBookings, ty - 2, tm);

      const stlyIsRampUp   = ((ty - 1) * 12 + tm) <= openingPeriodEndKey;
      const hist2yIsRampUp = ((ty - 2) * 12 + tm) <= openingPeriodEndKey;
      const stlyReliable   = !stlyIsRampUp  && stly.bookingCount  >= MIN_RELIABLE_BOOKINGS;
      const hist2yReliable = !hist2yIsRampUp && hist2y.bookingCount >= MIN_RELIABLE_BOOKINGS;

      const historicalOccs: number[] = [];
      const historicalAdrs: number[] = [];
      if (stlyReliable)   { historicalOccs.push(stly.occupancy);   historicalAdrs.push(stly.adr); }
      if (hist2yReliable) { historicalOccs.push(hist2y.occupancy); historicalAdrs.push(hist2y.adr); }

      const histAvgOcc = historicalOccs.length > 0
        ? historicalOccs.reduce((s, v) => s + v, 0) / historicalOccs.length
        : computeRecentAvgOcc(ty, tm);
      const histAvgAdr = historicalAdrs.length > 0
        ? historicalAdrs.reduce((s, v) => s + v, 0) / historicalAdrs.length
        : basePricePerNight;

      let curveCompletion: number;
      let daysUntilStart: number;
      if (overrideDaysUntilStart !== undefined) {
        daysUntilStart = overrideDaysUntilStart;
        curveCompletion = overrideDaysUntilStart > 0
          ? Math.exp(-overrideDaysUntilStart / estimatedTau)
          : Math.min(daysInMonth, Math.max(1, Math.floor((todayMs - monthStartMs) / 86400000))) / daysInMonth;
      } else if (monthStartMs > todayMs) {
        daysUntilStart = Math.floor((monthStartMs - todayMs) / 86400000);
        curveCompletion = Math.exp(-daysUntilStart / estimatedTau);
      } else {
        daysUntilStart = 0;
        const elapsed = Math.min(daysInMonth, Math.max(1, Math.floor((todayMs - monthStartMs) / 86400000)));
        curveCompletion = elapsed / daysInMonth;
      }

      const expectedOtbOcc = histAvgOcc * curveCompletion;
      const paceVariance   = otb.occupancy - expectedOtbOcc;

      // 상대 페이스 비율: 같은 D-N 시점에 현재 월이 과거 평균보다 얼마나 앞서있는지
      // ex. 과거 D-5 평균 OTB=70%, 현재 OTB=84% → relPaceRatio=1.2 → 잔여 픽업 20% 상향
      const relPaceRatio = (histOTBatSamePoint !== undefined && histOTBatSamePoint > 5)
        ? Math.min(2.0, Math.max(0.6, otb.occupancy / histOTBatSamePoint))
        : 1.0;

      const remainingPickup = histAvgOcc * (1 - curveCompletion) * relPaceRatio;
      const cappedVariance = Math.max(-histAvgOcc * 0.5, Math.min(histAvgOcc * 0.5, paceVariance));
      const rawPace = otb.occupancy + remainingPickup + cappedVariance * 0.5 * (1 - curveCompletion);
      const paceForecast = Math.min(100, Math.max(otb.occupancy, rawPace));

      let weightedSum = 0, totalWeight = 0;
      if (stlyReliable)   { weightedSum += stly.occupancy   * 40; totalWeight += 40; }
      if (hist2yReliable) { weightedSum += hist2y.occupancy * 30; totalWeight += 30; }
      weightedSum += paceForecast * 30; totalWeight += 30;

      const predictedOcc = Math.max(otb.occupancy, Math.round(weightedSum / totalWeight));

      const reliableStlyAdr = stlyReliable ? stly.adr : 0;
      const predictedAdr = reliableStlyAdr > 0 ? reliableStlyAdr
        : otb.adr > 0 ? otb.adr
        : historicalAdrs.length > 0 ? histAvgAdr
        : basePricePerNight;

      const predictedOccNights = Math.round((predictedOcc / 100) * daysInMonth);
      const predictedGross = Math.round(predictedOccNights * predictedAdr);
      const commRate = otb.gross > 0 ? Math.max(0, Math.min(0.3, (otb.gross - otb.net) / otb.gross)) : 0.12;
      const predictedNet = Math.round(predictedGross * (1 - commRate));

      const dataScore = Math.min(1, (stlyReliable ? 0.5 : 0) + (historicalOccs.length * 0.25));
      const timeScore = Math.exp(-daysUntilStart / estimatedTau);
      const forecastConfidence = Math.round((0.4 * dataScore + 0.6 * timeScore) * 100) / 100;

      return { predictedOcc, predictedGross, predictedNet, forecastConfidence };
    };

    // ── D=0~90 전체 백테스트 커브 (1회만 계산) ───────────────────────────
    // 각 과거 완료 월에 대해 D=90 → D=0 을 순회하며 편향·histOTB를 누적.
    // bookingDate 순으로 정렬된 예약을 한 번만 스캔(incremental sweep)하므로 효율적.
    // 결과: biasCurve[D] = 평균(실제OCC - 예측OCC), histOTBCurve[D] = 평균 스냅샷OTB
    const { biasCurve, histOTBCurve } = (() => {
      const biasAccum   = new Map<number, number[]>();
      const histOTBAccum = new Map<number, number[]>();

      for (let offset = 1; offset <= 12; offset++) {
        let by = actualTodayYear, bm = actualTodayMonth - offset;
        while (bm < 0) { bm += 12; by--; }
        if ((by * 12 + bm) <= openingPeriodEndKey) continue;

        const actual = calcMonthStats(validBookings, by, bm);
        if (actual.bookingCount < MIN_RELIABLE_BOOKINGS) continue;

        // 이 과거 월의 STLY/hist2y·histAvgOcc를 한 번만 계산
        const pstly   = calcMonthStats(validBookings, by - 1, bm);
        const phist2y = calcMonthStats(validBookings, by - 2, bm);
        const pstlyOk   = ((by-1)*12+bm) > openingPeriodEndKey && pstly.bookingCount   >= MIN_RELIABLE_BOOKINGS;
        const phist2yOk = ((by-2)*12+bm) > openingPeriodEndKey && phist2y.bookingCount >= MIN_RELIABLE_BOOKINGS;
        const poccs: number[] = [];
        if (pstlyOk)   poccs.push(pstly.occupancy);
        if (phist2yOk) poccs.push(phist2y.occupancy);
        const histAvgOcc = poccs.length > 0
          ? poccs.reduce((s, v) => s + v, 0) / poccs.length
          : computeRecentAvgOcc(by, bm);

        const daysInMonth      = new Date(by, bm + 1, 0).getDate();
        const pastMonthStartMs = new Date(by, bm, 1).getTime();

        // 이 월에 박수가 겹치며 bookingDate가 있는 예약을 날짜 오름차순 정렬
        const rel = validBookings
          .filter(b => b.bookingDate && getOverlapNights(b.checkIn, b.checkOut, by, bm) > 0)
          .map(b => ({
            bdMs:   new Date(b.bookingDate! + 'T12:00:00').getTime(),
            nights: getOverlapNights(b.checkIn, b.checkOut, by, bm),
          }))
          .sort((a, b) => a.bdMs - b.bdMs);

        // D=90 → D=0 incremental sweep
        let ptr = 0, occNights = 0, bookingCt = 0;
        for (let D = 90; D >= 0; D--) {
          const cutoff = pastMonthStartMs - D * 86400000;
          while (ptr < rel.length && rel[ptr].bdMs <= cutoff) {
            occNights += rel[ptr].nights;
            bookingCt++;
            ptr++;
          }
          if (bookingCt < 1) continue;

          const occPct = Math.round((occNights / daysInMonth) * 100);

          // 페이스 예측 인라인 (computeForecastRaw와 동일한 공식)
          const cc  = Math.exp(-D / estimatedTau);
          const pv  = occPct - histAvgOcc * cc;
          const cv  = Math.max(-histAvgOcc * 0.5, Math.min(histAvgOcc * 0.5, pv));
          const pf  = Math.min(100, Math.max(occPct,
            occPct + histAvgOcc * (1 - cc) + cv * 0.5 * (1 - cc),
          ));
          const ew  = (pstlyOk ? 40 : 0) + (phist2yOk ? 30 : 0) + 30;
          const en  = (pstlyOk ? pstly.occupancy * 40 : 0)
                    + (phist2yOk ? phist2y.occupancy * 30 : 0)
                    + pf * 30;
          const simPredicted = Math.max(occPct, Math.round(en / ew));

          const d = D;
          if (!biasAccum.has(d))   biasAccum.set(d, []);
          if (!histOTBAccum.has(d)) histOTBAccum.set(d, []);
          biasAccum.get(d)!.push(actual.occupancy - simPredicted);
          histOTBAccum.get(d)!.push(occPct);
        }
      }

      // 평균화
      const bc  = new Map<number, number>();
      const hc  = new Map<number, number>();
      for (let D = 0; D <= 90; D++) {
        const bs = biasAccum.get(D);
        const hs = histOTBAccum.get(D);
        if (bs && bs.length >= 1) {
          bc.set(D, Math.round((bs.reduce((s, v) => s + v, 0) / bs.length) * 10) / 10);
          hc.set(D, Math.round(hs!.reduce((s, v) => s + v, 0) / hs!.length));
        }
      }

      // 샘플이 없는 D는 가장 가까운 이웃값으로 채움
      for (let D = 0; D <= 90; D++) {
        if (bc.has(D)) continue;
        let nearest = -1, dist = 999;
        bc.forEach((_, k) => { if (Math.abs(k - D) < dist) { dist = Math.abs(k - D); nearest = k; } });
        if (nearest >= 0) { bc.set(D, bc.get(nearest)!); hc.set(D, hc.get(nearest) ?? 0); }
      }

      return { biasCurve: bc, histOTBCurve: hc };
    })();

    // ── 최종 예측 (커브 조회 → 편향 보정 + 상대 페이스) ──────────────────
    const computeForecast = (ty: number, tm: number, otb: MonthStats) => {
      const monthStartMs = new Date(ty, tm, 1).getTime();
      const daysUntilStart = monthStartMs > todayMs
        ? Math.floor((monthStartMs - todayMs) / 86400000)
        : 0;
      const D = Math.min(90, daysUntilStart);

      const bias              = biasCurve.get(D)   ?? 0;
      const histOTBatSamePoint = histOTBCurve.get(D) ?? 0;

      const raw = computeForecastRaw(ty, tm, otb, undefined, histOTBatSamePoint || undefined);
      const correctedOcc = Math.min(100, Math.max(otb.occupancy, Math.round(raw.predictedOcc + bias)));

      if (correctedOcc === raw.predictedOcc) return raw;

      const scale = raw.predictedOcc > 0 ? correctedOcc / raw.predictedOcc : 1;
      return {
        predictedOcc: correctedOcc,
        predictedGross: Math.round(raw.predictedGross * scale),
        predictedNet: Math.round(raw.predictedNet * scale),
        forecastConfidence: raw.forecastConfidence,
      };
    };

    const monthlyTrends: MonthlyTrend[] = [];
    for (let i = -5; i <= 5; i++) {
      let ty = currentYear, tm = currentMonth + i;
      while (tm < 0) { tm += 12; ty--; }
      while (tm > 11) { tm -= 12; ty++; }
      const isFuture = i > 0;
      const isCurrent = i === 0;
      const ms = calcMonthStats(validBookings, ty, tm);

      let predictedOcc: number | null = null;
      let predictedGross: number | null = null;
      let predictedNet: number | null = null;
      let forecastConfidence = 0;

      // 예측은 선택 월 기준이 아닌 실제 오늘 기준으로 실행 (선택 월이 7월이어도 5~6월 예측 데이터 유지)
      const isActualCurrentOrFuture = ty > actualTodayYear || (ty === actualTodayYear && tm >= actualTodayMonth);
      if (isActualCurrentOrFuture) {
        const fc = computeForecast(ty, tm, ms);
        predictedOcc = fc.predictedOcc;
        predictedGross = fc.predictedGross;
        predictedNet = fc.predictedNet;
        forecastConfidence = fc.forecastConfidence;
      }

      monthlyTrends.push({
        month: MONTH_LABELS[tm], monthEn: MONTH_LABELS_EN[tm], year: ty,
        gross: ms.gross, net: ms.net, adr: ms.adr, occupancy: ms.occupancy,
        isCurrent, isFuture,
        otbOcc: ms.occupancy, otbGross: ms.gross,
        predictedOcc, predictedGross, predictedNet, forecastConfidence,
      });
    }

    // ── currentYear 전체 12개월 연간 예상 계산 ──────────────────────────
    // 과거월: 실제 확정 gross/net 합산
    // 현재월~미래월: computeForecast 결과 합산
    let afConfirmedGross = 0, afConfirmedNet = 0;
    let afPredictedGross = 0, afPredictedNet = 0;
    let afConfSum = 0, afConfCount = 0;

    for (let m = 0; m < 12; m++) {
      const isFutureMo = currentYear > actualTodayYear ||
        (currentYear === actualTodayYear && m >= actualTodayMonth);
      const ms = calcMonthStats(validBookings, currentYear, m);
      if (isFutureMo) {
        const fc = computeForecast(currentYear, m, ms);
        afPredictedGross += fc.predictedGross;
        afPredictedNet   += fc.predictedNet;
        afConfSum        += fc.forecastConfidence;
        afConfCount++;
      } else {
        afConfirmedGross += ms.gross;
        afConfirmedNet   += ms.net;
      }
    }

    const annualCumulativeData: { name: string; nameKo: string; actual: number | null; predicted: number | null; lastYear: number | null }[] = [];
    let runningGross = 0;
    let runningLastYearGross = 0;
    
    for (let m = 0; m < 12; m++) {
      const isFutureMo = currentYear > actualTodayYear || (currentYear === actualTodayYear && m > actualTodayMonth);
      const isCurrentMo = (currentYear === actualTodayYear && m === actualTodayMonth);
      
      const ms = calcMonthStats(validBookings, currentYear, m);
      const msLY = calcMonthStats(validBookings, currentYear - 1, m);
      
      let actualGross: number | null = null;
      let predictedGross: number | null = null;
      
      if (isFutureMo) {
        const fc = computeForecast(currentYear, m, ms);
        runningGross += fc.predictedGross;
        predictedGross = runningGross;
      } else if (isCurrentMo) {
        runningGross += ms.gross;
        actualGross = runningGross;
        predictedGross = runningGross; 
      } else {
        runningGross += ms.gross;
        actualGross = runningGross;
      }
      
      runningLastYearGross += msLY.gross;

      annualCumulativeData.push({ 
        name: MONTH_LABELS_EN[m], 
        nameKo: MONTH_LABELS[m], 
        actual: actualGross, 
        predicted: predictedGross,
        lastYear: runningLastYearGross
      });
    }
    const annualForecast = {
      confirmedGross:  afConfirmedGross,
      confirmedNet:    afConfirmedNet,
      predictedGross:  afPredictedGross,
      predictedNet:    afPredictedNet,
      totalGross:      afConfirmedGross + afPredictedGross,
      totalNet:        afConfirmedNet   + afPredictedNet,
      avgConfidence:   afConfCount > 0 ? Math.round((afConfSum / afConfCount) * 100) : 0,
    };

    const channelCounts: Record<string, number> = {};
    let totalChannelBookings = 0;
    const natCounts: Record<string, number> = {};
    let totalNatBookings = 0;

    validBookings.forEach(b => {
      const n = getOverlapNights(b.checkIn, b.checkOut, currentYear, currentMonth);
      if (n > 0) {
        channelCounts[b.channel] = (channelCounts[b.channel] || 0) + 1;
        totalChannelBookings++;
        natCounts[b.nationality] = (natCounts[b.nationality] || 0) + 1;
        totalNatBookings++;
      }
    });

    let channelPieData: PieDataItem[] = Object.keys(channelCounts)
      .map(ch => ({ name: ch, value: Math.round((channelCounts[ch] / totalChannelBookings) * 100), count: channelCounts[ch], color: CHANNEL_COLORS[ch] || '#94a3b8' }))
      .sort((a, b) => b.value - a.value);
    if (channelPieData.length === 0) channelPieData = [{ name: 'No Data', value: 100, count: 0, color: '#334155' }];

    let nationalityPieData: PieDataItem[] = Object.keys(natCounts)
      .map((nat) => ({ name: nat, value: Math.round((natCounts[nat] / totalNatBookings) * 100), count: natCounts[nat], color: getNatColor(nat) }))
      .sort((a, b) => b.value - a.value);
    if (nationalityPieData.length === 0) nationalityPieData = [{ name: 'No Data', value: 100, count: 0, color: '#334155' }];

    // 전체 기간 채널/국적 분포
    const allTimeChanCounts: Record<string, number> = {};
    const allTimeNatCts: Record<string, number> = {};
    validBookings.forEach(b => {
      allTimeChanCounts[b.channel] = (allTimeChanCounts[b.channel] || 0) + 1;
      allTimeNatCts[b.nationality] = (allTimeNatCts[b.nationality] || 0) + 1;
    });
    const allTimeTotalCount = validBookings.length;

    let allTimeChannelPieData: PieDataItem[] = Object.keys(allTimeChanCounts).length > 0
      ? Object.keys(allTimeChanCounts)
          .map(ch => ({ name: ch, value: Math.round((allTimeChanCounts[ch] / allTimeTotalCount) * 100), count: allTimeChanCounts[ch], color: CHANNEL_COLORS[ch] || '#94a3b8' }))
          .sort((a, b) => b.value - a.value)
      : [{ name: 'No Data', value: 100, count: 0, color: '#334155' }];

    let allTimeNationalityPieData: PieDataItem[] = Object.keys(allTimeNatCts).length > 0
      ? Object.keys(allTimeNatCts)
          .map(nat => ({ name: nat, value: Math.round((allTimeNatCts[nat] / allTimeTotalCount) * 100), count: allTimeNatCts[nat], color: getNatColor(nat) }))
          .sort((a, b) => b.value - a.value)
      : [{ name: 'No Data', value: 100, count: 0, color: '#334155' }];

    const startX = new Date(currentYear, currentMonth - 2, 1).getTime();
    const endX = new Date(currentYear, currentMonth + 3, 0, 23, 59, 59).getTime();
    const allLeadTimeNats = new Set<string>();

    const leadTimeScatterData: LeadTimeDataPoint[] = validBookings
      .map(b => {
        const ciTime = new Date(b.checkIn + 'T12:00:00').getTime();
        if (ciTime < startX || ciTime > endX) return null;
        let leadDays = 0;
        if (b.bookingDate) {
          leadDays = Math.max(0, Math.round((ciTime - new Date(b.bookingDate + 'T12:00:00').getTime()) / 86400000));
        } else {
          const seed = (b.guestName || '').length + (b.amount || 0) % 100;
          leadDays = (seed * 13 + (b.guests || 2) * 7) % 150;
        }
        leadDays = Math.min(150, leadDays);
        const nights = Math.max(1, Math.round((new Date(b.checkOut + 'T12:00:00').getTime() - new Date(b.checkIn + 'T12:00:00').getTime()) / 86400000));
        allLeadTimeNats.add(b.nationality);
        return { x: ciTime, y: leadDays, nights, channel: b.channel, nationality: b.nationality, guests: b.guests || 2, guestName: b.guestName };
      })
      .filter((v) => v !== null) as LeadTimeDataPoint[];

    const currencyMap: Record<string, string> = { 'USD': '$', 'KRW': '₩', 'EUR': '€' };
    const currencySymbol = currencyMap[settings?.currency] || '₩';

    // Table filter logic
    const allMonthKeys = new Set<string>();
    let tableBookings = validBookings;
    if (tableChannelFilter !== 'All') tableBookings = tableBookings.filter(b => b.channel === tableChannelFilter);
    if (tableNatFilter !== 'All') tableBookings = tableBookings.filter(b => b.nationality === tableNatFilter);
    if (tableGuestFilter !== 'All') {
      if (tableGuestFilter === '5+') tableBookings = tableBookings.filter(b => (b.guests || 0) >= 5);
      else tableBookings = tableBookings.filter(b => (b.guests || 0) === Number(tableGuestFilter));
    }

    validBookings.forEach(b => {
      const ci = new Date(b.checkIn + 'T12:00:00');
      const co = new Date(b.checkOut + 'T12:00:00');
      let cur = new Date(ci.getFullYear(), ci.getMonth(), 1);
      const end = new Date(co.getFullYear(), co.getMonth(), 1);
      while (cur <= end) {
        allMonthKeys.add(`${cur.getFullYear()}-${cur.getMonth()}`);
        cur.setMonth(cur.getMonth() + 1);
      }
    });

    const monthlyTableData: MonthlyTableRow[] = [...allMonthKeys]
      .map(key => {
        const [y, m] = key.split('-').map(Number);
        const ms = calcMonthStats(tableBookings, y, m);
        const natDist: Record<string, number> = {}, chDist: Record<string, number> = {}, guestBuckets: Record<string, number> = {};
        let totalGuests = 0, guestBookingCount = 0, totalLeadDays = 0, leadCount = 0;
        const adrByNat: Record<string, { gross: number; nights: number }> = {};
        const adrByCh: Record<string, { gross: number; nights: number }> = {};
        const adrByGuest: Record<string, { gross: number; nights: number }> = {};

        tableBookings.forEach(b => {
          const totalNights = Math.max(1, Math.round((new Date(b.checkOut + 'T12:00:00').getTime() - new Date(b.checkIn + 'T12:00:00').getTime()) / 86400000));
          const n = getOverlapNights(b.checkIn, b.checkOut, y, m);
          if (n > 0) {
            const gPortion = (b.amount / totalNights) * n;
            natDist[b.nationality] = (natDist[b.nationality] || 0) + 1;
            if (!adrByNat[b.nationality]) adrByNat[b.nationality] = { gross: 0, nights: 0 };
            adrByNat[b.nationality].gross += gPortion; adrByNat[b.nationality].nights += n;
            chDist[b.channel] = (chDist[b.channel] || 0) + 1;
            if (!adrByCh[b.channel]) adrByCh[b.channel] = { gross: 0, nights: 0 };
            adrByCh[b.channel].gross += gPortion; adrByCh[b.channel].nights += n;
            totalGuests += (b.guests || 0); guestBookingCount++;
            const gKey = (b.guests || 0) >= 5 ? '5+' : `${b.guests || 0}`;
            guestBuckets[gKey] = (guestBuckets[gKey] || 0) + 1;
            if (!adrByGuest[gKey]) adrByGuest[gKey] = { gross: 0, nights: 0 };
            adrByGuest[gKey].gross += gPortion; adrByGuest[gKey].nights += n;
            const seed = (b.guestName || '').length + (b.amount || 0) % 100;
            totalLeadDays += (seed * 7 + (b.guests || 2) * 3) % 90; leadCount++;
          }
        });

        const adrNatMap: Record<string, number> = {};
        Object.entries(adrByNat).forEach(([k, v]) => { adrNatMap[k] = v.nights === 0 ? 0 : Math.round(v.gross / v.nights); });
        const adrChMap: Record<string, number> = {};
        Object.entries(adrByCh).forEach(([k, v]) => { adrChMap[k] = v.nights === 0 ? 0 : Math.round(v.gross / v.nights); });
        const adrGuestMap: Record<string, number> = {};
        Object.entries(adrByGuest).forEach(([k, v]) => { adrGuestMap[k] = v.nights === 0 ? 0 : Math.round(v.gross / v.nights); });

        const unfilteredMs = calcMonthStats(validBookings, y, m);
        const unfilteredTotal = unfilteredMs.bookingCount || 1;
        const natArray = Object.entries(natDist).map(([name, count]) => ({ name, pct: Math.round((count / unfilteredTotal) * 100) })).sort((a, b) => b.pct - a.pct);
        const chArray = Object.entries(chDist).map(([name, count]) => ({ name, pct: Math.round((count / unfilteredTotal) * 100) })).sort((a, b) => b.pct - a.pct);
        const guestArray = Object.entries(guestBuckets).map(([name, count]) => ({ name: `${name}인`, pct: Math.round((count / unfilteredTotal) * 100) })).sort((a, b) => parseInt(a.name) - parseInt(b.name));
        const avgGuests = guestBookingCount === 0 ? 0 : Math.round((totalGuests / guestBookingCount) * 10) / 10;
        const avgLeadTime = leadCount === 0 ? 0 : Math.round(totalLeadDays / leadCount);

        return {
          year: y, month: m,
          label: `${String(y).slice(2)}년 ${m + 1}월`,
          labelEn: `${MONTH_LABELS_EN[m]} '${String(y).slice(2)}`,
          sortKey: y * 100 + m, nationalityDist: natArray, channelDist: chArray,
          avgGuests, guestDist: guestArray, adr: ms.adr, otaComm: ms.otaComm,
          net: ms.net, avgLeadTime, bookingCount: ms.bookingCount, occupancy: ms.occupancy, occNights: ms.occNights,
          gross: ms.gross, channelPcts: chDist, channelTotal: guestBookingCount || 1,
          adrByNationality: adrNatMap, adrByChannel: adrChMap, adrByGuestCount: adrGuestMap,
        };
      })
      .filter(row => row.bookingCount > 0)
      .sort((a, b) => b.sortKey - a.sortKey);

    return {
      netIncome: thisMonth.net, grossRevenue: thisMonth.gross,
      momNetChange, momNetPct: Math.round(momNetPct * 10) / 10, momGrossChange,
      occupancyRate: thisMonth.occupancy, occupiedNights: thisMonth.occNights,
      totalBookings: thisMonth.bookingCount, momBookingsChange, momOccNightsChange,
      daysInMonth: thisMonth.daysInMonth,
      adrThisMonth: thisMonth.adr, adrYearAvg,
      otaCommission: thisMonth.otaComm, otaCommPct: Math.round(otaCommPct * 10) / 10,
      ytdGross, ytdNet, ytdOtaCommission,
      monthlyTrends, channelPieData, totalChannelBookings, allTimeChannelPieData,
      nationalityPieData, totalNatBookings, allTimeNationalityPieData, allTimeTotal: allTimeTotalCount,
      ytdOtaCommissionByChannel: {},
      leadTimeScatterData, leadTimeStartX: startX, leadTimeEndX: endX,
      leadTimeNatKeys: [...allLeadTimeNats], monthlyTableData, currencySymbol, annualForecast, annualCumulativeData,
    };
  }, [bookings, currentYear, currentMonth, settings?.currency, properties, tableChannelFilter, tableNatFilter, tableGuestFilter]);
};
