import { useState } from 'react';
import { X, Crown, Loader2 } from 'lucide-react';
import { FREE_PROPERTY_LIMIT } from '../../hooks/useEntitlements';
import { PRO_PLAN_PRICE } from '../../config/billing';
import { startBillingAuth } from '../../services/tossPayments';
import { useStore } from '../../store/useStore';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PaywallModal = ({ isOpen, onClose }: PaywallModalProps) => {
  const userProfile = useStore(s => s.userProfile);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    if (!userProfile) return;
    setError('');
    setLoading(true);
    try {
      // 카드 등록 화면으로 이동 — 인증 성공 시 /billing/success 에서 실제 결제+구독 활성화 처리
      await startBillingAuth(userProfile.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : '결제창을 여는 데 실패했습니다.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-overlay flex items-end justify-center animate-[fadeIn_0.2s_ease]" onClick={onClose}>
      <div className="bg-card w-full max-w-[480px] rounded-t-3xl overflow-y-auto animate-[slideUp_0.25s_ease]" onClick={e => e.stopPropagation()}>
        <header className="flex justify-between items-start px-6 pt-6 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
              <Crown size={20} color="var(--primary)" />
            </div>
            <h2 className="text-xl font-bold">Pro 플랜으로 업그레이드</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground bg-muted">
            <X size={20} />
          </button>
        </header>

        <div className="px-6 pb-6">
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            무료 플랜은 숙소 {FREE_PROPERTY_LIMIT}개까지 등록할 수 있습니다. 숙소를 더 추가하려면 Pro 플랜으로 업그레이드가 필요합니다.
          </p>
          <div className="mt-4 p-4 rounded-xl bg-muted">
            <p className="text-[13px] font-semibold text-foreground">월 {PRO_PLAN_PRICE.toLocaleString()}원</p>
            <p className="text-[13px] text-muted-foreground mt-1">
              카드를 등록하면 매월 자동으로 결제됩니다. 카드 등록 화면으로 안전하게 이동합니다.
            </p>
          </div>
          {error && <p className="mt-3 text-[13px] text-destructive">{error}</p>}
        </div>

        <div className="flex gap-2.5 px-6 py-4 border-t border-border">
          <button
            className="px-5 py-3.5 rounded-2xl bg-muted text-muted-foreground font-semibold text-[15px]"
            onClick={onClose}
          >
            나중에 할게요
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-2xl bg-primary text-white font-semibold text-[15px] hover:bg-primary-700 active:scale-[0.98] disabled:opacity-60"
            onClick={handleUpgrade}
            disabled={loading}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Crown size={18} />}
            카드 등록하고 결제하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaywallModal;
