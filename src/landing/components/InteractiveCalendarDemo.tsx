import { useState, useEffect, useMemo } from 'react';
import { User, X } from 'lucide-react';

interface MockBooking {
  row: number; col: number; span: number; slot: number;
  guestName: string; info: string; channel: string; channelColor: string;
}

const mockBookingsData: MockBooking[][] = [
  // Month 0 (June)
  [
    { row: 1, col: 2, span: 3, slot: 0, guestName: '김지현', info: '2인', channel: 'AIRBNB', channelColor: '#ef4444' },
    { row: 2, col: 4, span: 2, slot: 0, guestName: '박서준', info: '4인', channel: 'NAVER', channelColor: '#10b981' },
    { row: 4, col: 0, span: 4, slot: 0, guestName: '이유진', info: '2인', channel: 'BOOKING', channelColor: '#3b82f6' },
  ],
  // Month 1 (July)
  [
    { row: 0, col: 5, span: 2, slot: 0, guestName: '정민우', info: '3인', channel: 'AIRBNB', channelColor: '#ef4444' },
    { row: 2, col: 1, span: 4, slot: 0, guestName: '최수아', info: '2인', channel: 'DIRECT', channelColor: '#a855f7' },
    { row: 5, col: 3, span: 3, slot: 0, guestName: '강동원', info: '4인', channel: 'NAVER', channelColor: '#10b981' },
  ],
  // Month 2 (August)
  [
    { row: 1, col: 0, span: 3, slot: 0, guestName: '한소희', info: '2인', channel: 'AIRBNB', channelColor: '#ef4444' },
    { row: 3, col: 4, span: 3, slot: 0, guestName: '유재석', info: '5인', channel: 'BOOKING', channelColor: '#3b82f6' },
  ]
];

const bonusBookings = [
  { row: 0, col: 1, span: 3, slot: 0, guestName: '박지민', info: '2인', channel: 'AIRBNB', channelColor: '#ef4444', delay: '0ms' },
  { row: 1, col: 0, span: 2, slot: 0, guestName: '이동욱', info: '4인', channel: 'NAVER', channelColor: '#10b981', delay: '120ms' },
  { row: 1, col: 3, span: 4, slot: 0, guestName: '최유리', info: '2인', channel: 'BOOKING', channelColor: '#3b82f6', delay: '240ms' },
  { row: 2, col: 2, span: 3, slot: 0, guestName: '김태형', info: '3인', channel: 'AIRBNB', channelColor: '#ef4444', delay: '360ms' },
  { row: 4, col: 1, span: 2, slot: 0, guestName: '정호석', info: '2인', channel: 'DIRECT', channelColor: '#a855f7', delay: '480ms' },
  { row: 4, col: 4, span: 3, slot: 0, guestName: '전정국', info: '5인', channel: 'NAVER', channelColor: '#10b981', delay: '600ms' },
  { row: 5, col: 0, span: 4, slot: 0, guestName: '민윤기', info: '2인', channel: 'AIRBNB', channelColor: '#ef4444', delay: '720ms' },
];

