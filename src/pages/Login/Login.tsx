import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { FeatureCarousel } from './FeatureCarousel';

// ── SVG 로고 ─────────────────────────────────────────────────────
const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.7 2.3 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13 17.8 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v8.7h12.4c-.5 2.9-2.2 5.4-4.7 7l7.3 5.7c4.3-3.9 6.7-9.7 7.1-16.8z"/>
    <path fill="#FBBC05" d="M10.6 28.6A14.7 14.7 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.9-6.1A23.9 23.9 0 0 0 0 24c0 3.8.9 7.4 2.5 10.7l8.1-6.1z"/>
    <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.3-5.7c-2 1.4-4.6 2.2-7.9 2.2-6.2 0-11.5-4.2-13.4-9.9l-8.1 6.1C6.5 42.5 14.6 48 24 48z"/>
  </svg>
);

const KakaoLogo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#000000">
    <path d="M12 3C6.48 3 2 6.6 2 11.1c0 2.9 1.9 5.4 4.8 6.9l-1.2 4.5 5.2-3.4c.4.1.8.1 1.2.1 5.52 0 10-3.6 10-8.1S17.52 3 12 3z"/>
  </svg>
);

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, signup, signInWithGoogle, signInWithKakao } = useStore();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'kakao' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    try {
      if (isSignUp) {
        await signup(email, password, name || '');
        setSignupSuccess(true);
        setIsSignUp(false);
      } else {
        await login(email, password);
        navigate('/');
      }
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setOauthLoading('google');
    setErrorMsg('');
    try {
      await signInWithGoogle();
    } catch (err) {
      const msg = (err as Error).message;
      setErrorMsg(msg || 'Google 로그인 중 오류가 발생했습니다.');
      setOauthLoading(null);
    }
  };

  const handleKakao = async () => {
    setOauthLoading('kakao');
    setErrorMsg('');
    try {
      await signInWithKakao();
    } catch (err) {
      const msg = (err as Error).message;
      setErrorMsg(msg || '카카오 로그인 중 오류가 발생했습니다.');
      setOauthLoading(null);
    }
  };

  const inputCls =
    'w-full px-4 py-3.5 rounded-xl border border-border type-body outline-none transition-all bg-muted focus:border-primary focus:bg-card focus:shadow-[0_0_0_4px_var(--primary-ring)]';

  return (
    <div className="flex min-h-screen bg-card">
      {/* Left pane — 데스크탑에서만 */}
      <div className="hidden md:flex flex-1 bg-background flex-col p-16 relative overflow-hidden">
        <div className="flex items-center gap-3 mb-6">
          <img src="/logo-mark.png" alt="OZO Calendar" className="w-11 h-11" />
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
            OZO <span className="font-light text-muted-foreground">Calendar</span>
          </h1>
        </div>
        <p className="type-body text-muted-foreground max-w-xs leading-relaxed">Manage your property bookings elegantly.</p>

        <div className="flex-1 flex items-center justify-center mt-10 relative">
          <div className="absolute w-[300px] h-[300px] bg-primary-300 rounded-full blur-[60px] opacity-50 top-[10%] left-[10%] animate-[float_8s_ease-in-out_infinite]" />
          <div className="absolute w-[250px] h-[250px] bg-primary-200 rounded-full blur-[60px] opacity-50 bottom-[20%] right-[10%] animate-[float_8s_ease-in-out_infinite] [animation-delay:-4s]" />
          <FeatureCarousel />
        </div>
      </div>

      {/* Right pane */}
      <div className="flex-1 flex items-center justify-center p-8 bg-card">
        <div className="w-full max-w-[400px]">
          <div className="mb-8">
            <h2 className="type-display text-foreground mb-2">
              {isSignUp ? '계정 만들기' : '다시 오셨군요'}
            </h2>
            <p className="type-body text-muted-foreground">
              {isSignUp ? '숙소를 관리할 계정을 만들어 보세요.' : '로그인하여 대시보드를 확인하세요.'}
            </p>
          </div>

          {/* ── 소셜 로그인 ── */}
          <div className="flex flex-col gap-3 mb-6">
            <button
              type="button"
              disabled={!!oauthLoading}
              onClick={handleGoogle}
              className="flex items-center justify-center gap-3 w-full py-3.5 rounded-xl border border-border bg-card hover:bg-muted transition-colors font-semibold text-[14px] text-foreground disabled:opacity-50"
            >
              {oauthLoading === 'google'
                ? <span className="w-[18px] h-[18px] rounded-full border-2 border-muted-foreground/30 border-t-primary animate-spin" />
                : <GoogleLogo />}
              Google로 {isSignUp ? '가입' : '로그인'}
            </button>

            <button
              type="button"
              disabled={!!oauthLoading}
              onClick={handleKakao}
              className="flex items-center justify-center gap-3 w-full py-3.5 rounded-xl font-semibold text-[14px] transition-colors disabled:opacity-50"
              style={{ background: '#FEE500', color: '#191919' }}
            >
              {oauthLoading === 'kakao'
                ? <span className="w-[18px] h-[18px] rounded-full border-2 border-black/20 border-t-black/60 animate-spin" />
                : <KakaoLogo />}
              카카오로 {isSignUp ? '가입' : '로그인'}
            </button>
          </div>

          {/* ── 구분선 ── */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[12px] text-muted-foreground font-medium">또는 이메일로</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* ── 이메일/비밀번호 폼 ── */}
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            {signupSuccess && (
              <div className="text-emerald-600 type-body bg-emerald-50 px-4 py-3 rounded-xl">
                가입 완료! 인증 메일을 확인하거나 바로 로그인하세요.
              </div>
            )}
            {errorMsg && <div className="text-destructive type-body">{errorMsg}</div>}

            {isSignUp && (
              <div className="flex flex-col gap-2">
                <label className="type-label font-semibold text-muted-foreground">이름</label>
                <input
                  type="text"
                  className={inputCls}
                  placeholder="이름"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required={isSignUp}
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="type-label font-semibold text-muted-foreground">이메일</label>
              <input
                type="email"
                className={inputCls}
                placeholder="host@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-baseline">
                <label className="type-label font-semibold text-muted-foreground">비밀번호</label>
                <button
                  type="button"
                  className="type-label font-semibold text-primary"
                  onClick={() => setForgotMsg('비밀번호 찾기는 준비중입니다.')}
                >
                  찾기
                </button>
              </div>
              <input
                type="password"
                className={inputCls}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              {forgotMsg && <p className="text-xs text-muted-foreground">{forgotMsg}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-1 w-full py-4 rounded-xl bg-primary text-primary-foreground type-body font-semibold transition-all hover:bg-primary-700 active:scale-[0.98] disabled:bg-border disabled:cursor-not-allowed"
            >
              {isLoading
                ? (isSignUp ? '가입 중...' : '로그인 중...')
                : (isSignUp ? '가입하기' : '로그인')}
            </button>
          </form>

          <p className="mt-6 text-center type-body text-muted-foreground">
            {isSignUp ? '이미 계정이 있으신가요? ' : '아직 계정이 없으신가요? '}
            <button type="button" className="text-primary font-semibold" onClick={() => { setIsSignUp(!isSignUp); setErrorMsg(''); }}>
              {isSignUp ? '로그인' : '무료로 시작하기'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
