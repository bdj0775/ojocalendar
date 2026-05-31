import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '../../context/SidebarContext';
import MobileSidebar from './MobileSidebar';
import { useStore } from '../../store/useStore';
import { useTranslation } from '../../hooks/useTranslation';

const WelcomeHint = () => {
  const { showWelcomeHint, dismissWelcomeHint, settings } = useStore();
  const { language } = useTranslation();
  const ko = language === 'ko';

  if (!showWelcomeHint) return null;

  const name = settings.profileName ? `, ${settings.profileName}` : '';

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] flex justify-center px-4 pt-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-sm bg-card border border-border rounded-2xl shadow-lg p-4 flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold text-foreground">
            {ko ? `환영해요${name}!` : `Welcome${name}!`}
          </p>
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            {ko
              ? '날짜를 탭하면 예약을 추가할 수 있어요. 설정에서 채널 연결도 해보세요.'
              : 'Tap a date to add a booking. Connect channels in settings.'}
          </p>
        </div>
        <button
          onClick={dismissWelcomeHint}
          className="shrink-0 text-[11px] text-muted-foreground/60 hover:text-foreground transition-colors mt-0.5"
        >
          {ko ? '닫기' : 'Close'}
        </button>
      </div>
    </div>
  );
};

const MainLayout = () => (
  <SidebarProvider>
    <div className="min-h-[100dvh] w-full flex bg-background overflow-hidden">
      <MobileSidebar />
      <main className="flex-1 min-w-0 h-[100dvh] overflow-y-auto overflow-x-hidden custom-scrollbar">
        <WelcomeHint />
        <Outlet />
      </main>
    </div>
  </SidebarProvider>
);

export default MainLayout;
