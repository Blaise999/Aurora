const colorMap = {
  default: 'bg-white/[0.04] text-muted border-white/[0.06]',
  accent: 'bg-accent/10 text-accent border-accent/20',
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  danger: 'bg-danger/10 text-danger border-danger/20',
  hot: 'bg-hot/10 text-hot border-hot/20',
  rising: 'bg-rising/10 text-rising border-rising/20',
  bullish: 'bg-bullish/10 text-bullish border-bullish/20',
  bearish: 'bg-bearish/10 text-bearish border-bearish/20',
  violet: 'bg-accent-violet/10 text-accent-violet border-accent-violet/20',
};

export default function Badge({ children, color = 'default', className = '', dot = false }) {
  return (
    <span className={`
      inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium
      rounded-pill border transition-colors duration-200
      ${colorMap[color] || colorMap.default} ${className}
    `}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full bg-current animate-pulse`} />}
      {children}
    </span>
  );
}
