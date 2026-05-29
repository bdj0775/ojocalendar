import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, Plus, Menu, FileText, ChevronLeft, ChevronRight, SlidersHorizontal, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { useTranslation } from '../../hooks/useTranslation';
import { useSidebar } from '../../context/SidebarContext';
import NotificationBell from '../../components/Notifications/NotificationBell';
import BookingEditModal from '../../components/Modals/BookingEditModal';
import { ICON_SIZES } from '../../lib/iconSizes';
import type { Channel } from '../../types';

// ── helpers ────────────────────────────────────────────────────────
const diffDays = (a: string, b: string) =>
  !a || !b ? 0 : Math.max(0, Math.round(
    (new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000,
  ));

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const fmtMD = (ds: string) => {
  if (!ds) return '—';
  const [, m, d] = ds.split('-').map(Number);
  return `${m}/${d}`;
};

const fmtYM = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return `${y}년 ${m}월`;
};

const fmtN = (v: number) => v.toLocaleString();

const commAmt = (amount: number, rate: number) => Math.round(amount * rate / 100);

// ── constants ──────────────────────────────────────────────────────
const ALL_CHANNELS: Channel[] = ['Airbnb', 'Booking.com', 'Naver', 'Direct'];

const CH_BAR: Record<string, string> = {
  Airbnb:        'bg-rose-500',
  'Booking.com': 'bg-blue-600',
  Naver:         'bg-emerald-500',
  Direct:        'bg-violet-500',
};

const CH_LABEL_KO: Record<string, string> = {
  Airbnb:        '에어비앤비',
  'Booking.com': '부킹닷컴',
  Naver:         '네이버',
  Direct:        '직접예약',
};

type SortKey = 'checkIn_desc' | 'checkIn_asc' | 'amount_desc' | 'amount_asc';

const SORT_OPTIONS: { key: SortKey; ko: string; en: string }[] = [
  { key: 'checkIn_desc', ko: '최신 입실순',   en: 'Newest first'   },
  { key: 'checkIn_asc',  ko: '오래된 입실순',  en: 'Oldest first'   },
  { key: 'amount_desc',  ko: '금액 높은순',   en: 'Highest amount' },
  { key: 'amount_asc',   ko: '금액 낮은순',   en: 'Lowest amount'  },
];

// ── BookingCard ────────────────────────────────────────────────────
interface CardProps {
  guestName: string; checkIn: string; checkOut: string;
  guests: number; channel: Channel; amount: number;
  nights: number; net: number;
  propColor?: string; onTap: () => void; ko: boolean;
}

const BookingCard = ({ guestName, checkIn, checkOut, channel, amount, nights, net, propColor, onTap, ko, guests }: CardProps) => {
  const chLabel = ko ? CH_LABEL_KO[channel] ?? channel : channel === 'Booking.com' ? 'Booking' : channel;

  return (
    <button onClick={onTap} className="w-full text-left bg-card border border-border/40 rounded-xl overflow-hidden active:scale-[0.985] transition-transform">
      <div className="flex">
        <div
          className={`w-[3px] flex-shrink-0 ${!propColor ? (CH_BAR[channel] ?? 'bg-muted-foreground') : ''}`}
          style={propColor ? { backgroundColor: propColor } : undefined}
        />
        <div className="flex-1 px-3 py-2.5 min-w-0">
          {/* 행 1: 예약자명 + 날짜 + 결제금액 */}
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-[13px] font-semibold text-foreground flex-1 truncate leading-none">
              {guestName || '—'}
            </span>
            <span className="text-[11px] text-muted-foreground/70 shrink-0 tabular-nums whitespace-nowrap">
              {fmtMD(checkIn)} → {fmtMD(checkOut)}
            </span>
            <span className="text-[13px] font-semibold text-foreground tabular-nums shrink-0 leading-none whitespace-nowrap">
              {fmtN(amount)}원
            </span>
          </div>
          {/* 행 2: 채널 · 박수 · 인원 + 입금액 */}
          <div className="flex items-center">
            <span className="text-[11px] text-muted-foreground/70 whitespace-nowrap">{chLabel}</span>
            <Dot /><span className="text-[11px] text-muted-foreground/70 whitespace-nowrap">{nights}박</span>
            <Dot /><span className="text-[11px] text-muted-foreground/70 whitespace-nowrap">{guests}명</span>
            <span className="ml-auto text-[12px] font-medium text-primary tabular-nums shrink-0 whitespace-nowrap pl-2">
              입금&nbsp;{fmtN(net)}원
            </span>
          </div>
        </div>
      </div>
    </button>
  );
};

