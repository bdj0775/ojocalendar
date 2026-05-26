import { useState, useEffect } from 'react';
import { X, Trash2, User } from 'lucide-react';
import { useStore } from '../../store/useStore';
import DatePickerOverlay from '../ui/DatePickerOverlay';

// ── helpers (QuickBookingModal과 동일) ────────────────────────────────────────
const DOW_KO = ['일', '월', '화', '수', '목', '금', '토'];

const fmtDateKo = (ds: string) => {
  const [y, m, d] = ds.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return `${m}월 ${d}일 (${DOW_KO[dow]}요일)`;
};

const fmtDateShort = (ds: string) => {
  if (!ds) return '-';
  const [y, m, d] = ds.split('-').map(Number);
  return `${y}년 ${m}월 ${d}일`;
};

const addDays = (ds: string, n: number): string => {
  const [y, m, d] = ds.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

const diffDays = (from: string, to: string) => {
  if (!from || !to) return 0;
  const a = new Date(from + 'T00:00:00');
  const b = new Date(to + 'T00:00:00');
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
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
const BookingEditModal = () => {
  const {
    bookings, selectedBookingId,
    closeBookingModal, updateBooking, deleteBooking, showToast,
  } = useStore();

  const booking = bookings.find(b => b.id === selectedBookingId);

  // ── form state ────────────────────────────────────────────────────────────
  const [guestName,    setGuestName]    = useState('');
  const [guestCount,   setGuestCount]   = useState(2);
  const [checkIn,      setCheckIn]      = useState('');
  const [checkOut,     setCheckOut]     = useState('');
  const [nationality,  setNationality]  = useState('');
  const [channel,      setChannel]      = useState('Airbnb');
  const [amount,       setAmount]       = useState(0);
  const [amountRaw,    setAmountRaw]    = useState('0');
  const [commRate,     setCommRate]     = useState(0);
  const [commCustom,   setCommCustom]   = useState(false);
  const [memo,         setMemo]         = useState('');
  const [memoFocused,  setMemoFocused]  = useState(false);
  const [confirmDel,   setConfirmDel]   = useState(false);
  const [isSaving,     setIsSaving]     = useState(false);
  const [pickerType, setPickerType] = useState<'checkIn' | 'checkOut' | null>(null);

  // booking이 바뀔 때마다 폼 초기화
  useEffect(() => {
    if (!booking) return;
    setGuestName(booking.guestName ?? '');
    setGuestCount(booking.guests ?? 2);
    setCheckIn(booking.checkIn ?? '');
    setCheckOut(booking.checkOut ?? '');
    setNationality(booking.nationality ?? '');
    setChannel(booking.channel ?? 'Airbnb');
    const amt = booking.amount ?? 0;
    const channelRate = CHANNELS.find(c => c.key === booking.channel)?.rate ?? 0;
    setAmount(amt);
    setAmountRaw(amt.toLocaleString());
    setCommRate(channelRate);
    setCommCustom(false);
    setMemo(booking.memo ?? '');
    setConfirmDel(false);
  }, [selectedBookingId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!selectedBookingId || !booking) return null;

  const nights    = diffDays(checkIn, checkOut);
  const commission = Math.round(amount * commRate / 100);
  const weekend   = checkIn ? isWeekendDate(checkIn) : false;
  const leadTime  = booking.bookingDate ? diffDays(booking.bookingDate, booking.checkIn) : null;

  // ── handlers ─────────────────────────────────────────────────────────────
  const handleCheckIn = (val: string) => {
    setCheckIn(val);
    if (val >= checkOut) setCheckOut(addDays(val, 1));
  };

  const handleChannel = (ch: string) => {
    setChannel(ch);
    if (!commCustom) setCommRate(CHANNELS.find(c => c.key === ch)?.rate ?? 0);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setAmountRaw(raw);
    setAmount(parseInt(raw, 10) || 0);
  };

  const handleAmountBlur = () => {
    const rounded = Math.round(amount / 1000) * 1000;
    setAmount(rounded);
    setAmountRaw(rounded.toLocaleString());
  };

  const handleAmountFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setAmountRaw(String(amount));
    e.target.select();
  };

  const handleAmountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const v = amount + 1000;
      setAmount(v); setAmountRaw(v.toLocaleString());
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const v = Math.max(0, amount - 1000);
      setAmount(v); setAmountRaw(v.toLocaleString());
    }
  };

  const handleSave = async () => {
    if (!guestName.trim()) {
      showToast('예약자명을 입력해주세요.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      await updateBooking(booking.id, {
        guestName: guestName.trim(),
        checkIn, checkOut,
        guests: guestCount,
        nationality, channel: channel as 'Airbnb' | 'Booking.com' | 'Naver' | 'Direct',
        amount, commission: commRate,
        memo: memo.trim() || undefined,
      });
      showToast('예약이 수정되었습니다.', 'success');
      closeBookingModal();
    } catch {
      // handled by store
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDel) { setConfirmDel(true); return; }
    await deleteBooking(booking.id);
    closeBookingModal();
    showToast('예약이 삭제되었습니다.', 'info');
  };

  const badge = (active: boolean) =>
    `px-3.5 py-1.5 rounded-xl text-[12px] font-bold transition-all outline-none whitespace-nowrap ${
      active
        ? 'bg-slate-800 text-white shadow-sm dark:bg-slate-200 dark:text-slate-900'
        : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-slate-800 dark:hover:text-slate-200'
    }`;

  const statusColors = {
    'confirmed': 'bg-primary/10 text-primary',
    'checked in': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    'completed': 'bg-muted text-muted-foreground',
    'default': 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
  };

  const todayDate = new Date();
  const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
  
  let currentStatusLbl = '예약 확정';
  let currentStatusCls = statusColors['confirmed'];
  
  if (booking.status === 'cancelled') {
    currentStatusLbl = '예약 취소';
    currentStatusCls = 'bg-destructive/10 text-destructive';
  } else if (checkOut <= todayStr) {
    currentStatusLbl = '숙박 완료';
    currentStatusCls = statusColors['completed'];
  } else if (checkIn <= todayStr && checkOut > todayStr) {
    currentStatusLbl = '투숙 중';
    currentStatusCls = statusColors['checked in'];
  } else {
    if (booking.status === 'payment pending') {
      currentStatusLbl = '결제 대기';
      currentStatusCls = statusColors['default'];
    } else {
      currentStatusLbl = '예약 확정';
      currentStatusCls = statusColors['confirmed'];
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-overlay flex items-center justify-center p-4 sm:p-6"
      onClick={closeBookingModal}
    >
      <div
        className="bg-card rounded-[28px] shadow-modal w-full max-w-[420px] max-h-[90vh] relative animate-[fadeIn_0.15s_ease] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="px-7 pt-7 pb-5 shrink-0">
          <button
            onClick={closeBookingModal}
            className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase ${currentStatusCls}`}>
              {currentStatusLbl}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <input
              autoFocus
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
        <div className="px-7 pb-7 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          {/* Dates */}
          <div className="flex items-center bg-muted/20 p-4 rounded-2xl relative">
            <div className="flex-1 flex flex-col relative z-10 cursor-pointer" onClick={() => setPickerType('checkIn')}>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1">
                Check-in
              </span>
              <span className="text-[15px] font-bold text-slate-800 dark:text-slate-200 pointer-events-none">
                {checkIn ? fmtDateKo(checkIn) : '-'}
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
                {checkOut ? fmtDateKo(checkOut) : '-'}
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
                  className="flex-1 text-[16px] font-bold bg-transparent outline-none text-slate-800 dark:text-slate-200 w-full"
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
                예약일: {booking.bookingDate ? fmtDateShort(booking.bookingDate) : '-'}
              </span>
              {leadTime !== null && (
                <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wide">
                  리드타임: {leadTime > 0 ? `${leadTime}일 전` : '당일'}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); handleDelete(); }}
                className={`flex items-center gap-2 p-3 rounded-2xl transition-all shadow-sm ${
                  confirmDel
                    ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90 px-4'
                    : 'bg-muted/50 text-destructive hover:bg-destructive/10'
                }`}
              >
                <Trash2 size={16} />
                {confirmDel && <span className="text-sm font-bold whitespace-nowrap">삭제 확인</span>}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground text-[15px] font-bold hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50 shadow-sm shadow-primary/20"
              >
                {isSaving ? '저장 중…' : '수정 완료'}
              </button>
            </div>
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
          minDate={checkIn ? addDays(checkIn, 1) : undefined}
          onSelect={(d) => { setCheckOut(d); setPickerType(null); }}
          onClose={() => setPickerType(null)}
        />
      )}
    </div>
  );
};

export default BookingEditModal;
