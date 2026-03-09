-- AuroraNft — Complete Supabase Schema
-- Run in Supabase SQL Editor

-- ═══════════════════════════════════════════════════
-- 1) NFT SEED SOURCES (which contracts to fetch from Alchemy)
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS nft_seed_sources (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name             text NOT NULL,
  chain            text NOT NULL DEFAULT 'base-mainnet',
  contract_address text,
  collection_slug  text,
  fetch_limit      int DEFAULT 8,
  fetch_method     text DEFAULT 'contract' CHECK (fetch_method IN ('contract','slug')),
  is_active        boolean DEFAULT true,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════
-- 2) CACHED NFTS (daily Alchemy sync — the cache)
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS cached_nfts (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  chain_id         int NOT NULL DEFAULT 8453,
  contract_address text NOT NULL,
  token_id         text NOT NULL,
  name             text,
  description      text,
  image_url        text,
  collection_name  text,
  token_type       text DEFAULT 'ERC721',
  attributes       jsonb DEFAULT '[]'::jsonb,
  raw_metadata     jsonb DEFAULT '{}'::jsonb,
  is_active        boolean DEFAULT true,
  synced_at        timestamptz DEFAULT now(),
  batch_id         text,
  UNIQUE (chain_id, contract_address, token_id)
);

CREATE INDEX IF NOT EXISTS idx_cached_nfts_synced ON cached_nfts (synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_cached_nfts_collection ON cached_nfts (collection_name);
CREATE INDEX IF NOT EXISTS idx_cached_nfts_contract ON cached_nfts (contract_address);
CREATE INDEX IF NOT EXISTS idx_cached_nfts_active ON cached_nfts (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_cached_nfts_image ON cached_nfts (image_url) WHERE image_url IS NOT NULL AND image_url != '';

-- ═══════════════════════════════════════════════════
-- 3) NFT PRICING (admin-editable, per NFT)
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS nft_pricing (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cached_nft_id    bigint REFERENCES cached_nfts(id) ON DELETE SET NULL,
  chain_id         int NOT NULL,
  contract_address text NOT NULL,
  token_id         text NOT NULL,
  mint_price_eth   numeric(18,8) NOT NULL DEFAULT 0.002,
  mint_fee_eth     numeric(18,8) NOT NULL DEFAULT 0.001,
  is_featured      boolean DEFAULT false,
  is_listed        boolean DEFAULT true,
  updated_at       timestamptz DEFAULT now(),
  updated_by       text,
  UNIQUE (chain_id, contract_address, token_id)
);

CREATE INDEX IF NOT EXISTS idx_nft_pricing_featured ON nft_pricing (is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_nft_pricing_listed ON nft_pricing (is_listed) WHERE is_listed = true;

-- ═══════════════════════════════════════════════════
-- 4) WALLET FAVORITES (no blockchain, just DB)
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS wallet_favorites (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  wallet_address   text NOT NULL,
  cached_nft_id    bigint REFERENCES cached_nfts(id) ON DELETE CASCADE,
  chain_id         int NOT NULL,
  contract_address text NOT NULL,
  token_id         text NOT NULL,
  created_at       timestamptz DEFAULT now(),
  UNIQUE (wallet_address, chain_id, contract_address, token_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_wallet ON wallet_favorites (wallet_address);

-- ═══════════════════════════════════════════════════
-- 5) WALLET MINTS (snapshot at mint time)
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS wallet_mints (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  wallet_address   text NOT NULL,
  cached_nft_id    bigint,
  chain_id         int NOT NULL,
  contract_address text NOT NULL,
  token_id         text NOT NULL,
  tx_hash          text,
  mint_price_eth   numeric(18,8) NOT NULL DEFAULT 0,
  mint_fee_eth     numeric(18,8) NOT NULL DEFAULT 0,
  total_paid_eth   numeric(18,8) NOT NULL DEFAULT 0,
  snapshot_name    text,
  snapshot_image   text,
  snapshot_desc    text,
  status           text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending','confirmed','failed')),
  minted_at        timestamptz DEFAULT now(),
  UNIQUE (wallet_address, chain_id, contract_address, token_id)
);

CREATE INDEX IF NOT EXISTS idx_mints_wallet ON wallet_mints (wallet_address);
CREATE INDEX IF NOT EXISTS idx_mints_status ON wallet_mints (status);

-- ═══════════════════════════════════════════════════
-- 6) CACHE SYNC LOG (audit trail for daily refreshes)
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS cache_sync_log (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  batch_id      text NOT NULL,
  seeds_total   int DEFAULT 0,
  nfts_inserted int DEFAULT 0,
  nfts_updated  int DEFAULT 0,
  errors        jsonb DEFAULT '[]'::jsonb,
  started_at    timestamptz DEFAULT now(),
  completed_at  timestamptz,
  status        text DEFAULT 'running' CHECK (status IN ('running','completed','failed'))
);

-- ═══════════════════════════════════════════════════
-- 7) SITE SETTINGS
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS site_settings (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key         text NOT NULL UNIQUE,
  value       text NOT NULL,
  updated_at  timestamptz DEFAULT now(),
  updated_by  text
);

