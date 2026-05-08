import { Link } from 'react-router-dom';
import { RegisterForm } from '@/features/auth/components/RegisterForm';
import { ATFQLogo } from '@/assets/icons/ATFQLogo';

export function Register() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-96px)] w-full max-w-[350px] flex-col items-center justify-center gap-6 px-4 py-12 sm:py-16">
      <div className="text-center space-y-2">
        <Link to="/" className="flex items-center justify-center">
          <ATFQLogo className="w-12 h-12 mx-auto mb-2 text-main" />
        </Link>
        <h2 className="font-display text-2xl font-bold text-text">Create Account</h2>
        <p className="text-xs text-sub uppercase tracking-widest">Join the Network</p>
      </div>

      <RegisterForm />
    </div>
  );
}
