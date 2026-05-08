import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';

import { useLogin, useOAuth } from '../hooks';
import { loginSchema, type LoginInput } from '../utils/validation';

import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { GoogleCircle } from '@/assets/icons/GoogleCircle';
import { GithubCircle } from '@/assets/icons/GithubCircle';

export function LoginForm({ onMfaRequired }: { onMfaRequired?: (id: string) => void }) {
  const mutation = useLogin(onMfaRequired);
  const { getOAuthUrl, isProcessing } = useOAuth();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: ""
    }
  });

  const onSubmit = (data: LoginInput) => {
    mutation.mutate(data);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full flex flex-col gap-5"
      noValidate
    >
      {mutation.isError && (
        <div className="rounded-lg border border-error/20 bg-error/5 p-3 text-[10px] uppercase tracking-widest text-error">
          {mutation.error?.message || "Invalid credentials"}
        </div>
      )}

      <Input
        type="text"
        placeholder="Username or Email"
        error={errors.identifier?.message}
        {...register("identifier")}
      />

      <div className="flex flex-col gap-1">
        <Input
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register("password")}
        />
        <Link
          to="/password-reset"
          className="self-end text-[10px] uppercase tracking-widest text-text hover:text-sub transition-colors"
        >
          Forgot password?
        </Link>
      </div>

      <Button
        type="submit"
        variant="primary"
        disabled={mutation.isPending || isProcessing}
        className="mt-2"
      >
        {mutation.isPending ? "Authenticating..." : "Sign In"}
      </Button>

      <div className="flex items-center gap-4 w-full my-2">
        <div className="h-[1px] flex-1 bg-main/10" />
        <p className="text-[10px] uppercase tracking-widest text-sub/50 font-bold">OR</p>
        <div className="h-[1px] flex-1 bg-main/10" />
      </div>

      {/* Social Logins */}
      <div className="flex flex-col gap-3">
        <Button 
          variant="outline" 
          type="button" 
          className="text-sm group"
          onClick={() => getOAuthUrl('google')}
          disabled={isProcessing}
        >
          <GoogleCircle className="w-4 h-4 text-sub group-hover:text-main transition-colors" />
          Google
        </Button>

        <Button 
          variant="outline" 
          type="button" 
          className="text-sm group"
          onClick={() => getOAuthUrl('github')}
          disabled={isProcessing}
        >
          <GithubCircle className="w-4 h-4 text-sub group-hover:text-main transition-colors" />
          GitHub
        </Button>
      </div>

      <div className="flex items-center justify-center gap-2 text-xs mt-6">
        <p className="text-sub">New to ATFQ?</p>
        <Link to="/register" className="text-[10px] uppercase tracking-widest text-text hover:text-sub transition-colors">
          Sign up
        </Link>
      </div>
    </form>
  );
}
