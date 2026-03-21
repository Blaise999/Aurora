// src/lib/ntfy.js
//
// Debug-friendly ntfy sender for Aurora.
// Priority order:
//   1) site_settings.ntfy_topic / site_settings.ntfy_auth_token
//   2) process.env.NTFY_TOPIC / process.env.NTFY_AUTH_TOKEN
//   3) fallback defaults
//
// This version returns rich debug info and logs every attempt.

const NTFY_SERVER = (process.env.NTFY_SERVER || 'https://ntfy.sh').replace(/\/+$/, '');
const ENV_TOPIC = String(process.env.NTFY_TOPIC || 'Aurora').trim();
const ENV_AUTH = String(process.env.NTFY_AUTH_TOKEN || '').trim();

const SITE_URL = String(
  process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    ''
).trim();

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

function cleanHeader(value) {
  return String(value ?? '')
    .replace(/[\r\n]+/g, ' ')
    .trim();
}

function buildAbsoluteUrl(path = '/admin') {
  const safePath = path.startsWith('/') ? path : `/${path}`;
  if (!SITE_URL) return null;

  const base = SITE_URL.startsWith('http') ? SITE_URL : `https://${SITE_URL}`;
  return `${base.replace(/\/+$/, '')}${safePath}`;
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
    return {
      topic: normalizeTopic(ENV_TOPIC),
      auth: ENV_AUTH,
      source: 'env-fallback',
      dbError: err?.message || 'Unknown DB error',
    };
  }
}

export function clearNtfyCache() {
  _cachedTopic = null;
  _cachedAuth = null;
  _topicFetchedAt = 0;
}

export async function getResolvedNtfyConfig() {
  const resolved = await getTopicFromDb();

  return {
    server: NTFY_SERVER,
    envTopic: ENV_TOPIC,
    dbOrCachedTopic: resolved.topic || null,
    topic: normalizeTopic(resolved.topic || ENV_TOPIC),
    topicSource: resolved.source || 'unknown',
    hasAuth: Boolean((resolved.auth || ENV_AUTH || '').trim()),
    authSource: (resolved.auth || '').trim() ? resolved.source : ENV_AUTH ? 'env' : 'none',
    siteUrl: SITE_URL || null,
    dbError: resolved.dbError || null,
  };
}

/**
 * Send a push notification and return full debug info.
 */
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
  let requestUrl = '';
  let topic = normalizeTopic(ENV_TOPIC);
  let topicSource = 'env';
  let hasAuth = false;
  let clickUrl = null;

  try {
    const resolved = await getTopicFromDb();

    topic = normalizeTopic(resolved.topic || ENV_TOPIC);
    topicSource = resolved.source || 'env';

    const authToken = String(resolved.auth || ENV_AUTH || '').trim();
    hasAuth = Boolean(authToken);

    if (!topic) {
      throw new Error('NTFY topic resolved to empty string');
    }

    requestUrl = `${NTFY_SERVER}/${encodeURIComponent(topic)}`;

    clickUrl =
      click && /^https?:\/\//i.test(click)
        ? click
        : click
        ? buildAbsoluteUrl(click)
        : buildAbsoluteUrl('/admin');

    const headers = {
      Title: cleanHeader(title || 'Notification'),
      Priority: cleanHeader(priority || 'default'),
      'Content-Type': 'text/plain; charset=utf-8',
    };

    const safeTags = Array.isArray(tags)
      ? tags.map((t) => cleanHeader(t)).filter(Boolean)
      : [];

    if (safeTags.length) {
      headers.Tags = safeTags.join(',');
    }

    if (clickUrl) {
      headers.Click = clickUrl;
    }

    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const res = await fetch(requestUrl, {
      method: 'POST',
      headers,
      body: String(message ?? ''),
      cache: 'no-store',
    });

    status = res.status;
    responseText = await res.text().catch(() => '');

    if (!res.ok) {
      error = `${res.status}: ${responseText || 'Request failed'}`;
      console.error('[NTFY] send failed', {
        requestUrl,
        topic,
        topicSource,
        hasAuth,
        status,
        responseText,
      });
    } else {
      delivered = true;
      console.log('[NTFY] send success', {
        requestUrl,
        topic,
        topicSource,
        hasAuth,
        status,
      });
    }
  } catch (err) {
    error = err?.message || 'Unknown ntfy error';
    console.error('[NTFY] exception', err);
  }

  try {
    const { getSupabase } = await import('@/lib/db/supabase');
    const sb = getSupabase();

    await sb.from('notification_events').insert({
      channel: 'ntfy',
      topic,
      title: String(title || ''),
      body: String(message || ''),
      priority: String(priority || 'default'),
      delivered,
      error,
      metadata: {
        server: NTFY_SERVER,
        requestUrl,
        topicSource,
        hasAuth,
        clickUrl,
        status,
        responseText,
      },
    });
  } catch (dbErr) {
    console.error('[NTFY] failed to log notification_events', dbErr);
  }

  return {
    delivered,
    error,
    status,
    responseText,
    topic,
    topicSource,
    hasAuth,
    server: NTFY_SERVER,
    requestUrl,
    clickUrl,
  };
}

// ── Notification helpers ─────────────────────────────────────────

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
    title: 'New Mint',
    message: `Token #${tokenId} minted by ${minter}\nPrice: ${price} ETH`,
    priority: 'default',
    tags: ['art', 'tada'],
    click: '/admin',
  });
}

export async function notifyNewPurchase({ nftName, buyer, price, fee, txHash }) {
  return sendNtfyNotification({
    title: 'New Purchase',
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
    title: errorCount > 0 ? 'NFT Sync Warning' : 'NFT Sync Complete',
    message: `${totalInserted} NFTs synced from ${seedsUsed} seeds\n${errorCount} errors\nBatch: ${batchId}`,
    priority: errorCount > 0 ? 'high' : 'default',
    tags: ['package', errorCount > 0 ? 'warning' : 'white_check_mark'],
    click: '/admin',
  });
}