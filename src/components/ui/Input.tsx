import { forwardRef, type InputHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: LucideIcon;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon: Icon, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-2 w-full">
        {label && <label className="text-sm font-medium text-krypta-lilac/90 tracking-wide">{label}</label>}
        <div className="relative group">
          {Icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-krypta-purple/70 group-focus-within:text-krypta-purple transition-colors z-10">
              <Icon size={20} />
            </div>
          )}
          <input
            ref={ref}
            className={`w-full bg-krypta-black/60 border border-krypta-purple/30 rounded-lg py-3.5 ${Icon ? 'pl-12' : 'pl-4'} pr-4 text-krypta-white placeholder-krypta-white/30 focus:outline-none focus:border-krypta-purple focus:shadow-glow transition-all duration-300 ${error ? 'border-red-500' : ''} ${className}`}
            {...props}
          />
          <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-gradient-to-r from-krypta-purple to-krypta-cyan group-focus-within:w-full transition-all duration-500 rounded-b-lg" />
        </div>
        {error && <span className="text-xs text-red-400 mt-1">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';