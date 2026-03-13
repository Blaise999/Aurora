import { NextResponse } from 'next/server';
import { sendNtfyNotification } from '@/lib/ntfy';

/**
 * GET /api/admin/notifications/test
 * Sends a test push notification via ntfy. Use to verify your setup works.
 */
export async function GET() {
  const delivered = await sendNtfyNotification({
    title: '🔔 Test Notification',
    message: 'AuroraNft ntfy integration is working!',
    priority: 'default',
    tags: ['white_check_mark', 'bell'],
    click: '/admin',
  });

  return NextResponse.json({
    ok: delivered,
    topic: process.env.NTFY_TOPIC || 'aurora-nft-admin',
    server: process.env.NTFY_SERVER || 'https://ntfy.sh',
    message: delivered
      ? 'Test notification sent! Check your ntfy app.'
      : 'Failed to send. Check your NTFY_SERVER and NTFY_TOPIC env vars.',
  });
}
