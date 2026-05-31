import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/cn';
import { CONTENT } from '../config/content';

export const NavbarSection = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-[var(--z-nav)] h-16 transition-all duration-300',
        scrolled
          ? 'bg-card/80 backdrop-blur-md border-b border-border shadow-[var(--shadow-nav)]'
          : 'bg-transparent',
      )}
    >
      <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between px-6">
        {/* 로고 */}
        <div className="flex items-center gap-2.5">
          <img src="/logo-mark.png" alt="OZO Calendar" className="h-8 w-8" />
          <span className="text-lg font-extrabold tracking-tight text-foreground">
            {CONTENT.nav.brand}
            <span className="font-light text-muted-foreground"> {CONTENT.nav.brandSub}</span>
          </span>
        </div>

        {/* 우측 액션 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/login')}
            className="hidden sm:inline-flex type-body font-semibold text-muted-foreground hover:text-foreground px-3 py-2 transition-colors"
          >
            {CONTENT.nav.loginLabel}
          </button>
          <Button size="sm" variant="primary" onClick={() => navigate('/login?mode=signup')}>
            {CONTENT.nav.ctaLabel}
          </Button>
        </div>
      </div>
    </header>
  );
};
