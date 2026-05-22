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
      const currentLeadDay = currentTarget.cutoffDay;
      
      // 1. Pace Variance vs Recent 3-Month Average
      // Calculate average occupancy at currentLeadDay for the recent valid targets
      let sumRecentOccAtLeadDay = 0;
      
      validRecentTargets.forEach(t => {
        // Accumulate pickup from leadDay 180 down to currentLeadDay
        let pickupNights = 0;
        for (let d = 180; d >= currentLeadDay; d--) {
          pickupNights += t.dailyBookedNights[d] || 0;
        }
        const occAtLeadDay = (pickupNights / t.daysInMonth) * 100;
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
