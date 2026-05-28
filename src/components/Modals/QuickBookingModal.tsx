import { useState, useMemo, useEffect } from 'react';
import { X, User } from 'lucide-react';
import { useStore } from '../../store/useStore';
import DatePickerOverlay from '../ui/DatePickerOverlay';

// ── helpers ──────────────────────────────────────────────────────────────────
const DOW_KO = ['일', '월', '화', '수', '목', '금', '토'];

const fmtDateKo = (ds: string) => {
  const [y, m, d] = ds.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return `${m}월 ${d}일 (${DOW_KO[dow]}요일)`;
};

const addDays = (ds: string, n: number): string => {
  const [y, m, d] = ds.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

const diffDays = (from: string, to: string) => {
  const a = new Date(from + 'T00:00:00');
  const b = new Date(to + 'T00:00:00');
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
};

const getToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const isWeekendDate = (ds: string) => {
  const [y, m, d] = ds.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return dow === 0 || dow === 6;
};

// ── constants ─────────────────────────────────────────────────────────────────
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
  { key: 'Direct',      label: '직접예약',    rate: 0  },
];

// ── component ─────────────────────────────────────────────────────────────────
interface Props {
  date: string;
  onClose: () => void;
}

const QuickBookingModal = ({ date, onClose }: Props) => {
  const { properties, bookings, maintenance, addBooking, showToast } = useStore();

  // 해당 날짜에 이미 예약/휴무가 있는 숙소 ID 집합
  const occupiedPropertyIds = useMemo(() => {
    const s = new Set<string>();
    bookings.forEach(b => {
      if (b.checkIn <= date && b.checkOut > date && b.propertyId) s.add(b.propertyId);
    });
    maintenance.forEach(m => {
      if (m.startDate <= date && m.endDate > date && m.propertyId) s.add(m.propertyId);
    });
    return s;
  }, [bookings, maintenance, date]);

  // 첫 번째 여유 숙소로 자동 선택
  const [selectedPropertyId, setSelectedPropertyId] = useState(() => {
    const state = useStore.getState();
    const occ = new Set<string>();
    state.bookings.forEach(b => {
      if (b.checkIn <= date && b.checkOut > date && b.propertyId) occ.add(b.propertyId);
    });
    state.maintenance.forEach(m => {
      if (m.startDate <= date && m.endDate > date && m.propertyId) occ.add(m.propertyId);
    });
    const firstAvail = state.properties.find(p => !occ.has(p.id));
    return (firstAvail ?? state.properties[0])?.id ?? '';
  });

  const selectedProperty = properties.find(p => p.id === selectedPropertyId) ?? properties[0];
  const basePrice = selectedProperty?.basePrice ?? 0;
  const today = getToday();

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
  const [memoFocused,  setMemoFocused]  = useState(false);
  const [isSaving,     setIsSaving]     = useState(false);
  
  const [pickerType, setPickerType] = useState<'checkIn' | 'checkOut' | null>(null);

  const nights     = diffDays(checkIn, checkOut);

  // Recalculate amount when selected property changes (if not manually edited)
  useEffect(() => {
    if (!amountCustom) syncAmount((selectedProperty?.basePrice ?? 0) * nights);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPropertyId]);
  const leadTime   = diffDays(today, checkIn);
  const commission = Math.round(amount * commRate / 100);
  const weekend    = isWeekendDate(checkIn);

  // ── month occupancy ───────────────────────────────────────────────────────
  const monthOccupancy = useMemo(() => {
    const [y, m] = checkIn.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    let occ = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const ds = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (bookings.some(b => b.status !== 'cancelled' && b.checkIn <= ds && b.checkOut > ds)) occ++;
    }
    return Math.round((occ / daysInMonth) * 100);
  }, [bookings, checkIn]);

  // ── handlers ─────────────────────────────────────────────────────────────
  const syncAmount = (newAmt: number) => {
    setAmount(newAmt);
    setAmountRaw(newAmt.toLocaleString());
  };

  const handleCheckIn = (val: string) => {
    setCheckIn(val);
    const newOut = val >= checkOut ? addDays(val, 1) : checkOut;
    setCheckOut(newOut);
    if (!amountCustom) syncAmount(basePrice * diffDays(val, newOut));
  };

  const handleCheckOut = (val: string) => {
    setCheckOut(val);
    if (!amountCustom) syncAmount(basePrice * diffDays(checkIn, val));
  };

  const handleChannel = (ch: string) => {
    setChannel(ch);
    if (!commCustom) setCommRate(CHANNELS.find(c => c.key === ch)?.rate ?? 0);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setAmountRaw(raw);
    setAmount(parseInt(raw, 10) || 0);
    setAmountCustom(true);
  };

  const handleAmountBlur = () => {
    const rounded = Math.round(amount / 1000) * 1000;
    setAmount(rounded);
    setAmountRaw(rounded.toLocaleString());
  };

  const handleAmountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const v = amount + 1000;
      setAmount(v); setAmountRaw(v.toLocaleString()); setAmountCustom(true);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const v = Math.max(0, amount - 1000);
      setAmount(v); setAmountRaw(v.toLocaleString()); setAmountCustom(true);
    }
  };

  const handleAmountFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setAmountRaw(String(amount));
    e.target.select();
  };

  const handleSave = async () => {
    if (!guestName.trim()) {
      showToast('예약자명을 입력해주세요.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      await addBooking({
        guestName: guestName.trim(),
        checkIn, checkOut,
        guests: guestCount,
        infants: 0,
        nationality, channel,
        amount, commission: commRate,
        bookingDate: today,
        propertyId: selectedPropertyId || undefined,
        memo: memo.trim() || undefined,
      });
      showToast('예약이 저장되었습니다.', 'success');
      onClose();
    } catch {
      // handled by store
    } finally {
      setIsSaving(false);
    }
  };

  // ── style helpers ─────────────────────────────────────────────────────────
  const labelCls = 'text-[11px] font-semibold text-muted-foreground w-16 shrink-0 tracking-wide uppercase';

  const badge = (active: boolean) =>
    `px-3.5 py-1.5 rounded-xl text-[12px] font-bold transition-all outline-none whitespace-nowrap ${
      active
        ? 'bg-slate-800 text-white shadow-sm dark:bg-slate-200 dark:text-slate-900'
        : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-slate-800 dark:hover:text-slate-200'
    }`;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-overlay flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-[24px] shadow-modal w-full max-w-[420px] max-h-[90vh] relative animate-[fadeIn_0.15s_ease] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="px-5 pt-5 pb-4 sm:px-7 sm:pt-7 sm:pb-5 shrink-0">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold tracking-wider uppercase">
              New Booking
            </span>
            {properties.length > 1 && properties.map(p => {
              const occupied = occupiedPropertyIds.has(p.id);
              const selected = selectedPropertyId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => !occupied && setSelectedPropertyId(p.id)}
                  disabled={occupied}
                  title={occupied ? '해당 날짜에 이미 예약이 있습니다' : p.name}
                  className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider transition-colors ${
                    selected
                      ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                      : occupied
                        ? 'bg-muted/30 text-muted-foreground/30 line-through cursor-not-allowed'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted cursor-pointer'
                  }`}
                >
                  {p.name}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="예약자명"
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              className="flex-1 text-[26px] font-bold text-slate-800 dark:text-slate-200 bg-transparent outline-none placeholder:text-muted-foreground/30 truncate min-w-0"
            />
            <div className="flex items-center gap-1.5 shrink-0 pr-2">
              <User size={16} className="text-muted-foreground/60 mr-0.5" />
              <button
                onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                className="w-6 h-6 flex items-center justify-center text-muted-foreground/70 hover:text-slate-800 dark:hover:text-slate-200 transition-colors font-bold text-[18px] leading-none"
              >
                −
              </button>
              <span className="text-[17px] font-bold text-slate-800 dark:text-slate-200 w-[18px] text-center">
                {guestCount}
              </span>
              <button
                onClick={() => setGuestCount(guestCount + 1)}
                className="w-6 h-6 flex items-center justify-center text-muted-foreground/70 hover:text-slate-800 dark:hover:text-slate-200 transition-colors font-bold text-[18px] leading-none"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="px-5 pb-5 sm:px-7 sm:pb-7 space-y-4 sm:space-y-5 overflow-y-auto flex-1 custom-scrollbar">
          {/* Dates */}
          <div className="flex items-center bg-muted/20 p-4 rounded-2xl relative">
            <div className="flex-1 flex flex-col relative z-10 cursor-pointer" onClick={() => setPickerType('checkIn')}>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1">
                Check-in
              </span>
              <span className="text-[15px] font-bold text-slate-800 dark:text-slate-200 pointer-events-none">
                {fmtDateKo(checkIn)}
              </span>
            </div>

            <div className="text-muted-foreground/30 px-3">
              →
            </div>

            <div className="flex-1 flex flex-col relative z-10 cursor-pointer pl-2" onClick={() => setPickerType('checkOut')}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                  Check-out
                </span>
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 rounded-md">
                  {nights}박
                </span>
              </div>
              <span className="text-[15px] font-bold text-slate-800 dark:text-slate-200 pointer-events-none">
                {fmtDateKo(checkOut)}
              </span>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <div>
              <span className="block text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-2.5">
                국가
              </span>
              <div className="flex flex-wrap gap-2">
                {NATS.map(n => (
                  <button key={n.key} className={badge(nationality === n.key)} onClick={() => setNationality(n.key)}>
                    {n.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="block text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-2.5">
                채널
              </span>
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map(c => (
                  <button key={c.key} className={badge(channel === c.key)} onClick={() => handleChannel(c.key)}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Financials */}
          <div className="grid grid-cols-2 gap-4">
            {/* 결제금액 */}
            <div className="flex flex-col relative">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">결제금액</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                  weekend ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'bg-muted text-muted-foreground'
                }`}>
                  {weekend ? '주말' : '평일'}
                </span>
              </div>
              <div className="flex items-center gap-1 bg-muted/10 px-3 py-2.5 rounded-xl border border-transparent focus-within:border-primary/30 focus-within:bg-muted/20 transition-all cursor-text">
                <input
                  type="text"
                  inputMode="numeric"
                  value={amountRaw}
                  onChange={handleAmountChange}
                  onFocus={handleAmountFocus}
                  onBlur={handleAmountBlur}
                  onKeyDown={handleAmountKeyDown}
                  className={`flex-1 text-[16px] font-bold bg-transparent outline-none w-full ${
                    amountCustom ? 'text-slate-800 dark:text-slate-200' : 'text-slate-800/60 dark:text-slate-200/60'
                  }`}
                />
                <span className="text-[14px] font-bold text-slate-800/40 dark:text-slate-200/40">원</span>
              </div>
            </div>

            {/* 수수료 */}
            <div className="flex flex-col relative">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">수수료율</span>
                <span className="text-[10px] font-bold text-muted-foreground/60">{commission.toLocaleString()}원</span>
              </div>
              <div className="flex items-center gap-1 bg-muted/10 px-3 py-2.5 rounded-xl border border-transparent focus-within:border-primary/30 focus-within:bg-muted/20 transition-all cursor-text">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={commRate}
                  onChange={e => { setCommRate(Number(e.target.value)); setCommCustom(true); }}
                  className="flex-1 text-[16px] font-bold bg-transparent outline-none text-slate-800 dark:text-slate-200 w-full"
                />
                <span className="text-[14px] font-bold text-slate-800/40 dark:text-slate-200/40">%</span>
              </div>
            </div>
          </div>

          {/* Memo */}
          <div>
            <textarea
              value={memo}
              onChange={e => setMemo(e.target.value)}
              rows={2}
              placeholder="메모를 입력하세요..."
              className="w-full text-sm text-slate-800 dark:text-slate-200 bg-muted/20 border border-transparent focus:border-primary/30 focus:bg-muted/40 rounded-2xl p-3.5 outline-none resize-none transition-all placeholder:text-muted-foreground/40 font-medium"
            />
          </div>

          {/* Footer & Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-border/30">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wide">
                리드타임: {leadTime > 0 ? `${leadTime}일 전` : '오늘'}
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wide">
                예상 점유율: {monthOccupancy}%
              </span>
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-7 py-3 rounded-2xl bg-primary text-primary-foreground text-[15px] font-bold hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50 shadow-sm shadow-primary/20"
            >
              {isSaving ? '저장 중…' : '예약 저장'}
            </button>
          </div>
        </div>
      </div>

      {pickerType === 'checkIn' && (
        <DatePickerOverlay
          title="체크인 날짜 선택"
          initialDate={checkIn}
          onSelect={(d) => { handleCheckIn(d); setPickerType(null); }}
          onClose={() => setPickerType(null)}
        />
      )}
      {pickerType === 'checkOut' && (
        <DatePickerOverlay
          title="체크아웃 날짜 선택"
          initialDate={checkOut}
          minDate={addDays(checkIn, 1)}
          onSelect={(d) => { handleCheckOut(d); setPickerType(null); }}
          onClose={() => setPickerType(null)}
        />
      )}
    </div>
  );
};

export default QuickBookingModal;
