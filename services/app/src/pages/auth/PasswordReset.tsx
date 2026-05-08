import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { ATFQLogo } from '@/assets/icons/ATFQLogo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { authApi } from '@/features/auth/api/auth.api';

type Step = 'request' | 'confirm' | 'done';

export function PasswordReset() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') ?? '';
  const [step, setStep] = useState<Step>(tokenFromUrl ? 'confirm' : 'request');
  const [identifier, setIdentifier] = useState('');
  const [resetToken, setResetToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canConfirm = useMemo(
    () =>
      resetToken.trim().length > 0 &&
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[0-9]/.test(password) &&
      password === confirmPassword,
    [confirmPassword, password, resetToken],
  );

  const requestReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (identifier.trim().length < 3) {
      setError('Enter your username or email.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.requestPasswordReset({ identifier: identifier.trim() });
      setNotice('If this account exists, a password reset link has been sent by email.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to request password reset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password must be at least 8 characters and include one uppercase letter and one number.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.confirmPasswordReset({
        reset_token: resetToken.trim(),
        new_password: password,
      });
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 w-full max-w-[380px] mx-auto min-h-[80vh] px-4">
      <div className="text-center space-y-2">
        <Link to="/" className="flex items-center justify-center">
          <ATFQLogo className="w-12 h-12 mx-auto mb-2 text-main" />
        </Link>
        <h2 className="font-display text-2xl font-bold text-text">Reset password</h2>
        <p className="text-xs text-sub uppercase tracking-widest leading-tight">
          Recover access to your account
        </p>
      </div>

      {error && (
        <div className="w-full rounded-lg border border-error/20 bg-error/5 p-3 text-[10px] uppercase tracking-widest text-error">
          {error}
        </div>
      )}
      {notice && (
        <div className="w-full rounded-lg border border-main/20 bg-main/5 p-3 text-[10px] uppercase tracking-widest text-main">
          {notice}
        </div>
      )}

      {step === 'request' && (
        <form onSubmit={requestReset} className="w-full flex flex-col gap-5" noValidate>
          <Input
            type="text"
            placeholder="Username or Email"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
          />

          <Button type="submit" variant="primary" disabled={isSubmitting} className="mt-2">
            {isSubmitting ? 'Sending...' : 'Send reset link'}
          </Button>
        </form>
      )}

      {step === 'confirm' && (
        <form onSubmit={confirmReset} className="w-full flex flex-col gap-5" noValidate>
          <Input
            type="text"
            placeholder="Reset token"
            value={resetToken}
            onChange={(event) => setResetToken(event.target.value)}
          />
          <Input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />

          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || !canConfirm}
            className="mt-2"
          >
            {isSubmitting ? 'Resetting...' : 'Reset password'}
          </Button>
        </form>
      )}

      {step === 'done' && (
        <div className="w-full flex flex-col gap-5 text-center">
          <div className="rounded-lg border border-main/10 bg-main/10 p-5">
            <p className="text-sm text-text">Your password has been updated.</p>
          </div>
          <Button to="/login" variant="primary">
            Back to login
          </Button>
        </div>
      )}

      {step !== 'done' && (
        <Link
          to="/login"
          className="text-[10px] uppercase tracking-widest text-text hover:text-sub transition-colors"
        >
          Back to login
        </Link>
      )}
    </div>
  );
}
