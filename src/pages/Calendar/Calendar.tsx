import { useMemo, useState } from 'react';
import { Plus, User, ChevronLeft, ChevronRight, Menu, ChevronDown } from 'lucide-react';
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
import { useBookingBars } from '../../components/CalendarGrid/useBookingBars';
import { SectionTitle, CardTitle, Body } from '../../components/ui/Typography';

// Test-only placeholder properties (no real bookings)
const TEST_PROPERTIES = [
  { id: '__test_prop_2__', name: '숙소2' },
  { id: '__test_prop_3__', name: '숙소3' },
];

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

// ── Component ────────────────────────────────────────────────────

const CalendarPage = () => {
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const {
    bookings, maintenance, currentYear, currentMonth, properties,
    nextMonth, prevMonth, goToday, setMonth, openBookingModal, openEditMaintModal,
    visiblePropertyIds, setVisiblePropertyIds,
  } = useStore();

  const { open: openSidebar } = useSidebar();

  const [quickBookingDate, setQuickBookingDate] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const today    = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Combined property list: real (deduped by store) + test placeholders
  const allProperties = useMemo(
    () => [...properties, ...TEST_PROPERTIES],
    [properties],
  );

  const toggleProperty = (id: string) => {
    const allIds = allProperties.map(p => p.id);
    const current = visiblePropertyIds ?? allIds;
    const next = current.includes(id)
      ? current.filter(x => x !== id)
      : [...current, id];
    setVisiblePropertyIds(next.length === allIds.length ? null : next);
  };

  // Filter bookings and maintenance by visible properties before bar computation
  const visibleBookings = useMemo(
    () => visiblePropertyIds === null
      ? bookings
      : bookings.filter(b => b.propertyId != null && visiblePropertyIds.includes(b.propertyId)),
    [bookings, visiblePropertyIds],
  );

  const visibleMaintenance = useMemo(
    () => visiblePropertyIds === null
      ? maintenance
      : maintenance.filter(m => m.propertyId != null && visiblePropertyIds.includes(m.propertyId)),
    [maintenance, visiblePropertyIds],
  );

  // ── 3개월 그리드 ────────────────────────────────────────────────
  const [prevYear,  prevMonthIdx]  = useMemo(() => offsetMonth(currentYear, currentMonth, -1), [currentYear, currentMonth]);
  const [nextYear,  nextMonthIdx]  = useMemo(() => offsetMonth(currentYear, currentMonth,  1), [currentYear, currentMonth]);

  const prevGrid    = useMemo(() => buildCalendarGrid(prevYear,    prevMonthIdx),  [prevYear,    prevMonthIdx]);
  const currentGrid = useMemo(() => buildCalendarGrid(currentYear, currentMonth),  [currentYear, currentMonth]);
  const nextGrid    = useMemo(() => buildCalendarGrid(nextYear,    nextMonthIdx),  [nextYear,    nextMonthIdx]);

  const prevBars    = useBookingBars(visibleBookings, visibleMaintenance, prevGrid);
  const currentBars = useBookingBars(visibleBookings, visibleMaintenance, currentGrid);
  const nextBars    = useBookingBars(visibleBookings, visibleMaintenance, nextGrid);

  const panels = useMemo(() => ({
    prev:    { grid: prevGrid,    bars: prevBars    },
    current: { grid: currentGrid, bars: currentBars },
    next:    { grid: nextGrid,    bars: nextBars    },
  }), [prevGrid, currentGrid, nextGrid, prevBars, currentBars, nextBars]);

  // ── 다가오는 예약 ────────────────────────────────────────────────
  const upcomingStays = useMemo(() =>
    visibleBookings
      .filter(b => new Date(b.checkIn) >= new Date(todayStr))
      .sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime())
      .slice(0, 5),
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

  return (
    <div className="pt-2 relative w-full">

      {/* ── Header ── */}
      <div className="px-3 mb-2">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <button
              className="p-1 -ml-1 text-foreground lg:hidden"
              onClick={openSidebar}
            >
              <Menu size={24} />
            </button>
            <h1
              className="type-section-title flex items-center gap-1 cursor-pointer text-foreground"
              onClick={() => setDatePickerOpen(true)}
            >
              {language === 'ko'
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

        <div className="flex gap-2 flex-wrap">
          {allProperties.map(prop => {
            const isSelected = visiblePropertyIds === null || visiblePropertyIds.includes(prop.id);
            return (
              <button
                key={prop.id}
                onClick={() => toggleProperty(prop.id)}
                className={`px-3 py-1.5 rounded-full type-micro font-bold transition-colors border ${
                  isSelected
                    ? 'bg-muted text-foreground border-border'
                    : 'bg-transparent text-muted-foreground border-border/50 hover:bg-muted/50'
                }`}
              >
                {prop.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Swipeable Calendar ── */}
      <SwipeableCalendar
        prev={panels.prev}
        current={panels.current}
        next={panels.next}
        todayStr={todayStr}
        onDateClick={handleDateClick}
        onBarClick={handleBarClick}
        onPrev={prevMonth}
        onNext={nextMonth}
      />

      {/* ── Upcoming Stays ── */}
      <section className="px-5 py-6 relative pb-nav-clear text-foreground">
        <SectionTitle className="mb-4">{t('calendar.upcomingStays')}</SectionTitle>

        {upcomingStays.length === 0 && (
          <Body className="text-center py-5 text-muted-foreground">
            {t('calendar.noUpcomingStays')}
          </Body>
        )}

        {upcomingStays.map(stay => (
          <div
            key={stay.id}
            className="bg-card text-card-foreground border border-border/50 rounded-sheet px-4 py-3.5 flex items-center gap-3.5 shadow-sm mb-2.5 cursor-pointer hover:-translate-y-0.5 transition-transform"
            onClick={() => openBookingModal(stay.id)}
          >
            <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <User size={ICON_SIZES.base} color="currentColor" />
            </div>
            <div>
              <CardTitle className="mb-0.5">{stay.guestName}</CardTitle>
              <p className="type-label text-muted-foreground">
                {stay.checkIn} — {stay.checkOut} &bull; {stay.guests}{' '}
                {stay.guests > 1 ? t('calendar.guests') : t('calendar.guest')}
              </p>
            </div>
          </div>
        ))}

        {/* FAB */}
        <button
          className="fixed right-5 bottom-nav-clear w-11 h-11 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/35 z-fab active:scale-[0.90] transition-transform lg:hidden"
          onClick={() => navigate('/new-booking')}
        >
          <Plus size={ICON_SIZES.md} color="white" />
        </button>
      </section>

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
