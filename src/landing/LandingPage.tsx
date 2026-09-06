import { useEffect } from 'react';
import { NavbarSection } from './sections/NavbarSection';
import { HeroSection } from './sections/HeroSection';
import { ThreeCardSection } from './sections/ThreeCardSection';
import { TestimonialsSection } from './sections/TestimonialsSection';
import { PricingSection } from './sections/PricingSection';
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

      {/* 1. 히어로 */}
      <HeroSection />

      {/* 2. 핵심 기능 3단 교차 레이아웃 (달력 / 대시보드 / 모바일) */}
      <ThreeCardSection />

      {/* 3. 기능 가치 요약 */}
      <TestimonialsSection />

      {/* 4. 요금제 — 베타 무료 안내 */}
      <PricingSection />

      {/* 5. 최종 행동 유도(CTA) */}
      <CtaSection />

      {/* 6. 푸터 */}
      <FooterSection />
    </div>
  );
};

export default LandingPage;
