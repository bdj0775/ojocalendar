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

  const tabs: { key: DesktopTab; label: string }[] = [
    { key: 'dashboard', label: ko ? '대시보드' : 'Dashboard' },
    { key: 'bookings', label: ko ? '예약목록' : 'Bookings' },
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
        <button key={tab.key} onClick={() => onTabChange(tab.key)} className={tabBtnCls(activeTab === tab.key)}>
          {tab.label}
        </button>
      ))}
    </nav>
  );
};

export default DesktopTabNav;
