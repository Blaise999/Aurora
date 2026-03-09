import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db/supabase';

/**
 * GET /api/admin/settings
 * Returns all site settings as a key→value object.
 */
export async function GET() {
  try {
    const sb = getSupabase();
    const { data, error } = await sb.from('site_settings').select('*');
    if (error) throw error;
    const settings = {};
    (data || []).forEach((row) => { settings[row.key] = row.value; });
    return NextResponse.json({ settings });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/settings
 * Body: { key, value, adminWallet }
 *
 * Upserts a single setting. Supports:
 *   minting_fee, sale_active, max_per_wallet, mint_window_hours,
 *   ntfy_topic, treasury_wallet, buy_fee, contract_address
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { key, value, adminWallet } = body;
    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Missing key or value' }, { status: 400 });
    }

    // Whitelist of allowed settings keys
    const allowed = [
      'minting_fee', 'sale_active', 'max_per_wallet', 'mint_window_hours',
      'ntfy_topic', 'treasury_wallet', 'buy_fee', 'contract_address',
    ];
    if (!allowed.includes(key)) {
      return NextResponse.json({ error: `Unknown setting: ${key}` }, { status: 400 });
    }

    const sb = getSupabase();
    const { data, error } = await sb
      .from('site_settings')
      .upsert(
        {
          key,
          value: String(value),
          updated_at: new Date().toISOString(),
          updated_by: adminWallet || null,
        },
        { onConflict: 'key' }
      )
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ setting: data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
