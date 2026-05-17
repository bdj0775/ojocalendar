import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Calendar, CalendarDays, LayoutDashboard, Settings, Plus } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { ICON_SIZES } from '../../lib/iconSizes';
import EventBarSettingsModal from '../Modals/EventBarSettingsModal';
import EventInputModal from '../Modals/EventInputModal';

/* ── Mobile bottom nav ──────────────────────────────────────── */
const mobileItemBase =
  'flex flex-col items-center justify-center flex-1 py-2 gap-1 text-muted-foreground type-micro font-semibold tracking-[0.5px] transition-all duration-200 cursor-pointer no-underline';

/* ── Desktop sidebar icon button ────────────────────────────── */
const sideIconBase =
  'w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer border-0 outline-none';
const sideIconIdle =
  'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/60';
const sideIconActive =
  'text-primary bg-primary/10 shadow-sm';

const BottomNav = () => {
  const { t } = useTranslation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEventInputOpen, setIsEventInputOpen] = useState(false);

  return (
    <>
      {/* ── Mobile bottom nav (hidden on desktop) ── */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[600px] bg-card flex justify-around pt-3 pb-5 shadow-nav z-nav lg:hidden">
        <NavLink to="/" className={({ isActive }) => `${mobileItemBase} ${isActive ? 'text-primary' : ''}`}>
          <Calendar size={ICON_SIZES.base} strokeWidth={2} className="transition-transform duration-200 hover:-translate-y-0.5" />
          <span>{t('nav.calendar').toUpperCase()}</span>
        </NavLink>
        <NavLink to="/dashboard" className={({ isActive }) => `${mobileItemBase} ${isActive ? 'text-primary' : ''}`}>
          <LayoutDashboard size={ICON_SIZES.base} strokeWidth={2} className="transition-transform duration-200 hover:-translate-y-0.5" />
          <span>{t('nav.dashboard').toUpperCase()}</span>
        </NavLink>
        <NavLink to="/bookings" className={({ isActive }) => `${mobileItemBase} ${isActive ? 'text-primary' : ''}`}>
          <CalendarDays size={ICON_SIZES.base} strokeWidth={2} className="transition-transform duration-200 hover:-translate-y-0.5" />
          <span>{t('nav.bookings').toUpperCase()}</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `${mobileItemBase} ${isActive ? 'text-primary' : ''}`}>
          <Settings size={ICON_SIZES.base} strokeWidth={2} className="transition-transform duration-200 hover:-translate-y-0.5" />
          <span>{t('nav.settings').toUpperCase()}</span>
        </NavLink>
      </nav>

      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <nav className="hidden lg:flex flex-col items-center w-14 h-screen py-5 gap-2 border-r border-border bg-card z-nav flex-shrink-0">
        {/* Calendar — navigates home (shows calendar sidebar) */}
        <NavLink
          to="/"
          className={({ isActive }) =>
            `${sideIconBase} ${isActive ? sideIconActive : sideIconIdle}`
          }
          title="달력"
        >
          <Calendar size={16} strokeWidth={1.5} />
        </NavLink>

        {/* Divider */}
        <div className="w-5 h-px bg-border/60 my-1" />

        {/* Event bar settings */}
        <button
          className={`${sideIconBase} ${sideIconIdle}`}
          onClick={() => setIsSettingsOpen(true)}
          title="이벤트바 설정"
        >
          <Settings size={16} strokeWidth={1.5} />
        </button>

        {/* Add event */}
        <button
          className={`${sideIconBase} ${sideIconIdle}`}
          onClick={() => setIsEventInputOpen(true)}
          title="이벤트 추가"
        >
          <Plus size={16} strokeWidth={1.5} />
        </button>
      </nav>

      {/* ── Modals ── */}
      {isSettingsOpen && (
        <EventBarSettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}
      {isEventInputOpen && (
        <EventInputModal onClose={() => setIsEventInputOpen(false)} />
      )}
    </>
  );
};

export default BottomNav;
