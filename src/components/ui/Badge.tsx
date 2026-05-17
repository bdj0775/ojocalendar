import { type HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';
import type { BookingStatus } from '../../types';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status?: BookingStatus;
}

const STATUS_CLASSES: Record<BookingStatus, string> = {
  confirmed: 'bg-primary-100 text-primary-700',
  'checked in': 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-50 text-amber-600',
  completed: 'bg-muted text-muted-foreground',
};

export const Badge = ({ status, className, children, ...props }: BadgeProps) => {
  return (
    <span
      className={cn(
        'inline-block type-micro font-bold px-2.5 py-0.5 rounded-xl tracking-[0.3px]',
        status && STATUS_CLASSES[status],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
};
