import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { supabase } from '../../services/supabaseClient';
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

// 화면 모드
type Mode = 'login' | 'signup' | 'forgot';

const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, signup, signInWithGoogle, signInWithKakao } = useStore();

  // ?mode=signup 쿼리파라미터로 자동 회원가입 탭 선택
  const [mode, setMode] = useState<Mode>(
    searchParams.get('mode') === 'signup' ? 'signup' : 'login',
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'kakao' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [signupDone, setSignupDone] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const resetFields = () => { setEmail(''); setPassword(''); setName(''); setErrorMsg(''); };

  const switchMode = (next: Mode) => { setMode(next); resetFields(); };

  // ── 이메일 로그인 / 회원가입 ──────────────────────────────────
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    try {
      if (mode === 'signup') {
        await signup(email, password, name || '');
        setSignupDone(true);
      } else {
        await login(email, password);
        navigate('/');
      }
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
        setErrorMsg('이메일 또는 비밀번호가 올바르지 않습니다.');
      } else if (msg.includes('Email not confirmed')) {
        setErrorMsg('이메일 인증이 완료되지 않았습니다. 받은 편지함을 확인해주세요.');
      } else if (msg.includes('User already registered')) {
        setErrorMsg('이미 가입된 이메일입니다. 로그인해 주세요.');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── 비밀번호 재설정 ───────────────────────────────────────────
  const handleForgot = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (error) throw error;
      setResetDone(true);
    } catch (err) {
      setErrorMsg((err as Error).message || '재설정 메일 전송에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── OAuth ─────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setOauthLoading('google'); setErrorMsg('');
    try { await signInWithGoogle(); }
    catch (err) {
      setErrorMsg((err as Error).message || 'Google 로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      setOauthLoading(null);
    }
  };

  const handleKakao = async () => {
    setOauthLoading('kakao'); setErrorMsg('');
    try { await signInWithKakao(); }
    catch (err) {
      setErrorMsg((err as Error).message || '카카오 로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      setOauthLoading(null);
    }
  };

  const inputCls =
    'w-full px-4 py-3.5 rounded-xl border border-border type-body outline-none transition-all bg-muted focus:border-primary focus:bg-card focus:shadow-[0_0_0_4px_var(--primary-ring)]';

  // ── 회원가입 완료 화면 ────────────────────────────────────────
  if (signupDone) {
    return (
      <div className="flex min-h-screen bg-card items-center justify-center p-8">
        <div className="w-full max-w-[400px] flex flex-col gap-6 text-center">
          <div className="flex flex-col gap-2">
            <h2 className="type-display text-foreground">인증 메일을 보냈어요</h2>
            <p className="type-body text-muted-foreground">
              <span className="font-semibold text-foreground">{email}</span>로 인증 링크를 보냈습니다.
              <br />받은 편지함을 확인하고 링크를 클릭해 가입을 완료해주세요.
            </p>
          </div>
          <div className="bg-muted/60 rounded-2xl px-5 py-4 text-left flex flex-col gap-1.5">
            <p className="text-[12px] text-muted-foreground">메일이 오지 않았나요?</p>
            <p className="text-[12px] text-muted-foreground">· 스팸 폴더를 확인해보세요</p>
            <p className="text-[12px] text-muted-foreground">· 1~2분 정도 기다려보세요</p>
          </div>
          <button
            className="type-body font-semibold text-primary"
            onClick={() => { setSignupDone(false); switchMode('login'); }}
          >
            로그인 화면으로
          </button>
        </div>
      </div>
    );
  }

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

          {/* ── 비밀번호 재설정 모드 ── */}
          {mode === 'forgot' && (
            <>
              <div className="mb-8">
                <h2 className="type-display text-foreground mb-2">비밀번호 재설정</h2>
                <p className="type-body text-muted-foreground">
                  {resetDone
                    ? '재설정 링크를 이메일로 보냈습니다. 받은 편지함을 확인해주세요.'
                    : '가입한 이메일을 입력하면 재설정 링크를 보내드립니다.'}
                </p>
              </div>

              {!resetDone ? (
                <form className="flex flex-col gap-5" onSubmit={handleForgot}>
                  {errorMsg && <p className="text-destructive type-body">{errorMsg}</p>}
                  <div className="flex flex-col gap-2">
                    <label className="type-label font-semibold text-muted-foreground">이메일</label>
                    <input type="email" className={inputCls} placeholder="host@example.com" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
                  </div>
                  <button type="submit" disabled={isLoading} className="mt-1 w-full py-4 rounded-xl bg-primary text-primary-foreground type-body font-semibold transition-all hover:brightness-95 active:scale-[0.98] disabled:opacity-40">
                    {isLoading ? '전송 중...' : '재설정 링크 보내기'}
                  </button>
                </form>
              ) : (
                <div className="bg-muted/60 rounded-2xl px-5 py-4 flex flex-col gap-1.5">
                  <p className="text-[12px] text-muted-foreground">메일이 오지 않았나요?</p>
                  <p className="text-[12px] text-muted-foreground">· 스팸 폴더를 확인해보세요</p>
                  <p className="text-[12px] text-muted-foreground">· 1~2분 정도 기다려보세요</p>
                </div>
              )}

              <p className="mt-6 text-center type-body text-muted-foreground">
                <button type="button" className="text-primary font-semibold" onClick={() => { setResetDone(false); switchMode('login'); }}>
                  로그인으로 돌아가기
                </button>
              </p>
            </>
          )}

          {/* ── 로그인 / 회원가입 모드 ── */}
          {mode !== 'forgot' && (
            <>
              <div className="mb-8">
                <h2 className="type-display text-foreground mb-2">
                  {mode === 'signup' ? '계정 만들기' : '다시 오셨군요'}
                </h2>
                <p className="type-body text-muted-foreground">
                  {mode === 'signup' ? '숙소를 관리할 계정을 만들어 보세요.' : '로그인하여 대시보드를 확인하세요.'}
                </p>
              </div>

              {/* 소셜 로그인 */}
              <div className="flex flex-col gap-3 mb-6">
                <button
                  type="button" disabled={!!oauthLoading} onClick={handleGoogle}
                  className="flex items-center justify-center gap-3 w-full py-3.5 rounded-xl border border-border bg-card hover:bg-muted transition-colors font-semibold text-[14px] text-foreground disabled:opacity-50"
                >
                  {oauthLoading === 'google'
                    ? <span className="w-[18px] h-[18px] rounded-full border-2 border-muted-foreground/30 border-t-primary animate-spin" />
                    : <GoogleLogo />}
                  Google로 {mode === 'signup' ? '가입' : '로그인'}
                </button>
                <button
                  type="button" disabled={!!oauthLoading} onClick={handleKakao}
                  className="flex items-center justify-center gap-3 w-full py-3.5 rounded-xl font-semibold text-[14px] transition-colors disabled:opacity-50"
                  style={{ background: '#FEE500', color: '#191919' }}
                >
                  {oauthLoading === 'kakao'
                    ? <span className="w-[18px] h-[18px] rounded-full border-2 border-black/20 border-t-black/60 animate-spin" />
                    : <KakaoLogo />}
                  카카오로 {mode === 'signup' ? '가입' : '로그인'}
                </button>
              </div>

              {/* 구분선 */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[12px] text-muted-foreground font-medium">또는 이메일로</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* 이메일 폼 */}
              <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
                {errorMsg && <p className="text-destructive type-body">{errorMsg}</p>}

                {mode === 'signup' && (
                  <div className="flex flex-col gap-2">
                    <label className="type-label font-semibold text-muted-foreground">이름</label>
                    <input type="text" className={inputCls} placeholder="이름" value={name} onChange={e => setName(e.target.value)} required={mode === 'signup'} />
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <label className="type-label font-semibold text-muted-foreground">이메일</label>
                  <input type="email" className={inputCls} placeholder="host@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-baseline">
                    <label className="type-label font-semibold text-muted-foreground">비밀번호</label>
                    {mode === 'login' && (
                      <button type="button" className="type-label font-semibold text-primary" onClick={() => switchMode('forgot')}>
                        비밀번호 찾기
                      </button>
                    )}
                  </div>
                  <input
                    type="password" className={inputCls} placeholder="••••••••"
                    value={password} onChange={e => setPassword(e.target.value)}
                    required minLength={mode === 'signup' ? 6 : undefined}
                  />
                  {mode === 'signup' && (
                    <p className="text-[11px] text-muted-foreground">6자 이상 입력해주세요.</p>
                  )}
                </div>

                <button
                  type="submit" disabled={isLoading}
                  className="mt-1 w-full py-4 rounded-xl bg-primary text-primary-foreground type-body font-semibold transition-all hover:brightness-95 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isLoading
                    ? (mode === 'signup' ? '가입 중...' : '로그인 중...')
                    : (mode === 'signup' ? '가입하기' : '로그인')}
                </button>
              </form>

              <p className="mt-6 text-center type-body text-muted-foreground">
                {mode === 'signup' ? '이미 계정이 있으신가요? ' : '아직 계정이 없으신가요? '}
                <button
                  type="button" className="text-primary font-semibold"
                  onClick={() => switchMode(mode === 'signup' ? 'login' : 'signup')}
                >
                  {mode === 'signup' ? '로그인' : '무료로 시작하기'}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
