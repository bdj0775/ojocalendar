import { useState, useRef, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

const ITEM_H = 44;
const VISIBLE = 5;
const PAD = Math.floor(VISIBLE / 2) * ITEM_H; // 88px — centers first/last item

interface PickerItem { label: string; value: number }

interface ScrollPickerProps {
  items: PickerItem[];
  value: number;
  onChange: (value: number) => void;
}

function ScrollPicker({ items, value, onChange }: ScrollPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const idx = items.findIndex(i => i.value === value);
    el.scrollTop = Math.max(0, idx) * ITEM_H;
  }, []);

  const onScroll = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const idx = Math.round(el.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(items.length - 1, idx));
      onChange(items[clamped].value);
    }, 80);
  }, [items, onChange]);

  return (
    <div className="relative overflow-hidden" style={{ height: VISIBLE * ITEM_H }}>
      {/* 중앙 하이라이트 strip */}
      <div
        className="absolute left-2 right-2 rounded-xl bg-slate-100 dark:bg-slate-700 pointer-events-none z-10"
        style={{ top: Math.floor(VISIBLE / 2) * ITEM_H, height: ITEM_H }}
      />
      {/* 위아래 페이드 */}
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white dark:from-slate-800 to-transparent pointer-events-none z-20" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white dark:from-slate-800 to-transparent pointer-events-none z-20" />

      <div
        ref={ref}
        className="absolute inset-0 overflow-y-scroll"
        style={{
          scrollSnapType: 'y mandatory',
          paddingTop: PAD,
          paddingBottom: PAD,
          scrollbarWidth: 'none',
        }}
        onScroll={onScroll}
      >
        {items.map(item => {
          const isSelected = item.value === value;
          return (
            <div
              key={item.value}
              className={`flex items-center justify-center select-none transition-all duration-150 ${
                isSelected
                  ? 'font-bold text-primary text-[17px]'
                  : 'text-slate-400 dark:text-slate-500 text-[14px]'
              }`}
              style={{ height: ITEM_H, scrollSnapAlign: 'center' }}
            >
              {item.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface Props {
  currentYear: number;
  currentMonth: number; // 0-indexed
  onConfirm: (year: number, month: number) => void;
  onClose: () => void;
}

const YearMonthPickerModal = ({ currentYear, currentMonth, onConfirm, onClose }: Props) => {
  const [selYear, setSelYear] = useState(currentYear);
  const [selMonth, setSelMonth] = useState(currentMonth);

  const years: PickerItem[] = Array.from({ length: 10 }, (_, i) => {
    const y = currentYear - 3 + i;
    return { label: `${y}년`, value: y };
  });

  const months: PickerItem[] = Array.from({ length: 12 }, (_, i) => ({
    label: `${i + 1}월`,
    value: i,
  }));

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white dark:bg-slate-800 rounded-t-2xl w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        {/* 드래그 핸들 */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
        </div>

        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-2">
          <span className="text-base font-semibold text-slate-800 dark:text-slate-200">날짜 선택</span>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X size={20} />
          </button>
        </div>

        {/* 피커 */}
        <div className="flex px-6 gap-4 py-2">
          <div className="flex-1">
            <ScrollPicker items={years} value={selYear} onChange={setSelYear} />
          </div>
          <div className="flex-1">
            <ScrollPicker items={months} value={selMonth} onChange={setSelMonth} />
          </div>
        </div>

        {/* 확인 버튼 */}
        <div className="px-5 py-4">
          <button
            className="w-full h-12 bg-primary text-white rounded-xl font-semibold text-[15px] active:opacity-80 transition-opacity"
            onClick={() => { onConfirm(selYear, selMonth); onClose(); }}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

export default YearMonthPickerModal;
