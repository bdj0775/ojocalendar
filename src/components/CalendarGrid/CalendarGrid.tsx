import { useMemo } from 'react';
import { isHoliday, getHolidayName } from '../../utils/holidays';
import { useTranslation } from '../../hooks/useTranslation';
import type { BookingBar } from './useBookingBars';

// ── 상수 ─────────────────────────────────────────────────────
const DOW_LABELS: Record<string, string[]> = {
  en: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
  ko: ['일', '월', '화', '수', '목', '금', '토'],
};

// OTA·정비 채널별 이벤트 바 색상 — color.css 토큰 사용
const BAR_CHANNEL_CLS: Record<string, string> = {
  airbnb:      'bg-channel-airbnb   text-white',
  bookingcom:  'bg-channel-booking  text-white',
  direct:      'bg-channel-direct   text-white',
  naver:       'bg-channel-naver    text-white',
  maintenance: 'bg-muted text-muted-foreground border border-dashed border-border',
};

// JS 상수 — CSS 토큰 (layout.css) 과 동기화 유지
export const CELL_HEIGHT   = 100; // --calendar-cell-h
export const COMPACT_CELL_H = 52; // compact 모드 셀 높이 (scaleY 없이 별도 레이어)

const getBarCls = (ch: string, isPast: boolean, isPreview?: boolean) =>
  isPreview
    ? [
        'absolute flex items-center overflow-hidden rounded-[4px]',
        'z-raise pointer-events-none',
        'h-[var(--calendar-bar-h)] px-1',
        'border border-dashed border-primary/50 bg-primary/10 text-primary',
        'animate-fade-in',
      ].join(' ')
    : [
        'absolute flex items-center overflow-hidden rounded-[4px]',
        'z-raise cursor-pointer shadow-sm',
        'transition-all hover:brightness-95 hover:-translate-y-px hover:z-fab',
        'h-[var(--calendar-bar-h)] px-1',
        BAR_CHANNEL_CLS[ch] ?? BAR_CHANNEL_CLS.airbnb,
        isPast ? 'opacity-50' : '',
      ].join(' ');

const CHANNEL_DOT_COLOR: Record<string, string> = {
  airbnb:      '#FF5A5F',
  bookingcom:  '#003B95',
  direct:      '#10B981',
  naver:       '#03C75A',
  maintenance: '#94A3B8',
};

// ── Props ─────────────────────────────────────────────────────
export interface GridCell {
  day: number;
  isCurrentMonth: boolean;
  dateStr: string;
}

interface CalendarGridProps {
  calendarGrid:     GridCell[];
  bookingBars:      BookingBar[];
  todayStr:         string;
  onDateClick:      (cell: GridCell, e: React.MouseEvent<HTMLDivElement>) => void;
  onBarClick:       (e: React.MouseEvent, bar: BookingBar) => void;
  eventColorMode?:  'channel' | 'property';
  compact?:         boolean;
  hideNumbers?:     boolean; // 숫자·요일 레이블 숨김 (바/그리드 레이어용)
  numbersOnly?:     boolean; // 숫자·요일만 렌더 (투명 bg, 바/도트 없음, 항상 100% opacity)
  selectedDateStr?: string;  // compact numbersOnly 레이어에서 연한 primary 원 표시
}

