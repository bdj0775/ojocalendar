import { X, Plus, User, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { useTranslation } from '../../hooks/useTranslation';

const CHANNEL_COLORS: Record<string, string> = {
  Airbnb: 'var(--channel-airbnb)',
  'Booking.com': 'var(--channel-booking)',
  Direct: 'var(--channel-direct)',
  Naver: 'var(--channel-naver)',
};

const DayDetailModal = () => {
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const { bookings, maintenance, selectedDate, closeDayModal, openBookingModal, openMaintModal, openEditMaintModal } = useStore();

  if (!selectedDate) return null;

  const d = new Date(selectedDate);
  const dayStr = d.toLocaleString(language, { month: 'long', day: 'numeric', year: 'numeric' });
  const dayOfWeek = d.toLocaleString(language, { weekday: 'long' });

  const dayBookings = bookings.filter((b) => selectedDate >= b.checkIn && selectedDate < b.checkOut);
  const dayMaint = maintenance.filter((m) => selectedDate >= m.startDate && selectedDate < m.endDate);

  return (
    <div className="fixed inset-0 bg-black/40 z-overlay flex items-end justify-center animate-[fadeIn_0.2s_ease]" onClick={closeDayModal}>
      <div className="bg-card w-full max-w-[600px] max-h-[85dvh] rounded-t-3xl overflow-y-auto animate-[slideUp_0.25s_ease]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-start px-6 pt-6 pb-4 sticky top-0 bg-card z-10">
          <div>
            <h2 className="text-xl font-bold">{dayStr}</h2>
            <p className="text-[13px] text-slate-500 mt-0.5">{dayOfWeek}</p>
          </div>
          <button onClick={closeDayModal} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 bg-slate-100">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-4">
          {dayBookings.length === 0 && dayMaint.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-sm">{t('dayModal.noStays')}</div>
          )}

          {dayMaint.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-2xl mb-2.5 border-l-4 border-l-slate-400 cursor-pointer transition-transform hover:translate-x-1"
              onClick={() => { closeDayModal(); openEditMaintModal(m.id); }}
            >
              <div className="w-9 h-9 rounded-full bg-slate-400 flex items-center justify-center flex-shrink-0">
                <X size={16} color="white" />
              </div>
              <div className="flex-1">
                <strong className="block text-sm mb-0.5">{m.label}</strong>
                <small className="block text-xs text-slate-500">{m.startDate} — {m.endDate}</small>
              </div>
            </div>
          ))}

          {dayBookings.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-2xl mb-2.5 border-l-4 cursor-pointer transition-transform hover:translate-x-1"
              style={{ borderLeftColor: CHANNEL_COLORS[b.channel] || 'var(--primary)' }}
              onClick={() => { closeDayModal(); openBookingModal(b.id); }}
            >
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <User size={16} color="white" />
              </div>
              <div className="flex-1">
                <strong className="block text-sm mb-0.5">{b.guestName}</strong>
                <small className="block text-xs text-slate-500">{b.checkIn} → {b.checkOut} • {b.guests} {b.guests > 1 ? t('calendar.guests') : t('calendar.guest')}</small>
                <span className="inline-block mt-1 type-micro font-semibold px-2 py-0.5 rounded-lg bg-primary-100 text-primary-700">{b.channel}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer actions */}
        <div className="px-6 pb-[max(24px,env(safe-area-inset-bottom))] flex gap-3">
          <button
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-card border-2 border-dashed border-primary/20 text-primary font-semibold text-sm transition-colors hover:bg-primary/5"
            onClick={() => { closeDayModal(); navigate('/new-booking', { state: { prefilledDate: selectedDate } }); }}
          >
            <Plus size={18} /> {t('dayModal.addBooking')}
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-slate-200 text-slate-900 font-semibold text-sm transition-colors hover:bg-slate-300"
            onClick={() => { closeDayModal(); openMaintModal(selectedDate); }}
          >
            {t('dayModal.markMaintenance')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DayDetailModal;
