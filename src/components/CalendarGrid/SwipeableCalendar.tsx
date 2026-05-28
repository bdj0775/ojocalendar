import { useRef, useState, useCallback } from 'react';
import CalendarGrid from './CalendarGrid';
import type { GridCell } from './CalendarGrid';
import type { BookingBar } from './useBookingBars';

const SWIPE_THRESHOLD = 55; // px — 이 이상 드래그 시 페이지 전환

export interface MonthPanel {
  grid: GridCell[];
  bars: BookingBar[];
}

interface Props {
  prev:    MonthPanel;
  current: MonthPanel;
  next:    MonthPanel;
  todayStr:        string;
  onDateClick:     (cell: GridCell, e: React.MouseEvent<HTMLDivElement>) => void;
  onBarClick:      (e: React.MouseEvent, bar: BookingBar) => void;
  onPrev: () => void;
  onNext: () => void;
  eventColorMode?:  'channel' | 'property';
  compact?:         boolean;
  hideNumbers?:     boolean;
  numbersOnly?:     boolean;
  selectedDateStr?: string;
}

const SwipeableCalendar = ({
  prev, current, next,
  todayStr, onDateClick, onBarClick,
  onPrev, onNext,
  eventColorMode = 'channel',
  compact = false,
  hideNumbers = false,
  numbersOnly = false,
  selectedDateStr,
}: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragX, setDragX]       = useState(0);
  const [animating, setAnimating] = useState(false);

  const startX   = useRef<number | null>(null);
  const startY   = useRef<number | null>(null);
  const dirLocked = useRef<'h' | 'v' | null>(null);

  const settle = useCallback((targetX: number, done?: () => void) => {
    setAnimating(true);
    setDragX(targetX);
    setTimeout(() => {
      setDragX(0);
      setAnimating(false);
      done?.();
    }, 320);
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    if (animating || numbersOnly) return;
    startX.current  = e.touches[0].clientX;
    startY.current  = e.touches[0].clientY;
    dirLocked.current = null;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null || animating) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - (startY.current ?? 0);

    if (dirLocked.current === null) {
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      dirLocked.current = Math.abs(dx) >= Math.abs(dy) * 1.1 ? 'h' : 'v';
    }
    if (dirLocked.current === 'v') return;

    setDragX(dx);
  };

  const onTouchEnd = () => {
    if (dirLocked.current !== 'h' || startX.current === null) {
      startX.current = null;
      return;
    }
    startX.current = null;

    const w = containerRef.current?.offsetWidth ?? window.innerWidth;
    if (dragX < -SWIPE_THRESHOLD) {
      settle(-w, onNext);
    } else if (dragX > SWIPE_THRESHOLD) {
      settle(w, onPrev);
    } else {
      settle(0);
    }
  };

  const panels: MonthPanel[] = [prev, current, next];

  return (
    <div
      ref={containerRef}
      className="overflow-hidden w-full touch-pan-y"
    >
      <div
        style={{
          display:   'flex',
          width:     '300%',
          transform: `translateX(calc(-33.333% + ${dragX}px))`,
          transition: animating
            ? 'transform 320ms cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            : 'none',
          willChange: 'transform',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {panels.map((panel, i) => (
          <div key={i} style={{ width: '33.333%' }}>
            <CalendarGrid
              calendarGrid={panel.grid}
              bookingBars={panel.bars}
              todayStr={todayStr}
              onDateClick={onDateClick}
              onBarClick={onBarClick}
              eventColorMode={eventColorMode}
              compact={compact}
              hideNumbers={hideNumbers}
              numbersOnly={numbersOnly}
              selectedDateStr={selectedDateStr}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default SwipeableCalendar;
