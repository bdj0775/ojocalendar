import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  desc: string;
  className?: string;
}

export const FeatureCard = ({ icon: Icon, title, desc, className }: FeatureCardProps) => (
  <div
    className={cn(
      'flex flex-col gap-4 rounded-[var(--radius-card)] bg-card border border-border',
      'p-7 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-lg)]',
      className,
    )}
  >
    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
      <Icon size={22} strokeWidth={1.8} />
    </div>
    <div className="flex flex-col gap-1.5">
      <h3 className="type-card-title font-semibold text-foreground">{title}</h3>
      <p className="type-body text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  </div>
);
