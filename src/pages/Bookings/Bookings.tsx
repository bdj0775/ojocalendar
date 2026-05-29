import { useState, useMemo } from 'react';
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

// commission 필드 = 수수료율(%) 저장
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
  { key: 'checkIn_desc', ko: '최신 입실순',  en: 'Newest first'       },
  { key: 'checkIn_asc',  ko: '오래된 입실순', en: 'Oldest first'       },
  { key: 'amount_desc',  ko: '금액 높은순',  en: 'Highest amount'     },
  { key: 'amount_asc',   ko: '금액 낮은순',  en: 'Lowest amount'      },
];

// ── BookingCard — compact 2-row layout ────────────────────────────
interface CardProps {
  guestName: string; checkIn: string; checkOut: string;
  guests: number; channel: Channel; amount: number; commission: number;
  nights: number; net: number;
  propColor?: string;
  onTap: () => void;
  ko: boolean;
}

const BookingCard = ({ guestName, checkIn, checkOut, channel, amount, commission, nights, net, propColor, onTap, ko, guests }: CardProps) => {
  const chLabel = ko ? CH_LABEL_KO[channel] ?? channel : channel === 'Booking.com' ? 'Booking' : channel;
  const barColor = propColor ?? undefined;

  return (
    <button
      onClick={onTap}
      className="w-full text-left bg-card border border-border/40 rounded-xl overflow-hidden active:scale-[0.985] transition-transform"
    >
      <div className="flex">
        {/* 채널/숙소 컬러 세로 바 */}
        <div
          className={`w-[3px] flex-shrink-0 ${!barColor ? CH_BAR[channel] ?? 'bg-muted-foreground' : ''}`}
          style={barColor ? { backgroundColor: barColor } : undefined}
        />

        <div className="flex-1 px-3 py-2.5 min-w-0">
          {/* 행 1: 예약자명 + 날짜 + 결제금액 */}
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-[13px] font-semibold text-foreground flex-1 truncate leading-none">
              {guestName || '—'}
            </span>
            <span className="text-[11px] text-muted-foreground/70 shrink-0 tabular-nums">
              {fmtMD(checkIn)} → {fmtMD(checkOut)}
            </span>
            <span className="text-[13px] font-semibold text-foreground tabular-nums shrink-0 leading-none">
              {fmtN(amount)}원
            </span>
          </div>

          {/* 행 2: 채널 · 박수 · 인원수 + 입금액 */}
          <div className="flex items-center gap-0">
            <span className="text-[11px] text-muted-foreground/70">{chLabel}</span>
            <Dot /><span className="text-[11px] text-muted-foreground/70">{nights}박</span>
            <Dot /><span className="text-[11px] text-muted-foreground/70">{guests}명</span>
            <span className="ml-auto text-[12px] font-medium text-primary tabular-nums shrink-0">
              입금 {fmtN(net)}원
            </span>
          </div>
        </div>
      </div>
    </button>
  );
};

const Dot = () => <span className="mx-1.5 text-muted-foreground/30 text-[10px]">·</span>;

