import { useMemo } from 'react';
import type { DesktopStats } from '../types';

const MONTH_IDX: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

export interface ForecastExample {
  monthLabel: string;
  otbOcc: number;
  predictedOcc: number;
  lastYearOcc: number | null;
  confidence: number;
  daysUntil: number;
}

/**
 * 예측 설명 팝오버에 쓸 예시 데이터를 고른다.
 *
 * 다음 달(오늘 기준 가장 가까운 미래 달)을 예시로 삼는다 — 이번 달은 이미 절반쯤
 * 지나 예측의 의미가 옅고, 먼 달은 확정 예약이 없어 설명이 와닿지 않는다.
 * 미래 달이 없으면 이번 달로 대체한다.
 */
export const useForecastExample = (stats: DesktopStats, ko: boolean): ForecastExample | null =>
  useMemo(() => {
    const today = new Date();
    const ty = today.getFullYear(), tm = today.getMonth();

    const withIdx = stats.monthlyTrends.map(t => ({ t, idx: MONTH_IDX[t.monthEn] ?? -1 }));
    const future = withIdx
      .filter(({ t, idx }) => t.predictedOcc != null && (t.year > ty || (t.year === ty && idx > tm)))
      .sort((a, b) => (a.t.year - b.t.year) || (a.idx - b.idx));
    const picked = future[0] ?? withIdx.find(({ t }) => t.isCurrent && t.predictedOcc != null);
    if (!picked) return null;

    const { t, idx } = picked;

    // 작년 같은 달 실적 — 월별 표 데이터에서 찾는다 (monthlyTrends는 11개월치뿐이라 없을 수 있음)
    const ly = stats.monthlyTableData.find(r => r.year === t.year - 1 && r.month === idx);

    const monthStart = new Date(t.year, idx, 1);
    const daysUntil = Math.max(0, Math.floor((monthStart.getTime() - today.getTime()) / 86400000));

    return {
      monthLabel: ko ? t.month : t.monthEn,
      otbOcc: t.otbOcc,
      predictedOcc: t.predictedOcc!,
      lastYearOcc: ly ? ly.occupancy : null,
      confidence: t.forecastConfidence,
      daysUntil,
    };
  }, [stats.monthlyTrends, stats.monthlyTableData, ko]);
