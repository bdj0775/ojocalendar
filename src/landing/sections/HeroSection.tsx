import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { FeatureCarousel } from '../../pages/Login/FeatureCarousel';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import { CONTENT } from '../config/content';

export const HeroSection = () => {
  const navigate = useNavigate();
  const { androidReady, triggerAndroid } = useInstallPrompt();

  return (
    <section className="relative w-full min-h-[100dvh] flex items-center overflow-hidden pt-16">
      {/* 배경 장식 블롭 */}
      <div className="pointer-events-none absolute -top-32 right-0 h-[min(600px,80vw)] w-[min(600px,80vw)] rounded-full bg-primary/8 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[min(400px,60vw)] w-[min(400px,60vw)] rounded-full bg-primary/5 blur-[100px]" />

      <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center lg:gap-16">

        {/* 텍스트 영역 */}
        <div className="flex flex-col gap-7">
          {/* 뱃지 */}
          <span className="inline-flex w-fit items-center rounded-full border border-primary/30 bg-primary/8 px-4 py-1.5 type-label font-semibold text-primary">
            {CONTENT.hero.badge}
          </span>

          {/* 헤드라인 */}
          <h1 className="text-[clamp(2.4rem,5vw,3.5rem)] font-extrabold leading-[1.15] tracking-[-0.03em] text-foreground">
            {CONTENT.hero.headlineLine1}
            <br />
            <span className="text-primary">{CONTENT.hero.headlineLine2}</span>
          </h1>

          {/* 태그라인 */}
          <p className="type-section-title font-medium text-muted-foreground">
            {CONTENT.hero.tagline}
          </p>

          {/* 서브카피 */}
          <p className="type-body text-muted-foreground max-w-md leading-relaxed">
            {CONTENT.hero.subCopy}
          </p>

          {/* CTA 버튼 */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              size="lg"
              variant="primary"
              onClick={() => navigate('/login?mode=signup')}
              className="text-base px-7"
            >
              {CONTENT.hero.ctaPrimary}
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={androidReady ? triggerAndroid : () => navigate('/login?mode=signup')}
              className="text-base px-7"
            >
              {CONTENT.hero.ctaSecondary}
            </Button>
          </div>
        </div>

        {/* 라이브 데모 — FeatureCarousel 재사용 */}
        <div className="relative flex items-center justify-center lg:justify-end">
          <div className="w-full max-w-[500px]">
            <FeatureCarousel />
          </div>
        </div>
      </div>
    </section>
  );
};
