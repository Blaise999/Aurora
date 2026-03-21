// src/lib/ntfy.js
const NTFY_SERVER = (process.env.NTFY_SERVER || 'https://ntfy.sh').replace(/\/+$/, '');
const ENV_TOPIC = (process.env.NTFY_TOPIC || 'Aurora').trim();
const ENV_AUTH = (process.env.NTFY_AUTH_TOKEN || '').trim();
const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    '').trim();

let _cachedTopic = null;
let _cachedAuth = null;
let _topicFetchedAt = 0;
const TOPIC_CACHE_TTL = 60_000;

function normalizeTopic(topic) {
  return String(topic || '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
}

function absoluteAdminUrl(path = '/admin') {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!SITE_URL) return undefined;

  const base = SITE_URL.startsWith('http') ? SITE_URL : `https://${SITE_URL}`;
  return `${base.replace(/\/+$/, '')}${cleanPath}`;
}

// Headers in fetch must be safe ASCII-ish strings.
// Do not try to force latin1 conversion; just strip unsupported chars.
function sanitizeHeaderValue(value) {
  return String(value ?? '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/[^\x20-\x7E]/g, '')
    .trim();
}

async function getTopicFromDb() {
  if (_cachedTopic && Date.now() - _topicFetchedAt < TOPIC_CACHE_TTL) {
    return {
      topic: _cachedTopic,
      auth: _cachedAuth,
      source: 'cache',
    };
  }

  try {
    const { getSupabase } = await import('@/lib/db/supabase');
    const sb = getSupabase();

    const { data, error } = await sb
      .from('site_settings')
      .select('key, value')
      .in('key', ['ntfy_topic', 'ntfy_auth_token']);

    if (error) throw error;

    const map = {};
    for (const row of data || []) {
      map[row.key] = row.value;
    }

    _cachedTopic = normalizeTopic(map.ntfy_topic || ENV_TOPIC);
    _cachedAuth = String(map.ntfy_auth_token || ENV_AUTH || '').trim();
    _topicFetchedAt = Date.now();

    return {
      topic: _cachedTopic,
      auth: _cachedAuth,
      source: 'db',
    };
  } catch (err) {
    const fallbackTopic = normalizeTopic(ENV_TOPIC);
    return {
      topic: fallbackTopic,
      auth: ENV_AUTH,
      source: 'env',
      fallbackError: err?.message || 'Unknown DB error',
    };
  }
}

export async function sendNtfyNotification({
  title,
  message,
  priority = 'default',
  tags = [],
  click,
}) {
  let delivered = false;
  let error = null;
  let status = null;
  let responseText = '';
  let resolvedTopic = normalizeTopic(ENV_TOPIC);
  let resolvedAuth = '';
  let topicSource = 'env';

  try {
    const resolved = await getTopicFromDb();
    resolvedTopic = normalizeTopic(resolved.topic || ENV_TOPIC);
    resolvedAuth = String(resolved.auth || '').trim();
    topicSource = resolved.source || 'env';

    if (!resolvedTopic) {
      throw new Error('NTFY topic is empty');
    }

    const url = `${NTFY_SERVER}/${encodeURIComponent(resolvedTopic)}`;
    const headers = {
      Title: sanitizeHeaderValue(title || 'Notification'),
      Priority: sanitizeHeaderValue(priority || 'default'),
      'Content-Type': 'text/plain; charset=utf-8',
    };

    const safeTags = Array.isArray(tags)
      ? tags.map((t) => sanitizeHeaderValue(t)).filter(Boolean)
      : [];

    if (safeTags.length) headers.Tags = safeTags.join(',');

    const clickUrl =
      click && /^https?:\/\//i.test(click)
        ? click
        : click
        ? absoluteAdminUrl(click)
        : absoluteAdminUrl('/admin');

    if (clickUrl) headers.Click = clickUrl;

    const authToken = resolvedAuth || ENV_AUTH;
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: String(message ?? ''),
      cache: 'no-store',
    });

    status = res.status;
    responseText = await res.text().catch(() => '');

    if (!res.ok) {
      error = `${res.status}: ${responseText || 'ntfy request failed'}`;
      console.error('[NTFY] Failed', {
        url,
        topic: resolvedTopic,
        topicSource,
        status: res.status,
        responseText,
      });
    } else {
      delivered = true;
      console.log('[NTFY] Delivered', {
        url,
        topic: resolvedTopic,
        topicSource,
        status: res.status,
      });
    }
  } catch (err) {
    error = err?.message || 'Unknown ntfy error';
    console.error('[NTFY] Error sending notification:', err);
  }

  try {
    const { getSupabase } = await import('@/lib/db/supabase');
    const sb = getSupabase();

    await sb.from('notification_events').insert({
      channel: 'ntfy',
      topic: resolvedTopic || ENV_TOPIC,
      title: String(title || ''),
      body: String(message || ''),
      priority: String(priority || 'default'),
      delivered,
      error,
      metadata: {
        status,
        responseText,
        topicSource,
        server: NTFY_SERVER,
      },
    });
  } catch (dbErr) {
    console.error('[NTFY] Failed to log notification event:', dbErr);
  }

  return {
    delivered,
    error,
    status,
    responseText,
    topic: resolvedTopic,
    topicSource,
    server: NTFY_SERVER,
  };
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
    message: `From: ${visitorName || 'Anonymous'}\n${String(message || '').slice(0, 200)}`,
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
  return sendNtfyNotification({
    title: errorCount > 0 ? 'NFT Sync Warning' : 'NFT Sync Done',
    message: `${totalInserted} NFTs synced from ${seedsUsed} seeds\n${errorCount} errors\nBatch: ${batchId}`,
    priority: errorCount > 0 ? 'high' : 'default',
    tags: ['package', errorCount > 0 ? 'warning' : 'white_check_mark'],
    click: '/admin',
  });
}