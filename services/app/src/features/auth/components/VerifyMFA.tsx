import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import type { LoginResponse } from '../types';
import { useAppStore } from '@/stores/app.store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface VerifyMFAProps {
  loginRequestId: string;
}

export function VerifyMFA({ loginRequestId }: VerifyMFAProps) {
  const [code, setCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAppStore(state => state.setAuth);
  const redirectFrom = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/wiki';

  const mutation = useMutation({
    mutationFn: (mfaCode: string) => authApi.verifyMfa({ login_request_id: loginRequestId, code: mfaCode }),
    onSuccess: (data: LoginResponse) => {
      if (data.access_token && data.refresh_token && data.user) {
        setAuth({
          user: data.user,
          access_token: data.access_token,
          refresh_token: data.refresh_token
        });
        
        navigate(redirectFrom, { replace: true });
      } else {
        setErrorMsg("Unexpected response from server");
      }
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || "Invalid MFA code");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (code.length < 6) {
      setErrorMsg("Code must be at least 6 characters");
      return;
    }
    mutation.mutate(code);
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h2 className="font-display text-xl font-bold uppercase italic text-text">MFA verification</h2>
        <p className="text-[10px] text-sub uppercase font-bold tracking-widest leading-relaxed">
          Security check initiated. Enter the 6-digit synchronization code from your authenticator device.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {errorMsg && (
          <div className="rounded-lg border border-error/20 bg-error/5 p-3 text-[10px] uppercase tracking-widest text-error animate-in shake duration-300">
            Error: {errorMsg}
          </div>
        )}

        <Input
          type="text"
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={6}
          autoFocus
          className="text-center text-2xl tracking-[0.5em] font-mono"
        />

        <Button
          type="submit"
          variant="primary"
          disabled={mutation.isPending}
          className="mt-2"
        >
          {mutation.isPending ? "Verifying..." : "Authorize"}
        </Button>

        <button 
          type="button"
          onClick={() => window.location.reload()}
          className="text-[10px] uppercase tracking-widest text-sub/50 hover:text-text transition-colors mt-2"
        >
          Cancel
        </button>
      </form>
    </div>
  );
}
