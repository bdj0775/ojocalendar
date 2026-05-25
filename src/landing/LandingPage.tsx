import { useEffect } from 'react';
import { NavbarSection } from './sections/NavbarSection';
import { HeroSection } from './sections/HeroSection';
import { FeaturesSection } from './sections/FeaturesSection';
import { PricingSection } from './sections/PricingSection';
import { CtaSection } from './sections/CtaSection';
import { FooterSection } from './sections/FooterSection';

const LandingPage = () => {
  useEffect(() => {
    document.body.style.paddingBottom = '0px';
    return () => { document.body.style.paddingBottom = ''; };
  }, []);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <NavbarSection />
      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      <CtaSection />
      <FooterSection />
    </div>
  );
};

export default LandingPage;
