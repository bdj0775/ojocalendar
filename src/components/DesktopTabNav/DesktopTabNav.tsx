import { useTranslation } from '../../hooks/useTranslation';
import { useStore } from '../../store/useStore';
import { ADMIN_EMAIL } from '../../config/admin';
import type { DesktopTab } from '../../types';

export type { DesktopTab };

interface DesktopTabNavProps {
  activeTab: DesktopTab;
  onTabChange: (tab: DesktopTab) => void;
}

const DesktopTabNav = ({ activeTab, onTabChange }: DesktopTabNavProps) => {
  const { language } = useTranslation();
  const ko = language === 'ko';
  const isAdmin = useStore(s => s.userProfile?.email === ADMIN_EMAIL);

  const tabs: { key: DesktopTab; label: string; beta?: boolean }[] = [
    { key: 'dashboard', label: ko ? '대시보드' : 'Dashboard' },
    { key: 'bookings', label: ko ? '예약목록' : 'Bookings' },
    // 가격 탭 — 베타. 문구·설계는 PRICING_ROADMAP.md
    { key: 'pricing', label: ko ? '가격' : 'Pricing', beta: true },
    { key: 'settings', label: ko ? '설정' : 'Settings' },
    ...(isAdmin ? [{ key: 'admin' as DesktopTab, label: ko ? '관리자' : 'Admin' }] : []),
  ];

  const tabBtnCls = (active: boolean) => `
    bg-transparent border-0 cursor-pointer
    text-[12px] font-medium tracking-wide
    transition-colors duration-200
    pb-0.5
    ${active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/70'}
  `;

  return (
    <nav className="flex items-center gap-5">
      {tabs.map(tab => (
        <button key={tab.key} onClick={() => onTabChange(tab.key)} className={`${tabBtnCls(activeTab === tab.key)} inline-flex items-center gap-1`}>
          {tab.label}
          {tab.beta && (
            // 살짝만 — 탭 글자보다 작고 연하게. 활성/비활성과 무관하게 같은 톤.
            <span className="type-micro font-bold leading-none px-1.5 py-[2px] rounded-full bg-primary/10 text-primary/80 tracking-wide">
              beta
            </span>
          )}
        </button>
      ))}
    </nav>
  );
};

export default DesktopTabNav;
