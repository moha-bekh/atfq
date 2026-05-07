import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ATFQLogo } from '@/assets/icons/ATFQLogo';
import { LoginForm, VerifyMFA } from '@/features/auth/components';

export function Login() {
  const [mfaRequestId, setMfaRequestId] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-center justify-center gap-6 w-full max-w-[350px] mx-auto min-h-[80vh]">
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
            <h2 className="font-display text-2xl font-bold text-text uppercase italic">Identity_Protocol</h2>
            <p className="text-xs text-sub uppercase tracking-widest leading-tight">Verification Required</p>
          </>
        )}
      </div>

      {!mfaRequestId ? (
        <LoginForm onMfaRequired={(id) => setMfaRequestId(id)} />
      ) : (
        <VerifyMFA loginRequestId={mfaRequestId} />
      )}
    </div>
  );
}
