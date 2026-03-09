export const sentimentTags = ['Hot', 'Rising', 'Bullish', 'Bearish', 'Important'];

export const mockNews = [
  {
    id: '1',
    title: 'Ethereum Layer 2 Activity Surges to All-Time High as Gas Fees Drop',
    source: 'CoinDesk',
    publishedAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    sentimentTag: 'Bullish',
    tickers: ['ETH', 'ARB', 'OP'],
    url: '#',
    votes: { positive: 342, negative: 28 },
  },
  {
    id: '2',
    title: 'Major NFT Collection Launches Dynamic Metadata Feature Using Chainlink',
    source: 'The Block',
    publishedAt: new Date(Date.now() - 1000 * 60 * 48).toISOString(),
    sentimentTag: 'Hot',
    tickers: ['LINK', 'ETH'],
    url: '#',
    votes: { positive: 189, negative: 12 },
  },
  {
    id: '3',
    title: 'Solana DeFi TVL Crosses $12B Mark Amid Memecoin Rally',
    source: 'DeFi Llama',
    publishedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    sentimentTag: 'Rising',
    tickers: ['SOL'],
    url: '#',
    votes: { positive: 567, negative: 45 },
  },
  {
    id: '4',
    title: 'SEC Commissioner Signals Potential Framework for Digital Asset Regulation',
    source: 'Reuters',
    publishedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    sentimentTag: 'Important',
    tickers: ['BTC', 'ETH'],
    url: '#',
    votes: { positive: 234, negative: 156 },
  },
  {
    id: '5',
    title: 'Bitcoin Mining Difficulty Reaches New Record High After Halving',
    source: 'CoinTelegraph',
    publishedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    sentimentTag: 'Bearish',
    tickers: ['BTC'],
    url: '#',
    votes: { positive: 89, negative: 203 },
  },
  {
    id: '6',
    title: 'Polygon zkEVM Upgrade Enables 10x Throughput Improvement',
    source: 'Decrypt',
    publishedAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    sentimentTag: 'Bullish',
    tickers: ['MATIC', 'ETH'],
    url: '#',
    votes: { positive: 412, negative: 34 },
  },
  {
    id: '7',
    title: 'OpenSea Pro Introduces Zero-Fee Trading for Select Collections',
    source: 'NFT Now',
    publishedAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    sentimentTag: 'Hot',
    tickers: ['ETH'],
    url: '#',
    votes: { positive: 678, negative: 89 },
  },
  {
    id: '8',
    title: 'Avalanche Foundation Deploys $100M Fund for Gaming Ecosystem',
    source: 'GameFi Weekly',
    publishedAt: new Date(Date.now() - 1000 * 60 * 420).toISOString(),
    sentimentTag: 'Rising',
    tickers: ['AVAX'],
    url: '#',
    votes: { positive: 321, negative: 45 },
  },
  {
    id: '9',
    title: 'Central Bank Digital Currency Pilot Expands to 15 Countries',
    source: 'Bloomberg',
    publishedAt: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
    sentimentTag: 'Important',
    tickers: ['BTC', 'ETH', 'SOL'],
    url: '#',
    votes: { positive: 156, negative: 234 },
  },
  {
    id: '10',
    title: 'Art Blocks Curated Drops New Generative Series by Renowned Artist',
    source: 'ArtNet',
    publishedAt: new Date(Date.now() - 1000 * 60 * 900).toISOString(),
    sentimentTag: 'Hot',
    tickers: ['ETH'],
    url: '#',
    votes: { positive: 445, negative: 12 },
  },
];

export const topTickers = [
  { symbol: 'ETH', name: 'Ethereum', price: '$3,847.21', change: '+4.2%', positive: true },
  { symbol: 'BTC', name: 'Bitcoin', price: '$98,432.50', change: '+1.8%', positive: true },
  { symbol: 'SOL', name: 'Solana', price: '$187.34', change: '+7.1%', positive: true },
  { symbol: 'MATIC', name: 'Polygon', price: '$1.24', change: '-2.3%', positive: false },
  { symbol: 'ARB', name: 'Arbitrum', price: '$1.87', change: '+3.5%', positive: true },
  { symbol: 'OP', name: 'Optimism', price: '$3.42', change: '+5.8%', positive: true },
  { symbol: 'AVAX', name: 'Avalanche', price: '$42.18', change: '-0.9%', positive: false },
  { symbol: 'LINK', name: 'Chainlink', price: '$18.92', change: '+2.1%', positive: true },
];

export function getTimeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