// ── Component ─────────────────────────────────────────────────
const CalendarGrid = ({
  calendarGrid,
  bookingBars,
  todayStr,
  onDateClick,
  onBarClick,
  eventColorMode = 'channel',
  compact = false,
  hideNumbers = false,
  numbersOnly = false,
  selectedDateStr,
}: CalendarGridProps) => {
  const { language } = useTranslation();
  const dowLabels = DOW_LABELS[language] ?? DOW_LABELS.en;
  const totalRows = Math.ceil(calendarGrid.length / 7);
  const ko = language === 'ko';
  const cellH = compact ? COMPACT_CELL_H : CELL_HEIGHT;

  // compact 모드: 셀별 dot 색상 맵 (numbersOnly 레이어에는 불필요)
  const cellDotMap = useMemo(() => {
    if (!compact || numbersOnly) return null;
    const map = new Map<number, string[]>();
    bookingBars.forEach(bar => {
      for (let c = 0; c < bar.span; c++) {
        const idx = bar.rowIndex * 7 + bar.colStart + c;
        if (idx >= calendarGrid.length) continue;
        const arr = map.get(idx) ?? [];
        const color = eventColorMode === 'property'
          ? bar.propColor
          : (CHANNEL_DOT_COLOR[bar.channelClass] ?? '#6366F1');
        if (arr.length < 3 && !arr.includes(color)) arr.push(color);
        map.set(idx, arr);
      }
    });
    return map;
  }, [compact, numbersOnly, bookingBars, calendarGrid.length, eventColorMode]);

  return (
    <div
      className={[
        'grid grid-cols-7 relative',
        numbersOnly ? 'bg-transparent pointer-events-none' : 'bg-card',
        !compact && !numbersOnly ? 'border-t border-border' : '',
      ].join(' ')}
      style={{
        gridTemplateRows: `repeat(${totalRows}, ${cellH}px)`,
        height: `${totalRows * cellH}px`,
      }}
    >

      {/* ── 날짜 셀 ── */}
      {calendarGrid.map((cell, index) => {
        const isToday  = cell.dateStr === todayStr;
        const dow      = index % 7;
        const holiName = isHoliday(cell.dateStr) ? getHolidayName(cell.dateStr) : null;
        const isRed    = dow === 0 || !!holiName;
        const isBlue   = dow === 6 && !holiName;

        const isSelected = numbersOnly && compact && !!selectedDateStr && cell.dateStr === selectedDateStr;

        const numCls = isToday
          ? 'bg-primary text-primary-foreground font-bold w-5 h-5 text-[11px] inline-flex items-center justify-center rounded-full -mt-0.5 -ml-1'
          : isSelected
          ? 'bg-primary/20 text-primary font-semibold w-5 h-5 text-[11px] inline-flex items-center justify-center rounded-full -mt-0.5 -ml-1'
          : [
              'text-[11px] font-medium inline-block',
              isRed  ? 'text-calendar-sun' : isBlue ? 'text-calendar-sat' : 'text-muted-foreground',
              !cell.isCurrentMonth ? 'opacity-40' : '',
            ].join(' ');

        return (
          <div
            key={index}
            className={[
              'p-1.5 box-border',
              (compact && !numbersOnly) ? 'flex flex-col' : 'relative',
              !compact && !numbersOnly && dow < 6 ? 'border-r' : '',
              !compact && !numbersOnly ? 'border-b border-border/60' : '',
              !numbersOnly ? 'cursor-pointer transition-colors hover:bg-accent/20' : '',
              isToday && !numbersOnly ? 'bg-accent/20' : '',
            ].join(' ')}
            style={{ height: `${cellH}px` }}
            onClick={e => !numbersOnly && onDateClick(cell, e)}
          >
            {/* DOW 레이블 — 비compact 모드의 첫 행에만 */}
            {!hideNumbers && !compact && index < 7 && (
              <div className={`absolute top-1 left-0 right-0 text-center text-[9px] uppercase font-semibold ${isRed ? 'text-calendar-sun/80' : isBlue ? 'text-calendar-sat/80' : 'text-muted-foreground/60'}`}>
                {dowLabels[dow]}
              </div>
            )}

            {/* 날짜 숫자 */}
            <div className={`flex items-center gap-1 ${!compact && !numbersOnly && index < 7 ? 'mt-3.5' : ''}`}>
              {!hideNumbers && (
                <span className={numCls}>{cell.day}</span>
              )}
              {!compact && !hideNumbers && !numbersOnly && holiName && cell.isCurrentMonth && (
                <span className="text-[9px] leading-none font-semibold text-calendar-sun opacity-85 whitespace-nowrap overflow-hidden text-ellipsis">
                  {holiName}
                </span>
              )}
            </div>

            {/* compact dot — 숫자 아래 왼쪽 정렬 */}
            {compact && !numbersOnly && cellDotMap?.get(index) && (
              <div className="flex-1 flex items-center gap-[3px]">
                {cellDotMap.get(index)!.map((color, di) => (
                  <span
                    key={di}
                    className="rounded-full flex-shrink-0"
                    style={{ width: 5, height: 5, background: color }}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* ── 예약 바 (compact·numbersOnly 모드에서는 숨김) ── */}
      {!compact && !numbersOnly && bookingBars.map((bar, i) => (
        <div
          key={`${bar.id}-${i}`}
          className={getBarCls(bar.channelClass, bar.isPast, bar.isPreview)}
          style={{
            top: bar.top, left: bar.left, width: bar.width,
            ...(!bar.isPreview && eventColorMode === 'property' && { backgroundColor: bar.propColor }),
          }}
          onClick={bar.isPreview ? undefined : e => onBarClick(e, bar)}
        >
          <div className="flex items-baseline w-full overflow-hidden min-w-0">
            <span className="text-[9px] font-medium truncate leading-none min-w-0 shrink">
              {bar.guestName}
            </span>
            {bar.guests > 0 && (
              <span className="text-[8px] opacity-80 leading-none shrink-0 ml-1.5">
                {bar.guests}{ko ? '인' : 'p'}
                {bar.span >= 2 && <> {bar.nights}{ko ? '박' : 'n'}</>}
              </span>
            )}
            {bar.span >= 3 && bar.channel && (
              <span className="text-[8px] opacity-70 leading-none shrink-0 ml-auto">
                {bar.channel}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CalendarGrid;
