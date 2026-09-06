import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import type { BookingPaceResult, PaceTarget, PaceDataPoint } from '../types';

// X축 범위: 달 시작 180일 전(D-180) ~ 월말(최대 D+30).
// leadDay > 0 = 달 시작 leadDay일 전(D-), leadDay < 0 = 시작 후 |leadDay|일(D+).
// 예전에는 D-0에서 끊겨 월중에 들어온 예약이 전부 마지막 한 점에 뭉쳤다.
const MAX_LEAD = 180;
export const MAX_ELAPSED = 30; // 31일짜리 달의 마지막 날 = D+30
const DAY = 86400000;

export const useBookingPace = (): BookingPaceResult => {
  const { bookings, properties, currentYear, currentMonth, selectedDashboardPropertyId } = useStore();

  return useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    const targets: PaceTarget[] = Array.from({ length: 12 }, (_, i) => {
      const offset = i - 5;
      const date = new Date(currentYear, currentMonth + offset, 1);
      const yy = String(date.getFullYear()).slice(-2);
      const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      const startMs = new Date(date.getFullYear(), date.getMonth(), 1).getTime();
      const endMs = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).getTime();
      // 관측 하한(곡선이 그려지는 마지막 leadDay):
      //   미래 달 = 오늘까지(D-N), 진행 중인 달 = 오늘 경과일(D+e), 지난 달 = 월말
      const cutoffDay = Math.max(
        -(daysInMonth - 1),
        Math.round((startMs - todayMs) / DAY),
      );
      return {
        key: `month_${offset}`, offset, date,
        label: `${yy}년 ${date.getMonth() + 1}월`,
        isCurrent: offset === 0,
        revenue: 0, profit: 0, auc: 0, finalOcc: 0,
        daysInMonth, startMs, endMs, cutoffDay,
        dailyBookedNights: new Array(MAX_LEAD + MAX_ELAPSED + 1).fill(0),
        dailyRevenue: new Array(MAX_LEAD + MAX_ELAPSED + 1).fill(0),
      };
    });

    const firstPropId = properties[0]?.id;
    const validBookings = bookings
      // 대시보드에서 선택한 숙소 기준 (미선택 시 전체) — useDesktopStats와 동일 규칙
      .filter(b => {
        if (!selectedDashboardPropertyId) return true;
        const pid = b.propertyId || firstPropId;
        return !pid || pid === selectedDashboardPropertyId;
      })
      .filter(b => b.status === 'confirmed' || b.status === 'checked in' || b.status === 'completed');

    // 점유율 분모 객실 수 — 예약이 있는 숙소만 센다 (useDesktopStats와 동일)
    const roomCount = selectedDashboardPropertyId
      ? 1
      : Math.max(1, new Set(
          validBookings.map(b => b.propertyId || firstPropId).filter(Boolean),
        ).size);

    const todayNoonMs = todayMs + DAY / 2;

    validBookings.forEach(b => {
      const ciTime = new Date(b.checkIn + 'T12:00:00').getTime();
      const coTime = new Date(b.checkOut + 'T12:00:00').getTime();
      // 접수일: 없거나 체크인·오늘보다 늦으면 앞으로 당긴다(그 시점엔 예약이 확실히
      // 존재했으므로 안전한 하한). 예측 시스템(픽업6)과 동일한 정규화.
      const bdRaw = b.bookingDate ? new Date(b.bookingDate + 'T12:00:00').getTime() : ciTime;
      const bdMs = Math.min(bdRaw, ciTime, todayNoonMs);

      targets.forEach(t => {
        // 정오(T12) 기준 월 경계 — useDesktopStats의 getOverlapNights와 동일.
        // 자정/23:59 기준을 쓰면 월 경계에 걸친 예약이 반올림으로 ±1박 어긋나
        // KPI 카드와 다른 점유율이 표시된다(실측: 9월 80% vs 76.7%).
        const overlapStart = Math.max(ciTime, t.startMs + DAY / 2);
        const overlapEnd = Math.min(coTime, t.startMs + t.daysInMonth * DAY + DAY / 2);
        const overlapNights = overlapEnd <= overlapStart ? 0 : Math.round((overlapEnd - overlapStart) / DAY);
        if (overlapNights <= 0) return;

        const totalNights = Math.max(1, Math.round((coTime - ciTime) / DAY));
        const portion = overlapNights / totalNights;
        const amt = Number(b.amount) || 0;
        const comm = Number(b.commission) || 0;
        t.revenue += amt * portion;
        t.profit += amt * portion * (1 - comm / 100);

        let day = Math.round((t.startMs - bdMs) / DAY);
        day = Math.max(-(t.daysInMonth - 1), Math.min(MAX_LEAD, day));
        t.dailyBookedNights[day + MAX_ELAPSED] += overlapNights;
        t.dailyRevenue[day + MAX_ELAPSED] += amt * portion;
      });
    });

    const paceData: PaceDataPoint[] = [];
    const accumulatorsNights = new Array(12).fill(0);
    const accumulatorsRev = new Array(12).fill(0);

    for (let day = MAX_LEAD; day >= -MAX_ELAPSED; day--) {
      const dataPoint: PaceDataPoint = { leadDay: day };
      targets.forEach((t, i) => {
        const idx = day + MAX_ELAPSED;
        accumulatorsNights[i] += t.dailyBookedNights[idx];
        accumulatorsRev[i] += t.dailyRevenue[idx];

        if (t.isCurrent) {
          dataPoint.currentDailyNights = t.dailyBookedNights[idx];
          dataPoint.currentDailyRev = t.dailyRevenue[idx];
        }

        // 곡선은 관측 하한(cutoffDay)까지만. 그보다 짧은 달(D+29짜리 2월 등)도
        // 자기 월말에서 자연스럽게 끝난다.
        if (day >= t.cutoffDay) {
          const occ = Math.min(100, Number(((accumulatorsNights[i] / (t.daysInMonth * roomCount)) * 100).toFixed(1)));
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
    const currentIdx = targets.indexOf(currentMonthTarget);

    return {
      paceData, targets, roomCount,
      todayStr: `${today.getMonth() + 1}월 ${today.getDate()}일`,
      todayOccupancyPct: currentMonthTarget.finalOcc,
      todayRevenueVal: Math.round(accumulatorsRev[currentIdx]),
      todayLeadDay: currentMonthTarget.cutoffDay,
    };
  }, [bookings, properties, currentYear, currentMonth, selectedDashboardPropertyId]);
};
