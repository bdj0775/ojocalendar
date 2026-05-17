import { useMemo, useState } from 'react';
import { Plus, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { ICON_SIZES } from '../../lib/iconSizes';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import NotificationBell from '../../components/Notifications/NotificationBell';
import { useTranslation } from '../../hooks/useTranslation';
import BookingEditModal from '../../components/Modals/BookingEditModal';
import QuickBookingModal from '../../components/Modals/QuickBookingModal';
import MaintenanceModal from '../../components/Modals/MaintenanceModal';
// DayDetailModal, BookingDetailModal — 보류, 렌더링 비활성화
import { PageTitle, SectionTitle, CardTitle, Body } from '../../components/ui/Typography';
import CalendarGrid from '../../components/CalendarGrid/CalendarGrid';
import { useBookingBars } from '../../components/CalendarGrid/useBookingBars';
import type { BookingBar } from '../../components/CalendarGrid/useBookingBars';
import type { GridCell } from '../../components/CalendarGrid/CalendarGrid';

const PROPERTIES = [
  { id: 'ojorok', name: '오조록' },
  { id: 'prop2', name: '숙소2' },
  { id: 'prop3', name: '숙소3' }
];

const CalendarPage = () => {
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const {
    bookings, maintenance, currentYear, currentMonth,
    nextMonth, prevMonth, goToday, openBookingModal, openEditMaintModal,
  } = useStore();

  const [quickBookingDate, setQuickBookingDate] = useState<string | null>(null);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [selectedProperties, setSelectedProperties] = useState<string[]>(['ojorok', 'prop2', 'prop3']);

  const toggleProperty = (id: string) => {
    setSelectedProperties(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const calendarGrid = useMemo<GridCell[]>(() => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
    const cells: GridCell[] = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      const py = currentMonth === 0 ? currentYear - 1 : currentYear;
      const pm = currentMonth === 0 ? 11 : currentMonth - 1;
      const ds = `${py}-${String(pm + 1).padStart(2, '0')}-${String(daysInPrevMonth - i).padStart(2, '0')}`;
      cells.push({ day: daysInPrevMonth - i, isCurrentMonth: false, dateStr: ds });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, isCurrentMonth: true, dateStr: ds });
    }
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const ny = currentMonth === 11 ? currentYear + 1 : currentYear;
        const nm = currentMonth === 11 ? 0 : currentMonth + 1;
        const ds = `${ny}-${String(nm + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        cells.push({ day: i, isCurrentMonth: false, dateStr: ds });
      }
    }
    return cells;
  }, [currentYear, currentMonth]);

  const bookingBars = useBookingBars(bookings, maintenance, calendarGrid);

  const filteredBars = useMemo(() => {
    // 모든 숙소 데이터는 'ojorok' (오조록) 토글에만 해당함
    if (selectedProperties.includes('ojorok')) {
      return bookingBars;
    }
    return [];
  }, [bookingBars, selectedProperties]);

  const upcomingStays = useMemo(() => {
    return bookings
      .filter(b => new Date(b.checkIn) >= new Date(todayStr))
      .sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime())
      .slice(0, 5);
  }, [bookings, todayStr]);

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
    <div className="pt-5 relative">
      {/* ── Header ── */}
      <div className="px-5 mb-5">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <PageTitle className="text-foreground whitespace-nowrap overflow-hidden text-ellipsis">
              {language === 'ko'
                ? `${currentYear}년 ${currentMonth + 1}월`
                : `${new Date(currentYear, currentMonth).toLocaleString('en', { month: 'long' })} ${currentYear}`}
            </PageTitle>
            <NotificationBell />
          </div>
          <div className="flex gap-2 items-center shrink-0">
            {[prevMonth, nextMonth].map((fn, i) => (
              <button
                key={i}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-foreground hover:bg-muted transition-colors shrink-0"
                onClick={fn}
              >
                {i === 0 ? <ChevronLeft size={ICON_SIZES.md} /> : <ChevronRight size={ICON_SIZES.md} />}
              </button>
            ))}
            <button
              className="h-9 px-3.5 type-label font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover transition-colors whitespace-nowrap"
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

      {/* ── Calendar Grid ── */}
      <CalendarGrid
        calendarGrid={calendarGrid}
        bookingBars={filteredBars}
        todayStr={todayStr}
        onDateClick={handleDateClick}
        onBarClick={handleBarClick}
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

        <button
          className="fixed right-5 bottom-nav-clear w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/35 z-fab active:scale-[0.92] transition-transform lg:absolute lg:right-8 lg:bottom-8"
          onClick={() => navigate('/new-booking')}
        >
          <Plus size={ICON_SIZES.base} color="white" />
        </button>
      </section>

      {/* DayDetailModal — 보류, 렌더링 비활성화 */}
      <MaintenanceModal />
      <BookingEditModal />
      {quickBookingDate && (
        <QuickBookingModal date={quickBookingDate} onClose={() => setQuickBookingDate(null)} />
      )}
    </div>
  );
};

export default CalendarPage;
