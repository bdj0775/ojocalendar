import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import CalendarGrid from '../../components/CalendarGrid/CalendarGrid';
import { useBookingBars } from '../../components/CalendarGrid/useBookingBars';
import type { Booking, Property, Channel, BookingStatus } from '../../types';

// 회원 데이터를 "보기만" 하는 화면이라 클릭 핸들러를 의도적으로 비워둠 (수정 불가)
const noop = () => {};

function buildCalendarGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const cells: { day: number; isCurrentMonth: boolean; dateStr: string }[] = [];
  const pad = (n: number) => String(n).padStart(2, '0');

  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const [py, pm] = month === 0 ? [year - 1, 11] : [year, month - 1];
    cells.push({ day: d, isCurrentMonth: false, dateStr: `${py}-${pad(pm + 1)}-${pad(d)}` });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, isCurrentMonth: true, dateStr: `${year}-${pad(month + 1)}-${pad(d)}` });
  }
  for (let i = 1; cells.length < 42; i++) {
    const [ny, nm] = month === 11 ? [year + 1, 0] : [year, month + 1];
    cells.push({ day: i, isCurrentMonth: false, dateStr: `${ny}-${pad(nm + 1)}-${pad(i)}` });
  }
  return cells;
}

// admin-user-lookup이 돌려주는 DB 원본 행(snake_case) — 화면 렌더링용으로만 camelCase 모델에 매핑
interface RawProperty { id: string; name: string; color?: string | null; }
interface RawBooking {
  id: string; property_id: string; guestname: string; checkin: string; checkout: string;
  guests: number; infants: number; nationality: string; channel: string; amount: number;
  commission: number; status: string;
}

interface AdminCalendarPreviewProps {
  properties: RawProperty[];
  bookings: RawBooking[];
}

const AdminCalendarPreview = ({ properties, bookings }: AdminCalendarPreviewProps) => {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());

  const todayStr = useMemo(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  }, []);

  const calendarGrid = useMemo(() => buildCalendarGrid(year, month), [year, month]);

  const mappedProperties: Property[] = useMemo(() => properties.map(p => ({
    id: p.id, name: p.name, color: p.color ?? undefined,
    baseGuests: 2, basePrice: 0, weekendPrice: 0, extraGuestFee: 0,
    noExtraGuestFee: false, checkInTime: '15:00', checkOutTime: '11:00', cleaningFee: 0,
  })), [properties]);

  const mappedBookings: Booking[] = useMemo(() => bookings.map(b => ({
    id: b.id, propertyId: b.property_id, guestName: b.guestname,
    checkIn: b.checkin, checkOut: b.checkout, guests: b.guests, infants: b.infants,
    nationality: b.nationality, channel: b.channel as Channel, status: b.status as BookingStatus,
    amount: b.amount, commission: b.commission,
  })), [bookings]);

  const bookingBars = useBookingBars(mappedBookings, calendarGrid, mappedProperties);

  const goPrev = () => setMonth(m => { if (m === 0) { setYear(y => y - 1); return 11; } return m - 1; });
  const goNext = () => setMonth(m => { if (m === 11) { setYear(y => y + 1); return 0; } return m + 1; });

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-muted">
        <button onClick={goPrev} className="p-1 rounded-md hover:bg-card text-muted-foreground">
          <ChevronLeft size={16} />
        </button>
        <span className="text-[13px] font-semibold text-foreground">{year}년 {month + 1}월</span>
        <button onClick={goNext} className="p-1 rounded-md hover:bg-card text-muted-foreground">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="text-[10px] text-center text-muted-foreground py-1 bg-muted/50">
        읽기 전용 미리보기 — 클릭해도 수정되지 않습니다
      </div>
      <div className="overflow-x-auto">
        <CalendarGrid
          calendarGrid={calendarGrid}
          bookingBars={bookingBars}
          todayStr={todayStr}
          onDateClick={noop}
          onBarClick={noop}
        />
      </div>
    </div>
  );
};

export default AdminCalendarPreview;
