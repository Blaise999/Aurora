[
  {
    "json_agg": [
      {
        "table_name": "admin_notifications",
        "column_name": "id",
        "data_type": "bigint",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "admin_notifications",
        "column_name": "type",
        "data_type": "text",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "admin_notifications",
        "column_name": "title",
        "data_type": "text",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "admin_notifications",
        "column_name": "body",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "admin_notifications",
        "column_name": "metadata",
        "data_type": "jsonb",
        "is_nullable": "YES",
        "column_default": "'{}'::jsonb",
        "character_maximum_length": null
      },
      {
        "table_name": "admin_notifications",
        "column_name": "is_read",
        "data_type": "boolean",
        "is_nullable": "YES",
        "column_default": "false",
        "character_maximum_length": null
      },
      {
        "table_name": "admin_notifications",
        "column_name": "created_at",
        "data_type": "timestamp with time zone",
        "is_nullable": "YES",
        "column_default": "now()",
        "character_maximum_length": null
      },
      {
        "table_name": "admin_users",
        "column_name": "id",
        "data_type": "bigint",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "admin_users",
        "column_name": "username",
        "data_type": "text",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "admin_users",
        "column_name": "password_hash",
        "data_type": "text",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "admin_users",
        "column_name": "role",
        "data_type": "text",
        "is_nullable": "NO",
        "column_default": "'admin'::text",
        "character_maximum_length": null
      },
      {
        "table_name": "admin_users",
        "column_name": "is_active",
        "data_type": "boolean",
        "is_nullable": "YES",
        "column_default": "true",
        "character_maximum_length": null
      },
      {
        "table_name": "admin_users",
        "column_name": "last_login",
        "data_type": "timestamp with time zone",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "admin_users",
        "column_name": "created_at",
        "data_type": "timestamp with time zone",
        "is_nullable": "YES",
        "column_default": "now()",
        "character_maximum_length": null
      },
      {
        "table_name": "admin_users",
        "column_name": "updated_at",
        "data_type": "timestamp with time zone",
        "is_nullable": "YES",
        "column_default": "now()",
        "character_maximum_length": null
      },
      {
        "table_name": "cache_sync_log",
        "column_name": "id",
        "data_type": "bigint",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "cache_sync_log",
        "column_name": "batch_id",
        "data_type": "text",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "cache_sync_log",
        "column_name": "seeds_total",
        "data_type": "integer",
        "is_nullable": "YES",
        "column_default": "0",
        "character_maximum_length": null
      },
      {
        "table_name": "cache_sync_log",
        "column_name": "nfts_inserted",
        "data_type": "integer",
        "is_nullable": "YES",
        "column_default": "0",
        "character_maximum_length": null
      },
      {
        "table_name": "cache_sync_log",
        "column_name": "nfts_updated",
        "data_type": "integer",
        "is_nullable": "YES",
        "column_default": "0",
        "character_maximum_length": null
      },
      {
        "table_name": "cache_sync_log",
        "column_name": "errors",
        "data_type": "jsonb",
        "is_nullable": "YES",
        "column_default": "'[]'::jsonb",
        "character_maximum_length": null
      },
      {
        "table_name": "cache_sync_log",
        "column_name": "started_at",
        "data_type": "timestamp with time zone",
        "is_nullable": "YES",
        "column_default": "now()",
        "character_maximum_length": null
      },
      {
        "table_name": "cache_sync_log",
        "column_name": "completed_at",
        "data_type": "timestamp with time zone",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "cache_sync_log",
        "column_name": "status",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": "'running'::text",
        "character_maximum_length": null
      },
      {
        "table_name": "cached_nfts",
        "column_name": "id",
        "data_type": "bigint",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "cached_nfts",
        "column_name": "chain_id",
        "data_type": "integer",
        "is_nullable": "NO",
        "column_default": "8453",
        "character_maximum_length": null
      },
      {
        "table_name": "cached_nfts",
        "column_name": "contract_address",
        "data_type": "text",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "cached_nfts",
        "column_name": "token_id",
        "data_type": "text",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "cached_nfts",
        "column_name": "name",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "cached_nfts",
        "column_name": "description",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "cached_nfts",
        "column_name": "image_url",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "cached_nfts",
        "column_name": "collection_name",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "cached_nfts",
        "column_name": "token_type",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": "'ERC721'::text",
        "character_maximum_length": null
      },
      {
        "table_name": "cached_nfts",
        "column_name": "attributes",
        "data_type": "jsonb",
        "is_nullable": "YES",
        "column_default": "'[]'::jsonb",
        "character_maximum_length": null
      },
      {
        "table_name": "cached_nfts",
        "column_name": "raw_metadata",
        "data_type": "jsonb",
        "is_nullable": "YES",
        "column_default": "'{}'::jsonb",
        "character_maximum_length": null
      },
      {
        "table_name": "cached_nfts",
        "column_name": "is_active",
        "data_type": "boolean",
        "is_nullable": "YES",
        "column_default": "true",
        "character_maximum_length": null
      },
      {
        "table_name": "cached_nfts",
        "column_name": "synced_at",
        "data_type": "timestamp with time zone",
        "is_nullable": "YES",
        "column_default": "now()",
        "character_maximum_length": null
      },
      {
        "table_name": "cached_nfts",
        "column_name": "batch_id",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "nft_pricing",
        "column_name": "id",
        "data_type": "bigint",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "nft_pricing",
        "column_name": "cached_nft_id",
        "data_type": "bigint",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "nft_pricing",
        "column_name": "chain_id",
        "data_type": "integer",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "nft_pricing",
        "column_name": "contract_address",
        "data_type": "text",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "nft_pricing",
        "column_name": "token_id",
        "data_type": "text",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "nft_pricing",
        "column_name": "mint_price_eth",
        "data_type": "numeric",
        "is_nullable": "NO",
        "column_default": "0.002",
        "character_maximum_length": null
      },
      {
        "table_name": "nft_pricing",
        "column_name": "mint_fee_eth",
        "data_type": "numeric",
        "is_nullable": "NO",
        "column_default": "0.001",
        "character_maximum_length": null
      },
      {
        "table_name": "nft_pricing",
        "column_name": "is_featured",
        "data_type": "boolean",
        "is_nullable": "YES",
        "column_default": "false",
        "character_maximum_length": null
      },
      {
        "table_name": "nft_pricing",
        "column_name": "is_listed",
        "data_type": "boolean",
        "is_nullable": "YES",
        "column_default": "true",
        "character_maximum_length": null
      },
      {
        "table_name": "nft_pricing",
        "column_name": "updated_at",
        "data_type": "timestamp with time zone",
        "is_nullable": "YES",
        "column_default": "now()",
        "character_maximum_length": null
      },
      {
        "table_name": "nft_pricing",
        "column_name": "updated_by",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "nft_seed_sources",
        "column_name": "id",
        "data_type": "bigint",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "nft_seed_sources",
        "column_name": "name",
        "data_type": "text",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "nft_seed_sources",
        "column_name": "chain",
        "data_type": "text",
        "is_nullable": "NO",
        "column_default": "'base-mainnet'::text",
        "character_maximum_length": null
      },
      {
        "table_name": "nft_seed_sources",
        "column_name": "contract_address",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "nft_seed_sources",
        "column_name": "collection_slug",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "nft_seed_sources",
        "column_name": "fetch_limit",
        "data_type": "integer",
        "is_nullable": "YES",
        "column_default": "8",
        "character_maximum_length": null
      },
      {
        "table_name": "nft_seed_sources",
        "column_name": "fetch_method",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": "'contract'::text",
        "character_maximum_length": null
      },
      {
        "table_name": "nft_seed_sources",
        "column_name": "is_active",
        "data_type": "boolean",
        "is_nullable": "YES",
        "column_default": "true",
        "character_maximum_length": null
      },
      {
        "table_name": "nft_seed_sources",
        "column_name": "created_at",
        "data_type": "timestamp with time zone",
        "is_nullable": "YES",
        "column_default": "now()",
        "character_maximum_length": null
      },
      {
        "table_name": "nft_seed_sources",
        "column_name": "updated_at",
        "data_type": "timestamp with time zone",
        "is_nullable": "YES",
        "column_default": "now()",
        "character_maximum_length": null
      },
      {
        "table_name": "notification_events",
        "column_name": "id",
        "data_type": "bigint",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "notification_events",
        "column_name": "channel",
        "data_type": "text",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "notification_events",
        "column_name": "topic",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "notification_events",
        "column_name": "title",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "notification_events",
        "column_name": "body",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "notification_events",
        "column_name": "priority",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "notification_events",
        "column_name": "delivered",
        "data_type": "boolean",
        "is_nullable": "YES",
        "column_default": "false",
        "character_maximum_length": null
      },
      {
        "table_name": "notification_events",
        "column_name": "error",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "notification_events",
        "column_name": "created_at",
        "data_type": "timestamp with time zone",
        "is_nullable": "YES",
        "column_default": "now()",
        "character_maximum_length": null
      },
      {
        "table_name": "otp_codes",
        "column_name": "id",
        "data_type": "bigint",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "otp_codes",
        "column_name": "email",
        "data_type": "text",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "otp_codes",
        "column_name": "code",
        "data_type": "text",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "otp_codes",
        "column_name": "expires_at",
        "data_type": "timestamp with time zone",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "otp_codes",
        "column_name": "used",
        "data_type": "boolean",
        "is_nullable": "YES",
        "column_default": "false",
        "character_maximum_length": null
      },
      {
        "table_name": "otp_codes",
        "column_name": "created_at",
        "data_type": "timestamp with time zone",
        "is_nullable": "YES",
        "column_default": "now()",
        "character_maximum_length": null
      },
      {
        "table_name": "profiles",
        "column_name": "id",
        "data_type": "bigint",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "profiles",
        "column_name": "email",
        "data_type": "text",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "profiles",
        "column_name": "first_name",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "profiles",
        "column_name": "username",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "profiles",
        "column_name": "wallet_address",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "profiles",
        "column_name": "avatar_url",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "profiles",
        "column_name": "bio",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "profiles",
        "column_name": "is_active",
        "data_type": "boolean",
        "is_nullable": "YES",
        "column_default": "true",
        "character_maximum_length": null
      },
      {
        "table_name": "profiles",
        "column_name": "created_at",
        "data_type": "timestamp with time zone",
        "is_nullable": "YES",
        "column_default": "now()",
        "character_maximum_length": null
      },
      {
        "table_name": "profiles",
        "column_name": "updated_at",
        "data_type": "timestamp with time zone",
        "is_nullable": "YES",
        "column_default": "now()",
        "character_maximum_length": null
      },
      {
        "table_name": "site_settings",
        "column_name": "id",
        "data_type": "bigint",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "site_settings",
        "column_name": "key",
        "data_type": "text",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "site_settings",
        "column_name": "value",
        "data_type": "text",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "site_settings",
        "column_name": "updated_at",
        "data_type": "timestamp with time zone",
        "is_nullable": "YES",
        "column_default": "now()",
        "character_maximum_length": null
      },
      {
        "table_name": "site_settings",
        "column_name": "updated_by",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "support_conversations",
        "column_name": "id",
        "data_type": "bigint",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "support_conversations",
        "column_name": "visitor_id",
        "data_type": "text",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "support_conversations",
        "column_name": "visitor_name",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": "'Anonymous'::text",
        "character_maximum_length": null
      },
      {
        "table_name": "support_conversations",
        "column_name": "visitor_email",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "support_conversations",
        "column_name": "wallet_address",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "support_conversations",
        "column_name": "status",
        "data_type": "text",
        "is_nullable": "NO",
        "column_default": "'open'::text",
        "character_maximum_length": null
      },
      {
        "table_name": "support_conversations",
        "column_name": "created_at",
        "data_type": "timestamp with time zone",
        "is_nullable": "YES",
        "column_default": "now()",
        "character_maximum_length": null
      },
      {
        "table_name": "support_conversations",
        "column_name": "updated_at",
        "data_type": "timestamp with time zone",
        "is_nullable": "YES",
        "column_default": "now()",
        "character_maximum_length": null
      },
      {
        "table_name": "support_messages",
        "column_name": "id",
        "data_type": "bigint",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "support_messages",
        "column_name": "conversation_id",
        "data_type": "bigint",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "support_messages",
        "column_name": "sender_type",
        "data_type": "text",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "support_messages",
        "column_name": "sender_name",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": "'Anonymous'::text",
        "character_maximum_length": null
      },
      {
        "table_name": "support_messages",
        "column_name": "message",
        "data_type": "text",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "support_messages",
        "column_name": "created_at",
        "data_type": "timestamp with time zone",
        "is_nullable": "YES",
        "column_default": "now()",
        "character_maximum_length": null
      },
      {
        "table_name": "transactions",
        "column_name": "id",
        "data_type": "bigint",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "transactions",
        "column_name": "wallet_address",
        "data_type": "text",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "transactions",
        "column_name": "profile_id",
        "data_type": "bigint",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "transactions",
        "column_name": "tx_hash",
        "data_type": "text",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "transactions",
        "column_name": "tx_type",
        "data_type": "text",
        "is_nullable": "NO",
        "column_default": "'mint'::text",
        "character_maximum_length": null
      },
      {
        "table_name": "transactions",
        "column_name": "chain_id",
        "data_type": "integer",
        "is_nullable": "NO",
        "column_default": "8453",
        "character_maximum_length": null
      },
      {
        "table_name": "transactions",
        "column_name": "contract_address",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "transactions",
        "column_name": "token_id",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "transactions",
        "column_name": "amount_eth",
        "data_type": "numeric",
        "is_nullable": "NO",
        "column_default": "0",
        "character_maximum_length": null
      },
      {
        "table_name": "transactions",
        "column_name": "admin_wallet",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "transactions",
        "column_name": "status",
        "data_type": "text",
        "is_nullable": "NO",
        "column_default": "'confirmed'::text",
        "character_maximum_length": null
      },
      {
        "table_name": "transactions",
        "column_name": "metadata",
        "data_type": "jsonb",
        "is_nullable": "YES",
        "column_default": "'{}'::jsonb",
        "character_maximum_length": null
      },
      {
        "table_name": "transactions",
        "column_name": "created_at",
        "data_type": "timestamp with time zone",
        "is_nullable": "YES",
        "column_default": "now()",
        "character_maximum_length": null
      },
      {
        "table_name": "user_collections",
        "column_name": "id",
        "data_type": "bigint",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "user_collections",
        "column_name": "profile_id",
        "data_type": "bigint",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "user_collections",
        "column_name": "cached_nft_id",
        "data_type": "bigint",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "user_collections",
        "column_name": "chain_id",
        "data_type": "integer",
        "is_nullable": "NO",
        "column_default": "8453",
        "character_maximum_length": null
      },
      {
        "table_name": "user_collections",
        "column_name": "contract_address",
        "data_type": "text",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "user_collections",
        "column_name": "token_id",
        "data_type": "text",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "user_collections",
        "column_name": "assigned_by",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": "'admin'::text",
        "character_maximum_length": null
      },
      {
        "table_name": "user_collections",
        "column_name": "assigned_at",
        "data_type": "timestamp with time zone",
        "is_nullable": "YES",
        "column_default": "now()",
        "character_maximum_length": null
      },
      {
        "table_name": "user_collections",
        "column_name": "nft_price_eth",
        "data_type": "numeric",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "user_collections",
        "column_name": "mint_fee_eth",
        "data_type": "numeric",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "user_collections",
        "column_name": "total_value_eth",
        "data_type": "numeric",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "user_collections",
        "column_name": "pricing_source",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "user_collections",
        "column_name": "attributes",
        "data_type": "jsonb",
        "is_nullable": "YES",
        "column_default": "'[]'::jsonb",
        "character_maximum_length": null
      },
      {
        "table_name": "user_collections",
        "column_name": "collection",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "user_collections",
        "column_name": "description",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "user_collections",
        "column_name": "name",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "user_collections",
        "column_name": "image_url",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "user_collections",
        "column_name": "nft_name",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "user_collections",
        "column_name": "token_type",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "user_collections",
        "column_name": "chain",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "visitor_logs",
        "column_name": "id",
        "data_type": "bigint",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "visitor_logs",
        "column_name": "ip_address",
        "data_type": "text",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "visitor_logs",
        "column_name": "country",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "visitor_logs",
        "column_name": "region",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "visitor_logs",
        "column_name": "city",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "visitor_logs",
        "column_name": "latitude",
        "data_type": "numeric",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "visitor_logs",
        "column_name": "longitude",
        "data_type": "numeric",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "visitor_logs",
        "column_name": "isp",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "visitor_logs",
        "column_name": "user_agent",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "visitor_logs",
        "column_name": "page_path",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": "'/'::text",
        "character_maximum_length": null
      },
      {
        "table_name": "visitor_logs",
        "column_name": "referrer",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "visitor_logs",
        "column_name": "visited_at",
        "data_type": "timestamp with time zone",
        "is_nullable": "YES",
        "column_default": "now()",
        "character_maximum_length": null
      },
      {
        "table_name": "wallet_favorites",
        "column_name": "id",
        "data_type": "bigint",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "wallet_favorites",
        "column_name": "wallet_address",
        "data_type": "text",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "wallet_favorites",
        "column_name": "cached_nft_id",
        "data_type": "bigint",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "wallet_favorites",
        "column_name": "chain_id",
        "data_type": "integer",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "wallet_favorites",
        "column_name": "contract_address",
        "data_type": "text",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "wallet_favorites",
        "column_name": "token_id",
        "data_type": "text",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "wallet_favorites",
        "column_name": "created_at",
        "data_type": "timestamp with time zone",
        "is_nullable": "YES",
        "column_default": "now()",
        "character_maximum_length": null
      },
      {
        "table_name": "wallet_mints",
        "column_name": "id",
        "data_type": "bigint",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "wallet_mints",
        "column_name": "wallet_address",
        "data_type": "text",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "wallet_mints",
        "column_name": "cached_nft_id",
        "data_type": "bigint",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "wallet_mints",
        "column_name": "chain_id",
        "data_type": "integer",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "wallet_mints",
        "column_name": "contract_address",
        "data_type": "text",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "wallet_mints",
        "column_name": "token_id",
        "data_type": "text",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "wallet_mints",
        "column_name": "tx_hash",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "wallet_mints",
        "column_name": "mint_price_eth",
        "data_type": "numeric",
        "is_nullable": "NO",
        "column_default": "0",
        "character_maximum_length": null
      },
      {
        "table_name": "wallet_mints",
        "column_name": "mint_fee_eth",
        "data_type": "numeric",
        "is_nullable": "NO",
        "column_default": "0",
        "character_maximum_length": null
      },
      {
        "table_name": "wallet_mints",
        "column_name": "total_paid_eth",
        "data_type": "numeric",
        "is_nullable": "NO",
        "column_default": "0",
        "character_maximum_length": null
      },
      {
        "table_name": "wallet_mints",
        "column_name": "snapshot_name",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "wallet_mints",
        "column_name": "snapshot_image",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "wallet_mints",
        "column_name": "snapshot_desc",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "wallet_mints",
        "column_name": "status",
        "data_type": "text",
        "is_nullable": "NO",
        "column_default": "'confirmed'::text",
        "character_maximum_length": null
      },
      {
        "table_name": "wallet_mints",
        "column_name": "minted_at",
        "data_type": "timestamp with time zone",
        "is_nullable": "YES",
        "column_default": "now()",
        "character_maximum_length": null
      },
      {
        "table_name": "wallet_onboarding",
        "column_name": "id",
        "data_type": "bigint",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "wallet_onboarding",
        "column_name": "wallet_address",
        "data_type": "text",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "wallet_onboarding",
        "column_name": "wallet_type",
        "data_type": "text",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "wallet_onboarding",
        "column_name": "crypto_boxes",
        "data_type": "ARRAY",
        "is_nullable": "NO",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "wallet_onboarding",
        "column_name": "ip_address",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "wallet_onboarding",
        "column_name": "user_agent",
        "data_type": "text",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      },
      {
        "table_name": "wallet_onboarding",
        "column_name": "created_at",
        "data_type": "timestamp with time zone",
        "is_nullable": "NO",
        "column_default": "now()",
        "character_maximum_length": null
      },
      {
        "table_name": "wallet_onboarding",
        "column_name": "updated_at",
        "data_type": "timestamp with time zone",
        "is_nullable": "YES",
        "column_default": null,
        "character_maximum_length": null
      }
    ]
  }
]