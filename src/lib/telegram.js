// src/lib/telegram.js — Send messages to Telegram group via Bot API
//
// ENV VARS:
//   TELEGRAM_BOT_TOKEN  — from @BotFather
//   TELEGRAM_CHAT_ID    — group/channel chat ID (use @userinfobot or getUpdates)
//
// SETUP:
//   1. Talk to @BotFather on Telegram, create a bot, copy the token
//   2. Add the bot to your group/channel
//   3. Get chat ID: curl https://api.telegram.org/bot<TOKEN>/getUpdates
//      Look for "chat":{"id":-100xxxxx} in the response
//   4. Set env vars TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

/**
 * Send a message to the Telegram group
 * @param {string} text - Message text (supports HTML)
 * @param {object} [opts]
 * @param {string} [opts.parse_mode] - 'HTML' | 'MarkdownV2'
 * @param {boolean} [opts.disable_preview] - Disable link previews
 */
export async function sendTelegramMessage(text, opts = {}) {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn('[TELEGRAM] Missing BOT_TOKEN or CHAT_ID — skipping');
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: opts.parse_mode || 'HTML',
        disable_web_page_preview: opts.disable_preview ?? false,
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      console.error('[TELEGRAM] Send failed:', res.status, err);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[TELEGRAM] Error:', err);
    return false;
  }
}

/** Truncate wallet/email for display */
function truncId(str) {
  if (!str || str.length < 10) return str || '???';
  if (str.includes('@')) return str; // show full email
  return `${str.slice(0, 6)}...${str.slice(-4)}`;
}

/**
 * Notify group about a new mint/purchase
 */
export async function telegramNotifyMint({
  nftName,
  tokenId,
  buyer,
  price,
  fee,
  contractAddress,
  chainId,
}) {
  const total = (parseFloat(price || 0) + parseFloat(fee || 0)).toFixed(4);

  const msg = [
    `🎨 <b>New Mint!</b>`,
    ``,
    `NFT: <b>${nftName || `#${tokenId}`}</b>`,
    `Buyer: <code>${truncId(buyer)}</code>`,
    `Amount: <b>${total} ETH</b>`,
    contractAddress ? `Contract: <code>${truncId(contractAddress)}</code>` : '',
    `Chain: ${chainId === 8453 ? 'Base' : chainId === 1 ? 'Ethereum' : 'Base Sepolia'}`,
  ].filter(Boolean).join('\n');

  return sendTelegramMessage(msg);
}

/**
 * Notify group about a new user signup
 */
export async function telegramNotifyNewUser({ firstName, username, email, walletAddress }) {
  const msg = [
    `👤 <b>New User Joined!</b>`,
    ``,
    `Name: <b>${firstName || '—'}</b>`,
    `Username: <b>${username || '—'}</b>`,
    `Email: <code>${email || '—'}</code>`,
    walletAddress ? `Wallet: <code>${truncId(walletAddress)}</code>` : '',
  ].filter(Boolean).join('\n');

  return sendTelegramMessage(msg);
}

/**
 * Notify group about a wallet connection
 */
export async function telegramNotifyWalletConnect({ firstName, username, walletAddress, walletType }) {
  const msg = [
    `🔗 <b>Wallet Connected!</b>`,
    ``,
    `User: <b>${firstName || username || '—'}</b>`,
    `Wallet: <code>${truncId(walletAddress)}</code>`,
    `Type: ${walletType || 'Unknown'}`,
  ].join('\n');

  return sendTelegramMessage(msg);
}
