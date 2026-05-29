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
  const { bookings, properties, openBookingModal } = useStore();

  if (!selectedDate) return null;

  const d = new Date(selectedDate);
  const dayStr = d.toLocaleString(language, { month: 'long', day: 'numeric', year: 'numeric' });
  const dayOfWeek = d.toLocaleString(language, { weekday: 'long' });

  const dayBookings = bookings.filter((b) => selectedDate >= b.checkIn && selectedDate < b.checkOut);
  const dayMaint: any[] = [];

  return (
    <div className="fixed inset-0 bg-black/40 z-overlay flex items-end justify-center animate-[fadeIn_0.2s_ease]" onClick={closeDayModal}>
      <div className="bg-card w-full max-w-[600px] max-h-[85dvh] rounded-t-3xl overflow-y-auto animate-[slideUp_0.25s_ease]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-start px-6 pt-6 pb-4 sticky top-0 bg-card z-10">
          <div>
            <h2 className="text-xl font-bold">{dayStr}</h2>
            <p className="text-[13px] text-slate-500 mt-0.5">{dayOfWeek}</p>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default DayDetailModal;
