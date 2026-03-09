-- ═══════════════════════════════════════════════════
-- ADDITIVE SQL — Run AFTER the main schema.sql
-- Adds: views, trigger helpers, and DB functions
-- referenced in the codebase.
-- ═══════════════════════════════════════════════════

-- ── 1) set_updated_at() trigger function ──────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at columns
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_nft_seed_sources_updated') THEN
    CREATE TRIGGER trg_nft_seed_sources_updated
      BEFORE UPDATE ON nft_seed_sources
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_nft_pricing_updated') THEN
    CREATE TRIGGER trg_nft_pricing_updated
      BEFORE UPDATE ON nft_pricing
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_site_settings_updated') THEN
    CREATE TRIGGER trg_site_settings_updated
      BEFORE UPDATE ON site_settings
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;


-- ── 2) start_cache_sync() helper ──────────────────
CREATE OR REPLACE FUNCTION public.start_cache_sync(p_batch_id text)
RETURNS void AS $$
BEGIN
  INSERT INTO cache_sync_log (batch_id, status, started_at)
  VALUES (p_batch_id, 'running', now());
END;
$$ LANGUAGE plpgsql;


-- ── 3) finish_cache_sync() helper ─────────────────
CREATE OR REPLACE FUNCTION public.finish_cache_sync(
  p_batch_id text,
  p_nfts_inserted int DEFAULT 0,
  p_nfts_updated int DEFAULT 0,
  p_errors jsonb DEFAULT '[]'::jsonb,
  p_status text DEFAULT 'completed'
)
RETURNS void AS $$
BEGIN
  UPDATE cache_sync_log
  SET
    nfts_inserted = p_nfts_inserted,
    nfts_updated  = p_nfts_updated,
    errors        = p_errors,
    status        = p_status,
    completed_at  = now()
  WHERE batch_id = p_batch_id;
END;
$$ LANGUAGE plpgsql;


-- ── 4) VIEW: public_nft_catalog ───────────────────
-- All active cached NFTs joined with pricing info.
-- This is the primary read view for the public catalog.
CREATE OR REPLACE VIEW public.public_nft_catalog AS
SELECT
  cn.id,
  cn.chain_id,
  cn.contract_address,
  cn.token_id,
  cn.name,
  cn.description,
  cn.image_url,
  cn.collection_name,
  cn.token_type,
  cn.attributes,
  cn.synced_at,
  COALESCE(np.mint_price_eth, 0.002)  AS mint_price_eth,
  COALESCE(np.mint_fee_eth, 0.001)    AS mint_fee_eth,
  COALESCE(np.is_featured, false)     AS is_featured,
  COALESCE(np.is_listed, true)        AS is_listed,
  CASE cn.chain_id
    WHEN 8453 THEN 'Base'
    WHEN 1    THEN 'Ethereum'
    WHEN 84532 THEN 'Base Sepolia'
    ELSE 'Chain ' || cn.chain_id::text
  END AS chain_label
FROM cached_nfts cn
LEFT JOIN nft_pricing np
  ON np.chain_id = cn.chain_id
 AND np.contract_address = cn.contract_address
 AND np.token_id = cn.token_id
WHERE cn.is_active = true
  AND cn.image_url IS NOT NULL
  AND cn.image_url != '';


-- ── 5) VIEW: public_listed_nfts ───────────────────
-- Only NFTs that are listed (visible on the public storefront).
CREATE OR REPLACE VIEW public.public_listed_nfts AS
SELECT * FROM public.public_nft_catalog
WHERE is_listed = true;


-- ── 6) VIEW: public_featured_nfts ─────────────────
-- Only NFTs marked as featured.
CREATE OR REPLACE VIEW public.public_featured_nfts AS
SELECT * FROM public.public_nft_catalog
WHERE is_featured = true AND is_listed = true;


-- ── 7) RLS for the views (views inherit base table policies) ──
-- No additional policies needed — views use cached_nfts + nft_pricing
-- which already have SELECT policies for public reads.


