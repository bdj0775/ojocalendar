import { useTranslation } from '../../hooks/useTranslation';
import type { DesktopTab } from '../../types';

export type { DesktopTab };

interface DesktopTabNavProps {
  activeTab: DesktopTab;
  onTabChange: (tab: DesktopTab) => void;
}

const DesktopTabNav = ({ activeTab, onTabChange }: DesktopTabNavProps) => {
  const { language } = useTranslation();
  const ko = language === 'ko';

  const tabs: { key: DesktopTab; label: string }[] = [
    { key: 'dashboard', label: ko ? '대시보드' : 'Dashboard' },
    { key: 'bookings', label: ko ? '예약목록' : 'Bookings' },
    { key: 'settings', label: ko ? '설정' : 'Settings' },
  ];

  return (
    <nav className="flex items-center gap-5">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`
            bg-transparent border-0 cursor-pointer
            text-[12px] font-medium tracking-wide
            transition-colors duration-200
            pb-0.5
            ${activeTab === tab.key
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground/70'
            }
          `}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
};

export default DesktopTabNav;
