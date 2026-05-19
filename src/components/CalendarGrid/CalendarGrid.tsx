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
const CELL_HEIGHT = 100; // --calendar-cell-h

// 좌우 동일한 4px 라운딩 — 모든 세그먼트에 균일 적용
const getBarCls = (ch: string, isPast: boolean) =>
  [
    'absolute flex items-center overflow-hidden rounded-[4px]',
    'z-raise cursor-pointer shadow-sm',
    'transition-all hover:brightness-95 hover:-translate-y-px hover:z-fab',
    'h-[var(--calendar-bar-h)] px-1',
    BAR_CHANNEL_CLS[ch] ?? BAR_CHANNEL_CLS.airbnb,
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
  const { language } = useTranslation();
  const dowLabels = DOW_LABELS[language] ?? DOW_LABELS.en;
  const totalRows = Math.ceil(calendarGrid.length / 7);
  const ko = language === 'ko';

  return (
    <div
      className="grid grid-cols-7 relative border-t border-border bg-card"
      style={{
        gridTemplateRows: `repeat(${totalRows}, ${CELL_HEIGHT}px)`,
        height: `${totalRows * CELL_HEIGHT}px`,
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
          ? 'bg-primary text-primary-foreground font-bold w-5 h-5 text-[11px] inline-flex items-center justify-center rounded-full -mt-0.5 -ml-1'
          : [
              'text-[11px] font-medium inline-block',
              isRed  ? 'text-calendar-sun' : isBlue ? 'text-calendar-sat' : 'text-muted-foreground',
              !cell.isCurrentMonth ? 'opacity-40' : '',
            ].join(' ');

        return (
          <div
            key={index}
            className={[
              'h-[var(--calendar-cell-h)] p-1.5 box-border relative',
              dow < 6 ? 'border-r' : '',
              'border-b border-border/60',
              'cursor-pointer transition-colors hover:bg-accent/20',
              isToday ? 'bg-accent/20' : '',
            ].join(' ')}
            onClick={() => onDateClick(cell)}
          >
            {index < 7 && (
              <div className={`absolute top-1 left-0 right-0 text-center text-[9px] uppercase font-semibold ${isRed ? 'text-calendar-sun/80' : isBlue ? 'text-calendar-sat/80' : 'text-muted-foreground/60'}`}>
                {dowLabels[dow]}
              </div>
            )}
            <div className={`flex items-center gap-1 ${index < 7 ? 'mt-3.5' : ''}`}>
              <span className={numCls}>{cell.day}</span>
              {holiName && cell.isCurrentMonth && (
                <span className="text-[9px] leading-none font-semibold text-calendar-sun opacity-85 whitespace-nowrap overflow-hidden text-ellipsis">
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
          className={getBarCls(bar.channelClass, bar.isPast)}
          style={{ top: bar.top, left: bar.left, width: bar.width }}
          onClick={e => onBarClick(e, bar)}
        >
          {/* items-baseline 으로 서로 다른 폰트 크기의 베이스라인 통일 */}
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
