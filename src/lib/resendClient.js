// src/lib/resendClient.js — shared Resend SDK instance
//
// The rest of the app sends transactional mail with raw fetch (see
// src/lib/resend.js and /api/admin/email). The Inbound (receiving) API,
// however, is only exposed through the official SDK + handles svix webhook
// signature verification, so the inbox feature uses this client.
//
// ENV: RESEND_API_KEY

import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY || '');
