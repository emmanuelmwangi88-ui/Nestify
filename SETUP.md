# Nestify production setup

The site works in **Preview Mode** without credentials. Preview accounts and data stay in that browser only and are visibly labelled as demo data.

## 1. Create Supabase

1. Create a project at https://supabase.com.
2. Open **SQL Editor** and run `supabase-schema.sql` in full.
3. In **Authentication → URL Configuration**, add your deployed site URL and local development URL.
4. In **Project Settings → API**, copy the Project URL and public `anon` key.
5. Put those two public values in `config.js`. Never expose the service-role key.

The SQL creates:
- agent profiles and roles
- properties for rentals and short stays
- property media records
- enquiries, booking requests and notifications
- blocked stay dates
- a private agent-documents bucket
- a public property-media bucket
- row-level security policies
- profile and notification triggers

## 2. Google Maps

1. In Google Cloud Console, create a browser API key.
2. Enable **Maps JavaScript API** and **Places API**.
3. Restrict the key to your production and local HTTP referrers.
4. Add it to `googleMapsApiKey` in `config.js`.

Without the key, agents can still enter latitude/longitude manually or use browser geolocation. Public approved listings use a keyless Google Maps embed from stored coordinates.

## 3. Approval workflow

New agents and listings are pending by default. Promote a trusted account in Supabase:

```sql
update public.profiles
set role = 'admin', verification_status = 'verified'
where email = 'you@example.com';
```

Admins may approve listings directly in the Supabase Table Editor by setting `status = 'published'` and `verified_at = now()`. The RLS policies prevent agents from publishing unapproved content in production.

## 4. Deploy

This is a static site. Deploy the folder to Netlify, Vercel, Cloudflare Pages or GitHub Pages. Keep `config.js` browser-safe.

## Truth and freshness

The public marketplace reads only `published` agent submissions. Every listing displays its source agent, verification state and last-updated date. The platform does not seed fictional inventory.

## 5. M-Pesa subscription publishing

Production publishing is automatic only after:
1. the agent accepts Agent Agreement version `2026-10-09`;
2. Safaricom confirms the M-Pesa STK transaction by callback;
3. the paid subscription remains within its active dates and listing limit.

Deploy the included Edge Functions:

```bash
supabase functions deploy mpesa-stk --no-verify-jwt
supabase functions deploy submit-review --no-verify-jwt
```

Set these server-side secrets (never in `config.js`):

```bash
supabase secrets set \
  MPESA_ENV=sandbox \
  MPESA_CONSUMER_KEY=... \
  MPESA_CONSUMER_SECRET=... \
  MPESA_SHORTCODE=... \
  MPESA_PASSKEY=... \
  MPESA_CALLBACK_URL=https://YOUR_PROJECT.supabase.co/functions/v1/mpesa-stk/callback
```

Supabase automatically supplies the project URL and service-role environment values to deployed functions. Confirm current Supabase behavior before launch. Configure Daraja sandbox first, test successful, cancelled, timed-out and reversed transactions, then move to production credentials.

**Do not trust a browser success screen as proof of payment.** Only the signed/provider callback handled on the server activates the subscription.

## 6. Agent Agreement

`AGENT_AGREEMENT.md` is a product draft, not legal advice. Have a qualified Kenyan advocate review it before collecting money or launching. The clickwrap records the agreement version, legal name, account, timestamp and technical audit metadata. Material changes should use a new version and require renewed acceptance.

## 7. Verified customer reviews

Agents create one-time invitations after a genuine stay or tenancy. Customers submit through the `submit-review` Edge Function. The function hashes and validates the token, checks expiry and one-time use, then publishes the review. Direct anonymous inserts are blocked by RLS.
