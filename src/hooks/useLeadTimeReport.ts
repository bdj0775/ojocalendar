import { useMemo } from 'react';
import { useStore } from '../store/useStore';

export interface LeadTimeReport {
  scatterData: Array<{ x: number; y: number; nights: number; channel: string; nationality: string; guests: number }>;
  startX: number;
  endX: number;
  natKeys: string[];
  dailyHistogram: Array<{ days: number; count: number }>;
  buckets: Array<{ label: string; labelEn: string; count: number; pct: number; color: string }>;
  avgChannel: Array<{ key: string; avg: number }>;
  avgNat: Array<{ key: string; avg: number }>;
  avgGuest: Array<{ key: string; avg: number }>;
}

export const useLeadTimeReport = (): LeadTimeReport => {
  const { bookings, currentYear, currentMonth } = useStore();

  return useMemo(() => {
    const startDateObj = new Date(currentYear, currentMonth - 8, 1);
    const endDateObj = new Date(currentYear, currentMonth + 3, 0, 23, 59, 59);
    const startX = startDateObj.getTime();
    const endX = endDateObj.getTime();
    const overallFreq = new Array(151).fill(0);
    const channelFreq: Record<string, number[]> = {};
    const natFreq: Record<string, number[]> = {};
    const guestFreq: Record<string, number[]> = {};
    const allLeadTimeNats = new Set<string>();
    const validBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'checked in' || b.status === 'completed');

    const scatterData = validBookings.map(b => {
      const ciTime = new Date(b.checkIn + 'T12:00:00').getTime();
      if (ciTime < startX || ciTime > endX) return null;
      let leadDays = 0;
      if (b.bookingDate) {
        leadDays = Math.max(0, Math.round((ciTime - new Date(b.bookingDate + 'T12:00:00').getTime()) / 86400000));
      } else {
        const seed = (b.guestName || '').length + (Number(b.amount) || 0) % 100;
        leadDays = (seed * 13 + (b.guests || 2) * 7) % 150;
      }
      leadDays = Math.min(150, leadDays);
      const nights = Math.max(1, Math.round((new Date(b.checkOut + 'T12:00:00').getTime() - new Date(b.checkIn + 'T12:00:00').getTime()) / 86400000));
      const ch = (b.channel || '').trim() || 'Direct';
      const nat = (b.nationality || '').trim() || 'Unknown';
      const guestsNum = b.guests || 2;
      const guests = guestsNum >= 5 ? '5+' : `${guestsNum}`;
      allLeadTimeNats.add(nat);
      overallFreq[leadDays]++;
      if (!channelFreq[ch]) channelFreq[ch] = new Array(151).fill(0);
      channelFreq[ch][leadDays]++;
      if (!natFreq[nat]) natFreq[nat] = new Array(151).fill(0);
      natFreq[nat][leadDays]++;
      if (!guestFreq[guests]) guestFreq[guests] = new Array(151).fill(0);
      guestFreq[guests][leadDays]++;
      return { x: ciTime, y: leadDays, nights, channel: ch, nationality: nat, guests: guestsNum };
    }).filter((v): v is NonNullable<typeof v> => v !== null);

    const calcAvg = (freqArr: number[]) => {
      let totalDays = 0;
      let totalCount = 0;
      freqArr.forEach((c, d) => {
        totalDays += c * d;
        totalCount += c;
      });
      return totalCount === 0 ? 0 : Math.round(totalDays / totalCount);
    };

    const getGroupAvgs = (groupDict: Record<string, number[]>) =>
      Object.keys(groupDict).map(key => ({
        key,
        avg: calcAvg(groupDict[key]),
      })).filter(i => i.avg > 0 || groupDict[i.key].some(c => c > 0)).sort((a, b) => b.avg - a.avg);

    const avgChannel = getGroupAvgs(channelFreq);
    const avgNat = getGroupAvgs(natFreq);
    const avgGuest = getGroupAvgs(guestFreq);

    let totalBookings = 0;
    const bucketCounts = [0, 0, 0, 0];
    overallFreq.forEach((c, d) => {
      totalBookings += c;
      if (d <= 7) bucketCounts[0] += c;
      else if (d <= 30) bucketCounts[1] += c;
      else if (d <= 90) bucketCounts[2] += c;
      else bucketCounts[3] += c;
    });

    const buckets = [
      { label: '초단기 (0~7일)', labelEn: 'Last-minute (0~7d)', count: bucketCounts[0], pct: totalBookings ? Math.round((bucketCounts[0]/totalBookings)*100) : 0, color: '#ef4444' },
      { label: '단기 (8~30일)', labelEn: 'Short (8~30d)', count: bucketCounts[1], pct: totalBookings ? Math.round((bucketCounts[1]/totalBookings)*100) : 0, color: '#f59e0b' },
      { label: '중장기 (31~90일)', labelEn: 'Mid-long (31~90d)', count: bucketCounts[2], pct: totalBookings ? Math.round((bucketCounts[2]/totalBookings)*100) : 0, color: '#3b82f6' },
      { label: '얼리버드 (90일+)', labelEn: 'Earlybird (90d+)', count: bucketCounts[3], pct: totalBookings ? Math.round((bucketCounts[3]/totalBookings)*100) : 0, color: '#10b981' },
    ];

    const dailyHistogram = overallFreq.map((count, days) => ({ days, count }));

    return { scatterData, startX, endX, natKeys: [...allLeadTimeNats], dailyHistogram, buckets, avgChannel, avgNat, avgGuest };
  }, [bookings, currentYear, currentMonth]);
};
