import { useMemo, useState, useRef } from 'react';
import { Plus, ChevronLeft, ChevronRight, Menu, ChevronDown } from 'lucide-react';
import { useSidebar } from '../../context/SidebarContext';
import { ICON_SIZES } from '../../lib/iconSizes';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import NotificationBell from '../../components/Notifications/NotificationBell';
import { useTranslation } from '../../hooks/useTranslation';
import BookingEditModal from '../../components/Modals/BookingEditModal';
import QuickBookingModal from '../../components/Modals/QuickBookingModal';
import MaintenanceModal from '../../components/Modals/MaintenanceModal';
import YearMonthPickerModal from '../../components/Modals/YearMonthPickerModal';
import SwipeableCalendar from '../../components/CalendarGrid/SwipeableCalendar';
import { useBookingBars, PROP_COLORS } from '../../components/CalendarGrid/useBookingBars';
import { Body } from '../../components/ui/Typography';
import UpcomingBookingCard from '../../components/Calendar/UpcomingBookingCard';

// ── 순수 헬퍼 ────────────────────────────────────────────────────

function offsetMonth(year: number, month: number, delta: number): [number, number] {
  let m = month + delta;
  let y = year;
  if (m < 0)  { m = 11; y--; }
  if (m > 11) { m = 0;  y++; }
  return [y, m];
}

