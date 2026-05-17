import { useTranslation } from '../../hooks/useTranslation';

const DesktopBookings = () => {
  const { language } = useTranslation();
  const ko = language === 'ko';

  return (
    <div className="h-full p-5 pb-10 overflow-y-auto bg-background text-foreground [scrollbar-width:thin]">
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-4">📋</div>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            {ko ? '예약목록' : 'Bookings'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {ko ? '데스크탑 예약 관리 화면이 준비 중입니다.' : 'Desktop booking management is coming soon.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DesktopBookings;
