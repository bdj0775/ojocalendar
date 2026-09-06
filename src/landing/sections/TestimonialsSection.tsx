import { SectionWrapper } from '../components/SectionWrapper';
import { Star } from 'lucide-react';

const testimonials = [
  {
    quote: "원래 엑셀로 일일이 정리하느라 시간이 오래 걸려 자꾸 정산을 미루게 됐는데, 오조캘린더를 쓰면서부터는 예약이 들어올 때마다 폰으로 그때그때 바로 정리할 수 있게 되었어요. 덕분에 월말 정산 스트레스가 완전히 사라졌습니다.",
    author: "강성민",
    role: "제주 애월 독채 펜션 운영"
  },
  {
    quote: "제주도 특성상 비수기에 방 비는 게 제일 스트레스였거든요. 작년 데이터랑 올해 페이스 차트 비교해보면서 '이번 달은 예약이 조금 느리구나' 판단하고 바로 연박 할인 때렸더니 비수기에도 거의 만실 채웠습니다.",
    author: "이유진",
    role: "서귀포 풀빌라 호스트"
  },
  {
    quote: "앱이 진짜 가볍고 직관적이라 핸드폰으로 관리하기 너무 좋아요. 청소하다가도 손님한테 전화 오면 바로 밖에서 폰 열어서 빈 방 확인하고 달력 꾹 눌러서 예약 등록하는 게 제일 맘에 듭니다.",
    author: "박준호",
    role: "구좌 감성 숙소 운영"
  }
];

export const TestimonialsSection = () => {
  return (
    <SectionWrapper className="bg-muted/30 py-24 md:py-32 border-t border-border/40">
      <div className="max-w-7xl mx-auto px-6 flex flex-col gap-16">
        <div className="flex flex-col items-center text-center gap-5">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-4 py-1.5 text-xs md:text-sm font-semibold text-primary">
            실제 사용 후기
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-foreground tracking-tight max-w-3xl leading-[1.3] break-keep">
            데이터로 판단하고 <br className="hidden md:block" />예약률을 높일 수 있었어요
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground font-medium max-w-2xl break-keep">
            오조캘린더는 제주도에서 직접 숙박을 운영하는 호스트가 매출관리를 위해 만든 사용자 친화적 웹앱입니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, idx) => (
            <div key={idx} className="bg-background p-8 md:p-10 rounded-[32px] border border-border/50 shadow-sm flex flex-col justify-between gap-8 transition-all hover:shadow-xl hover:-translate-y-2 duration-500 group">
              <div className="flex flex-col gap-6">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} size={20} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-[17px] text-foreground/90 font-medium leading-relaxed group-hover:text-foreground transition-colors break-keep">
                  "{t.quote}"
                </p>
              </div>
              <div className="flex items-center gap-4 pt-6 border-t border-border/60">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center font-bold text-primary text-lg">
                  {t.author[0]}
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-foreground">{t.author}</span>
                  <span className="text-sm text-muted-foreground">{t.role}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
};
