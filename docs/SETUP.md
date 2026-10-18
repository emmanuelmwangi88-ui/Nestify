# Nestify setup

Project URL: `https://bpowsaqvxfsvbcdkjcbp.supabase.co` (already set in `assets/js/config.js`; the anon key there is public by design).

## 1. Database

Run these in order in Supabase → SQL Editor (each is safe to run twice):

1. `supabase/migrations/20261016000000_open_reviews_privacy_payments.sql` (open reviews, privacy, contact flow)
2. `supabase/migrations/20261017000000_admin_console_and_fixes.sql` (completes anything the first file missed, and adds the admin console functions). It runs as one transaction, so it either applies fully or shows an error and changes nothing.

Do not run `supabase/schema.sql` on a project that already has data.

### Super admin
Make your own account an admin (sign up on `agent.html` first), then open `admin.html`:

```sql
update public.profiles set role='admin', verification_status='verified' where email='you@example.com';
```

The admin console lets you verify, reject, suspend and message agents, grant or end plans, suspend or remove listings, handle reports, hide reviews, view all payments, edit the support contact and see an audit log of every change. You can promote other admins from an agent's Manage panel.

In **Authentication → URL Configuration** add your deployed site URL (and `http://localhost:8000`).

## 2. M-Pesa Daraja secrets

You already tested the Express (STK) simulator, so you have a Daraja app. Collect:

| Secret | Where to find it |
|---|---|
| `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET` | developer.safaricom.co.ke → My Apps → your app |
| `MPESA_SHORTCODE` | Sandbox: `174379`. Production: your Paybill/Till number |
| `MPESA_PASSKEY` | Sandbox: shown under APIs → M-Pesa Express → Simulate. Production: emailed by Safaricom (Go Live) |
| `MPESA_ENV` | `sandbox` or `production` |
| `MPESA_CALLBACK_SECRET` | any long random string you invent (`openssl rand -hex 24`). **Required in production** |
| `MPESA_TRANSACTION_TYPE` / `MPESA_PARTY_B` | only for Till numbers: `CustomerBuyGoodsOnline` and your till |

Set them (CLI) or in the dashboard under **Edge Functions → Secrets**:

```bash
supabase login
supabase link --project-ref bpowsaqvxfsvbcdkjcbp
supabase secrets set \
  MPESA_ENV=sandbox \
  MPESA_CONSUMER_KEY=xxxx \
  MPESA_CONSUMER_SECRET=xxxx \
  MPESA_SHORTCODE=174379 \
  MPESA_PASSKEY=xxxx \
  MPESA_CALLBACK_SECRET=$(openssl rand -hex 24)
supabase secrets set REVIEW_SALT=$(openssl rand -hex 24)
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically. Never put any of these in `assets/js/config.js`.

Deploy (JWT verification must be OFF, Safaricom and signed-out reviewers have no Supabase login):

```bash
supabase functions deploy daraja --no-verify-jwt
supabase functions deploy submit-review --no-verify-jwt
```

The callback URL is built for you as
`https://bpowsaqvxfsvbcdkjcbp.supabase.co/functions/v1/daraja/callback?s=<MPESA_CALLBACK_SECRET>`; Express needs no callback registration in the portal, it is sent with each request.

### Test in sandbox
Agent portal → Subscription → pick a plan → accept agreement → pay. In sandbox use your own number in the STK simulator; the sandbox callback reports Safaricom's shared test number, so the phone check is relaxed. Watch `supabase functions logs daraja` if anything stalls. Status polling reconciles a missed callback via the STK Query API.

### Go live
1. Complete Safaricom Go Live and get your production shortcode, passkey and production app keys.
2. `supabase secrets set MPESA_ENV=production MPESA_SHORTCODE=... MPESA_PASSKEY=... MPESA_CONSUMER_KEY=... MPESA_CONSUMER_SECRET=...` (callback secret must already be set).
3. Redeploy nothing; secrets apply on the next call. Do a real KSh 2,500 test payment with your own number.

## 3. Google Maps (optional)
Create a browser key with Maps JavaScript + Places, restrict by referrer, put it in `googleMapsApiKey` in `assets/js/config.js`. Without it agents enter coordinates or use their device location.

## 4. Deploy the site
Static files. Deploy the folder to Vercel/Netlify/Cloudflare Pages. Local test: `python3 -m http.server 8000`.

## How customers and agents talk
Customers submit an enquiry or booking with their name, phone/WhatsApp, email, preferred channel and consent. The agent sees it in **Enquiries/Bookings** with one-tap **WhatsApp**, **Email** and **Call** buttons prefilled with a greeting, and the conversation continues outside the app.


## Changing subscription prices

1. Run `supabase/migrations/20261017010000_editable_plan_prices.sql` in the SQL Editor (after the two earlier migrations).
2. Redeploy the `daraja` function (it now reads prices from the database).
3. Sign in to `/admin.html`, open **Settings**, and edit **Plan prices** (whole shillings, minimum KSh 1).

Sandbox payments never move real money. To test with your own money you need production Daraja credentials
(Safaricom Go Live): set `MPESA_ENV=production`, the production shortcode and passkey, and a fresh `MPESA_CALLBACK_SECRET`.
Set a plan to KSh 1 to 10, pay it from your own phone, then set the real price back.
