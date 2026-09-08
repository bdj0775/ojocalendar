import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { isHoliday } from '../utils/holidays';
import type {
  Booking, Property, FillCurve, FillCurvePoint, LastMinuteRadarResult,
  RadarAdvice, RadarDowGroup, RadarRow, RadarStripCell, RadarWindow,
  PricingAction, DecisionRecord,
} from '../types';

/**
 * 빈방 레이더 — "앞으로 3주 안의 빈 날이 그냥 두면 팔릴까"를 내 과거 기록으로 답한다.
 * 기획·용어: PRICING_ROADMAP.md 3~5장. 계산 정의: 같은 문서 9장.
 *
 * 핵심 한 문장:
 *   "지난 1년, D일 전에 비어 있던 (같은 요일 묶음의) 밤 중 결국 팔린 비율" = 팔릴 가능성.
 *
 * 계산은 전부 순수 함수(computeRadar)에 있고 훅은 스토어를 연결만 한다 —
 * radar_backtest.mjs가 실제 코드를 그대로 실행해 검증한다 (FORECAST.md 관례).
 */

const DAY = 86400000;
/** 목록·띠 달력이 보여주는 앞날 수 (4주, "아직 여유"인 날 포함) */
export const RADAR_HORIZON_DAYS = 28;
/** 곡선을 계산하는 최대 D. 지평보다 같거나 커야 한다 */
const CURVE_MAX_D = 28;
/** 이 표본 미만이면 그 D의 가능성을 내지 않는다 */
const MIN_SAMPLE = 10;
/** 결정 시점 = 가능성이 처음 이 값 아래로 떨어지는 D */
const DECISION_THRESHOLD = 50;
/** 할인 검토 여부의 기준선 하나 — 50% (그냥 두면 안 팔릴 확률이 더 높아지는 지점). 나머지는 통계적 확신으로 나눈다 */
const REVIEW_LINE = 50;
/** 이 아래면 확신 여부와 무관하게 적극검토 — "하던 대로 하면 열에 일곱은 안 팔리는 선" (PRICING_ROADMAP 10-5) */
const STRONG_LINE = 30;
/** "그 달 보통 단가보다 이만큼 싸면 할인 판매로 본다" (%) */
const DISCOUNT_MARK = -5;
/** 가격 신호: 과거 임박 거래가 이만큼은 있어야 "현재가 이상 거래 0박"을 근거로 쓴다 */
const PRICE_SIGNAL_MIN_SAMPLE = 8;
/** 임박 판매 단가 기준선에 쓰는 "임박" 정의 (며칠 이내에 팔린 밤) */
const LATE_SALE_DAYS = 7;
/** 기록이 이만큼은 있어야 가능성을 보여준다 */
const MIN_COMPLETED_MONTHS = 3;
const MIN_PRICED_BOOKINGS = 30;

const WINDOW_DAYS: Record<RadarWindow, number> = { '6m': 182, '12m': 365 };
const DOW_KO = ['일', '월', '화', '수', '목', '금', '토'];
const DOW_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const toISO = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};
const parse = (s: string) => new Date(s + 'T12:00:00');
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);

/** 금·토 밤, 또는 다음 날이 공휴일인 밤 → 'weekend' */
const groupOf = (d: Date): RadarDowGroup => {
  const dow = d.getDay();
  if (dow === 5 || dow === 6) return 'weekend';
  return isHoliday(toISO(addDays(d, 1))) ? 'weekend' : 'weekday';
};

/** Wilson 95% 구간 (0~100). n=0이면 null */
const wilson = (sold: number, n: number): [number, number] | null => {
  if (n === 0) return null;
  const z = 1.96;
  const p = sold / n;
  const denom = 1 + (z * z) / n;
  const centre = p + (z * z) / (2 * n);
  const half = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [Math.max(0, ((centre - half) / denom) * 100), Math.min(100, ((centre + half) / denom) * 100)];
};

