import React from 'react';
import { Loader2 } from 'lucide-react';

const VARIANT_STYLES = {
  primary:
    'btn-luxe bg-gradient-to-r from-[#B88B3D] via-[#D4AF63] to-[#F3DCAA] text-[#0B0B0E] font-bold shadow-[0_8px_24px_rgba(212,175,99,0.28)] hover:shadow-[0_0_26px_rgba(232,201,135,0.58),0_0_12px_rgba(243,220,170,0.42)]',
  secondary:
    'bg-[#E4E6EE] text-[#0B0B0E] font-semibold border border-[var(--es-border)] hover:bg-[#D8DBE6] hover:border-[var(--es-border-strong)] hover:shadow-[0_0_20px_var(--es-glow)] dark:bg-[#181820] dark:text-[#F2F3F7] dark:hover:bg-[#20202A]',
  outline:
    'bg-[#F8F8FB] text-[#0B0B0E] font-semibold border border-[var(--es-border)] hover:border-[var(--es-border-strong)] hover:text-[#8A621C] hover:shadow-[0_0_20px_var(--es-glow)] dark:bg-[#121217] dark:text-[#F2F3F7] dark:hover:text-[#E8C987]',
  ghost:
    'bg-transparent text-[#3E404D] font-semibold hover:bg-[#E4E6EE] hover:text-[#0B0B0E] hover:shadow-[0_0_16px_var(--es-glow)] dark:text-[#9497A6] dark:hover:bg-[#E8C987]/12 dark:hover:text-[#F2F3F7]',
  destructive:
    'bg-[#F97362]/14 text-[#C2410C] font-bold border border-[#F97362]/45 hover:bg-[#F97362]/24 hover:shadow-[0_0_20px_var(--es-glow-coral)] dark:text-[#FDA4AF] dark:border-[#F97362]/40',
  icon:
    'bg-[#EAEBF1] text-[#3E404D] border border-[var(--es-border)] hover:border-[var(--es-border-strong)] hover:text-[#0B0B0E] hover:shadow-[0_0_18px_var(--es-glow)] dark:bg-[#121217] dark:text-[#9497A6] dark:hover:text-[#F2F3F7]',
  text:
    'no-btn-glow bg-transparent text-[#8A621C] font-semibold hover:underline dark:text-[#E8C987] px-1 py-0.5',
  fab:
    'btn-luxe rounded-full bg-gradient-to-r from-[#B88B3D] to-[#F3DCAA] text-[#0B0B0E] font-bold shadow-[0_14px_34px_rgba(212,175,99,0.38)] hover:shadow-[0_0_30px_rgba(232,201,135,0.65),0_0_14px_rgba(243,220,170,0.45)]',
};

const SIZE_STYLES = {
  sm: 'min-h-[34px] px-3 py-1.5 text-xs gap-1.5 rounded-lg',
  md: 'min-h-[40px] px-4 py-2 text-xs sm:text-sm gap-2 rounded-xl',
  lg: 'min-h-[46px] px-6 py-3 text-sm gap-2.5 rounded-xl',
};

const ICON_SIZE_STYLES = {
  sm: 'h-8 w-8 p-0 rounded-lg',
  md: 'h-10 w-10 p-0 rounded-xl',
  lg: 'h-12 w-12 p-0 rounded-xl',
};

export const Button = React.forwardRef(
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
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF63]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F3F4F7] dark:focus-visible:ring-offset-[#0B0B0E]',
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
