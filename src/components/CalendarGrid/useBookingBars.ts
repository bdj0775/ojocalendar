import { useMemo } from 'react';
import type { Booking, Maintenance, Property } from '../../types';

// 숙소별 색상 — MobileSidebar와 공유
export const PROP_COLORS = ['#5C6BC0', '#FF7043', '#9CCC65', '#29B6F6', '#26A69A', '#7E57C2'];

export interface BookingBar {
  id: string | number;
  type: 'booking' | 'maintenance';
  guestName: string;
  channel?: string;
  nationality?: string;
  guests: number;
  nights: number;
  span: number;
  channelClass: string;
  propertyId?: string;
  propColor: string;   // 숙소 고유 색상 (인디케이터용, 이벤트바 bg 아님)
  left: string;
  width: string;
  top: string;
  rowIndex: number;   // 달력 주(row) 인덱스 (0~5)
  colStart: number;   // 시작 열 (0~6)
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
  propertyId?: string;
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
const CELL_HEIGHT  = 100; // --calendar-cell-h
const BAR_OFFSET_Y =  26; // --calendar-bar-offset
const BAR_H        =  22; // --calendar-bar-h
const BAR_GAP      =   2; // 슬롯 간 간격

const MAX_SLOTS = 3;

export function useBookingBars(
  bookings: Booking[],
  maintenance: Maintenance[],
  calendarGrid: GridCell[],
  properties?: Property[], // 숙소 배열 (순서 + 색상 기준)
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

    // propertyId → 슬롯 인덱스 (0~2), propertyId 없으면 슬롯 0
    const getSlot = (propertyId?: string): number => {
      if (!propertyId || !properties?.length) return 0;
      const idx = properties.findIndex(p => p.id === propertyId);
      return idx >= 0 ? Math.min(idx, MAX_SLOTS - 1) : 0;
    };

    // propertyId → 인디케이터용 색상 (이벤트바 bg 아님)
    const getPropColor = (propertyId?: string): string => {
      if (!propertyId || !properties?.length) return PROP_COLORS[0];
      const idx = properties.findIndex(p => p.id === propertyId);
      if (idx < 0) return PROP_COLORS[0];
      return properties[idx].color || PROP_COLORS[idx % PROP_COLORS.length];
    };

    // 슬롯별로 아이템 분류 후 체크인 순 정렬
    const rawBuckets: CalItem[][] = Array.from({ length: MAX_SLOTS }, () => []);
    allItems.forEach(item => rawBuckets[getSlot(item.propertyId)].push(item));

    // 슬롯 내부에서만 dedup — 서로 다른 슬롯 간에는 날짜 겹침 허용
    const slotBuckets = rawBuckets.map(bucket => {
      bucket.sort((a, b) =>
        parseLocalStr(a.checkIn).getTime() - parseLocalStr(b.checkIn).getTime()
      );
      const valid: CalItem[] = [];
      let lastEnd = new Date(0);
      for (const item of bucket) {
        const eStart = parseLocalStr(item.checkIn);
        const eEnd   = parseLocalStr(item.checkOut);
        if (eStart >= lastEnd) { valid.push(item); lastEnd = eEnd; }
      }
      return valid;
    });

    const msPerDay = 1000 * 60 * 60 * 24;
    const bars: BookingBar[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    slotBuckets.forEach((items, slotIndex) => {
      items.forEach(item => {
        const startDate = parseLocalStr(item.checkIn);
        const endDate   = parseLocalStr(item.checkOut);
        const nights    = Math.round((endDate.getTime() - startDate.getTime()) / msPerDay);

        if (endDate <= visibleStart || startDate >= visibleEnd) return;

        const effStart = startDate < visibleStart ? visibleStart : startDate;
        const effEnd   = endDate   > visibleEnd   ? visibleEnd   : endDate;
        const startIdx = Math.round((effStart.getTime() - visibleStart.getTime()) / msPerDay);
        const endIdx   = Math.round((effEnd.getTime()   - visibleStart.getTime()) / msPerDay) - 1;

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

          // 슬롯 0이 최상단, 슬롯 1·2가 아래로 쌓임
          const topPx = row * CELL_HEIGHT
            + BAR_OFFSET_Y
            + (row === 0 ? 14 : 0)          // 첫 행: 요일 라벨 영역 추가 오프셋
            + slotIndex * (BAR_H + BAR_GAP);

          bars.push({
            id:          item.id,
            type:        item.type,
            guestName:   item.guestName?.toUpperCase() || '',
            channel:     item.channel,
            nationality: item.nationality,
            guests:      item.guests || 0,
            nights,
            span,
            channelClass,
            propertyId:  item.propertyId,
            propColor:   getPropColor(item.propertyId),
            left:     `calc(${(col  / 7) * 100}% + 2px)`,
            width:    `calc(${(span / 7) * 100}% - 4px)`,
            top:      `${topPx}px`,
            rowIndex: row,
            colStart: col,
            isFirst:  cur === startIdx,
            isLast:   segEnd === endIdx,
            isPast:   endDate <= today,
          });
          cur = segEnd + 1;
        }
      });
    });

    return bars;
  }, [bookings, maintenance, calendarGrid, properties]);
}