const Dot = () => <span className="mx-1.5 text-muted-foreground/30 text-[10px] flex-shrink-0">·</span>;

// ── main page ──────────────────────────────────────────────────────
const BookingsPage = () => {
  const navigate = useNavigate();
  const { language } = useTranslation();
  const { open: openSidebar } = useSidebar();
  const ko = language === 'ko';

  const { bookings, properties, openBookingModal } = useStore();

  const [fYear,   setFYear]   = useState(() => new Date().getFullYear());
  const [fch,     setFCh]     = useState<Channel | 'all'>('all');
  const [fsearch, setFSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('checkIn_desc');
  const [sortOpen, setSortOpen] = useState(false);

  // 오늘 스크롤
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(null);

  // ── 연간 합계 ─────────────────────────────────────────────────
  const yearTotals = useMemo(() => {
    const prefix = String(fYear);
    const yBks = bookings.filter(b => b.checkIn.startsWith(prefix));
    return {
      amount: yBks.reduce((s, b) => s + b.amount, 0),
      net:    yBks.reduce((s, b) => s + b.amount - commAmt(b.amount, b.commission), 0),
    };
  }, [bookings, fYear]);

  // ── 필터링·정렬 ───────────────────────────────────────────────
  const rows = useMemo(() => {
    let data = bookings.filter(b => b.checkIn.startsWith(String(fYear)));
    if (fch !== 'all') data = data.filter(b => b.channel === fch);
    if (fsearch.trim()) {
      const q = fsearch.toLowerCase();
      data = data.filter(b => b.guestName.toLowerCase().includes(q));
    }
    return data.sort((a, b) => {
      switch (sortKey) {
        case 'checkIn_asc':  return a.checkIn.localeCompare(b.checkIn);
        case 'amount_desc':  return b.amount - a.amount;
        case 'amount_asc':   return a.amount - b.amount;
        default:             return b.checkIn.localeCompare(a.checkIn);
      }
    });
  }, [bookings, fYear, fch, fsearch, sortKey]);

  // ── 월별 그룹 ─────────────────────────────────────────────────
  const grouped = useMemo(() => {
    if (sortKey === 'amount_desc' || sortKey === 'amount_asc') return null;
    const map = new Map<string, typeof rows>();
    rows.forEach(b => {
      const key = b.checkIn.substring(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    });
    return [...map.entries()].sort(([a], [b]) =>
      sortKey === 'checkIn_asc' ? a.localeCompare(b) : b.localeCompare(a),
    );
  }, [rows, sortKey]);

  // ── 숙소 색상 맵 ─────────────────────────────────────────────
  const propMap = useMemo(() => {
    const FB = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6'];
    return new Map(properties.map((p, i) => [p.id, { color: p.color ?? FB[i % FB.length] }]));
  }, [properties]);

  // ── 오늘 스크롤 effect ────────────────────────────────────────
  useEffect(() => {
    if (!pendingScrollId) return;
    const el = cardRefs.current.get(pendingScrollId);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setPendingScrollId(null);
  }, [rows, pendingScrollId]);

  const handleToday = () => {
    const today = todayISO();
    const todayYear = new Date().getFullYear();
    const match =
      bookings.find(b => b.checkIn <= today && b.checkOut > today) ??
      bookings.find(b => b.checkIn === today) ??
      bookings.filter(b => b.checkIn >= today).sort((a, b) => a.checkIn.localeCompare(b.checkIn))[0];
    if (!match) return;
    setFYear(todayYear);
    setFCh('all');
    setFSearch('');
    setSortKey('checkIn_desc');
    setPendingScrollId(match.id);
  };

  const isFiltered = fch !== 'all' || fsearch.trim() !== '';
  const activeSortLabel = SORT_OPTIONS.find(o => o.key === sortKey)?.[ko ? 'ko' : 'en'] ?? '';

  const renderCard = (b: typeof rows[0]) => {
    const nights = diffDays(b.checkIn, b.checkOut);
    const net    = b.amount - commAmt(b.amount, b.commission);
    const info   = propMap.get(b.propertyId ?? '');
    return (
      <div key={b.id} ref={el => { if (el) cardRefs.current.set(b.id, el); else cardRefs.current.delete(b.id); }}>
        <BookingCard
          guestName={b.guestName} checkIn={b.checkIn} checkOut={b.checkOut}
          guests={b.guests} channel={b.channel} amount={b.amount}
          commission={b.commission} nights={nights} net={net}
          propColor={properties.length > 1 ? info?.color : undefined}
          onTap={() => openBookingModal(b.id)}
          ko={ko}
        />
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="bg-background min-h-screen pb-24">

      {/* ── 헤더 ── */}
      <header className="flex items-center justify-between px-4 py-3.5 lg:hidden">
        <div className="flex items-center gap-2">
          <button className="p-1 -ml-1 text-foreground" onClick={openSidebar}>
            <Menu size={22} />
          </button>
          <span className="text-[17px] font-bold text-foreground whitespace-nowrap">
            {ko ? '예약 목록' : 'Bookings'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* 오늘 버튼 */}
          <button
            onClick={handleToday}
            className="h-8 px-3 text-[11px] font-semibold bg-muted/60 text-muted-foreground rounded-lg hover:bg-muted whitespace-nowrap transition-colors"
          >
            {ko ? '오늘' : 'Today'}
          </button>

          {/* 정렬 드롭다운 */}
          <div className="relative">
            <button
              onClick={() => setSortOpen(o => !o)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-muted/60 text-muted-foreground/80 text-[11px] font-medium whitespace-nowrap transition-colors hover:bg-muted"
            >
              <SlidersHorizontal size={12} />
              {activeSortLabel}
            </button>

            {sortOpen && (
              <>
                {/* 외부 클릭 오버레이 */}
                <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />
                {/* 드롭다운 */}
                <div className="absolute right-0 top-full mt-1.5 bg-card border border-border/60 rounded-xl shadow-lg z-50 overflow-hidden min-w-[140px] py-1">
                  {SORT_OPTIONS.map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => { setSortKey(opt.key); setSortOpen(false); }}
                      className={`flex items-center justify-between w-full px-4 py-2.5 text-[12px] transition-colors hover:bg-muted/50 ${sortKey === opt.key ? 'text-primary font-semibold' : 'text-foreground'}`}
                    >
                      <span className="whitespace-nowrap">{ko ? opt.ko : opt.en}</span>
                      {sortKey === opt.key && <Check size={12} className="text-primary ml-3 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <NotificationBell />
        </div>
      </header>

      {/* ── 연간 요약 ── */}
      <div className="flex items-center px-4 py-2.5 border-b border-border/30 gap-2.5 flex-nowrap overflow-hidden">
        {/* 연도 선택 */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setFYear(y => y - 1)}
            className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ChevronLeft size={13} />
          </button>
          <span className="text-[13px] font-bold text-foreground tabular-nums whitespace-nowrap">{fYear}년</span>
          <button
            onClick={() => setFYear(y => y + 1)}
            className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ChevronRight size={13} />
          </button>
        </div>

        <span className="text-[12px] text-muted-foreground/50 tabular-nums whitespace-nowrap flex-shrink-0">
          {rows.length}{ko ? '건' : ''}
        </span>
        <span className="text-[12px] text-foreground/70 tabular-nums whitespace-nowrap flex-shrink truncate min-w-0">
          {fmtN(yearTotals.amount)}원
        </span>
        <span className="text-[12px] font-semibold text-primary tabular-nums whitespace-nowrap flex-shrink-0 ml-auto">
          입금&nbsp;{fmtN(yearTotals.net)}원
        </span>
      </div>

      {/* ── 검색 + 채널 필터 (sticky) ── */}
      <div className="sticky top-0 z-10 bg-background/97 backdrop-blur-sm px-4 pt-2.5 pb-2.5 border-b border-border/20">
        <div className="relative mb-2">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 pointer-events-none" />
          <input
            type="text"
            placeholder={ko ? '예약자명 검색...' : 'Search guest...'}
            value={fsearch}
            onChange={e => setFSearch(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 text-[12px] bg-muted/60 rounded-lg text-foreground placeholder:text-muted-foreground/40 outline-none focus:bg-muted transition-colors"
          />
          {fsearch && (
            <button onClick={() => setFSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground">
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {(['all', ...ALL_CHANNELS] as const).map(ch => {
            const isActive = fch === ch;
            const label = ch === 'all'
              ? (ko ? '전체' : 'All')
              : ko ? CH_LABEL_KO[ch] : (ch === 'Booking.com' ? 'Booking' : ch);
            return (
              <button
                key={ch}
                onClick={() => setFCh(ch as Channel | 'all')}
                className={[
                  'flex-shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors whitespace-nowrap',
                  isActive ? 'bg-primary text-primary-foreground' : 'bg-muted/60 text-muted-foreground',
                ].join(' ')}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 필터 초기화 */}
      {isFiltered && rows.length > 0 && (
        <div className="px-4 pt-1.5">
          <button onClick={() => { setFCh('all'); setFSearch(''); }} className="text-[11px] text-primary font-medium">
            {ko ? '필터 초기화' : 'Clear filters'}
          </button>
        </div>
      )}

      {/* ── 예약 목록 ── */}
      <div className="px-4 pt-2 pb-2 flex flex-col gap-3">
        {grouped ? (
          grouped.map(([ym, bks]) => {
            const gNet = bks.reduce((s, b) => s + b.amount - commAmt(b.amount, b.commission), 0);
            return (
              <div key={ym}>
                <div className="flex items-center justify-between py-1.5 mb-1">
                  <span className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wide whitespace-nowrap">
                    {fmtYM(ym)}
                  </span>
                  <span className="text-[11px] text-muted-foreground/50 tabular-nums whitespace-nowrap">
                    {bks.length}{ko ? '건' : ''}&nbsp;·&nbsp;입금&nbsp;{fmtN(gNet)}원
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {bks.map(renderCard)}
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col gap-1.5">
            {rows.map(renderCard)}
          </div>
        )}
      </div>

      {/* ── 빈 상태 ── */}
      {rows.length === 0 && (
        <div className="flex flex-col items-center justify-center pt-20 px-8 text-center">
          <div className="w-14 h-14 rounded-full bg-muted/40 flex items-center justify-center mb-3">
            <FileText size={22} className="text-muted-foreground/30" />
          </div>
          <p className="text-[13px] text-muted-foreground/50 leading-relaxed">
            {isFiltered
              ? (ko ? '검색 결과가 없습니다' : 'No results found')
              : (ko ? `${fYear}년 예약 데이터가 없습니다` : `No bookings in ${fYear}`)}
          </p>
          {isFiltered && (
            <button onClick={() => { setFCh('all'); setFSearch(''); }} className="mt-3 text-[12px] text-primary font-semibold">
              {ko ? '필터 초기화' : 'Clear filters'}
            </button>
          )}
        </div>
      )}

      {/* ── FAB ── */}
      <button
        className="fixed right-5 bottom-nav-clear w-11 h-11 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/35 active:scale-[0.90] transition-transform lg:hidden"
        style={{ zIndex: 30 }}
        onClick={() => navigate('/new-booking')}
      >
        <Plus size={ICON_SIZES.md} color="white" />
      </button>

      <BookingEditModal />
    </div>
  );
};

export default BookingsPage;
