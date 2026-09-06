import { SectionWrapper } from '../components/SectionWrapper';

export const TrustedBySection = () => {
  return (
    <SectionWrapper className="bg-background py-10 md:py-16 border-b border-border/40 overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background z-10 pointer-events-none" />
      <div className="flex flex-col items-center gap-8 max-w-7xl mx-auto px-6 relative z-0">
        <p className="text-[11px] md:text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase text-center">
          신뢰받는 플랫폼 연동
        </p>
        <div className="flex flex-wrap justify-center items-center gap-10 md:gap-20 opacity-50 grayscale hover:grayscale-0 transition-all duration-700">
          <div className="text-2xl font-black tracking-tighter text-foreground">Airbnb</div>
          <div className="text-2xl font-black tracking-tighter text-blue-600">Booking.com</div>
          <div className="text-2xl font-black tracking-tighter text-foreground">Agoda</div>
          <div className="text-2xl font-black tracking-tighter text-green-500">NAVER</div>
          <div className="text-2xl font-black tracking-tighter text-foreground">Expedia</div>
        </div>
      </div>
    </SectionWrapper>
  );
};
