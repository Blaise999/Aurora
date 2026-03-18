// src/lib/ntfy.js — Push notifications to admin phone via ntfy.sh
//
// The topic is read from site_settings DB first, then falls back to env var.
// This ensures admin-edited topics in the dashboard take effect immediately.

const NTFY_SERVER = process.env.NTFY_SERVER || 'https://ntfy.sh';
const ENV_TOPIC = process.env.NTFY_TOPIC || 'Aurora';
const ENV_AUTH = process.env.NTFY_AUTH_TOKEN || '';

// Cache the DB-fetched topic for 60s to avoid hammering DB on every notification
let _cachedTopic = null;
let _cachedAuth = null;
let _topicFetchedAt = 0;
const TOPIC_CACHE_TTL = 60_000;

async function getTopicFromDb() {
  if (_cachedTopic && Date.now() - _topicFetchedAt < TOPIC_CACHE_TTL) {
    return { topic: _cachedTopic, auth: _cachedAuth };
  }
  try {
    const { getSupabase } = await import('@/lib/db/supabase');
    const sb = getSupabase();
    const { data } = await sb.from('site_settings').select('key, value').in('key', ['ntfy_topic', 'ntfy_auth_token']);
    const map = {};
    (data || []).forEach(r => { map[r.key] = r.value; });
    _cachedTopic = map.ntfy_topic || ENV_TOPIC;
    _cachedAuth = map.ntfy_auth_token || ENV_AUTH;
    _topicFetchedAt = Date.now();
    return { topic: _cachedTopic, auth: _cachedAuth };
  } catch {
    return { topic: ENV_TOPIC, auth: ENV_AUTH };
  }
}

// ── Unicode → Latin1 converter (fixes ByteString error on Vercel) ──
const encodeHeader = (str) => {
  try { return Buffer.from(str, 'utf8').toString('latin1'); }
  catch { return str.replace(/[^\x00-\xff]/g, '?'); }
};

/**
 * Send a push notification to the admin's phone.
 */
export async function sendNtfyNotification({ title, message, priority = 'default', tags = [], click }) {
  let delivered = false;
  let error = null;

  try {
    const { topic, auth } = await getTopicFromDb();
    const url = `${NTFY_SERVER}/${topic}`;
    const headers = {
      'Title': encodeHeader(title),
      'Priority': priority,
    };

    if (tags.length > 0) headers['Tags'] = encodeHeader(tags.join(','));
    if (click) headers['Click'] = click;

    // Use DB auth token first, then env
    const authToken = auth || ENV_AUTH;
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: message,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      error = `${res.status}: ${text}`;
      console.error(`[NTFY] Failed to send to topic "${topic}":`, error);
    } else {
      delivered = true;
    }
  } catch (err) {
    error = err.message;
    console.error('[NTFY] Error sending notification:', err);
  }

  // Log to DB (non-blocking)
  try {
    const { getSupabase } = await import('@/lib/db/supabase');
    const sb = getSupabase();
    await sb.from('notification_events').insert({
      channel: 'ntfy',
      topic: _cachedTopic || ENV_TOPIC,
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

// ── Helper functions ──

export async function notifyNewVisitor({ ip, city, country, page }) {
  const location = [city, country].filter(Boolean).join(', ') || 'Unknown location';
  return sendNtfyNotification({
    title: 'New Visitor',
    message: `IP: ${ip}\nLocation: ${location}\nPage: ${page || '/'}`,
    priority: 'low',
    tags: ['globe_with_meridians', 'eyes'],
    click: '/admin',
  });
}

export async function notifyNewSupportMessage({ visitorName, message }) {
  return sendNtfyNotification({
    title: 'New Support Message',
    message: `From: ${visitorName || 'Anonymous'}\n${(message || '').slice(0, 200)}`,
    priority: 'high',
    tags: ['speech_balloon', 'warning'],
    click: '/admin',
  });
}

export async function notifyNewMint({ tokenId, minter, price }) {
  return sendNtfyNotification({
    title: 'New Mint!',
    message: `Token #${tokenId} minted by ${minter}\nPrice: ${price} ETH`,
    priority: 'default',
    tags: ['art', 'tada'],
    click: '/admin',
  });
}

export async function notifyNewPurchase({ nftName, buyer, price, fee, txHash }) {
  return sendNtfyNotification({
    title: 'New Purchase!',
    message: `${nftName || 'NFT'} bought by ${buyer}\nPrice: ${price} ETH + ${fee} ETH fee\nTx: ${txHash || 'N/A'}`,
    priority: 'high',
    tags: ['money_with_wings', 'tada'],
    click: '/admin',
  });
}

export async function notifyFailedPayment({ buyer, nftName, error: errMsg }) {
  return sendNtfyNotification({
    title: 'Payment Failed',
    message: `Buyer: ${buyer}\nNFT: ${nftName || 'Unknown'}\nError: ${errMsg || 'Unknown error'}`,
    priority: 'high',
    tags: ['warning', 'x'],
    click: '/admin',
  });
}

export async function notifySyncComplete({ totalInserted, seedsUsed, errorCount, batchId }) {
  const emoji = errorCount > 0 ? 'Warning' : 'Done';
  return sendNtfyNotification({
    title: `NFT Sync ${emoji}`,
    message: `${totalInserted} NFTs synced from ${seedsUsed} seeds\n${errorCount} errors\nBatch: ${batchId}`,
    priority: errorCount > 0 ? 'high' : 'default',
    tags: ['package', errorCount > 0 ? 'warning' : 'white_check_mark'],
    click: '/admin',
  });
}
