import { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, ChevronUp, ChevronDown, ChevronsUpDown, Search, X, Trash2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useTranslation } from '../../hooks/useTranslation';
import type { Booking, Channel } from '../../types';

// ── helpers ───────────────────────────────────────────────────────────
const diffDays = (a: string, b: string) =>
  !a || !b ? 0 : Math.max(0, Math.round(
    (new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000,
  ));

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const fmtYM = (ds: string) => { if (!ds) return '—'; const [y, m] = ds.split('-').map(Number); return `${y}년 ${m}월`; };
const fmtMD = (ds: string) => { if (!ds) return '—'; const [, m, d] = ds.split('-').map(Number); return `${m}/${d}`; };
const fmtN  = (v: number)  => v.toLocaleString();

// commission 필드 = 수수료율(%) 그대로 저장
// 수수료 금액 = round(amount * commission / 100)
const commAmt = (b: Pick<Booking, 'amount' | 'commission'>) =>
  Math.round(b.amount * b.commission / 100);

// ── constants ─────────────────────────────────────────────────────────
const ALL_CHANNELS: Channel[] = ['Airbnb', 'Booking.com', 'Naver', 'Direct'];

const CH_DOT: Record<string, string> = {
  Airbnb:        'bg-rose-500',
  'Booking.com': 'bg-blue-600',
  Naver:         'bg-emerald-500',
  Direct:        'bg-violet-500',
};

// ── types ─────────────────────────────────────────────────────────────
type SortCol =
  | 'checkIn' | 'checkOut' | 'nights' | 'guestName' | 'guests'
  | 'channel' | 'amount' | 'commRate' | 'net'
  | 'adr' | 'leadTime' | 'bookingDate';

// commission(rate)을 직접 편집 → patch.commission = newRate
type EditableField =
  | 'checkIn' | 'checkOut' | 'guestName' | 'guests'
  | 'channel' | 'amount' | 'commRate' | 'bookingDate';

interface EditCell { id: string; field: EditableField; draft: string; }

interface NewDraft {
  guestName: string; checkIn: string; checkOut: string;
  guests: string; channel: Channel; amount: string;
  commRate: string; bookingDate: string; propertyId: string;
}

const blankDraft = (propId: string, today: string): NewDraft => ({
  guestName: '', checkIn: '', checkOut: '', guests: '2',
  channel: 'Airbnb', amount: '', commRate: '17',
  bookingDate: today, propertyId: propId,
});

// ── sub-components ────────────────────────────────────────────────────
const ChDot = ({ ch }: { ch: string }) => (
  <span className="inline-flex items-center gap-1.5 text-[12px]">
    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${CH_DOT[ch] ?? 'bg-muted-foreground'}`} />
    {ch === 'Booking.com' ? 'Booking' : ch}
  </span>
);

const SortIcon = ({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) => {
  if (!active) return <ChevronsUpDown size={10} className="opacity-25 ml-0.5 flex-shrink-0" />;
  return dir === 'asc'
    ? <ChevronUp   size={10} className="text-primary ml-0.5 flex-shrink-0" />
    : <ChevronDown size={10} className="text-primary ml-0.5 flex-shrink-0" />;
};

const filterCls   = 'text-[12px] font-medium bg-muted/60 hover:bg-muted rounded-lg px-3 py-1.5 text-foreground outline-none cursor-pointer transition-colors duration-150';
const filterSearch = 'pl-7 pr-6 py-1.5 text-[12px] bg-muted/60 hover:bg-muted rounded-lg text-foreground placeholder:text-muted-foreground/50 outline-none focus:bg-muted transition-colors duration-150 w-44';

// ── component ─────────────────────────────────────────────────────────
const DesktopBookings = () => {
  const { language } = useTranslation();
  const ko = language === 'ko';
  const {
    bookings, properties, addBooking, updateBooking, deleteBooking,
    selectedCalendarDate, setSelectedCalendarDate,
  } = useStore();

  // filter
  const [fyear,   setFYear]   = useState<number | 'all'>('all');
  const [fmonth,  setFMonth]  = useState<number | 'all'>('all');
  const [fch,     setFCh]     = useState<Channel | 'all'>('all');
  const [fprop,   setFProp]   = useState<string>('all');
  const [fsearch, setFSearch] = useState('');

  // sort
  const [sortCol, setSortCol] = useState<SortCol>('checkIn');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  // inline edit
  const [editCell, setEditCell] = useState<EditCell | null>(null);

  // new row
  const today = todayISO();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<NewDraft>(() => blankDraft(properties[0]?.id ?? '', today));

  // calendar link — scroll + highlight
  const tableWrapRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());
  const [highlightId,    setHighlightId]    = useState<string | null>(null);
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(null);

  // ── derived years ────────────────────────────────────────────────
  const years = useMemo(() =>
    [...new Set(bookings.map(b => parseInt(b.checkIn.split('-')[0], 10)))].sort((a, b) => b - a),
    [bookings],
  );

  // ── filtered + sorted rows ────────────────────────────────────────
  const rows = useMemo(() => {
    let data = [...bookings];
    if (fyear  !== 'all') data = data.filter(b => parseInt(b.checkIn.split('-')[0], 10) === fyear);
    if (fmonth !== 'all') data = data.filter(b => parseInt(b.checkIn.split('-')[1], 10) === fmonth);
    if (fch    !== 'all') data = data.filter(b => b.channel === fch);
    if (fprop  !== 'all') data = data.filter(b => b.propertyId === fprop);
    if (fsearch.trim()) {
      const q = fsearch.toLowerCase();
      data = data.filter(b => b.guestName.toLowerCase().includes(q));
    }
    data.sort((a, b) => {
      let va: number | string = 0;
      let vb: number | string = 0;
      const na = diffDays(a.checkIn, a.checkOut) || 1;
      const nb = diffDays(b.checkIn, b.checkOut) || 1;
      switch (sortCol) {
        case 'checkIn':    va = a.checkIn;    vb = b.checkIn;    break;
        case 'checkOut':   va = a.checkOut;   vb = b.checkOut;   break;
        case 'nights':     va = na;           vb = nb;           break;
        case 'guestName':  va = a.guestName;  vb = b.guestName;  break;
        case 'guests':     va = a.guests;     vb = b.guests;     break;
        case 'channel':    va = a.channel;    vb = b.channel;    break;
        case 'amount':     va = a.amount;     vb = b.amount;     break;
        case 'commRate':   va = a.commission; vb = b.commission; break;
        case 'net':        va = a.amount - commAmt(a); vb = b.amount - commAmt(b); break;
        case 'adr':        va = a.amount / na; vb = b.amount / nb; break;
        case 'leadTime':   va = a.bookingDate ? diffDays(a.bookingDate, a.checkIn) : 0; vb = b.bookingDate ? diffDays(b.bookingDate, b.checkIn) : 0; break;
        case 'bookingDate': va = a.bookingDate ?? ''; vb = b.bookingDate ?? ''; break;
      }
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb as string) : (vb as string).localeCompare(va);
      return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
    return data;
  }, [bookings, fyear, fmonth, fch, fprop, fsearch, sortCol, sortDir]);

  // ── totals ────────────────────────────────────────────────────────
  const totals = useMemo(() => ({
    nights:     rows.reduce((s, b) => s + diffDays(b.checkIn, b.checkOut), 0),
    amount:     rows.reduce((s, b) => s + b.amount, 0),
    commission: rows.reduce((s, b) => s + commAmt(b), 0),
    net:        rows.reduce((s, b) => s + b.amount - commAmt(b), 0),
  }), [rows]);

  // ── Effect 1: calendar date click → set filters + pendingScrollId ─
  useEffect(() => {
    if (!selectedCalendarDate) return;
    const match = bookings.find(b =>
      b.checkIn <= selectedCalendarDate && b.checkOut > selectedCalendarDate,
    );
    if (!match) { setSelectedCalendarDate(null); return; }

    // 필터 전체 초기화 (특정 월·연도 지정 없이 전체로 두고 이동)
    setFYear('all');
    setFMonth('all');
    setFCh('all');
    setFProp('all');
    setFSearch('');

    setPendingScrollId(match.id);
    setSelectedCalendarDate(null);
  }, [selectedCalendarDate, bookings, setSelectedCalendarDate]);

  // ── Effect 2: rows 갱신 후 스크롤 + 하이라이트 ──────────────────
  useEffect(() => {
    if (!pendingScrollId) return;
    const el = rowRefs.current.get(pendingScrollId);
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightId(pendingScrollId);
    setPendingScrollId(null);
  }, [rows, pendingScrollId]);

  // ── sort ──────────────────────────────────────────────────────────
  const handleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  // ── delete ────────────────────────────────────────────────────────
  const handleDelete = async (id: string, guestName: string) => {
    const msg = ko ? `'${guestName}' 예약을 삭제할까요?` : `Delete booking for '${guestName}'?`;
    if (!window.confirm(msg)) return;
    await deleteBooking(id);
  };

  // ── inline edit ───────────────────────────────────────────────────
  const startEdit = (id: string, field: EditableField, val: string) =>
    setEditCell({ id, field, draft: val });

  const commitEdit = async () => {
    if (!editCell) return;
    const { id, field, draft: val } = editCell;
    setEditCell(null);
    const booking = bookings.find(b => b.id === id);
    if (!booking) return;
    const patch: Partial<Booking> = {};
    switch (field) {
      case 'guestName':  patch.guestName  = val; break;
      case 'checkIn':    if (val) patch.checkIn  = val; break;
      case 'checkOut':   if (val) patch.checkOut = val; break;
      case 'guests':     patch.guests     = Math.max(1, parseInt(val, 10) || 1); break;
      case 'channel':    patch.channel    = val as Channel; break;
      case 'amount':     patch.amount     = parseFloat(val) || 0; break;
      case 'commRate':   patch.commission = parseFloat(val) || 0; break; // 수수료율(%) 저장
      case 'bookingDate': if (val) patch.bookingDate = val; break;
    }
    if (Object.keys(patch).length > 0) await updateBooking(id, patch);
  };

  // ── save new booking ──────────────────────────────────────────────
  const handleSaveNew = async () => {
    if (!draft.guestName.trim() || !draft.checkIn || !draft.checkOut) return;
    const amount = parseFloat(draft.amount) || 0;
    await addBooking({
      guestName: draft.guestName.trim(), checkIn: draft.checkIn, checkOut: draft.checkOut,
      bookingDate: draft.bookingDate || today,
      guests: Math.max(1, parseInt(draft.guests, 10) || 1), infants: 0,
      nationality: 'Korea', channel: draft.channel,
      amount,
      commission: parseFloat(draft.commRate) || 0, // 수수료율(%) 저장
      propertyId: draft.propertyId || properties[0]?.id,
    });
    setAdding(false);
    setDraft(blankDraft(properties[0]?.id ?? '', today));
  };

  // ── cell style helpers ────────────────────────────────────────────
  const tdBase     = 'px-3 py-2.5 text-[12px] leading-none whitespace-nowrap';
  const tdEditable = `${tdBase} cursor-pointer hover:bg-accent/20 transition-colors`;
  const tdRO       = `${tdBase} text-muted-foreground/80`;
  const inputCls   = 'w-full text-[12px] bg-card border border-primary/60 rounded-[3px] px-1.5 py-0.5 outline-none focus:border-primary tabular-nums';
  const newInputCls = 'w-full text-[12px] bg-muted/40 rounded-[3px] px-1.5 py-1 outline-none focus:bg-card focus:ring-1 focus:ring-primary/40 transition-all placeholder:text-muted-foreground/40 tabular-nums';

  // ── inline edit cell ──────────────────────────────────────────────
  const EC = (
    b: typeof rows[0],
    field: EditableField,
    display: React.ReactNode,
    editVal: string,
    type: 'text' | 'number' | 'date' | 'select',
    align: 'left' | 'right' | 'center' = 'left',
  ) => {
    const isEditing = editCell?.id === b.id && editCell?.field === field;
    const aCls = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : '';
    if (isEditing) {
      if (type === 'select') return (
        <td key={field} className={`${tdBase} ${aCls} p-1`}>
          <select autoFocus className={inputCls}
            value={editCell.draft}
            onChange={e => setEditCell(ec => ec ? { ...ec, draft: e.target.value } : null)}
            onBlur={commitEdit}
          >
            {ALL_CHANNELS.map(ch => <option key={ch} value={ch}>{ch}</option>)}
          </select>
        </td>
      );
      return (
        <td key={field} className={`${tdBase} ${aCls} p-1`}>
          <input autoFocus type={type} className={inputCls}
            value={editCell.draft}
            onChange={e => setEditCell(ec => ec ? { ...ec, draft: e.target.value } : null)}
            onBlur={commitEdit}
            onKeyDown={e => {
              if (e.key === 'Enter')  { e.preventDefault(); commitEdit(); }
              if (e.key === 'Escape') { e.preventDefault(); setEditCell(null); }
            }}
          />
        </td>
      );
    }
    return (
      <td key={field} className={`${tdEditable} ${aCls}`}
        onDoubleClick={() => startEdit(b.id, field, editVal)}
        title={ko ? '더블클릭하여 편집' : 'Double-click to edit'}
      >
        {display}
      </td>
    );
  };

  // ── column header ─────────────────────────────────────────────────
  const Th = ({ col, label, align = 'left' }: { col?: SortCol; label: string; align?: 'left' | 'right' | 'center' }) => {
    const aCls = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';
    return (
      <th
        className={`px-3 py-2 text-[10.5px] font-semibold text-muted-foreground/50 select-none whitespace-nowrap border-b border-border/50 ${col ? 'cursor-pointer hover:text-muted-foreground/80' : ''}`}
        onClick={col ? () => handleSort(col) : undefined}
      >
        <span className={`inline-flex items-center gap-0.5 ${aCls} w-full`}>
          {label}
          {col && <SortIcon active={sortCol === col} dir={sortDir} />}
        </span>
      </th>
    );
  };

  // ── draft computed ────────────────────────────────────────────────
  const draftNights     = draft.checkIn && draft.checkOut ? diffDays(draft.checkIn, draft.checkOut) : 0;
  const draftAmount     = parseFloat(draft.amount) || 0;
  const draftRate       = parseFloat(draft.commRate) || 0;
  const draftCommission = Math.round(draftAmount * draftRate / 100);
  const draftNet        = draftAmount - draftCommission;
  const draftADR        = draftNights > 0 ? Math.round(draftAmount / draftNights) : 0;
  const draftLeadTime   = draft.bookingDate && draft.checkIn ? diffDays(draft.bookingDate, draft.checkIn) : null;

  // ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="h-full flex flex-col bg-background overflow-hidden"
      onClick={() => { if (highlightId) setHighlightId(null); }}
    >

      {/* ── Filter bar ── */}
      <div className="px-5 pb-3 flex items-center gap-2 flex-shrink-0 border-b border-border/30 flex-wrap">
        <select className={filterCls}
          value={fyear === 'all' ? 'all' : String(fyear)}
          onChange={e => setFYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))}
        >
          <option value="all">{ko ? '전체 연도' : 'All Years'}</option>
          {years.map(y => <option key={y} value={y}>{y}{ko ? '년' : ''}</option>)}
        </select>

        <select className={filterCls}
          value={fmonth === 'all' ? 'all' : String(fmonth)}
          onChange={e => setFMonth(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))}
        >
          <option value="all">{ko ? '전체 월' : 'All Months'}</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
            <option key={m} value={m}>{ko ? `${m}월` : new Date(2000, m - 1).toLocaleString('en', { month: 'short' })}</option>
          ))}
        </select>

        <select className={filterCls} value={fch}
          onChange={e => setFCh(e.target.value as Channel | 'all')}
        >
          <option value="all">{ko ? '전체 채널' : 'All Channels'}</option>
          {ALL_CHANNELS.map(ch => <option key={ch} value={ch}>{ch}</option>)}
        </select>

        {properties.length > 1 && (
          <select className={filterCls} value={fprop}
            onChange={e => setFProp(e.target.value)}
          >
            <option value="all">{ko ? '전체 숙소' : 'All Properties'}</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}

        <div className="relative ml-auto">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" />
          <input type="text" placeholder={ko ? '예약자명 검색...' : 'Search guest...'}
            value={fsearch} onChange={e => setFSearch(e.target.value)}
            className={filterSearch}
          />
          {fsearch && (
            <button onClick={() => setFSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground">
              <X size={11} />
            </button>
          )}
        </div>

        <span className="text-[11px] text-muted-foreground/50 whitespace-nowrap pl-1">
          {rows.length}{ko ? '건' : ' rows'}
        </span>
      </div>

      {/* ── Table ── */}
      <div ref={tableWrapRef} className="flex-1 overflow-auto [scrollbar-width:thin]">
        <table className="w-full border-collapse" style={{ tableLayout: 'fixed', minWidth: 1080 }}>
          <colgroup>
            <col style={{ width: 70 }} />   {/* 연월 */}
            <col style={{ width: 58 }} />   {/* 입실 */}
            <col style={{ width: 58 }} />   {/* 퇴실 */}
            <col style={{ width: 44 }} />   {/* 박수 */}
            <col style={{ width: 116 }} />  {/* 예약자명 */}
            <col style={{ width: 46 }} />   {/* 인원 */}
            <col style={{ width: 76 }} />   {/* 채널 */}
            <col style={{ width: 96 }} />   {/* 결제금액 */}
            <col style={{ width: 52 }} />   {/* 수수료율 */}
            <col style={{ width: 90 }} />   {/* 수수료 금액 */}
            <col style={{ width: 96 }} />   {/* 입금액 */}
            <col style={{ width: 80 }} />   {/* ADR */}
            <col style={{ width: 54 }} />   {/* 리드타임 */}
            <col style={{ width: 70 }} />   {/* 예약일 */}
            <col style={{ width: 34 }} />   {/* 삭제 */}
          </colgroup>

          <thead className="sticky top-0 z-10 bg-background">
            <tr>
              <Th label="연월" />
              <Th col="checkIn"    label="입실" />
              <Th col="checkOut"   label="퇴실" />
              <Th col="nights"     label="박수"    align="center" />
              <Th col="guestName"  label="예약자명" />
              <Th col="guests"     label="인원"    align="center" />
              <Th col="channel"    label="채널" />
              <Th col="amount"     label="결제금액"  align="right" />
              <Th col="commRate"   label="수수료율"  align="right" />
              <Th                  label="수수료"   align="right" />
              <Th col="net"        label="입금액"   align="right" />
              <Th col="adr"        label="ADR"     align="right" />
              <Th col="leadTime"   label="리드타임"  align="center" />
              <Th col="bookingDate" label="예약일" />
              <th className="px-2.5 py-2.5 border-b border-border/50" />
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={15} className="py-20 text-center text-[13px] text-muted-foreground/50">
                  {ko ? '예약 데이터가 없습니다' : 'No bookings found'}
                </td>
              </tr>
            )}

            {rows.map((b, idx) => {
              const nights      = diffDays(b.checkIn, b.checkOut);
              const commAmount  = commAmt(b);                      // 수수료 금액
              const net         = b.amount - commAmount;
              const adr         = nights > 0 ? Math.round(b.amount / nights) : 0;
              const leadTime    = b.bookingDate ? diffDays(b.bookingDate, b.checkIn) : null;
              const isHighlight = highlightId === b.id;

              return (
                <tr
                  key={b.id}
                  ref={el => { if (el) rowRefs.current.set(b.id, el); else rowRefs.current.delete(b.id); }}
                  className={[
                    'group border-b border-border/20 transition-colors',
                    isHighlight
                      ? 'bg-primary/10 ring-1 ring-inset ring-primary/30'
                      : idx % 2 !== 0 ? 'bg-muted/[0.06] hover:bg-accent/10' : 'bg-card hover:bg-accent/10',
                  ].join(' ')}
                >
                  {/* 연월 */}
                  <td className={`${tdRO} text-[11px]`}>{fmtYM(b.checkIn)}</td>

                  {/* 입실 */}
                  {EC(b, 'checkIn',  <span className="text-foreground/80">{fmtMD(b.checkIn)}</span>,  b.checkIn,  'date')}
                  {/* 퇴실 */}
                  {EC(b, 'checkOut', <span className="text-foreground/80">{fmtMD(b.checkOut)}</span>, b.checkOut, 'date')}

                  {/* 박수 */}
                  <td className={`${tdRO} text-center`}>{nights}박</td>

                  {/* 예약자명 */}
                  {EC(b, 'guestName', <span className="font-medium text-foreground">{b.guestName || '—'}</span>, b.guestName, 'text')}

                  {/* 인원 — 명 표기 */}
                  {EC(b, 'guests', <span className="text-foreground/80">{b.guests}명</span>, String(b.guests), 'number', 'center')}

                  {/* 채널 */}
                  {EC(b, 'channel', <ChDot ch={b.channel} />, b.channel, 'select')}

                  {/* 결제금액 — 원 표기 */}
                  {EC(b, 'amount', <span className="font-medium text-foreground tabular-nums">{fmtN(b.amount)}원</span>, String(b.amount), 'number', 'right')}

                  {/* 수수료율 — commission 필드 = 율(%) 직접 표시 */}
                  {EC(b, 'commRate', <span className="text-muted-foreground/80 tabular-nums">{b.commission}%</span>, String(b.commission), 'number', 'right')}

                  {/* 수수료 금액 — 계산값, read-only */}
                  <td className={`${tdRO} text-right tabular-nums`}>-{fmtN(commAmount)}원</td>

                  {/* 입금액 — read-only */}
                  <td className={`${tdBase} text-right`}>
                    <span className="font-semibold text-primary tabular-nums">{fmtN(net)}원</span>
                  </td>

                  {/* ADR — read-only */}
                  <td className={`${tdRO} text-right tabular-nums`}>{fmtN(adr)}원</td>

                  {/* 리드타임 — read-only */}
                  <td className={`${tdRO} text-center tabular-nums`}>{leadTime !== null ? `${leadTime}일` : '—'}</td>

                  {/* 예약일 */}
                  {EC(b, 'bookingDate', <span className="text-muted-foreground/80">{b.bookingDate ? fmtMD(b.bookingDate) : '—'}</span>, b.bookingDate ?? '', 'date')}

                  {/* 삭제 버튼 */}
                  <td className={`${tdBase} text-center`}>
                    <button
                      onClick={() => handleDelete(b.id, b.guestName)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-muted-foreground/40 hover:text-destructive p-0.5 rounded"
                      title={ko ? '예약 삭제' : 'Delete booking'}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}

            {/* ── 합계 ── */}
            {rows.length > 0 && (
              <tr className="sticky bottom-0 border-t border-border/60 bg-background">
                <td colSpan={3} className={`${tdBase} text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wide`}>
                  {ko ? '합계' : 'Total'} <span className="font-normal opacity-60">({rows.length})</span>
                </td>
                <td className={`${tdBase} text-center font-semibold text-foreground/80`}>{totals.nights}박</td>
                <td colSpan={3} />
                <td className={`${tdBase} text-right font-bold text-foreground tabular-nums`}>{fmtN(totals.amount)}원</td>
                <td />
                <td className={`${tdBase} text-right text-muted-foreground/80 tabular-nums`}>-{fmtN(totals.commission)}원</td>
                <td className={`${tdBase} text-right font-bold text-primary tabular-nums`}>{fmtN(totals.net)}원</td>
                <td colSpan={4} />
              </tr>
            )}

            {/* ── 신규 입력 행 ── */}
            {adding && (
              <tr className="border-t-2 border-primary/20 bg-primary/[0.03]">
                <td className={`${tdRO} text-[11px]`}>{draft.checkIn ? fmtYM(draft.checkIn) : '—'}</td>
                <td className="p-1"><input type="date" className={newInputCls} value={draft.checkIn} onChange={e => setDraft(d => ({ ...d, checkIn: e.target.value }))} /></td>
                <td className="p-1"><input type="date" className={newInputCls} value={draft.checkOut} onChange={e => setDraft(d => ({ ...d, checkOut: e.target.value }))} /></td>
                <td className={`${tdRO} text-center`}>{draftNights > 0 ? `${draftNights}박` : '—'}</td>
                <td className="p-1"><input type="text" placeholder={ko ? '예약자명' : 'Guest name'} className={newInputCls} value={draft.guestName} onChange={e => setDraft(d => ({ ...d, guestName: e.target.value }))} /></td>
                <td className="p-1"><input type="number" min={1} className={`${newInputCls} text-center`} value={draft.guests} onChange={e => setDraft(d => ({ ...d, guests: e.target.value }))} /></td>
                <td className="p-1">
                  <select className={newInputCls} value={draft.channel} onChange={e => setDraft(d => ({ ...d, channel: e.target.value as Channel }))}>
                    {ALL_CHANNELS.map(ch => <option key={ch} value={ch}>{ch}</option>)}
                  </select>
                </td>
                <td className="p-1"><input type="number" placeholder="0" className={`${newInputCls} text-right`} value={draft.amount} onChange={e => setDraft(d => ({ ...d, amount: e.target.value }))} /></td>
                <td className="p-1"><input type="number" placeholder="%" className={`${newInputCls} text-right`} value={draft.commRate} onChange={e => setDraft(d => ({ ...d, commRate: e.target.value }))} /></td>
                <td className={`${tdRO} text-right tabular-nums`}>{draftAmount > 0 ? `-${fmtN(draftCommission)}원` : '—'}</td>
                <td className={`${tdBase} text-right font-semibold text-primary tabular-nums`}>{draftAmount > 0 ? `${fmtN(draftNet)}원` : '—'}</td>
                <td className={`${tdRO} text-right tabular-nums`}>{draftADR > 0 ? `${fmtN(draftADR)}원` : '—'}</td>
                <td className={`${tdRO} text-center tabular-nums`}>{draftLeadTime !== null ? `${draftLeadTime}일` : '—'}</td>
                <td className="p-1"><input type="date" className={newInputCls} value={draft.bookingDate} onChange={e => setDraft(d => ({ ...d, bookingDate: e.target.value }))} /></td>
                <td />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer ── */}
      <div className="px-5 py-2.5 border-t border-border/40 flex-shrink-0 flex items-center gap-2.5 min-h-[44px]">
        {adding ? (
          <>
            <button onClick={handleSaveNew}
              disabled={!draft.guestName.trim() || !draft.checkIn || !draft.checkOut}
              className="h-7 px-4 text-[12px] font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
            >
              {ko ? '저장' : 'Save'}
            </button>
            <button onClick={() => { setAdding(false); setDraft(blankDraft(properties[0]?.id ?? '', today)); }}
              className="h-7 px-3 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {ko ? '취소' : 'Cancel'}
            </button>
            <span className="text-[11px] text-muted-foreground/50 ml-1">
              {ko ? '예약자명·입실·퇴실은 필수입력입니다' : 'Guest name, check-in & check-out are required'}
            </span>
          </>
        ) : (
          <button onClick={() => setAdding(true)}
            className="h-7 px-3 flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground/70 hover:text-primary bg-muted/40 hover:bg-muted/70 rounded-lg transition-colors"
          >
            <Plus size={13} />
            {ko ? '예약 추가' : 'Add booking'}
          </button>
        )}
      </div>
    </div>
  );
};

export default DesktopBookings;
