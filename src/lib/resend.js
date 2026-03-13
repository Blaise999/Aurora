// src/lib/resend.js — Send OTP emails via Resend API
//
// ENV VARS:
//   RESEND_API_KEY    — from resend.com dashboard
//   RESEND_FROM_EMAIL — verified sender (e.g., noreply@yourdomain.com)

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

/**
 * Send an OTP code via Resend
 * @param {string} to - Recipient email
 * @param {string} code - 6-digit OTP code
 * @returns {Promise<boolean>}
 */
export async function sendOtpEmail(to, code) {
  if (!RESEND_API_KEY) {
    console.error('[RESEND] Missing RESEND_API_KEY');
    return false;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `AuroraNFT <${FROM_EMAIL}>`,
        to: [to],
        subject: `Your AuroraNFT Login Code: ${code}`,
        html: `
          <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 420px; margin: 0 auto; padding: 40px 24px; background: #070A10; color: #EAF0FF; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="font-size: 24px; font-weight: 700; margin: 0; color: #00E5FF;">AuroraNFT</h1>
              <p style="color: rgba(234,240,255,0.6); font-size: 14px; margin-top: 8px;">Your login verification code</p>
            </div>
            <div style="background: #0E1730; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <p style="font-size: 36px; font-weight: 800; letter-spacing: 8px; margin: 0; color: #00E5FF; font-family: monospace;">${code}</p>
            </div>
            <p style="color: rgba(234,240,255,0.5); font-size: 13px; text-align: center; line-height: 1.5;">
              This code expires in <strong style="color: #EAF0FF;">10 minutes</strong>.<br/>
              If you didn't request this, you can safely ignore it.
            </p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      console.error('[RESEND] Failed:', res.status, err);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[RESEND] Error:', err);
    return false;
  }
}

/**
 * Generate a 6-digit OTP code
 */
export function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
