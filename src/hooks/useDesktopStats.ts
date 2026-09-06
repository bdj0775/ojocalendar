import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { getNatColor } from '../utils/colors';
import type { DesktopStats, MonthlyTrend, PieDataItem, LeadTimeDataPoint, MonthlyTableRow, Booking } from '../types';


/**
 * 예측을 신뢰할 수 있는 최대 시계(일). 이 기간을 넘어가면 신뢰도를 급격히 낮춘다.
 * 실측 근거: 예약 리드타임 중앙값 31일, D-90 이전 접수 17%, D-180 이전 3%.
 * 즉 D-120을 넘는 달은 판단 근거가 사실상 없다.
 */
export const FORECAST_RELIABLE_HORIZON_DAYS = 120;

/** 이 신뢰도 미만이면 UI에서 '참고용'으로 표시한다 */
export const LOW_CONFIDENCE_THRESHOLD = 0.3;


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

/**
 * 한 달의 매출·점유율 지표를 계산한다.
 *
 * 점유율 = 판매된 객실박 ÷ 판매 가능한 객실박(그 달 일수 × 객실 수)
 * 숙박업 표준(Occupancy Rate) 정의이며, 객실이 여러 개일 때도 정확하다.
 *
 * @param roomCount 분모에 쓸 객실 수. 드롭다운에서 특정 숙소를 선택하면 1,
 *                  '전체'면 예약이 있는 숙소 수(빈 숙소는 분모를 부풀리므로 제외).
 */
const calcMonthStats = (
  validBookings: (Booking & { amount: number })[],
  year: number,
  month: number,
  roomCount = 1,
): MonthStats => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // 0으로 나누는 것을 방지 — 숙소가 하나도 없으면 1개로 취급
  const rooms = Math.max(1, roomCount);
  const availableRoomNights = daysInMonth * rooms;
  let gross = 0, net = 0, otaComm = 0, bookingCount = 0;
  // 날짜 Set이 아니라 박수를 그대로 합산한다. Set을 쓰면 같은 날짜에 걸친 예약이
  // 1박으로 합쳐져, 객실이 여러 개일 때는 물론 중복 예약이 있을 때도 실제보다 낮게 나온다.
  let soldRoomNights = 0;

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
      soldRoomNights += n;

      const gPortion = (b.amount / totalNights) * n;
      const getDefaultCommRate = (ch: string) => ch === 'Airbnb' || ch === 'Booking.com' ? 17 : ch === 'Naver' ? 2 : 0;
      const getEffectiveCommRate = (b: Booking & { amount: number }) => {
        if (b.commission > 100) return b.amount > 0 ? (b.commission / b.amount) * 100 : 0;
        if (b.commission === 0) return getDefaultCommRate(b.channel);
        return b.commission || 0;
      };
      const commRate = getEffectiveCommRate(b);
      const nPortion = gPortion * (1 - commRate / 100);
      gross += gPortion;
      net += nPortion;
      if (b.channel !== 'Direct') otaComm += (gPortion - nPortion);
    }
  });
  
  const occNights = soldRoomNights;
  return {
    gross: Math.round(gross), net: Math.round(net),
    occNights: Math.min(occNights, availableRoomNights),
    occupancy: Math.min(100, Math.round((occNights / availableRoomNights) * 100)),
    // ADR은 "판매된 객실박당 단가" — 판매 박수로 나눠야 객실 수와 무관하게 일정하다
    adr: occNights === 0 ? 0 : Math.round(gross / occNights),
    otaComm: Math.round(otaComm), bookingCount, daysInMonth,
  };
};

