-- ═══════════════════════════════════════════════════
-- 003 — USER LISTED (creator-minted NFTs) + CREATE MINT FEE
-- Run AFTER 002-profiles-and-collections.sql
-- ═══════════════════════════════════════════════════

-- ── 1) USER LISTED TABLE ──
-- Stores NFTs that users create/mint themselves (the REAL mint flow).
-- Separate from user_collections which stores purchased/assigned NFTs.
CREATE TABLE IF NOT EXISTS user_listed (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id       bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  wallet_address   text NOT NULL,
  chain_id         int NOT NULL DEFAULT 84532,
  contract_address text NOT NULL,
  token_id         text NOT NULL,
  name             text NOT NULL,
  description      text DEFAULT '',
  collection       text DEFAULT 'User Created',
  image_url        text DEFAULT '',
  external_url     text DEFAULT '',
  attributes       jsonb DEFAULT '[]'::jsonb,
  token_type       text DEFAULT 'ERC721',
  chain            text DEFAULT 'Base Sepolia',
  tx_hash          text,
  mint_fee_eth     numeric(18,8) NOT NULL DEFAULT 0,
  status           text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending','confirmed','failed')),
  created_at       timestamptz DEFAULT now(),
  UNIQUE (profile_id, chain_id, contract_address, token_id)
);

CREATE INDEX IF NOT EXISTS idx_user_listed_profile ON user_listed (profile_id);
CREATE INDEX IF NOT EXISTS idx_user_listed_wallet ON user_listed (wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_listed_status ON user_listed (status);

-- ── 2) RLS ──
ALTER TABLE user_listed ENABLE ROW LEVEL SECURITY;

-- Public read (for marketplace/profile display)
CREATE POLICY "user_listed_read" ON user_listed FOR SELECT USING (true);
-- Service-role write only
CREATE POLICY "user_listed_no_anon_write" ON user_listed FOR INSERT WITH CHECK (false);
CREATE POLICY "user_listed_no_anon_delete" ON user_listed FOR DELETE USING (false);

-- ── 3) Add create_mint_fee to site_settings ──
INSERT INTO site_settings (key, value, updated_at)
VALUES ('create_mint_fee', '0.005', now())
ON CONFLICT (key) DO NOTHING;

-- ── 4) Add 'create_mint' to transactions tx_type check ──
-- We need to alter the check constraint to allow 'create_mint' type
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_tx_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_tx_type_check 
  CHECK (tx_type IN ('mint', 'buy', 'transfer', 'create_mint'));

-- ── 5) Update admin_wallet_names view to include listed count ──
CREATE OR REPLACE VIEW public.admin_wallet_names AS
SELECT
  p.id,
  p.first_name,
  p.username,
  p.email,
  p.wallet_address,
  p.created_at,
  p.updated_at,
  (SELECT count(*) FROM user_collections uc WHERE uc.profile_id = p.id) AS collection_count,
  (SELECT count(*) FROM wallet_mints wm WHERE lower(wm.wallet_address) = lower(p.wallet_address)) AS mint_count,
  (SELECT count(*) FROM user_listed ul WHERE ul.profile_id = p.id) AS listed_count
FROM profiles p
WHERE p.is_active = true
ORDER BY p.created_at DESC;
