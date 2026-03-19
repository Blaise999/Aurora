import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db/supabase';

export async function GET() {
  try {
    const sb = getSupabase();

    const { data, error } = await sb
      .from('support_conversations')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ conversations: data || [] });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { visitor_id, visitor_name, visitor_email, wallet_address } = body || {};

    if (!visitor_id) {
      return NextResponse.json({ error: 'Missing visitor_id' }, { status: 400 });
    }

    const sb = getSupabase();

    const payload = {
      visitor_id,
      visitor_name: visitor_name || 'Anonymous',
      visitor_email: visitor_email || null,
      wallet_address: wallet_address || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await sb
      .from('support_conversations')
      .upsert(payload, { onConflict: 'visitor_id' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ conversation: data });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || 'Failed to create conversation' },
      { status: 500 }
    );
  }
}