import { ThumbsUp, ThumbsDown } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { getTimeAgo } from '@/lib/mock/news';

const sentimentColor = {
  Hot: 'hot',
  Rising: 'rising',
  Bullish: 'bullish',
  Bearish: 'bearish',
  Important: 'warning',
};

export default function NewsCard({ item, index = 0 }) {
  return (
    <article
      className="group rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 hover:border-white/[0.10] transition-all duration-300 animate-fade-in"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start gap-4">
        <div className="flex-1 space-y-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge color={sentimentColor[item.sentimentTag] || 'default'} dot>
              {item.sentimentTag}
            </Badge>
            <span className="text-[11px] text-muted-dim">{item.source}</span>
            <span className="text-[11px] text-muted-dim">·</span>
            <span className="text-[11px] text-muted-dim">{getTimeAgo(item.publishedAt)}</span>
          </div>

          <h3 className="text-[14px] font-display font-medium text-text leading-snug group-hover:text-accent transition-colors duration-200">
            {item.title}
          </h3>

          <div className="flex items-center gap-2 pt-1">
            {item.tickers.map(ticker => (
              <span key={ticker} className="text-[10px] font-mono text-accent-cyan bg-accent-cyan/10 px-2 py-0.5 rounded-pill border border-accent-cyan/10">
                ${ticker}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-1.5 shrink-0 pt-1">
          <button className="p-1.5 text-muted-dim hover:text-success transition-colors rounded-lg hover:bg-success/10">
            <ThumbsUp size={13} />
          </button>
          <span className="text-[10px] text-muted-dim font-mono tabular-nums">
            {item.votes ? item.votes.positive - item.votes.negative : 0}
          </span>
          <button className="p-1.5 text-muted-dim hover:text-danger transition-colors rounded-lg hover:bg-danger/10">
            <ThumbsDown size={13} />
          </button>
        </div>
      </div>
    </article>
  );
}
