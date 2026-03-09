import { Settings, Pause, Play, DollarSign, Users, BarChart3 } from 'lucide-react';

const mockActivity = [
  { id: 1, action: 'Price updated', detail: '0.06 ETH → 0.08 ETH', by: '0xA3f1...8c2D', time: '2 hours ago', icon: <DollarSign size={14} />, color: 'text-accent' },
  { id: 2, action: 'Mint paused', detail: 'Sale temporarily halted', by: '0xA3f1...8c2D', time: '5 hours ago', icon: <Pause size={14} />, color: 'text-warning' },
  { id: 3, action: 'Mint resumed', detail: 'Sale is back live', by: '0xA3f1...8c2D', time: '4 hours ago', icon: <Play size={14} />, color: 'text-success' },
  { id: 4, action: 'Allowlist updated', detail: '847 addresses added', by: '0xA3f1...8c2D', time: '1 day ago', icon: <Users size={14} />, color: 'text-accent-violet' },
  { id: 5, action: 'Mint window changed', detail: '48h → 72h', by: '0xA3f1...8c2D', time: '1 day ago', icon: <Settings size={14} />, color: 'text-muted' },
  { id: 6, action: 'Supply milestone', detail: '4,000 minted', by: 'System', time: '2 days ago', icon: <BarChart3 size={14} />, color: 'text-accent-cyan' },
];

export default function ActivityLog() {
  return (
    <div className="space-y-0">
      {mockActivity.map((item, i) => (
        <div key={item.id} className="flex gap-4 relative animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
          {/* Timeline line */}
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full bg-surface2 border border-border flex items-center justify-center shrink-0 ${item.color}`}>
              {item.icon}
            </div>
            {i < mockActivity.length - 1 && <div className="w-px flex-1 bg-border-light mt-1" />}
          </div>

          {/* Content */}
          <div className="pb-6 flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm text-text font-medium">{item.action}</p>
                <p className="text-xs text-muted mt-0.5">{item.detail}</p>
              </div>
              <span className="text-[11px] text-muted-dim shrink-0">{item.time}</span>
            </div>
            <p className="text-[11px] text-muted-dim font-mono mt-1.5">by {item.by}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
