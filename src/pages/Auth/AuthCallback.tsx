import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useStore } from '../../store/useStore';

const AuthCallback = () => {
  const isAuthenticated = useStore(state => state.isAuthenticated);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // One-time setup: check for errors, validate the callback URL
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.substring(1));

    const oauthError = query.get('error') || hash.get('error');
    if (oauthError) {
      const desc = query.get('error_description') ?? hash.get('error_description') ?? oauthError;
      setErrorMsg(desc);
      setTimeout(() => { window.location.replace('/login'); }, 2500);
      return;
    }

    // PKCE flow: ?code=... | Implicit flow: #access_token=...
    const hasCode = !!query.get('code');
    const hasToken = !!hash.get('access_token');

    if (!hasCode && !hasToken) {
      window.location.replace('/login');
      return;
    }

    // Supabase's detectSessionInUrl handles both PKCE and implicit automatically.
    // We wait for isAuthenticated (set by onAuthStateChange) to become true.
    // Safety fallback: redirect to login after 10s if exchange never completes.
    const timer = setTimeout(() => {
      if (!useStore.getState().isAuthenticated) {
        window.location.replace('/login');
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  // Navigate once the store confirms authentication
  useEffect(() => {
    if (isAuthenticated) {
      window.location.replace('/');
    }
  }, [isAuthenticated]);

  if (errorMsg) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background">
        <span className="text-sm font-medium text-destructive">로그인 실패</span>
        <span className="text-xs text-muted-foreground">{errorMsg}</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center gap-2 text-muted-foreground bg-background">
      <Loader2 size={20} className="animate-spin" />
      <span className="text-sm">로그인 처리 중...</span>
    </div>
  );
};

export default AuthCallback;