interface NightRecord {
  key: string;          // propId|date
  date: string;
  group: RadarDowGroup;
  bookingId: string | null;
  /** 팔린 밤이면 접수일→그 밤까지 남은 날수 (≥0). 안 팔린 밤이면 null */
  lead: number | null;
  /** 그 밤의 단가 (금액 있는 단기 예약만). 없으면 null */
  adr: number | null;
  autoSynced: boolean;
}

export interface ComputeRadarOptions {
  today: Date;
  selectedPropertyId: string | null;
  /** 호스트가 남긴 결정 기록. '빼기'는 목록에서 제외되고, 나머지는 행에 붙는다 */
  actions?: PricingAction[];
}

/** 훅이 스토어에서 읽는 것과 같은 규칙으로 유효 예약을 고른다 */
const validStatuses = new Set(['confirmed', 'checked in', 'completed']);

export const computeRadar = (
  bookingsAll: Booking[],
  properties: Property[],
  opts: ComputeRadarOptions,
): LastMinuteRadarResult => {
  const today = new Date(opts.today);
  today.setHours(12, 0, 0, 0);
  const todayISO = toISO(today);

  // ── 범위: 선택 숙소 또는 전체 (useBookingPace와 같은 규칙) ───────────
  const firstPropId = properties[0]?.id ?? null;
  const bookings = bookingsAll
    .filter(b => validStatuses.has(b.status))
    .filter(b => {
      if (!opts.selectedPropertyId) return true;
      const pid = b.propertyId || firstPropId;
      return !pid || pid === opts.selectedPropertyId;
    });

  const scopeProps: Property[] = opts.selectedPropertyId
    ? properties.filter(p => p.id === opts.selectedPropertyId)
    : (() => {
        const withBookings = new Set(bookings.map(b => b.propertyId || firstPropId).filter(Boolean));
        const list = properties.filter(p => withBookings.has(p.id));
        return list.length ? list : properties.slice(0, 1);
      })();
  const propName = (id: string | null) => properties.find(p => p.id === id)?.name ?? '';

  // ── 예약 → 밤 (숙소|날짜 단위). 같은 밤에 예약이 겹치면 가장 일찍 접수된 것 ───
  const soldNights = new Map<string, { lead: number; adr: number | null; autoSynced: boolean; bookingDateMs: number; bookingId: string }>();
  let firstMonth: string | null = null;
  let firstCheckIn: string | null = null;
  let pricedBookings = 0;

  bookings.forEach(b => {
    const ci = parse(b.checkIn);
    const co = parse(b.checkOut);
    const nights = Math.round((co.getTime() - ci.getTime()) / DAY);
    if (nights <= 0) return;
    const pid = b.propertyId || firstPropId;
    const amt = Number(b.amount) || 0;
    if (amt > 0) pricedBookings++;
    const monthKey = b.checkIn.slice(0, 7);
    if (!firstMonth || monthKey < firstMonth) firstMonth = monthKey;
    if (!firstCheckIn || b.checkIn < firstCheckIn) firstCheckIn = b.checkIn;
    // 접수일 정규화: 없거나 체크인보다 늦으면 체크인일 (FORECAST·pace와 동일)
    const bdRaw = b.bookingDate ? parse(b.bookingDate).getTime() : ci.getTime();
    const bdMs = Math.min(bdRaw, ci.getTime());
    const adr = amt > 0 && nights <= 30 ? amt / nights : null;
    for (let i = 0; i < nights; i++) {
      const d = addDays(ci, i);
      const key = `${pid}|${toISO(d)}`;
      const lead = Math.max(0, Math.round((d.getTime() - bdMs) / DAY));
      const prev = soldNights.get(key);
      if (!prev || prev.bookingDateMs > bdMs) {
        soldNights.set(key, { lead, adr, autoSynced: !!b.isAutoSynced, bookingDateMs: bdMs, bookingId: b.id });
      }
    }
  });

  // ── 과거 12개월 밤 목록 (어제까지) ─────────────────────────────────
  // 기록이 12개월 미만이면 첫 예약일부터. 그 전의 날들은 "안 팔린 밤"이 아니라 영업 전이다 —
  // 여기서 잘라내지 않으면 새 사용자의 팔릴 가능성이 크게 낮게 나온다.
  const windowStart = addDays(today, -WINDOW_DAYS['12m']);
  const firstCheckInDate = firstCheckIn ? parse(firstCheckIn as string) : null;
  const historyStart = firstCheckInDate && firstCheckInDate.getTime() > windowStart.getTime() ? firstCheckInDate : windowStart;
  const history: NightRecord[] = [];
  const monthAdr = new Map<string, number[]>();
  for (let t = historyStart.getTime(); t < today.getTime(); t += DAY) {
    const d = new Date(t);
    const iso = toISO(d);
    const g = groupOf(d);
    scopeProps.forEach(p => {
      const s = soldNights.get(`${p.id}|${iso}`);
      history.push({
        key: `${p.id}|${iso}`, date: iso, group: g, bookingId: s?.bookingId ?? null,
        lead: s ? s.lead : null, adr: s?.adr ?? null, autoSynced: s?.autoSynced ?? false,
      });
      if (s?.adr != null) {
        const mk = iso.slice(0, 7);
        if (!monthAdr.has(mk)) monthAdr.set(mk, []);
        monthAdr.get(mk)!.push(s.adr);
      }
    });
  }

  // ── 그 달 보통 단가 (곡선의 거래가 요약과 임박 단가 기준선에 공통으로 쓴다) ──
  const medianOf = (arr: number[]) => {
    const s = [...arr].sort((a, b) => a - b);
    return s.length ? s[Math.floor(s.length / 2)] : 0;
  };
  const monthMedian = new Map<string, number>();
  monthAdr.forEach((arr, mk) => monthMedian.set(mk, medianOf(arr)));

  // ── 곡선 4개: (요일 묶음) × (기간창) ─────────────────────────────────
  const curves: FillCurve[] = [];
  (['weekday', 'weekend'] as RadarDowGroup[]).forEach(group => {
    (['6m', '12m'] as RadarWindow[]).forEach(window => {
      const from = toISO(addDays(today, -WINDOW_DAYS[window]));
      const nights = history.filter(h => h.group === group && h.date >= from);
      const points: FillCurvePoint[] = [];
      for (let D = 0; D <= CURVE_MAX_D; D++) {
        // D일 전에 비어 있던 밤 = 그 뒤에 팔렸거나(lead ≤ D) 끝내 안 팔린 밤
        let n = 0; let sold = 0;
        nights.forEach(h => {
          if (h.lead === null) { n++; return; }
          if (h.lead <= D) { n++; sold++; }
        });
        const ci = n >= MIN_SAMPLE ? wilson(sold, n) : null;
        const soldSamples = nights
          .filter(h => h.lead !== null && h.lead <= D && h.adr !== null)
          .map(h => {
            const med = monthMedian.get(h.date.slice(0, 7)) ?? null;
            const adr = h.adr as number;
            return { date: h.date, dow: parse(h.date).getDay(), bookingId: h.bookingId ?? h.key, adr, lead: h.lead as number, monthMedian: med, pct: med ? Math.round((adr / med - 1) * 100) : null };
          })
          .sort((a, b) => a.adr - b.adr);
        points.push({
          daysBefore: D,
          probability: n >= MIN_SAMPLE ? Math.round((sold / n) * 100) : null,
          n, sold,
          ciLow: ci ? Math.round(ci[0]) : null,
          ciHigh: ci ? Math.round(ci[1]) : null,
          soldSamples,
        });
      }
      // 결정 시점: 먼 D에서 가까운 D로 내려오며 처음 50% 아래로 떨어지는 D
      let decisionDay: number | null = null;
      for (let D = CURVE_MAX_D; D >= 0; D--) {
        const p = points[D].probability;
        if (p !== null && p < DECISION_THRESHOLD) { decisionDay = D; break; }
        // 아직 50% 위인데 더 가까운 D에 데이터가 없으면 여기서 멈춤 (null 유지)
      }
      curves.push({ group, window, points, decisionDay, totalNights: nights.length });
    });
  });
  const curveOf = (g: RadarDowGroup, w: RadarWindow) => curves.find(c => c.group === g && c.window === w)!;

  /** 표본이 충분한 창을 골라 D의 가능성을 읽는다 (6개월 우선) */
  const lookup = (g: RadarDowGroup, D: number) => {
    const Dc = Math.min(CURVE_MAX_D, Math.max(0, D));
    for (const w of ['6m', '12m'] as RadarWindow[]) {
      const pt = curveOf(g, w).points[Dc];
      if (pt.probability !== null) return { pt, window: w, decisionDay: curveOf(g, w).decisionDay };
    }
    return { pt: curveOf(g, '12m').points[Dc], window: null as RadarWindow | null, decisionDay: curveOf(g, '12m').decisionDay };
  };

  // ── 데이터 품질 ─────────────────────────────────────────────────────
  const completedMonths = (() => {
    if (!firstMonth) return 0;
    const [fy, fm] = (firstMonth as string).split('-').map(Number);
    const months = (today.getFullYear() - fy) * 12 + (today.getMonth() + 1 - fm);
    return Math.max(0, months);
  })();
  const soldHistory = history.filter(h => h.lead !== null);
  const autoSyncedShare = soldHistory.length
    ? Math.round((soldHistory.filter(h => h.autoSynced).length / soldHistory.length) * 100)
    : 0;
  const enough = completedMonths >= MIN_COMPLETED_MONTHS && pricedBookings >= MIN_PRICED_BOOKINGS;

  // ── 임박 판매 단가: 7일 이내 팔린 밤 단가 ÷ 그 달 보통 단가 ────────────
  const latePoints: number[] = [];
  history.forEach(h => {
    if (h.lead === null || h.lead > LATE_SALE_DAYS || h.adr === null) return;
    const med = monthMedian.get(h.date.slice(0, 7));
    if (!med) return;
    latePoints.push(Math.round((h.adr / med - 1) * 100));
  });
  const lateAvg = latePoints.length ? Math.round(latePoints.reduce((a, b) => a + b, 0) / latePoints.length) : null;

  // ── 앞으로 3주: 빈 밤 행 + 띠 달력 ─────────────────────────────────
  const rows: RadarRow[] = [];
  const strip: RadarStripCell[] = [];
  const isBooked = (pid: string, iso: string) => soldNights.has(`${pid}|${iso}`);
  const actionByKey = new Map<string, PricingAction>();
  (opts.actions ?? []).forEach(a => actionByKey.set(`${a.propertyId ?? firstPropId}|${a.stayDate}`, a));

  const adviceRank: Record<RadarAdvice, number> = { unknown: 0, easy: 1, watch: 2, review: 3, strong: 4 };
  /** 설정의 기본/주말 요금 — NewBooking과 같은 규칙(금·토 또는 공휴일 당일은 주말 요금) */
  const currentPriceOf = (prop: Property, d: Date, iso: string) => {
    const dow = d.getDay();
    const weekendLike = dow === 5 || dow === 6 || isHoliday(iso);
    const v = weekendLike ? (prop.weekendPrice || prop.basePrice) : prop.basePrice;
    return v > 0 ? v : null;
  };

  for (let D = 0; D < RADAR_HORIZON_DAYS; D++) {
    const d = addDays(today, D);
    const iso = toISO(d);
    const dow = d.getDay();
    const g = groupOf(d);
    const holidayEve = g === 'weekend' && dow !== 5 && dow !== 6;
    let emptyCount = 0;
    let excludedCount = 0;
    let cellAdvice: RadarAdvice | null = null;

    scopeProps.forEach(prop => {
      if (isBooked(prop.id, iso)) return;
      const act = actionByKey.get(`${prop.id}|${iso}`) ?? null;
      // '이 날은 빼기'(휴무 등)는 빈 날로 세지 않는다
      if (act?.action === 'exclude') { excludedCount++; return; }
      emptyCount++;

      const { pt, window, decisionDay } = enough ? lookup(g, D) : { pt: null, window: null, decisionDay: null };
      const p = pt?.probability ?? null;
      const beforeDecision = decisionDay === null ? true : D > decisionDay;

      // 50% 선 하나 + 통계적 확신 → 4단계 (types.ts RadarAdvice 주석 참조)
      let advice: RadarAdvice = 'unknown';
      if (p !== null && pt && pt.ciLow !== null && pt.ciHigh !== null) {
        advice = pt.ciLow >= REVIEW_LINE ? 'easy'
          : p >= REVIEW_LINE ? 'watch'
          : (p < STRONG_LINE || pt.ciHigh < REVIEW_LINE) ? 'strong'
          : 'review';
      }

      const currentPrice = currentPriceOf(prop, d, iso);
      // 가격 신호 — 가능성은 "하던 대로(임박 할인 포함) 했을 때"의 값이다. 지금 가격이
      // 과거 임박 거래가 전부보다 높으면 그 가능성을 그대로 기대할 근거가 없다.
      // 효과 크기를 주장하지 않고 "이 가격 이상 팔린 전례가 없다"는 사실만 쓴다.
      const priceSamples = pt?.soldSamples ?? [];
      const soldAtCurrentPrice = currentPrice !== null && priceSamples.length >= PRICE_SIGNAL_MIN_SAMPLE
        ? priceSamples.filter(x => x.adr >= currentPrice).length
        : null;
      const priceOutOfRange = soldAtCurrentPrice === 0;
      // 최대 한 단계, 검토까지만 (적극검토는 가능성이 이미 50% 미만일 때만)
      if (priceOutOfRange && (advice === 'easy' || advice === 'watch')) advice = 'review';

      const needsAction = advice === 'review' || advice === 'strong';
      const soldPrices = (() => {
        const list = pt?.soldSamples ?? [];
        if (!list.length) return null;
        const adrs = list.map(x => x.adr);
        return {
          count: list.length,
          median: Math.round(medianOf(adrs)),
          min: Math.round(Math.min(...adrs)),
          max: Math.round(Math.max(...adrs)),
          discounted: list.filter(x => x.pct !== null && x.pct <= DISCOUNT_MARK).length,
          atOrAbove: list.filter(x => x.pct !== null && x.pct >= 0).length,
          samples: list,
        };
      })();
      // 띠 달력 색은 "지금 판단이 필요한" 칸에만 — 여유 있는 빈 칸은 테두리만
      if (needsAction && (!cellAdvice || adviceRank[advice] > adviceRank[cellAdvice])) cellAdvice = advice;

      // 이유 한 줄
      const gLabelKo = g === 'weekend' ? (holidayEve ? '공휴일 전날' : '금·토') : '일~목';
      const gLabelEn = g === 'weekend' ? (holidayEve ? 'holiday eve' : 'Fri/Sat') : 'Sun–Thu';
      const winKo = window === '6m' ? '최근 6개월' : window === '12m' ? '최근 1년' : '';
      const winEn = window === '6m' ? 'last 6 months' : window === '12m' ? 'last 12 months' : '';
      const dKo = D === 0 ? '당일에' : `${D}일 남았을 때`;
      const dEn = D === 0 ? 'on the day' : `${D} day${D > 1 ? 's' : ''} out`;
      const parts: string[] = [];
      const partsEn: string[] = [];
      if (p !== null && pt) {
        // "지난 1년, N일 남은 금·토 공실은 N% 확률로 팔렸어요 (총 N개 중 N박 임박예약 성공)"
        const dLeftKo = D === 0 ? '당일' : `${D}일 남은`;
        parts.push(`${winKo}, ${dLeftKo} ${gLabelKo} 공실은 ${p}% 확률로 팔렸어요 (총 ${pt.n}개 중 ${pt.sold}박 임박예약 성공)`);
        partsEn.push(`Over the ${winEn}, ${gLabelEn} nights still empty ${dEn} sold ${p}% of the time (${pt.sold} of ${pt.n})`);
        if (priceOutOfRange && soldPrices) {
          parts.push(`임박에 팔린 ${soldPrices.count}박은 모두 지금 가격보다 낮았어요`);
          partsEn.push(`All ${soldPrices.count} late bookings went below your current price`);
        }
      } else if (!enough) {
        parts.push('아직 기록이 적어 가능성을 계산할 수 없어요');
        partsEn.push('Not enough history yet to estimate');
      } else {
        parts.push(`${gLabelKo} · ${dKo}의 표본이 적어요 (${pt?.n ?? 0}박)`);
        partsEn.push(`${gLabelEn} · too few samples ${dEn} (${pt?.n ?? 0} nights)`);
      }

      rows.push({
        date: iso, dow, daysBefore: D,
        propertyId: prop.id, propertyName: propName(prop.id),
        group: g, isHolidayEve: holidayEve,
        probability: p, ciLow: pt?.ciLow ?? null, ciHigh: pt?.ciHigh ?? null, n: pt?.n ?? 0, sold: pt?.sold ?? 0,
        windowUsed: window, decisionDay, beforeDecision, needsAction, advice, action: act,
        currentPrice, soldPrices, soldAtCurrentPrice, priceOutOfRange,
        reason: parts.join(' · '), reasonEn: partsEn.join(' · '),
      });
    });

    strip.push({ date: iso, dow, daysBefore: D, emptyCount, totalCount: scopeProps.length, advice: cellAdvice, excludedCount });
  }

  // ── 지난 결정이 맞았나: 결정 대상 밤이 지났으면 팔렸는지 + 단가 ────
  const decisionHistory: DecisionRecord[] = (opts.actions ?? [])
    .filter(a => a.action !== 'exclude')
    .filter(a => !opts.selectedPropertyId || (a.propertyId ?? firstPropId) === opts.selectedPropertyId)
    .map(a => {
      const key = `${a.propertyId ?? firstPropId}|${a.stayDate}`;
      if (a.stayDate >= todayISO) return { action: a, outcome: 'pending' as const, adrPct: null };
      const s = soldNights.get(key);
      if (!s) return { action: a, outcome: 'unsold' as const, adrPct: null };
      const med = monthMedian.get(a.stayDate.slice(0, 7));
      const adrPct = s.adr != null && med ? Math.round((s.adr / med - 1) * 100) : null;
      return { action: a, outcome: 'sold' as const, adrPct };
    })
    .sort((x, y) => y.action.stayDate.localeCompare(x.action.stayDate));

  const decisionDayOf = (g: RadarDowGroup) => {
    const six = curveOf(g, '6m');
    const twelve = curveOf(g, '12m');
    // 6개월 곡선이 근거를 낼 만큼(어느 D든 표본 충족) 있으면 6개월, 아니면 12개월
    const usable = six.points.some(pt => pt.probability !== null) ? six : twelve;
    return usable.decisionDay;
  };

  return {
    today: todayISO,
    horizonDays: RADAR_HORIZON_DAYS,
    rows,
    strip,
    summary: {
      emptyNights: rows.length,
      needsAction: rows.filter(r => r.needsAction).length,
      decisionDay: { weekday: decisionDayOf('weekday'), weekend: decisionDayOf('weekend') },
    },
    curves,
    lateSale: { avgPct: lateAvg, n: latePoints.length, points: latePoints },
    decisionHistory,
    dataQuality: { completedMonths, pricedBookings, autoSyncedShare, enough, firstMonth },
  };
};

/** 표시용 요일 라벨 */
export const radarDowLabel = (dow: number, ko: boolean) => (ko ? DOW_KO[dow] : DOW_EN[dow]);

export const useLastMinuteRadar = (): LastMinuteRadarResult => {
  const { bookings, properties, selectedDashboardPropertyId, pricingActions } = useStore();
  return useMemo(
    () => computeRadar(bookings, properties, {
      today: new Date(), selectedPropertyId: selectedDashboardPropertyId, actions: pricingActions,
    }),
    [bookings, properties, selectedDashboardPropertyId, pricingActions],
  );
};
