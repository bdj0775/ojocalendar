import { CalendarDays, BarChart2, Smartphone, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SectionWrapper } from '../components/SectionWrapper';
import { CONTENT, type FeatureIconKey } from '../config/content';
import { cn } from '../../lib/cn';

const ICON_MAP: Record<FeatureIconKey, LucideIcon> = {
  'calendar-days': CalendarDays,
  'bar-chart-2': BarChart2,
  smartphone: Smartphone,
  'trending-up': TrendingUp,
};

export const FeaturesSection = () => (
  <SectionWrapper className="bg-background border-t border-border/60 py-24 md:py-32">
    {/* 섹션 헤더 */}
    <div className="mb-16 flex flex-col items-center gap-4 text-center px-4">
      <span className="inline-flex items-center rounded-full bg-primary/10 px-4 py-1.5 text-xs md:text-sm font-semibold text-primary">
        {CONTENT.features.sectionLabel}
      </span>
      <h2 className="text-3xl sm:text-5xl font-extrabold text-foreground tracking-tight max-w-2xl leading-[1.2]">
        {CONTENT.features.title}
      </h2>
    </div>

    {/* 다채롭고 큼직큼직한 Bento Grid 레이아웃 */}
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 max-w-6xl mx-auto px-4">
      {CONTENT.features.items.map((item, index) => {
        const Icon = ICON_MAP[item.icon];
        return (
          <div
            key={item.title}
            className={cn(
              'flex flex-col justify-between rounded-[32px] border bg-gradient-to-br from-card to-card/30',
              'p-8 md:p-10 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 relative overflow-hidden group',
              item.colSpan || 'lg:col-span-1',
              item.bgGradient
            )}
          >
            {/* 카드 배경 장식 그라데이션 블롭 */}
            <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-primary/5 blur-3xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />

            <div>
              {/* 상단 뱃지 및 아이콘 */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground/5 dark:bg-foreground/10 text-foreground shadow-sm">
                  <Icon size={24} strokeWidth={1.8} />
                </div>
                {item.badge && (
                  <span className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground bg-foreground/5 dark:bg-foreground/10 px-3 py-1 rounded-full">
                    {item.badge}
                  </span>
                )}
              </div>

              {/* 텍스트 내용 */}
              <div className="flex flex-col gap-3">
                <h3 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight">
                  {item.title}
                </h3>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>

            {/* 다채로움을 극대화하기 위한 카드 내부 미니 와이어프레임 플레이스홀더 */}
            <div className="mt-8 pt-6 border-t border-border/20 flex items-center justify-center min-h-[100px] bg-foreground/[0.02] rounded-2xl border border-dashed border-border/30 relative">
              {index === 0 && (
                /* 통합 예약 달력 미니 와이어프레임 */
                <div className="flex flex-col gap-2 w-full px-4 text-xs text-muted-foreground opacity-60">
                  <div className="flex justify-between items-center border-b border-border/20 pb-1.5">
                    <span className="font-semibold text-foreground/80">예약 채널 동기화</span>
                    <span className="text-[10px] text-emerald-500 font-bold">● 실시간</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-600 font-semibold dark:text-orange-400">Airbnb</span>
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 font-semibold dark:text-blue-400">Booking.com</span>
                    <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-600 font-semibold dark:text-green-400 font-sans">Naver</span>
                  </div>
                </div>
              )}
              {index === 1 && (
                /* 스마트 매출 분석 미니 와이어프레임 */
                <div className="flex items-end justify-around w-full px-6 h-12 text-xs">
                  <div className="w-4 bg-primary/20 h-6 rounded-t" />
                  <div className="w-4 bg-primary/40 h-8 rounded-t" />
                  <div className="w-4 bg-primary/60 h-12 rounded-t" />
                  <div className="w-4 bg-primary h-16 rounded-t relative">
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-primary font-mono">ADR↑</span>
                  </div>
                </div>
              )}
              {index === 2 && (
                /* 과거 실적 기반 점유율 예측 미니 와이어프레임 */
                <div className="w-full px-6 flex flex-col gap-1 text-[11px] text-muted-foreground opacity-70">
                  <div className="flex justify-between">
                    <span>현재 예약 점유율 (OTB)</span>
                    <span className="font-mono text-foreground font-semibold">64%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div className="bg-primary h-1.5 rounded-full" style={{ width: '64%' }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-amber-500 font-bold mt-1">
                    <span>월말 예상 점유율</span>
                    <span className="font-mono">88% (과거 패턴 기준)</span>
                  </div>
                </div>
              )}
              {index === 3 && (
                /* PWA 모바일 앱 지원 미니 와이어프레임 */
                <div className="flex gap-3 items-center justify-start w-full px-4 text-xs text-muted-foreground opacity-60">
                  <div className="w-6 h-10 border border-border/40 rounded-md bg-background flex flex-col items-center p-0.5 gap-1 shadow-sm">
                    <div className="w-full h-1 bg-muted rounded-full" />
                    <div className="w-full h-4 bg-primary/10 rounded" />
                    <div className="w-full h-1.5 bg-muted rounded" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-foreground font-semibold">홈 화면에 바로 추가</span>
                    <span className="text-[9px]">별도의 스토어 설치 없이 간편 실행</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </SectionWrapper>
);

