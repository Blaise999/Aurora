// src/lib/ntfy.js — Push notifications to admin phone via ntfy.sh
// Admin subscribes to the topic on ntfy app (Android/iOS/Web).
//
// ENV VARS:
//   NTFY_SERVER  — ntfy server URL (default: https://ntfy.sh)
//   NTFY_TOPIC   — notification topic (default: aurora-nft-admin)
//
// HOW TO TEST LOCALLY:
//   1. Install ntfy app on your phone (Android: Play Store, iOS: App Store)
//   2. Subscribe to your topic (e.g. aurora-nft-admin)
//   3. Run: curl -d "Test message" https://ntfy.sh/aurora-nft-admin
//   4. Or hit /api/admin/notifications/test in your browser
//
// IN PRODUCTION:
//   Set NTFY_SERVER and NTFY_TOPIC in your .env.local or hosting env.
//   For private topics, add NTFY_AUTH_TOKEN and use Bearer auth.

const NTFY_SERVER = process.env.NTFY_SERVER || 'https://ntfy.sh';
const NTFY_TOPIC = process.env.NTFY_TOPIC || 'aurora-nft-admin';

/**
 * Send a push notification to the admin's phone.
 *
 * @param {object} opts
 * @param {string} opts.title - Notification title
 * @param {string} opts.message - Notification body
 * @param {string} [opts.priority] - 'urgent' | 'high' | 'default' | 'low' | 'min'
 * @param {string[]} [opts.tags] - Emoji tags e.g. ['globe_with_meridians','eyes']
 * @param {string} [opts.click] - URL to open on click
 */
export async function sendNtfyNotification({ title, message, priority = 'default', tags = [], click }) {
  let delivered = false;
  let error = null;

  try {
    const url = `${NTFY_SERVER}/${NTFY_TOPIC}`;
    const headers = {
      'Title': title,
      'Priority': priority,
    };

    if (tags.length > 0) headers['Tags'] = tags.join(',');
    if (click) headers['Click'] = click;

    // Optional auth token for private topics
    const authToken = process.env.NTFY_AUTH_TOKEN;
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: message,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      error = `${res.status}: ${text}`;
      console.error('[NTFY] Failed to send:', error);
    } else {
      delivered = true;
    }
  } catch (err) {
    error = err.message;
    console.error('[NTFY] Error sending notification:', err);
  }

  // Log to notification_events table (non-blocking)
  try {
    const { getSupabase } = await import('@/lib/db/supabase');
    const sb = getSupabase();
    await sb.from('notification_events').insert({
      channel: 'ntfy',
      topic: NTFY_TOPIC,
      title,
      body: message,
      priority,
      delivered,
      error,
    });
  } catch {
    // Table may not exist yet
  }

  return delivered;
}

/**
 * Notify admin about a new visitor
 */
export async function notifyNewVisitor({ ip, city, country, page }) {
  const location = [city, country].filter(Boolean).join(', ') || 'Unknown location';
  return sendNtfyNotification({
    title: '👁️ New Visitor',
    message: `IP: ${ip}\nLocation: ${location}\nPage: ${page || '/'}`,
    priority: 'low',
    tags: ['globe_with_meridians', 'eyes'],
    click: '/admin',
  });
}

/**
 * Notify admin about a new support message
 */
export async function notifyNewSupportMessage({ visitorName, message }) {
  return sendNtfyNotification({
    title: '💬 New Support Message',
    message: `From: ${visitorName || 'Anonymous'}\n${message.slice(0, 200)}`,
    priority: 'high',
    tags: ['speech_balloon', 'warning'],
    click: '/admin',
  });
}

/**
 * Notify admin about a new mint (Aurora contract)
 */
export async function notifyNewMint({ tokenId, minter, price }) {
  return sendNtfyNotification({
    title: '🎨 New Mint!',
    message: `Token #${tokenId} minted by ${minter}\nPrice: ${price} ETH`,
    priority: 'default',
    tags: ['art', 'tada'],
    click: '/admin',
  });
}

/**
 * Notify admin about a platform purchase
 */
export async function notifyNewPurchase({ nftName, buyer, price, fee, txHash }) {
  return sendNtfyNotification({
    title: '💰 New Purchase!',
    message: `${nftName || 'NFT'} bought by ${buyer}\nPrice: ${price} ETH + ${fee} ETH fee\nTx: ${txHash || 'N/A'}`,
    priority: 'high',
    tags: ['money_with_wings', 'tada'],
    click: '/admin',
  });
}

/**
 * Notify admin about a failed payment
 */
export async function notifyFailedPayment({ buyer, nftName, error: errMsg }) {
  return sendNtfyNotification({
    title: '❌ Payment Failed',
    message: `Buyer: ${buyer}\nNFT: ${nftName || 'Unknown'}\nError: ${errMsg || 'Unknown error'}`,
    priority: 'high',
    tags: ['warning', 'x'],
    click: '/admin',
  });
}

/**
 * Notify admin about a completed NFT cache sync
 */
export async function notifySyncComplete({ totalInserted, seedsUsed, errorCount, batchId }) {
  const emoji = errorCount > 0 ? '⚠️' : '✅';
  return sendNtfyNotification({
    title: `${emoji} NFT Sync Complete`,
    message: `${totalInserted} NFTs synced from ${seedsUsed} seeds\n${errorCount} errors\nBatch: ${batchId}`,
    priority: errorCount > 0 ? 'high' : 'default',
    tags: ['package', errorCount > 0 ? 'warning' : 'white_check_mark'],
    click: '/admin',
  });
}
