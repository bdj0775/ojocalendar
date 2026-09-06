import { SectionWrapper } from '../components/SectionWrapper';
import { CalendarCheck, LineChart, Smartphone } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * 기능 가치 요약 섹션.
 * 실제 사용자 후기가 아니므로 후기 형식(실명·별점·인용부호)으로 표기하지 않는다.
 * 실사용 후기가 쌓이면 그때 별도 후기 섹션을 만들 것.
 */
const benefits: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: CalendarCheck,
    title: '정산을 미루지 않게 됩니다',
    desc: '엑셀로 일일이 옮겨 적을 필요가 없습니다. 예약이 들어오면 그때그때 폰으로 바로 정리되니, 월말에 몰아서 씨름할 일이 없어집니다.',
  },
  {
    icon: LineChart,
    title: '비수기를 미리 준비할 수 있습니다',
    desc: '작년 같은 시기와 올해 예약 속도를 나란히 비교해 보여줍니다. 예약이 느린 달을 미리 알아채고 할인이나 프로모션을 제때 결정하세요.',
  },
  {
    icon: Smartphone,
    title: '현장에서 바로 확인합니다',
    desc: '청소 중에 문의 전화가 와도 폰만 열면 됩니다. 빈 방을 확인하고 달력을 눌러 그 자리에서 예약을 등록할 수 있습니다.',
  },
];

export const TestimonialsSection = () => {
  return (
    <SectionWrapper className="bg-muted/30 pt-24 md:pt-32 pb-16 md:pb-20 border-t border-border/40">
      <div className="max-w-7xl mx-auto px-6 flex flex-col gap-16">
        <div className="flex flex-col items-center text-center gap-5">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-4 py-1.5 text-xs md:text-sm font-semibold text-primary">
            이런 점이 좋아집니다
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-foreground tracking-tight max-w-3xl leading-[1.3] break-keep">
            숙박업 호스트가 <br className="hidden md:block" />직접 만들었습니다.
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground font-medium max-w-2xl break-keep">
            오조캘린더는 제주에서 숙박업을 운영하는 호스트가 매출관리를 위해 직접 만든 사용자 친화적 웹앱입니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {benefits.map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={b.title}
                className="bg-background p-8 md:p-10 rounded-[32px] border border-border/50 shadow-sm flex flex-col gap-6 transition-all hover:shadow-xl hover:-translate-y-2 duration-500 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Icon size={24} strokeWidth={2.2} />
                </div>
                <div className="flex flex-col gap-3">
                  <h3 className="text-xl font-bold text-foreground tracking-tight break-keep">
                    {b.title}
                  </h3>
                  <p className="text-[17px] text-muted-foreground font-medium leading-relaxed group-hover:text-foreground/80 transition-colors break-keep">
                    {b.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SectionWrapper>
  );
};
