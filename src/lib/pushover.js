// src/lib/pushover.js — Push notifications via Pushover API
//
// ENV VARS:
//   PUSHOVER_USER_KEY  — your Pushover user/group key
//   PUSHOVER_APP_TOKEN — your Pushover application API token
//
// SETUP:
//   1. Create account at https://pushover.net
//   2. Create an application at https://pushover.net/apps/build
//   3. Copy your User Key and Application Token
//   4. Set env vars PUSHOVER_USER_KEY and PUSHOVER_APP_TOKEN

const PUSHOVER_USER = process.env.PUSHOVER_USER_KEY || "";
const PUSHOVER_TOKEN = process.env.PUSHOVER_APP_TOKEN || "";

/**
 * Send a push notification via Pushover
 */
export async function sendPushover({
  title,
  message,
  priority = 0,
  url,
  url_title,
}) {
  if (!PUSHOVER_USER || !PUSHOVER_TOKEN) {
    console.warn("[PUSHOVER] Missing USER_KEY or APP_TOKEN — skipping");
    return { delivered: false, error: "Not configured" };
  }

  try {
    const body = {
      token: PUSHOVER_TOKEN,
      user: PUSHOVER_USER,
      title: String(title || "Notification"),
      message: String(message || ""),
      priority,
      html: 1,
    };

    if (url) body.url = url;
    if (url_title) body.url_title = url_title;

    const res = await fetch("https://api.pushover.net/1/messages.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (data.status === 1) {
      console.log("[PUSHOVER] sent:", title);
      return { delivered: true };
    }

    console.error("[PUSHOVER] failed:", data);
    return { delivered: false, error: data.errors?.join(", ") || "Failed" };
  } catch (err) {
    console.error("[PUSHOVER] error:", err);
    return { delivered: false, error: err?.message || "Unknown error" };
  }
}

// ── Notification helpers ──

export async function notifyMint({
  nftName,
  tokenId,
  creator,
  fee,
  mintPrice,
  price,
  contractAddress,
}) {
  const resolvedCreator = creator || "Unknown";
  const resolvedFee = fee ?? mintPrice ?? price ?? "?";

  return sendPushover({
    title: "🎨 New NFT Minted",
    message:
      `<b>${nftName || "NFT Minted"}</b> (#${tokenId ?? "?"})\n` +
      `Creator: ${resolvedCreator}\n` +
      `Fee: ${resolvedFee} ETH` +
      (contractAddress ? `\nContract: ${contractAddress}` : ""),
    priority: 0,
  });
}

export async function notifyPurchase({ nftName, buyer, totalPrice, txHash }) {
  return sendPushover({
    title: "🛒 New Purchase",
    message:
      `<b>${nftName || "NFT Purchased"}</b>\n` +
      `Buyer: ${buyer || "Unknown"}\n` +
      `Paid: ${totalPrice ?? "?"} ETH` +
      (txHash ? `\nTx: ${txHash}` : ""),
    priority: 0,
  });
}

export async function notifyNewUser({ email, username }) {
  return sendPushover({
    title: "👤 New User",
    message: `${username || "—"} (${email || "—"})`,
    priority: -1,
  });
}

export async function notifySupport({ visitorName, message: msg }) {
  return sendPushover({
    title: "💬 Support Message",
    message: `From: ${visitorName || "Anonymous"}\n${String(msg || "").slice(0, 200)}`,
    priority: 1,
  });
}

export async function notifySync({ totalInserted, errorCount }) {
  return sendPushover({
    title: errorCount > 0 ? "⚠️ Sync Warning" : "✅ Sync Complete",
    message: `${totalInserted || 0} NFTs synced. ${errorCount || 0} errors.`,
    priority: errorCount > 0 ? 0 : -1,
  });
}

export async function notifyVisitor({ ip, city, country, page }) {
  const location = [city, country].filter(Boolean).join(", ") || "Unknown";

  return sendPushover({
    title: "👀 New Visitor",
    message: `IP: ${ip || "Unknown"}\nLocation: ${location}\nPage: ${page || "/"}`,
    priority: -2,
  });
}