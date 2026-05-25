import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { useEffect } from 'react';
import { useMediaQuery } from './hooks/useMediaQuery';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import Toast from './components/Toast/Toast';
import LoginPage from './pages/Login/Login';
import AuthCallback from './pages/Auth/AuthCallback';
import MainLayout from './components/Layout/MainLayout';
import CalendarPage from './pages/Calendar/Calendar';
import DashboardPage from './pages/Dashboard/Dashboard';
import BookingsPage from './pages/Bookings/Bookings';
import SettingsPage from './pages/Settings/Settings';
import NewBookingPage from './pages/NewBooking/NewBooking';
import DesktopOverview from './pages/DesktopOverview/DesktopOverview';
import { Loader2 } from 'lucide-react';

interface RequireAuthProps {
  children: React.ReactNode;
}

const RequireAuth = ({ children }: RequireAuthProps) => {
  const { isAuthenticated, authLoading, dataLoading } = useStore();

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center gap-2 text-muted-foreground">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm">세션 확인 중...</span>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (dataLoading) {
    return (
      <div className="flex h-screen items-center justify-center gap-2 text-muted-foreground">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm">데이터 불러오는 중...</span>
      </div>
    );
  }

  return <>{children}</>;
};

const App = () => {
  const { initAuth } = useStore();
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/" element={<RequireAuth><MainLayout /></RequireAuth>}>
            <Route index element={isDesktop ? <DesktopOverview /> : <CalendarPage />} />
            <Route path="dashboard" element={isDesktop ? <Navigate to="/" replace /> : <DashboardPage />} />
            <Route path="bookings" element={<BookingsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="/new-booking" element={<RequireAuth><NewBookingPage /></RequireAuth>} />
        </Routes>
        <Toast />
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