INSERT INTO site_settings (key, value) VALUES
  ('minting_fee', '0.002'),
  ('buy_fee', '0.002'),
  ('sale_active', 'true'),
  ('max_per_wallet', '10'),
  ('treasury_wallet', ''),
  ('contract_address', '')
ON CONFLICT (key) DO NOTHING;

-- ═══════════════════════════════════════════════════
-- 8) VISITOR LOGS
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS visitor_logs (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip_address  text NOT NULL,
  country     text,
  region      text,
  city        text,
  latitude    numeric(10,6),
  longitude   numeric(10,6),
  isp         text,
  user_agent  text,
  page_path   text DEFAULT '/',
  referrer    text,
  visited_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visitor_logs_time ON visitor_logs (visited_at DESC);

-- ═══════════════════════════════════════════════════
-- 9) SUPPORT CHAT
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS support_conversations (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  visitor_id    text NOT NULL UNIQUE,
  visitor_name  text DEFAULT 'Anonymous',
  visitor_email text,
  wallet_address text,
  status        text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','archived')),
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS support_messages (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversation_id bigint NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
  sender_type     text NOT NULL CHECK (sender_type IN ('visitor','admin')),
  sender_name     text DEFAULT 'Anonymous',
  message         text NOT NULL,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_msgs_convo ON support_messages (conversation_id, created_at);

-- ═══════════════════════════════════════════════════
-- 10) ADMIN NOTIFICATIONS
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS admin_notifications (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  type        text NOT NULL CHECK (type IN ('visitor','support','mint','purchase','news','system','sync')),
  title       text NOT NULL,
  body        text,
  metadata    jsonb DEFAULT '{}'::jsonb,
  is_read     boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_notifs_unread ON admin_notifications (is_read, created_at DESC);

-- ═══════════════════════════════════════════════════
-- 11) KEEP LEGACY TABLES FOR COMPAT
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS nft_metadata_cache (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  chain_id         int NOT NULL,
  contract_address text NOT NULL,
  token_id         text NOT NULL,
  name             text,
  description      text,
  image_url        text,
  attributes       jsonb DEFAULT '[]'::jsonb,
  updated_at       timestamptz DEFAULT now(),
  UNIQUE (chain_id, contract_address, token_id)
);

CREATE TABLE IF NOT EXISTS user_nfts (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  chain_id         int NOT NULL,
  contract_address text NOT NULL,
  token_id         text NOT NULL,
  owner_address    text NOT NULL,
  minter_address   text,
  tx_hash          text NOT NULL,
  minted_at        timestamptz DEFAULT now(),
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','failed')),
  UNIQUE (chain_id, contract_address, token_id),
  UNIQUE (tx_hash)
);

CREATE TABLE IF NOT EXISTS nft_prices (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nft_id           text NOT NULL,
  contract_address text,
  token_id         text,
  name             text NOT NULL,
  price_eth        numeric(18,8) NOT NULL DEFAULT 0.002,
  minting_fee_eth  numeric(18,8) NOT NULL DEFAULT 0.001,
  is_listed        boolean DEFAULT true,
  is_featured      boolean DEFAULT false,
  updated_at       timestamptz DEFAULT now(),
  updated_by       text,
  UNIQUE (nft_id)
);

-- ═══════════════════════════════════════════════════
-- 12) ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════
ALTER TABLE nft_seed_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE cached_nfts ENABLE ROW LEVEL SECURITY;
ALTER TABLE nft_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_mints ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE nft_metadata_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_nfts ENABLE ROW LEVEL SECURITY;
ALTER TABLE nft_prices ENABLE ROW LEVEL SECURITY;

