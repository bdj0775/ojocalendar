import { type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = ({ variant = 'primary', size = 'md', className, children, ...props }: ButtonProps) => {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'sm' && 'type-body px-4 py-2',
        size === 'md' && 'type-body px-5 py-3.5',
        size === 'lg' && 'type-body-strong px-6 py-4',
        variant === 'primary'   && 'bg-primary text-primary-foreground shadow-[0_4px_12px_var(--primary-glow)] hover:bg-primary-700',
        variant === 'secondary' && 'bg-primary-100 text-primary-700 hover:bg-primary-200',
        variant === 'danger'    && 'bg-red-50 text-destructive hover:bg-red-100',
        variant === 'ghost'     && 'bg-muted text-muted-foreground hover:bg-border',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
};
