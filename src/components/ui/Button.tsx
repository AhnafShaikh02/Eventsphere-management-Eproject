import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive'
  | 'icon'
  | 'text'
  | 'fab';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    'btn-luxe bg-gradient-to-r from-[#059669] via-[#10B981] to-[#34D399] text-[#02120B] font-bold shadow-[0_8px_24px_rgba(16,185,129,0.28)] hover:shadow-[0_12px_28px_rgba(16,185,129,0.38)]',
  secondary:
    'bg-[#E8EFEA] text-[#09140E] font-semibold border border-[#10B981]/20 hover:bg-[#DCE7E0] hover:border-[#059669]/40 dark:bg-[#0D1A13] dark:text-[#ECFDF5] dark:border-[#10B981]/25 dark:hover:bg-[#13261C]',
  outline:
    'bg-white text-[#09140E] font-semibold border border-slate-300 hover:border-[#059669] hover:text-[#047857] dark:bg-[#09120D] dark:text-[#ECFDF5] dark:border-[#10B981]/25 dark:hover:border-[#34D399] dark:hover:text-[#34D399]',
  ghost:
    'bg-transparent text-[#466153] font-semibold hover:bg-[#E8EFEA] hover:text-[#09140E] dark:text-[#8EAD9E] dark:hover:bg-[#10B981]/12 dark:hover:text-[#ECFDF5]',
  destructive:
    'bg-[#F97362]/14 text-[#C2410C] font-bold border border-[#F97362]/50 hover:bg-[#F97362]/24 dark:text-[#FDA4AF] dark:border-[#F97362]/45',
  icon:
    'bg-[#F4F7F5] text-[#466153] border border-slate-200 hover:border-[#059669] hover:text-[#09140E] dark:bg-[#09120D] dark:text-[#8EAD9E] dark:border-[#10B981]/22 dark:hover:border-[#34D399] dark:hover:text-[#ECFDF5]',
  text:
    'bg-transparent text-[#059669] font-semibold hover:underline dark:text-[#34D399] px-1 py-0.5',
  fab:
    'btn-luxe rounded-full bg-gradient-to-r from-[#059669] to-[#34D399] text-[#02120B] font-bold shadow-[0_14px_34px_rgba(16,185,129,0.38)]',
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'min-h-[34px] px-3 py-1.5 text-xs gap-1.5 rounded-lg',
  md: 'min-h-[40px] px-4 py-2 text-xs sm:text-sm gap-2 rounded-xl',
  lg: 'min-h-[46px] px-6 py-3 text-sm gap-2.5 rounded-xl',
};

const ICON_SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'h-8 w-8 p-0 rounded-lg',
  md: 'h-10 w-10 p-0 rounded-xl',
  lg: 'h-12 w-12 p-0 rounded-xl',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className = '',
      type = 'button',
      children,
      ...rest
    },
    ref,
  ) => {
    const isIconOnly = variant === 'icon';
    const isText = variant === 'text';
    const sizeClass = isIconOnly
      ? ICON_SIZE_STYLES[size]
      : isText
        ? 'text-xs sm:text-sm gap-1.5 rounded-md'
        : SIZE_STYLES[size];

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={[
          'inline-flex items-center justify-center whitespace-nowrap shrink-0 transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#040705]',
          'disabled:pointer-events-none disabled:opacity-50 active:scale-[0.985]',
          VARIANT_STYLES[variant],
          sizeClass,
          fullWidth ? 'w-full' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden="true" />
        ) : (
          leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
        )}
        {children && <span>{children}</span>}
        {!loading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
      </button>
    );
  },
);

Button.displayName = 'Button';
