import { Link } from 'react-router-dom';
import { ATFQLogo } from '@/assets/icons/ATFQLogo';
import { LoginForm } from '@/features/auth/components/LoginForm';

export function Login() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 w-full max-w-[350px] mx-auto min-h-[80vh]">
      {/* Logo Section */}
      <div className="text-center space-y-2">
        <Link to="/" className="flex items-center justify-center">
          <ATFQLogo className="w-12 h-12 mx-auto mb-2 text-main" />
        </Link>
        <h2 className="font-display text-2xl font-bold text-text">Welcome back</h2>
        <p className="text-xs text-sub uppercase tracking-widest leading-tight">Enter your credentials</p>
      </div>

      <LoginForm />
    </div>
  );
}
