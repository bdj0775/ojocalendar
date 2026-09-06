import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { useStore } from '../../store/useStore';

const BillingSuccess = () => {
  const navigate = useNavigate();
  const fetchSubscription = useStore(s => s.fetchSubscription);
  const [status, setStatus] = useState<'processing' | 'done' | 'error'>('processing');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const run = async () => {
      const query = new URLSearchParams(window.location.search);
      const authKey = query.get('authKey');
      const customerKey = query.get('customerKey');

      if (!authKey || !customerKey) {
        setStatus('error');
        setErrorMsg('인증 정보가 올바르지 않습니다.');
        return;
      }

      const { data, error } = await supabase.functions.invoke('toss-billing', {
        body: { authKey, customerKey },
      });
      if (error || (data as { error?: string })?.error) {
        setStatus('error');
        setErrorMsg((data as { error?: string })?.error ?? error?.message ?? '결제 처리에 실패했습니다.');
        return;
      }

      await fetchSubscription();
      setStatus('done');
      setTimeout(() => { navigate('/settings', { replace: true }); window.scrollTo(0, 0); }, 2000);
    };
    run();
  }, [fetchSubscription, navigate]);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      {status === 'processing' && (
        <>
          <Loader2 size={28} className="animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">결제를 처리하고 있습니다...</span>
        </>
      )}
      {status === 'done' && (
        <>
          <CheckCircle2 size={28} className="text-primary" />
          <span className="text-sm font-semibold text-foreground">Pro 플랜으로 전환되었습니다!</span>
          <button
            onClick={() => navigate('/settings', { replace: true })}
            className="mt-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold"
          >
            설정으로 돌아가기
          </button>
        </>
      )}
      {status === 'error' && (
        <>
          <XCircle size={28} className="text-destructive" />
          <span className="text-sm font-semibold text-foreground">결제 처리에 실패했습니다</span>
          <span className="text-xs text-muted-foreground">{errorMsg}</span>
          <button
            onClick={() => navigate('/settings', { replace: true })}
            className="mt-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold"
          >
            설정으로 돌아가기
          </button>
        </>
      )}
    </div>
  );
};

export default BillingSuccess;
