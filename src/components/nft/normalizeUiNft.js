const FALLBACK_GRADIENT =
  'linear-gradient(135deg, rgba(14,23,48,0.9) 0%, rgba(11,16,32,0.7) 50%, rgba(139,92,246,0.15) 100%)';

function ipfsToHttp(url) {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('ipfs://')) return url.replace('ipfs://', 'https://ipfs.io/ipfs/');
  return url;
}

export function normalizeUiNft(raw) {
  if (!raw) return null;
  const image =
    ipfsToHttp(raw.normalized_metadata?.image) ||
    ipfsToHttp(raw.image) ||
    ipfsToHttp(raw.metadata?.image) ||
    ipfsToHttp(raw.raw?.metadata?.image) ||
    undefined;

  const contractAddress = raw.contractAddress || raw.contract?.address || raw.token_address || '';
  const tokenId =
    raw.tokenId != null ? String(raw.tokenId) :
    raw.token_id != null ? String(raw.token_id) : '';

  let id = raw.id;
  if (!id) id = `${contractAddress}_${tokenId}`.replace(/:/g, '_');

  const name = raw.name || raw.normalized_metadata?.name || raw.metadata?.name || (tokenId ? `#${tokenId}` : 'Untitled');
  const collectionName = raw.collectionName || raw.collection?.name || raw.contractMetadata?.name || raw.contract?.name || 'Collection';
  const chain = raw.chain || 'Base';
  const price = raw.price && raw.price !== '—' ? raw.price : '—';
  const lastSale = raw.lastSale && raw.lastSale !== '—' ? raw.lastSale : '—';

  return {
    id, contractAddress, tokenId, name, chain, collectionName,
    hasMedia: Boolean(image),
    normalized_metadata: { image: image || FALLBACK_GRADIENT },
    price, lastSale,
  };
}

export function normalizeUiNfts(rawList) {
  if (!Array.isArray(rawList)) return [];
  return rawList.map(normalizeUiNft).filter(Boolean);
}

export { FALLBACK_GRADIENT };
