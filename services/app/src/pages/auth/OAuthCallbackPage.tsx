import { useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useOAuth } from '@/features/auth/hooks';
import type { OAuthProvider } from '@/features/auth/types';

export function OAuthCallbackPage() {
  const { provider } = useParams<{ provider: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleCallback } = useOAuth();

  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (provider && code && state) {
      called.current = true;
      handleCallback({ 
        provider: provider as OAuthProvider, 
        params: { code, state } 
      });
    } else if (!code || !state) {
      navigate('/login', { state: { error: "Missing OAuth parameters" } });
    }
  }, [provider, searchParams, handleCallback, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="w-12 h-12 border-4 border-main border-t-transparent rounded-full animate-spin" />
      <p className="text-sm uppercase tracking-widest text-sub">Authenticating with {provider}...</p>
    </div>
  );
}
