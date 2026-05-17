import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface Props {
  initialDate: string; // YYYY-MM-DD
  minDate?: string;
  onSelect: (date: string) => void;
  onClose: () => void;
  title?: string;
}

const DOW = ['일', '월', '화', '수', '목', '금', '토'];

const DatePickerOverlay = ({ initialDate, minDate, onSelect, onClose, title = '날짜 선택' }: Props) => {
  const [curr, setCurr] = useState(() => {
    const d = initialDate ? new Date(initialDate) : new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const cells = useMemo(() => {
    const y = curr.y;
    const m = curr.m;
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const arr = [];
    for (let i = 0; i < firstDay; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      arr.push(ds);
    }
    return arr;
  }, [curr]);

  const nextMonth = () => {
    setCurr(prev => prev.m === 11 ? { y: prev.y + 1, m: 0 } : { ...prev, m: prev.m + 1 });
  };
  const prevMonth = () => {
    setCurr(prev => prev.m === 0 ? { y: prev.y - 1, m: 11 } : { ...prev, m: prev.m - 1 });
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/20 flex items-center justify-center p-4 animate-[fadeIn_0.15s_ease]" onClick={onClose}>
      <div className="bg-card rounded-3xl shadow-xl w-full max-w-[320px] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <span className="font-bold text-lg text-foreground">{title}</span>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"><X size={18} /></button>
        </div>
        
        <div className="px-5 pb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="font-bold text-foreground pl-1">{curr.y}년 {curr.m + 1}월</span>
            <div className="flex gap-1">
              <button onClick={prevMonth} className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-foreground transition-colors"><ChevronLeft size={18}/></button>
              <button onClick={nextMonth} className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-foreground transition-colors"><ChevronRight size={18}/></button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-y-2 mb-2">
            {DOW.map(dow => (
              <div key={dow} className="text-center text-[11px] font-bold text-muted-foreground">{dow}</div>
            ))}
            {cells.map((ds, i) => {
              if (!ds) return <div key={`empty-${i}`} />;
              const dNum = parseInt(ds.split('-')[2], 10);
              const isSelected = ds === initialDate;
              const disabled = minDate ? ds < minDate : false;
              const isToday = ds === new Date().toISOString().split('T')[0];
              
              let cls = "w-9 h-9 mx-auto rounded-full flex items-center justify-center text-[15px] font-bold transition-all ";
              if (disabled) {
                cls += "text-muted-foreground/30 cursor-not-allowed";
              } else if (isSelected) {
                cls += "bg-primary text-primary-foreground shadow-md shadow-primary/30";
              } else if (isToday) {
                cls += "text-primary bg-primary/10 hover:bg-primary/20 cursor-pointer";
              } else {
                cls += "text-foreground hover:bg-muted cursor-pointer";
              }

              return (
                <button
                  key={ds}
                  disabled={disabled}
                  onClick={() => onSelect(ds)}
                  className={cls}
                >
                  {dNum}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatePickerOverlay;
