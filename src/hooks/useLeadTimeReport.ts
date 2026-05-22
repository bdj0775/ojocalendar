import { useMemo } from 'react';
import { useStore } from '../store/useStore';

export const LEAD_TIME_BUCKET_DEFS = [
  { key: 'lastMinute', label: '초단기 (0~7일)',   labelEn: 'Last-min (0–7d)',    min: 0,  max: 7,        color: 'var(--destructive)' },
  { key: 'short',      label: '단기 (8~21일)',     labelEn: 'Short (8–21d)',       min: 8,  max: 21,       color: 'var(--warning)' },
  { key: 'mid',        label: '중단기 (22~60일)',  labelEn: 'Mid (22–60d)',        min: 22, max: 60,       color: 'var(--primary)' },
  { key: 'preEarly',   label: '준얼리 (61~90일)', labelEn: 'Pre-early (61–90d)',  min: 61, max: 90,       color: 'var(--accent-foreground)' },
  { key: 'early',      label: '얼리버드 (91일+)', labelEn: 'Early bird (91d+)',   min: 91, max: Infinity, color: 'var(--success)' },
] as const;

export interface LeadTimeBucket {
  key: string;
  label: string;
  labelEn: string;
  count: number;
  pct: number;
  color: string;
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
  /** 전체 기간(8개월+3개월) 기준 구간 비중 — 비교용 회색 바 */
  buckets: LeadTimeBucket[];
  totalBookings: number;
  overallAvgDays: number;
  avgChannel: Array<{ key: string; avg: number }>;
  avgNat: Array<{ key: string; avg: number }>;
  avgGuest: Array<{ key: string; avg: number }>;
}

export const useLeadTimeReport = (): LeadTimeReport => {
  const { bookings, currentYear, currentMonth } = useStore();

  return useMemo(() => {
    const startX = new Date(currentYear, currentMonth - 8, 1).getTime();
    const endX   = new Date(currentYear, currentMonth + 3, 0, 23, 59, 59).getTime();

    const overallFreq = new Array(151).fill(0);
    const channelFreq: Record<string, number[]> = {};
    const natFreq:     Record<string, number[]> = {};
    const guestFreq:   Record<string, number[]> = {};
    const allNats = new Set<string>();

    const validBookings = bookings.filter(
      b => b.status === 'confirmed' || b.status === 'checked in' || b.status === 'completed',
    );

    const scatterData = validBookings.map(b => {
      const ciTime = new Date(b.checkIn + 'T12:00:00').getTime();
      if (ciTime < startX || ciTime > endX) return null;

      let leadDays = 0;
      if (b.bookingDate) {
        leadDays = Math.max(0, Math.round(
          (ciTime - new Date(b.bookingDate + 'T12:00:00').getTime()) / 86400000,
        ));
      } else {
        // bookingDate 없는 iCal 예약은 제외 (통계 오염 방지)
        return null;
      }
      leadDays = Math.min(150, leadDays);

      const nights = Math.max(1, Math.round(
        (new Date(b.checkOut + 'T12:00:00').getTime() - ciTime) / 86400000,
      ));
      const ch       = (b.channel     || '').trim() || 'Direct';
      const nat      = (b.nationality || '').trim() || 'Unknown';
      const guestsN  = b.guests || 2;
      const guestKey = guestsN >= 5 ? '5+' : `${guestsN}`;

      allNats.add(nat);
      overallFreq[leadDays]++;

      if (!channelFreq[ch])       channelFreq[ch]       = new Array(151).fill(0);
      if (!natFreq[nat])          natFreq[nat]           = new Array(151).fill(0);
      if (!guestFreq[guestKey])   guestFreq[guestKey]    = new Array(151).fill(0);
      channelFreq[ch][leadDays]++;
      natFreq[nat][leadDays]++;
      guestFreq[guestKey][leadDays]++;

      return { x: ciTime, y: leadDays, nights, channel: ch, nationality: nat, guests: guestsN, guestName: b.guestName || '' };
    }).filter((v): v is NonNullable<typeof v> => v !== null);

    // 평균 계산 헬퍼
    const calcAvg = (freqArr: number[]) => {
      let days = 0, cnt = 0;
      freqArr.forEach((c, d) => { days += c * d; cnt += c; });
      return cnt === 0 ? 0 : Math.round(days / cnt);
    };
    const groupAvgs = (dict: Record<string, number[]>) =>
      Object.keys(dict)
        .map(key => ({ key, avg: calcAvg(dict[key]) }))
        .filter(i => dict[i.key].some(c => c > 0))
        .sort((a, b) => b.avg - a.avg);

    // 구간별 집계
    let total = 0, weightedDays = 0;
    const bucketCounts = LEAD_TIME_BUCKET_DEFS.map(() => 0);
    overallFreq.forEach((c, d) => {
      total += c;
      weightedDays += c * d;
      const idx = LEAD_TIME_BUCKET_DEFS.findIndex(b => d >= b.min && d <= b.max);
      if (idx >= 0) bucketCounts[idx] += c;
    });

    const buckets: LeadTimeBucket[] = LEAD_TIME_BUCKET_DEFS.map((def, i) => ({
      key:     def.key,
      label:   def.label,
      labelEn: def.labelEn,
      count:   bucketCounts[i],
      pct:     total > 0 ? Math.round((bucketCounts[i] / total) * 100) : 0,
      color:   def.color,
    }));

    // ── 선택 월(currentYear/currentMonth) 체크인 예약만 따로 집계 ──
    const cmStart = new Date(currentYear, currentMonth, 1).getTime();
    const cmEnd   = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).getTime();
    const cmCounts = LEAD_TIME_BUCKET_DEFS.map(() => 0);
    let cmTotal = 0, cmWeighted = 0;

    validBookings.forEach(b => {
      if (!b.bookingDate) return;
      const ciTime = new Date(b.checkIn + 'T12:00:00').getTime();
      if (ciTime < cmStart || ciTime > cmEnd) return;
      const leadDays = Math.min(150, Math.max(0, Math.round(
        (ciTime - new Date(b.bookingDate + 'T12:00:00').getTime()) / 86400000,
      )));
      const idx = LEAD_TIME_BUCKET_DEFS.findIndex(def => leadDays >= def.min && leadDays <= def.max);
      if (idx >= 0) cmCounts[idx]++;
      cmTotal++;
      cmWeighted += leadDays;
    });

    const currentMonthBuckets: LeadTimeBucket[] = LEAD_TIME_BUCKET_DEFS.map((def, i) => ({
      key:     def.key,
      label:   def.label,
      labelEn: def.labelEn,
      count:   cmCounts[i],
      pct:     cmTotal > 0 ? Math.round((cmCounts[i] / cmTotal) * 100) : 0,
      color:   def.color,
    }));

    return {
      scatterData, startX, endX,
      natKeys: [...allNats],
      currentMonthBuckets,
      currentMonthTotal:   cmTotal,
      currentMonthAvgDays: cmTotal > 0 ? Math.round(cmWeighted / cmTotal) : 0,
      buckets,
      totalBookings:  total,
      overallAvgDays: total > 0 ? Math.round(weightedDays / total) : 0,
      avgChannel: groupAvgs(channelFreq),
      avgNat:     groupAvgs(natFreq),
      avgGuest:   groupAvgs(guestFreq),
    };
  }, [bookings, currentYear, currentMonth]);
};
