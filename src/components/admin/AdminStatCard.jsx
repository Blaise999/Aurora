export default function AdminStatCard({ label, value, sub, icon, trend, color = 'accent' }) {
  const colors = {
    accent: 'from-accent/10 to-transparent text-accent',
    violet: 'from-accent-violet/10 to-transparent text-accent-violet',
    success: 'from-success/10 to-transparent text-success',
    warning: 'from-warning/10 to-transparent text-warning',
  };

  return (
    <div className="glass-card rounded-card p-5 relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-radial ${colors[color]} opacity-50 blur-2xl`} />
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <span className="text-sm text-muted">{label}</span>
          {icon && <span className={`text-${color}`}>{icon}</span>}
        </div>
        <p className="text-2xl font-display font-bold text-text">{value}</p>
        <div className="flex items-center gap-2 mt-1.5">
          {trend && (
            <span className={`text-xs font-mono ${trend.startsWith('+') ? 'text-success' : 'text-danger'}`}>
              {trend}
            </span>
          )}
          {sub && <span className="text-xs text-muted-dim">{sub}</span>}
        </div>
      </div>
    </div>
  );
}
