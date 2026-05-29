# Email Inbox — Setup Guide (AuroraNFT)

This implements the "receive & reply to emails inside your admin panel" feature from
`email_inbox_setup.pdf`, **adapted to this codebase's existing conventions**. The code
parts are already done. Below are (A) what was built, (B) how it differs from the PDF and
why, and (C) the manual steps only you can do (DNS, database, Resend dashboard, deploy).

---

## A. What was added to the code

| File | Purpose |
| --- | --- |
| `sql/007-inbound-emails.sql` | `inbound_emails` table + indexes |
| `src/lib/resendClient.js` | Shared Resend **SDK** client (Inbound API needs the SDK) |
| `src/lib/adminAuth.js` | `requireAdmin()` — verifies the `admin_session` cookie |
| `src/app/api/email/inbound/route.js` | Resend `email.received` webhook (verify → fetch body → store → Pushover) |
| `src/app/api/admin/inbox/route.js` | `GET` list emails, `PATCH` mark read |
| `src/app/api/admin/inbox/reply/route.js` | `POST` reply (sent from the address it was received on) |
| `src/app/api/admin/inbox/attachment/route.js` | `GET` a fresh signed download URL for an attachment |
| `src/components/admin/InboxTab.jsx` | The inbox UI (list / reader / reply / attachments) |
| `src/app/admin/page.js` | Registered the `inbox` tab |
| `src/components/admin/AdminShell.jsx` | Added the **Inbox** sidebar item |
| `package.json` | Added `resend` + `svix` dependencies |
| `.env.example` | Documented `RESEND_WEBHOOK_SECRET` + `RESEND_INBOX_ADDRESSES` |

The Inbox appears as a tab in your existing admin panel (sidebar → **Inbox**), not at a
separate `/admin/inbox` URL. That matches how every other admin screen here works
(`AdminShell` + a content map in `src/app/admin/page.js`).

---

## B. How this differs from the PDF (and why)

The PDF assumes a different app shape than yours. I kept the behavior identical but used
your conventions so it actually compiles and is secure:

1. **Auth — cookie, not localStorage.** The PDF reads a bearer token from
   `localStorage` and checks `user.is_admin`. Your app has no such field; admin auth is an
   **HttpOnly `admin_session` JWT cookie** (see `/api/admin/auth`). All inbox routes use
   `requireAdmin()`, and the UI uses plain same-origin `fetch` (the cookie is sent
   automatically). There is no token to manage.

2. **Supabase — `getServiceSupabase()`, not `supabaseAdmin`.** Your service client lives at
   `@/lib/supabase/server`. There is no `supabaseAdmin` export, so the routes use the real one.

3. **Pushover — your existing helper.** The PDF posts to Pushover directly with
   `PUSHOVER_API_TOKEN`. Your project uses `PUSHOVER_APP_TOKEN`/`PUSHOVER_USER_KEY` via
   `sendPushover()` in `src/lib/pushover.js`. The webhook calls that helper.

4. **Reply "from" addresses — env-driven, not hardcoded.** Instead of editing a
   `validFromAddresses` array in source, set `RESEND_INBOX_ADDRESSES` (comma-separated). It
   falls back to `RESEND_SUPPORT_EMAIL` / `RESEND_FROM_EMAIL`.

5. **Webhook signature verification — actually implemented.** The PDF tells you to install
   `svix` and copy a signing secret but never verifies anything. This webhook verifies the
   svix signature with `resend.webhooks.verify()` whenever `RESEND_WEBHOOK_SECRET` is set
   (and rejects bad signatures). If the secret is unset it falls back to plain parsing and
   logs a warning, so first-run setup still works — **set the secret for production.**

6. **RLS stays ON.** The PDF disables row-level security. Your `admin_emails` table (migration
   004) keeps RLS enabled with deny policies and relies on the service-role key bypassing RLS.
   `007` follows that same, safer pattern. (If you prefer the PDF's approach you can
   `alter table inbound_emails disable row level security;` — not required.)

---

## C. Manual steps you must do

### 1. Install dependencies
`resend` and `svix` were added to `package.json`. Install them:
```bash
npm install
```

### 2. Create the database table
Open Supabase → SQL Editor and run the contents of **`sql/007-inbound-emails.sql`**.

### 3. Add the MX record for inbound email
In your domain DNS, add (skip if it already exists):

| Type | Name | Value | Priority |
| --- | --- | --- | --- |
| MX | @ | `inbound.resend.com` | 10 |

> The MX record must have the **lowest** priority number, or mail won't route to Resend.
> If `@` already routes mail elsewhere (Google Workspace, etc.), use a subdomain like
> `support.yourdomain.com` instead so you don't break existing email.

### 4. Set environment variables (Vercel + your local `.env.local`)
You already have `RESEND_API_KEY`, `PUSHOVER_*`, and `SUPABASE_SERVICE_ROLE_KEY`. Add:

```bash
# From Resend → Webhooks (the email.received webhook) — see step 5
RESEND_WEBHOOK_SECRET=whsec_...

# Optional: addresses you may reply FROM (must be verified senders on Resend).
# Defaults to RESEND_SUPPORT_EMAIL / RESEND_FROM_EMAIL if omitted.
RESEND_INBOX_ADDRESSES=support@yourdomain.com,info@yourdomain.com
```

### 5. Set up the Resend webhook
1. Resend Dashboard → **Webhooks** → **Add Webhook**
2. URL: `https://www.yourdomain.com/api/email/inbound`
   **Use the `www.` prefix** — Vercel redirects non-`www` to `www`, and the 307 redirect
   will make Resend's delivery fail otherwise.
3. Event: **`email.received`**
4. Copy the **Signing Secret** into `RESEND_WEBHOOK_SECRET` (step 4) and redeploy.

### 6. Deploy
```bash
git add .
git commit -m "Add email inbox (receive + reply in admin panel)"
git push origin main
```

### 7. Test
Send an email to any address on your domain (e.g. `support@yourdomain.com`). Within a few
seconds you should get a Pushover notification and see it under **Admin → Inbox**. Open it,
read the body/attachments, and send a reply.

---

## Troubleshooting

- **Emails not appearing / "Table may not exist" note from the API** → run
  `sql/007-inbound-emails.sql` (step 2).
- **307 redirect error in Resend** → switch the webhook URL to the `www.` version (step 5).
- **Body shows "(no content)"** → the webhook fetches the body separately via
  `resend.emails.receiving.get()`; make sure `RESEND_API_KEY` can read received emails.
- **401 "Invalid signature" in logs** → the `RESEND_WEBHOOK_SECRET` doesn't match the
  webhook's signing secret. Re-copy it from the Resend dashboard.
- **Attachments don't open** → signed URLs expire by design; the app fetches a fresh one on
  every click, so just click again.

## Notes
- Every email to **any** address on your domain lands in this one inbox.
- Replies are sent **from the address the email was received on** (subject to the
  `RESEND_INBOX_ADDRESSES` allow-list).
- Only attachment **metadata** is stored; files are fetched fresh from Resend on demand.
