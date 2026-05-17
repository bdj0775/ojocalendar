import { FileText } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

const BookingsPage = () => {
  const { t, language } = useTranslation();
  const ko = language === 'ko';

  return (
    <div className="bg-background min-h-screen pb-24 flex items-center justify-center p-5">
      <div className="text-center bg-card p-10 rounded-3xl border border-border/50 shadow-sm w-full max-w-sm">
        <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-border/50">
          <FileText size={24} className="text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
          {ko ? '예약 목록' : 'Bookings'}
        </h2>
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          {ko ? '현재 페이지는 준비 중입니다.' : 'This page is coming soon.'}
          <br />
          {ko ? '빠른 시일 내에 새로운 기능으로 찾아뵙겠습니다.' : 'We will be back with new features soon.'}
        </p>
      </div>
    </div>
  );
};

export default BookingsPage;
