import { type ButtonHTMLAttributes, type ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'neon';
  fullWidth?: boolean;
}

export function Button({ children, variant = 'primary', fullWidth = false, className = '', ...props }: ButtonProps) {
  const baseStyles = "px-6 py-3 rounded-lg font-bold transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-gradient-to-r from-krypta-purple to-krypta-magenta text-white hover:shadow-glow-strong hover:scale-[1.02] active:scale-[0.98]",
    secondary: "border border-krypta-purple/50 text-krypta-lilac hover:bg-krypta-purple/20 hover:border-krypta-purple hover:shadow-glow",
    ghost: "text-krypta-lilac hover:text-white hover:bg-krypta-purple/10",
    danger: "bg-red-600/20 border border-red-500/50 text-red-400 hover:bg-red-600/40 hover:shadow-[0_0_20px_rgba(220,38,38,0.5)]",
    neon: "bg-transparent border-2 border-krypta-cyan text-krypta-cyan hover:bg-krypta-cyan/10 hover:shadow-glow-cyan",
  };

  const widthStyle = fullWidth ? "w-full" : "";

  return (
    <button className={`${baseStyles} ${variants[variant]} ${widthStyle} ${className}`} {...props}>
      <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out rounded-lg" />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  );
}