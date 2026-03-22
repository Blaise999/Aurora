-- ═══════════════════════════════════════════════════
-- 005 — Add listing_price_eth to user_listed
-- Allows creators to set a sale price when minting
-- ═══════════════════════════════════════════════════

ALTER TABLE user_listed
ADD COLUMN IF NOT EXISTS listing_price_eth numeric(18,8) NOT NULL DEFAULT 0;

COMMENT ON COLUMN user_listed.listing_price_eth IS 'Price the creator wants for this NFT (in ETH). 0 = not for sale.';
