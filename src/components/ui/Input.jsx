'use client';
import { forwardRef } from 'react';

const Input = forwardRef(function Input({ label, icon, className = '', error, ...props }, ref) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm text-muted font-medium">{label}</label>}
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-dim">{icon}</span>
        )}
        <input
          ref={ref}
          className={`
            w-full bg-surface2/60 border border-border rounded-xl
            px-4 py-3 text-sm text-text placeholder:text-muted-dim
            focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20
            transition-all duration-200
            ${icon ? 'pl-11' : ''}
            ${error ? 'border-danger/40 focus:border-danger/60' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
});

export default Input;
