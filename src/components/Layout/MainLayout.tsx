import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

const MainLayout = () => {
  return (
    <div className="min-h-screen w-full flex bg-background overflow-hidden">
      <BottomNav />
      <main className="flex-1 min-w-0 h-screen overflow-y-auto custom-scrollbar">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