-- Public reads for catalog/pricing
CREATE POLICY "cached_nfts_read_all" ON cached_nfts FOR SELECT USING (true);
CREATE POLICY "nft_pricing_read_all" ON nft_pricing FOR SELECT USING (true);
CREATE POLICY "settings_read_all" ON site_settings FOR SELECT USING (true);
CREATE POLICY "nft_prices_read_all" ON nft_prices FOR SELECT USING (true);
CREATE POLICY "metadata_read_all" ON nft_metadata_cache FOR SELECT USING (true);

-- Service-role only writes (all inserts go through API routes with service key)
CREATE POLICY "cached_nfts_no_anon_write" ON cached_nfts FOR INSERT WITH CHECK (false);
CREATE POLICY "cached_nfts_no_anon_update" ON cached_nfts FOR UPDATE USING (false);
CREATE POLICY "nft_pricing_no_anon_write" ON nft_pricing FOR INSERT WITH CHECK (false);
CREATE POLICY "nft_pricing_no_anon_update" ON nft_pricing FOR UPDATE USING (false);
CREATE POLICY "settings_no_anon_write" ON site_settings FOR INSERT WITH CHECK (false);
CREATE POLICY "wallet_favorites_read" ON wallet_favorites FOR SELECT USING (true);
CREATE POLICY "wallet_favorites_write" ON wallet_favorites FOR INSERT WITH CHECK (false);
CREATE POLICY "wallet_favorites_delete" ON wallet_favorites FOR DELETE USING (false);
CREATE POLICY "wallet_mints_read" ON wallet_mints FOR SELECT USING (true);
CREATE POLICY "wallet_mints_write" ON wallet_mints FOR INSERT WITH CHECK (false);
CREATE POLICY "support_convos_read" ON support_conversations FOR SELECT USING (true);
CREATE POLICY "support_convos_write" ON support_conversations FOR INSERT WITH CHECK (false);
CREATE POLICY "support_msgs_read" ON support_messages FOR SELECT USING (true);
CREATE POLICY "support_msgs_write" ON support_messages FOR INSERT WITH CHECK (false);
CREATE POLICY "visitor_logs_no_anon" ON visitor_logs FOR SELECT USING (false);
CREATE POLICY "visitor_logs_write" ON visitor_logs FOR INSERT WITH CHECK (false);
CREATE POLICY "admin_notifs_no_anon" ON admin_notifications FOR SELECT USING (false);
CREATE POLICY "admin_notifs_write" ON admin_notifications FOR INSERT WITH CHECK (false);
CREATE POLICY "cache_sync_log_no_anon" ON cache_sync_log FOR SELECT USING (false);
CREATE POLICY "user_nfts_read_all" ON user_nfts FOR SELECT USING (true);
CREATE POLICY "user_nfts_write" ON user_nfts FOR INSERT WITH CHECK (false);
CREATE POLICY "nft_prices_write" ON nft_prices FOR INSERT WITH CHECK (false);
CREATE POLICY "seed_sources_no_anon" ON nft_seed_sources FOR SELECT USING (false);

-- ═══════════════════════════════════════════════════
-- 13) REALTIME
-- ═══════════════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE support_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE admin_notifications;
