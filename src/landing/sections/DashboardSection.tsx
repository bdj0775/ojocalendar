import { cn } from "../../lib/cn";

export const DashboardSection = () => {
  return (
    <section className="py-24 px-6 md:px-12 lg:px-24 bg-slate-50 flex flex-col items-center justify-center w-full">
      <div className="w-full max-w-6xl mx-auto flex flex-col gap-8 md:gap-16">
        
        {/* 상단: 좌측 대시보드 & 우측 텍스트 */}
        <div className="flex flex-col-reverse lg:flex-row gap-8 lg:gap-16 w-full">
           {/* Left Large Dashboard */}
           <div className="flex-1 bg-white rounded-[32px] border border-slate-200/60 shadow-sm overflow-hidden aspect-[4/3] lg:aspect-auto min-h-[400px] flex items-center justify-center relative">
               <span className="text-slate-400 font-bold text-lg">커다란 대시보드 UI (플레이스홀더)</span>
           </div>
           
           {/* Right Text */}
           <div className="lg:w-[360px] shrink-0 flex flex-col justify-center gap-6 px-2 lg:px-0">
             <h2 className="text-3xl md:text-4xl lg:text-[40px] font-extrabold text-slate-900 tracking-tight leading-[1.2] break-keep">
                데이터로 판단하고 <br className="hidden lg:block" />매출을 높이세요
             </h2>
             <p className="text-base lg:text-lg text-slate-500 leading-relaxed break-keep">
                달력과 연동된 대시보드를 확인해보세요. 이번달 매출부터 순수익, 매달 수수료의 변동폭을 점검하세요. 손님의 유형과 예약패턴을 확인하고 공실 전략을 수립할 수 있어요.
             </p>
           </div>
        </div>

        {/* 하단 3개의 보조 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {[1, 2, 3].map((item) => (
            <div key={item} className="flex flex-col gap-5">
              <div className="w-full aspect-[4/3] bg-white rounded-[24px] border border-slate-200/60 shadow-sm flex items-center justify-center">
                <span className="text-slate-400 font-bold text-sm">보조 기능 {item} (플레이스홀더)</span>
              </div>
              <div className="flex flex-col gap-1.5 px-2">
                <h4 className="font-bold text-slate-900 text-lg">보조 카드 {item}</h4>
                <p className="text-sm text-slate-500 leading-snug break-keep">
                  여기에 보조 카드에 대한 설명과 텍스트가 들어갈 예정입니다.
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