-- ── 8) Seed the nft_seed_sources table if empty ───
-- This inserts all the seeds currently hardcoded in nftSeeds.js
-- into the DB so the admin sync route can read them.
INSERT INTO nft_seed_sources (name, chain, contract_address, collection_slug, fetch_limit, fetch_method, is_active)
VALUES
  ('Regenerates', 'base-mainnet', '0x26C42724eBa22f2d1a2AC5D35b0344bF2f3f8188', 're-gens', 8, 'contract', true),
  ('The Warplets', 'base-mainnet', '0x699727f9e01a822efdcf7333073f0461e5914b4e', 'the-warplets-farcaster', 8, 'contract', true),
  ('NODES', 'base-mainnet', '0x95bc4c2e01c2e2d9e537e7a9fe58187e88dd8019', 'nodes-by-hunter', 8, 'contract', true),
  ('BasePaint', 'base-mainnet', '0xba5e05cb26b78eda3a2f8e3b3814726305dcac83', 'basepaint', 8, 'contract', true),
  ('Chonks', 'base-mainnet', '0x07152bfde079b5319e5308c43fb1dbc9c76cb4f9', 'chonks', 8, 'contract', true),
  ('Lil'' Bangers', 'base-mainnet', '0x1260f90e0b1c482b38b88f26dee17c57615d670b', 'lil-bangers-', 8, 'contract', true),
  ('PrimeApePlanet', 'base-mainnet', '0xa78e2e6f0add0e9b1a9c17cc929270d9ad89478c', 'primeapeplanet-base', 8, 'contract', true),
  ('DebtReliefFam', 'base-mainnet', '0xc659c002f06f980f2caa577748504e9be7f26146', NULL, 8, 'contract', true),
  ('Outcasts', 'base-mainnet', '0x73682a7f47cb707c52cb38192dbb9266d3220315', NULL, 8, 'contract', true),
  ('DX Terminal', 'base-mainnet', '0x41dc69132cce31fcbf6755c84538ca268520246f', NULL, 8, 'contract', true),
  ('OK DEGEN', 'base-mainnet', '0x79f74c164de0305d68e6ad8ca3cdae6c349ed2ee', NULL, 8, 'contract', true),
  ('OK COMPUTERS', 'base-mainnet', '0xce2830932889c7fb5e5206287c43554e673dcc88', NULL, 8, 'contract', true),
  ('Suited Riot', 'base-mainnet', '0x6891698aac0afc51afa4bb639bb895deafa1bacc', NULL, 8, 'contract', true),
  ('BASED MINIS', 'base-mainnet', '0xd683f8f08aca669bf9207d72dceb6bac063c34a2', NULL, 8, 'contract', true),
  ('Kemonokaki', 'base-mainnet', '0xee7d1b184be8185adc7052635329152a4d0cdefa', NULL, 8, 'contract', true),
  ('GRiBBiTS', 'base-mainnet', '0x38b7446dd746a98a101ec0bf1a0717784c4dc69f', NULL, 8, 'contract', true),
  ('NFToshis', 'base-mainnet', '0xbdb1a8772409a0c5eeb347060cbf4b41dd7b2c62', NULL, 8, 'contract', true),
  ('XOOB Genesis', 'base-mainnet', '0xfb029644d347b070565c067afa65556d9bb9b365', 'xoob-genesis', 8, 'contract', true),
  ('Ston(E)lon Age', 'base-mainnet', '0xe42c47a8c30501d5b3f4f682136a3d49248938bc', NULL, 8, 'contract', true),
  ('Apes Bunitori Club', 'base-mainnet', '0xc87e55be39b9b2f7ee4acfda71dcccafe3b77f3a', 'apes-bunitori-club', 8, 'contract', true),
  ('Demons are Hiding in the BASEment', 'base-mainnet', '0x7e50af303a0422ebec6bc198034a2430bbe0195c', NULL, 8, 'contract', true),
  ('Elemental Masks', 'base-mainnet', NULL, 'the-elemental-masks', 6, 'slug', true),
  ('Bored Ape Yacht Club', 'eth-mainnet', '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D', 'boredapeyachtclub', 8, 'contract', true),
  ('Mutant Ape Yacht Club', 'eth-mainnet', '0x60e4d786628fea6478f785a6d7e704777c86a7c6', NULL, 8, 'contract', true),
  ('Bored Ape Kennel Club', 'eth-mainnet', '0xba30e5f9bb24caa003e9f2f0497ad287fdf95623', NULL, 8, 'contract', true),
  ('Otherdeed for Otherside', 'eth-mainnet', '0x34d85c9cdeb23fa97cb08333b511ac86e1c4e258', NULL, 8, 'contract', true),
  ('Otherdeed Expanded', 'eth-mainnet', '0x790B2cF29Ed4F310bf7641f013C65D4560d28371', NULL, 6, 'contract', true),
  ('Pudgy Penguins', 'eth-mainnet', '0xbd3531da5cf5857e7cfaa92426877b022e612cf8', 'pudgypenguins', 8, 'contract', true),
  ('Lil Pudgys', 'eth-mainnet', '0x524cab2ec69124574082676e6f654a18df49a048', 'lilpudgys', 8, 'contract', true),
  ('Azuki', 'eth-mainnet', '0xED5AF388653567Af2F388E6224dC7C4b3241C544', 'azuki', 8, 'contract', true),
  ('Azuki Elementals', 'eth-mainnet', '0xb6a37b5d14d502c3ab0ae6f3a0e058bc9517786e', 'azukielementals', 8, 'contract', true),
  ('Doodles', 'eth-mainnet', '0x8a90cab2b38dba80c64b7734e58ee1db38b8992e', 'doodles-official', 8, 'contract', true),
  ('CloneX', 'eth-mainnet', '0x49cf6f5d44e70224e2e23fdcdd2c053f30ada28b', NULL, 8, 'contract', true),
  ('Moonbirds', 'eth-mainnet', '0x23581767a106ae21c074b2276d25e5c3e136a68b', NULL, 8, 'contract', true),
  ('Cool Cats', 'eth-mainnet', '0x1a92f7381b9f03921564a437210bb9396471050c', NULL, 8, 'contract', true),
  ('World of Women', 'eth-mainnet', '0xe785e82358879f061bc3dcac6f0444462d4b5330', NULL, 8, 'contract', true),
  ('World of Women Galaxy', 'eth-mainnet', '0xf61f24c2d93bf2de187546b14425bf631f28d6dc', NULL, 6, 'contract', true),
  ('Meebits', 'eth-mainnet', '0x7bd29408f11d2bfc23c34f18275bbf23bb716bc7', NULL, 8, 'contract', true),
  ('Art Blocks', 'eth-mainnet', '0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270', NULL, 6, 'contract', true),
  ('VeeFriends', 'eth-mainnet', '0xa3aee8bce55beea1951ef834b99f3ac60d1abeeb', NULL, 6, 'contract', true),
  ('Milady Maker', 'eth-mainnet', '0x5af0d9827e0c53e4799bb226655a1de152a425a5', 'milady', 8, 'contract', true),
  ('Wrapped Cryptopunks', 'eth-mainnet', '0xb7f7f6c52f2e2fdb1963eab30438024864c313f6', NULL, 6, 'contract', true)
ON CONFLICT DO NOTHING;
