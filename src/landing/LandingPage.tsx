import { NavbarSection } from './sections/NavbarSection';
import { HeroSection } from './sections/HeroSection';
import { FeaturesSection } from './sections/FeaturesSection';
import { PricingSection } from './sections/PricingSection';
import { CtaSection } from './sections/CtaSection';
import { FooterSection } from './sections/FooterSection';

const LandingPage = () => (
  <div className="min-h-screen bg-background text-foreground">
    <NavbarSection />
    <HeroSection />
    <FeaturesSection />
    <PricingSection />
    <CtaSection />
    <FooterSection />
  </div>
);

export default LandingPage;
