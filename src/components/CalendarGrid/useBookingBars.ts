import { useMemo } from 'react';
import type { Booking, Maintenance } from '../../types';

export interface BookingBar {
  id: string | number;
  type: 'booking' | 'maintenance';
  guestName: string;
  channel?: string;
  nationality?: string;
  guests: number;
  nights: number;
  channelClass: string;
  left: string;
  width: string;
  top: string;
  isFirst: boolean;
  isLast: boolean;
  isPast: boolean;
}

interface CalItem {
  id: string | number;
  type: 'booking' | 'maintenance';
  checkIn: string;
  checkOut: string;
  guestName: string;
  channel?: string;
  nationality?: string;
  guests?: number;
}

const CHANNEL_STYLES: Record<string, string> = {
  Airbnb:        'airbnb',
  'Booking.com': 'bookingcom',
  Direct:        'direct',
  Naver:         'naver',
};

const parseLocalStr = (ds: string | undefined): Date => {
  if (!ds) return new Date();
  const [y, mo, d] = ds.split('-').map(Number);
  return new Date(y, mo - 1, d);
};

interface GridCell {
  day: number;
  isCurrentMonth: boolean;
  dateStr: string;
}

// JS 상수 — CSS 토큰 (layout.css) 과 동기화 유지
const CELL_HEIGHT  = 120; // --calendar-cell-h
const HEADER_H     =   0; // --calendar-header-h removed
const BAR_OFFSET_Y =  38; // --calendar-bar-offset (날짜 숫자 영역 아래 시작점)

export function useBookingBars(
  bookings: Booking[],
  maintenance: Maintenance[],
  calendarGrid: GridCell[],
): BookingBar[] {
  return useMemo<BookingBar[]>(() => {
    if (!calendarGrid.length) return [];

    const allItems: CalItem[] = [
      ...bookings.map(b => ({ ...b, type: 'booking' as const })),
      ...maintenance.map(m => ({
        ...m,
        type:      'maintenance' as const,
        guestName: m.label,
        checkIn:   m.startDate,
        checkOut:  m.endDate,
      })),
    ];

    const visibleStart = parseLocalStr(calendarGrid[0].dateStr);
    const visibleEnd   = parseLocalStr(calendarGrid[calendarGrid.length - 1].dateStr);
    visibleEnd.setDate(visibleEnd.getDate() + 1);

    allItems.sort((a, b) =>
      parseLocalStr(a.checkIn).getTime() - parseLocalStr(b.checkIn).getTime()
    );

    // 겹치는 예약 제거 (체크인 순으로 정렬 후 non-overlapping 선택)
    const validItems: CalItem[] = [];
    let lastEnd = new Date(0);
    for (const item of allItems) {
      const eStart = parseLocalStr(item.checkIn);
      const eEnd   = parseLocalStr(item.checkOut);
      if (eStart >= lastEnd) { validItems.push(item); lastEnd = eEnd; }
    }

    const msPerDay = 1000 * 60 * 60 * 24;
    const bars: BookingBar[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    validItems.forEach(item => {
      const startDate = parseLocalStr(item.checkIn);
      const endDate   = parseLocalStr(item.checkOut);
      const nights    = Math.round((endDate.getTime() - startDate.getTime()) / msPerDay);

      if (endDate <= visibleStart || startDate >= visibleEnd) return;

      const effStart  = startDate < visibleStart ? visibleStart : startDate;
      const effEnd    = endDate   > visibleEnd   ? visibleEnd   : endDate;
      const startIdx  = Math.round((effStart.getTime() - visibleStart.getTime()) / msPerDay);
      const endIdx    = Math.round((effEnd.getTime()   - visibleStart.getTime()) / msPerDay) - 1;

      if (endIdx < startIdx) return;

      const channelClass = item.type === 'maintenance'
        ? 'maintenance'
        : (CHANNEL_STYLES[item.channel || ''] || 'airbnb');

      let cur = startIdx;
      while (cur <= endIdx) {
        const row    = Math.floor(cur / 7);
        const segEnd = Math.min(endIdx, (row + 1) * 7 - 1);
        const col    = cur % 7;
        const span   = segEnd - cur + 1;

        bars.push({
          id:           item.id,
          type:         item.type,
          guestName:    item.guestName?.toUpperCase() || '',
          channel:      item.channel,
          nationality:  item.nationality,
          guests:       item.guests || 0,
          nights,
          channelClass,
          left:    `${(col  / 7) * 100}%`,
          width:   `${(span / 7) * 100}%`,
          top:     `${HEADER_H + row * CELL_HEIGHT + BAR_OFFSET_Y + (row === 0 ? 16 : 0)}px`,
          isFirst: cur === startIdx,
          isLast:  segEnd === endIdx,
          isPast:  endDate < today,
        });
        cur = segEnd + 1;
      }
    });

    return bars;
  }, [bookings, maintenance, calendarGrid]);
}
