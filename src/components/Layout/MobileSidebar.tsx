import { useNavigate, useLocation } from 'react-router-dom';
import { useSidebar } from '../../context/SidebarContext';
import { useStore } from '../../store/useStore';
import { useEffect, useState, useMemo } from 'react';
import type { Booking } from '../../types';

const PROP_COLORS = ['#5C6BC0', '#FF7043', '#9CCC65', '#29B6F6', '#26A69A', '#7E57C2'];

// Test-only placeholder properties — same constant as Calendar.tsx
const TEST_PROPERTIES = [
  { id: '__test_prop_2__', name: '숙소2' },
  { id: '__test_prop_3__', name: '숙소3' },
];

// ── MiniCalendar ─────────────────────────────────────────────────

interface MiniCalendarProps {
  currentYear: number;
  currentMonth: number;
  bookings: Booking[];
  setMonth: (year: number, month: number) => void;
  onNavigate: (path: string) => void;
}

const MiniCalendar = ({ currentYear, currentMonth, bookings, setMonth, onNavigate }: MiniCalendarProps) => {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const dates: { date: number; isCurrent: boolean; monthOffset: number }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    dates.push({ date: daysInPrevMonth - i, isCurrent: false, monthOffset: -1 });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    dates.push({ date: i, isCurrent: true, monthOffset: 0 });
  }
  const remainingDays = 42 - dates.length;
  for (let i = 1; i <= remainingDays; i++) {
    dates.push({ date: i, isCurrent: false, monthOffset: 1 });
  }

  const today = new Date();
  const isToday = (d: number, isCurrent: boolean) =>
    isCurrent &&
    currentYear === today.getFullYear() &&
    currentMonth === today.getMonth() &&
    d === today.getDate();

  const hasBooking = (d: number, monthOffset: number) => {
    const dateObj = new Date(currentYear, currentMonth + monthOffset, d);
    const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    return bookings.some(b => b.checkIn <= dateStr && b.checkOut > dateStr);
  };

  const handleDateClick = (e: React.MouseEvent, d: number, monthOffset: number) => {
    e.stopPropagation();
    let targetYear = currentYear;
    let targetMonth = currentMonth + monthOffset;
    if (targetMonth > 11) { targetMonth = 0; targetYear++; }
    else if (targetMonth < 0) { targetMonth = 11; targetYear--; }
    setMonth(targetYear, targetMonth);
    onNavigate('/');
  };

  return (
    <div className="mx-1 mt-1 mb-1 flex flex-col items-center select-none">
      <div className="grid grid-cols-7 w-full mb-1">
        {days.map(d => (
          <div key={d} className="text-[11px] text-center text-muted-foreground font-semibold">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 w-full gap-y-1">
        {dates.map((item, i) => {
          const todayFlag = isToday(item.date, item.isCurrent);
          const booked = hasBooking(item.date, item.monthOffset);
          return (
            <div
              key={i}
              className="flex flex-col justify-center items-center h-7 relative cursor-pointer"
              onClick={(e) => handleDateClick(e, item.date, item.monthOffset)}
            >
              <div className={`flex items-center justify-center w-5 h-5 rounded-full text-[11px] transition-colors ${
                todayFlag
                  ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                  : item.isCurrent
                    ? 'text-foreground hover:bg-background font-medium'
                    : 'text-muted-foreground/30 hover:text-muted-foreground/60'
              }`}>
                {item.date}
              </div>
              {booked && (
                <div className="w-1 h-1 rounded-full bg-primary absolute bottom-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── MobileSidebar ─────────────────────────────────────────────────

const MobileSidebar = () => {
  const { isOpen, close } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    properties, settings, logout,
    currentYear, currentMonth, prevMonth, nextMonth, setMonth, bookings,
    userProfile, triggerSync, syncLoading,
    visiblePropertyIds, setVisiblePropertyIds,
  } = useStore();

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Combined property list: real (deduped by store) + test placeholders
  const allProperties = useMemo(
    () => [...properties, ...TEST_PROPERTIES],
    [properties],
  );

  // KPI for current month — lightweight, no forecast computation
  const kpi = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const mStart = new Date(currentYear, currentMonth, 1, 12, 0, 0);
    const mEnd = new Date(currentYear, currentMonth + 1, 1, 12, 0, 0);
    let gross = 0, occNights = 0, otaComm = 0;

    bookings
      .filter(b => b.status === 'confirmed' || b.status === 'checked in' || b.status === 'completed')
      .forEach(b => {
        const bStart = new Date(b.checkIn + 'T12:00:00');
        const bEnd = new Date(b.checkOut + 'T12:00:00');
        const overlapStart = bStart > mStart ? bStart : mStart;
        const overlapEnd = bEnd < mEnd ? bEnd : mEnd;
        if (overlapStart >= overlapEnd) return;
        const n = Math.round((overlapEnd.getTime() - overlapStart.getTime()) / 86400000);
        if (n <= 0) return;
        const totalNights = Math.max(1, Math.round((bEnd.getTime() - bStart.getTime()) / 86400000));
        const amount = Number(b.amount) || 0;
        const gPortion = (amount / totalNights) * n;
        const commRate = b.commission || 0;
        gross += gPortion;
        if (b.channel !== 'Direct') otaComm += gPortion * (commRate / 100);
        occNights += n;
      });

    return {
      occupancyRate: Math.round((occNights / daysInMonth) * 100),
      grossRevenue: Math.round(gross),
      adrThisMonth: occNights === 0 ? 0 : Math.round(gross / occNights),
      otaCommission: Math.round(otaComm),
    };
  }, [bookings, currentYear, currentMonth]);

  // Close open property menu on outside click
  useEffect(() => {
    if (!openMenuId) return;
    const handler = () => setOpenMenuId(null);
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenuId]);

  const handleLogout = async () => {
    await logout();
    close();
    navigate('/login');
  };

  const handleNav = (path: string) => {
    navigate(path);
    close();
  };

  const toggleCheck = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const allIds = allProperties.map(p => p.id);
    const current = visiblePropertyIds ?? allIds;
    const next = current.includes(id)
      ? current.filter(x => x !== id)
      : [...current, id];
    setVisiblePropertyIds(next.length === allIds.length ? null : next);
  };

  const toggleMenu = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    setOpenMenuId(openMenuId === id ? null : id);
  };

  const handleSync = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerSync();
  };

  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/';

  const headerCls = "text-[13px] font-bold text-foreground/50 mb-2 px-1";
  const containerCls = (path: string) =>
    `p-2 rounded-xl transition-colors cursor-pointer group ${
      location.pathname === path
        ? 'bg-muted border border-transparent'
        : 'hover:bg-muted border border-transparent'
    }`;

  return (
    <div
      className={`fixed inset-0 z-[100] flex lg:hidden transition-opacity duration-300 ${
        isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <div className="absolute inset-0 bg-black/40" onClick={close} />

      <div
        className={`relative flex flex-col w-[280px] h-full bg-card shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col pt-6 pb-6 px-3">

          <div className="mb-4 px-2">
            <h1 className="text-[16px] font-bold text-foreground tracking-tight mb-0.5">
              Ojo Calendar <span className="text-[10px] font-normal text-muted-foreground ml-1">(가칭)</span>
            </h1>
            <p className="text-[10px] text-muted-foreground/80 truncate">
              {settings?.profileName || '호스트 이름'} ({userProfile?.email || 'email@example.com'})
            </p>
          </div>

          {/* Properties List */}
          <div className="mb-2">
            <div className="flex flex-col gap-0.5 relative">
              {allProperties.map((prop, index) => {
                const color = PROP_COLORS[index % PROP_COLORS.length];
                const isChecked = visiblePropertyIds === null || visiblePropertyIds.includes(prop.id);
                const isMenuOpen = openMenuId === prop.id;

                return (
                  <div key={prop.id} className="relative group">
                    <div
                      className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                      onClick={(e) => toggleCheck(e, prop.id)}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div
                          className="w-[16px] h-[16px] rounded flex items-center justify-center flex-shrink-0 transition-colors border"
                          style={{
                            backgroundColor: isChecked ? color : 'transparent',
                            borderColor: isChecked ? color : 'var(--border)',
                          }}
                        >
                          {isChecked && <span className="text-white text-[10px] leading-none select-none">✓</span>}
                        </div>
                        <span className={`text-[12px] truncate transition-colors ${isChecked ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                          {prop.name}
                        </span>
                      </div>
                      <button
                        onClick={(e) => toggleMenu(e, prop.id)}
                        className="text-muted-foreground/50 hover:text-foreground transition-colors px-1 rounded-md hover:bg-background font-bold text-[14px] leading-none pb-1"
                      >
                        ···
                      </button>
                    </div>

                    {isMenuOpen && (
                      <div className="absolute right-2 top-full mt-1 w-32 bg-popover border border-border rounded-xl shadow-lg z-50 p-2 flex flex-col gap-1">
                        <button className="text-[11px] text-left px-2 py-1.5 rounded-md hover:bg-muted text-foreground transition-colors">설정</button>
                        <div className="px-2 py-1 flex gap-1.5 flex-wrap">
                          {PROP_COLORS.map(c => (
                            <div key={c} className="w-3.5 h-3.5 rounded-full cursor-pointer hover:scale-110 transition-transform" style={{ backgroundColor: c }} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => handleNav('/settings')}
              className="text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors w-full text-left px-2 py-1.5 mt-0.5"
            >
              + 추가하기
            </button>
          </div>

          <div className="h-px bg-border/20 w-full my-1" />

          {/* Navigation */}
          <div className="flex flex-col gap-1.5 mt-2">

            {/* Calendar Section */}
            <div className={containerCls('/')} onClick={() => handleNav('/')}>
              <h2 className={headerCls}>달력</h2>
              <div className="flex items-center justify-between mb-1 px-2">
                <span className="text-[12px] font-bold text-foreground">
                  {currentYear}년 {currentMonth + 1}월
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-muted-foreground font-bold text-[12px] select-none">
                    <button onClick={(e) => { e.stopPropagation(); prevMonth(); }} className="hover:text-foreground cursor-pointer px-1">&lt;</button>
                    <button onClick={(e) => { e.stopPropagation(); nextMonth(); }} className="hover:text-foreground cursor-pointer px-1">&gt;</button>
                  </div>
                  {isDashboard && (
                    <button
                      onClick={handleSync}
                      disabled={syncLoading}
                      className="text-[10px] text-primary bg-primary/10 px-2 py-1 rounded-md font-semibold hover:bg-primary/20 transition-colors ml-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {syncLoading ? '동기화 중…' : '동기화하기'}
                    </button>
                  )}
                </div>
              </div>
              <MiniCalendar
                currentYear={currentYear}
                currentMonth={currentMonth}
                bookings={bookings}
                setMonth={setMonth}
                onNavigate={handleNav}
              />
            </div>

            {/* Dashboard Section */}
            <div className={containerCls('/dashboard')} onClick={() => handleNav('/dashboard')}>
              <h2 className={headerCls}>대시보드</h2>
              <div className="mx-1 mt-1 bg-card rounded-xl border border-border/50 p-3 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] transition-all flex flex-col gap-3">
                <div className="flex gap-4 items-center">
                  <div className="relative w-11 h-11 rounded-full border-4 border-primary/20 flex items-center justify-center flex-shrink-0" style={{ borderTopColor: 'var(--primary)', borderRightColor: 'var(--primary)' }}>
                    <span className="text-[10px] font-bold text-foreground">{kpi.occupancyRate}%</span>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-muted-foreground">매출</span>
                      <span className="text-[12px] font-bold text-foreground text-right">{kpi.grossRevenue.toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-muted-foreground">ADR</span>
                      <span className="text-[12px] font-bold text-foreground text-right">{kpi.adrThisMonth.toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-muted-foreground">수수료</span>
                      <span className="text-[12px] font-bold text-foreground text-right">{kpi.otaCommission.toLocaleString()}원</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bookings Section */}
            <div className={containerCls('/bookings')} onClick={() => handleNav('/bookings')}>
              <h2 className={headerCls}>예약 목록</h2>
            </div>

          </div>
        </div>

        {/* Bottom Actions */}
        <div className="mt-auto px-5 pb-6 pt-4 bg-card z-10 flex flex-col gap-2 border-t border-border/20">
          <button
            onClick={() => handleNav('/settings')}
            className="w-full text-left py-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-[12px] font-medium px-2"
          >
            설정
          </button>
          <div className="flex items-center justify-between px-2 mt-0.5">
            <button
              onClick={handleLogout}
              className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
            >
              로그아웃
            </button>
            <span className="text-[10px] text-muted-foreground/40">v1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileSidebar;
