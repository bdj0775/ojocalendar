import { useNavigate } from 'react-router-dom';
import { PricingCard } from '../components/PricingCard';
import { SectionWrapper } from '../components/SectionWrapper';
import { CONTENT } from '../config/content';

export const PricingSection = () => {
  const navigate = useNavigate();
  const p = CONTENT.pricing;

  // 위 섹션(기능 가치)과 같은 배경을 이어받아 하나의 영역처럼 보이게 한다.
  // 구분선 대신 여백만으로 나누고, 아래 CtaSection(bg-primary)에서 색이 바뀌며 마무리된다.
  return (
    <SectionWrapper className="bg-muted/30 pt-4 pb-24 md:pb-32">
      {/* 섹션 헤더 — 위 섹션과 동일한 타이포 스케일을 사용해 리듬을 맞춘다 */}
      <div className="mb-12 flex flex-col items-center gap-5 text-center">
        <span className="inline-flex items-center rounded-full bg-primary/10 px-4 py-1.5 text-xs md:text-sm font-semibold text-primary">
          {p.sectionLabel}
        </span>
        <h2 className="text-3xl md:text-5xl font-extrabold text-foreground tracking-tight leading-[1.3] break-keep">
          {p.title}
        </h2>
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
        onCtaClick={() => navigate('/login?mode=signup')}
      />
    </SectionWrapper>
  );
};
