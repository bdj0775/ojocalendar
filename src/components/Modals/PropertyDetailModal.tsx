import { useState, useEffect } from 'react';
import { X, Save, BedDouble } from 'lucide-react';
import type { Property } from '../../types';

interface PropertyFormData {
  name: string;
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
  onSave: (propId: string, data: Partial<Property>) => void;
}

const PropertyDetailModal = ({ isOpen, onClose, property, onSave }: PropertyDetailModalProps) => {
  const [validationError, setValidationError] = useState('');
  const [formData, setFormData] = useState<PropertyFormData>({
    name: '',
    baseGuests: 2,
    basePrice: 0,
    weekendPrice: 0,
    extraGuestFee: 0,
    noExtraGuestFee: false,
    checkInTime: '16:00',
    checkOutTime: '11:00',
    cleaningFee: 0,
  });

  useEffect(() => {
    if (property) {
      setFormData({
        name: property.name || '',
        baseGuests: property.baseGuests ?? 2,
        basePrice: property.basePrice || 0,
        weekendPrice: property.weekendPrice || 0,
        extraGuestFee: property.extraGuestFee || 0,
        noExtraGuestFee: property.noExtraGuestFee || false,
        checkInTime: property.checkInTime || '16:00',
        checkOutTime: property.checkOutTime || '11:00',
        cleaningFee: property.cleaningFee || 0,
      });
    }
  }, [property]);

  if (!isOpen || !property) return null;

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
    const guests = formData.baseGuests === '' ? 0 : Number(formData.baseGuests);
    const base   = formData.basePrice   === '' ? 0 : Number(formData.basePrice);
    const wkend  = formData.weekendPrice === '' ? 0 : Number(formData.weekendPrice);
    if (guests < 1) { setValidationError('기준 인원은 1명 이상이어야 합니다.'); return; }
    if (base < 1)   { setValidationError('평일 요금을 입력해주세요.'); return; }
    if (wkend < 1)  { setValidationError('주말 요금을 입력해주세요.'); return; }
    onSave(property.id, {
      ...formData,
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

  return (
    <div className="fixed inset-0 bg-black/40 z-overlay flex items-end justify-center animate-[fadeIn_0.2s_ease]" onClick={onClose}>
      <div className="bg-white w-full max-w-[480px] max-h-[85vh] rounded-t-3xl overflow-y-auto animate-[slideUp_0.25s_ease]" onClick={e => e.stopPropagation()}>
        <header className="flex justify-between items-start px-6 pt-6 pb-4 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
              <BedDouble size={20} color="var(--primary)" />
            </div>
            <h2 className="text-xl font-bold">객실 상세 설정</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 bg-slate-100">
            <X size={20} />
          </button>
        </header>

        <div className="px-6 pb-6">
          <div className="flex flex-col gap-1.5 mt-5">
            <label className={labelCls}>객실명</label>
            <input type="text" className={inputCls} value={formData.name} onChange={e => handleChange('name', e.target.value)} />
          </div>

          <div className="h-px bg-slate-100 my-6 -mx-6" />
          <h3 className="text-sm font-bold text-slate-900 mb-4">기본 요금 및 인원 설정</h3>

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
                <span className="block type-micro text-slate-400 font-medium mt-0.5">(금/토 숙박 기준)</span>
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

          <div className="h-px bg-slate-100 my-6 -mx-6" />
          <h3 className="text-sm font-bold text-slate-900 mb-4">운영 설정</h3>

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
        <div className="flex gap-2.5 px-6 py-4 border-t border-slate-100 sticky bottom-0 bg-white">
          <button className="px-5 py-3.5 rounded-2xl bg-slate-100 text-slate-500 font-semibold text-[15px]" onClick={onClose}>취소</button>
          <button className="flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-2xl bg-primary text-white font-semibold text-[15px] hover:bg-primary-700 active:scale-[0.98]" onClick={handleSave}>
            <Save size={18} /> 저장하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetailModal;
