import { NavLink } from 'react-router-dom';
import { X, Calendar, LayoutDashboard, CalendarDays, Settings } from 'lucide-react';
import { useSidebar } from '../../context/SidebarContext';
import { useTranslation } from '../../hooks/useTranslation';

const NAV_ITEMS = [
  { to: '/',          end: true,  Icon: Calendar,        labelKo: '달력',     labelEn: 'Calendar'  },
  { to: '/dashboard', end: false, Icon: LayoutDashboard, labelKo: '대시보드', labelEn: 'Dashboard' },
  { to: '/bookings',  end: false, Icon: CalendarDays,    labelKo: '예약 목록', labelEn: 'Bookings' },
  { to: '/settings',  end: false, Icon: Settings,        labelKo: '설정',     labelEn: 'Settings'  },
];

const MobileSidebar = () => {
  const { isOpen, close } = useSidebar();
  const { language } = useTranslation();

  return (
    /* lg:hidden — 데스크톱에서는 기존 사이드바 네비게이션 사용 */
    <div
      className={`fixed inset-0 z-[100] flex lg:hidden transition-opacity duration-300 ${
        isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      {/* 딤 배경 */}
      <div className="absolute inset-0 bg-black/40" onClick={close} />

      {/* 드로어 패널 */}
      <div
        className={`relative flex flex-col w-72 h-full bg-card shadow-xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* 상단 앱 이름 + 닫기 */}
        <div className="flex items-center justify-between px-5 pt-12 pb-5 border-b border-border/50">
          <div>
            <p className="text-[18px] font-extrabold text-foreground tracking-tight">오조록</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">숙소 관리</p>
          </div>
          <button
            onClick={close}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted text-muted-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* 네비게이션 링크 */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          {NAV_ITEMS.map(({ to, end, Icon, labelKo, labelEn }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={close}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-4 py-3.5 rounded-xl font-semibold text-[14px] transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                  <span>{language === 'ko' ? labelKo : labelEn}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* 하단 버전 정보 */}
        <div className="px-5 py-4 border-t border-border/40">
          <p className="text-[11px] text-muted-foreground/60">v1.0</p>
        </div>
      </div>
    </div>
  );
};

export default MobileSidebar;
