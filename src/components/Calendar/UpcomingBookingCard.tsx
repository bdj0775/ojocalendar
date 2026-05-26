import React from 'react';
import { User, MessageSquare } from 'lucide-react';
import { Booking } from '../../types';
import { useTranslation } from '../../hooks/useTranslation';

interface UpcomingBookingCardProps {
  booking: Booking;
  propColor?: string;
  propName?: string;
  onClick: () => void;
}

const CHANNEL_COLORS: Record<string, string> = {
  Airbnb: '#FF5A5F',
  'Booking.com': '#003580',
  Naver: '#03C75A',
  Direct: '#4F46E5',
};

const diffDays = (from: string, to: string) => {
  if (!from || !to) return 0;
  const a = new Date(from + 'T00:00:00');
  const b = new Date(to + 'T00:00:00');
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
};

const UpcomingBookingCard: React.FC<UpcomingBookingCardProps> = ({ booking, propColor, propName, onClick }) => {
  const { t, language } = useTranslation();
  const ko = language === 'ko';
  
  const nights = diffDays(booking.checkIn, booking.checkOut);
  const channelColor = CHANNEL_COLORS[booking.channel] || '#888888';
  const indicatorColor = propColor || '#888888';

  const DOW_KO = ['일', '월', '화', '수', '목', '금', '토'];
  const DOW_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const formatCheckInCheckOut = (ci: string, co: string) => {
    // format as MM.DD(dow)
    const f = (dateStr: string) => {
      if (!dateStr) return '';
      const [y, m, d] = dateStr.split('-');
      const dt = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      const dow = ko ? DOW_KO[dt.getDay()] : DOW_EN[dt.getDay()];
      return `${parseInt(m)}.${parseInt(d)}(${dow})`;
    };
    return `${f(ci)} - ${f(co)}`;
  };

  return (
    <div
      onClick={onClick}
      className="relative bg-background border border-border/50 rounded-2xl px-4 py-4 flex flex-col gap-2.5 shadow-sm mb-2.5 cursor-pointer hover:bg-muted/30 active:scale-[0.98] transition-all overflow-hidden pl-5"
    >
      {/* ── Solid Indicator Color Bar ── */}
      <div 
        className="absolute top-0 bottom-0 left-0 w-1.5"
        style={{ backgroundColor: indicatorColor }}
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="flex items-center gap-2 truncate">
            <h3 className="text-[15px] font-semibold text-foreground truncate m-0">
              {booking.guestName}
            </h3>
            {propName && (
              <span className="text-[13px] font-medium text-muted-foreground/70 truncate shrink-0">
                {propName}
              </span>
            )}
          </div>
          <span 
            className="text-[11px] font-medium px-2 py-0.5 rounded-md flex-shrink-0"
            style={{ backgroundColor: `${channelColor}15`, color: channelColor }}
          >
            {booking.channel}
          </span>
        </div>
        
        <div className="flex flex-wrap items-center gap-1.5 text-[13px] font-normal text-muted-foreground/90 mt-1">
          <span className="text-foreground/80 font-medium tracking-tight">
            {formatCheckInCheckOut(booking.checkIn, booking.checkOut)}
          </span>
          <span className="opacity-50">&bull;</span>
          <span>{nights}{ko ? '박' : ' nights'}</span>
          <span className="opacity-50">&bull;</span>
          <span>
            {booking.guests}{ko ? '인' : ` guest${booking.guests > 1 ? 's' : ''}`}
          </span>
          {booking.nationality && (
            <>
              <span className="opacity-50">&bull;</span>
              <span>{booking.nationality}</span>
            </>
          )}
        </div>
      </div>

      {booking.memo && (
        <div className="mt-1">
          <div className="bg-muted/30 rounded-xl px-3 py-2 flex gap-2 items-start text-[13px] text-muted-foreground/90 leading-snug border border-border/30">
            <span className="break-words font-medium">{booking.memo}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpcomingBookingCard;
