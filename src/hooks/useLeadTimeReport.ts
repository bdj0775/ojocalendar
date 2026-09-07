import { useMemo } from 'react';
import { useStore } from '../store/useStore';

export const LEAD_TIME_BUCKET_DEFS = [
  { key: 'lastMinute', label: '초단기 (0~7일)',   labelEn: 'Last-min (0–7d)',    min: 0,  max: 7,        color: 'var(--destructive)' },
  { key: 'short',      label: '단기 (8~21일)',     labelEn: 'Short (8–21d)',       min: 8,  max: 21,       color: 'var(--warning)' },
  { key: 'mid',        label: '중단기 (22~60일)',  labelEn: 'Mid (22–60d)',        min: 22, max: 60,       color: 'var(--primary)' },
  { key: 'preEarly',   label: '준얼리 (61~90일)', labelEn: 'Pre-early (61–90d)',  min: 61, max: 90,       color: 'var(--accent-foreground)' },
  { key: 'early',      label: '얼리버드 (91일+)', labelEn: 'Early bird (91d+)',   min: 91, max: Infinity, color: 'var(--success)' },
] as const;

/** 히스토그램 구간 (일). 마지막은 상한 없음 */
export const HISTOGRAM_BINS = [0, 7, 14, 21, 30, 45, 60, 90, 120, 180] as const;

/**
 * 기준선(비교 잣대)에 쓸 "완료된 달" 수.
 *
 * 2026-09 실측으로 결정. "직전 N개월 중앙값으로 다음 달 중앙값 맞히기"를
 * 워크포워드 백테스트한 결과 (완료 15개월 · 12개 시점):
 *   N=3   MAE 21.0일 · 달마다 변동 8.8일  (표본이 적어 크게 출렁임)
 *   N=6   MAE 18.3일 · 변동 4.1일
 *   N=9   MAE 17.2일 · 변동 3.3일   ← 채택
 *   N=12  MAE 17.0일 · 변동 3.0일  (9와 사실상 동률이나 오픈 초기를 오래 물고 감)
 *
 * 9와 12가 동률이라 최신 추세를 더 반영하는 9를 택했다.
 *
 * 참고: 어느 N을 써도 편향이 -6일 안팎이다. 이 숙소는 리드타임이 길어지는
 * 추세(25년 20일대 → 26년 40일대)라 과거 기준선이 구조적으로 낮게 나온다.
 * 기준선은 "예측값"이 아니라 "비교 잣대"이므로 보정하지 않고 그대로 둔다.
 */
const BASELINE_MONTHS = 9;
/** 이 건수 미만인 달은 통계에서 제외 (우연 방지) */
const MIN_MONTH_BOOKINGS = 3;

export interface LeadTimeBucket {
  key: string;
  label: string;
  labelEn: string;
  count: number;
  pct: number;
  color: string;
}

export interface LeadTimeGroupStat {
  key: string;
  count: number;
  median: number;
  avg: number;
  p90: number;
}

export interface LeadTimeMonthPoint {
  year: number;
  month: number;
  label: string;
  count: number;
  median: number;
  avg: number;
  /** 그 달이 이미 지났는가 — false면 아직 예약이 더 들어올 수 있어 리드타임이 과대 */
  isComplete: boolean;
}

export interface LeadTimeReport {
  scatterData: Array<{
    x: number; y: number; nights: number;
    channel: string; nationality: string; guests: number; guestName: string;
  }>;
  startX: number;
  endX: number;
  natKeys: string[];
  /** 선택 월 예약 기준 구간 비중 */
  currentMonthBuckets: LeadTimeBucket[];
  currentMonthTotal: number;
  currentMonthAvgDays: number;
  /** 선택 월 중앙값 */
  currentMonthMedian: number;
  /** 선택 월이 이미 끝났는가. false면 "집계 중"으로 표시해야 한다 */
  currentMonthIsComplete: boolean;

  /** ── 기준선: 완료된 최근 6개월 (생존 편향 없음) ── */
  baselineMedian: number;
  baselineAvg: number;
  baselineP90: number;
  baselineTotal: number;
  /** 기준선에 포함된 달 수 */
  baselineMonths: number;
  baselineBuckets: LeadTimeBucket[];

  /** 전체 기간(윈도 무관, 완료된 달) 기준 구간 비중 — 비교용 */
  buckets: LeadTimeBucket[];
  totalBookings: number;
  overallAvgDays: number;
  overallMedian: number;

  /** 히스토그램 (완료된 달 전체) */
  histogram: Array<{ label: string; labelEn: string; count: number; pct: number }>;
  /** 채널·국적·인원별 통계 (완료된 달 기준) */
  byChannel: LeadTimeGroupStat[];
  byNationality: LeadTimeGroupStat[];
  byGuests: LeadTimeGroupStat[];
  /** 체크인 월별 추이 (미완료 달 포함, isComplete로 구분) */
  monthlyTrend: LeadTimeMonthPoint[];

