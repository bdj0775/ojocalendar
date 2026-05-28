import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { CELL_HEIGHT } from '../../components/CalendarGrid/CalendarGrid';
import { Plus, ChevronLeft, ChevronRight, Menu, ChevronDown } from 'lucide-react';
import { useSidebar } from '../../context/SidebarContext';
import { ICON_SIZES } from '../../lib/iconSizes';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import NotificationBell from '../../components/Notifications/NotificationBell';
import { useTranslation } from '../../hooks/useTranslation';
import BookingEditModal from '../../components/Modals/BookingEditModal';
import CompactQuickBookingModal from '../../components/Modals/CompactQuickBookingModal';
import MaintenanceModal from '../../components/Modals/MaintenanceModal';
import YearMonthPickerModal from '../../components/Modals/YearMonthPickerModal';
import SwipeableCalendar from '../../components/CalendarGrid/SwipeableCalendar';
import { useBookingBars, PROP_COLORS, BAR_OFFSET_Y, type BookingBar } from '../../components/CalendarGrid/useBookingBars';
import { Body } from '../../components/ui/Typography';
import UpcomingBookingCard from '../../components/Calendar/UpcomingBookingCard';

// ── 순수 헬퍼 ────────────────────────────────────────────────────

const addDays = (ds: string, n: number) => {
  const [y, m, d] = ds.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

const diffDays = (from: string, to: string) =>
  Math.max(0, Math.round((new Date(to + 'T00:00:00').getTime() - new Date(from + 'T00:00:00').getTime()) / 86400000));

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

const SNAP_SEQ = ['hidden', 'half', 'full'] as const;
type SnapState = typeof SNAP_SEQ[number];

const DOW_LABELS: Record<string, string[]> = {
  en: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
  ko: ['일', '월', '화', '수', '목', '금', '토'],
};

function getSnapY(snap: SnapState, sheetH: number): number {
  if (snap === 'hidden') return sheetH;          // 완전히 화면 밖
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

  const [quickBookingAnchor, setQuickBookingAnchor] = useState<{ date: string; rect: DOMRect } | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // ── 프리뷰 바: 모달이 열린 동안 입력 중인 날짜를 달력에 미리 표시 ──────
  const [previewDates, setPreviewDates] = useState<{
    checkIn: string;
    checkOut: string;
    channel: string;
    propertyId: string;
  } | null>(null);

  // 안정적인 콜백 참조 (모달의 useLayoutEffect dep에 들어가므로 참조 안정성 필수)
  const handlePreviewChange = useCallback(
    (ci: string, co: string, ch: string, pid: string) => {
      setPreviewDates({ checkIn: ci, checkOut: co, channel: ch, propertyId: pid });
      const { visiblePropertyIds, setVisiblePropertyIds } = useStore.getState();
      if (visiblePropertyIds !== null && pid && !visiblePropertyIds.includes(pid)) {
        setVisiblePropertyIds([...visiblePropertyIds, pid]);
      }
    },
    [],
  );
  const handleQuickBookingClose = useCallback(() => {
    setQuickBookingAnchor(null);
    setPreviewDates(null);
  }, []);

  // ── 바텀시트 상태 ──────────────────────────────────────────────
  const [snap, setSnap] = useState<SnapPoint>('hidden');
  const dragStartY  = useRef<number | null>(null);
  const [dragDy, setDragDy] = useState(0);
  const outerDrag = useRef<{ y: number; x: number; dir: 'h' | 'v' | null } | null>(null);

  const sheetH = () => window.innerHeight - 56;

  const baseY    = getSnapY(snap, sheetH());
  const clampedY = Math.max(0, Math.min(sheetH(), baseY + dragDy));

  // ── 달력 영역 높이 측정 → 행 경계에서 정확히 클립 ──────────────
  const calAreaRef = useRef<HTMLDivElement>(null);
  const [calAreaH, setCalAreaH] = useState(0);
  useEffect(() => {
    const el = calAreaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setCalAreaH(entry.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // 가용 높이를 CELL_HEIGHT 배수로 스냅 → 마지막 행이 절반만 보이는 일 없음
  const clipH = calAreaH > 0 ? Math.floor(calAreaH / CELL_HEIGHT) * CELL_HEIGHT : undefined;

  // ── 달력 전환 계산 — 3-레이어 슬라이드 + 페이드 ──────────────────
  // 바 레이어(hideNumbers): 0→0.65 페이드아웃 + 슬라이드업
  // 숫자 레이어(numbersOnly): 항상 opacity 1, calProgress 0.5에서 compact 전환
  // 도트 레이어(hideNumbers+compact): 0.35→1 페이드인 + 슬라이드업 (바와 0.35-0.65 구간 중첩)
  const sheetVisible = Math.max(0, sheetH() - clampedY);
  const calProgress  = Math.min(1, sheetVisible / (sheetH() * 0.5));
  const SLIDE_PX = 26;

  const fullPhase       = Math.max(0, Math.min(1, calProgress / 0.65));
  const fullOpacity     = 1 - fullPhase;
  const fullTranslateY  = -fullPhase * SLIDE_PX;

  const compactPhase      = Math.max(0, Math.min(1, (calProgress - 0.35) / 0.65));
  const compactOpacity    = compactPhase;
  const compactTranslateY = (1 - compactPhase) * SLIDE_PX;

  // 숫자 레이어: calProgress 0.5 기준으로 compact 전환 (instant, no fade)
  const numCompact = calProgress >= 0.5;

  const calTransition = dragDy === 0 ? 'opacity 260ms ease, transform 260ms ease' : 'none';

  // 시트 자체 드래그 (시트가 보일 때)
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
    if (dy < 0 && i < 2) setSnap(SNAP_SEQ[i + 1]);
    else if (dy > 0 && i > 0) setSnap(SNAP_SEQ[i - 1]);
  };

  // 달력 영역 터치: 위로 스와이프 → 시트 열기, 아래로 스와이프 → 시트 닫기
  const onOuterTouchStart = (e: React.TouchEvent) => {
    outerDrag.current = { y: e.touches[0].clientY, x: e.touches[0].clientX, dir: null };
  };
  const onOuterTouchMove = (e: React.TouchEvent) => {
    if (!outerDrag.current) return;
    const s = outerDrag.current;
    const dy = e.touches[0].clientY - s.y;
    const dx = Math.abs(e.touches[0].clientX - s.x);
    if (s.dir === null) {
      if (Math.abs(dy) < 6 && dx < 6) return;
      s.dir = Math.abs(dy) >= dx ? 'v' : 'h';
    }
    if (s.dir !== 'v') return;
    if (snap === 'hidden' && dy < 0) setDragDy(dy);       // 위로 → 열기 예비 드래그
    else if (snap !== 'hidden' && dy > 0) setDragDy(dy);  // 아래로 → 닫기 예비 드래그
  };
  const onOuterTouchEnd = (e: React.TouchEvent) => {
    if (!outerDrag.current) return;
    const s = outerDrag.current;
    outerDrag.current = null;
    if (s.dir !== 'v') { setDragDy(0); return; }
    const finalDy = e.changedTouches[0].clientY - s.y;
    setDragDy(0);
    if (snap === 'hidden' && finalDy < -50) setSnap('half');
    else if (snap !== 'hidden' && finalDy > 50) setSnap('hidden');
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

  // ── 프리뷰 바 계산 — 현재 월 그리드에만 적용 ────────────────────────────
  const CHANNEL_STYLES_MAP: Record<string, string> = {
    Airbnb:        'airbnb',
    'Booking.com': 'bookingcom',
    Direct:        'direct',
    Naver:         'naver',
  };

  const previewBars = useMemo<BookingBar[]>(() => {
    if (!previewDates || !currentGrid.length) return [];
    const { checkIn: ci, checkOut: co, channel, propertyId } = previewDates;
    if (ci >= co) return [];

    // 채널 클래스 결정
    const channelClass = CHANNEL_STYLES_MAP[channel] ?? 'airbnb';

    // 숙소 슬롯 인덱스 및 색상 결정
    const slotIndex = (() => {
      if (!propertyId || !visibleProperties.length) return 0;
      const idx = visibleProperties.findIndex(p => p.id === propertyId);
      return idx >= 0 ? Math.min(idx, 2) : 0;
    })();
    const propColor = (() => {
      if (!propertyId || !visibleProperties.length) return PROP_COLORS[0];
      const idx = visibleProperties.findIndex(p => p.id === propertyId);
      if (idx < 0) return PROP_COLORS[0];
      return visibleProperties[idx].color || PROP_COLORS[idx % PROP_COLORS.length];
    })();

    // checkOut은 exclusive → 마지막 포함 날짜 = checkOut - 1
    const lastDay = addDays(co, -1);

    // findIndex로 정확한 그리드 인덱스 탐색
    let startIdx = currentGrid.findIndex(c => c.dateStr === ci);
    let endIdx   = currentGrid.findIndex(c => c.dateStr === lastDay);

    // 범위 밖이면 그리드 끝/시작으로 클램프
    if (startIdx < 0) startIdx = 0;
    if (endIdx   < 0) endIdx   = currentGrid.length - 1;
    if (endIdx < startIdx) return [];

    const nights = diffDays(ci, co);
    const BAR_H  = 22;
    const BAR_GAP = 2;
    const bars: BookingBar[] = [];
    let cur = startIdx;
    while (cur <= endIdx) {
      const row    = Math.floor(cur / 7);
      const segEnd = Math.min(endIdx, (row + 1) * 7 - 1);
      const col    = cur % 7;
      const span   = segEnd - cur + 1;
      // 기존 useBookingBars와 동일한 topPx 계산 (slotIndex 반영)
      const topPx  = row * CELL_HEIGHT
        + BAR_OFFSET_Y
        + slotIndex * (BAR_H + BAR_GAP);

      bars.push({
        id: '__preview__', type: 'booking',
        guestName: '', channel, nationality: undefined,
        guests: 0, nights, span,
        channelClass, propColor,
        left: `calc(${(col / 7) * 100}% + 2px)`,
        width: `calc(${(span / 7) * 100}% - 4px)`,
        top: `${topPx}px`,
        rowIndex: row, colStart: col,
        isFirst: cur === startIdx, isLast: segEnd === endIdx,
        isPast: false, isPreview: true,
      });
      cur = segEnd + 1;
    }
    return bars;
  }, [previewDates, currentGrid, visibleProperties]);

  // ── preview와 겹치는 기존 bar 제거 후 합침 ────────────────────────────────
  // 동일 propertyId에서 preview 날짜 범위와 겹치는 기존 bar를 숨기고 preview로 대체
  const mergedCurrentBars = useMemo(() => {
    if (!previewDates || previewBars.length === 0) return currentBars;
    const { checkIn: ci, checkOut: co, propertyId } = previewDates;
    const pStart = currentGrid.findIndex(c => c.dateStr === ci);
    const pEnd   = currentGrid.findIndex(c => c.dateStr === addDays(co, -1));
    const ps = pStart >= 0 ? pStart : 0;
    const pe = pEnd   >= 0 ? pEnd   : currentGrid.length - 1;
    const filtered = currentBars.filter(bar => {
      if (bar.propertyId !== propertyId) return true;
      const barStart = bar.rowIndex * 7 + bar.colStart;
      const barEnd   = barStart + bar.span - 1;
      return barEnd < ps || barStart > pe;
    });
    return [...filtered, ...previewBars];
  }, [currentBars, previewBars, previewDates, currentGrid]);

  const panels = useMemo(() => ({
    prev:    { grid: prevGrid,    bars: prevBars    },
    current: { grid: currentGrid, bars: mergedCurrentBars },
    next:    { grid: nextGrid,    bars: nextBars    },
  }), [prevGrid, currentGrid, nextGrid, prevBars, mergedCurrentBars, nextBars]);

  const upcomingStays = useMemo(() =>
    visibleBookings
      .filter(b => b.checkOut > todayStr)   // 체크아웃이 오늘 이후인 예약 (체류 중 포함)
      .sort((a, b) => new Date(a.checkIn + 'T12:00:00').getTime() - new Date(b.checkIn + 'T12:00:00').getTime()),
    [visibleBookings, todayStr],
  );

  const handleDateClick = (
    cell: { isCurrentMonth: boolean; dateStr: string },
    e: React.MouseEvent<HTMLDivElement>,
  ) => {
    if (!cell.isCurrentMonth || !cell.dateStr) return;

    // 바텀시트가 열린 상태: 선택 표시 + 해당 날짜 카드로 스무스 스크롤
    if (snap !== 'hidden') {
      setSelectedDateStr(cell.dateStr);
      const match = upcomingStays.find(s =>
        s.checkIn === cell.dateStr ||
        (s.checkIn <= cell.dateStr && s.checkOut > cell.dateStr)
      );
      if (match) {
        const stayId = String(match.id);
        requestAnimationFrame(() => {
          const el = cardRefs.current.get(stayId);
          const container = scrollContainerRef.current;
          if (!el || !container) return;
          const scrollTop = container.scrollTop
            + el.getBoundingClientRect().top
            - container.getBoundingClientRect().top
            - 12;
          container.scrollTo({ top: Math.max(0, scrollTop), behavior: 'smooth' });
        });
      }
      return;
    }

    // 셀에 붙여서 컴팩트 모달 표시 + 프리뷰 바 즉시 표시
    const rect = e.currentTarget.getBoundingClientRect();
    // 모달과 동일한 로직: 점유되지 않은 첫 번째 숙소 선택
    const occSet = new Set<string>();
    const knownIds = new Set(properties.map(p => p.id));
    const firstPropId = properties[0]?.id;
    const getEffectivePropId = (pid?: string) => (pid && knownIds.has(pid)) ? pid : firstPropId;

    bookings.forEach(b => { 
      const pid = getEffectivePropId(b.propertyId);
      if (b.checkIn <= cell.dateStr && b.checkOut > cell.dateStr && pid) occSet.add(pid); 
    });
    maintenance.forEach(m => { 
      const pid = getEffectivePropId(m.propertyId);
      if (m.startDate <= cell.dateStr && m.endDate > cell.dateStr && pid) occSet.add(pid); 
    });
    const initProp = (properties.find(p => !occSet.has(p.id)) ?? properties[0]);

    if (initProp && visiblePropertyIds !== null && !visiblePropertyIds.includes(initProp.id)) {
      setVisiblePropertyIds([...visiblePropertyIds, initProp.id]);
    }

    setPreviewDates({
      checkIn: cell.dateStr,
      checkOut: addDays(cell.dateStr, 1),
      channel: 'Airbnb',
      propertyId: initProp?.id ?? '',
    });
    setQuickBookingAnchor({ date: cell.dateStr, rect });
  };

  const handleBarClick = (e: React.MouseEvent, bar: { type: string; id: string | number }) => {
    e.stopPropagation();
    if (bar.type === 'booking') openBookingModal(String(bar.id));
    else openEditMaintModal(String(bar.id));
  };

  const ko = language === 'ko';

  return (
    <div
      className="relative w-full overflow-hidden flex flex-col pt-2"
      style={{ height: '100dvh' }}
      onTouchStart={onOuterTouchStart}
      onTouchMove={onOuterTouchMove}
      onTouchEnd={onOuterTouchEnd}
    >

      {/* ── 헤더 ── */}
      <div className="px-3 mb-2 flex-shrink-0">
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

      {/* ── 요일 고정 헤더 ── */}
      <div className="grid grid-cols-7 w-full border-b border-border/60 pb-1 pt-2 bg-card z-10 shrink-0 px-0">
        {DOW_LABELS[language].map((label, dow) => {
          const isRed = dow === 0;
          const isBlue = dow === 6;
          return (
            <div key={dow} className={`text-center text-[10px] uppercase font-semibold ${isRed ? 'text-calendar-sun/80' : isBlue ? 'text-calendar-sat/80' : 'text-muted-foreground/60'}`}>
              {label}
            </div>
          );
        })}
      </div>

      {/* ── 달력 영역 — 행 경계 클립 ── */}
      <div ref={calAreaRef} className="relative flex-1 min-h-0 overflow-hidden">
        <div style={{ height: clipH ?? '100%', overflow: 'hidden', position: 'relative' }}>

          {/* 레이어 1: 바+그리드 (숫자 없음) — 위로 슬라이드하며 페이드아웃 */}
          <div
            style={{
              opacity: fullOpacity,
              transform: `translateY(${fullTranslateY}px)`,
              transition: calTransition,
              pointerEvents: fullOpacity < 0.05 ? 'none' : 'auto',
            }}
          >
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
              compact={false}
              hideNumbers={true}
            />
          </div>

          {/* 레이어 3: 도트만 (숫자 없음) — 아래에서 슬라이드되며 페이드인 */}
          <div
            style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              opacity: compactOpacity,
              transform: `translateY(${compactTranslateY}px)`,
              transition: calTransition,
              pointerEvents: compactOpacity < 0.05 ? 'none' : 'auto',
            }}
          >
            <SwipeableCalendar
              prev={panels.prev}
              current={panels.current}
              next={panels.next}
              todayStr={todayStr}
              onDateClick={handleDateClick}
              onBarClick={() => {}}
              onPrev={prevMonth}
              onNext={nextMonth}
              eventColorMode={settings?.eventColorMode ?? 'channel'}
              compact={true}
              hideNumbers={true}
            />
          </div>

          {/* 레이어 2: 숫자만 (항상 opacity 1, 최상단 페인트) — calProgress 0.5에서 compact 전환 */}
          {/* DOM 마지막 → 도트 레이어의 bg-card 위에 페인트되어 숫자가 항상 보임 */}
          <div
            style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              pointerEvents: 'none',
            }}
          >
            <SwipeableCalendar
              prev={panels.prev}
              current={panels.current}
              next={panels.next}
              todayStr={todayStr}
              onDateClick={handleDateClick}
              onBarClick={() => {}}
              onPrev={prevMonth}
              onNext={nextMonth}
              eventColorMode={settings?.eventColorMode ?? 'channel'}
              compact={numCompact}
              numbersOnly={true}
              selectedDateStr={selectedDateStr ?? undefined}
            />
          </div>

        </div>
      </div>

      {/* ── 바텀시트 ── */}
      <div
        className="absolute inset-x-0 bottom-0 bg-card shadow-[0_-1px_4px_rgba(0,0,0,0.06)] flex flex-col"
        style={{
          height: sheetH(),
          transform: `translateY(${clampedY}px)`,
          transition: dragDy === 0 ? 'transform 380ms cubic-bezier(0.32,0.72,0,1)' : 'none',
          zIndex: 20,
        }}
        onTouchStart={(e) => { e.stopPropagation(); onTouchStart(e); }}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* 핸들 */}
        <div className="flex items-center justify-center pt-2.5 pb-1 flex-shrink-0 cursor-grab select-none">
          <div className="w-9 h-[4px] rounded-full bg-border/70" />
        </div>

        {/* 타이틀 */}
        <div className="px-5 pb-3 flex items-baseline justify-between flex-shrink-0">
          <span className="text-[15px] font-bold text-foreground">
            {ko ? '다가오는 예약' : 'Upcoming Stays'}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {upcomingStays.length}{ko ? '건' : ' bookings'}
          </span>
        </div>

        {/* 카드 목록 */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-5 pb-24">
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
              <div
                key={stay.id}
                ref={el => { if (el) cardRefs.current.set(String(stay.id), el); else cardRefs.current.delete(String(stay.id)); }}
              >
                <UpcomingBookingCard
                  booking={stay}
                  propColor={propColor}
                  propName={pIdx >= 0 ? properties[pIdx].name : undefined}
                  onClick={() => openBookingModal(stay.id)}
                />
              </div>
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
      {quickBookingAnchor && (
        <CompactQuickBookingModal
          date={quickBookingAnchor.date}
          anchorRect={quickBookingAnchor.rect}
          onPreviewChange={handlePreviewChange}
          onClose={handleQuickBookingClose}
        />
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
