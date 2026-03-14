import { NextResponse } from 'next/server'

export async function GET(req, { params }) {
  try {
    const { getSupabase } = await import('@/lib/db/supabase')
    const sb = getSupabase()

    const rowId = params?.id

    if (!rowId) {
      return NextResponse.json({ error: 'Missing collection id' }, { status: 400 })
    }

    const {
      data: { user },
      error: authError,
    } = await sb.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await sb
      .from('profiles')
      .select('id')
      .eq('email', user.email)
      .single()

    if (profileError || !profile?.id) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const { data: nft, error: nftError } = await sb
      .from('user_collections')
      .select('*')
      .eq('id', rowId)
      .eq('profile_id', profile.id)
      .single()

    if (nftError || !nft) {
      return NextResponse.json({ error: 'NFT not found' }, { status: 404 })
    }

    return NextResponse.json({ nft })
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || 'Failed to fetch NFT' },
      { status: 500 }
    )
  }
}