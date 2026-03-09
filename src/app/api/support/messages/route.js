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

    if (sender_type === 'visitor') {
      await sb.from('admin_notifications').insert({
        type: 'support',
        title: 'New Support Message',
        body: 'From: ' + (sender_name || 'Anonymous') + ' - ' + message.slice(0, 100),
        metadata: { conversation_id, sender_name },
      });
      await notifyNewSupportMessage({ visitorName: sender_name, message });
    }

    return NextResponse.json({ message: data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
