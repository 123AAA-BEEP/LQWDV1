# Branding the LIQWD auth emails

By default, Supabase sends auth emails from `noreply@mail.app.supabase.io` with a
"powered by Supabase" footer. Two things make them LIQWD-branded:

1. **Custom SMTP** — so mail sends from *your* domain (this is what removes the
   Supabase sender + footer and fixes deliverability).
2. **These templates** — LIQWD look, copy, and subjects.

Do #1 first; templates alone won't change the sender.

---

## 1. Custom SMTP (sender = `liqwd.ca`)

Recommended provider: **Resend** (simple, generous free tier). Postmark or AWS
SES also work. Standing this up **also unblocks** the RECO expiry reminder emails
and the eBlast products — one provider, three uses.

1. Create the provider account and **add + verify the sending domain**, e.g.
   `mail.liqwd.ca` (a subdomain keeps deliverability isolated from your root).
   Add the **SPF, DKIM, and DMARC** DNS records they give you at your registrar.
2. Create an **SMTP credential / API key**.
3. In Supabase → **Project Settings → Authentication → SMTP Settings** → enable
   custom SMTP and enter:
   - **Host / Port / Username / Password** — from the provider
   - **Sender email**: `no-reply@liqwd.ca` (or `hello@liqwd.ca`)
   - **Sender name**: `LIQWD`
4. Save and send yourself a test (trigger a password reset).

## 2. Templates

Supabase → **Authentication → Email Templates**. For each, paste the matching
file and set the subject:

| Template          | File                   | Subject                       |
| ----------------- | ---------------------- | ----------------------------- |
| Confirm signup    | `confirm-signup.html`  | Confirm your LIQWD account    |
| Magic Link        | `magic-link.html`      | Your LIQWD sign-in link       |
| Reset password    | `reset-password.html`  | Reset your LIQWD password     |

(Invite user / Change email address can reuse the confirm-signup layout with
adjusted copy when needed.)

## 3. URLs (so links are branded + land on liqwd.ca)

Supabase → **Authentication → URL Configuration**:

- **Site URL**: `https://liqwd.ca`
- **Redirect URLs**: add `https://liqwd.ca/**` (and any preview domains you use).

This ensures `{{ .ConfirmationURL }}` points at `liqwd.ca`, not localhost or a
Supabase URL.

---

### Notes
- Templates use only the standard `{{ .ConfirmationURL }}` variable, so they work
  for confirm / magic-link / recovery without edits.
- Styling is inline + table-based for email-client compatibility; the wordmark is
  text (`LIQWD.`) so no hosted image is required.
- When the brand domain decision lands (e.g. a global flagship), update the Site
  URL + sender domain accordingly.