export const useDesktopStats = (
  tableChannelFilter = 'All',
  tableNatFilter = 'All',
  tableGuestFilter = 'All',
): DesktopStats => {
  const { bookings, currentYear, currentMonth, settings, properties, channelSettings, selectedDashboardPropertyId } = useStore();
  const getChannelColor = (ch: string) =>
    channelSettings.find(s => s.channel === ch)?.color ?? '#94a3b8';

  return useMemo(() => {
    const activeProp = selectedDashboardPropertyId
      ? (properties.find(p => p.id === selectedDashboardPropertyId) ?? properties?.[0] ?? {})
      : (properties?.[0] ?? {});
    const prop = activeProp;
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
      .filter(b => {
        if (!selectedDashboardPropertyId) return true; // null = 전체
        const bPropId = b.propertyId || firstPropId;
        return !bPropId || bPropId === selectedDashboardPropertyId;
      })
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

    // ── 점유율 분모로 쓸 객실 수 ──────────────────────────────────
    // 특정 숙소를 선택했으면 1개. '전체'면 예약이 하나라도 있는 숙소만 센다
    // (테스트용으로 만들어두고 예약이 없는 숙소가 분모를 부풀리는 것을 막는다).
    const roomCount = selectedDashboardPropertyId
      ? 1
      : Math.max(1, new Set(
          validBookings.map(b => b.propertyId || firstPropId).filter(Boolean),
        ).size);

    const thisMonth = calcMonthStats(validBookings, currentYear, currentMonth, roomCount);
    let lmYear = currentYear, lmMonth = currentMonth - 1;
    if (lmMonth < 0) { lmYear--; lmMonth = 11; }
    const lastMonth = calcMonthStats(validBookings, lmYear, lmMonth, roomCount);

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
      const ms = calcMonthStats(validBookings, currentYear, m, roomCount);
      yearlyGross += ms.gross; yearlyNights += ms.occNights;
    }
    const adrYearAvg = yearlyNights === 0 ? 0 : Math.round(yearlyGross / yearlyNights);

    let ytdGross = 0, ytdNet = 0, ytdOtaCommission = 0;
    for (let m = 0; m <= currentMonth; m++) {
      const ms = calcMonthStats(validBookings, currentYear, m, roomCount);
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
    // 반드시 완료된 과거 달만 샘플링 — 미래/현재 달 OTB를 역사 데이터로 오인하지 않도록
    const computeRecentAvgOcc = (exceptYear: number, exceptMonth: number): number => {
      const samples: number[] = [];
      for (let offset = 1; offset <= 18 && samples.length < 6; offset++) {
        let py = exceptYear, pm = exceptMonth - offset;
        while (pm < 0) { pm += 12; py--; }
        // 미래 또는 현재 진행 중인 달은 제외 (OTB를 완료 점유율로 착각하는 버그 방지)
        if (py > actualTodayYear || (py === actualTodayYear && pm >= actualTodayMonth)) continue;
        const past = calcMonthStats(validBookings, py, pm, roomCount);
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

        const hms = calcMonthStats(validBookings, hy, hm, roomCount);
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

    // ── 예측: 픽업6 (Pickup-6) ───────────────────────────────────────────
    // 예상 점유율 = 현재 OTB + "최근 달들이 같은 시점에서 월말까지 추가로 채운 폭"의 평균.
    //
    //   F = OTB + mean( 최종점유율_h − 같은시점OTB_h ),
    //   h = 대상월 직전 6개 달력월 중 완료됐고 예약이 충분한(≥3건) 달
    //
    // 2026-09 백테스트(실데이터 301건 · 완료 15개월 · 프로브 174개 + 일단위 2,242개 시점)
    // 에서 이전 방식(페이스 예측 + STLY 동적가중 + 편향보정 커브, MAE 12.8%p)을
    // 7.8%p로 크게 앞섰다. 곱셈 픽업·STLY 앵커·감쇠가중·중앙값 등 20여 개 후보 중
    // 최고 정확도이면서 수식이 가장 단순했다. 설계 근거·재검증 방법: FORECAST.md
    //
    // 유의:
    // - 윈도는 "대상월 직전 6개 달력월 ∩ 완료된 달"이다. 먼 미래 달일수록 표본이
    //   3~4개로 줄어드는 구조인데, 백테스트에서 "무조건 최근 완료 6개달"보다 이 방식이
    //   먼 지평(D-60~120)에서 명확히 정확했다(MAE 22.1 → 17.7%p). 바꾸지 말 것.
    // - 이전의 편향 보정 커브(biasCurve)와 인라인 복사본 공식은 이 방식으로 대체·제거됨.
    //   "공식이 두 곳에 있다" 규칙은 더 이상 해당 없음 — 예측 공식은 여기 한 곳뿐이다.
    const PICKUP_WINDOW_MONTHS = 6;

    const computeForecast = (ty: number, tm: number, otb: MonthStats) => {
      const daysInMonth = new Date(ty, tm + 1, 0).getDate();
      const monthStartMs = new Date(ty, tm, 1).getTime();

      // 관측 시점: 달 시작 전이면 D일 전(probeOffset = -D), 진행 중이면 경과 e일(+e)
      const daysUntilStart = monthStartMs > todayMs
        ? Math.floor((monthStartMs - todayMs) / 86400000)
        : 0;
      const elapsed = monthStartMs > todayMs
        ? 0
        : Math.min(daysInMonth, Math.floor((todayMs - monthStartMs) / 86400000));
      const probeOffset = daysUntilStart > 0 ? -daysUntilStart : elapsed;

      // 히스토리 각 달의 "같은 시점 OTB → 최종" 잔여픽업을 수집
      const targetKey = ty * 12 + tm;
      const pickups: number[] = [];
      for (let hk = targetKey - PICKUP_WINDOW_MONTHS; hk < targetKey; hk++) {
        const hy = Math.floor(hk / 12), hm = hk % 12;
        const hDays = new Date(hy, hm + 1, 0).getDate();
        if (new Date(hy, hm + 1, 1).getTime() > todayMs) continue;   // 아직 완료되지 않은 달
        const hms = calcMonthStats(validBookings, hy, hm, roomCount);
        if (hms.bookingCount < MIN_RELIABLE_BOOKINGS) continue;      // 표본 부족한 달은 제외
        if (probeOffset > 0 && probeOffset >= hDays) { pickups.push(0); continue; } // 그 시점엔 이미 마감

        // 같은 시점까지 접수됐던 예약만으로 그때의 OTB를 재현.
        // 기준 시각은 정오(T12) — bookingDate가 T12로 파싱되므로 자정 기준을 쓰면
        // 경계일에 접수된 예약이 통째로 빠진다.
        const cutoff = new Date(hy, hm, 1, 12, 0, 0).getTime() + probeOffset * 86400000;
        let nights = 0;
        validBookings.forEach(b => {
          // 접수일이 없거나 체크인보다 늦게 기록된 이상치는 체크인일로 간주
          // (체크인 시점에는 그 예약이 확실히 존재했으므로 안전한 하한)
          const ciMs = new Date(b.checkIn + 'T12:00:00').getTime();
          const bdMs = b.bookingDate
            ? Math.min(new Date(b.bookingDate + 'T12:00:00').getTime(), ciMs)
            : ciMs;
          if (bdMs > cutoff) return;
          nights += getOverlapNights(b.checkIn, b.checkOut, hy, hm);
        });
        const otbThen = Math.min(100, Math.round((nights / (hDays * Math.max(1, roomCount))) * 100));
        pickups.push(hms.occupancy - otbThen);
      }

      const expectedPickup = pickups.length > 0
        ? pickups.reduce((s, v) => s + v, 0) / pickups.length
        : null;

      let predictedOcc: number;
      if (expectedPickup != null) {
        predictedOcc = Math.round(otb.occupancy + expectedPickup);
      } else {
        // 완료된 히스토리가 하나도 없는 오픈 직후: 최근 평균 최종 점유율로 잔여 유입을 근사
        const rec = computeRecentAvgOcc(ty, tm);
        const cc = daysUntilStart > 0
          ? Math.exp(-daysUntilStart / estimatedTau)
          : Math.max(1, elapsed) / daysInMonth;
        predictedOcc = Math.round(otb.occupancy + rec * (1 - cc));
      }
      predictedOcc = Math.max(otb.occupancy, Math.min(100, predictedOcc));

      // 진행 중인 달: 이미 지나간 공실 날짜는 복구 불가 → 물리적 달성 상한 적용
      // maxAchievableOcc = (지나간 날 중 점유된 박 수 + 남은 일수) / 월 총 일수
      if (daysUntilStart === 0 && elapsed > 0) {
        const todayCutoff = new Date(actualTodayYear, actualTodayMonth, _today.getDate(), 12, 0, 0);
        const mStart = new Date(ty, tm, 1, 12, 0, 0);
        const pastOccDates = new Set<string>();
        validBookings.forEach(b => {
          const bStart = new Date(b.checkIn + 'T12:00:00');
          const bEnd = new Date(b.checkOut + 'T12:00:00');
          const overlapStart = bStart > mStart ? bStart : mStart;
          const overlapEnd = bEnd < todayCutoff ? bEnd : todayCutoff;
          if (overlapStart >= overlapEnd) return;
          const cur = new Date(overlapStart);
          while (cur < overlapEnd) {
            pastOccDates.add(`${cur.getFullYear()}-${cur.getMonth()}-${cur.getDate()}`);
            cur.setDate(cur.getDate() + 1);
          }
        });
        const maxAchievableOcc = Math.min(100,
          Math.round(((pastOccDates.size + (daysInMonth - elapsed)) / daysInMonth) * 100));
        predictedOcc = Math.min(predictedOcc, maxAchievableOcc);
      }

      // ── 매출 환산(기존 방식 유지): ADR은 작년 같은 달 → 현재 OTB → 기본요금 순
      const stly = calcMonthStats(validBookings, ty - 1, tm, roomCount);
      const stlyIsRampUp = ((ty - 1) * 12 + tm) <= openingPeriodEndKey;
      const stlyReliable = !stlyIsRampUp && stly.bookingCount >= MIN_RELIABLE_BOOKINGS;
      const predictedAdr = stlyReliable && stly.adr > 0 ? stly.adr
        : otb.adr > 0 ? otb.adr
        : basePricePerNight;
      const predictedOccNights = Math.round((predictedOcc / 100) * daysInMonth);
      const predictedGross = Math.round(predictedOccNights * predictedAdr);
      const commRate = otb.gross > 0 ? Math.max(0, Math.min(0.3, (otb.gross - otb.net) / otb.gross)) : 0.12;
      const predictedNet = Math.round(predictedGross * (1 - commRate));

      // ── 신뢰도: 데이터 충실도(히스토리 달 수) 40% + 시간 근접도 60%
      const dataScore = Math.min(1, pickups.length / 4);
      const timeScore = Math.exp(-daysUntilStart / estimatedTau);
      let forecastConfidence = Math.round((0.4 * dataScore + 0.6 * timeScore) * 100) / 100;

      // 예약 리드타임 실측: 중앙값 31일, D-90 이전 접수 17%, D-180 이전 3%.
      // 즉 먼 미래 달은 "아직 안 팔린" 것이 아니라 "팔릴 시기가 오지 않은" 것이라
      // 판단 근거 자체가 없다. 이 구간 예측은 신뢰도를 크게 낮춰 참고용임을 드러낸다.
      if (daysUntilStart > FORECAST_RELIABLE_HORIZON_DAYS) {
        const excess = daysUntilStart - FORECAST_RELIABLE_HORIZON_DAYS;
        forecastConfidence = Math.round(
          forecastConfidence * Math.max(0.15, Math.exp(-excess / 120)) * 100,
        ) / 100;
      }

      return {
        predictedOcc, predictedGross, predictedNet, forecastConfidence,
        expectedPickup: expectedPickup != null ? Math.round(expectedPickup) : null,
        histMonthsUsed: pickups.length,
      };
    };

    const monthlyTrends: MonthlyTrend[] = [];
    for (let i = -5; i <= 5; i++) {
      let ty = currentYear, tm = currentMonth + i;
      while (tm < 0) { tm += 12; ty--; }
      while (tm > 11) { tm -= 12; ty++; }
      const isFuture = i > 0;
      const isCurrent = i === 0;
      const ms = calcMonthStats(validBookings, ty, tm, roomCount);

      let predictedOcc: number | null = null;
      let predictedGross: number | null = null;
      let predictedNet: number | null = null;
      let forecastConfidence = 0;
      let expectedPickup: number | null = null;
      let histMonthsUsed = 0;

      // 예측은 선택 월 기준이 아닌 실제 오늘 기준으로 실행 (선택 월이 7월이어도 5~6월 예측 데이터 유지)
      const isActualCurrentOrFuture = ty > actualTodayYear || (ty === actualTodayYear && tm >= actualTodayMonth);
      if (isActualCurrentOrFuture) {
        const fc = computeForecast(ty, tm, ms);
        predictedOcc = fc.predictedOcc;
        predictedGross = fc.predictedGross;
        predictedNet = fc.predictedNet;
        forecastConfidence = fc.forecastConfidence;
        expectedPickup = fc.expectedPickup;
        histMonthsUsed = fc.histMonthsUsed;
      }

      // 팝오버의 "같은 시점(D-N)" 표기용
      const monthStartMs = new Date(ty, tm, 1).getTime();
      const daysUntilStart = monthStartMs > todayMs
        ? Math.floor((monthStartMs - todayMs) / 86400000)
        : 0;

      monthlyTrends.push({
        month: MONTH_LABELS[tm], monthEn: MONTH_LABELS_EN[tm], year: ty,
        gross: ms.gross, net: ms.net, adr: ms.adr, occupancy: ms.occupancy,
        isCurrent, isFuture,
        otbOcc: ms.occupancy, otbGross: ms.gross,
        predictedOcc, predictedGross, predictedNet, forecastConfidence,
        expectedPickup, histMonthsUsed, daysUntilStart,
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
      const ms = calcMonthStats(validBookings, currentYear, m, roomCount);
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
      
      const ms = calcMonthStats(validBookings, currentYear, m, roomCount);
      const msLY = calcMonthStats(validBookings, currentYear - 1, m, roomCount);
      
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
      .map(ch => ({ name: ch, value: Math.round((channelCounts[ch] / totalChannelBookings) * 100), count: channelCounts[ch], color: getChannelColor(ch) }))
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
          .map(ch => ({ name: ch, value: Math.round((allTimeChanCounts[ch] / allTimeTotalCount) * 100), count: allTimeChanCounts[ch], color: getChannelColor(ch) }))
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
        const ms = calcMonthStats(tableBookings, y, m, roomCount);
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

        const unfilteredMs = calcMonthStats(validBookings, y, m, roomCount);
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
  }, [bookings, currentYear, currentMonth, settings?.currency, properties, tableChannelFilter, tableNatFilter, tableGuestFilter, selectedDashboardPropertyId, channelSettings]);
};
