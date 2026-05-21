import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import type { BookingPaceResult, PaceTarget, PaceDataPoint } from '../types';

export const useBookingPace = (): BookingPaceResult => {
  const { bookings, currentYear, currentMonth } = useStore();

  return useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targets: PaceTarget[] = Array.from({ length: 12 }, (_, i) => {
      const offset = i - 5;
      const date = new Date(currentYear, currentMonth + offset, 1);
      const yy = String(date.getFullYear()).slice(-2);
      const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      const startMs = new Date(date.getFullYear(), date.getMonth(), 1).getTime();
      const endMs = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).getTime();
      const cutoffDay = Math.max(0, Math.round((startMs - today.getTime()) / 86400000));
      return {
        key: `month_${offset}`, offset, date,
        label: `${yy}년 ${date.getMonth() + 1}월`,
        isCurrent: offset === 0,
        revenue: 0, profit: 0, auc: 0, finalOcc: 0,
        daysInMonth, startMs, endMs, cutoffDay,
        dailyBookedNights: new Array(181).fill(0),
        dailyRevenue: new Array(181).fill(0),
      };
    });

    const validBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'checked in' || b.status === 'completed');

    validBookings.forEach(b => {
      const ciTime = new Date(b.checkIn + 'T12:00:00').getTime();
      const coTime = new Date(b.checkOut + 'T12:00:00').getTime();
      targets.forEach(t => {
        const overlapStart = Math.max(ciTime, t.startMs);
        const overlapEnd = Math.min(coTime, t.endMs + 1);
        const overlapNights = Math.max(0, Math.round((overlapEnd - overlapStart) / 86400000));
        if (overlapNights > 0) {
          const totalNights = Math.max(1, Math.round((coTime - ciTime) / 86400000));
          const portion = overlapNights / totalNights;
          const amt = Number(b.amount) || 0;
          const comm = Number(b.commission) || 0;
          t.revenue += amt * portion;
          t.profit += amt * portion * (1 - comm / 100);
          let daysBeforeMonthStart = b.bookingDate
            ? Math.round((t.startMs - new Date(b.bookingDate + 'T12:00:00').getTime()) / 86400000)
            : 45;
          daysBeforeMonthStart = Math.max(0, Math.min(180, daysBeforeMonthStart));
          t.dailyBookedNights[daysBeforeMonthStart] += overlapNights;
          t.dailyRevenue[daysBeforeMonthStart] += amt * portion;
        }
      });
    });

    const paceData: PaceDataPoint[] = [];
    const accumulatorsNights = new Array(12).fill(0);
    const accumulatorsRev = new Array(12).fill(0);

    for (let day = 180; day >= 0; day--) {
      const dataPoint: PaceDataPoint = { leadDay: day };
      targets.forEach((t, i) => {
        accumulatorsNights[i] += t.dailyBookedNights[day];
        accumulatorsRev[i] += t.dailyRevenue[day];

        if (t.isCurrent) {
          dataPoint.currentDailyNights = t.dailyBookedNights[day];
          dataPoint.currentDailyRev = t.dailyRevenue[day];
        }

        if (day >= t.cutoffDay) {
          const occ = Number(((accumulatorsNights[i] / t.daysInMonth) * 100).toFixed(1));
          dataPoint[t.key] = occ;
          dataPoint[`${t.key}_rev`] = Math.round(accumulatorsRev[i]);
          t.auc += occ;
          t.finalOcc = occ;
        } else {
          dataPoint[t.key] = null;
          dataPoint[`${t.key}_rev`] = null;
        }
      });
      paceData.push(dataPoint);
    }

    const currentMonthTarget = targets.find(t => t.isCurrent)!;
    const todayOccupancy = accumulatorsNights[targets.indexOf(currentMonthTarget)];
    const todayRevenue = accumulatorsRev[targets.indexOf(currentMonthTarget)];
    const todayOccupancyPct = Number(((todayOccupancy / currentMonthTarget.daysInMonth) * 100).toFixed(1));

    return {
      paceData, targets,
      todayStr: `${today.getMonth() + 1}월 ${today.getDate()}일`,
      todayOccupancyPct,
      todayRevenueVal: Math.round(todayRevenue),
      todayLeadDay: currentMonthTarget.cutoffDay,
    };
  }, [bookings, currentYear, currentMonth]);
};
