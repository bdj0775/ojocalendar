import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, ChevronRight } from 'lucide-react';
import { useStore } from '../../store/useStore';

const CHANNEL_COLOR: Record<string, string> = {
  Airbnb:        'var(--channel-airbnb)',
  'Booking.com': 'var(--channel-booking)',
  Naver:         'var(--channel-naver)',
  Direct:        'var(--primary)',
};

const FIELD_LABEL: Record<string, string> = {
  guestName:   '게스트명',
  amount:      '금액',
  guests:      '인원',
  nationality: '국적',
  bookingDate: '접수일',
};

/**
 * 자동 연동 예약은 접수일이 "동기화한 날"로 적힌다 (eventMapper). 손님이 실제 예약한 날을
 * 받아야 리드타임·예상 점유율·빈방 레이더가 정확해지므로 입력 요청 목록에 항상 접수일을 붙인다.
 * (DB의 missing_fields 자체는 syncService가 만들며 여기서는 표시만 보탠다)
 */
const withBookingDate = (fields: string[]) =>
  fields.includes('bookingDate') ? fields : [...fields, 'bookingDate'];

export default function NotificationBell() {
  const {
    syncNotifications, unreadCount,
    markNotificationRead, markAllNotificationsRead,
    openBookingModal,
  } = useStore();

  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPanelPos({ top: rect.bottom + 8, left: rect.left });
    }
    setOpen(v => !v);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleItemClick = async (notifId: string, bookingId: string | null) => {
    setOpen(false);
    await markNotificationRead(notifId);
    if (bookingId) openBookingModal(bookingId);
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl text-foreground hover:bg-muted transition-colors"
        aria-label="알림"
      >
        <Bell size={18} strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={{ position: 'fixed', top: panelPos.top, left: panelPos.left, zIndex: 9999 }}
          className="w-80 bg-card rounded-2xl shadow-xl border border-border/50 overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <span className="text-sm font-bold text-foreground">
              새 예약 알림
              {unreadCount > 0 && (
                <span className="ml-2 text-xs font-semibold text-muted-foreground">
                  {unreadCount}건
                </span>
              )}
            </span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllNotificationsRead()}
                  className="text-xs text-primary font-semibold hover:underline"
                >
                  모두 읽음
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {syncNotifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                새로운 알림이 없습니다
              </div>
            ) : (
              syncNotifications.map(notif => (
                <button
                  key={notif.id}
                  onClick={() => handleItemClick(notif.id, notif.bookingId)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors border-b border-border/30 last:border-0 text-left"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5"
                    style={{ background: CHANNEL_COLOR[notif.channel] ?? 'var(--primary)' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-semibold text-muted-foreground">
                        [{notif.channel}]
                      </span>
                      <span className="text-sm font-bold text-foreground truncate">
                        {notif.guestName}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {notif.checkIn} ~ {notif.checkOut}
                    </p>
                    {notif.missingFields.length > 0 && (
                      <p className="text-xs text-amber-600 font-medium mt-0.5">
                        {withBookingDate(notif.missingFields).map(f => FIELD_LABEL[f] ?? f).join(' · ')} 입력 필요
                      </p>
                    )}
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
