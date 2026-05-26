import { useState, useEffect } from 'react';
import { X, Save, BedDouble, Trash2 } from 'lucide-react';
import type { Property } from '../../types';
import { PROP_COLORS } from '../CalendarGrid/useBookingBars';

interface PropertyFormData {
  name: string;
  color: string;
  baseGuests: number | '';
  basePrice: number | '';
  weekendPrice: number | '';
  extraGuestFee: number | '';
  noExtraGuestFee: boolean;
  checkInTime: string;
  checkOutTime: string;
  cleaningFee: number | '';
}

interface PropertyDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property | null;
  onSave: (propId: string | null, data: Partial<Property>) => void;
  onDelete?: () => void;
}

const DEFAULT_FORM: PropertyFormData = {
  name: '',
  color: '',
  baseGuests: 2,
  basePrice: 0,
  weekendPrice: 0,
  extraGuestFee: 0,
  noExtraGuestFee: false,
  checkInTime: '16:00',
  checkOutTime: '11:00',
  cleaningFee: 0,
};

const PropertyDetailModal = ({ isOpen, onClose, property, onSave, onDelete }: PropertyDetailModalProps) => {
  const [validationError, setValidationError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [formData, setFormData] = useState<PropertyFormData>(DEFAULT_FORM);

  useEffect(() => {
    setValidationError('');
    if (property) {
      setFormData({
        name: property.name || '',
        color: property.color || '',
        baseGuests: property.baseGuests ?? 2,
        basePrice: property.basePrice || 0,
        weekendPrice: property.weekendPrice || 0,
        extraGuestFee: property.extraGuestFee || 0,
        noExtraGuestFee: property.noExtraGuestFee || false,
        checkInTime: property.checkInTime || '16:00',
        checkOutTime: property.checkOutTime || '11:00',
        cleaningFee: property.cleaningFee || 0,
      });
    } else {
      setFormData(DEFAULT_FORM);
    }
  }, [property, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: keyof PropertyFormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePriceChange = (field: keyof PropertyFormData, value: string) => {
    const digits = value.replace(/[^0-9]/g, '');
    handleChange(field, digits === '' ? '' : parseInt(digits, 10));
  };

  const formatPrice = (val: number | ''): string => {
    if (val === '' || val === undefined || val === null) return '';
    if (val === 0) return '0';
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handleSave = () => {
    setValidationError('');
    if (!formData.name.trim()) { setValidationError('객실명을 입력해주세요.'); return; }
    const guests = formData.baseGuests === '' ? 0 : Number(formData.baseGuests);
    const base   = formData.basePrice   === '' ? 0 : Number(formData.basePrice);
    const wkend  = formData.weekendPrice === '' ? 0 : Number(formData.weekendPrice);
    if (guests < 1) { setValidationError('기준 인원은 1명 이상이어야 합니다.'); return; }
    if (base < 1)   { setValidationError('평일 요금을 입력해주세요.'); return; }
    if (wkend < 1)  { setValidationError('주말 요금을 입력해주세요.'); return; }
    onSave(property?.id ?? null, {
      ...formData,
      name: formData.name.trim(),
      color: formData.color || undefined,
      baseGuests: guests,
      basePrice: base,
      weekendPrice: wkend,
      extraGuestFee: formData.extraGuestFee === '' ? 0 : Number(formData.extraGuestFee),
      cleaningFee: formData.cleaningFee === '' ? 0 : Number(formData.cleaningFee),
    });
    onClose();
  };

  const inputCls = 'w-full px-4 py-3.5 rounded-xl border border-border bg-muted text-foreground type-body outline-none transition-all duration-200 focus:border-primary focus:bg-card focus:shadow-[0_0_0_3px_var(--primary-ring)]';
  const labelCls = 'type-label font-bold text-muted-foreground';
  const isCreating = !property;

  return (
    <div className="fixed inset-0 bg-black/40 z-overlay flex items-end justify-center animate-[fadeIn_0.2s_ease]" onClick={onClose}>
      <div className="bg-card w-full max-w-[480px] max-h-[85vh] rounded-t-3xl overflow-y-auto animate-[slideUp_0.25s_ease]" onClick={e => e.stopPropagation()}>
        <header className="flex justify-between items-start px-6 pt-6 pb-4 sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
              <BedDouble size={20} color="var(--primary)" />
            </div>
            <h2 className="text-xl font-bold">{isCreating ? '객실 추가' : '객실 상세 설정'}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground bg-muted">
            <X size={20} />
          </button>
        </header>

        <div className="px-6 pb-6">
          <div className="flex flex-col gap-1.5 mt-5">
            <label className={labelCls}>객실명</label>
            <input type="text" className={inputCls} value={formData.name} placeholder="예: 오조록 별채" onChange={e => handleChange('name', e.target.value)} />
          </div>

          <div className="flex flex-col gap-2 mt-4">
            <label className={labelCls}>인디케이터 색상</label>
            <div className="flex items-center gap-2 flex-wrap">
              {PROP_COLORS.map(c => {
                const selected = formData.color === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleChange('color', selected ? '' : c)}
                    className="w-7 h-7 rounded-full transition-transform hover:scale-110 flex items-center justify-center"
                    style={{ backgroundColor: c, boxShadow: selected ? `0 0 0 2px var(--card), 0 0 0 4px ${c}` : 'none' }}
                    title={c}
                  >
                    {selected && <span className="text-white text-[12px] font-bold leading-none">✓</span>}
                  </button>
                );
              })}
              {formData.color && (
                <button
                  type="button"
                  onClick={() => handleChange('color', '')}
                  className="text-[10px] text-muted-foreground hover:text-foreground ml-1"
                >
                  초기화
                </button>
              )}
            </div>
          </div>

          <div className="h-px bg-border my-6 -mx-6" />
          <h3 className="text-sm font-bold text-foreground mb-4">기본 요금 및 인원 설정</h3>

          <div className="flex gap-4">
            <div className="flex-1 flex flex-col gap-1.5">
              <label className={labelCls}>기준 인원 (명)</label>
              <input type="text" className={inputCls} value={formData.baseGuests === 0 ? '' : formData.baseGuests} onChange={e => handlePriceChange('baseGuests', e.target.value)} placeholder="2" />
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <label className={labelCls}>평일 요금</label>
              <input type="text" className={inputCls} value={formatPrice(formData.basePrice as number)} onChange={e => handlePriceChange('basePrice', e.target.value)} placeholder="150,000" />
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <label className={labelCls}>
                주말, 공휴일, 성수기
                <span className="block type-micro text-muted-foreground font-medium mt-0.5">(금/토 숙박 기준)</span>
              </label>
              <input type="text" className={inputCls} value={formatPrice(formData.weekendPrice as number)} onChange={e => handlePriceChange('weekendPrice', e.target.value)} placeholder="180,000" />
            </div>
          </div>

          <div className="flex gap-4 mt-4 items-center">
            <div className="flex-1 flex flex-col gap-1.5">
              <label className={labelCls}>인원 추가 요금 (1인당)</label>
              <input type="text" className={inputCls} value={formatPrice(formData.extraGuestFee as number)} onChange={e => handlePriceChange('extraGuestFee', e.target.value)} disabled={formData.noExtraGuestFee} placeholder="30,000" style={{ opacity: formData.noExtraGuestFee ? 0.5 : 1 }} />
            </div>
            <div className="flex-1 flex flex-row items-center gap-2 mt-6">
              <input type="checkbox" id="noExtraGuestFee" checked={formData.noExtraGuestFee} onChange={e => handleChange('noExtraGuestFee', e.target.checked)} className="w-4.5 h-4.5 accent-primary" style={{ width: 18, height: 18 }} />
              <label htmlFor="noExtraGuestFee" className={`${labelCls} cursor-pointer`}>인원 추가금 없음</label>
            </div>
          </div>

          <div className="h-px bg-border my-6 -mx-6" />
          <h3 className="text-sm font-bold text-foreground mb-4">운영 설정</h3>

          <div className="flex gap-4">
            <div className="flex-1 flex flex-col gap-1.5">
              <label className={labelCls}>체크인 시간</label>
              <input type="time" className={inputCls} value={formData.checkInTime} onChange={e => handleChange('checkInTime', e.target.value)} />
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <label className={labelCls}>체크아웃 시간</label>
              <input type="time" className={inputCls} value={formData.checkOutTime} onChange={e => handleChange('checkOutTime', e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 mt-4">
            <label className={labelCls}>기본 청소비 (옵션)</label>
            <input type="text" className={inputCls} value={formatPrice(formData.cleaningFee as number)} onChange={e => handlePriceChange('cleaningFee', e.target.value)} placeholder="0" />
          </div>
        </div>

        {/* Footer */}
        {validationError && (
          <p className="mx-6 mb-2 text-xs font-medium text-red-500">{validationError}</p>
        )}
        <div className="flex gap-2.5 px-6 py-4 border-t border-border sticky bottom-0 bg-card">
          {!isCreating && onDelete && (
            confirmDelete ? (
              <div className="flex items-center gap-2 mr-auto">
                <button className="text-xs text-muted-foreground px-2" onClick={() => setConfirmDelete(false)}>취소</button>
                <button
                  className="px-3 py-2 rounded-xl bg-red-500 text-white font-semibold text-[13px]"
                  onClick={() => { onDelete(); onClose(); }}
                >
                  삭제 확인
                </button>
              </div>
            ) : (
              <button
                className="w-10 h-10 my-auto rounded-xl flex items-center justify-center text-destructive bg-red-50 hover:bg-red-100 transition-colors mr-auto flex-shrink-0"
                onClick={() => setConfirmDelete(true)}
                title="숙소 삭제"
              >
                <Trash2 size={16} />
              </button>
            )
          )}
          <button className="px-5 py-3.5 rounded-2xl bg-muted text-muted-foreground font-semibold text-[15px]" onClick={onClose}>취소</button>
          <button className="flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-2xl bg-primary text-white font-semibold text-[15px] hover:bg-primary-700 active:scale-[0.98]" onClick={handleSave}>
            <Save size={18} /> {isCreating ? '추가하기' : '저장하기'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetailModal;