  /** 하위 호환 (기존 카드가 참조) */
  avgChannel: Array<{ key: string; avg: number }>;
  avgNat: Array<{ key: string; avg: number }>;
  avgGuest: Array<{ key: string; avg: number }>;
}

const median = (arr: number[]): number => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return Math.round(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2);
};
const mean = (arr: number[]): number =>
  arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
const percentile = (arr: number[], p: number): number => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))];
};

export const useLeadTimeReport = (): LeadTimeReport => {
  const { bookings, properties, currentYear, currentMonth, selectedDashboardPropertyId } = useStore();

  return useMemo(() => {
    const startX = new Date(currentYear, currentMonth - 8, 1).getTime();
    const endX   = new Date(currentYear, currentMonth + 3, 0, 23, 59, 59).getTime();

    const today = new Date();
    const todayMs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

    const firstPropId = properties[0]?.id;
    const validBookings = bookings
      // 대시보드에서 선택한 숙소 기준 (미선택 시 전체)
      .filter(b => {
        if (!selectedDashboardPropertyId) return true;
        const pid = b.propertyId || firstPropId;
        return !pid || pid === selectedDashboardPropertyId;
      })
      .filter(b => b.status === 'confirmed' || b.status === 'checked in' || b.status === 'completed');

    /** 리드타임(일). 접수일이 없으면 null — 통계에서 제외한다 */
    const leadOf = (b: { checkIn: string; bookingDate?: string | null }): number | null => {
      if (!b.bookingDate) return null;
      const ci = new Date(b.checkIn + 'T12:00:00').getTime();
      const bd = new Date(b.bookingDate + 'T12:00:00').getTime();
      return Math.max(0, Math.round((ci - bd) / 86400000));
    };
    /** 그 달이 이미 끝났는가 */
    const monthComplete = (y: number, m: number) =>
      new Date(y, m + 1, 1).getTime() <= todayMs;

    // ── 체크인 월별 그룹핑 ──────────────────────────────────────
    type Rec = { lead: number; channel: string; nat: string; guestKey: string };
    const byMonthKey = new Map<number, Rec[]>();
    const allNats = new Set<string>();

    validBookings.forEach(b => {
      const lead = leadOf(b);
      if (lead == null) return;
      const d = new Date(b.checkIn + 'T12:00:00');
      const key = d.getFullYear() * 12 + d.getMonth();
      const nat = (b.nationality || '').trim() || 'Unknown';
      const g = b.guests || 2;
      allNats.add(nat);
      const rec: Rec = {
        lead,
        channel: (b.channel || '').trim() || 'Direct',
        nat,
        guestKey: g >= 5 ? '5+' : `${g}`,
      };
      if (!byMonthKey.has(key)) byMonthKey.set(key, []);
      byMonthKey.get(key)!.push(rec);
    });

    const sortedKeys = [...byMonthKey.keys()].sort((a, b) => a - b);

    // ── 월별 추이 (미완료 달 포함) ──────────────────────────────
    const monthlyTrend: LeadTimeMonthPoint[] = sortedKeys.map(k => {
      const y = Math.floor(k / 12), m = k % 12;
      const leads = byMonthKey.get(k)!.map(r => r.lead);
      return {
        year: y, month: m,
        label: `${String(y).slice(-2)}.${String(m + 1).padStart(2, '0')}`,
        count: leads.length,
        median: median(leads),
        avg: mean(leads),
        isComplete: monthComplete(y, m),
      };
    });

    // ── 완료된 달만 모은 표본 (편향 없는 통계의 기반) ────────────
    const completeKeys = sortedKeys.filter(k => {
      const y = Math.floor(k / 12), m = k % 12;
      return monthComplete(y, m) && byMonthKey.get(k)!.length >= MIN_MONTH_BOOKINGS;
    });
    const completeRecs: Rec[] = completeKeys.flatMap(k => byMonthKey.get(k)!);
    const completeLeads = completeRecs.map(r => r.lead);

    // 기준선 = "보고 있는 달 직전"의 완료된 N개월.
    // 선택 월을 따라 움직여야 그 달을 그 시점의 정상 범위와 비교하게 된다.
    // (오늘 기준으로 고정하면 7월을 봐도 12월을 봐도 같은 값이 나와 비교가 무의미)
    const selectedKey = currentYear * 12 + currentMonth;
    const priorKeys = completeKeys.filter(k => k < selectedKey);
    // 오픈 직후처럼 앞선 완료 달이 없으면 가장 이른 완료 달들로 대신한다
    // (빈 기준선을 보여주느니 "가장 가까운 참고치"라도 주는 편이 낫다)
    const baselineKeys = priorKeys.length > 0
      ? priorKeys.slice(-BASELINE_MONTHS)
      : completeKeys.slice(0, BASELINE_MONTHS);
    const baselineRecs: Rec[] = baselineKeys.flatMap(k => byMonthKey.get(k)!);
    const baselineLeads = baselineRecs.map(r => r.lead);

    const toBuckets = (leads: number[]): LeadTimeBucket[] => {
      const counts = LEAD_TIME_BUCKET_DEFS.map(() => 0);
      leads.forEach(L => {
        const i = LEAD_TIME_BUCKET_DEFS.findIndex(d => L >= d.min && L <= d.max);
        if (i >= 0) counts[i]++;
      });
      return LEAD_TIME_BUCKET_DEFS.map((def, i) => ({
        key: def.key, label: def.label, labelEn: def.labelEn,
        count: counts[i],
        pct: leads.length ? Math.round((counts[i] / leads.length) * 100) : 0,
        color: def.color,
      }));
    };

    // ── 히스토그램 (완료된 달 전체) ─────────────────────────────
    const histogram = HISTOGRAM_BINS.map((from, i) => {
      const to = HISTOGRAM_BINS[i + 1];
      const count = completeLeads.filter(L => (to == null ? L >= from : L >= from && L < to)).length;
      return {
        label: to == null ? `${from}일+` : `${from}~${to - 1}일`,
        labelEn: to == null ? `${from}d+` : `${from}–${to - 1}d`,
        count,
        pct: completeLeads.length ? Math.round((count / completeLeads.length) * 100) : 0,
      };
    });

    // ── 그룹별 통계 (완료된 달 기준) ────────────────────────────
    const groupStats = (pick: (r: Rec) => string): LeadTimeGroupStat[] => {
      const dict = new Map<string, number[]>();
      completeRecs.forEach(r => {
        const k = pick(r);
        if (!dict.has(k)) dict.set(k, []);
        dict.get(k)!.push(r.lead);
      });
      return [...dict.entries()]
        .map(([key, leads]) => ({
          key, count: leads.length,
          median: median(leads), avg: mean(leads), p90: percentile(leads, 0.9),
        }))
        .sort((a, b) => b.count - a.count);
    };
    const byChannel     = groupStats(r => r.channel);
    const byNationality = groupStats(r => r.nat);
    const byGuests      = groupStats(r => r.guestKey).sort((a, b) => a.key.localeCompare(b.key));

    // ── 선택 월 ────────────────────────────────────────────────
    const cmKey = currentYear * 12 + currentMonth;
    const cmLeads = (byMonthKey.get(cmKey) ?? []).map(r => r.lead);

    // ── 산점도 (모달 보조용, 기존 윈도 유지) ────────────────────
    const scatterData = validBookings.map(b => {
      const ciTime = new Date(b.checkIn + 'T12:00:00').getTime();
      if (ciTime < startX || ciTime > endX) return null;
      const lead = leadOf(b);
      if (lead == null) return null;
      const nights = Math.max(1, Math.round(
        (new Date(b.checkOut + 'T12:00:00').getTime() - ciTime) / 86400000,
      ));
      const g = b.guests || 2;
      return {
        x: ciTime, y: Math.min(180, lead), nights,
        channel: (b.channel || '').trim() || 'Direct',
        nationality: (b.nationality || '').trim() || 'Unknown',
        guests: g, guestName: b.guestName || '',
      };
    }).filter((v): v is NonNullable<typeof v> => v !== null);

    return {
      scatterData, startX, endX,
      natKeys: [...allNats],

      currentMonthBuckets: toBuckets(cmLeads),
      currentMonthTotal:   cmLeads.length,
      currentMonthAvgDays: mean(cmLeads),
      currentMonthMedian:  median(cmLeads),
      currentMonthIsComplete: monthComplete(currentYear, currentMonth),

      baselineMedian: median(baselineLeads),
      baselineAvg:    mean(baselineLeads),
      baselineP90:    percentile(baselineLeads, 0.9),
      baselineTotal:  baselineLeads.length,
      baselineMonths: baselineKeys.length,
      baselineBuckets: toBuckets(baselineLeads),

      buckets:        toBuckets(completeLeads),
      totalBookings:  completeLeads.length,
      overallAvgDays: mean(completeLeads),
      overallMedian:  median(completeLeads),

      histogram, byChannel, byNationality, byGuests, monthlyTrend,

      // 하위 호환
      avgChannel: byChannel.map(g => ({ key: g.key, avg: g.avg })),
      avgNat:     byNationality.map(g => ({ key: g.key, avg: g.avg })),
      avgGuest:   byGuests.map(g => ({ key: g.key, avg: g.avg })),
    };
  }, [bookings, properties, currentYear, currentMonth, selectedDashboardPropertyId]);
};
