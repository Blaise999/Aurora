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

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";

/**
 * Send a message to the Telegram group
 * @param {string} text - Message text (supports HTML)
 * @param {object} [opts]
 * @param {string} [opts.parse_mode] - 'HTML' | 'MarkdownV2'
 * @param {boolean} [opts.disable_preview] - Disable link previews
 */
export async function sendTelegramMessage(text, opts = {}) {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn("[TELEGRAM] Missing BOT_TOKEN or CHAT_ID — skipping");
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: opts.parse_mode || "HTML",
        disable_web_page_preview: opts.disable_preview ?? false,
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      console.error("[TELEGRAM] Send failed:", res.status, err);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[TELEGRAM] Error:", err);
    return false;
  }
}

/** Truncate wallet/email for display */
function truncId(str) {
  if (!str || str.length < 10) return str || "???";
  if (str.includes("@")) return str;
  return `${str.slice(0, 6)}...${str.slice(-4)}`;
}

/**
 * Notify group about a new NFT creation (on-chain mint via AuroraCreator)
 */
export async function telegramNotifyMint({
  nftName,
  tokenId,
  buyer,
  fee,
  contractAddress,
  chainId,
}) {
  const feeDisplay = parseFloat(fee || 0).toFixed(6).replace(/\.?0+$/, "");
  const chainLabel = chainId === 8453 ? "Base" : chainId === 1 ? "Ethereum" : "Base Sepolia";
  const explorerBase = chainId === 8453 ? "https://basescan.org" : "https://sepolia.basescan.org";

  const msg = [
    `🎨 <b>New NFT Created!</b>`,
    ``,
    `📌 Name: <b>${nftName || `#${tokenId}`}</b>`,
    `🆔 Token ID: <b>#${tokenId}</b>`,
    `👤 Creator: <code>${truncId(buyer)}</code>`,
    `💰 Mint Fee: <b>${feeDisplay} ETH</b>`,
    contractAddress ? `📄 Contract: <a href="${explorerBase}/address/${contractAddress}">${truncId(contractAddress)}</a>` : "",
    `⛓ Chain: ${chainLabel}`,
    ``,
    `✅ Fee sent to treasury on-chain`,
  ]
    .filter(Boolean)
    .join("\n");

  return sendTelegramMessage(msg);
}

/**
 * Notify group about a new NFT purchase (ETH sent to admin wallet)
 */
export async function telegramNotifyBuy({
  nftName,
  tokenId,
  buyer,
  nftPrice,
  buyFee,
  totalPrice,
  contractAddress,
  chainId,
  txHash,
}) {
  const totalDisplay = parseFloat(totalPrice || 0).toFixed(6).replace(/\.?0+$/, "");
  const priceDisplay = parseFloat(nftPrice || 0).toFixed(6).replace(/\.?0+$/, "");
  const feeDisplay = parseFloat(buyFee || 0).toFixed(6).replace(/\.?0+$/, "");
  const chainLabel = chainId === 8453 ? "Base" : chainId === 1 ? "Ethereum" : "Base Sepolia";
  const explorerBase = chainId === 8453 ? "https://basescan.org" : "https://sepolia.basescan.org";

  const msg = [
    `🛒 <b>New NFT Purchase!</b>`,
    ``,
    `📌 NFT: <b>${nftName || `Token #${tokenId}`}</b>`,
    `👤 Buyer: <code>${truncId(buyer)}</code>`,
    `💵 Price: <b>${priceDisplay} ETH</b>`,
    `💳 Buy Fee: <b>${feeDisplay} ETH</b>`,
    `💰 Total Paid: <b>${totalDisplay} ETH</b>`,
    contractAddress ? `📄 Contract: <code>${truncId(contractAddress)}</code>` : "",
    `⛓ Chain: ${chainLabel}`,
    txHash ? `🔗 Tx: <a href="${explorerBase}/tx/${txHash}">${truncId(txHash)}</a>` : "",
    ``,
    `✅ ETH sent to admin wallet`,
  ]
    .filter(Boolean)
    .join("\n");

  return sendTelegramMessage(msg);
}

/**
 * Notify group about a new user signup
 */
export async function telegramNotifyNewUser({
  firstName,
  username,
  email,
  walletAddress,
}) {
  const msg = [
    `👤 <b>New User Joined!</b>`,
    ``,
    `Name: <b>${firstName || "—"}</b>`,
    `Username: <b>${username || "—"}</b>`,
    `Email: <code>${email || "—"}</code>`,
    walletAddress ? `Wallet: <code>${truncId(walletAddress)}</code>` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return sendTelegramMessage(msg);
}

/**
 * Notify group about a wallet connection
 */
export async function telegramNotifyWalletConnect({
  firstName,
  username,
  walletAddress,
  walletType,
  reconnectMode,
}) {
  const msg = [
    `🔗 <b>Wallet Connected!</b>`,
    ``,
    `User: <b>${firstName || username || "—"}</b>`,
    `Username: <b>${username || "—"}</b>`,
    `Wallet: <code>${truncId(walletAddress)}</code>`,
    `Type: ${walletType || "Unknown"}`,
    `Reconnect: ${reconnectMode ? "Yes" : "No"}`,
  ]
    .filter(Boolean)
    .join("\n");

  return sendTelegramMessage(msg);
}