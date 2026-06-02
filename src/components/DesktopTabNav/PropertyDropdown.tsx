import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useTranslation } from '../../hooks/useTranslation';

const PropertyDropdown = () => {
  const { properties, selectedDashboardPropertyId, setSelectedDashboardPropertyId } = useStore();
  const { language } = useTranslation();
  const ko = language === 'ko';
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 숙소 1개 이하면 표시 안 함
  if (properties.length <= 1) return null;

  const selectedName = selectedDashboardPropertyId
    ? (properties.find(p => p.id === selectedDashboardPropertyId)?.name ?? (ko ? '전체' : 'All'))
    : (ko ? '전체' : 'All');

  const handleSelect = (id: string | null) => {
    setSelectedDashboardPropertyId(id);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`
          flex items-center gap-0.5 bg-transparent border-0 cursor-pointer
          text-[12px] font-medium tracking-wide transition-colors duration-200
          ${open ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/70'}
        `}
      >
        {selectedName}
        <ChevronDown
          size={11}
          className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <OutsideClick onClose={() => setOpen(false)} ignoreRef={ref}>
          <div className="absolute left-0 top-full mt-1.5 min-w-[130px] bg-card border border-border/60 rounded-xl shadow-tooltip overflow-hidden z-overlay">
            {/* 전체 */}
            <button
              onClick={() => handleSelect(null)}
              className={`w-full text-left px-3.5 py-2 text-[12px] font-medium transition-colors hover:bg-muted/60 ${
                !selectedDashboardPropertyId ? 'text-primary' : 'text-foreground'
              }`}
            >
              {ko ? '전체' : 'All'}
            </button>

            {/* 숙소 목록 */}
            {properties.map(p => (
              <button
                key={p.id}
                onClick={() => handleSelect(p.id)}
                className={`w-full text-left px-3.5 py-2 text-[12px] font-medium transition-colors hover:bg-muted/60 flex items-center gap-2 ${
                  selectedDashboardPropertyId === p.id ? 'text-primary' : 'text-foreground'
                }`}
              >
                {p.color && (
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                )}
                {p.name}
              </button>
            ))}
          </div>
        </OutsideClick>
      )}
    </div>
  );
};

// 외부 클릭 감지 헬퍼
function OutsideClick({
  children,
  onClose,
  ignoreRef,
}: {
  children: React.ReactNode;
  onClose: () => void;
  ignoreRef: React.RefObject<HTMLDivElement | null>;
}) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ignoreRef.current && ignoreRef.current.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose, ignoreRef]);

  return <>{children}</>;
}

export default PropertyDropdown;
