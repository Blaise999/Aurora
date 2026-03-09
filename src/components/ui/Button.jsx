'use client';

const variants = {
  primary: 'relative bg-gradient-to-r from-accent to-accent-violet text-bg font-semibold shadow-[0_0_24px_rgba(0,229,255,0.10)] hover:shadow-[0_0_32px_rgba(0,229,255,0.16)] hover:scale-[1.02] active:scale-[0.98]',
  secondary: 'bg-white/[0.04] border border-white/[0.08] text-text hover:border-white/[0.14] hover:bg-white/[0.06]',
  ghost: 'text-muted hover:text-text hover:bg-white/[0.04]',
  danger: 'bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20',
};

const sizes = {
  sm: 'px-4 py-2 text-[13px] rounded-xl',
  md: 'px-6 py-2.5 text-[13px] rounded-xl',
  lg: 'px-7 py-3 text-[14px] rounded-2xl',
};

export default function Button({
  children, variant = 'primary', size = 'md', className = '', disabled = false, ...props
}) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 font-body font-medium
        transition-all duration-300 ease-out
        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
