-- ═══════════════════════════════════════════════════
-- 002 — PROFILES, USER COLLECTIONS, TELEGRAM, OTP
-- Run AFTER schema.sql and additive-views-and-functions.sql
-- ═══════════════════════════════════════════════════

-- ── 1) PROFILES (email OTP users + wallet info) ──
CREATE TABLE IF NOT EXISTS profiles (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email            text NOT NULL UNIQUE,
  first_name       text,
  username         text UNIQUE,
  wallet_address   text UNIQUE,
  avatar_url       text,
  bio              text,
  is_active        boolean DEFAULT true,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_wallet ON profiles (wallet_address) WHERE wallet_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles (username) WHERE username IS NOT NULL;

-- ── 2) OTP CODES ──
CREATE TABLE IF NOT EXISTS otp_codes (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email       text NOT NULL,
  code        text NOT NULL,
  expires_at  timestamptz NOT NULL,
  used        boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON otp_codes (email, used, expires_at);

-- ── 3) USER COLLECTIONS (admin assigns NFTs to users) ──
CREATE TABLE IF NOT EXISTS user_collections (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id       bigint NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cached_nft_id    bigint REFERENCES cached_nfts(id) ON DELETE SET NULL,
  chain_id         int NOT NULL DEFAULT 8453,
  contract_address text NOT NULL,
  token_id         text NOT NULL,
  assigned_by      text DEFAULT 'admin',
  assigned_at      timestamptz DEFAULT now(),
  UNIQUE (profile_id, chain_id, contract_address, token_id)
);

CREATE INDEX IF NOT EXISTS idx_user_collections_profile ON user_collections (profile_id);
CREATE INDEX IF NOT EXISTS idx_user_collections_nft ON user_collections (cached_nft_id);

-- ── 4) TRANSACTIONS LOG ──
CREATE TABLE IF NOT EXISTS transactions (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  wallet_address   text NOT NULL,
  profile_id       bigint REFERENCES profiles(id) ON DELETE SET NULL,
  tx_hash          text NOT NULL UNIQUE,
  tx_type          text NOT NULL DEFAULT 'mint' CHECK (tx_type IN ('mint','buy','transfer')),
  chain_id         int NOT NULL DEFAULT 8453,
  contract_address text,
  token_id         text,
  amount_eth       numeric(18,8) NOT NULL DEFAULT 0,
  admin_wallet     text,
  status           text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending','confirmed','failed')),
  metadata         jsonb DEFAULT '{}'::jsonb,
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions (wallet_address);
CREATE INDEX IF NOT EXISTS idx_transactions_profile ON transactions (profile_id);

-- ── 5) NOTIFICATION EVENTS (for ntfy + telegram logging) ──
CREATE TABLE IF NOT EXISTS notification_events (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  channel     text NOT NULL CHECK (channel IN ('ntfy','telegram','email')),
  topic       text,
  title       text,
  body        text,
  priority    text,
  delivered   boolean DEFAULT false,
  error       text,
  created_at  timestamptz DEFAULT now()
);

-- ── 6) RLS POLICIES ──
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_events ENABLE ROW LEVEL SECURITY;

-- Public can read profiles (for display)
CREATE POLICY "profiles_read_all" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_no_anon_write" ON profiles FOR INSERT WITH CHECK (false);
CREATE POLICY "profiles_no_anon_update" ON profiles FOR UPDATE USING (false);

-- OTP codes: service role only
CREATE POLICY "otp_no_anon" ON otp_codes FOR SELECT USING (false);
CREATE POLICY "otp_no_anon_write" ON otp_codes FOR INSERT WITH CHECK (false);

-- User collections: public read, service write
CREATE POLICY "user_collections_read" ON user_collections FOR SELECT USING (true);
CREATE POLICY "user_collections_no_anon_write" ON user_collections FOR INSERT WITH CHECK (false);
CREATE POLICY "user_collections_no_anon_delete" ON user_collections FOR DELETE USING (false);

-- Transactions: public read, service write
CREATE POLICY "transactions_read" ON transactions FOR SELECT USING (true);
CREATE POLICY "transactions_no_anon_write" ON transactions FOR INSERT WITH CHECK (false);

-- Notification events: service only
CREATE POLICY "notif_events_no_anon" ON notification_events FOR SELECT USING (false);
CREATE POLICY "notif_events_write" ON notification_events FOR INSERT WITH CHECK (false);

-- ── 7) Trigger for profiles updated_at ──
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_profiles_updated') THEN
    CREATE TRIGGER trg_profiles_updated
      BEFORE UPDATE ON profiles
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- ── 8) VIEW: admin_wallet_names ──
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
  (SELECT count(*) FROM wallet_mints wm WHERE lower(wm.wallet_address) = lower(p.wallet_address)) AS mint_count
FROM profiles p
WHERE p.is_active = true
ORDER BY p.created_at DESC;
