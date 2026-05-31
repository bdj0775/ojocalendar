import { useNavigate, useLocation } from 'react-router-dom';
import { useSidebar } from '../../context/SidebarContext';
import { useStore } from '../../store/useStore';
import { useEffect, useState, useMemo, useRef } from 'react';
import { GripVertical } from 'lucide-react';
import type { Booking, Property } from '../../types';
import PropertyDetailModal from '../Modals/PropertyDetailModal';
import { PROP_COLORS } from '../CalendarGrid/useBookingBars';

// ── MiniCalendar ─────────────────────────────────────────────────

interface MiniCalendarProps {
  currentYear: number;
  currentMonth: number;
  bookings: Booking[];
  properties: Property[];
  setMonth: (year: number, month: number) => void;
  onNavigate: (path: string) => void;
}

const MiniCalendar = ({ currentYear, currentMonth, bookings, properties, setMonth, onNavigate }: MiniCalendarProps) => {
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

  const getBookedColors = (d: number, monthOffset: number): string[] => {
    const dateObj = new Date(currentYear, currentMonth + monthOffset, d);
    const dateStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    const colors: string[] = [];
    properties.forEach((prop, idx) => {
      const occupied = bookings.some(b => b.propertyId === prop.id && b.checkIn <= dateStr && b.checkOut > dateStr);
      if (occupied) colors.push(prop.color || PROP_COLORS[idx % PROP_COLORS.length]);
    });
    return colors.slice(0, 3);
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
          const dotColors = getBookedColors(item.date, item.monthOffset);
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
              {dotColors.length > 0 && (
                <div className="flex gap-[2px] absolute bottom-0">
                  {dotColors.map((c, di) => (
                    <div key={di} className="w-1 h-1 rounded-full" style={{ backgroundColor: c }} />
                  ))}
                </div>
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
    properties, settings, logout, deleteAccount,
    currentYear, currentMonth, prevMonth, nextMonth, setMonth, bookings,
    userProfile, triggerSync, syncLoading,
    visiblePropertyIds, setVisiblePropertyIds, updateProperty, deleteProperty, updateSettings,
    propertyOrder, setPropertyOrder,
  } = useStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  // ── 숙소 정렬 ──────────────────────────────────────────────────
  const sortedProperties = useMemo(() => {
    if (!propertyOrder.length) return properties;
    const orderMap = new Map(propertyOrder.map((id, i) => [id, i]));
    return [...properties].sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));
  }, [properties, propertyOrder]);

  // ── 드래그 순서 변경 ───────────────────────────────────────────
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId,  setDragOverId]  = useState<string | null>(null);
  const propItemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const onGripTouchStart = (e: React.TouchEvent, propId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingId(propId);
  };
  const onListTouchMove = (e: React.TouchEvent) => {
    if (!draggingId) return;
    const touch = e.touches[0];
    for (const [id, el] of Object.entries(propItemRefs.current)) {
      if (!el || id === draggingId) continue;
      const rect = el.getBoundingClientRect();
      if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        setDragOverId(id);
        break;
      }
    }
  };
  const onListTouchEnd = () => {
    if (draggingId && dragOverId) {
      const ids = sortedProperties.map(p => p.id);
      const from = ids.indexOf(draggingId);
      const to   = ids.indexOf(dragOverId);
      const newOrder = [...ids];
      newOrder.splice(from, 1);
      newOrder.splice(to, 0, draggingId);
      setPropertyOrder(newOrder);
    }
    setDraggingId(null);
    setDragOverId(null);
  };


  // KPI for current month — lightweight, no forecast computation
  const kpi = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const validBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'checked in' || b.status === 'completed');
    const getOverlapNights = (inD: string, outD: string, y: number, m: number) => {
        const mStart = new Date(y, m, 1, 12, 0, 0);
        const mEnd = new Date(y, m + 1, 1, 12, 0, 0);
        const bStart = new Date(inD + 'T12:00:00');
        const bEnd = new Date(outD + 'T12:00:00');
        const overlapStart = bStart > mStart ? bStart : mStart;
        const overlapEnd = bEnd < mEnd ? bEnd : mEnd;
        return overlapStart >= overlapEnd ? 0 : Math.round((overlapEnd.getTime() - overlapStart.getTime()) / 86400000);
    };

    let gross = 0, otaComm = 0;
    const occupiedDates = new Set<string>();

    validBookings
      .filter(b => getOverlapNights(b.checkIn, b.checkOut, currentYear, currentMonth) > 0)
      .forEach(b => {
        const mStart = new Date(currentYear, currentMonth, 1, 12, 0, 0);
        const mEnd = new Date(currentYear, currentMonth + 1, 1, 12, 0, 0);
        const bStart = new Date(b.checkIn + 'T12:00:00');
        const bEnd = new Date(b.checkOut + 'T12:00:00');
        const overlapStart = bStart > mStart ? bStart : mStart;
        const overlapEnd = bEnd < mEnd ? bEnd : mEnd;
        const n = overlapStart >= overlapEnd ? 0 : Math.round((overlapEnd.getTime() - overlapStart.getTime()) / 86400000);
        
        const totalNights = Math.max(1, Math.round((bEnd.getTime() - bStart.getTime()) / 86400000));
        const amount = Number(b.amount) || 0;
        
        if (n > 0) {
          let cur = new Date(overlapStart);
          while (cur < overlapEnd) {
            occupiedDates.add(`${cur.getFullYear()}-${cur.getMonth()}-${cur.getDate()}`);
            cur.setDate(cur.getDate() + 1);
          }
          const gPortion = (amount / totalNights) * n;
          gross += gPortion;
          if (b.channel !== 'Direct') {
            const cRate = b.commission || 0;
            otaComm += gPortion * (cRate / 100);
          }
        }
      });

    const occNights = occupiedDates.size;
    return {
      occupancyRate: Math.min(100, Math.round((occNights / daysInMonth) * 100)),
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
    const allIds = properties.map(p => p.id);
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
    <>
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
            <div className="flex items-center gap-2 mb-0.5">
              <img src="/logo-mark.png" alt="OZO Calendar" className="w-7 h-7" />
              <span className="text-[16px] font-extrabold text-foreground tracking-tight">
                OZO <span className="font-light text-muted-foreground">Calendar</span>
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground/80 truncate">
              {settings?.profileName || '호스트 이름'} ({userProfile?.email || 'email@example.com'})
            </p>
          </div>

          {/* Properties List */}
          <div className="mb-2">
            <div
              className="flex flex-col gap-0.5 relative"
              onTouchMove={draggingId ? onListTouchMove : undefined}
              onTouchEnd={draggingId ? onListTouchEnd : undefined}
            >
              {sortedProperties.map((prop, index) => {
                const color = prop.color || PROP_COLORS[index % PROP_COLORS.length];
                const isChecked  = visiblePropertyIds === null || visiblePropertyIds.includes(prop.id);
                const isMenuOpen = openMenuId === prop.id;
                const isDragging = draggingId === prop.id;
                const isDragOver = dragOverId  === prop.id;

                return (
                  <div
                    key={prop.id}
                    ref={el => { propItemRefs.current[prop.id] = el; }}
                    className={`relative group transition-all ${isDragging ? 'opacity-40' : ''} ${isDragOver ? 'ring-1 ring-primary/40 rounded-lg' : ''}`}
                  >
                    <div
                      className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                      onClick={(e) => !isDragging && toggleCheck(e, prop.id)}
                    >
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        {/* Drag handle */}
                        <div
                          className="text-muted-foreground/30 hover:text-muted-foreground/70 flex-shrink-0 cursor-grab active:cursor-grabbing touch-none"
                          onTouchStart={(e) => onGripTouchStart(e, prop.id)}
                        >
                          <GripVertical size={12} />
                        </div>
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
                      <div className="absolute right-2 top-full mt-1 w-36 bg-popover border border-border rounded-xl shadow-lg z-50 p-2 flex flex-col gap-1.5" onMouseDown={e => e.stopPropagation()}>
                        <button
                          className="text-[11px] text-left px-2 py-1.5 rounded-md hover:bg-muted text-foreground transition-colors font-medium"
                          onClick={(e) => { e.stopPropagation(); setEditingProperty(prop); setOpenMenuId(null); }}
                        >
                          설정
                        </button>
                        <div className="h-px bg-border/50 -mx-2" />
                        <p className="text-[10px] font-semibold text-muted-foreground px-1 pt-0.5">인디케이터 색상</p>
                        <div className="px-1 py-0.5 flex gap-2 flex-wrap">
                          {PROP_COLORS.map(c => {
                            const isActive = (prop.color || PROP_COLORS[index % PROP_COLORS.length]) === c;
                            return (
                              <button
                                key={c}
                                className="w-5 h-5 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                                style={{ backgroundColor: c, boxShadow: isActive ? `0 0 0 2px var(--popover), 0 0 0 3.5px ${c}` : 'none' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateProperty(prop.id, { ...prop, color: c });
                                  setOpenMenuId(null);
                                }}
                              >
                                {isActive && <span className="text-white text-[9px] font-bold leading-none">✓</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          <div className="flex items-center mt-0.5">
            <button
              onClick={() => handleNav('/settings')}
              className="text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors flex-1 text-left px-2 py-1.5"
            >
              + 추가하기
            </button>
            <button
              onClick={() => updateSettings({ eventColorMode: (settings?.eventColorMode ?? 'channel') === 'channel' ? 'property' : 'channel' })}
              className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted transition-colors shrink-0"
              title="이벤트 색상 모드 전환"
            >
              {(['channel', 'property'] as const).map(m => {
                const active = (settings?.eventColorMode ?? 'channel') === m;
                return (
                  <span key={m} className={`text-[10px] font-semibold transition-colors ${active ? 'text-primary' : 'text-muted-foreground/40'}`}>
                    {m === 'channel' ? '채널' : '숙소'}
                  </span>
                );
              })}
            </button>
          </div>
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
                properties={sortedProperties}
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
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-[11px] text-muted-foreground/40 hover:text-destructive transition-colors"
            >
              회원탈퇴
            </button>
          </div>
        </div>
      </div>
    </div>

    {showDeleteConfirm && (
      <div className="fixed inset-0 z-[300] bg-black/50 flex items-end justify-center p-4">
        <div className="w-full max-w-sm bg-card rounded-2xl p-6 flex flex-col gap-4 shadow-xl">
          <div className="flex flex-col gap-1">
            <p className="text-base font-bold text-foreground">정말 탈퇴하시겠어요?</p>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              예약, 숙소, 채널 연결 등 모든 데이터가 즉시 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                try { await deleteAccount(); close(); }
                catch { setDeleting(false); setShowDeleteConfirm(false); }
              }}
              className="w-full py-3.5 rounded-xl bg-destructive text-white text-[13px] font-semibold disabled:opacity-50"
            >
              {deleting ? '삭제 중...' : '탈퇴하기'}
            </button>
            <button
              disabled={deleting}
              onClick={() => setShowDeleteConfirm(false)}
              className="w-full py-3 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    )}

    {editingProperty && (
      <PropertyDetailModal
        isOpen
        property={editingProperty}
        onClose={() => setEditingProperty(null)}
        onSave={(propId, data) => {
          if (propId) updateProperty(propId, data);
          setEditingProperty(null);
        }}
        onDelete={() => {
          const id = editingProperty.id;
          setEditingProperty(null);
          deleteProperty(id);
        }}
      />
    )}
    </>
  );
};

export default MobileSidebar;
