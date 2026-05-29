import { useState, useMemo } from 'react';
import { Search, X, Plus, Menu, FileText } from 'lucide-react';
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

const fmtYM = (ds: string) => {
  if (!ds) return '';
  const [y, m] = ds.split('-').map(Number);
  return `${y}년 ${m}월`;
};

const fmtMD = (ds: string) => {
  if (!ds) return '—';
  const [, m, d] = ds.split('-').map(Number);
  return `${m}/${d}`;
};

const fmtN = (v: number) => v.toLocaleString();

// commission 필드 = 수수료율(%), 수수료 금액은 계산
const commAmt = (amount: number, rate: number) => Math.round(amount * rate / 100);

// ── constants ──────────────────────────────────────────────────────
const ALL_CHANNELS: Channel[] = ['Airbnb', 'Booking.com', 'Naver', 'Direct'];

const CH_DOT: Record<string, string> = {
  Airbnb:        'bg-rose-500',
  'Booking.com': 'bg-blue-600',
  Naver:         'bg-emerald-500',
  Direct:        'bg-violet-500',
};

const CH_CHIP: Record<string, string> = {
  Airbnb:        'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  'Booking.com': 'bg-blue-600/10 text-blue-700 dark:text-blue-400',
  Naver:         'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  Direct:        'bg-violet-500/10 text-violet-700 dark:text-violet-400',
};

const CH_LABEL_KO: Record<string, string> = {
  Airbnb:        '에어비앤비',
  'Booking.com': '부킹닷컴',
  Naver:         '네이버',
  Direct:        '직접예약',
};

// ── BookingCard ────────────────────────────────────────────────────
interface CardProps {
  b: {
    id: string; guestName: string; checkIn: string; checkOut: string;
    guests: number; channel: Channel; amount: number; commission: number;
    bookingDate?: string; nationality: string;
  };
  propColor?: string;
  propName?: string;
  onTap: () => void;
  ko: boolean;
}

const BookingCard = ({ b, propColor, propName, onTap, ko }: CardProps) => {
  const nights  = diffDays(b.checkIn, b.checkOut);
  const comm    = commAmt(b.amount, b.commission);
  const net     = b.amount - comm;
  const adr     = nights > 0 ? Math.round(b.amount / nights) : 0;
  const lead    = b.bookingDate ? diffDays(b.bookingDate, b.checkIn) : null;

  const chLabel = ko ? CH_LABEL_KO[b.channel] ?? b.channel : b.channel === 'Booking.com' ? 'Booking' : b.channel;

  return (
    <button
      onClick={onTap}
      className="w-full text-left bg-card border border-border/50 rounded-2xl overflow-hidden active:scale-[0.985] transition-transform shadow-sm"
    >
      {/* 채널 컬러 바 */}
      <div className="h-[3px] w-full" style={{ backgroundColor: propColor ?? undefined }}>
        <div className={`h-full ${!propColor ? `${CH_DOT[b.channel] ?? 'bg-muted'}` : ''}`} />
      </div>

      <div className="p-4">
        {/* 행 1: 채널 칩 + 연월 */}
        <div className="flex items-center justify-between mb-2.5">
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${CH_CHIP[b.channel] ?? 'bg-muted text-foreground'}`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${CH_DOT[b.channel] ?? 'bg-muted-foreground'}`} />
            {chLabel}
          </span>
          <span className="text-[11px] text-muted-foreground/70">{fmtYM(b.checkIn)}</span>
        </div>

        {/* 행 2: 예약자명 + 결제금액 */}
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-[16px] font-bold text-foreground leading-tight truncate mr-3">
            {b.guestName || '—'}
          </span>
          <span className="text-[14px] font-semibold text-foreground tabular-nums shrink-0">
            {fmtN(b.amount)}원
          </span>
        </div>

        {/* 행 3: 날짜·박수 + 입금액 */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] text-muted-foreground">
            {fmtMD(b.checkIn)} → {fmtMD(b.checkOut)}&nbsp;&nbsp;{nights}박
          </span>
          <span className="text-[13px] font-semibold text-primary tabular-nums shrink-0">
            {ko ? '입금' : 'Net'} {fmtN(net)}원
          </span>
        </div>

        {/* 행 4: 메타 정보 */}
        <div className="flex items-center gap-0 flex-wrap">
          <Meta label={`${b.guests}명`} />
          {adr > 0 && <Meta label={`ADR ${fmtN(adr)}원`} dot />}
          {lead !== null && <Meta label={`리드타임 ${lead}일`} dot />}
          {propName && <Meta label={propName} dot />}
        </div>
      </div>
    </button>
  );
};

const Meta = ({ label, dot }: { label: string; dot?: boolean }) => (
  <span className="text-[11px] text-muted-foreground/70 flex items-center">
    {dot && <span className="mx-1.5 opacity-40">·</span>}
    {label}
  </span>
);

