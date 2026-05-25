import { CalendarDays, BarChart2, Smartphone } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { FeatureCard } from '../components/FeatureCard';
import { SectionWrapper } from '../components/SectionWrapper';
import { CONTENT, type FeatureIconKey } from '../config/content';

const ICON_MAP: Record<FeatureIconKey, LucideIcon> = {
  'calendar-days': CalendarDays,
  'bar-chart-2': BarChart2,
  smartphone: Smartphone,
};

export const FeaturesSection = () => (
  <SectionWrapper className="bg-card border-y border-border">
    {/* 섹션 헤더 */}
    <div className="mb-12 flex flex-col items-center gap-3 text-center">
      <span className="inline-flex items-center rounded-full bg-primary/10 px-3.5 py-1 type-label font-semibold text-primary">
        {CONTENT.features.sectionLabel}
      </span>
      <h2 className="type-page-title text-foreground max-w-lg">{CONTENT.features.title}</h2>
    </div>

    {/* 카드 그리드 */}
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
      {CONTENT.features.items.map((item) => (
        <FeatureCard
          key={item.title}
          icon={ICON_MAP[item.icon]}
          title={item.title}
          desc={item.desc}
        />
      ))}
    </div>
  </SectionWrapper>
);
