import { NextResponse } from "next/server";

export const runtime = "nodejs";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const SUPPORT_EMAIL = process.env.RESEND_SUPPORT_EMAIL || "support@auroranft.art";
const LOGO_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/pictures/logo.png`
  : "https://aurora-nft.vercel.app/pictures/logo.png";

function buildBrandedHtml(subject, body, recipientEmail) {
  // Convert newlines to <br> for the body
  const bodyHtml = body.replace(/\n/g, "<br/>");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#050810;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050810;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:linear-gradient(180deg,#0B1121 0%,#0A0F1E 100%);border-radius:20px;border:1px solid rgba(255,255,255,0.06);overflow:hidden;">
        
        <!-- Header with logo -->
        <tr><td style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06);">
          <img src="${LOGO_URL}" alt="AuroraNFT" style="height:52px;max-width:220px;object-fit:contain;" />
        </td></tr>
        
        <!-- Subject line -->
        <tr><td style="padding:28px 32px 0;">
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#EAF0FF;line-height:1.3;">${subject}</h1>
        </td></tr>
        
        <!-- Body -->
        <tr><td style="padding:16px 32px 28px;">
          <div style="font-size:15px;line-height:1.7;color:rgba(234,240,255,0.75);">
            ${bodyHtml}
          </div>
        </td></tr>
        
        <!-- CTA Button -->
        <tr><td style="padding:0 32px 28px;text-align:center;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://auroranft.art'}" 
             style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#22d3ee 0%,#8b5cf6 100%);color:#071019;font-weight:700;font-size:14px;text-decoration:none;border-radius:12px;letter-spacing:0.3px;">
            Visit AuroraNFT
          </a>
        </td></tr>
        
        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
          <p style="margin:0;font-size:12px;color:rgba(234,240,255,0.3);line-height:1.6;">
            This email was sent from <a href="mailto:${SUPPORT_EMAIL}" style="color:#22d3ee;text-decoration:none;">${SUPPORT_EMAIL}</a><br/>
            © ${new Date().getFullYear()} AuroraNFT — Discover & Collect Digital Art
          </p>
        </td></tr>
        
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * POST /api/admin/email
 * Send a branded email from support@auroranft.art
 * Body: { to, subject, body }
 */
export async function POST(req) {
  try {
    // Admin auth check
    const { cookies } = await import("next/headers");
    const { jwtVerify } = await import("jose");
    const cookieStore = await cookies();
    const adminToken = cookieStore.get("admin_session")?.value;

    if (!adminToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(
      process.env.SESSION_SECRET || process.env.ADMIN_SECRET || "aurora-admin-fallback-secret-change-me"
    );
    const { payload } = await jwtVerify(adminToken, secret);
    if (payload.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
    }

    const body = await req.json();
    const { to, subject, body: emailBody } = body;

    if (!to || !subject || !emailBody) {
      return NextResponse.json({ error: "Missing to, subject, or body" }, { status: 400 });
    }

    // Build branded HTML
    const html = buildBrandedHtml(subject, emailBody, to);

    // Send via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `AuroraNFT Support <${SUPPORT_EMAIL}>`,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        reply_to: SUPPORT_EMAIL,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error("[ADMIN EMAIL] Resend error:", result);
      return NextResponse.json(
        { error: result?.message || "Failed to send" },
        { status: res.status }
      );
    }

    // Log to DB
    try {
      const { getSupabase } = await import("@/lib/db/supabase");
      const sb = getSupabase();
      await sb.from("admin_emails").insert({
        to_email: Array.isArray(to) ? to.join(", ") : to,
        subject,
        body: emailBody,
        resend_id: result.id || null,
        sent_at: new Date().toISOString(),
        sent_by: payload.wallet || payload.email || "admin",
      });
    } catch (dbErr) {
      console.error("[ADMIN EMAIL] DB log failed (table may not exist):", dbErr);
    }

    return NextResponse.json({ success: true, id: result.id });
  } catch (err) {
    console.error("[ADMIN EMAIL] error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/email
 * List sent emails from DB
 */
export async function GET(req) {
  try {
    const { cookies } = await import("next/headers");
    const { jwtVerify } = await import("jose");
    const cookieStore = await cookies();
    const adminToken = cookieStore.get("admin_session")?.value;
    if (!adminToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const secret = new TextEncoder().encode(
      process.env.SESSION_SECRET || process.env.ADMIN_SECRET || "aurora-admin-fallback-secret-change-me"
    );
    const { payload } = await jwtVerify(adminToken, secret);
    if (payload.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { getSupabase } = await import("@/lib/db/supabase");
    const sb = getSupabase();
    const { data, error } = await sb
      .from("admin_emails")
      .select("*")
      .order("sent_at", { ascending: false })
      .limit(50);

    if (error) {
      // Table may not exist yet
      return NextResponse.json({ emails: [], note: "Table may not exist. Run migration." });
    }

    return NextResponse.json({ emails: data || [] });
  } catch (err) {
    return NextResponse.json({ emails: [], error: err?.message }, { status: 500 });
  }
}
