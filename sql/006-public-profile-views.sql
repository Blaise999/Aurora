-- ═══════════════════════════════════════════════════
-- 006 — Public profile views for /u/[username] page
-- Creates views used by the public user profile page.
-- Run AFTER 005-listing-price.sql
-- Safe to re-run (CREATE OR REPLACE).
-- ═══════════════════════════════════════════════════

-- ── 1) public_profiles — safe public profile data ──
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  p.id,
  p.first_name,
  p.username,
  p.display_name,
  p.bio,
  p.avatar_url,
  p.banner_url,
  p.wallet_address,
  p.created_at,
  p.updated_at
FROM profiles p
WHERE p.is_active = true;

-- ── 2) public_user_listed — created/minted NFTs ──
CREATE OR REPLACE VIEW public.public_user_listed AS
SELECT
  ul.id,
  ul.profile_id,
  ul.chain_id,
  ul.contract_address,
  ul.token_id,
  ul.name,
  ul.name AS nft_name,
  ul.description,
  ul.collection,
  ul.image_url,
  ul.external_url,
  ul.attributes,
  ul.token_type,
  ul.chain,
  ul.tx_hash,
  ul.mint_fee_eth,
  ul.listing_price_eth,
  ul.status,
  ul.created_at
FROM user_listed ul
WHERE ul.status = 'confirmed';

-- ── 3) public_user_collections — bought/collected NFTs ──
CREATE OR REPLACE VIEW public.public_user_collections AS
SELECT
  uc.id,
  uc.profile_id,
  uc.cached_nft_id,
  uc.chain_id,
  uc.contract_address,
  uc.token_id,
  uc.assigned_at,
  uc.assigned_by,
  uc.nft_price_eth,
  uc.mint_fee_eth,
  uc.total_value_eth,
  uc.pricing_source,
  uc.attributes,
  uc.collection,
  uc.description,
  uc.name,
  uc.image_url,
  uc.nft_name,
  uc.token_type,
  uc.chain
FROM user_collections uc;
