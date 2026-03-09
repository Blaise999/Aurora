'use client';

export default function Select({ label, options = [], value, onChange, className = '' }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm text-muted font-medium">{label}</label>}
      <select
        value={value}
        onChange={onChange}
        className={`
          w-full bg-surface2/60 border border-border rounded-xl
          px-4 py-3 text-sm text-text appearance-none cursor-pointer
          focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20
          transition-all duration-200
          bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='rgba(234,240,255,0.4)' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")]
          bg-no-repeat bg-[right_12px_center]
          ${className}
        `}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value} className="bg-surface2 text-text">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
