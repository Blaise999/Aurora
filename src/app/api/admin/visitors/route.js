import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db/supabase';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const sb = getSupabase();
    const { data, error, count } = await sb
      .from('visitor_logs')
      .select('*', { count: 'exact' })
      .order('visited_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;

    return NextResponse.json({ visitors: data || [], total: count });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
