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

/** Truncate wallet for display */
function truncId(str) {
  if (!str || str.length < 10) return str || "???";
  if (str.includes("@")) return str;
  return `${str.slice(0, 6)}...${str.slice(-4)}`;
}

/** Fetch current ETH price in USD */
async function getEthPriceUsd() {
  const sources = [
    {
      url: "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
      parse: (json) => json?.ethereum?.usd,
    },
    {
      url: "https://api.coinbase.com/v2/exchange-rates?currency=ETH",
      parse: (json) => Number(json?.data?.rates?.USD),
    },
  ];

  for (const src of sources) {
    try {
      const res = await fetch(src.url, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;
      const json = await res.json();
      const price = src.parse(json);
      const usd = Number(price);
      if (Number.isFinite(usd) && usd > 0) return usd;
    } catch {
      continue;
    }
  }
  return null;
}

/** Convert USD to ETH string */
function usdToEth(usdAmount, ethPriceUsd) {
  if (!ethPriceUsd || ethPriceUsd <= 0) return null;
  const eth = usdAmount / ethPriceUsd;
  return eth.toFixed(6).replace(/\.?0+$/, "");
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
  const feeDisplay = parseFloat(fee || 0).toFixed(6).replace(/\.?0+$/, "");
  const listingNum = parseFloat(listingPrice || 0);
  const chainLabel = chainId === 8453 ? "Base" : chainId === 84532 ? "Base Sepolia" : `Chain ${chainId}`;
  const explorer = chainId === 8453 ? "https://basescan.org" : "https://sepolia.basescan.org";

  // Fetch ETH price and calculate $250 equivalent
  let refLine = "";
  try {
    const ethPriceUsd = await getEthPriceUsd();
    if (ethPriceUsd) {
      const equiv = usdToEth(250, ethPriceUsd);
      refLine = `\n💵 $250 ≈ ${equiv} ETH (@ $${ethPriceUsd.toFixed(2)}/ETH)`;
    }
  } catch {}

  const celebration = pickRandom(MINT_CELEBRATIONS);

  const msg = [
    `🎨 <b>New NFT Minted!</b>`,
    ``,
    `<i>${celebration}</i>`,
    ``,
    `📌 Name: <b>${nftName || `#${tokenId}`}</b>`,
    `🆔 Token: <b>#${tokenId}</b>`,
    `👤 Creator: <code>${truncId(buyer)}</code>`,
    `💰 Mint Fee: <b>${feeDisplay} ETH</b>`,
    listingNum > 0 ? `🏷 Listed Price: <b>${listingNum.toFixed(6).replace(/\.?0+$/, "")} ETH</b>` : `🏷 Listed Price: <i>Not for sale</i>`,
    contractAddress ? `📄 Contract: <a href="${explorer}/address/${contractAddress}">${truncId(contractAddress)}</a>` : "",
    `⛓ Network: ${chainLabel}`,
    refLine,
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
  const totalDisplay = parseFloat(totalPrice || 0).toFixed(6).replace(/\.?0+$/, "");
  const chainLabel = chainId === 8453 ? "Base" : chainId === 84532 ? "Base Sepolia" : `Chain ${chainId}`;
  const explorer = chainId === 8453 ? "https://basescan.org" : "https://sepolia.basescan.org";

  // Fetch ETH price and calculate $250 equivalent
  let refLine = "";
  try {
    const ethPriceUsd = await getEthPriceUsd();
    if (ethPriceUsd) {
      const equiv = usdToEth(250, ethPriceUsd);
      const totalUsd = (parseFloat(totalPrice || 0) * ethPriceUsd).toFixed(2);
      refLine = `\n💵 Sale ≈ $${totalUsd} USD | $250 ≈ ${equiv} ETH (@ $${ethPriceUsd.toFixed(2)}/ETH)`;
    }
  } catch {}

  const celebration = pickRandom(BUY_CELEBRATIONS);

  const msg = [
    `🛒 <b>New NFT Purchased!</b>`,
    ``,
    `<i>${celebration}</i>`,
    ``,
    `📌 NFT: <b>${nftName || `Token #${tokenId}`}</b>`,
    `👤 Buyer: <code>${truncId(buyer)}</code>`,
    `💰 Amount Paid: <b>${totalDisplay} ETH</b>`,
    `⛓ Network: ${chainLabel}`,
    txHash ? `🔗 Tx: <a href="${explorer}/tx/${txHash}">${truncId(txHash)}</a>` : "",
    refLine,
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
