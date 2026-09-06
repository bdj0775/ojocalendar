import { useMemo } from 'react';
import type { BookingPaceResult, PaceInsight } from '../types';

export const usePaceInsight = (pace: BookingPaceResult, predictedOcc: number | null): PaceInsight => {
  return useMemo(() => {
    const currentTarget = pace.targets.find(t => t.isCurrent);
    
    // Get the recent 3 months targets (offset -1, -2, -3)
    const recent3Targets = pace.targets.filter(t => t.offset >= -3 && t.offset <= -1);
    
    // Check if we have at least 1 recent month with data
    const validRecentTargets = recent3Targets.filter(t => t.finalOcc > 0);
    const hasEnoughData = currentTarget != null && validRecentTargets.length > 0;

    let paceVariancePct = 0;

    if (hasEnoughData && currentTarget) {
      // 오늘과 "같은 시점"(월중이면 같은 경과일)의 과거 3개월 평균과 비교한다.
      // cutoffDay는 음수(D+)일 수 있고, 배열 인덱스는 leadDay + 30 (useBookingPace 참조).
      // 예전에는 월중에도 D-0 기준으로 비교해 과거 달의 "최종" 점유율과 비교하는
      // 버그가 있었다 (월중 6일차 77%를 지난달 최종 100%와 비교 → 과장된 음수).
      const currentLeadDay = currentTarget.cutoffDay;

      let sumRecentOccAtLeadDay = 0;

      validRecentTargets.forEach(t => {
        // 짧은 달(2월 등)은 자기 월말까지가 한계
        // 배열 인덱스 = leadDay + (배열길이 - 181): 배열은 D+N..D-180 (useBookingPace 참조)
        const idxOffset = t.dailyBookedNights.length - 181;
        const from = Math.max(currentLeadDay, -(t.daysInMonth - 1));
        let pickupNights = 0;
        for (let d = 180; d >= from; d--) {
          pickupNights += t.dailyBookedNights[d + idxOffset] || 0;
        }
        const occAtLeadDay = Math.min(100, (pickupNights / (t.daysInMonth * pace.roomCount)) * 100);
        sumRecentOccAtLeadDay += occAtLeadDay;
      });
      
      const avgRecentOccAtLeadDay = sumRecentOccAtLeadDay / validRecentTargets.length;
      
      // Current occupancy at the same lead day
      const currentOcc = pace.todayOccupancyPct;
      
      // The variance is the difference in percentage points
      paceVariancePct = currentOcc - avgRecentOccAtLeadDay;
    }

    // ── Summary Text ──
    let summaryText: string;
    let summaryTextEn: string;

    const predText = predictedOcc != null ? ` · 예상 마감 ${predictedOcc}%` : '';
    const predTextEn = predictedOcc != null ? ` · Predicted ${predictedOcc}%` : '';

    if (!hasEnoughData) {
      summaryText = `최근 데이터가 부족합니다${predText}`;
      summaryTextEn = `Not enough data${predTextEn}`;
    } else {
      const varSign = paceVariancePct > 0 ? '+' : '';
      summaryText = `최근 3개월 대비 ${varSign}${Math.round(paceVariancePct)}%p${predText}`;
      summaryTextEn = `${varSign}${Math.round(paceVariancePct)}%p vs 3mo avg${predTextEn}`;
    }

    return {
      paceVariancePct: Math.round(paceVariancePct * 10) / 10,
      summaryText,
      summaryTextEn,
      hasEnoughData,
    };
  }, [pace, predictedOcc]);
};
