import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { authApi } from '../api/auth.api';
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

  const mutation = useMutation({
    mutationFn: (mfaCode: string) => authApi.verifyMfa({ login_request_id: loginRequestId, code: mfaCode }),
    onSuccess: (data: any) => {
      if (data.access_token && data.refresh_token && data.user) {
        setAuth({
          user: data.user,
          access_token: data.access_token,
          refresh_token: data.refresh_token
        });
        
        const from = (location.state as any)?.from?.pathname || '/wiki';
        navigate(from, { replace: true });
      } else {
        setErrorMsg("Unexpected response from server");
      }
    },
    onError: (err: any) => {
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
        <h2 className="text-xl font-display font-bold text-text uppercase italic tracking-tighter">MFA_VERIFICATION</h2>
        <p className="text-[10px] text-sub uppercase font-bold tracking-widest leading-relaxed">
          Security protocol initiated. Enter the 6-digit synchronization code from your authenticator device.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {errorMsg && (
          <div className="p-3 text-[10px] bg-red-500/10 border border-red-500/20 text-red-500 uppercase tracking-tighter animate-in shake duration-300">
            ⚠ ERROR: {errorMsg}
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
          {mutation.isPending ? "VERIFYING_PROTOCOL..." : "AUTHORIZE_ACCESS"}
        </Button>

        <button 
          type="button"
          onClick={() => window.location.reload()}
          className="text-[10px] uppercase tracking-widest text-sub/50 hover:text-text transition-colors mt-2"
        >
          [ Cancel / Back to Login ]
        </button>
      </form>
    </div>
  );
}
