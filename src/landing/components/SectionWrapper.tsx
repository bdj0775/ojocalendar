import { cn } from '../../lib/cn';

interface SectionWrapperProps {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  id?: string;
}

/** 모든 섹션에 공통 패딩·max-width를 적용합니다. */
export const SectionWrapper = ({
  children,
  className,
  innerClassName,
  id,
}: SectionWrapperProps) => (
  <section id={id} className={cn('w-full px-6 py-24', className)}>
    <div className={cn('mx-auto w-full max-w-6xl', innerClassName)}>
      {children}
    </div>
  </section>
);