function buildCalendarGrid(year: number, month: number) {
  const firstDay        = new Date(year, month, 1).getDay();
  const daysInMonth     = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const [py, pm] = offsetMonth(year, month, -1);
  const [ny, nm] = offsetMonth(year, month,  1);
  const cells = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({
      day: daysInPrevMonth - i,
      isCurrentMonth: false,
      dateStr: `${py}-${String(pm + 1).padStart(2, '0')}-${String(daysInPrevMonth - i).padStart(2, '0')}`,
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      isCurrentMonth: true,
      dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    });
  }
  for (let i = 1; cells.length < 42; i++) {
    cells.push({
      day: i,
      isCurrentMonth: false,
      dateStr: `${ny}-${String(nm + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
    });
  }
  return cells;
}

// ── 바텀시트 스냅 ─────────────────────────────────────────────────

type SnapPoint = 'hidden' | 'half' | 'full';
const SNAP_SEQ: SnapPoint[] = ['hidden', 'half', 'full'];
const HANDLE_H = 36; // px — 항상 보이는 핸들 높이

function getSnapY(snap: SnapPoint, sheetH: number): number {
  if (snap === 'hidden') return sheetH - HANDLE_H;
  if (snap === 'half')   return sheetH * 0.5;
  return 0;
}

// ── Component ────────────────────────────────────────────────────

const CalendarPage = () => {
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const {
    bookings, maintenance, currentYear, currentMonth, properties, settings,
    nextMonth, prevMonth, goToday, setMonth, openBookingModal, openEditMaintModal,
    visiblePropertyIds, setVisiblePropertyIds,
    propertyOrder, setPropertyOrder,
  } = useStore();

  const { open: openSidebar } = useSidebar();

  const [quickBookingDate, setQuickBookingDate] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // ── 바텀시트 상태 ──────────────────────────────────────────────
  const [snap, setSnap] = useState<SnapPoint>('hidden');
  const dragStartY  = useRef<number | null>(null);
  const [dragDy, setDragDy] = useState(0);

  const sheetH = () => window.innerHeight - 56; // 56 = 헤더 근사값

  const baseY    = getSnapY(snap, sheetH());
  const clampedY = Math.max(0, Math.min(sheetH() - HANDLE_H, baseY + dragDy));

  const onTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    setDragDy(e.touches[0].clientY - dragStartY.current);
  };
  const onTouchEnd = () => {
    if (dragStartY.current === null) return;
    dragStartY.current = null;
    const dy = dragDy;
    setDragDy(0);
    if (Math.abs(dy) < 35) return;
    const i = SNAP_SEQ.indexOf(snap);
    if (dy < 0 && i < 2) setSnap(SNAP_SEQ[i + 1]);   // 위로 → 더 열기
    else if (dy > 0 && i > 0) setSnap(SNAP_SEQ[i - 1]); // 아래로 → 닫기
  };

  // ── 숙소 정렬 순서 ─────────────────────────────────────────────
  const sortedProperties = useMemo(() => {
    if (!propertyOrder.length) return properties;
    const orderMap = new Map(propertyOrder.map((id, i) => [id, i]));
    return [...properties].sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));
  }, [properties, propertyOrder]);

  // ── 칩 드래그 상태 ─────────────────────────────────────────────
  const chipDragRef         = useRef<{ id: string; startX: number; moved: boolean } | null>(null);
  const chipDragHappenedRef = useRef(false);
  const chipRefs            = useRef<Record<string, HTMLButtonElement | null>>({});
  const [chipDraggingId, setChipDraggingId] = useState<string | null>(null);
  const [chipDragOverId,  setChipDragOverId]  = useState<string | null>(null);

  const onChipTouchStart = (e: React.TouchEvent, propId: string) => {
    chipDragRef.current = { id: propId, startX: e.touches[0].clientX, moved: false };
    setChipDraggingId(propId);
  };
  const onChipsTouchMove = (e: React.TouchEvent) => {
    if (!chipDragRef.current) return;
    const dx = Math.abs(e.touches[0].clientX - chipDragRef.current.startX);
    if (dx > 8) chipDragRef.current.moved = true;
    if (!chipDragRef.current.moved) return;
    const touch = e.touches[0];
    for (const [id, el] of Object.entries(chipRefs.current)) {
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (touch.clientX >= rect.left && touch.clientX <= rect.right) {
        setChipDragOverId(id !== chipDragRef.current.id ? id : null);
        break;
      }
    }
  };
  const onChipsTouchEnd = () => {
    const drag = chipDragRef.current;
    if (drag?.moved && chipDragOverId && drag.id !== chipDragOverId) {
      chipDragHappenedRef.current = true;
      const ids = sortedProperties.map(p => p.id);
      const from = ids.indexOf(drag.id);
      const to   = ids.indexOf(chipDragOverId);
      const newOrder = [...ids];
      newOrder.splice(from, 1);
      newOrder.splice(to, 0, drag.id);
      setPropertyOrder(newOrder);
    }
    chipDragRef.current = null;
    setChipDraggingId(null);
    setChipDragOverId(null);
  };

  // ── ────────────────────────────────────────────────────────────

  const today    = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const toggleProperty = (id: string) => {
    const allIds = properties.map(p => p.id);
    const current = visiblePropertyIds ?? allIds;
    const next = current.includes(id)
      ? current.filter(x => x !== id)
      : [...current, id];
    setVisiblePropertyIds(next.length === allIds.length ? null : next);
  };

  const visibleBookings = useMemo(() => {
    if (visiblePropertyIds === null) return bookings;
    const knownIds = new Set(properties.map(p => p.id));
    const firstPropId = properties[0]?.id;
    return bookings.filter(b => {
      // propertyId가 없거나 DB에 없는 숙소면 첫 번째 숙소로 취급
      const pid = (b.propertyId && knownIds.has(b.propertyId)) ? b.propertyId : firstPropId;
      return pid != null && visiblePropertyIds.includes(pid);
    });
  }, [bookings, visiblePropertyIds, properties]);

  const visibleMaintenance = useMemo(() => {
    if (visiblePropertyIds === null) return maintenance;
    const knownIds = new Set(properties.map(p => p.id));
    const firstPropId = properties[0]?.id;
    return maintenance.filter(m => {
      const pid = (m.propertyId && knownIds.has(m.propertyId)) ? m.propertyId : firstPropId;
      return pid != null && visiblePropertyIds.includes(pid);
    });
  }, [maintenance, visiblePropertyIds, properties]);

  const [prevYear,  prevMonthIdx]  = useMemo(() => offsetMonth(currentYear, currentMonth, -1), [currentYear, currentMonth]);
  const [nextYear,  nextMonthIdx]  = useMemo(() => offsetMonth(currentYear, currentMonth,  1), [currentYear, currentMonth]);

  const prevGrid    = useMemo(() => buildCalendarGrid(prevYear,    prevMonthIdx),  [prevYear,    prevMonthIdx]);
  const currentGrid = useMemo(() => buildCalendarGrid(currentYear, currentMonth),  [currentYear, currentMonth]);
  const nextGrid    = useMemo(() => buildCalendarGrid(nextYear,    nextMonthIdx),  [nextYear,    nextMonthIdx]);

  const visibleProperties = useMemo(
    () => visiblePropertyIds === null
      ? sortedProperties
      : sortedProperties.filter(p => visiblePropertyIds.includes(p.id)),
    [sortedProperties, visiblePropertyIds],
  );

  const prevBars    = useBookingBars(visibleBookings, visibleMaintenance, prevGrid,    visibleProperties);
  const currentBars = useBookingBars(visibleBookings, visibleMaintenance, currentGrid, visibleProperties);
  const nextBars    = useBookingBars(visibleBookings, visibleMaintenance, nextGrid,    visibleProperties);

  const panels = useMemo(() => ({
    prev:    { grid: prevGrid,    bars: prevBars    },
    current: { grid: currentGrid, bars: currentBars },
    next:    { grid: nextGrid,    bars: nextBars    },
  }), [prevGrid, currentGrid, nextGrid, prevBars, currentBars, nextBars]);

  const upcomingStays = useMemo(() =>
    visibleBookings
      .filter(b => new Date(b.checkIn) >= new Date(todayStr))
      .sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime()),
    [visibleBookings, todayStr],
  );

  const handleDateClick = (cell: { isCurrentMonth: boolean; dateStr: string }) => {
    if (!cell.isCurrentMonth || !cell.dateStr) return;
    setQuickBookingDate(cell.dateStr);
  };

  const handleBarClick = (e: React.MouseEvent, bar: { type: string; id: string | number }) => {
    e.stopPropagation();
    if (bar.type === 'booking') openBookingModal(String(bar.id));
    else openEditMaintModal(String(bar.id));
  };

  const ko = language === 'ko';

  return (
    <div className="relative w-full overflow-hidden pt-2" style={{ height: '100dvh' }}>

      {/* ── 헤더 ── */}
      <div className="px-3 mb-2">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <button className="p-1 -ml-1 text-foreground lg:hidden" onClick={openSidebar}>
              <Menu size={24} />
            </button>
            <h1
              className="type-section-title flex items-center gap-1 cursor-pointer text-foreground"
              onClick={() => setDatePickerOpen(true)}
            >
              {ko
                ? `${currentYear}년 ${currentMonth + 1}월`
                : `${new Date(currentYear, currentMonth).toLocaleString('en', { month: 'long' })} ${currentYear}`}
              <ChevronDown size={18} className="text-muted-foreground" />
            </h1>
          </div>
          <div className="flex gap-2 items-center shrink-0">
            <NotificationBell />
            {[prevMonth, nextMonth].map((fn, i) => (
              <button
                key={i}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-foreground hover:bg-muted transition-colors shrink-0"
                onClick={fn}
              >
                {i === 0 ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
              </button>
            ))}
            <button
              className="h-8 px-3 text-[13px] font-semibold bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors whitespace-nowrap"
              onClick={goToday}
            >
              {t('calendar.today')}
            </button>
          </div>
        </div>

        <div
          className="flex gap-2 flex-wrap"
          onTouchMove={onChipsTouchMove}
          onTouchEnd={onChipsTouchEnd}
        >
          {sortedProperties.map((prop, idx) => {
            const isSelected  = visiblePropertyIds === null || visiblePropertyIds.includes(prop.id);
            const isDragging  = chipDraggingId === prop.id && !!chipDragOverId;
            const isDragOver  = chipDragOverId === prop.id;
            const dotColor    = prop.color || PROP_COLORS[idx % PROP_COLORS.length];
            return (
              <button
                key={prop.id}
                ref={el => { chipRefs.current[prop.id] = el; }}
                onTouchStart={(e) => onChipTouchStart(e, prop.id)}
                onClick={() => {
                  if (chipDragHappenedRef.current) { chipDragHappenedRef.current = false; return; }
                  toggleProperty(prop.id);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full type-micro font-bold transition-all border ${
                  isSelected
                    ? 'bg-muted text-foreground border-border'
                    : 'bg-transparent text-muted-foreground border-border/50'
                } ${isDragOver  ? 'ring-2 ring-primary/50 scale-105' : ''}
                  ${isDragging  ? 'opacity-40 scale-95'              : ''}`}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0 transition-opacity"
                  style={{ backgroundColor: dotColor, opacity: isSelected ? 1 : 0.35 }}
                />
                {prop.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 달력 ── */}
      <SwipeableCalendar
        prev={panels.prev}
        current={panels.current}
        next={panels.next}
        todayStr={todayStr}
        onDateClick={handleDateClick}
        onBarClick={handleBarClick}
        onPrev={prevMonth}
        onNext={nextMonth}
        eventColorMode={settings?.eventColorMode ?? 'channel'}
      />

      {/* ── 바텀시트 ── */}
      <div
        className="absolute inset-x-0 bottom-0 bg-card rounded-t-3xl shadow-[0_-4px_24px_rgba(0,0,0,0.10)] flex flex-col"
        style={{
          height: sheetH(),
          transform: `translateY(${clampedY}px)`,
          transition: dragDy === 0 ? 'transform 380ms cubic-bezier(0.32,0.72,0,1)' : 'none',
          zIndex: 20,
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* 핸들 */}
        <div className="flex flex-col items-center pt-2.5 pb-1 flex-shrink-0 cursor-grab select-none">
          <div className="w-9 h-[4px] rounded-full bg-border/70 mb-1" />
          {snap === 'hidden' && (
            <span className="text-[10px] font-semibold text-muted-foreground/60 tracking-wide">
              {ko ? '다가오는 예약' : 'Upcoming'}
            </span>
          )}
        </div>

        {/* 타이틀 */}
        {snap !== 'hidden' && (
          <div className="px-5 pb-3 flex items-baseline justify-between flex-shrink-0">
            <span className="text-[15px] font-bold text-foreground">
              {ko ? '다가오는 예약' : 'Upcoming Stays'}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {upcomingStays.length}{ko ? '건' : ' bookings'}
            </span>
          </div>
        )}

        {/* 카드 목록 */}
        <div className="flex-1 overflow-y-auto px-5 pb-24">
          {upcomingStays.length === 0 && (
            <Body className="text-center py-8 text-muted-foreground">
              {t('calendar.noUpcomingStays')}
            </Body>
          )}
          {upcomingStays.map(stay => {
            const pIdx = properties.findIndex(p => p.id === stay.propertyId);
            const propColor = pIdx >= 0 
              ? (properties[pIdx].color || PROP_COLORS[pIdx % PROP_COLORS.length]) 
              : PROP_COLORS[0];
              
            return (
              <UpcomingBookingCard
                key={stay.id}
                booking={stay}
                propColor={propColor}
                propName={pIdx >= 0 ? properties[pIdx].name : undefined}
                onClick={() => openBookingModal(stay.id)}
              />
            );
          })}
        </div>
      </div>

      {/* ── FAB ── */}
      <button
        className="fixed right-5 bottom-nav-clear w-11 h-11 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/35 z-fab active:scale-[0.90] transition-transform lg:hidden"
        style={{ zIndex: 30 }}
        onClick={() => navigate('/new-booking')}
      >
        <Plus size={ICON_SIZES.md} color="white" />
      </button>

      <MaintenanceModal />
      <BookingEditModal />
      {quickBookingDate && (
        <QuickBookingModal date={quickBookingDate} onClose={() => setQuickBookingDate(null)} />
      )}
      {datePickerOpen && (
        <YearMonthPickerModal
          currentYear={currentYear}
          currentMonth={currentMonth}
          onConfirm={(y, m) => setMonth(y, m)}
          onClose={() => setDatePickerOpen(false)}
        />
      )}
    </div>
  );
};

export default CalendarPage;
