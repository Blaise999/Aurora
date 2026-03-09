import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db/supabase';

export async function GET() {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return NextResponse.json({ notifications: data || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
