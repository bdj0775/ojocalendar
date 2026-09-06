import { useEffect, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { ICON_SIZES } from '../../lib/iconSizes';
import { cn } from '../../lib/cn';

interface InfoPopoverProps {
  children: React.ReactNode;
  /** 접근성 라벨 (버튼의 aria-label) */
  label: string;
  /** 말풍선 정렬. 카드 오른쪽 끝에 있으면 'right'로 두어 화면 밖으로 나가지 않게 한다 */
  align?: 'left' | 'right';
  className?: string;
}

/**
 * ⓘ 아이콘에 마우스를 올리거나 누르면 설명 말풍선을 띄운다.
 *
 * 스타일은 차트 툴팁(TrendTooltip)과 같은 토큰을 쓴다 — 같은 화면 안에서
 * 떠 있는 요소끼리 생김새가 달라지지 않도록.
 */
export const InfoPopover = ({ children, label, align = 'right', className }: InfoPopoverProps) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  // 바깥 클릭 · ESC로 닫기 (터치 기기에서 열어둔 뒤 닫을 방법이 필요하다)
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span
      ref={wrapRef}
      className={cn('relative inline-flex items-center', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center justify-center text-muted-foreground/60 hover:text-muted-foreground transition-colors"
      >
        <Info size={ICON_SIZES.xs} strokeWidth={2.2} />
      </button>

      {open && (
        <div
          role="tooltip"
          className={cn(
            'absolute top-full mt-2 z-50 w-[290px] cursor-default',
            'bg-card border border-border rounded-inner shadow-tooltip p-3.5',
            'text-left font-normal',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {children}
        </div>
      )}
    </span>
  );
};
