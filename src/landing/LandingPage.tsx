import { useEffect } from 'react';
import { NavbarSection } from './sections/NavbarSection';
import { HeroSection } from './sections/HeroSection';
import { ThreeCardSection } from './sections/ThreeCardSection';
import { TestimonialsSection } from './sections/TestimonialsSection';
import { CtaSection } from './sections/CtaSection';
import { FooterSection } from './sections/FooterSection';
import { useStore } from '../store/useStore';

/** 베타 무료 혜택 배너 — monetizationEnabled가 false일 때만 표시 (Phase 5) */
const BetaFreeBanner = () => {
  const monetizationEnabled = useStore(s => s.monetizationEnabled);
  const fetchAppSettings = useStore(s => s.fetchAppSettings);

  useEffect(() => { fetchAppSettings(); }, [fetchAppSettings]);

  if (monetizationEnabled) return null;

  return (
    <div className="w-full bg-primary text-primary-foreground text-center py-2.5 px-4 text-[13px] font-semibold mt-16">
      🎉 베타 기간 중 지금 가입하시면 평생 무료로 이용하실 수 있어요
    </div>
  );
};

const LandingPage = () => {
  useEffect(() => {
    document.body.style.paddingBottom = '0px';
    return () => { document.body.style.paddingBottom = ''; };
  }, []);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <NavbarSection />
      <BetaFreeBanner />

      {/* 1. 히어로 섹션 */}
      <HeroSection />
      
      {/* 2. 새롭게 작업한 메인 3단 교차 레이아웃 섹션 */}
      <ThreeCardSection />

      {/* 4. 고객 신뢰를 위한 후기(Testimonial) 섹션 */}
      <TestimonialsSection />

      {/* 5. 최종 행동 유도(Call to Action) 섹션 */}
      <CtaSection />
      
      {/* 6. 푸터 */}
      <FooterSection />
    </div>
  );
};

export default LandingPage;
