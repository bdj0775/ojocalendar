import { useState, useEffect } from 'react';
import { User, X } from 'lucide-react';
import { cn } from '../../lib/cn';

export const InteractiveModalDemo = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    let timers: ReturnType<typeof setTimeout>[] = [];
    
    const runSequence = () => {
      setStep(0); // Grid only
      timers.push(setTimeout(() => setStep(1), 800)); // Click cell
      timers.push(setTimeout(() => setStep(2), 1200)); // Modal appears
      
      timers.push(setTimeout(() => setStep(3), 1800)); // ㅂ
      timers.push(setTimeout(() => setStep(4), 1950)); // 박
      timers.push(setTimeout(() => setStep(5), 2100)); // 박ㅅ
      timers.push(setTimeout(() => setStep(6), 2250)); // 박서
      timers.push(setTimeout(() => setStep(7), 2400)); // 박서ㅈ
      timers.push(setTimeout(() => setStep(8), 2550)); // 박서준

      timers.push(setTimeout(() => setStep(9), 3200)); // Guests = 3
      timers.push(setTimeout(() => setStep(10), 3500)); // Guests = 4
      
      timers.push(setTimeout(() => setStep(11), 4300)); // Scroll down
      timers.push(setTimeout(() => setStep(12), 4800)); // Tag Korea
      timers.push(setTimeout(() => setStep(13), 5200)); // Tag Airbnb
      
      timers.push(setTimeout(() => setStep(14), 5800)); // Scroll bottom
      
      timers.push(setTimeout(() => setStep(15), 6300)); // Price calc start
      timers.push(setTimeout(() => setStep(16), 6400)); // 15,000
      timers.push(setTimeout(() => setStep(17), 6500)); // 142,000
      timers.push(setTimeout(() => setStep(18), 6600)); // 189,000
      
      timers.push(setTimeout(() => setStep(19), 7400)); // Click Save (btn flash)
      timers.push(setTimeout(() => setStep(20), 7800)); // Hide modal
      timers.push(setTimeout(() => setStep(21), 8100)); // Event bar pops in
      timers.push(setTimeout(runSequence, 10500)); 
    };

    runSequence();

    return () => timers.forEach(clearTimeout);
  }, []);

  // Determine State
  const scrollY = step >= 14 ? 180 : step >= 11 ? 100 : 0;
  
  const showModal = step >= 2 && step < 20;
  const isDone = step >= 19;
  
  // Name typing
  const nameState = step;
  let name = '예약자명';
  let isNameTyped = false;
  if (nameState === 3) { name = 'ㅂ'; isNameTyped = true; }
  else if (nameState === 4) { name = '박'; isNameTyped = true; }
  else if (nameState === 5) { name = '박ㅅ'; isNameTyped = true; }
  else if (nameState === 6) { name = '박서'; isNameTyped = true; }
  else if (nameState === 7) { name = '박서ㅈ'; isNameTyped = true; }
  else if (nameState >= 8) { name = '박서준'; isNameTyped = true; }

  const guests = step >= 10 ? 4 : step >= 9 ? 3 : 2;
  const tagNation = step >= 12 ? '한국' : '';
  const tagChannel = step >= 13 ? 'Airbnb' : '';
  
  // Financials typing effect
  let priceStr = '0';
  let feeStr = '0';
  let feePct = '0';
  let hasPrice = step >= 15;
  
  if (step === 15) { priceStr = '0'; feeStr = '0'; feePct = '0'; }
  else if (step === 16) { priceStr = '34,000'; feeStr = '1,020'; feePct = '3'; }
  else if (step === 17) { priceStr = '128,000'; feeStr = '3,840'; feePct = '3'; }
  else if (step >= 18) { priceStr = '189,000'; feeStr = '5,670'; feePct = '3'; }

  const btnScale = step === 19 ? 0.95 : 1;
  const showNewEvent = step >= 21;

  return (
    <svg viewBox="0 0 500 281" className="w-full h-full block" preserveAspectRatio="xMidYMid slice">
      <foreignObject width="500" height="281">
        <div className="w-[500px] h-[281px] bg-white flex items-center justify-center relative pointer-events-none">
          
          {/* IDENTICAL Background Grid (No Events) */}
          <div className="absolute inset-0 bg-white flex flex-col">
            <div className="flex border-b border-border/40 pb-2 pt-2 px-1">
              {['일','월','화','수','목','금','토'].map(d=>(
                <div key={d} className="flex-1 text-center text-[12px] font-bold text-muted-foreground/60">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 relative flex-1" style={{ gridTemplateRows: 'repeat(3, 100px)' }}>
              {Array.from({length:21}).map((_,i)=>{
                const day = (i+31)%31 || 31;
                const isSun = i%7===0; 
                const isSat = i%7===6;
                return (
                  <div key={i} className="border-b border-r border-border/40 p-2 relative bg-white flex flex-col">
                    <span className={`text-[12px] font-bold leading-none ${isSun?'text-rose-500/90':isSat?'text-blue-500/90':'text-foreground/80'}`}>{day}</span>
                  </div>
                );
              })}
              
              {/* Cell click effect exactly on cell 10 (row 1, col 3) */}
              <div 
                className={cn(
                  "absolute bg-primary/20 z-10 transition-all duration-300 pointer-events-none rounded-[4px] border border-primary/40",
                  step === 1 ? "opacity-100 scale-100" : "opacity-0 scale-95"
                )}
                style={{
                  left: `calc(3 * 100% / 7)`,
                  width: `calc(100% / 7)`,
                  top: `100px`,
                  height: '100px'
                }}
              />

              {/* The Popping Event Bar after Save */}
              <div 
                className={cn(
                  "absolute bg-[#ef4444] rounded-[4px] px-1.5 text-white shadow-sm z-10 flex items-center overflow-hidden transition-all duration-[600ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                  showNewEvent ? "opacity-100 scale-100" : "opacity-0 scale-50"
                )}
                style={{
                  left: `calc(3 * 100% / 7 + 2px)`,
                  width: `calc(2 * 100% / 7 - 4px)`,
                  top: `126px`,
                  height: '22px',
                  transformOrigin: 'left center'
                }}
              >
                <div className="flex items-baseline w-full overflow-hidden min-w-0">
                  <span className="text-[11px] font-medium truncate leading-none min-w-0 shrink">박서준</span>
                  <span className="text-[10px] opacity-80 leading-none shrink-0 ml-1.5">4인</span>
                  <span className="text-[10px] opacity-70 leading-none shrink-0 ml-auto font-sans font-bold">AIRBNB</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dimmed Overlay */}
          <div className={cn("absolute inset-0 bg-slate-900/15 backdrop-blur-[1px] transition-opacity duration-500 z-20", showModal ? "opacity-100" : "opacity-0")} />

          {/* Scaled Floating Modal strictly contained inside SVG to guarantee grid is always visible */}
          <div 
            className={cn(
              "absolute left-1/2 top-1/2 w-[320px] h-[240px] -ml-[160px] -mt-[120px] bg-white rounded-[16px] shadow-[0_24px_80px_rgba(0,0,0,0.2)] border border-slate-200 overflow-hidden flex flex-col z-30 transition-all duration-500 pointer-events-auto",
              showModal ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-4"
            )}
          >
            {/* The scrolling modal content */}
            <div 
              className="relative w-full bg-white flex flex-col pt-4 pb-4 px-5 transition-transform duration-700 ease-in-out"
              style={{ transform: `translateY(-${scrollY}px)` }}
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-1.5 flex-nowrap shrink-0 overflow-hidden pr-2">
                  <span className="bg-blue-100 text-blue-600 text-[9px] font-extrabold px-1.5 py-0.5 rounded-[3px] uppercase tracking-wider shrink-0">NEW</span>
                  <span className="bg-[#1f2937] text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-[3px] flex items-center gap-1 shrink-0"><div className="w-1 h-1 rounded-full bg-[#03C75A] shrink-0"></div>안채</span>
                  <span className="bg-slate-50 text-slate-500 text-[9px] font-extrabold px-1.5 py-0.5 rounded-[3px] flex items-center gap-1 shrink-0"><div className="w-1 h-1 rounded-full bg-[#a855f7] shrink-0"></div>바깥채</span>
                </div>
                <X size={12} className="text-slate-400 shrink-0" />
              </div>

              {/* Name & Guests */}
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
                <div className={cn("text-[18px] font-extrabold transition-colors duration-300", isNameTyped ? "text-slate-800" : "text-slate-200")}>
                  {name}
                  {isNameTyped && !isDone && <span className="inline-block w-[1.5px] h-4 bg-blue-500 ml-1.5 animate-pulse align-middle" />}
                </div>
                <div className="flex items-center gap-2.5 text-slate-400">
                  <User size={13} className="text-slate-400" />
                  <span className="text-[14px] leading-none font-extrabold text-slate-800">−</span>
                  <span className={cn("text-[14px] font-extrabold w-[14px] text-center transition-all duration-300", step >= 9 ? "text-blue-600 scale-125" : "text-slate-800")}>{guests}</span>
                  <span className={cn("text-[16px] leading-none font-bold transition-colors duration-200 text-slate-800", step >= 9 && step <= 10 ? "text-blue-600" : "")}>+</span>
                </div>
              </div>
              
              {/* Dates */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <div className="flex flex-col relative w-[40%]">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">IN</span>
                  <div className="flex items-center gap-1.5">
                    <div className="flex flex-col items-center flex-1">
                      <span className="text-[14px] font-extrabold text-slate-800 flex items-center justify-between w-full"><span className="text-slate-300 text-[9px]">&lt;</span> 6 <span className="text-slate-300 text-[9px]">&gt;</span></span>
                      <span className="text-[10px] font-extrabold text-slate-700">월</span>
                    </div>
                    <div className="w-px h-5 bg-slate-100" />
                    <div className="flex flex-col items-center flex-1">
                      <span className="text-[14px] font-extrabold text-slate-800 flex items-center justify-between w-full"><span className="text-slate-300 text-[9px]">&lt;</span> 11 <span className="text-slate-300 text-[9px]">&gt;</span></span>
                      <span className="text-[10px] font-extrabold text-slate-700">일</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-center justify-end h-full mt-3 relative z-10 px-1.5">
                  <span className="text-[8px] font-extrabold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full mb-0.5">1박</span>
                  <span className="absolute top-[-10px] text-slate-200 text-[11px] font-bold">→</span>
                </div>
                <div className="flex flex-col relative w-[40%]">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">OUT</span>
                  <div className="flex items-center gap-1.5">
                    <div className="flex flex-col items-center flex-1">
                      <span className="text-[14px] font-extrabold text-slate-800 flex items-center justify-between w-full"><span className="text-slate-300 text-[9px]">&lt;</span> 6 <span className="text-slate-300 text-[9px]">&gt;</span></span>
                      <span className="text-[10px] font-extrabold text-slate-700">월</span>
                    </div>
                    <div className="w-px h-5 bg-slate-100" />
                    <div className="flex flex-col items-center flex-1">
                      <span className="text-[14px] font-extrabold text-slate-800 flex items-center justify-between w-full"><span className="text-slate-300 text-[9px]">&lt;</span> 12 <span className="text-slate-300 text-[9px]">&gt;</span></span>
                      <span className="text-[10px] font-extrabold text-slate-700">일</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="flex gap-1.5 flex-wrap mb-1.5">
                {['한국','대만','싱가폴','중국','서구권'].map((n) => (
                  <span key={n} className={cn("text-[10px] font-extrabold px-3 py-1 rounded-[12px] transition-all duration-300", tagNation === n ? 'bg-[#1f2937] text-white scale-105 shadow-sm' : 'bg-slate-50 text-slate-500')}>{n}</span>
                ))}
              </div>
              <div className="flex gap-1.5 flex-wrap pb-4 border-b border-slate-100 mb-4">
                {['Airbnb','Booking.com','Naver','Direct'].map((n) => {
                  return (
                    <span key={n} className={cn("text-[10px] font-extrabold px-3 py-1 rounded-[12px] transition-all duration-300", tagChannel === n ? `bg-[#1f2937] text-white scale-105 shadow-sm` : 'bg-slate-50 text-slate-500')}>{n}</span>
                  );
                })}
              </div>

              {/* Financials */}
              <div className="grid grid-cols-2 gap-3 pb-4 border-b border-slate-100 mb-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-extrabold text-slate-400 flex items-center gap-1">결제금액 <span className="bg-slate-100 text-slate-400 px-1 py-0.5 rounded-[4px] text-[8px]">평일</span></span>
                  <div className={cn("flex justify-between items-center bg-white px-2.5 py-2 rounded-lg border shadow-sm transition-all duration-300", hasPrice ? "border-blue-200 shadow-blue-100/50" : "border-slate-100")}>
                    <span className={cn("text-[14px] font-extrabold transition-colors duration-300", hasPrice ? "text-[#111827]" : "text-slate-300")}>{priceStr}</span>
                    <span className="text-[10px] font-bold text-slate-400">원</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-extrabold text-slate-400 flex justify-between"><span>수수료</span><span className={cn("transition-colors duration-300", hasPrice ? "text-slate-400" : "text-transparent")}>{feeStr}원</span></span>
                  <div className={cn("flex justify-between items-center bg-white px-2.5 py-2 rounded-lg border shadow-sm transition-all duration-300", hasPrice ? "border-blue-200 shadow-blue-100/50" : "border-slate-100")}>
                    <span className={cn("text-[14px] font-extrabold transition-colors duration-300", hasPrice ? "text-[#111827]" : "text-slate-300")}>{feePct}</span>
                    <span className="text-[10px] font-bold text-slate-400">%</span>
                  </div>
                </div>
              </div>

              {/* Memo */}
              <div className="bg-slate-50 rounded-xl p-2.5 mb-4 border border-slate-50">
                <span className="text-[11px] font-bold text-slate-300">메모...</span>
              </div>

              {/* Footer */}
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-extrabold text-slate-300">오늘 · 90%</span>
                <div 
                  className="bg-[#2563eb] text-white text-[12px] font-extrabold px-5 py-2.5 rounded-xl shadow-md transition-all duration-200"
                  style={{ transform: `scale(${btnScale})`, filter: btnScale < 1 ? 'brightness(0.9)' : 'none' }}
                >
                  예약 저장
                </div>
              </div>
              
            </div>
          </div>
        </div>
      </foreignObject>
    </svg>
  );
};