// ── main page ──────────────────────────────────────────────────────
const BookingsPage = () => {
  const navigate  = useNavigate();
  const { language } = useTranslation();
  const { open: openSidebar } = useSidebar();
  const ko = language === 'ko';

  const { bookings, properties, openBookingModal } = useStore();

  const [fch,     setFCh]     = useState<Channel | 'all'>('all');
  const [fsearch, setFSearch] = useState('');

  // ── filtered + sorted ─────────────────────────────────────────
  const rows = useMemo(() => {
    let data = [...bookings];
    if (fch !== 'all') data = data.filter(b => b.channel === fch);
    if (fsearch.trim()) {
      const q = fsearch.toLowerCase();
      data = data.filter(b => b.guestName.toLowerCase().includes(q));
    }
    return data.sort((a, b) => b.checkIn.localeCompare(a.checkIn));
  }, [bookings, fch, fsearch]);

  // ── month groups ──────────────────────────────────────────────
  const grouped = useMemo(() => {
    const map = new Map<string, typeof rows>();
    rows.forEach(b => {
      const key = b.checkIn.substring(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    });
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [rows]);

  // ── totals ────────────────────────────────────────────────────
  const totals = useMemo(() => ({
    count:  rows.length,
    amount: rows.reduce((s, b) => s + b.amount, 0),
    net:    rows.reduce((s, b) => s + b.amount - commAmt(b.amount, b.commission), 0),
  }), [rows]);

  const propMap = useMemo(() => {
    const COLORS = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6'];
    return new Map(properties.map((p, i) => [p.id, {
      name:  p.name,
      color: p.color ?? COLORS[i % COLORS.length],
    }]));
  }, [properties]);

  const isFiltered = fch !== 'all' || fsearch.trim() !== '';

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
        <NotificationBell />
      </header>

      {/* ── 검색 + 채널 필터 (sticky) ── */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-4 pt-1 pb-3 border-b border-border/30">
        {/* 검색창 */}
        <div className="relative mb-2.5">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" />
          <input
            type="text"
            placeholder={ko ? '예약자명 검색...' : 'Search guest...'}
            value={fsearch}
            onChange={e => setFSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2 text-[13px] bg-muted/60 rounded-xl text-foreground placeholder:text-muted-foreground/40 outline-none focus:bg-muted transition-colors"
          />
          {fsearch && (
            <button
              onClick={() => setFSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* 채널 필터 칩 */}
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
                  'flex-shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-full transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted',
                ].join(' ')}
              >
                {ch !== 'all' && isActive && (
                  <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${CH_DOT[ch]} opacity-90`} />
                )}
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 요약 바 ── */}
      {rows.length > 0 && (
        <div className="px-4 py-2.5 flex items-center gap-3 text-[12px] border-b border-border/20">
          <span className="text-muted-foreground/70">{rows.length}{ko ? '건' : ' bookings'}</span>
          <span className="text-foreground/80 font-medium tabular-nums">{fmtN(totals.amount)}원</span>
          <span className="ml-auto text-primary font-semibold tabular-nums">
            {ko ? '입금' : 'Net'} {fmtN(totals.net)}원
          </span>
        </div>
      )}

      {/* ── 예약 목록 ── */}
      <div className="px-4 pt-3 flex flex-col gap-4">
        {grouped.map(([ym, bks]) => {
          const groupNet    = bks.reduce((s, b) => s + b.amount - commAmt(b.amount, b.commission), 0);
          const groupAmount = bks.reduce((s, b) => s + b.amount, 0);
          return (
            <div key={ym}>
              {/* 월 헤더 */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-bold text-muted-foreground/60 uppercase tracking-wide">
                  {fmtYM(ym + '-01')}
                </span>
                <span className="text-[11px] text-muted-foreground/50 tabular-nums">
                  {bks.length}{ko ? '건' : ''} &nbsp;·&nbsp; {fmtN(groupAmount)}원 &nbsp;·&nbsp; {ko ? '입금' : 'Net'} {fmtN(groupNet)}원
                </span>
              </div>

              {/* 카드 */}
              <div className="flex flex-col gap-2.5">
                {bks.map(b => {
                  const info = propMap.get(b.propertyId ?? '');
                  return (
                    <BookingCard
                      key={b.id}
                      b={b}
                      propColor={properties.length > 1 ? info?.color : undefined}
                      propName={properties.length > 1 ? info?.name : undefined}
                      onTap={() => openBookingModal(b.id)}
                      ko={ko}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 빈 상태 ── */}
      {rows.length === 0 && (
        <div className="flex flex-col items-center justify-center pt-24 px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/40 flex items-center justify-center mb-4">
            <FileText size={24} className="text-muted-foreground/30" />
          </div>
          <p className="text-[13px] text-muted-foreground/50 leading-relaxed">
            {isFiltered
              ? (ko ? '검색 결과가 없습니다' : 'No results found')
              : (ko ? '예약 데이터가 없습니다' : 'No bookings yet')}
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

      <BookingEditModal />
    </div>
  );
};

export default BookingsPage;