// ── Sort bottom sheet ──────────────────────────────────────────────
const SortSheet = ({
  sortKey, onSelect, onClose, ko,
}: {
  sortKey: SortKey; onSelect: (k: SortKey) => void; onClose: () => void; ko: boolean;
}) => (
  <>
    <div className="fixed inset-0 bg-black/25 z-40 backdrop-blur-[1px]" onClick={onClose} />
    <div className="fixed bottom-0 left-0 right-0 bg-card rounded-t-2xl z-50 shadow-xl pb-[max(24px,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-center pt-3 pb-4">
        <div className="w-9 h-1 rounded-full bg-border/70" />
      </div>
      <p className="px-5 text-[13px] font-bold text-foreground mb-1">{ko ? '정렬 기준' : 'Sort by'}</p>
      {SORT_OPTIONS.map(opt => (
        <button
          key={opt.key}
          onClick={() => onSelect(opt.key)}
          className={`flex items-center justify-between w-full px-5 py-3.5 text-[13px] border-t border-border/20 transition-colors ${sortKey === opt.key ? 'text-primary font-semibold' : 'text-foreground'}`}
        >
          {ko ? opt.ko : opt.en}
          {sortKey === opt.key && <Check size={15} className="text-primary" />}
        </button>
      ))}
    </div>
  </>
);

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

  // ── 연간 합계 (채널·검색 필터 무관, 해당 연도 전체) ──────────
  const yearTotals = useMemo(() => {
    const ym = String(fYear);
    const yBks = bookings.filter(b => b.checkIn.startsWith(ym));
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
        default:             return b.checkIn.localeCompare(a.checkIn); // checkIn_desc
      }
    });
  }, [bookings, fYear, fch, fsearch, sortKey]);

  // ── 월별 그룹 ─────────────────────────────────────────────────
  const grouped = useMemo(() => {
    // 정렬이 날짜 기반일 때만 월별 그룹 의미 있음
    if (sortKey === 'amount_desc' || sortKey === 'amount_asc') return null;
    const map = new Map<string, typeof rows>();
    rows.forEach(b => {
      const key = b.checkIn.substring(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    });
    const entries = [...map.entries()].sort(([a], [b]) =>
      sortKey === 'checkIn_asc' ? a.localeCompare(b) : b.localeCompare(a),
    );
    return entries;
  }, [rows, sortKey]);

  // ── 숙소 색상 맵 ─────────────────────────────────────────────
  const propMap = useMemo(() => {
    const FALLBACK = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6'];
    return new Map(properties.map((p, i) => [p.id, {
      name:  p.name,
      color: p.color ?? FALLBACK[i % FALLBACK.length],
    }]));
  }, [properties]);

  const isFiltered = fch !== 'all' || fsearch.trim() !== '';
  const activeSortLabel = SORT_OPTIONS.find(o => o.key === sortKey)?.[ko ? 'ko' : 'en'] ?? '';

  const renderCard = (b: typeof rows[0]) => {
    const nights = diffDays(b.checkIn, b.checkOut);
    const net    = b.amount - commAmt(b.amount, b.commission);
    const info   = propMap.get(b.propertyId ?? '');
    return (
      <BookingCard
        key={b.id}
        guestName={b.guestName} checkIn={b.checkIn} checkOut={b.checkOut}
        guests={b.guests} channel={b.channel} amount={b.amount}
        commission={b.commission} nights={nights} net={net}
        propColor={properties.length > 1 ? info?.color : undefined}
        onTap={() => openBookingModal(b.id)}
        ko={ko}
      />
    );
  };

  return (
    <div className="bg-background min-h-screen pb-24">

      {/* ── 헤더 ── */}
      <header className="flex items-center justify-between px-4 py-3.5 lg:hidden">
        <div className="flex items-center gap-2">
          <button className="p-1 -ml-1 text-foreground" onClick={openSidebar}>
            <Menu size={22} />
          </button>
          <span className="text-[17px] font-bold text-foreground">
            {ko ? '예약 목록' : 'Bookings'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortOpen(true)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-muted/60 text-muted-foreground/80 text-[11px] font-medium"
          >
            <SlidersHorizontal size={13} />
            {activeSortLabel}
          </button>
          <NotificationBell />
        </div>
      </header>

      {/* ── 연간 요약 ── */}
      <div className="flex items-center px-4 py-2.5 border-b border-border/30 gap-3">
        {/* 연도 선택 */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFYear(y => y - 1)}
            className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-[13px] font-bold text-foreground tabular-nums">{fYear}년</span>
          <button
            onClick={() => setFYear(y => y + 1)}
            className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        <span className="text-[12px] text-muted-foreground/50 tabular-nums ml-1">
          {rows.length}{ko ? '건' : ''}
        </span>
        <span className="text-[12px] text-foreground/70 tabular-nums">
          {fmtN(yearTotals.amount)}원
        </span>
        <span className="text-[12px] font-semibold text-primary tabular-nums ml-auto">
          {ko ? '입금' : 'Net'} {fmtN(yearTotals.net)}원
        </span>
      </div>

      {/* ── 검색 + 채널 필터 (sticky) ── */}
      <div className="sticky top-0 z-10 bg-background/97 backdrop-blur-sm px-4 pt-2.5 pb-2.5 border-b border-border/20">
        {/* 검색창 */}
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
            <button
              onClick={() => setFSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* 채널 필터 칩 */}
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
                  'flex-shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/60 text-muted-foreground',
                ].join(' ')}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 필터 활성 시 초기화 버튼만 노출 */}
      {isFiltered && rows.length > 0 && (
        <div className="px-4 pt-1.5 pb-0">
          <button onClick={() => { setFCh('all'); setFSearch(''); }} className="text-[11px] text-primary font-medium">
            {ko ? '필터 초기화' : 'Clear filters'}
          </button>
        </div>
      )}

      {/* ── 예약 목록 ── */}
      <div className="px-4 pt-1 pb-2 flex flex-col gap-3">
        {grouped ? (
          grouped.map(([ym, bks]) => {
            const gNet = bks.reduce((s, b) => s + b.amount - commAmt(b.amount, b.commission), 0);
            return (
              <div key={ym}>
                {/* 월 헤더 */}
                <div className="flex items-center justify-between py-1.5 mb-1">
                  <span className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wide">
                    {fmtYM(ym)}
                  </span>
                  <span className="text-[11px] text-muted-foreground/50 tabular-nums">
                    {bks.length}{ko ? '건' : ''} &nbsp;·&nbsp; 입금 {fmtN(gNet)}원
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {bks.map(renderCard)}
                </div>
              </div>
            );
          })
        ) : (
          /* 금액 정렬 시 그룹 없이 단순 목록 */
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
            <button
              onClick={() => { setFCh('all'); setFSearch(''); }}
              className="mt-3 text-[12px] text-primary font-semibold"
            >
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

      {/* ── 정렬 바텀시트 ── */}
      {sortOpen && (
        <SortSheet
          sortKey={sortKey}
          onSelect={(k) => { setSortKey(k); setSortOpen(false); }}
          onClose={() => setSortOpen(false)}
          ko={ko}
        />
      )}

      <BookingEditModal />
    </div>
  );
};

export default BookingsPage;
