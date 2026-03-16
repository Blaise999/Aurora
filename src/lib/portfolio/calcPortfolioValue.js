/**
 * Calculate total portfolio value from user_collections rows.
 * Uses total_value_eth first, then falls back to nft_price_eth + mint_fee_eth,
 * then mintPrice, then 0.
 */
export function calcPortfolioValue(nfts) {
  if (!nfts || nfts.length === 0) return 0;

  return nfts.reduce((total, nft) => {
    // Prefer the pre-computed total_value_eth from user_collections
    const totalVal = parseFloat(nft.total_value_eth || 0);
    if (totalVal > 0) return total + totalVal;

    // Fallback: sum nft_price_eth + mint_fee_eth
    const price = parseFloat(nft.nft_price_eth || nft.mintPrice || 0);
    const fee = parseFloat(nft.mint_fee_eth || nft.mintFee || 0);
    const sum = price + fee;
    if (sum > 0) return total + sum;

    // Last resort: floorPrice or lastSalePrice for legacy data
    const legacy = parseFloat(nft.floorPrice || nft.lastSalePrice || 0);
    return total + legacy;
  }, 0);
}