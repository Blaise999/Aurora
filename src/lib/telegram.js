// src/lib/telegram.js — Send messages to Telegram group via Bot API

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";

/**
 * Send a message to the Telegram group
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

/** Truncate wallet for display */
function truncId(str) {
  if (!str || str.length < 10) return str || "???";
  if (str.includes("@")) return str;
  return `${str.slice(0, 6)}...${str.slice(-4)}`;
}

/**
 * New NFT created (on-chain mint via AuroraCreator)
 *
 * Example:
 * ────────────────────────────────
 * 🎨 New NFT Minted!
 *
 * 📌 Name: Cosmic Dreamer #1
 * 🆔 Token: #7
 * 👤 Creator: 0x7B2e...4f1A
 * 💰 Fee Paid: 0.005 ETH
 * 📄 Contract: 0x50dd...Fda75
 * ⛓ Network: Base
 *
 * ✅ Minted on-chain successfully
 * ────────────────────────────────
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
  const feeDisplay = parseFloat(fee || 0).toFixed(6).replace(/\.?0+$/, "");
  const listingNum = parseFloat(listingPrice || 0);
  const chainLabel = chainId === 8453 ? "Base" : chainId === 84532 ? "Base Sepolia" : `Chain ${chainId}`;
  const explorer = chainId === 8453 ? "https://basescan.org" : "https://sepolia.basescan.org";

  const msg = [
    `🎨 <b>New NFT Minted!</b>`,
    ``,
    `📌 Name: <b>${nftName || `#${tokenId}`}</b>`,
    `🆔 Token: <b>#${tokenId}</b>`,
    `👤 Creator: <code>${truncId(buyer)}</code>`,
    `💰 Mint Fee: <b>${feeDisplay} ETH</b>`,
    listingNum > 0 ? `🏷 Listed Price: <b>${listingNum.toFixed(6).replace(/\.?0+$/, "")} ETH</b>` : `🏷 Listed Price: <i>Not for sale</i>`,
    contractAddress ? `📄 Contract: <a href="${explorer}/address/${contractAddress}">${truncId(contractAddress)}</a>` : "",
    `⛓ Network: ${chainLabel}`,
    ``,
    `✅ Minted on-chain successfully`,
  ]
    .filter(Boolean)
    .join("\n");

  return sendTelegramMessage(msg);
}

/**
 * NFT purchased (app-only, ETH sent to treasury)
 *
 * Example:
 * ────────────────────────────────
 * 🛒 New NFT Purchased!
 *
 * 📌 NFT: Celestial Fragment #1000
 * 👤 Buyer: 0xC9d3...2e7F
 * 💰 Amount Paid: 0.002 ETH
 * ⛓ Network: Base
 * 🔗 Tx: 0xa1b2...f3e4
 *
 * ✅ Purchase confirmed
 * ────────────────────────────────
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
  const chainLabel = chainId === 8453 ? "Base" : chainId === 84532 ? "Base Sepolia" : `Chain ${chainId}`;
  const explorer = chainId === 8453 ? "https://basescan.org" : "https://sepolia.basescan.org";

  const msg = [
    `🛒 <b>New NFT Purchased!</b>`,
    ``,
    `📌 NFT: <b>${nftName || `Token #${tokenId}`}</b>`,
    `👤 Buyer: <code>${truncId(buyer)}</code>`,
    `💰 Amount Paid: <b>${totalDisplay} ETH</b>`,
    `⛓ Network: ${chainLabel}`,
    txHash ? `🔗 Tx: <a href="${explorer}/tx/${txHash}">${truncId(txHash)}</a>` : "",
    ``,
    `✅ Purchase confirmed`,
  ]
    .filter(Boolean)
    .join("\n");

  return sendTelegramMessage(msg);
}

/**
 * New user signed up
 *
 * Example:
 * ────────────────────────────────
 * 👤 New User Joined!
 *
 * Name: John
 * Username: johndoe
 * Email: john@example.com
 * Wallet: 0x7B2e...4f1A
 * ────────────────────────────────
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
 * Wallet connected
 *
 * Example:
 * ────────────────────────────────
 * 🔗 Wallet Connected!
 *
 * User: johndoe
 * Wallet: 0x7B2e...4f1A
 * Type: MetaMask
 * ────────────────────────────────
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
    `Wallet: <code>${truncId(walletAddress)}</code>`,
    `Type: ${walletType || "Unknown"}`,
    reconnectMode ? `Reconnect: Yes` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return sendTelegramMessage(msg);
}
