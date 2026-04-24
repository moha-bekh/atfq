import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';

import { useRegister, useOAuth } from '../hooks';
import { registerSchema, type RegisterInput } from '../utils/validation';

import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { GoogleCircle } from '@/assets/icons/GoogleCircle';
import { GithubCircle } from '@/assets/icons/GithubCircle';

export function RegisterForm() {
  const mutation = useRegister();
  const { getOAuthUrl, isProcessing } = useOAuth();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: ""
    }
  });

  const onSubmit = (data: RegisterInput) => {
    mutation.mutate(data);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full flex flex-col gap-5"
      noValidate
    >
      {mutation.isError && (
        <div className="p-3 text-[10px] bg-red-500/10 border border-red-500/20 text-red-500 uppercase tracking-tighter">
          System Error: {mutation.error?.message || "Registration failed"}
        </div>
      )}

      <Input
        type="text"
        placeholder="Username"
        error={errors.username?.message}
        {...register("username")}
      />

      <Input
        type="email"
        placeholder="Email"
        error={errors.email?.message}
        {...register("email")}
      />

      <Input
        type="password"
        placeholder="Password"
        error={errors.password?.message}
        {...register("password")}
      />

      <Input
        type="password"
        placeholder="Confirm Password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />

      <Button
        type="submit"
        variant="primary"
        disabled={mutation.isPending || isProcessing}
        className="mt-2"
      >
        {mutation.isPending ? "Creating Account..." : "Sign Up"}
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
        <p className="text-sub">Already have an account?</p>
        <Link to="/login" className="text-[10px] uppercase tracking-widest text-text hover:text-sub transition-colors">
          [ Sign_in ]
        </Link>
      </div>
    </form>
  );
}
