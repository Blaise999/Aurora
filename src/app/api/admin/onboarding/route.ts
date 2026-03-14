// app/api/admin/onboarding/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db/supabase'; // your service-role client

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page')) || 1;
    const limit = Number(searchParams.get('limit')) || 20;
    const search = searchParams.get('search')?.trim();

    const sb = getSupabase(); // ← must use service_role key!

    let query = sb
      .from('wallet_onboarding')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (search) {
      query = query.or(
        `wallet_address.ilike.%${search}%,wallet_type.ilike.%${search}%`
      );
    }

    const { data: records, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      records: records || [],
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (err: any) {
    console.error('Admin onboarding fetch error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal error' },
      { status: 500 }
    );
  }
}