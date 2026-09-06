import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import type { DesktopStats } from '../types';

const MONTH_IDX: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

export interface ForecastExample {
  /** 설명 대상 달 이름 ('10월' / 'Oct') */
  monthLabel: string;
  /** 지금까지 확정된 점유율 */
  otbOcc: number;
  /** 월말 예상 점유율 */
  predictedOcc: number;
  /** 최근 달들이 같은 시점 이후 월말까지 추가로 채운 평균 폭(%p). 히스토리 없으면 null */
  expectedPickup: number | null;
  /** 픽업 평균에 쓰인 히스토리 달 수 */
  histMonthsUsed: number;
  /** 작년 같은 달의 같은 시점 점유율 */
  stlyOccAtSamePoint: number | null;
  /** 작년 같은 달의 최종 점유율 */
  stlyFinalOcc: number | null;
  confidence: number;
  daysUntilStart: number;
  /** 시점 표기: 미래 달은 'D-25', 진행 중인 달은 'D+6' */
  dLabel: string;
  /** 선택한 달에 예측이 없어 다른 달로 대체했는지 (제목에서 달을 분명히 밝히기 위함) */
  isFallback: boolean;
}

/**
 * 예측 설명 팝오버에 쓸 데이터를 고른다.
 *
 * 기본은 **화면에서 선택 중인 달**이다. 보고 있는 달과 설명하는 달이 다르면
 * 헷갈리기 때문. 다만 과거 달은 예측값이 없으므로, 그때는 가장 가까운
 * 미래 달로 대체하고 isFallback을 세운다(팝오버 제목에 달 이름을 항상 노출).
 */
export const useForecastExample = (stats: DesktopStats, ko: boolean): ForecastExample | null => {
  const currentYear = useStore(s => s.currentYear);
  const currentMonth = useStore(s => s.currentMonth);

  return useMemo(() => {
    const withIdx = stats.monthlyTrends.map(t => ({ t, idx: MONTH_IDX[t.monthEn] ?? -1 }));

    // 1순위: 선택 중인 달
    const selected = withIdx.find(
      ({ t, idx }) => t.year === currentYear && idx === currentMonth && t.predictedOcc != null,
    );

    // 2순위: 예측이 있는 가장 이른 달 (선택한 달이 과거라 예측이 없는 경우).
    // monthlyTrends는 선택 월 기준 ±5개월만 담기므로, 과거를 보고 있으면 이 범위 안에서
    // 예측이 있는 달(= 오늘 이후)을 찾는다. 그마저 없으면 팝오버를 띄우지 않는다.
    const fallback = withIdx
      .filter(({ t }) => t.predictedOcc != null)
      .sort((a, b) => (a.t.year - b.t.year) || (a.idx - b.idx))[0];

    const picked = selected ?? fallback;
    if (!picked) return null;

    const { t } = picked;
    const predictedOcc = t.predictedOcc!;

    return {
      monthLabel: ko ? t.month : t.monthEn,
      otbOcc: t.otbOcc,
      predictedOcc,
      expectedPickup: t.expectedPickup,
      histMonthsUsed: t.histMonthsUsed,
      stlyOccAtSamePoint: t.stlyOccAtSamePoint,
      stlyFinalOcc: t.stlyFinalOcc,
      confidence: t.forecastConfidence,
      daysUntilStart: t.daysUntilStart,
      dLabel: t.daysUntilStart > 0
        ? 'D-' + t.daysUntilStart
        : 'D+' + Math.max(0, Math.floor((Date.now() - new Date(t.year, picked.idx, 1).getTime()) / 86400000)),
      isFallback: selected == null,
    };
  }, [stats.monthlyTrends, currentYear, currentMonth, ko]);
};
