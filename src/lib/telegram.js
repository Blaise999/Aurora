// src/lib/telegram.js — Send messages to Telegram group via Bot API

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";

/**
 * Send a message to the Telegram group
 */
export async function sendTelegramMessage(text, opts = {}) {
  if (!BOT_TOKEN || !CHAT_ID) {
    const msg = "[TELEGRAM] Missing BOT_TOKEN or CHAT_ID — skipping";
    console.warn(msg);
    throw new Error(msg);
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
      const errBody = await res.text().catch(() => "");
      const errMsg = `Telegram API ${res.status}: ${errBody}`;
      console.error("[TELEGRAM]", errMsg);
      throw new Error(errMsg);
    }

    return true;
  } catch (err) {
    console.error("[TELEGRAM] Error:", err?.message || err);
    throw err;
  }
}

/** Truncate wallet / tx / contract for display */
function truncId(str) {
  if (!str || str.length < 10) return str || "???";
  if (str.includes("@")) return str;
  return `${str.slice(0, 6)}...${str.slice(-4)}`;
}

/** Escape HTML since Telegram parse_mode is HTML */
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Format ETH consistently */
function formatEth(value) {
  const num = Number.parseFloat(value || 0);
  if (!Number.isFinite(num) || num <= 0) return "0";
  return num.toFixed(6).replace(/\.?0+$/, "");
}

// ── Randomized admin celebration messages ──

const MINT_CELEBRATIONS = [
  "Another masterpiece hits the blockchain! 🔥",
  "The chain just got a little more beautiful 🎨",
  "A new creator joins the movement! 💎",
  "Fresh art just dropped on-chain! ✨",
  "The Aurora collection grows stronger 🌌",
  "On-chain forever. This is the way 🚀",
  "New NFT alert — the culture is alive! 🎭",
  "Just witnessed a mint in real-time 👀",
  "The creativity never stops around here! 🎯",
  "Blockchain art at its finest 💫",
  "Someone just immortalized their art on-chain 🏆",
  "New art, new vibes, new era 🌊",
];

const BUY_CELEBRATIONS = [
  "Bag secured! Another collector just copped 💰",
  "Someone knows a good deal when they see one 🎯",
  "The collection just found a new home! 🏠",
  "Smart money moves right here 📈",
  "Another NFT just changed hands! 🤝",
  "Collector mode activated 🔥",
  "Revenue just hit the treasury 💎",
  "New sale just dropped — the market is moving! 📊",
  "The people are buying — the culture is real 🌟",
  "Someone just upgraded their collection! 🚀",
  "That NFT was meant for them 🎨",
  "Another happy collector! 💫",
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * New NFT created (on-chain mint via AuroraCreator)
 */
export async function telegramNotifyMint({
  nftName,
  tokenId,
  buyer,
  fee,
  listingPrice,
  contractAddress,
  chainId,
}) {
  const feeDisplay = formatEth(fee);
  const listingNum = Number.parseFloat(listingPrice || 0);
  const listingDisplay = formatEth(listingPrice);
  const chainLabel =
    chainId === 8453
      ? "Base"
      : chainId === 84532
        ? "Base Sepolia"
        : `Chain ${chainId}`;
  const explorer =
    chainId === 8453
      ? "https://basescan.org"
      : "https://sepolia.basescan.org";

  const celebration = pickRandom(MINT_CELEBRATIONS);

  const msg = [
    `🎨 <b>New NFT Minted!</b>`,
    ``,
    `<i>${escapeHtml(celebration)}</i>`,
    ``,
    `📌 Name: <b>${escapeHtml(nftName || `#${tokenId}`)}</b>`,
    `🆔 Token: <b>#${escapeHtml(tokenId)}</b>`,
    `👤 Creator: <code>${escapeHtml(truncId(buyer))}</code>`,
    `💰 Mint Fee: <b>${feeDisplay} ETH</b>`,
    listingNum > 0
      ? `🏷 Listed Price: <b>${listingDisplay} ETH</b>`
      : `🏷 Listed Price: <i>Not for sale</i>`,
    contractAddress
      ? `📄 Contract: <a href="${explorer}/address/${contractAddress}">${escapeHtml(truncId(contractAddress))}</a>`
      : "",
    `⛓ Network: ${escapeHtml(chainLabel)}`,
    ``,
    `✅ Minted on-chain successfully`,
  ]
    .filter(Boolean)
    .join("\n");

  return sendTelegramMessage(msg);
}

/**
 * NFT purchased (app-only, ETH sent to treasury)
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
  const totalDisplay = formatEth(totalPrice || nftPrice || 0);
  const nftPriceDisplay = formatEth(nftPrice || 0);
  const buyFeeDisplay = formatEth(buyFee || 0);

  const chainLabel =
    chainId === 8453
      ? "Base"
      : chainId === 84532
        ? "Base Sepolia"
        : `Chain ${chainId}`;
  const explorer =
    chainId === 8453
      ? "https://basescan.org"
      : "https://sepolia.basescan.org";

  const celebration = pickRandom(BUY_CELEBRATIONS);

  const msg = [
    `🛒 <b>New NFT Purchased!</b>`,
    ``,
    `<i>${escapeHtml(celebration)}</i>`,
    ``,
    `📌 NFT: <b>${escapeHtml(nftName || `Token #${tokenId}`)}</b>`,
    tokenId ? `🆔 Token: <b>#${escapeHtml(tokenId)}</b>` : "",
    `👤 Buyer: <code>${escapeHtml(truncId(buyer))}</code>`,
    `💰 Amount Paid: <b>${totalDisplay} ETH</b>`,
    nftPriceDisplay !== "0" ? `🏷 NFT Price: <b>${nftPriceDisplay} ETH</b>` : "",
    buyFeeDisplay !== "0" ? `🧾 Fee: <b>${buyFeeDisplay} ETH</b>` : "",
    contractAddress
      ? `📄 Contract: <a href="${explorer}/address/${contractAddress}">${escapeHtml(truncId(contractAddress))}</a>`
      : "",
    `⛓ Network: ${escapeHtml(chainLabel)}`,
    txHash
      ? `🔗 Tx: <a href="${explorer}/tx/${txHash}">${escapeHtml(truncId(txHash))}</a>`
      : "",
    ``,
    `✅ Purchase confirmed`,
  ]
    .filter(Boolean)
    .join("\n");

  return sendTelegramMessage(msg);
}

/**
 * New user signed up
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
    `Name: <b>${escapeHtml(firstName || "—")}</b>`,
    `Username: <b>${escapeHtml(username || "—")}</b>`,
    `Email: <code>${escapeHtml(email || "—")}</code>`,
    walletAddress
      ? `Wallet: <code>${escapeHtml(truncId(walletAddress))}</code>`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return sendTelegramMessage(msg);
}

/**
 * Wallet connected
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
    `User: <b>${escapeHtml(firstName || username || "—")}</b>`,
    `Wallet: <code>${escapeHtml(truncId(walletAddress))}</code>`,
    `Type: ${escapeHtml(walletType || "Unknown")}`,
    reconnectMode ? `Reconnect: Yes` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return sendTelegramMessage(msg);
}