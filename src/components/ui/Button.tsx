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
    'btn-luxe bg-gradient-to-r from-[#059669] via-[#10B981] to-[#34D399] text-[#02120B] font-bold shadow-[0_8px_24px_rgba(16,185,129,0.28)] hover:shadow-[0_0_26px_rgba(52,211,153,0.58),0_0_12px_rgba(45,212,191,0.42)]',
  secondary:
    'bg-[#E2ECE6] text-[#091911] font-semibold border border-[var(--es-border)] hover:bg-[#D4E3DA] hover:border-[var(--es-border-strong)] hover:shadow-[0_0_20px_var(--es-glow)] dark:bg-[#0D1A13] dark:text-[#DDF2E7] dark:hover:bg-[#13261C]',
  outline:
    'bg-[#EFF5F1] text-[#091911] font-semibold border border-[var(--es-border)] hover:border-[var(--es-border-strong)] hover:text-[#047857] hover:shadow-[0_0_20px_var(--es-glow)] dark:bg-[#08110C] dark:text-[#DDF2E7] dark:hover:text-[#62B894]',
  ghost:
    'bg-transparent text-[#355243] font-semibold hover:bg-[#E2ECE6] hover:text-[#091911] hover:shadow-[0_0_16px_var(--es-glow)] dark:text-[#8EAD9E] dark:hover:bg-[#10B981]/12 dark:hover:text-[#DDF2E7]',
  destructive:
    'bg-[#F97362]/14 text-[#C2410C] font-bold border border-[#F97362]/45 hover:bg-[#F97362]/24 hover:shadow-[0_0_20px_var(--es-glow-coral)] dark:text-[#FDA4AF] dark:border-[#F97362]/40',
  icon:
    'bg-[#E6EFE9] text-[#355243] border border-[var(--es-border)] hover:border-[var(--es-border-strong)] hover:text-[#091911] hover:shadow-[0_0_18px_var(--es-glow)] dark:bg-[#08110C] dark:text-[#8EAD9E] dark:hover:text-[#DDF2E7]',
  text:
    'no-btn-glow bg-transparent text-[#059669] font-semibold hover:underline dark:text-[#34D399] px-1 py-0.5',
  fab:
    'btn-luxe rounded-full bg-gradient-to-r from-[#059669] to-[#34D399] text-[#02120B] font-bold shadow-[0_14px_34px_rgba(16,185,129,0.38)] hover:shadow-[0_0_30px_rgba(52,211,153,0.65),0_0_14px_rgba(45,212,191,0.45)]',
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
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#E9F0EC] dark:focus-visible:ring-offset-[#040705]',
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
