import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db/supabase';
import { notifyNewSupportMessage } from '@/lib/ntfy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversation_id');

    if (!conversationId) {
      return NextResponse.json({ error: 'Missing conversation_id' }, { status: 400 });
    }

    const sb = getSupabase();

    const { data, error } = await sb
      .from('support_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ messages: data || [] });
  } catch (err) {
    console.error('[support/messages][GET]', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { conversation_id, sender_type, sender_name, message } = body || {};

    if (!conversation_id || !sender_type || !message?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const sb = getSupabase();

    const cleanMessage = message.trim();
    const cleanSenderName = sender_name?.trim() || 'Anonymous';
    const now = new Date().toISOString();

    const { data, error } = await sb
      .from('support_messages')
      .insert({
        conversation_id,
        sender_type,
        sender_name: cleanSenderName,
        message: cleanMessage,
      })
      .select()
      .single();

    if (error) throw error;

    const { error: convoUpdateError } = await sb
      .from('support_conversations')
      .update({ updated_at: now })
      .eq('id', conversation_id);

    if (convoUpdateError) {
      console.error('[support/messages] failed updating conversation timestamp:', convoUpdateError);
    }

    let ntfyResult = null;
    let adminNotifError = null;

    if (sender_type !== 'admin') {
      try {
        ntfyResult = await notifyNewSupportMessage({
          visitorName: cleanSenderName,
          message: cleanMessage,
        });
        console.log('[support/messages] ntfy result:', ntfyResult);
      } catch (e) {
        console.error('[support/messages] ntfy failed hard:', e);
      }

      const { error } = await sb.from('admin_notifications').insert({
        type: 'support',
        title: 'New Support Message',
        body: `From: ${cleanSenderName} — ${cleanMessage.slice(0, 100)}`,
        metadata: {
          conversation_id,
          sender_name: cleanSenderName,
        },
      });

      if (error) {
        adminNotifError = error.message || String(error);
        console.error('[support/messages] admin_notifications insert failed:', error);
      }
    }

    return NextResponse.json({
      message: data,
      ntfy: ntfyResult, // temporary debug
      adminNotifError,
    });
  } catch (err) {
    console.error('[support/messages][POST]', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}