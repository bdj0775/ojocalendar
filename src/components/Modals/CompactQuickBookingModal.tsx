import { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react';
import { X, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { PROP_COLORS } from '../CalendarGrid/useBookingBars';

const MODAL_W = 264;
const CELL_GAP = 6; // 선택한 셀과 모달 사이 여백

const NATS = [
  { key: 'Korea',     label: '한국' },
  { key: 'Taiwan',    label: '대만' },
  { key: 'Singapore', label: '싱가폴' },
  { key: 'China',     label: '중국' },
  { key: 'Western',   label: '서구권' },
];

const CHANNELS = [
  { key: 'Airbnb',      label: '에어비앤비', rate: 17 },
  { key: 'Booking.com', label: '부킹닷컴',   rate: 17 },
  { key: 'Naver',       label: '네이버',      rate: 2  },
  { key: 'Direct',      label: '직접',        rate: 0  },
];

// ── 헬퍼 ──────────────────────────────────────────────────────────────────────
const addDays = (ds: string, n: number): string => {
  const [y, m, d] = ds.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};
const diffDays = (a: string, b: string) =>
  Math.max(0, Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000));
const getToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const isWeekend = (ds: string) => {
  const [y, m, d] = ds.split('-').map(Number);
  return [0, 6].includes(new Date(y, m - 1, d).getDay());
};
const buildDate = (y: number, m: number, d: number) => {
  const dim = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(Math.min(d, dim)).padStart(2, '0')}`;
};
const wrap = (v: number, min: number, max: number) =>
  v < min ? max : v > max ? min : v;

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  date:             string;
  anchorRect:       DOMRect;
  onClose:          () => void;
  onPreviewChange?: (checkIn: string, checkOut: string, channel: string, propertyId: string) => void;
}

const CompactQuickBookingModal = ({ date, anchorRect, onClose, onPreviewChange }: Props) => {
  const { properties, bookings, maintenance, addBooking, showToast } = useStore();

  // ── 위치 계산 (두 패스: invisible 렌더 → 높이 측정 → visible) ─────────────
  const modalRef              = useRef<HTMLDivElement>(null);
  const [modalH, setModalH]   = useState(280);
  const [visible, setVisible] = useState(false);

  useLayoutEffect(() => {
    if (modalRef.current) {
      setModalH(modalRef.current.offsetHeight);
      setVisible(true);
    }
  }, []);

  const pos = useMemo(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const M  = 8;

    // 수평: 셀 중앙 기준, 화면 경계 클램프
    const cx = anchorRect.left + anchorRect.width / 2;
    let left = Math.round(cx - MODAL_W / 2);
    left = Math.max(M, Math.min(vw - MODAL_W - M, left));

    // 수직: 아래 → 위 → 공간 더 많은 쪽 순서
    const below = vh - anchorRect.bottom - M;
    const above = anchorRect.top - M;
    let top: number;

    if (below >= modalH + CELL_GAP) {
      // 셀 아래 (셀이 완전히 보임)
      top = anchorRect.bottom + CELL_GAP;
    } else if (above >= modalH + CELL_GAP) {
      // 셀 위 (셀이 완전히 보임)
      top = anchorRect.top - modalH - CELL_GAP;
    } else if (above > below) {
      // 공간 부족 → 위쪽으로 최대한
      top = M;
    } else {
      // 공간 부족 → 아래쪽으로 최대한
      top = vh - modalH - M;
    }

    return { left, top };
  }, [anchorRect, modalH]);

  // ── 점유 숙소 ─────────────────────────────────────────────────────────────
  const occupiedIds = useMemo(() => {
    const s = new Set<string>();
    bookings.forEach(b => { if (b.checkIn <= date && b.checkOut > date && b.propertyId) s.add(b.propertyId); });
    maintenance.forEach(m => { if (m.startDate <= date && m.endDate > date && m.propertyId) s.add(m.propertyId); });
    return s;
  }, [bookings, maintenance, date]);

  // ── 상태 ──────────────────────────────────────────────────────────────────
  const [selectedPropertyId, setSelectedPropertyId] = useState(() => {
    const st = useStore.getState();
    const occ = new Set<string>();
    st.bookings.forEach(b => { if (b.checkIn <= date && b.checkOut > date && b.propertyId) occ.add(b.propertyId); });
    st.maintenance.forEach(m => { if (m.startDate <= date && m.endDate > date && m.propertyId) occ.add(m.propertyId); });
    return (st.properties.find(p => !occ.has(p.id)) ?? st.properties[0])?.id ?? '';
  });

  const selectedProp = properties.find(p => p.id === selectedPropertyId) ?? properties[0];
  const basePrice    = selectedProp?.basePrice ?? 0;
  const today        = getToday();

  const [guestName,    setGuestName]    = useState('');
  const [guestCount,   setGuestCount]   = useState(2);
  const [checkIn,      setCheckIn]      = useState(date);
  const [checkOut,     setCheckOut]     = useState(addDays(date, 1));
  const [nationality,  setNationality]  = useState('Korea');
  const [channel,      setChannel]      = useState('Airbnb');
  const [amount,       setAmount]       = useState(basePrice);
  const [amountRaw,    setAmountRaw]    = useState(() => basePrice.toLocaleString());
  const [amountCustom, setAmountCustom] = useState(false);
  const [commRate,     setCommRate]     = useState(17);
  const [commCustom,   setCommCustom]   = useState(false);
  const [memo,         setMemo]         = useState('');
  const [isSaving,     setIsSaving]     = useState(false);

  const nights     = diffDays(checkIn, checkOut);
  const leadTime   = diffDays(today, checkIn);
  const commission = Math.round(amount * commRate / 100);
  const weekend    = isWeekend(checkIn);

  // 날짜 분해
  const [ciY, ciM, ciD] = checkIn.split('-').map(Number);
  const [coY, coM, coD] = checkOut.split('-').map(Number);
  const ciDim = new Date(ciY, ciM, 0).getDate();
  const coDim = new Date(coY, coM, 0).getDate();

  useEffect(() => { onPreviewChange?.(checkIn, checkOut, channel, selectedPropertyId); }, [checkIn, checkOut, channel, selectedPropertyId, onPreviewChange]);
  useEffect(() => {
    if (!amountCustom) syncAmount((selectedProp?.basePrice ?? 0) * nights);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPropertyId]);

  const monthOccupancy = useMemo(() => {
    const [y, m] = checkIn.split('-').map(Number);
    const dim = new Date(y, m, 0).getDate();
    let occ = 0;
    for (let day = 1; day <= dim; day++) {
      const ds = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (bookings.some(b => b.status !== 'cancelled' && b.checkIn <= ds && b.checkOut > ds)) occ++;
    }
    return Math.round((occ / dim) * 100);
  }, [bookings, checkIn]);

  // ── 핸들러 ────────────────────────────────────────────────────────────────
  const syncAmount = (v: number) => { setAmount(v); setAmountRaw(v.toLocaleString()); };

  const handleCheckIn = (val: string) => {
    setCheckIn(val);
    const out = val >= checkOut ? addDays(val, 1) : checkOut;
    setCheckOut(out);
    if (!amountCustom) syncAmount(basePrice * diffDays(val, out));
  };
  const handleCheckOut = (val: string) => {
    if (val <= checkIn) return;
    setCheckOut(val);
    if (!amountCustom) syncAmount(basePrice * diffDays(checkIn, val));
  };
  const handleChannel = (ch: string) => {
    setChannel(ch);
    if (!commCustom) setCommRate(CHANNELS.find(c => c.key === ch)?.rate ?? 0);
  };

  // 체크인 스테퍼
  const stepCI = (type: 'month' | 'day', dir: 1 | -1) => {
    if (type === 'month') handleCheckIn(buildDate(ciY, wrap(ciM + dir, 1, 12), ciD));
    else                  handleCheckIn(buildDate(ciY, ciM, wrap(ciD + dir, 1, ciDim)));
  };
  // 체크아웃 스테퍼 — 체크인 이하면 자동 보정
  const stepCO = (type: 'month' | 'day', dir: 1 | -1) => {
    let candidate: string;
    if (type === 'month') candidate = buildDate(coY, wrap(coM + dir, 1, 12), coD);
    else                  candidate = buildDate(coY, coM, wrap(coD + dir, 1, coDim));
    if (candidate <= checkIn) candidate = addDays(checkIn, 1);
    handleCheckOut(candidate);
  };

  const handleSave = async () => {
    if (!guestName.trim()) { showToast('예약자명을 입력해주세요.', 'error'); return; }
    setIsSaving(true);
    try {
      await addBooking({
        guestName: guestName.trim(),
        checkIn, checkOut,
        guests: guestCount, infants: 0,
        nationality, channel,
        amount, commission: commRate,
        bookingDate: today,
        propertyId: selectedPropertyId || undefined,
        memo: memo.trim() || undefined,
      });
      showToast('예약이 저장되었습니다.', 'success');
      onClose();
    } catch {
      // store handles error toast
    } finally {
      setIsSaving(false);
    }
  };

  // ── 스타일 헬퍼 ───────────────────────────────────────────────────────────
  const chip = (active: boolean) =>
    `px-2 py-[3px] rounded-lg text-[10px] font-bold transition-all whitespace-nowrap flex-shrink-0 ${
      active
        ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
        : 'bg-muted/40 text-muted-foreground hover:bg-muted'
    }`;

  const stepBtn = 'w-5 h-6 flex items-center justify-center text-muted-foreground/50 hover:text-foreground active:bg-muted/40 rounded transition-colors flex-shrink-0';

  // ── 렌더 ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* 투명 백드롭 */}
      <div
        className="fixed inset-0 z-[40]"
        onClick={onClose}
        onTouchStart={e => e.stopPropagation()}
        onTouchMove={e => e.stopPropagation()}
        onTouchEnd={e => e.stopPropagation()}
      />

      <div
        ref={modalRef}
        className="fixed z-[41] bg-card rounded-2xl border border-border/40 shadow-xl overflow-hidden"
        style={{ width: MODAL_W, left: pos.left, top: pos.top, visibility: visible ? 'visible' : 'hidden' }}
        onClick={e => e.stopPropagation()}
        onTouchStart={e => e.stopPropagation()}
      >
        {/* ── 헤더 ── */}
        <div className="px-3 pt-3 pb-2">
          <div className="flex items-center gap-1 mb-1.5 flex-wrap">
            <span className="text-[9px] font-bold tracking-wider uppercase text-primary bg-primary/10 px-1.5 py-0.5 rounded">New</span>
            {properties.length > 1 && properties.map((p, idx) => {
              const occ = occupiedIds.has(p.id);
              const sel = selectedPropertyId === p.id;
              const dot = p.color || PROP_COLORS[idx % PROP_COLORS.length];
              return (
                <button
                  key={p.id}
                  onClick={() => !occ && setSelectedPropertyId(p.id)}
                  disabled={occ}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors ${
                    sel  ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                    : occ ? 'bg-muted/20 text-muted-foreground/30 line-through cursor-not-allowed'
                           : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dot }} />
                  {p.name}
                </button>
              );
            })}
            <button onClick={onClose} className="ml-auto w-5 h-5 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
              <X size={11} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="예약자명"
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              className="flex-1 text-[16px] font-bold text-slate-800 dark:text-slate-200 bg-transparent outline-none placeholder:text-muted-foreground/25 min-w-0 truncate"
            />
            <div className="flex items-center gap-0.5 shrink-0">
              <User size={11} className="text-muted-foreground/50 mr-0.5" />
              <button onClick={() => setGuestCount(Math.max(1, guestCount - 1))} className="w-5 h-5 flex items-center justify-center text-muted-foreground font-bold text-[15px]">−</button>
              <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200 w-4 text-center">{guestCount}</span>
              <button onClick={() => setGuestCount(guestCount + 1)} className="w-5 h-5 flex items-center justify-center text-muted-foreground font-bold text-[15px]">+</button>
            </div>
          </div>
        </div>

        <div className="h-px bg-border/30" />

        {/* ── 날짜: 스테퍼 ── */}
        <div className="px-3 py-2 flex items-center gap-2">
          {/* 체크인 */}
          <div className="flex-1 flex flex-col min-w-0">
            <span className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-wider mb-1">IN</span>
            <div className="flex items-center bg-muted/15 rounded-lg overflow-hidden">
              <button className={stepBtn} onClick={() => stepCI('month', -1)}><ChevronLeft size={9} /></button>
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex-1 text-center">{ciM}월</span>
              <button className={stepBtn} onClick={() => stepCI('month',  1)}><ChevronRight size={9} /></button>
              <div className="w-px h-3 bg-border/30" />
              <button className={stepBtn} onClick={() => stepCI('day', -1)}><ChevronLeft size={9} /></button>
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 w-[22px] text-center">{ciD}일</span>
              <button className={stepBtn} onClick={() => stepCI('day',  1)}><ChevronRight size={9} /></button>
            </div>
          </div>

          {/* 화살표 + 박수 */}
          <div className="flex flex-col items-center flex-shrink-0 gap-0.5 pt-3.5">
            <span className="text-muted-foreground/30 text-[9px] leading-none">→</span>
            <span className="text-[8px] font-bold text-primary bg-primary/10 px-1 rounded leading-none py-0.5">{nights}박</span>
          </div>

          {/* 체크아웃 */}
          <div className="flex-1 flex flex-col min-w-0">
            <span className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-wider mb-1">OUT</span>
            <div className="flex items-center bg-muted/15 rounded-lg overflow-hidden">
              <button className={stepBtn} onClick={() => stepCO('month', -1)}><ChevronLeft size={9} /></button>
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex-1 text-center">{coM}월</span>
              <button className={stepBtn} onClick={() => stepCO('month',  1)}><ChevronRight size={9} /></button>
              <div className="w-px h-3 bg-border/30" />
              <button className={stepBtn} onClick={() => stepCO('day', -1)}><ChevronLeft size={9} /></button>
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 w-[22px] text-center">{coD}일</span>
              <button className={stepBtn} onClick={() => stepCO('day',  1)}><ChevronRight size={9} /></button>
            </div>
          </div>
        </div>

        <div className="h-px bg-border/30" />

        {/* ── 국가 / 채널 ── */}
        <div className="px-3 py-2 space-y-1.5">
          <div className="flex gap-1.5 flex-wrap">
            {NATS.map(n => (
              <button key={n.key} className={chip(nationality === n.key)} onClick={() => setNationality(n.key)}>{n.label}</button>
            ))}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {CHANNELS.map(c => (
              <button key={c.key} className={chip(channel === c.key)} onClick={() => handleChannel(c.key)}>{c.label}</button>
            ))}
          </div>
        </div>

        <div className="h-px bg-border/30" />

        {/* ── 결제금액 / 수수료 ── */}
        <div className="px-3 py-2 grid grid-cols-2 gap-2">
          <div>
            <div className="flex items-center gap-1 mb-1">
              <span className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-wider">결제금액</span>
              <span className={`text-[8px] font-bold px-1 rounded ${weekend ? 'bg-orange-500/10 text-orange-500' : 'bg-muted text-muted-foreground/50'}`}>{weekend ? '주말' : '평일'}</span>
            </div>
            <div className="flex items-center gap-0.5 bg-muted/20 px-2 py-1.5 rounded-lg">
              <input
                type="text" inputMode="numeric" value={amountRaw}
                onChange={e => { const r = e.target.value.replace(/[^0-9]/g,''); setAmountRaw(r); setAmount(parseInt(r,10)||0); setAmountCustom(true); }}
                onFocus={e => { setAmountRaw(String(amount)); e.target.select(); }}
                onBlur={() => { const r=Math.round(amount/1000)*1000; setAmount(r); setAmountRaw(r.toLocaleString()); }}
                className="flex-1 text-[12px] font-bold bg-transparent outline-none text-slate-800 dark:text-slate-200 w-full min-w-0"
              />
              <span className="text-[9px] text-muted-foreground/40 shrink-0">원</span>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[8px] font-bold text-muted-foreground/40 uppercase tracking-wider">수수료</span>
              <span className="text-[8px] text-muted-foreground/40">{commission.toLocaleString()}원</span>
            </div>
            <div className="flex items-center gap-0.5 bg-muted/20 px-2 py-1.5 rounded-lg">
              <input
                type="number" min={0} max={100} value={commRate}
                onChange={e => { setCommRate(Number(e.target.value)); setCommCustom(true); }}
                className="flex-1 text-[12px] font-bold bg-transparent outline-none text-slate-800 dark:text-slate-200 w-full min-w-0"
              />
              <span className="text-[9px] text-muted-foreground/40 shrink-0">%</span>
            </div>
          </div>
        </div>

        <div className="h-px bg-border/30" />

        {/* ── 메모 (한 줄) ── */}
        <div className="px-3 py-2">
          <input
            type="text"
            value={memo}
            onChange={e => setMemo(e.target.value)}
            placeholder="메모..."
            className="w-full text-[11px] text-slate-800 dark:text-slate-200 bg-muted/20 rounded-lg px-2.5 py-1.5 outline-none placeholder:text-muted-foreground/25 font-medium"
          />
        </div>

        {/* ── 푸터 ── */}
        <div className="px-3 pb-3 flex items-center justify-between">
          <span className="text-[9px] font-semibold text-muted-foreground/40 uppercase tracking-wide">
            {leadTime > 0 ? `${leadTime}일 전` : '오늘'} · {monthOccupancy}%
          </span>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-[12px] font-bold hover:bg-primary/90 active:scale-[0.97] transition-all disabled:opacity-50"
          >
            {isSaving ? '저장 중…' : '예약 저장'}
          </button>
        </div>
      </div>
    </>
  );
};

export default CompactQuickBookingModal;
