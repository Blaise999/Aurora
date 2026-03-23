import { sendPushover } from '@/lib/pushover';

export async function POST() {
  const result = await sendPushover({
    title: '🔔 Test Notification',
    message: 'AuroraNFT push notification is working!',
    priority: 0,
  });

  return Response.json({
    ...result,
    message: result.delivered
      ? 'Test notification sent! Check your phone.'
      : 'Failed to send — check PUSHOVER_USER_KEY and PUSHOVER_APP_TOKEN.',
  });
}