export const InteractiveCalendarDemo = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    let timers: NodeJS.Timeout[] = [];
    
    const runSequence = () => {
      setStep(0);
      timers.push(setTimeout(() => setStep(1), 1500)); // Swipe 1
      timers.push(setTimeout(() => setStep(2), 3000)); // Swipe 2
      timers.push(setTimeout(() => setStep(3), 4500)); // Swipe 3
      timers.push(setTimeout(() => setStep(4), 5500)); // Focus target event
      timers.push(setTimeout(() => setStep(5), 6000)); // Modal open
      timers.push(setTimeout(() => setStep(6), 7500)); // Click Naver
      timers.push(setTimeout(() => setStep(7), 8500)); // Click Save
      timers.push(setTimeout(() => setStep(8), 9000)); // Modal close, color changed
      timers.push(setTimeout(() => setStep(9), 9600)); // Pop in bonus events!
      timers.push(setTimeout(() => runSequence(), 14500)); // Loop
    };

    runSequence();
    return () => timers.forEach(clearTimeout);
  }, []);

  const monthNames = ['6월', '7월', '8월', '9월'];
  const currentMonth = monthNames[Math.min(step, 3)];
  const isModalOpen = step >= 5 && step < 8;
  const isChannelChanged = step >= 6;
  const isSaved = step >= 8;
  const showBonus = step >= 9;

  // The event bar we interact with in September
  const targetEventColor = isSaved ? '#10b981' : '#ef4444'; // Airbnb to Naver
  const targetChannelText = isSaved ? 'NAVER' : 'AIRBNB';

  const generateCells = () => Array.from({ length: 42 }).map((_, i) => {
    const day = (i % 31) + 1;
    const isCurrentMonth = i >= 3 && i < 34; // just dummy
    return { day, isCurrentMonth };
  });

  return (
    <div className="w-full h-full flex items-center justify-center relative bg-transparent">
      <style>{`
        @keyframes bonusPop {
          0% { transform: scale(0.3); opacity: 0; }
          60% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
      {/* Mobile Mockup Frame */}
      <div className="relative w-[300px] h-[580px] bg-card rounded-[32px] shadow-2xl border-[6px] border-slate-200/50 dark:border-slate-800/50 overflow-hidden shrink-0 flex flex-col z-10 origin-center bg-white">
        
        {/* Top bar */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-border/40 shrink-0 bg-white z-10">
          <div className="flex items-center gap-1">
            <span className="text-[14px] font-bold text-slate-800 flex items-center gap-1">
              2026년 {currentMonth}
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
            </span>
          </div>
          <div className="flex gap-1.5 items-center shrink-0">
            <div className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
            </div>
          </div>
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 text-center py-2 bg-white rounded-lg text-[10px] font-bold border-b border-slate-100 shrink-0 z-10">
          <span className="text-rose-500/90">일</span>
          <span className="text-slate-500">월</span>
          <span className="text-slate-500">화</span>
          <span className="text-slate-500">수</span>
          <span className="text-slate-500">목</span>
          <span className="text-slate-500">금</span>
          <span className="text-blue-500/90">토</span>
        </div>

        {/* Calendar Grid (Swipe effect) */}
        <div className="flex-1 relative bg-white overflow-hidden">
          <div 
            className="absolute inset-0 w-[400%] flex h-full transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
            style={{ transform: `translateX(-${Math.min(step, 3) * 25}%)` }}
          >
            {/* 4 Months Panels */}
            {[0, 1, 2, 3].map((mIdx) => (
              <div key={mIdx} className="w-1/4 h-full relative">
                <div className="grid grid-cols-7 grid-rows-6 gap-0 h-full border-l border-slate-100/60">
                  {generateCells().map((cell, i) => {
                    const dow = i % 7;
                    const isRed = dow === 0;
                    const isBlue = dow === 6;
                    return (
                      <div key={i} className={`p-1 box-border border-b border-slate-100/60 flex flex-col justify-start items-start relative ${dow < 6 ? 'border-r border-slate-100/60' : ''}`}>
                        <span className={`text-[10px] font-bold leading-none select-none ${isRed ? 'text-rose-500' : isBlue ? 'text-blue-500' : 'text-slate-500'} ${!cell.isCurrentMonth ? 'opacity-30' : ''}`}>
                          {cell.day}
                        </span>
                      </div>
                    );
                  })}
                </div>
                
                {/* Events */}
                {mIdx !== 3 && mockBookingsData[mIdx]?.map((bar, i) => {
                  const left = `calc(${bar.col} * 100% / 7 + 2px)`;
                  const width = `calc(${bar.span} * 100% / 7 - 4px)`;
                  const top = `calc(${bar.row} * 100% / 6 + ${16 + bar.slot * 12}px)`;
                  return (
                    <div key={i} className="absolute flex items-center overflow-hidden rounded-[4px] px-1 shadow-sm text-white transition-colors duration-500" style={{ left, width, top, height: '11px', backgroundColor: bar.channelColor }}>
                      <div className="flex items-baseline w-full overflow-hidden min-w-0">
                        <span className="text-[7.5px] font-extrabold truncate leading-none min-w-0 shrink">{bar.guestName}</span>
                        <span className="text-[7px] font-bold opacity-90 leading-none shrink-0 ml-1">{bar.info}</span>
                        {bar.span >= 3 && <span className="text-[7px] opacity-80 leading-none shrink-0 ml-auto font-sans font-semibold">{bar.channel}</span>}
                      </div>
                    </div>
                  );
                })}

                {/* Target Event in September (mIdx === 3) */}
                {mIdx === 3 && (
                  <>
                    <div 
                      className={`absolute flex items-center overflow-hidden rounded-[4px] px-1 shadow-sm text-white transition-all duration-300 ${step === 4 ? 'scale-110 ring-2 ring-primary ring-offset-2 z-20 shadow-md' : 'z-10'}`}
                      style={{ 
                        left: `calc(2 * 100% / 7 + 2px)`, 
                        width: `calc(3 * 100% / 7 - 4px)`, 
                        top: `calc(3 * 100% / 6 + 16px)`, 
                        height: '11px', 
                        backgroundColor: targetEventColor 
                      }}
                    >
                      <div className="flex items-baseline w-full overflow-hidden min-w-0">
                        <span className="text-[7.5px] font-extrabold truncate leading-none min-w-0 shrink">김민준</span>
                        <span className="text-[7px] font-bold opacity-90 leading-none shrink-0 ml-1">2인</span>
                        <span className="text-[7px] opacity-80 leading-none shrink-0 ml-auto font-sans font-semibold">{targetChannelText}</span>
                      </div>
                    </div>

                    {/* Bonus Pop-in Events (Show after Step 8) */}
                    {showBonus && bonusBookings.map((bar, i) => {
                      const left = `calc(${bar.col} * 100% / 7 + 2px)`;
                      const width = `calc(${bar.span} * 100% / 7 - 4px)`;
                      const top = `calc(${bar.row} * 100% / 6 + ${16 + bar.slot * 12}px)`;
                      return (
                        <div 
                          key={`bonus-${i}`} 
                          className="absolute flex items-center overflow-hidden rounded-[4px] px-1 shadow-sm text-white z-10 opacity-0" 
                          style={{ 
                            left, width, top, height: '11px', 
                            backgroundColor: bar.channelColor,
                            animation: `bonusPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${bar.delay} forwards`
                          }}
                        >
                          <div className="flex items-baseline w-full overflow-hidden min-w-0">
                            <span className="text-[7.5px] font-extrabold truncate leading-none min-w-0 shrink">{bar.guestName}</span>
                            <span className="text-[7px] font-bold opacity-90 leading-none shrink-0 ml-1">{bar.info}</span>
                            {bar.span >= 3 && <span className="text-[7px] opacity-80 leading-none shrink-0 ml-auto font-sans font-semibold">{bar.channel}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Modal Overlay matching real BookingEditModal */}
        <div className={`absolute inset-0 bg-black/40 backdrop-blur-[1px] z-40 transition-opacity duration-300 flex items-center justify-center p-3 ${isModalOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          {/* Modal Panel */}
          <div className={`bg-white w-full rounded-[24px] shadow-2xl transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden flex flex-col ${isModalOpen ? 'scale-100' : 'scale-95 translate-y-4'}`}>
            
            {/* Header */}
            <div className="px-5 pt-5 pb-4 shrink-0 relative">
              <div className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center text-slate-400">
                <X size={16} />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-primary/10 text-primary">예약 확정</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[20px] font-bold text-slate-800">김민준</span>
                <div className="flex items-center gap-1 shrink-0 ml-auto mr-6">
                  <User size={14} className="text-slate-400" />
                  <span className="font-bold text-[16px] leading-none text-slate-400">−</span>
                  <span className="text-[14px] font-bold text-slate-800 w-[14px] text-center">2</span>
                  <span className="font-bold text-[16px] leading-none text-slate-400">+</span>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-5 pb-5 space-y-4">
              <div className="flex items-center bg-slate-50 p-3 rounded-2xl relative border border-slate-100">
                <div className="flex-1 flex flex-col">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">Check-in</span>
                  <span className="text-[13px] font-bold text-slate-800">9월 15일 (화)</span>
                </div>
                <div className="text-slate-300 px-2">→</div>
                <div className="flex-1 flex flex-col pl-2">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">Check-out</span>
                  <span className="text-[13px] font-bold text-slate-800">9월 18일 (금)</span>
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">채널</span>
                <div className="flex flex-wrap gap-1.5">
                  <span className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all ${!isChannelChanged ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-100 text-slate-500'}`}>에어비앤비</span>
                  <span className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all relative ${isChannelChanged ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-100 text-slate-500'}`}>
                    네이버
                    {step === 6 && <span className="absolute inset-0 rounded-xl bg-slate-800/30 animate-ping" />}
                  </span>
                  <span className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold bg-slate-100 text-slate-500">부킹닷컴</span>
                </div>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1.5">결제금액</span>
                <div className="flex items-center bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                  <span className="flex-1 text-[14px] font-bold text-slate-800">450,000</span>
                  <span className="text-[12px] font-bold text-slate-400">원</span>
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center border-t border-slate-100 mt-2">
                <div className="flex flex-col">
                  <span className="text-[9px] font-semibold text-slate-400 uppercase">예약일: 2026-09-01</span>
                </div>
                <button className={`px-4 py-2 rounded-xl text-[12px] font-bold transition-all relative ${step === 7 ? 'bg-primary/90 text-white scale-[0.98]' : 'bg-primary text-white shadow-sm'}`}>
                  수정 완료
                  {step === 7 && <span className="absolute inset-0 rounded-xl bg-white/40 animate-ping" />}
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
