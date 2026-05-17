import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { getNatColor } from '../utils/colors';
import type { DesktopStats, MonthlyTrend, PieDataItem, LeadTimeDataPoint, MonthlyTableRow, Booking } from '../types';

const CHANNEL_COLORS: Record<string, string> = {
  'Airbnb': 'var(--channel-airbnb)',
  'Booking.com': 'var(--channel-booking)',
  'Direct': 'var(--channel-direct)',
  'Naver': 'var(--channel-naver)',
};


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

const calcMonthStats = (validBookings: (Booking & { amount: number })[], year: number, month: number): MonthStats => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let gross = 0, net = 0, occNights = 0, otaComm = 0, bookingCount = 0;
  validBookings.forEach(b => {
    const totalNights = Math.max(1, Math.round(
      (new Date(b.checkOut + 'T12:00:00').getTime() - new Date(b.checkIn + 'T12:00:00').getTime()) / 86400000,
    ));
    const n = getOverlapNights(b.checkIn, b.checkOut, year, month);
    if (n > 0) {
      bookingCount++;
      occNights += n;
      const gPortion = (b.amount / totalNights) * n;
      const commRate = b.commission || 0;
      const nPortion = gPortion * (1 - commRate / 100);
      gross += gPortion;
      net += nPortion;
      if (b.channel !== 'Direct') otaComm += (gPortion - nPortion);
    }
  });
  return {
    gross: Math.round(gross), net: Math.round(net), occNights,
    occupancy: Math.round((occNights / daysInMonth) * 100),
    adr: occNights === 0 ? 0 : Math.round(gross / occNights),
    otaComm: Math.round(otaComm), bookingCount, daysInMonth,
  };
};

export const useDesktopStats = (
  tableChannelFilter = 'All',
  tableNatFilter = 'All',
  tableGuestFilter = 'All',
): DesktopStats => {
  const { bookings, currentYear, currentMonth, settings, properties } = useStore();

  return useMemo(() => {
    const prop = properties?.[0] ?? {};
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

    const validBookings: ValidBooking[] = bookings
      .filter(b => b.status === 'confirmed' || b.status === 'checked in' || b.status === 'completed')
      .map(b => {
        const realAmount = Number(b.amount) || 0;
        const isEstimated = realAmount === 0;
        return {
          ...b,
          nationality: (b.nationality || '').trim() || 'Unknown',
          channel: (b.channel || '').trim() || 'Direct',
          guests: b.guests || 0,
          amount: isEstimated ? estimateAmount(b.checkIn, b.checkOut) : realAmount,
          originalAmount: realAmount,
          isEstimated,
        };
      });

    const thisMonth = calcMonthStats(validBookings, currentYear, currentMonth);
    let lmYear = currentYear, lmMonth = currentMonth - 1;
    if (lmMonth < 0) { lmYear--; lmMonth = 11; }
    const lastMonth = calcMonthStats(validBookings, lmYear, lmMonth);

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
      const ms = calcMonthStats(validBookings, currentYear, m);
      yearlyGross += ms.gross; yearlyNights += ms.occNights;
    }
    const adrYearAvg = yearlyNights === 0 ? 0 : Math.round(yearlyGross / yearlyNights);

    const monthlyTrends: MonthlyTrend[] = [];
    for (let i = -6; i <= 5; i++) {
      let ty = currentYear, tm = currentMonth + i;
      while (tm < 0) { tm += 12; ty--; }
      while (tm > 11) { tm -= 12; ty++; }
      const ms = calcMonthStats(validBookings, ty, tm);
      monthlyTrends.push({
        month: MONTH_LABELS[tm], monthEn: MONTH_LABELS_EN[tm], year: ty,
        gross: ms.gross, net: ms.net, adr: ms.adr, occupancy: ms.occupancy, isCurrent: i === 0,
      });
    }

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
      .map(ch => ({ name: ch, value: Math.round((channelCounts[ch] / totalChannelBookings) * 100), count: channelCounts[ch], color: CHANNEL_COLORS[ch] || '#94a3b8' }))
      .sort((a, b) => b.value - a.value);
    if (channelPieData.length === 0) channelPieData = [{ name: 'No Data', value: 100, count: 0, color: '#334155' }];

    let nationalityPieData: PieDataItem[] = Object.keys(natCounts)
      .map((nat) => ({ name: nat, value: Math.round((natCounts[nat] / totalNatBookings) * 100), count: natCounts[nat], color: getNatColor(nat) }))
      .sort((a, b) => b.value - a.value);
    if (nationalityPieData.length === 0) nationalityPieData = [{ name: 'No Data', value: 100, count: 0, color: '#334155' }];

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
      .filter((v): v is LeadTimeDataPoint => v !== null);

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
        const ms = calcMonthStats(tableBookings, y, m);
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

        const unfilteredMs = calcMonthStats(validBookings, y, m);
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
      totalBookings: thisMonth.bookingCount, daysInMonth: thisMonth.daysInMonth,
      adrThisMonth: thisMonth.adr, adrYearAvg,
      otaCommission: thisMonth.otaComm, otaCommPct: Math.round(otaCommPct * 10) / 10,
      monthlyTrends, channelPieData, totalChannelBookings, nationalityPieData, totalNatBookings,
      leadTimeScatterData, leadTimeStartX: startX, leadTimeEndX: endX,
      leadTimeNatKeys: [...allLeadTimeNats], monthlyTableData, currencySymbol,
    };
  }, [bookings, currentYear, currentMonth, settings?.currency, properties, tableChannelFilter, tableNatFilter, tableGuestFilter]);
};
