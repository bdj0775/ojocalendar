import { SectionWrapper } from '../components/SectionWrapper';
import { InteractiveCalendarDemo } from '../components/InteractiveCalendarDemo';
import { InteractiveModalDemo } from '../components/InteractiveModalDemo';
import { InteractiveDashboardDemo, SubcardMonthlyDemo, SubcardPaceDemo, SubcardDonutDemo } from '../components/InteractiveDashboardDemo';
import { cn } from '../../lib/cn';
import { User } from 'lucide-react';

export const ThreeCardSection = () => {
  return (
    <SectionWrapper className="bg-background py-24 md:py-32 border-t border-border/40">
      <div className="flex flex-col gap-32 md:gap-48 max-w-7xl mx-auto px-6">
        
        {/* Card 1 */}
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-20">
          <div className="w-full lg:w-1/2 order-2 lg:order-1 flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <span className="text-sm md:text-base font-bold text-primary tracking-wide bg-primary/10 w-fit px-4 py-1.5 rounded-full">
                숙박 운영에 특화된 최초의 캘린더
              </span>
              <h3 className="text-4xl md:text-[2.75rem] font-extrabold text-foreground tracking-tight leading-[1.2] break-keep">
                캘린더에 한눈에 정리하세요
              </h3>
            </div>
            
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed font-medium break-keep">
              복잡한 예약정보를 하나의 캘린더에 정리해보세요. 색상으로 예약채널을 구분하고, 인원과 국가, 색상을 달력 위에서 한눈에 확인 할 수있어요.
            </p>

            {/* 서브 이미지와 설명 2개를 넣을 수 있는 레이아웃 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
              {/* 서브 아이템 1 */}
              <div className="flex flex-col gap-3">
                <div className="w-full aspect-[16/9] rounded-[20px] bg-white border border-border/50 overflow-hidden relative shadow-sm flex items-center justify-center p-0">
                  <svg viewBox="0 0 500 281" className="w-full h-full block" preserveAspectRatio="xMidYMid slice">
                    <foreignObject width="500" height="281">
                      <div className="w-[500px] h-[281px] bg-white flex flex-col pointer-events-none">
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
                          
                          {/* EXACT ACTUAL UI SPACING from CalendarGrid.tsx */}
                          {/* CELL_HEIGHT = 100, BAR_OFFSET_Y = 26, BAR_H = 22, BAR_GAP = 2 */}
                          {[
                            { row: 0, col: 0, span: 3, slot: 0, bg: 'bg-[#3b82f6]', txt: '박준혁', gst: '2인 3박', ch: 'B.COM' },
                            { row: 0, col: 4, span: 2, slot: 0, bg: 'bg-[#ef4444]', txt: 'Sarah', gst: '1인 2박', ch: 'AIRBNB' },
                            { row: 1, col: 1, span: 4, slot: 0, bg: 'bg-[#ef4444]', txt: '김유진', gst: '4인 4박', ch: 'AIRBNB' },
                            { row: 1, col: 2, span: 2, slot: 1, bg: 'bg-[#3b82f6]', txt: 'JEMMA', gst: '2인', ch: 'B.COM' },
                            { row: 1, col: 2, span: 3, slot: 2, bg: 'bg-[#10b981]', txt: '이희연', gst: '2인 3박', ch: 'NAVER' },
                            { row: 2, col: 4, span: 3, slot: 0, bg: 'bg-[#a855f7]', txt: '가족여행', gst: '4인', ch: 'DIRECT' },
                            { row: 2, col: 0, span: 2, slot: 0, bg: 'bg-[#10b981]', txt: '커플여행', gst: '2인', ch: 'NAVER' },
                          ].map((ev, i) => (
                            <div 
                              key={i}
                              className={`absolute ${ev.bg} rounded-[4px] px-1.5 text-white shadow-sm z-10 flex items-center overflow-hidden`}
                              style={{
                                left: `calc(${ev.col} * 100% / 7 + 2px)`,
                                width: `calc(${ev.span} * 100% / 7 - 4px)`,
                                top: `${ev.row * 100 + 26 + ev.slot * 24}px`,
                                height: '22px'
                              }}
                            >
                              <div className="flex items-baseline w-full overflow-hidden min-w-0">
                                <span className="text-[11px] font-medium truncate leading-none min-w-0 shrink">{ev.txt}</span>
                                <span className="text-[10px] opacity-80 leading-none shrink-0 ml-1.5">{ev.gst}</span>
                                <span className="text-[10px] opacity-70 leading-none shrink-0 ml-auto">{ev.ch}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </foreignObject>
                  </svg>
                </div>
                <div className="flex flex-col gap-1.5 px-1">
                  <h4 className="font-bold text-foreground text-base">예약정보를 반영한 이벤트바</h4>
                  <p className="text-sm text-muted-foreground leading-snug break-keep">
                    객실과 채널별 색상을 직접 지정하세요. 인원과 채널, 국적, 숙박일을 한눈에 확인할 수 있어요.
                  </p>
                </div>
              </div>
              
              {/* 서브 아이템 2 */}
              <div className="flex flex-col gap-3">
                <div className="w-full aspect-[16/9] rounded-[20px] bg-white border border-border/50 overflow-hidden relative shadow-sm flex items-center justify-center p-0">
                  <InteractiveModalDemo />
                </div>
                <div className="flex flex-col gap-1.5 px-1">
                  <h4 className="font-bold text-foreground text-base">초간편한 예약 입력</h4>
                  <p className="text-sm text-muted-foreground leading-snug break-keep">
                    빈 날짜를 클릭해 예약정보를 등록하세요. 숙박운영에 최적화된 입력 모달을 이용해 간편하게 저장할 수 있어요.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="w-full lg:w-1/2 order-1 lg:order-2">
            <InteractiveCalendarDemo />
          </div>
        </div>

        {/* Card 2 (Dashboard & Sub-cards) */}
        <div className="flex flex-col gap-16">
          {/* Main Dashboard Presentation */}
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
            <div className="w-full lg:w-[55%] order-1 lg:order-1 rounded-[32px] bg-muted/40 border border-border/50 relative overflow-hidden shadow-2xl group transition-transform duration-500 hover:-translate-y-2 p-1.5 aspect-[144/160] shrink-0">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="w-full h-full rounded-[26px] overflow-hidden bg-white shadow-sm border border-slate-100 relative">
                 <InteractiveDashboardDemo />
              </div>
            </div>
            <div className="w-full lg:w-[45%] order-2 lg:order-2 flex flex-col gap-6 lg:py-20">
              <div className="flex flex-col gap-4">
                <span className="text-sm md:text-base font-bold text-primary tracking-wide bg-primary/10 w-fit px-4 py-1.5 rounded-full">
                  한 눈에 보는 통계 지표
                </span>
                <h3 className="text-4xl md:text-[2.75rem] font-extrabold text-foreground tracking-tight leading-[1.2] break-keep">
                  데이터로 판단하고 <br className="hidden md:block" />매출을 높이세요
                </h3>
              </div>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed font-medium break-keep">
                달력과 연동된 대시보드를 확인해보세요. 이번달 매출부터 순수익, 매달 수수료의 변동폭을 점검하세요. 손님의 유형과 예약패턴을 확인하고 공실 전략을 수립할 수 있어요.
              </p>
            </div>
          </div>

          {/* 3 Sub Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mt-2">
            {/* Sub-card 1 */}
            <div className="flex flex-col gap-4 group cursor-pointer">
              <div className="w-full aspect-[4/3] bg-white rounded-[24px] border border-border/60 shadow-sm flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:-translate-y-1 relative">
                <SubcardMonthlyDemo />
              </div>
              <div className="flex flex-col gap-1.5 px-2">
                <h4 className="font-bold text-foreground text-base group-hover:text-primary transition-colors">AI 예상 매출 알고리즘</h4>
                <p className="text-sm text-muted-foreground leading-snug break-keep">
                  예약률을 분석해 향후 예상 점유율과 매출을 판단해줍니다.
                </p>
              </div>
            </div>

            {/* Sub-card 2 */}
            <div className="flex flex-col gap-4 group cursor-pointer">
              <div className="w-full aspect-[4/3] bg-white rounded-[24px] border border-border/60 shadow-sm flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:-translate-y-1 relative">
                <SubcardPaceDemo />
              </div>
              <div className="flex flex-col gap-1.5 px-2">
                <h4 className="font-bold text-foreground text-base group-hover:text-primary transition-colors">정확한 예약 속도 판단</h4>
                <p className="text-sm text-muted-foreground leading-snug break-keep">
                  감에 의존하지 마세요. 정확한 데이터 속도로 판단하여 임박 할인 등을 결정할 수 있게 도와줍니다.
                </p>
              </div>
            </div>

            {/* Sub-card 3 */}
            <div className="flex flex-col gap-4 group cursor-pointer">
              <div className="w-full aspect-[4/3] bg-white rounded-[24px] border border-border/60 shadow-sm flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:-translate-y-1 relative">
                <SubcardDonutDemo />
              </div>
              <div className="flex flex-col gap-1.5 px-2">
                <h4 className="font-bold text-foreground text-base group-hover:text-primary transition-colors">손님 유형 분석</h4>
                <p className="text-sm text-muted-foreground leading-snug break-keep">
                  채널별, 국적별 손님 비중을 한눈에 파악해 효과적인 타겟 마케팅을 진행하세요.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </SectionWrapper>
  );
};
