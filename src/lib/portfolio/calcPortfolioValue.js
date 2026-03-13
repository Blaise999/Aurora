export function calcPortfolioValue(nfts) {
  if (!nfts || nfts.length === 0) return 0;

  return nfts.reduce((total, nft) => {
    const price = nft.floorPrice || nft.lastSalePrice || 0;
    return total + Number(price);
  }, 0);
}