import React from 'react';
import { LucideIcon } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'danger-solid';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

/** Một màn hình chỉ nên có 1 nút `primary` cho hành động chính. */
export const buttonVariantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-700/20',
  secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
  outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  danger: 'border border-red-200 bg-white text-red-600 hover:bg-red-50 hover:border-red-300',
  'danger-solid': 'bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-700/20',
};

export const buttonSizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-base gap-2',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  fullWidth,
  className = '',
  children,
  disabled,
  type = 'button',
  ...props
}) => {
  const iconSize = size === 'sm' ? 16 : 18;
  return (
    <button
      type={type}
      className={[
        'inline-flex items-center justify-center font-semibold rounded-lg whitespace-nowrap',
        'transition-colors duration-150 cursor-pointer select-none active:translate-y-px',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        buttonVariantClasses[variant], buttonSizeClasses[size], fullWidth ? 'w-full' : '', className,
      ].join(' ')}
      disabled={disabled}
      {...props}
    >
      {Icon && iconPosition === 'left' && <Icon size={iconSize} aria-hidden />}
      {children}
      {Icon && iconPosition === 'right' && <Icon size={iconSize} aria-hidden />}
    </button>
  );
};
