import { CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/cn';

interface PricingCardProps {
  badge: string;
  planName: string;
  price: string;
  period: string;
  desc: string;
  items: readonly string[];
  cta: string;
  note: string;
  onCtaClick: () => void;
  className?: string;
}

export const PricingCard = ({
  badge,
  planName,
  price,
  period,
  desc,
  items,
  cta,
  note,
  onCtaClick,
  className,
}: PricingCardProps) => (
  <div
    className={cn(
      'rounded-[var(--radius-card)] bg-card border-2 border-primary',
      'p-8 shadow-[var(--shadow-card-lg)] flex flex-col gap-6 w-full max-w-sm mx-auto',
      className,
    )}
  >
    {/* 뱃지 + 플랜명 */}
    <div className="flex flex-col gap-1">
      <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 type-label font-semibold text-primary">
        {badge}
      </span>
      <p className="type-section-title font-bold text-foreground mt-2">{planName}</p>
    </div>

    {/* 가격 */}
    <div className="flex items-end gap-1">
      <span className="type-numeric text-foreground">{price}</span>
      <span className="type-body text-muted-foreground mb-1">{period}</span>
    </div>
    <p className="type-body text-muted-foreground -mt-4">{desc}</p>

    {/* 기능 목록 */}
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3">
          <CheckCircle2 size={17} className="text-success mt-0.5 shrink-0" />
          <span className="type-body text-foreground">{item}</span>
        </li>
      ))}
    </ul>

    <Button size="lg" variant="primary" onClick={onCtaClick} className="mt-2 w-full">
      {cta}
    </Button>

    <p className="text-center type-caption text-muted-foreground">{note}</p>
  </div>
);
