import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '../../context/SidebarContext';
import MobileSidebar from './MobileSidebar';

const MainLayout = () => (
  <SidebarProvider>
    <div className="min-h-[100dvh] w-full flex bg-background overflow-hidden">
      {/* 모바일 공용 사이드바 — SidebarContext로 어떤 페이지에서든 열 수 있음 */}
      <MobileSidebar />
      <main className="flex-1 min-w-0 h-[100dvh] overflow-y-auto custom-scrollbar">
        <Outlet />
      </main>
    </div>
  </SidebarProvider>
);

export default MainLayout;
