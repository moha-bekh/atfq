import { Link } from 'react-router-dom';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost';
  to?: string;
}

export function Button({ children, variant = 'primary', className = '', to, ...props }: ButtonProps) {
  const baseStyles = "flex items-center justify-center gap-3 py-2 px-6 rounded-lg font-bold transition-all border-2 cursor-pointer box-border h-[42px]";

  const variants = {
    primary: "bg-sub text-text border-sub hover:bg-transparent hover:border-text",
    outline: "bg-transparent text-sub border-sub hover:border-text hover:text-text",
    ghost: "border-transparent text-sub hover:text-text"
  };

  const combinedClasses = `${baseStyles} ${variants[variant]} ${className}`;

  if (to) {
    return (
      <Link to={to} className={combinedClasses}>
        {children}
      </Link>
    );
  }

  return (
    <button className={combinedClasses} {...props}>
      {children}
    </button>
  );
}
