import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { AlertCircle, Trash2 } from 'lucide-react';

export const OverlapDetector = () => {
  const { bookings, deleteBooking, showToast } = useStore();
  const [overlaps, setOverlaps] = useState<any[]>([]);

  useEffect(() => {
    const found: any[] = [];
    const sorted = [...bookings].filter(b => b.status !== 'cancelled').sort((a, b) => a.checkIn.localeCompare(b.checkIn));
    
    for (let i = 0; i < sorted.length - 1; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const b1 = sorted[i];
        const b2 = sorted[j];
        if (b1.propertyId === b2.propertyId && b1.checkOut > b2.checkIn) {
          found.push({ b1, b2 });
        }
      }
    }
    setOverlaps(found);
  }, [bookings]);

  if (overlaps.length === 0) return null;

  return (
    <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-4 mb-6">
      <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2 font-bold">
        <AlertCircle size={20} />
        <span>경고: 날짜가 겹치는 예약이 {overlaps.length}건 발견되었습니다!</span>
      </div>
      <ul className="space-y-2 mb-4">
        {overlaps.slice(0, 5).map((o, idx) => (
          <li key={idx} className="text-sm text-red-800 dark:text-red-300 bg-red-100/50 dark:bg-red-900/20 p-2 rounded">
            겹침: [예약1] {o.b1.guestName} ({o.b1.checkIn} ~ {o.b1.checkOut}) / [예약2] {o.b2.guestName} ({o.b2.checkIn} ~ {o.b2.checkOut})
          </li>
        ))}
        {overlaps.length > 5 && <li className="text-sm text-red-800 dark:text-red-300">...외 {overlaps.length - 5}건</li>}
      </ul>
      <button 
        onClick={async () => {
          if (!window.confirm('발견된 겹치는 예약 중 최신 예약(예약2)을 모두 삭제하시겠습니까?')) return;
          for (const o of overlaps) {
            await deleteBooking(o.b2.id);
          }
          showToast('겹치는 예약을 삭제했습니다.', 'success');
        }}
        className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 flex items-center gap-2 text-sm"
      >
        <Trash2 size={16} />
        겹치는 예약 자동 삭제하기 (예약2 삭제)
      </button>
    </div>
  );
};
