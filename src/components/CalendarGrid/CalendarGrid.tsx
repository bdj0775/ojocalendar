import { User } from 'lucide-react';
import { isHoliday, getHolidayName } from '../../utils/holidays';
import { useTranslation } from '../../hooks/useTranslation';
import type { BookingBar } from './useBookingBars';

// ── 상수 ─────────────────────────────────────────────────────
const DOW_LABELS: Record<string, string[]> = {
  en: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
  ko: ['일', '월', '화', '수', '목', '금', '토'],
};

const FLAG_MAP: Record<string, string> = {
  USA: '🇺🇸', UK: '🇬🇧', India: '🇮🇳', France: '🇫🇷', Japan: '🇯🇵',
  Korea: '🇰🇷', Taiwan: '🇹🇼', Singapore: '🇸🇬', China: '🇨🇳', Others: '🏳️',
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
const CELL_HEIGHT = 120; // --calendar-cell-h

const getBarCls = (ch: string, isFirst: boolean, isLast: boolean, isPast: boolean) =>
  [
    'absolute box-border flex flex-col justify-center',
    'z-raise cursor-pointer overflow-hidden shadow-sm',
    'rounded-tl-none rounded-bl-none transition-all',
    'hover:brightness-95 hover:-translate-y-px hover:z-fab',
    'h-[var(--calendar-bar-h)] py-1.5 px-2.5',
    BAR_CHANNEL_CLS[ch] ?? BAR_CHANNEL_CLS.airbnb,
    isLast  ? 'rounded-tr-2xl rounded-br-2xl' : 'rounded-tr-none rounded-br-none',
    !isFirst ? '!border-l-0 pl-2.5'           : '',
    isPast ? 'opacity-50' : '',
  ].join(' ');

// ── Props ─────────────────────────────────────────────────────
export interface GridCell {
  day: number;
  isCurrentMonth: boolean;
  dateStr: string;
}

interface CalendarGridProps {
  calendarGrid: GridCell[];
  bookingBars:  BookingBar[];
  todayStr:     string;
  onDateClick:  (cell: GridCell) => void;
  onBarClick:   (e: React.MouseEvent, bar: BookingBar) => void;
}

// ── Component ─────────────────────────────────────────────────
const CalendarGrid = ({
  calendarGrid,
  bookingBars,
  todayStr,
  onDateClick,
  onBarClick,
}: CalendarGridProps) => {
  const { t, language } = useTranslation();
  const dowLabels = DOW_LABELS[language] ?? DOW_LABELS.en;
  const totalRows = Math.ceil(calendarGrid.length / 7);

  return (
    <div
      className="grid grid-cols-7 relative border-t border-border bg-card"
      style={{
        gridTemplateRows: `repeat(${totalRows}, ${CELL_HEIGHT}px)`,
        minHeight: `${totalRows * CELL_HEIGHT + 10}px`,
      }}
    >

      {/* ── 날짜 셀 ── */}
      {calendarGrid.map((cell, index) => {
        const isToday  = cell.dateStr === todayStr;
        const dow      = index % 7;
        const holiName = isHoliday(cell.dateStr) ? getHolidayName(cell.dateStr) : null;
        const isRed    = dow === 0 || !!holiName;
        const isBlue   = dow === 6 && !holiName;

        const numCls = isToday
          ? 'bg-primary text-primary-foreground font-bold w-[26px] h-[26px] inline-flex items-center justify-center rounded-full -mt-[3px] -ml-[4px]'
          : [
              'type-body font-medium inline-block',
              isRed  ? 'text-calendar-sun' : isBlue ? 'text-calendar-sat' : 'text-muted-foreground',
              !cell.isCurrentMonth ? 'opacity-40' : '',
            ].join(' ');

        return (
          <div
            key={index}
            className={[
              'h-[var(--calendar-cell-h)] p-2.5 box-border relative',
              dow < 6 ? 'border-r' : '',
              'border-b border-border/60',
              'cursor-pointer transition-colors hover:bg-accent/20',
              isToday ? 'bg-accent/20' : '',
            ].join(' ')}
            onClick={() => onDateClick(cell)}
          >
            {index < 7 && (
              <div className={`absolute top-1.5 left-0 right-0 text-center text-[10px] uppercase font-semibold ${isRed ? 'text-calendar-sun/80' : isBlue ? 'text-calendar-sat/80' : 'text-muted-foreground/60'}`}>
                {dowLabels[dow]}
              </div>
            )}
            <div className={`flex items-center gap-1.5 ${index < 7 ? 'mt-4' : ''}`}>
              <span className={numCls}>{cell.day}</span>
              {holiName && cell.isCurrentMonth && (
                <span className="type-caption font-semibold text-calendar-sun opacity-85 whitespace-nowrap overflow-hidden text-ellipsis">
                  {holiName}
                </span>
              )}
            </div>
          </div>
        );
      })}

      {/* ── 예약 바 ── */}
      {bookingBars.map((bar, i) => (
        <div
          key={`${bar.id}-${i}`}
          className={getBarCls(bar.channelClass, bar.isFirst, bar.isLast, bar.isPast)}
          style={{ top: bar.top, left: bar.left, width: bar.width }}
          onClick={e => onBarClick(e, bar)}
        >
          <div className="flex flex-col gap-0.5 w-full">
            <strong className="type-caption font-bold whitespace-nowrap overflow-hidden text-ellipsis">
              {bar.guestName}
            </strong>
            <div className="flex flex-wrap gap-1.5 items-center type-micro opacity-85 h-3.5 overflow-hidden">
              {bar.guests > 0 && (
                <span className="whitespace-nowrap flex items-center">
                  <User size={10} className="mr-0.5 inline-block" />
                  {bar.guests} {bar.guests > 1 ? t('calendar.guests') : t('calendar.guest')}
                </span>
              )}
              {bar.nights > 0 && (
                <span className="whitespace-nowrap">
                  {bar.nights} {bar.nights > 1 ? t('calendar.nights') : t('calendar.night')}
                </span>
              )}
              {bar.channel && (
                <span className="whitespace-nowrap">
                  {bar.channel} {FLAG_MAP[bar.nationality || ''] || ''}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CalendarGrid;
