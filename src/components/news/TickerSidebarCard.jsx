export default function TickerSidebarCard({ ticker }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border-light last:border-0 group cursor-pointer">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-surface2 flex items-center justify-center text-xs font-mono font-semibold text-accent">
          {ticker.symbol.slice(0, 2)}
        </div>
        <div>
          <p className="text-sm font-medium text-text group-hover:text-accent transition-colors">{ticker.symbol}</p>
          <p className="text-[11px] text-muted-dim">{ticker.name}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-mono text-text">{ticker.price}</p>
        <p className={`text-[11px] font-mono ${ticker.positive ? 'text-bullish' : 'text-bearish'}`}>
          {ticker.change}
        </p>
      </div>
    </div>
  );
}
