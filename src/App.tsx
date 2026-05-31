import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { useEffect, useState } from 'react';
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
import OnboardingPage from './pages/Onboarding/Onboarding';
import LandingPage from './landing/LandingPage';
import { InstallPrompt } from './components/InstallPrompt/InstallPrompt';
import { SplashScreen } from './components/Splash/SplashScreen';
import { Loader2 } from 'lucide-react';

const Spinner = ({ text }: { text: string }) => (
  <div className="flex h-screen items-center justify-center gap-2 text-muted-foreground">
    <Loader2 size={20} className="animate-spin" />
    <span className="text-sm">{text}</span>
  </div>
);

/** / 경로 전용 — 비인증 시 랜딩, 신규 유저 시 온보딩, 인증 시 앱 렌더 */
const RootGate = () => {
  const { isAuthenticated, authLoading, dataLoading, properties, onboardingCompleted } = useStore();
  if (authLoading) return <Spinner text="세션 확인 중..." />;
  if (!isAuthenticated) return <LandingPage />;
  if (dataLoading) return <Spinner text="데이터 불러오는 중..." />;
  // 신규 유저: 숙소 미등록 + 온보딩 미완료 → 온보딩으로
  if (!onboardingCompleted && properties.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }
  return <MainLayout />;
};

interface RequireAuthProps {
  children: React.ReactNode;
}

/** /new-booking 등 서브 경로 전용 — 비인증 시 /login 리다이렉트 */
const RequireAuth = ({ children }: RequireAuthProps) => {
  const { isAuthenticated, authLoading, dataLoading } = useStore();
  if (authLoading) return <Spinner text="세션 확인 중..." />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (dataLoading) return <Spinner text="데이터 불러오는 중..." />;
  return <>{children}</>;
};

/** /onboarding 전용 가드 — 비인증 시 /login, 온보딩 완료 시 / 리다이렉트 */
const OnboardingGuard = ({ children }: RequireAuthProps) => {
  const { isAuthenticated, authLoading, dataLoading, onboardingCompleted } = useStore();
  if (authLoading) return <Spinner text="세션 확인 중..." />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (dataLoading) return <Spinner text="데이터 불러오는 중..." />;
  // 온보딩 완료 플래그가 true면 앱으로 (기존 유저가 설정에서 재진입 가능)
  if (onboardingCompleted) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App = () => {
  const { initAuth, onboardingCompleted } = useStore();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  // Skip splash on OAuth callback route so auth isn't blocked
  const [splashDone, setSplashDone] = useState(
    () => window.location.pathname.startsWith('/auth'),
  );

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  if (!splashDone) {
    return (
      <ErrorBoundary>
        <SplashScreen onDone={() => setSplashDone(true)} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/onboarding" element={<OnboardingGuard><OnboardingPage /></OnboardingGuard>} />
          <Route path="/" element={<RootGate />}>
            <Route index element={isDesktop ? <DesktopOverview /> : <CalendarPage />} />
            <Route path="dashboard" element={isDesktop ? <Navigate to="/" replace /> : <DashboardPage />} />
            <Route path="bookings" element={<BookingsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="/new-booking" element={<RequireAuth><NewBookingPage /></RequireAuth>} />
        </Routes>
        <Toast />
        {/* InstallPrompt는 온보딩 완료 후에만 표시 — 가입 직후 팝업 방지 */}
        {onboardingCompleted && <InstallPrompt />}
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
