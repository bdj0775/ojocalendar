import { useState, useMemo } from 'react';
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
  | 'channel' | 'amount' | 'commRate' | 'commission' | 'net'
  | 'adr' | 'leadTime' | 'bookingDate';

type EditableField =
  | 'checkIn' | 'checkOut' | 'guestName' | 'guests'
  | 'channel' | 'amount' | 'commRate' | 'commission' | 'bookingDate';

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

// ── filter select style — gray fill, no border ────────────────────────
const filterCls = 'text-[12px] font-medium bg-muted/60 hover:bg-muted rounded-lg px-3 py-1.5 text-foreground outline-none cursor-pointer transition-colors duration-150';
const filterSearchCls = 'pl-7 pr-6 py-1.5 text-[12px] bg-muted/60 hover:bg-muted rounded-lg text-foreground placeholder:text-muted-foreground/40 outline-none focus:bg-muted transition-colors duration-150 w-44';

// ── main component ────────────────────────────────────────────────────
const DesktopBookings = () => {
  const { language } = useTranslation();
  const ko = language === 'ko';
  const { bookings, properties, addBooking, updateBooking, deleteBooking } = useStore();

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

  // ── derived years ─────────────────────────────────────────────────
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
        case 'checkIn':     va = a.checkIn;    vb = b.checkIn;    break;
        case 'checkOut':    va = a.checkOut;   vb = b.checkOut;   break;
        case 'nights':      va = na;           vb = nb;           break;
        case 'guestName':   va = a.guestName;  vb = b.guestName;  break;
        case 'guests':      va = a.guests;     vb = b.guests;     break;
        case 'channel':     va = a.channel;    vb = b.channel;    break;
        case 'amount':      va = a.amount;     vb = b.amount;     break;
        case 'commRate':    va = a.amount > 0 ? a.commission / a.amount : 0; vb = b.amount > 0 ? b.commission / b.amount : 0; break;
        case 'commission':  va = a.commission; vb = b.commission; break;
        case 'net':         va = a.amount - a.commission; vb = b.amount - b.commission; break;
        case 'adr':         va = a.amount / na; vb = b.amount / nb; break;
        case 'leadTime':    va = a.bookingDate ? diffDays(a.bookingDate, a.checkIn) : 0; vb = b.bookingDate ? diffDays(b.bookingDate, b.checkIn) : 0; break;
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
    commission: rows.reduce((s, b) => s + b.commission, 0),
    net:        rows.reduce((s, b) => s + b.amount - b.commission, 0),
  }), [rows]);

  // ── sort handler ──────────────────────────────────────────────────
  const handleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  // ── delete handler ────────────────────────────────────────────────
  const handleDelete = async (id: string, guestName: string) => {
    const msg = ko ? `'${guestName}' 예약을 삭제할까요?` : `Delete booking for '${guestName}'?`;
    if (!window.confirm(msg)) return;
    await deleteBooking(id);
  };

  // ── inline edit ───────────────────────────────────────────────────
  const startEdit = (id: string, field: EditableField, val: string) => setEditCell({ id, field, draft: val });

  const commitEdit = async () => {
    if (!editCell) return;
    const { id, field, draft: val } = editCell;
    setEditCell(null);
    const booking = bookings.find(b => b.id === id);
    if (!booking) return;

    const patch: Partial<Booking> = {};
    switch (field) {
      case 'guestName':   patch.guestName  = val; break;
      case 'checkIn':     if (val) patch.checkIn  = val; break;
      case 'checkOut':    if (val) patch.checkOut = val; break;
      case 'guests':      patch.guests     = Math.max(1, parseInt(val, 10) || 1); break;
      case 'channel':     patch.channel    = val as Channel; break;
      case 'amount':      patch.amount     = parseFloat(val) || 0; break;
      case 'commission':  patch.commission = parseFloat(val) || 0; break;
      case 'commRate': {
        const rate = parseFloat(val) || 0;
        patch.commission = Math.round(booking.amount * rate / 100);
        break;
      }
      case 'bookingDate': if (val) patch.bookingDate = val; break;
    }
    if (Object.keys(patch).length > 0) await updateBooking(id, patch);
  };

  // ── save new booking ──────────────────────────────────────────────
  const handleSaveNew = async () => {
    if (!draft.guestName.trim() || !draft.checkIn || !draft.checkOut) return;
    const amount     = parseFloat(draft.amount) || 0;
    const commission = Math.round(amount * (parseFloat(draft.commRate) || 0) / 100);
    await addBooking({
      guestName: draft.guestName.trim(), checkIn: draft.checkIn, checkOut: draft.checkOut,
      bookingDate: draft.bookingDate || today,
      guests: Math.max(1, parseInt(draft.guests, 10) || 1), infants: 0,
      nationality: 'Korea', channel: draft.channel, status: 'confirmed',
      amount, commission, propertyId: draft.propertyId || properties[0]?.id,
    });
    setAdding(false);
    setDraft(blankDraft(properties[0]?.id ?? '', today));
  };

  // ── cell helpers ──────────────────────────────────────────────────
  // font sizes: body=12px, RO muted=12px, header label=11px
  const tdBase     = 'px-2.5 py-2.5 text-[12px] leading-none whitespace-nowrap';
  const tdEditable = `${tdBase} cursor-pointer hover:bg-accent/20 transition-colors`;
  const tdRO       = `${tdBase} text-muted-foreground/60`;
  const inputCls   = 'w-full text-[12px] bg-card border border-primary/60 rounded-[3px] px-1.5 py-0.5 outline-none focus:border-primary tabular-nums';
  const newInputCls = 'w-full text-[12px] bg-muted/40 rounded-[3px] px-1.5 py-1 outline-none focus:bg-card focus:ring-1 focus:ring-primary/40 transition-all placeholder:text-muted-foreground/30 tabular-nums';

  // ── inline edit cell renderer ─────────────────────────────────────
  const renderEditCell = (
    b: typeof rows[0],
    field: EditableField,
    display: React.ReactNode,
    editVal: string,
    type: 'text' | 'number' | 'date' | 'select',
    align: 'left' | 'right' | 'center' = 'left',
  ) => {
    const isEditing = editCell?.id === b.id && editCell?.field === field;
    const alignCls  = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : '';

    if (isEditing) {
      if (type === 'select') {
        return (
          <td key={field} className={`${tdBase} ${alignCls} p-1`}>
            <select autoFocus className={inputCls}
              value={editCell.draft}
              onChange={e => setEditCell(ec => ec ? { ...ec, draft: e.target.value } : null)}
              onBlur={commitEdit}
            >
              {ALL_CHANNELS.map(ch => <option key={ch} value={ch}>{ch}</option>)}
            </select>
          </td>
        );
      }
      return (
        <td key={field} className={`${tdBase} ${alignCls} p-1`}>
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
      <td key={field} className={`${tdEditable} ${alignCls}`}
        onDoubleClick={() => startEdit(b.id, field, editVal)}
        title={ko ? '더블클릭하여 편집' : 'Double-click to edit'}
      >
        {display}
      </td>
    );
  };

  // ── column header ─────────────────────────────────────────────────
  const Th = ({ col, label, align = 'left' }: { col?: SortCol; label: string; align?: 'left' | 'right' | 'center' }) => {
    const alignCls = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';
    return (
      <th
        className={`px-2.5 py-2.5 text-[11px] font-medium text-muted-foreground/50 select-none whitespace-nowrap border-b border-border/50 ${col ? 'cursor-pointer hover:text-muted-foreground' : ''}`}
        onClick={col ? () => handleSort(col) : undefined}
      >
        <span className={`inline-flex items-center ${alignCls} w-full`}>
          {label}
          {col && <SortIcon active={sortCol === col} dir={sortDir} />}
        </span>
      </th>
    );
  };

  // ── draft computed values ─────────────────────────────────────────
  const draftNights     = draft.checkIn && draft.checkOut ? diffDays(draft.checkIn, draft.checkOut) : 0;
  const draftAmount     = parseFloat(draft.amount) || 0;
  const draftCommission = Math.round(draftAmount * (parseFloat(draft.commRate) || 0) / 100);
  const draftNet        = draftAmount - draftCommission;
  const draftADR        = draftNights > 0 ? Math.round(draftAmount / draftNights) : 0;
  const draftLeadTime   = draft.bookingDate && draft.checkIn ? diffDays(draft.bookingDate, draft.checkIn) : null;

  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">

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
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 pointer-events-none" />
          <input type="text" placeholder={ko ? '예약자명 검색...' : 'Search guest...'}
            value={fsearch} onChange={e => setFSearch(e.target.value)}
            className={filterSearchCls}
          />
          {fsearch && (
            <button onClick={() => setFSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground">
              <X size={11} />
            </button>
          )}
        </div>

        <span className="text-[11px] text-muted-foreground/40 whitespace-nowrap pl-1">
          {rows.length}{ko ? '건' : ' rows'}
        </span>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto [scrollbar-width:thin]">
        <table className="w-full border-collapse" style={{ tableLayout: 'fixed', minWidth: 1100 }}>
          <colgroup>
            <col style={{ width: 76 }} />   {/* 연월 */}
            <col style={{ width: 62 }} />   {/* 입실 */}
            <col style={{ width: 62 }} />   {/* 퇴실 */}
            <col style={{ width: 46 }} />   {/* 박수 */}
            <col style={{ width: 112 }} />  {/* 예약자명 */}
            <col style={{ width: 44 }} />   {/* 인원 */}
            <col style={{ width: 80 }} />   {/* 채널 */}
            <col style={{ width: 88 }} />   {/* 결제금액 */}
            <col style={{ width: 56 }} />   {/* 수수료율 */}
            <col style={{ width: 80 }} />   {/* 수수료 */}
            <col style={{ width: 88 }} />   {/* 입금액 */}
            <col style={{ width: 76 }} />   {/* ADR */}
            <col style={{ width: 58 }} />   {/* 리드타임 */}
            <col style={{ width: 76 }} />   {/* 예약일 */}
            <col style={{ width: 36 }} />   {/* 삭제 */}
          </colgroup>

          {/* ── sticky thead ── */}
          <thead className="sticky top-0 z-10 bg-background">
            <tr>
              <Th label="연월" />
              <Th col="checkIn"     label="입실" />
              <Th col="checkOut"    label="퇴실" />
              <Th col="nights"      label="박수"   align="center" />
              <Th col="guestName"   label="예약자명" />
              <Th col="guests"      label="인원"   align="center" />
              <Th col="channel"     label="채널" />
              <Th col="amount"      label="결제금액" align="right" />
              <Th col="commRate"    label="수수료율" align="right" />
              <Th col="commission"  label="수수료"  align="right" />
              <Th col="net"         label="입금액"  align="right" />
              <Th col="adr"         label="ADR"    align="right" />
              <Th col="leadTime"    label="리드타임" align="center" />
              <Th col="bookingDate" label="예약일" />
              <th className="px-2.5 py-2.5 border-b border-border/50" />
            </tr>
          </thead>

          <tbody>
            {/* ── empty state ── */}
            {rows.length === 0 && (
              <tr>
                <td colSpan={15} className="py-20 text-center text-[13px] text-muted-foreground/30">
                  {ko ? '예약 데이터가 없습니다' : 'No bookings found'}
                </td>
              </tr>
            )}

            {/* ── booking rows ── */}
            {rows.map((b, idx) => {
              const nights   = diffDays(b.checkIn, b.checkOut);
              const net      = b.amount - b.commission;
              const adr      = nights > 0 ? Math.round(b.amount / nights) : 0;
              const leadTime = b.bookingDate ? diffDays(b.bookingDate, b.checkIn) : null;
              const commRate = b.amount > 0 ? ((b.commission / b.amount) * 100).toFixed(1) : '0.0';

              return (
                <tr key={b.id}
                  className={`group border-b border-border/20 hover:bg-accent/10 transition-colors ${idx % 2 !== 0 ? 'bg-muted/[0.06]' : 'bg-card'}`}
                >
                  {/* 연월 — read-only */}
                  <td className={`${tdRO} text-[11px]`}>{fmtYM(b.checkIn)}</td>

                  {/* 입실 */}
                  {renderEditCell(b, 'checkIn',  <span className="text-foreground/75">{fmtMD(b.checkIn)}</span>,  b.checkIn,  'date')}
                  {/* 퇴실 */}
                  {renderEditCell(b, 'checkOut', <span className="text-foreground/75">{fmtMD(b.checkOut)}</span>, b.checkOut, 'date')}

                  {/* 숙박수 */}
                  <td className={`${tdRO} text-center`}>{nights}박</td>

                  {/* 예약자명 */}
                  {renderEditCell(b, 'guestName', <span className="font-medium text-foreground">{b.guestName || '—'}</span>, b.guestName, 'text')}

                  {/* 인원 */}
                  {renderEditCell(b, 'guests', <span className="text-foreground/70">{b.guests}</span>, String(b.guests), 'number', 'center')}

                  {/* 채널 */}
                  {renderEditCell(b, 'channel', <ChDot ch={b.channel} />, b.channel, 'select')}

                  {/* 결제금액 */}
                  {renderEditCell(b, 'amount', <span className="font-medium text-foreground tabular-nums">{fmtN(b.amount)}</span>, String(b.amount), 'number', 'right')}

                  {/* 수수료율 */}
                  {renderEditCell(b, 'commRate', <span className="text-muted-foreground tabular-nums">{commRate}%</span>, commRate, 'number', 'right')}

                  {/* 수수료 */}
                  {renderEditCell(b, 'commission', <span className="text-destructive/60 tabular-nums">-{fmtN(b.commission)}</span>, String(b.commission), 'number', 'right')}

                  {/* 입금액 — read-only */}
                  <td className={`${tdBase} text-right`}>
                    <span className="font-semibold text-primary tabular-nums">{fmtN(net)}</span>
                  </td>

                  {/* ADR — read-only */}
                  <td className={`${tdRO} text-right tabular-nums`}>{fmtN(adr)}</td>

                  {/* 리드타임 — read-only */}
                  <td className={`${tdRO} text-center tabular-nums`}>{leadTime !== null ? `${leadTime}일` : '—'}</td>

                  {/* 예약일 */}
                  {renderEditCell(b, 'bookingDate', <span className="text-muted-foreground/60">{b.bookingDate ? fmtMD(b.bookingDate) : '—'}</span>, b.bookingDate ?? '', 'date')}

                  {/* 삭제 버튼 — 평소 숨김, hover 시 표시 */}
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

            {/* ── 합계 행 ── */}
            {rows.length > 0 && (
              <tr className="sticky bottom-0 border-t border-border/60 bg-background">
                <td colSpan={3} className={`${tdBase} text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wide`}>
                  {ko ? '합계' : 'Total'} <span className="font-normal opacity-50">({rows.length})</span>
                </td>
                <td className={`${tdBase} text-center font-semibold text-foreground/70`}>{totals.nights}박</td>
                <td colSpan={3} />
                <td className={`${tdBase} text-right font-bold text-foreground tabular-nums`}>{fmtN(totals.amount)}</td>
                <td />
                <td className={`${tdBase} text-right text-destructive/60 tabular-nums`}>-{fmtN(totals.commission)}</td>
                <td className={`${tdBase} text-right font-bold text-primary tabular-nums`}>{fmtN(totals.net)}</td>
                <td colSpan={4} />
              </tr>
            )}

            {/* ── 신규 예약 입력 행 ── */}
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
                <td className={`${tdBase} text-right text-destructive/60 tabular-nums`}>{draftAmount > 0 ? `-${fmtN(draftCommission)}` : '—'}</td>
                <td className={`${tdBase} text-right font-semibold text-primary tabular-nums`}>{draftAmount > 0 ? fmtN(draftNet) : '—'}</td>
                <td className={`${tdRO} text-right tabular-nums`}>{draftADR > 0 ? fmtN(draftADR) : '—'}</td>
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
            <span className="text-[11px] text-muted-foreground/40 ml-1">
              {ko ? '예약자명·입실·퇴실은 필수입력입니다' : 'Guest name, check-in & check-out are required'}
            </span>
          </>
        ) : (
          <button onClick={() => setAdding(true)}
            className="h-7 px-3 flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground/60 hover:text-primary bg-muted/40 hover:bg-muted/70 rounded-lg transition-colors"
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
