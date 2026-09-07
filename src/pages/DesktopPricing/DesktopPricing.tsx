import { useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { useStore } from '../../store/useStore';
import { useLastMinuteRadar } from '../../hooks/useLastMinuteRadar';
import LastMinuteRadarCard from './LastMinuteRadarCard';
import LastMinuteRadarModal from '../../components/Modals/LastMinuteRadarModal';

interface DesktopPricingProps {
  isDark?: boolean;
}

/**
 * 가격 탭 (beta) — 카드 그리드. 기획: PRICING_ROADMAP.md
 * 대시보드와 같은 3열 그리드·간격·카드 스타일을 쓴다. 카드는 순서대로 추가된다.
 */
const DesktopPricing = ({ isDark = false }: DesktopPricingProps) => {
  const { language } = useTranslation();
  const ko = language === 'ko';
  const { properties, selectedDashboardPropertyId, settings } = useStore();
  const radar = useLastMinuteRadar();
  const [isRadarModalOpen, setIsRadarModalOpen] = useState(false);

  // DesktopDashboard의 cardCls와 동일
  const cardCls = 'bg-card text-card-foreground border border-border rounded-2xl p-5 relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 shadow-sm hover:shadow-lg hover:border-primary/50';

  return (
    <div className="h-full px-5 pb-10 overflow-y-auto [scrollbar-width:thin] bg-background text-foreground">
      <div className="grid grid-cols-3 gap-4">
        {/* 카드 ① 빈방 레이더 — 가로 전체 */}
        <div className={`${cardCls} col-span-3 hover:translate-y-0`}>
          <LastMinuteRadarCard
            radar={radar}
            ko={ko}
            currency={settings.currency}
            showProperty={!selectedDashboardPropertyId && properties.length > 1}
            onOpenDetail={() => setIsRadarModalOpen(true)}
          />
        </div>
      </div>

      {isRadarModalOpen && (
        <LastMinuteRadarModal radar={radar} isDark={isDark} onClose={() => setIsRadarModalOpen(false)} />
      )}
    </div>
  );
};

export default DesktopPricing;
