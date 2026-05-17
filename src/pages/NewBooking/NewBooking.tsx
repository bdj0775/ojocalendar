import { useState, useMemo, useEffect } from 'react';
import { X, User, Plus, Minus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { useTranslation } from '../../hooks/useTranslation';
import { isHoliday } from '../../utils/holidays';
import type { Booking } from '../../types';

const NATIONALITIES = ['Korea', 'Taiwan', 'Singapore', 'China', 'Japan', 'Others'];
const CHANNELS = ['Airbnb', 'Naver', 'Booking.com', 'Direct'];
const COMMISSIONS = [2, 17];
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const parseSafeDate = (str: string | undefined | null): Date | null => {
  if (!str) return null;
  const [y, m, d] = str.split('-');
  return new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0);
};

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const NewBookingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editBooking = location.state?.edit as Booking | undefined;
  const prefilledDate = location.state?.prefilledDate as string | undefined;

  const addBooking = useStore(s => s.addBooking);
  const updateBooking = useStore(s => s.updateBooking);
  const settings = useStore(s => s.settings);
  const property = useStore(s => s.properties[0]);
  const { t, language } = useTranslation();

  const _initAmount = (() => {
    if (!editBooking || !editBooking.isAutoSynced || Number(editBooking.amount) > 0) {
      return { value: editBooking?.amount ? editBooking.amount.toString() : '', estimated: false };
    }
    const basePrice = Number((property as { basePrice?: number })?.basePrice) || 189000;
    const weekendPrice = Number((property as { weekendPrice?: number })?.weekendPrice) || 229000;
    const start = new Date(editBooking.checkIn + 'T12:00:00');
    const end = new Date(editBooking.checkOut + 'T12:00:00');
    let total = 0;
    const cur = new Date(start);
    while (cur < end) {
      const dow = cur.getDay();
      total += (dow === 5 || dow === 6) ? weekendPrice : basePrice;
      cur.setDate(cur.getDate() + 1);
    }
    return { value: (total || basePrice).toString(), estimated: true };
  })();

  const [guestName, setGuestName] = useState(editBooking?.guestName || '');
  const [adults, setAdults] = useState(editBooking?.guests ?? 2);
  const [infants, setInfants] = useState(editBooking?.infants ?? 0);
  const [nationality, setNationality] = useState(editBooking?.nationality || 'Korea');
  const [channel, setChannel] = useState(editBooking?.channel || 'Airbnb');
  const [amount, setAmount] = useState(_initAmount.value);
  const [isEstimatedAmount, setIsEstimatedAmount] = useState(_initAmount.estimated);
  const [commission, setCommission] = useState(editBooking?.commission ?? 17);
  const [isCustomCommission, setIsCustomCommission] = useState(
    editBooking ? !COMMISSIONS.includes(editBooking.commission) : false
  );
  const [errorMsg, setErrorMsg] = useState('');
  const [isAutoCalc, setIsAutoCalc] = useState(!editBooking);

  const handleChannelSelect = (c: string) => {
    setChannel(c as 'Airbnb' | 'Naver' | 'Booking.com' | 'Direct');
    if (c === 'Naver') { setCommission(2); setIsCustomCommission(false); }
    else if (c === 'Booking.com' || c === 'Airbnb') { setCommission(17); setIsCustomCommission(false); }
  };

  const initialDate = editBooking
    ? parseSafeDate(editBooking.checkIn)
    : prefilledDate ? parseSafeDate(prefilledDate) : new Date();

  const [calYear, setCalYear] = useState((initialDate || new Date()).getFullYear());
  const [calMonth, setCalMonth] = useState((initialDate || new Date()).getMonth());
  const [rangeStart, setRangeStart] = useState<Date | null>(
    editBooking ? parseSafeDate(editBooking.checkIn) : prefilledDate ? parseSafeDate(prefilledDate) : new Date()
  );
  const [rangeEnd, setRangeEnd] = useState<Date | null>(() => {
    if (editBooking) return parseSafeDate(editBooking.checkOut);
    const base = prefilledDate ? parseSafeDate(prefilledDate) : new Date();
    if (!base) return null;
    const d = new Date(base);
    d.setDate(d.getDate() + 1);
    return d;
  });

  const calendarGrid = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(calYear, calMonth, 0).getDate();
    const cells: { day: number; current: boolean; date: Date | null }[] = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({ day: daysInPrevMonth - i, current: false, date: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, current: true, date: new Date(calYear, calMonth, d, 12, 0, 0) });
    }
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        cells.push({ day: i, current: false, date: null });
      }
    }
    return cells;
  }, [calYear, calMonth]);

  const handleDateClick = (cell: { current: boolean; date: Date | null }) => {
    if (!cell.current || !cell.date) return;
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(cell.date);
      setRangeEnd(null);
    } else {
      if (cell.date < rangeStart) { setRangeEnd(rangeStart); setRangeStart(cell.date); }
      else setRangeEnd(cell.date);
    }
  };

  const isInRange = (date: Date | null): boolean => {
    if (!date || !rangeStart) return false;
    if (!rangeEnd) return date.getTime() === rangeStart.getTime();
    return date >= rangeStart && date <= rangeEnd;
  };
  const isStart = (date: Date | null): boolean => !!(date && rangeStart && date.getTime() === rangeStart.getTime());
  const isEnd = (date: Date | null): boolean => !!(date && rangeEnd && date.getTime() === rangeEnd.getTime());

  const nightCount = rangeStart && rangeEnd
    ? Math.round((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const fmtShort = (d: Date | null) => {
    if (!d) return '—';
    return `${monthNames[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`;
  };
  const fmtISO = (d: Date | null) => {
    if (!d) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!isAutoCalc || !rangeStart || !rangeEnd || !property) return;
    let total = 0;
    let cur = new Date(rangeStart);
    cur.setHours(12, 0, 0, 0);
    const endDate = new Date(rangeEnd);
    endDate.setHours(12, 0, 0, 0);

    const isWeekendOrHoliday = (d: Date) => {
      const dow = d.getDay();
      if (dow === 5 || dow === 6) return true;
      return isHoliday(fmtISO(d));
    };

    while (cur < endDate) {
      total += isWeekendOrHoliday(cur) ? (property.weekendPrice || property.basePrice || 0) : (property.basePrice || 0);
      cur.setDate(cur.getDate() + 1);
    }

    const totalGuests = adults + infants;
    if (!property.noExtraGuestFee && totalGuests > (property.baseGuests || 2)) {
      total += (totalGuests - (property.baseGuests || 2)) * (property.extraGuestFee || 0) * nightCount;
    }
    if (property.cleaningFee) total += property.cleaningFee;
    setAmount(total.toString());
  }, [rangeStart, rangeEnd, adults, infants, isAutoCalc, nightCount, property]);

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(calYear - 1); setCalMonth(11); }
    else setCalMonth(calMonth - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(calYear + 1); setCalMonth(0); }
    else setCalMonth(calMonth + 1);
  };

  const hasOverlap = (): boolean => {
    if (!rangeStart || !rangeEnd) return false;
    // 수정 모드에서 날짜가 변경되지 않은 경우 체크 불필요
    if (editBooking) {
      const origStart = parseSafeDate(editBooking.checkIn);
      const origEnd = parseSafeDate(editBooking.checkOut);
      if (origStart && origEnd &&
          rangeStart.getTime() === origStart.getTime() &&
          rangeEnd.getTime() === origEnd.getTime()) {
        return false;
      }
    }
    const state = useStore.getState();
    type AnyEvent = { id: string; checkIn?: string; checkOut?: string; startDate?: string; endDate?: string };
    const allEvents = [...state.bookings, ...state.maintenance] as AnyEvent[];
    return allEvents.some(e => {
      if (editBooking && e.id === editBooking.id) return false;
      const eStart = parseSafeDate(e.checkIn || e.startDate);
      const eEnd = parseSafeDate(e.checkOut || e.endDate);
      if (!eStart || !eEnd) return false;
      return rangeStart < eEnd && rangeEnd > eStart;
    });
  };

  const handleSubmit = () => {
    setErrorMsg('');
    if (!guestName.trim() || !rangeStart || !rangeEnd) {
      setErrorMsg('게스트명과 날짜를 모두 입력해주세요.');
      return;
    }
    if (adults < 1) {
      setErrorMsg('인원은 최소 1명 이상이어야 합니다.');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (amount !== '' && (isNaN(parsedAmount) || parsedAmount < 0)) {
      setErrorMsg('금액은 0 이상의 숫자여야 합니다.');
      return;
    }
    const parsedCommission = Number(commission);
    if (isNaN(parsedCommission) || parsedCommission < 0 || parsedCommission > 100) {
      setErrorMsg('수수료는 0~100% 사이여야 합니다.');
      return;
    }
    if (hasOverlap()) {
      setErrorMsg('선택한 날짜에 이미 예약이 있습니다. 다른 날짜를 선택해주세요.');
      return;
    }
    const payload = {
      guestName, checkIn: fmtISO(rangeStart), checkOut: fmtISO(rangeEnd),
      guests: adults, infants, nationality, channel,
      amount: parsedAmount || 0, commission: parsedCommission,
      room: settings?.propertyName || 'Deluxe Suite',
    };
    if (editBooking) updateBooking(editBooking.id, payload);
    else addBooking(payload);
    navigate('/');
  };

  const inputWrapCls = 'flex items-center bg-card rounded-2xl px-4 py-3.5 gap-3 shadow-sm border border-border';
  const chipCls = 'px-4 py-2.5 rounded-2xl bg-card border border-border text-sm font-medium text-foreground transition-all';
  const chipActiveCls = 'bg-primary-50 border-primary text-primary';
  const chipBlockCls = 'flex-1 py-3.5 text-center rounded-3xl bg-card border border-border text-sm font-semibold transition-all';
  const chipBlockActiveCls = 'bg-primary text-white border-primary shadow-[0_4px_14px_var(--primary-glow)]';
  const labelCls = 'block text-[13px] font-semibold mb-3 text-foreground';

  return (
    <div className="bg-background min-h-screen absolute top-0 left-0 w-full z-page pb-10">
      {/* Header */}
      <div className="flex justify-between items-center px-5 py-4 bg-background sticky top-0 z-10">
        <button onClick={() => navigate(-1)}><X size={24} color="var(--foreground)" /></button>
        <span className="font-bold text-base text-foreground">{editBooking ? t('booking.editTitle') : t('booking.newTitle')}</span>
        <button className="text-primary font-semibold text-[15px]" onClick={handleSubmit}>{t('settings.save')}</button>
      </div>

      <div className="px-5">
        <h1 className="text-2xl font-bold mt-2.5 mb-0.5 text-foreground">{t('booking.guestInfo')}</h1>
        <p className="text-muted-foreground text-[13px] mb-6">{language === 'ko' ? '새로운 예약 정보를 입력하세요.' : 'Enter the information to schedule a new stay.'}</p>

        {/* Guest Name */}
        <div className="mb-6">
          <label className={labelCls}>{t('booking.guestName')}</label>
          <div className={inputWrapCls}>
            <User size={20} color="var(--muted-foreground)" />
            <input type="text" className="border-0 outline-none text-[15px] w-full bg-transparent text-foreground placeholder:text-muted-foreground" placeholder="Enter full name" value={guestName} onChange={e => setGuestName(e.target.value)} />
          </div>
        </div>

        {/* Guests Counter */}
        <div className="mb-6">
          <label className={labelCls}>{t('booking.numberOfGuests')}</label>
          <div className="flex gap-3">
            {[
              { label: t('booking.adults'), value: adults, min: 1, set: setAdults, purple: true },
              { label: 'Infants', value: infants, min: 0, set: setInfants, purple: false },
            ].map(({ label, value, min, set, purple }) => (
              <div key={label} className="flex-1 bg-card rounded-2xl px-4 py-3 flex justify-between items-center border border-border">
                <span className="text-xs text-foreground/80 font-medium">{label}</span>
                <div className="flex items-center gap-3">
                  <button className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground" onClick={() => set(Math.max(min, value - 1))}><Minus size={16} /></button>
                  <strong className="text-[15px] min-w-4 text-center text-foreground">{value}</strong>
                  <button className={`w-7 h-7 rounded-full flex items-center justify-center ${purple ? 'bg-primary' : 'border border-border'}`} onClick={() => set(value + 1)}>
                    <Plus size={16} color={purple ? 'white' : 'var(--foreground)'} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Nationality */}
        <div className="mb-6">
          <label className={labelCls}>{t('booking.nationality')}</label>
          <div className="flex flex-wrap gap-2.5">
            {NATIONALITIES.map(n => (
              <button key={n} className={`${chipCls} ${nationality === n ? chipActiveCls : ''}`} onClick={() => setNationality(n)}>{n}</button>
            ))}
          </div>
        </div>

        {/* Date Picker */}
        <div className="mb-6">
          <label className={labelCls}>{language === 'ko' ? '날짜 선택' : 'Select Dates'}</label>
          <div className="bg-card rounded-2xl p-5 border border-border">
            <div className="flex justify-between items-center mb-4 text-sm">
              <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors" onClick={prevMonth}><ChevronLeft size={18} color="var(--muted-foreground)" /></button>
              <strong className="text-foreground">{monthNames[calMonth]} {calYear}</strong>
              <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors" onClick={nextMonth}><ChevronRight size={18} color="var(--muted-foreground)" /></button>
            </div>
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map((d, i) => (
                <span key={i} className="text-center text-xs font-semibold text-muted-foreground py-1">{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarGrid.map((cell, idx) => {
                const start = isStart(cell.date);
                const end = isEnd(cell.date);
                const inRange = isInRange(cell.date);
                const mid = inRange && !start && !end;
                const cellStyle = start
                  ? { background: 'linear-gradient(to right, transparent 50%, var(--color-primary-100) 50%)' }
                  : end
                    ? { background: 'linear-gradient(to left, transparent 50%, var(--color-primary-100) 50%)' }
                    : {};

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-center h-10 cursor-pointer text-sm font-medium relative ${!cell.current ? 'text-muted-foreground/50 pointer-events-none' : 'text-foreground'} ${mid ? 'bg-primary-100' : ''}`}
                    style={cellStyle}
                    onClick={() => handleDateClick(cell)}
                  >
                    <span
                      className={`w-[34px] h-[34px] flex items-center justify-center rounded-full relative z-[2] ${start || end ? 'bg-primary text-white' : ''} ${mid ? 'text-primary' : ''}`}
                    >
                      {cell.day}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between items-center pt-4 mt-4 border-t border-border">
              <div className="flex flex-col gap-1">
                <small className="text-muted-foreground type-micro font-semibold tracking-[0.5px]">{t('dashboard.checkIn').toUpperCase()}</small>
                <strong className="text-[13px] text-foreground">{fmtShort(rangeStart)}</strong>
              </div>
              <div className="flex flex-col gap-1">
                <small className="text-muted-foreground type-micro font-semibold tracking-[0.5px]">{t('dashboard.checkOut').toUpperCase()}</small>
                <strong className="text-[13px] text-foreground">{fmtShort(rangeEnd)}</strong>
              </div>
              {nightCount > 0 && (
                <div className="bg-primary-100 text-primary px-3 py-1.5 rounded-2xl text-[11px] font-semibold">
                  {nightCount} {language === 'ko' ? '박' : nightCount > 1 ? 'Nights' : 'Night'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Channel */}
        <div className="mb-6">
          <label className={labelCls}>{t('booking.channel')}</label>
          <div className="flex flex-wrap gap-2.5">
            {CHANNELS.map(c => (
              <button key={c} className={`${chipCls} ${channel === c ? chipActiveCls : ''}`} onClick={() => handleChannelSelect(c)}>{c}</button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div className="mb-6">
          <label className={labelCls}>
            {t('booking.amount')}
            {isEstimatedAmount && (
              <span className="ml-2 text-xs font-medium text-amber-500">추정 금액</span>
            )}
          </label>
          <div className={inputWrapCls}>
            <span className="text-muted-foreground font-semibold">{settings?.currency === 'KRW' ? '₩' : '$'}</span>
            <input
              type="number"
              className="border-0 outline-none text-[15px] w-full bg-transparent text-foreground placeholder:text-muted-foreground"
              placeholder={settings?.currency === 'KRW' ? '0' : '0.00'}
              step={settings?.currency === 'KRW' ? '1' : '0.01'}
              value={amount}
              onChange={e => { setAmount(e.target.value); setIsAutoCalc(false); setIsEstimatedAmount(false); }}
            />
          </div>
          {isEstimatedAmount && (
            <p className="mt-1 text-xs text-amber-500">실제 금액 미입력 — 기본 단가 기준 추정값입니다.</p>
          )}
        </div>

        {/* Commission */}
        <div className="mb-6">
          <label className={labelCls}>{t('booking.commission')}</label>
          <div className="flex gap-2.5">
            {COMMISSIONS.map(c => (
              <button key={c} className={`${chipBlockCls} ${!isCustomCommission && commission === c ? chipBlockActiveCls : ''}`} onClick={() => { setCommission(c); setIsCustomCommission(false); }}>{c}%</button>
            ))}
            <button className={`${chipBlockCls} ${isCustomCommission ? chipBlockActiveCls : ''}`} onClick={() => setIsCustomCommission(true)}>직접입력</button>
          </div>
          {isCustomCommission && (
            <div className={`${inputWrapCls} mt-2`}>
              <input
                type="number"
                className="border-0 outline-none text-[15px] w-full bg-transparent text-foreground placeholder:text-muted-foreground"
                placeholder="0 ~ 100"
                min={0}
                max={100}
                value={commission}
                onChange={e => setCommission(parseFloat(e.target.value) || 0)}
              />
              <span className="text-muted-foreground font-semibold pr-2">%</span>
            </div>
          )}
        </div>

        {/* Actions */}
        {errorMsg && (
          <div className="w-full p-3 bg-destructive/10 text-destructive rounded-lg text-sm text-center font-medium mb-[-10px]">{errorMsg}</div>
        )}
        <div className="flex flex-col items-center gap-4 mt-10">
          <button className="w-full py-btn rounded-pill bg-primary text-white text-base font-semibold shadow-[0_10px_20px_var(--primary-glow)] active:scale-[0.98] transition-transform" onClick={handleSubmit}>
            {editBooking ? t('settings.save') : t('booking.save')}
          </button>
          <button className="text-muted-foreground text-sm font-medium" onClick={() => navigate(-1)}>{t('settings.cancel')}</button>
          <div className="type-micro text-muted-foreground/50 tracking-widest">SECURE CHECKOUT SYSTEM</div>
        </div>
      </div>
    </div>
  );
};

export default NewBookingPage;
