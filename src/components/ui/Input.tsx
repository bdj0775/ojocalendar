import { type InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="type-label font-bold text-muted-foreground">{label}</label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-4 py-3.5 rounded-xl border border-border bg-muted text-foreground type-body outline-none transition-all duration-200',
            'focus:border-primary focus:bg-card focus:shadow-[0_0_0_3px_var(--primary-ring)]',
            className,
          )}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = 'Input';
