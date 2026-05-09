import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ATFQLogo } from '@/assets/icons/ATFQLogo';
import { LoginForm, VerifyMFA } from '@/features/auth/components';

export function Login() {
  const [mfaRequestId, setMfaRequestId] = useState<string | null>(null);
  const location = useLocation();
  const authError = (location.state as { error?: string } | null)?.error;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-96px)] w-full max-w-[350px] flex-col items-center justify-center gap-6 px-4 py-12 sm:py-16">
      {/* Logo Section */}
      <div className="text-center space-y-2">
        <Link to="/" className="flex items-center justify-center">
          <ATFQLogo className="w-12 h-12 mx-auto mb-2 text-main" />
        </Link>
        {!mfaRequestId ? (
          <>
            <h2 className="font-display text-2xl font-bold text-text">Welcome back</h2>
            <p className="text-xs text-sub uppercase tracking-widest leading-tight">Enter your credentials</p>
          </>
        ) : (
          <>
            <h2 className="font-display text-2xl font-bold text-text uppercase italic">Identity</h2>
            <p className="text-xs text-sub uppercase tracking-widest leading-tight">Verification Required</p>
          </>
        )}
      </div>

      {authError && !mfaRequestId && (
        <div className="w-full rounded-lg border border-error/20 bg-error/5 p-3 text-[10px] uppercase tracking-widest text-error">
          {authError}
        </div>
      )}

      {!mfaRequestId ? (
        <LoginForm onMfaRequired={(id) => setMfaRequestId(id)} />
      ) : (
        <VerifyMFA loginRequestId={mfaRequestId} />
      )}
    </div>
  );
}
