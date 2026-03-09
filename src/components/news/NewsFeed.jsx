'use client';
import { useState } from 'react';
import NewsCard from './NewsCard';
import NewsFilterChips from './NewsFilterChips';

export default function NewsFeed({ news = [] }) {
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? news : news.filter(n => n.sentimentTag === filter);

  return (
    <div className="space-y-5">
      <NewsFilterChips active={filter} onChange={setFilter} />
      <div className="space-y-3">
        {filtered.map((item, i) => (
          <NewsCard key={item.id} item={item} index={i} />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted">
            <p className="text-sm">No news matching this filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
