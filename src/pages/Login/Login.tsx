import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, signup } = useStore();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    try {
      if (isSignUp) {
        await signup(email, password, name || 'Host');
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

  const inputCls =
    'w-full px-4 py-3.5 rounded-xl border border-border type-body outline-none transition-all bg-muted focus:border-primary focus:bg-card focus:shadow-[0_0_0_4px_var(--primary-ring)]';

  return (
    <div className="flex min-h-screen bg-card">
      {/* Left pane — hidden on mobile */}
      <div className="hidden md:flex flex-1 bg-background flex-col p-16 relative overflow-hidden">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-card rounded-2xl flex items-center justify-center shadow-[0_4px_12px_var(--primary-glow-sm)]">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" color="var(--primary)">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">Ojorok Calendar</h1>
        </div>
        <p className="type-body text-muted-foreground max-w-xs leading-relaxed">Manage your property bookings elegantly.</p>

        <div className="flex-1 flex items-center justify-center mt-10 relative">
          <div className="absolute w-[300px] h-[300px] bg-primary-300 rounded-full blur-[60px] opacity-50 top-[10%] left-[10%] animate-[float_8s_ease-in-out_infinite]" />
          <div className="absolute w-[250px] h-[250px] bg-primary-200 rounded-full blur-[60px] opacity-50 bottom-[20%] right-[10%] animate-[float_8s_ease-in-out_infinite] [animation-delay:-4s]" />
          <div className="relative z-10 w-[340px] h-[220px] bg-white/40 backdrop-blur-xl border border-white/60 rounded-3xl p-8 flex flex-col gap-4 shadow-card-lg">
            <div className="h-3 bg-white/80 rounded-full w-full" />
            <div className="h-3 bg-white/80 rounded-full w-[60%]" />
            <div className="h-3 bg-white/80 rounded-full w-[80%]" />
          </div>
        </div>
      </div>

      {/* Right pane */}
      <div className="flex-1 flex items-center justify-center p-10 bg-card">
        <div className="w-full max-w-[400px]">
          <div className="mb-10">
            <h2 className="type-display text-foreground mb-2">
              {isSignUp ? 'Create an Account' : 'Welcome Back'}
            </h2>
            <p className="type-body text-muted-foreground">
              {isSignUp ? 'Sign up to manage your properties.' : 'Log in to your host dashboard.'}
            </p>
          </div>

          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            {signupSuccess && (
              <div className="text-emerald-600 type-body bg-emerald-50 px-4 py-3 rounded-xl">
                회원가입 성공! 메일을 확인하시거나 바로 로그인하세요.
              </div>
            )}
            {errorMsg && <div className="text-destructive type-body">{errorMsg}</div>}

            {isSignUp && (
              <div className="flex flex-col gap-2">
                <label className="type-label font-semibold text-muted-foreground">Full Name</label>
                <input type="text" className={inputCls} placeholder="e.g. Alex Johnson" value={name} onChange={e => setName(e.target.value)} required={isSignUp} />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="type-label font-semibold text-muted-foreground">Email Address</label>
              <input type="email" className={inputCls} placeholder="host@ojorok.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-baseline">
                <label className="type-label font-semibold text-muted-foreground">Password</label>
                <button type="button" className="type-label font-semibold text-primary" onClick={() => setForgotMsg('비밀번호 찾기는 준비중입니다.')}>
                  Forgot?
                </button>
              </div>
              <input type="password" className={inputCls} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
              {forgotMsg && <p className="text-xs text-muted-foreground">{forgotMsg}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-3 w-full py-4 rounded-xl bg-primary text-primary-foreground type-body font-semibold transition-all hover:bg-primary-700 active:scale-[0.98] disabled:bg-border disabled:cursor-not-allowed"
            >
              {isLoading ? (isSignUp ? 'Signing up...' : 'Signing in...') : (isSignUp ? 'Sign Up' : 'Sign In')}
            </button>
          </form>

          <p className="mt-8 text-center type-body text-muted-foreground">
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <button type="button" className="text-primary font-semibold" onClick={() => setIsSignUp(!isSignUp)}>
              {isSignUp ? 'Log in' : 'Sign up (Free)'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
