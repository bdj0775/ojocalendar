import { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, Sun, Moon } from 'lucide-react';
import CalendarPage from '../Calendar/Calendar';
import DesktopDashboard from '../DesktopDashboard/DesktopDashboard';
import DesktopBookings from '../DesktopBookings/DesktopBookings';
import DesktopSettings from '../DesktopSettings/DesktopSettings';
import DesktopTabNav from '../../components/DesktopTabNav/DesktopTabNav';
import type { DesktopTab } from '../../types';
import { useStore } from '../../store/useStore';


const DesktopOverview = () => {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const [isDark, setIsDark] = useState(false);

  const { selectedCalendarDate, activeDesktopTab: activeTab, setActiveDesktopTab: setActiveTab } = useStore();
  useEffect(() => {
    if (selectedCalendarDate) setActiveTab('bookings');
  }, [selectedCalendarDate, setActiveTab]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const startDrag = (e: React.MouseEvent) => {
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const onDrag = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !sidebarRef.current) return;
    requestAnimationFrame(() => {
      if (!isDragging.current || !sidebarRef.current) return;
      let newWidth = e.clientX - 56;
      if (newWidth < 280) newWidth = 280;
      if (newWidth > 800) newWidth = 800;
      sidebarRef.current.style.width = `${newWidth}px`;
    });
  }, []);

  const stopDrag = useCallback(() => {
    isDragging.current = false;
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
    return () => {
      document.removeEventListener('mousemove', onDrag);
      document.removeEventListener('mouseup', stopDrag);
    };
  }, [onDrag, stopDrag]);

  const themeToggleCls = 'w-7 h-7 rounded-full bg-muted/50 border border-border/50 flex items-center justify-center cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground transition-colors';
  const headerBtnCls = 'w-7 h-7 rounded-full bg-muted/50 border border-border/50 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors';

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar Container */}
      <div
        ref={sidebarRef}
        className="bg-card overflow-y-auto custom-scrollbar [&>div]:max-w-full [&>div]:shadow-none [&>div]:min-h-0 border-r border-border"
        style={{ width: 380, flexShrink: 0 }}
      >
        <CalendarPage />
      </div>

      {/* Resizer Handle */}
      <div
        className="relative group cursor-col-resize z-nav flex-shrink-0"
        style={{ width: '12px', marginLeft: '-6px' }}
        onMouseDown={startDrag}
      >
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1px] bg-border group-hover:bg-primary group-hover:w-[3px] transition-all" />
        <div className="absolute inset-y-0 left-0 w-full bg-transparent" />
      </div>

      {/* Main Content Container */}
      <div className="flex-1 min-w-0 h-full overflow-hidden [&>div]:max-w-full [&>div]:shadow-none [&>div]:min-h-0 [&>div]:bg-transparent">
        {activeTab === 'dashboard' ? (
          <DesktopDashboard
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isDark={isDark}
            onToggleDark={() => setIsDark(!isDark)}
          />
        ) : (
          <div className="h-full flex flex-col overflow-hidden">
            {/* px-5 pt-5 mirrors DesktopDashboard's p-5 container so h-8 header lands in the exact same spot */}
            <div className="px-5 pt-5 flex-shrink-0">
              <header className="flex items-center justify-between mb-4 h-8">
                <div className="flex items-center gap-3">
                  <h1 className="text-base font-bold text-slate-800 dark:text-slate-200 tracking-tight m-0 ml-2">
                    {activeTab === 'bookings' ? '예약목록' : '설정'}
                  </h1>
                </div>
                <div className="flex items-center gap-5">
                  <DesktopTabNav activeTab={activeTab} onTabChange={setActiveTab} />
                  <div className="w-px h-4 bg-border/60" />
                  <div className="flex items-center gap-2">
                    <button
                      className={themeToggleCls}
                      onClick={() => setIsDark(!isDark)}
                      title={isDark ? '라이트 모드' : '다크 모드'}
                    >
                      {isDark ? <Sun size={14} /> : <Moon size={14} />}
                    </button>
                    <button className={headerBtnCls}><Bell size={14} /></button>
                  </div>
                </div>
              </header>
            </div>
            <div className="flex-1 overflow-hidden">
              {activeTab === 'bookings' && <DesktopBookings />}
              {activeTab === 'settings' && <DesktopSettings />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DesktopOverview;
