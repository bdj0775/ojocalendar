import { useState, useEffect } from 'react';
import { X, Edit3, Trash2, Calendar, Users, CreditCard, MapPin, Tag } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useTranslation } from '../../hooks/useTranslation';
import type { Booking, BookingStatus } from '../../types';

interface BookingDetailModalProps {
  onEdit?: (booking: Booking) => void;
}

const STATUS_LABELS: Record<BookingStatus, string> = {
  confirmed: 'Confirmed',
  'checked in': 'Checked In',
  pending: 'Pending Payment',
  completed: 'Completed',
};

const STATUS_CLASSES: Record<BookingStatus, string> = {
  confirmed: 'bg-primary-100 text-primary-700',
  'checked in': 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-50 text-amber-600',
  completed: 'bg-slate-100 text-slate-500',
};

const statusFlow: Record<BookingStatus, BookingStatus> = {
  confirmed: 'checked in',
  'checked in': 'completed',
  pending: 'confirmed',
  completed: 'confirmed',
};

const BookingDetailModal = ({ onEdit }: BookingDetailModalProps) => {
  const { t, language } = useTranslation();
  const { bookings, selectedBookingId, closeBookingModal, deleteBooking, updateBookingStatus, settings } = useStore();
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => { setConfirmDelete(false); }, [selectedBookingId]);

  if (!selectedBookingId) return null;
  const booking = bookings.find((b) => b.id === selectedBookingId);
  if (!booking) return null;

  const nights = Math.round(
    (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24)
  );

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    await deleteBooking(booking.id);
    closeBookingModal();
  };

  const handleStatusChange = () => {
    updateBookingStatus(booking.id, statusFlow[booking.status] || 'confirmed');
  };

  const statusLabel = language === 'ko'
    ? (booking.status === 'confirmed' ? '예약 확정' : booking.status === 'checked in' ? '체크인 완료' : booking.status === 'pending' ? '결제 대기' : '숙박 완료')
    : STATUS_LABELS[booking.status];

  return (
    <div className="fixed inset-0 bg-black/40 z-overlay flex items-end justify-center animate-[fadeIn_0.2s_ease]" onClick={closeBookingModal}>
      <div className="bg-white w-full max-w-[600px] max-h-[85vh] rounded-t-3xl overflow-y-auto animate-[slideUp_0.25s_ease]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-start px-6 pt-6 pb-4 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold">{t('bookings.details')}</h2>
          <button onClick={closeBookingModal} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 bg-slate-100">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-6">
          {/* Guest Row */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-[52px] h-[52px] rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white text-2xl font-bold flex items-center justify-center">
              {booking.guestName.charAt(0)}
            </div>
            <div>
              <h3 className="text-lg font-bold mb-1">{booking.guestName}</h3>
              <span className={`inline-block type-micro font-bold px-2.5 py-0.5 rounded-xl tracking-[0.3px] ${STATUS_CLASSES[booking.status]}`}>
                {statusLabel}
              </span>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: <Calendar size={16} />, label: t('dashboard.checkIn'), value: booking.checkIn },
              { icon: <Calendar size={16} />, label: t('dashboard.checkOut'), value: booking.checkOut },
              {
                icon: <Users size={16} />,
                label: t('booking.numberOfGuests'),
                value: `${booking.guests} ${booking.guests > 1 ? t('calendar.guests') : t('calendar.guest')}${booking.infants > 0 ? ` + ${booking.infants} infant` : ''}`,
              },
              { icon: <Tag size={16} />, label: t('booking.channel'), value: booking.channel },
              { icon: <MapPin size={16} />, label: t('settings.roomName'), value: settings?.propertyName || 'Deluxe Suite' },
              {
                icon: <CreditCard size={16} />,
                label: `${t('booking.amount')} (${nights} ${nights > 1 ? t('calendar.nights') : t('calendar.night')})`,
                value: `${settings?.currency === 'KRW' ? '₩' : '$'}${booking.amount?.toLocaleString()}`,
              },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-2xl">
                <span className="text-primary flex-shrink-0 mt-0.5">{item.icon}</span>
                <div>
                  <small className="block type-micro text-slate-400 mb-0.5">{item.label}</small>
                  <strong className="text-[13px]">{item.value}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2.5 px-6 pt-4 pb-7 border-t border-slate-50">
          <button
            className="flex-1 py-3.5 rounded-2xl bg-primary text-white font-semibold text-sm shadow-[0_4px_12px_var(--primary-glow)]"
            onClick={handleStatusChange}
          >
            {booking.status === 'confirmed' && (language === 'ko' ? '→ 체크인 처리' : '→ Check In')}
            {booking.status === 'checked in' && (language === 'ko' ? '→ 숙박 완료' : '→ Complete')}
            {booking.status === 'pending' && (language === 'ko' ? '→ 결제 확인' : '→ Confirm')}
            {booking.status === 'completed' && (language === 'ko' ? '↩ 취소/복구' : '↩ Re-open')}
          </button>
          <button
            className="flex items-center gap-1.5 py-3.5 px-5 rounded-2xl bg-primary-100 text-primary-700 font-semibold text-sm"
            onClick={() => { closeBookingModal(); onEdit?.(booking); }}
          >
            <Edit3 size={16} /> {language === 'ko' ? '수정' : 'Edit'}
          </button>
          <button
            className={`flex items-center gap-1.5 py-3.5 px-5 rounded-2xl font-semibold text-sm transition-colors ${
              confirmDelete ? 'bg-red-500 text-white' : 'bg-red-50 text-red-500'
            }`}
            onClick={handleDelete}
          >
            <Trash2 size={16} /> {confirmDelete ? '정말 삭제' : t('booking.delete')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingDetailModal;
