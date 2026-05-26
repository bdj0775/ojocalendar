import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useTranslation } from '../../hooks/useTranslation';

const MaintenanceModal = () => {
  const { t, language } = useTranslation();
  const {
    selectedMaintDate, selectedMaintenanceId,
    closeMaintModal, addMaintenance, updateMaintenance, deleteMaintenance,
    maintenance, properties,
  } = useStore();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [label, setLabel] = useState('ROOM MAINTENANCE');
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState(() => properties[0]?.id ?? '');

  useEffect(() => {
    setErrorMsg('');
    setConfirmDelete(false);
    if (selectedMaintenanceId) {
      const m = maintenance.find(item => item.id === selectedMaintenanceId);
      if (m) { setStartDate(m.startDate); setEndDate(m.endDate); setLabel(m.label); }
    } else if (selectedMaintDate) {
      setStartDate(selectedMaintDate);
      const start = new Date(selectedMaintDate);
      start.setDate(start.getDate() + 1);
      const y = start.getFullYear();
      const mo = String(start.getMonth() + 1).padStart(2, '0');
      const d = String(start.getDate()).padStart(2, '0');
      setEndDate(`${y}-${mo}-${d}`);
      setLabel('ROOM MAINTENANCE');
    }
  }, [selectedMaintDate, selectedMaintenanceId, maintenance]);

  if (!selectedMaintDate && !selectedMaintenanceId) return null;

  const handleSave = () => {
    setErrorMsg('');
    if (!startDate || !endDate) { setErrorMsg(language === 'ko' ? '날짜를 선택해주세요.' : 'Please select dates.'); return; }
    if (new Date(startDate) >= new Date(endDate)) {
      setErrorMsg(language === 'ko' ? '종료일은 시작일 이후여야 합니다.' : 'End date must be after start date.');
      return;
    }
    if (!label.trim()) {
      setErrorMsg(language === 'ko' ? '사유를 입력해주세요.' : 'Please enter a reason.');
      return;
    }

    const allEvents = [...useStore.getState().bookings, ...maintenance];
    const isConflict = allEvents.some(e => {
      if (selectedMaintenanceId && e.id === selectedMaintenanceId) return false;
      const eStart = new Date((e as { checkIn?: string; startDate?: string }).checkIn || (e as { startDate?: string }).startDate || '');
      const eEnd = new Date((e as { checkOut?: string; endDate?: string }).checkOut || (e as { endDate?: string }).endDate || '');
      return new Date(startDate) < eEnd && new Date(endDate) > eStart;
    });

    if (isConflict) {
      setErrorMsg(language === 'ko' ? '해당 날짜에 이미 예약 또는 휴무가 있습니다.' : 'Cannot block these dates due to existing conflicts.');
      return;
    }

    if (selectedMaintenanceId) {
      updateMaintenance(selectedMaintenanceId, { startDate, endDate, label: label.trim() });
    } else {
      addMaintenance({ startDate, endDate, label: label.trim(), propertyId: selectedPropertyId || undefined });
    }
    closeMaintModal();
  };

  const handleDelete = () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    if (selectedMaintenanceId) {
      deleteMaintenance(selectedMaintenanceId);
      closeMaintModal();
    }
  };

  const inputCls = 'w-full px-3 py-2 rounded border border-slate-300 text-sm mt-1 outline-none focus:border-primary';
  const labelCls = 'text-sm font-semibold text-slate-600';

  return (
    <div className="fixed inset-0 bg-black/40 z-overlay flex items-end justify-center animate-[fadeIn_0.2s_ease]" onClick={closeMaintModal}>
      <div className="bg-card w-full max-w-[600px] max-h-[85vh] rounded-t-3xl overflow-y-auto animate-[slideUp_0.25s_ease]" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start px-6 pt-6 pb-4 sticky top-0 bg-card z-10">
          <div>
            <h2 className="text-xl font-bold">{t('maintenance.title')}</h2>
            {properties.length > 1 && !selectedMaintenanceId && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {properties.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPropertyId(p.id)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                      selectedPropertyId === p.id
                        ? 'bg-primary text-white'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={closeMaintModal} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 bg-slate-100">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 pb-4">
          <div className="flex flex-col gap-4 mt-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className={labelCls}>{t('maintenance.startDate')}</label>
                <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setErrorMsg(''); }} className={inputCls} />
              </div>
              <div className="flex-1">
                <label className={labelCls}>{t('maintenance.endDate')}</label>
                <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setErrorMsg(''); }} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>{language === 'ko' ? '사유' : 'Reason'}</label>
              <input
                type="text"
                value={label}
                onChange={e => { setLabel(e.target.value); setErrorMsg(''); }}
                placeholder="e.g. ROOM MAINTENANCE"
                className={inputCls}
              />
            </div>
            {errorMsg && (
              <p className="text-xs font-medium text-red-500 -mt-2">{errorMsg}</p>
            )}
          </div>
        </div>

        <div className="flex justify-between gap-2 px-6 pb-6 pt-4 border-t border-slate-100">
          {selectedMaintenanceId ? (
            <button
              onClick={handleDelete}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                confirmDelete
                  ? 'bg-red-500 text-white'
                  : 'bg-red-100 text-red-500'
              }`}
            >
              {confirmDelete
                ? (language === 'ko' ? '정말 삭제' : 'Confirm Delete')
                : t('booking.delete')}
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button onClick={closeMaintModal} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold text-sm">
              {t('settings.cancel')}
            </button>
            <button onClick={handleSave} className="px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold text-sm">
              {t('settings.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceModal;
