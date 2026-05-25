import { useNavigate } from 'react-router-dom';
import { PricingCard } from '../components/PricingCard';
import { SectionWrapper } from '../components/SectionWrapper';
import { CONTENT } from '../config/content';

export const PricingSection = () => {
  const navigate = useNavigate();
  const p = CONTENT.pricing;

  return (
    <SectionWrapper>
      {/* 섹션 헤더 */}
      <div className="mb-12 flex flex-col items-center gap-3 text-center">
        <span className="inline-flex items-center rounded-full bg-primary/10 px-3.5 py-1 type-label font-semibold text-primary">
          {p.sectionLabel}
        </span>
        <h2 className="type-page-title text-foreground">{p.title}</h2>
      </div>

      <PricingCard
        badge={p.badge}
        planName={p.planName}
        price={p.price}
        period={p.period}
        desc={p.desc}
        items={p.items}
        cta={p.cta}
        note={p.note}
        onCtaClick={() => navigate('/login')}
      />
    </SectionWrapper>
  );
};
