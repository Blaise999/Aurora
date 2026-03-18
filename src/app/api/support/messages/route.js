import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db/supabase';
import { notifyNewSupportMessage } from '@/lib/ntfy';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversation_id');
    if (!conversationId) return NextResponse.json({ error: 'Missing conversation_id' }, { status: 400 });

    const sb = getSupabase();
    const { data, error } = await sb
      .from('support_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return NextResponse.json({ messages: data || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { conversation_id, sender_type, sender_name, message } = body;
    if (!conversation_id || !sender_type || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const sb = getSupabase();
    const { data, error } = await sb
      .from('support_messages')
      .insert({ conversation_id, sender_type, sender_name: sender_name || 'Anonymous', message })
      .select()
      .single();
    if (error) throw error;

    await sb.from('support_conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversation_id);

    // Fire ntfy + admin_notifications for ANY non-admin message (visitor OR user)
    // Each call is independent — one failing doesn't block the other
    if (sender_type !== 'admin') {
      // ntfy push — always fire, never let it fail silently
      void notifyNewSupportMessage({
        visitorName: sender_name || 'Anonymous',
        message,
      }).catch((e) => console.error('[SUPPORT] ntfy failed:', e));

      // DB notification — independent
      void sb.from('admin_notifications').insert({
        type: 'support',
        title: 'New Support Message',
        body: 'From: ' + (sender_name || 'Anonymous') + ' — ' + message.slice(0, 100),
        metadata: { conversation_id, sender_name },
      }).then(() => {}).catch((e) => console.error('[SUPPORT] admin_notifications insert failed:', e));
    }

    return NextResponse.json({ message: data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
