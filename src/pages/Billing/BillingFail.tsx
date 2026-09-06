import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';

const BillingFail = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState('카드 등록이 취소되었거나 실패했습니다.');

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const msg = query.get('message');
    if (msg) setMessage(msg);
    const timer = setTimeout(() => { navigate('/settings', { replace: true }); }, 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      <XCircle size={28} className="text-destructive" />
      <span className="text-sm font-semibold text-foreground">결제 등록에 실패했습니다</span>
      <span className="text-xs text-muted-foreground">{message}</span>
      <button
        onClick={() => navigate('/settings', { replace: true })}
        className="mt-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold"
      >
        설정으로 돌아가기
      </button>
    </div>
  );
};

export default BillingFail;
