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
import type { BookingBar } from '../../components/CalendarGrid/useBookingBars';
import type { GridCell } from '../../components/CalendarGrid/CalendarGrid';
import { SectionTitle, CardTitle, Body } from '../../components/ui/Typography';

const PROPERTIES = [
  { id: 'ojorok', name: '오조록' },
  { id: 'prop2', name: '숙소2' },
  { id: 'prop3', name: '숙소3' }
];

// ── 순수 헬퍼 ────────────────────────────────────────────────────

function offsetMonth(year: number, month: number, delta: number): [number, number] {
  let m = month + delta;
  let y = year;
  if (m < 0)  { m = 11; y--; }
  if (m > 11) { m = 0;  y++; }
  return [y, m];
}

function buildCalendarGrid(year: number, month: number): GridCell[] {
  const firstDay       = new Date(year, month, 1).getDay();
  const daysInMonth    = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const [py, pm] = offsetMonth(year, month, -1);
  const [ny, nm] = offsetMonth(year, month,  1);
  const cells: GridCell[] = [];

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
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      cells.push({
        day: i,
        isCurrentMonth: false,
        dateStr: `${ny}-${String(nm + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
      });
    }
  }
  return cells;
}

// ── Component ────────────────────────────────────────────────────

const CalendarPage = () => {
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const {
    bookings, maintenance, currentYear, currentMonth,
    nextMonth, prevMonth, goToday, setMonth, openBookingModal, openEditMaintModal,
  } = useStore();

  const { open: openSidebar } = useSidebar();

  const [quickBookingDate, setQuickBookingDate] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const today    = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [selectedProperties, setSelectedProperties] = useState<string[]>(['ojorok', 'prop2', 'prop3']);
  const toggleProperty = (id: string) =>
    setSelectedProperties(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );

  // ── 3개월 그리드 ────────────────────────────────────────────────
  const [prevYear,  prevMonthIdx]  = useMemo(() => offsetMonth(currentYear, currentMonth, -1), [currentYear, currentMonth]);
  const [nextYear,  nextMonthIdx]  = useMemo(() => offsetMonth(currentYear, currentMonth,  1), [currentYear, currentMonth]);

  const prevGrid    = useMemo(() => buildCalendarGrid(prevYear,    prevMonthIdx),  [prevYear,    prevMonthIdx]);
  const currentGrid = useMemo(() => buildCalendarGrid(currentYear, currentMonth),  [currentYear, currentMonth]);
  const nextGrid    = useMemo(() => buildCalendarGrid(nextYear,    nextMonthIdx),  [nextYear,    nextMonthIdx]);

  // 각 달 예약 바 (hook 3회 호출 순서 보장)
  const prevBars    = useBookingBars(bookings, maintenance, prevGrid);
  const currentBars = useBookingBars(bookings, maintenance, currentGrid);
  const nextBars    = useBookingBars(bookings, maintenance, nextGrid);

  // 숙소 필터 적용
  const panels = useMemo(() => {
    const show = selectedProperties.includes('ojorok');
    return {
      prev:    { grid: prevGrid,    bars: show ? prevBars    : [] as BookingBar[] },
      current: { grid: currentGrid, bars: show ? currentBars : [] as BookingBar[] },
      next:    { grid: nextGrid,    bars: show ? nextBars    : [] as BookingBar[] },
    };
  }, [prevGrid, currentGrid, nextGrid, prevBars, currentBars, nextBars, selectedProperties]);

  // ── 다가오는 예약 ────────────────────────────────────────────────
  const upcomingStays = useMemo(() =>
    bookings
      .filter(b => new Date(b.checkIn) >= new Date(todayStr))
      .sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime())
      .slice(0, 5),
    [bookings, todayStr]
  );

  const handleDateClick = (cell: GridCell) => {
    if (!cell.isCurrentMonth || !cell.dateStr) return;
    setQuickBookingDate(cell.dateStr);
  };

  const handleBarClick = (e: React.MouseEvent, bar: BookingBar) => {
    e.stopPropagation();
    if (bar.type === 'booking') openBookingModal(String(bar.id));
    else openEditMaintModal(String(bar.id));
  };

  return (
    <div className="pt-2 relative">

      {/* ── Header ── */}
      <div className="px-3 mb-2">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <button
              className="p-1 -ml-1 text-foreground"
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
          {PROPERTIES.map(prop => {
            const isSelected = selectedProperties.includes(prop.id);
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

        {/* FAB — 작게 조정 */}
        <button
          className="fixed right-5 bottom-nav-clear w-11 h-11 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/35 z-fab active:scale-[0.90] transition-transform lg:absolute lg:right-8 lg:bottom-8"
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
