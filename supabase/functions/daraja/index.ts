// Nestify · Daraja (M-Pesa Express / STK Push), one function with two routes
//
//   POST /functions/v1/daraja            { action: 'start',  plan, phone, idempotency_key? }   signed-in agent
//   POST /functions/v1/daraja            { action: 'status' }                                  signed-in agent
//   POST /functions/v1/daraja/callback   Safaricom -> Nestify (no login; protected below)
//
// Required secrets : MPESA_ENV (sandbox|production), MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET,
//                    MPESA_SHORTCODE, MPESA_PASSKEY
// Strongly advised : MPESA_CALLBACK_SECRET (any long random string; adds ?s=... to the callback URL and
//                    checks it). REQUIRED when MPESA_ENV=production: without it callbacks are refused.
// Optional secrets : MPESA_TRANSACTION_TYPE (CustomerPayBillOnline | CustomerBuyGoodsOnline),
//                    MPESA_PARTY_B (till number when using Buy Goods), MPESA_CALLBACK_URL (override)
// Supabase supplies SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to deployed functions automatically.
//
// Deploy with JWT verification OFF (the callback has no login). Agent routes verify the token themselves.
//
// Safety model
//  - Prices come from this file, never from the browser.
//  - A subscription row is written BEFORE the STK request, so a fast callback always finds it.
//  - A "success" callback is never trusted on its own: it is confirmed with Safaricom's STK Query API.
//  - Activation happens only inside the database function activate_subscription_payment(), which
//    checks the amount, phone and receipt and is idempotent.
//  - If the callback never arrives, the agent's status polling reconciles with the STK Query API.
import { createClient } from 'npm:@supabase/supabase-js@2';

<<<<<<< HEAD
// Keep in step with current_agreement_version() in supabase/schema.sql and AGREEMENT_VERSION in assets/js/agent.js.
=======
// Keep in step with current_agreement_version() in supabase-schema.sql and AGREEMENT_VERSION in agent.js.
>>>>>>> 72035837840c0b0dedb3fb3785dcd25687bc852e
const AGREEMENT_VERSION = '2026-10-15';
// Fallback prices. The live prices are set by the super admin in platform_settings (key 'plans').
const DEFAULT_PLANS: Record<string, { amount: number; limit: number }> = {
  starter: { amount: 2500, limit: 3 },
  growth: { amount: 6500, limit: 12 },
  elite: { amount: 15000, limit: 40 },
};
type PlanKey = string;
async function loadPlan(key: string): Promise<{ amount: number; limit: number } | null> {
  if (!DEFAULT_PLANS[key]) return null;
  const { data } = await admin.from('platform_settings').select('value').eq('key', 'plans').maybeSingle();
  const v = (data?.value as any)?.[key];
  const amount = Number(v?.amount), limit = Number(v?.limit);
  if (Number.isInteger(amount) && amount >= 1 && Number.isInteger(limit) && limit >= 1) return { amount, limit };
  return DEFAULT_PLANS[key];
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const ack = () => json({ ResultCode: 0, ResultDesc: 'Accepted' });

class ConfigError extends Error {}
const must = (name: string) => {
  const v = Deno.env.get(name);
  if (!v) throw new ConfigError(`Missing secret ${name}`);
  return v;
};

const isSandbox = () => (Deno.env.get('MPESA_ENV') || 'sandbox') !== 'production';
const darajaBase = () => (isSandbox() ? 'https://sandbox.safaricom.co.ke' : 'https://api.safaricom.co.ke');

const admin = createClient(must('SUPABASE_URL'), must('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------- small helpers ----------
// Daraja wants yyyyMMddHHmmss in East Africa Time (UTC+3, no daylight saving).
const timestamp = () => new Date(Date.now() + 3 * 3600 * 1000).toISOString().replace(/[-:T]/g, '').slice(0, 14);

function normalizePhone(raw: string): string | null {
  const d = raw.replace(/\D/g, '');
  if (/^0[17]\d{8}$/.test(d)) return '254' + d.slice(1);
  if (/^[17]\d{8}$/.test(d)) return '254' + d;
  if (/^254[17]\d{8}$/.test(d)) return d;
  return null;
}

function callbackUrl() {
  const override = Deno.env.get('MPESA_CALLBACK_URL');
  const secret = Deno.env.get('MPESA_CALLBACK_SECRET');
  const base = override || `${must('SUPABASE_URL')}/functions/v1/daraja/callback`;
  if (!secret || base.includes('?s=')) return base;
  return `${base}${base.includes('?') ? '&' : '?'}s=${encodeURIComponent(secret)}`;
}

// ---------- Daraja calls ----------
let tokenCache: { value: string; exp: number } | null = null;
async function accessToken(): Promise<string> {
  if (tokenCache && tokenCache.exp > Date.now() + 30_000) return tokenCache.value;
  const basic = btoa(`${must('MPESA_CONSUMER_KEY')}:${must('MPESA_CONSUMER_SECRET')}`);
  const res = await fetch(`${darajaBase()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${basic}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) throw new Error(`Daraja authentication failed (HTTP ${res.status})`);
  tokenCache = { value: data.access_token, exp: Date.now() + (Number(data.expires_in) || 3599) * 1000 };
  return tokenCache.value;
}

async function stkPush(amount: number, phone: string, plan: string) {
  const shortcode = must('MPESA_SHORTCODE');
  const ts = timestamp();
  const res = await fetch(`${darajaBase()}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: btoa(shortcode + must('MPESA_PASSKEY') + ts),
      Timestamp: ts,
      TransactionType: Deno.env.get('MPESA_TRANSACTION_TYPE') || 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: phone,
      PartyB: Deno.env.get('MPESA_PARTY_B') || shortcode,
      PhoneNumber: phone,
      CallBackURL: callbackUrl(),
      AccountReference: `NST-${plan.toUpperCase()}`, // Daraja limit: 12 characters
      TransactionDesc: 'Nestify plan', // Daraja limit: 13 characters
    }),
  });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
}

type Outcome = { state: 'success' | 'failed' | 'cancelled' | 'pending'; code: number | null; desc: string; raw: unknown };

async function stkQuery(checkoutId: string): Promise<Outcome> {
  const shortcode = must('MPESA_SHORTCODE');
  const ts = timestamp();
  const res = await fetch(`${darajaBase()}/mpesa/stkpushquery/v1/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: btoa(shortcode + must('MPESA_PASSKEY') + ts),
      Timestamp: ts,
      CheckoutRequestID: checkoutId,
    }),
  });
  const raw: any = await res.json().catch(() => ({}));
  // While the customer is still deciding, Daraja answers with an errorCode (e.g. 500.001.1001), not a ResultCode.
  if (raw && raw.ResultCode !== undefined && raw.ResultCode !== null && raw.ResultCode !== '') {
    const code = Number(raw.ResultCode);
    if (code === 0) return { state: 'success', code, desc: raw.ResultDesc || 'Payment received', raw };
    if (code === 1032) return { state: 'cancelled', code, desc: raw.ResultDesc || 'Request cancelled by user', raw };
    return { state: 'failed', code, desc: raw.ResultDesc || 'Payment failed', raw };
  }
  return { state: 'pending', code: null, desc: raw?.errorMessage || raw?.ResponseDescription || 'Still processing', raw };
}

// ---------- database helpers ----------
const SUB_PUBLIC =
  'id, plan, status, amount_kes, listing_limit, phone, starts_at, ends_at, created_at, mpesa_receipt_number, failure_reason, mpesa_checkout_request_id';

async function activate(checkoutId: string, p: {
  code: number; desc: string; receipt: string | null; amount: number | null; phone: string | null; raw: unknown;
}) {
  const { data, error } = await admin.rpc('activate_subscription_payment', {
    checkout_id: checkoutId,
    result_code: p.code,
    result_description: p.desc,
    receipt: p.receipt,
    paid_amount: p.amount,
    paid_phone: p.phone,
    raw_payload: p.raw ?? {},
  });
  if (error) throw error;
  if (data && data.ok === false) console.error('activate_subscription_payment rejected the payment', JSON.stringify(data));
  return data;
}

function readCallback(payload: any) {
  const cb = payload?.Body?.stkCallback ?? {};
  const items: any[] = cb.CallbackMetadata?.Item ?? [];
  const get = (name: string) => items.find((i) => i?.Name === name)?.Value;
  return {
    checkout: cb.CheckoutRequestID as string | undefined,
    code: Number(cb.ResultCode),
    desc: String(cb.ResultDesc ?? ''),
    receipt: (get('MpesaReceiptNumber') as string | undefined) ?? null,
    amount: get('Amount') !== undefined ? Number(get('Amount')) : null,
    phone: get('PhoneNumber') !== undefined ? String(get('PhoneNumber')) : null,
  };
}

// ---------- routes ----------
async function authUser(req: Request) {
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error ? null : data.user;
}

async function handleStart(userId: string, body: any) {
  const planKey = String(body.plan || '') as PlanKey;
  const plan = await loadPlan(planKey);
  if (!plan) return json({ error: 'Please choose a valid plan.' }, 400);
  const phone = normalizePhone(String(body.phone || ''));
  if (!phone) return json({ error: 'Enter a valid Safaricom number, for example 0712 345 678.' }, 400);

  const { data: profile } = await admin.from('profiles').select('account_status').eq('id', userId).maybeSingle();
  if (!profile || profile.account_status !== 'active') {
    return json({ error: 'Your account is not active. Please contact Nestify support.' }, 403);
  }
  const { data: agreement } = await admin
    .from('agent_agreements').select('id').eq('agent_id', userId).eq('agreement_version', AGREEMENT_VERSION).maybeSingle();
  if (!agreement) return json({ error: 'Please accept the current agent agreement before paying.' }, 403);

  const idem = typeof body.idempotency_key === 'string' && /^[0-9a-f-]{36}$/i.test(body.idempotency_key) ? body.idempotency_key : null;
  if (idem) {
    const { data: same } = await admin.from('agent_subscriptions').select(SUB_PUBLIC).eq('agent_id', userId).eq('idempotency_key', idem).maybeSingle();
    if (same) return json({ ok: true, checkoutRequestId: same.mpesa_checkout_request_id, status: same.status, message: 'This payment request was already sent.' });
  }
  const { data: inflight } = await admin
    .from('agent_subscriptions').select('id, mpesa_checkout_request_id')
    .eq('agent_id', userId).in('status', ['initiated', 'pending'])
    .gt('created_at', new Date(Date.now() - 2 * 60_000).toISOString())
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (inflight) {
    return json({ ok: true, checkoutRequestId: inflight.mpesa_checkout_request_id, message: 'A prompt is already on your phone. Enter your M-Pesa PIN to finish.' });
  }

  // 1) Record the attempt first so a fast callback can always find it.
  const { data: row, error: insertError } = await admin
    .from('agent_subscriptions')
    .insert({ agent_id: userId, plan: planKey, status: 'initiated', amount_kes: plan.amount, listing_limit: plan.limit, phone, idempotency_key: idem })
    .select('id').single();
  if (insertError) throw insertError;

  // 2) Ask Safaricom to prompt the customer.
  let push;
  try {
    push = await stkPush(plan.amount, phone, planKey);
  } catch (e) {
    await admin.from('agent_subscriptions').update({ status: 'failed', failure_reason: String((e as Error).message).slice(0, 300) }).eq('id', row.id);
    throw e;
  }
  const checkoutId = push.data?.CheckoutRequestID as string | undefined;
  if (!push.ok || push.data?.ResponseCode !== '0' || !checkoutId) {
    const reason = push.data?.errorMessage || push.data?.ResponseDescription || `HTTP ${push.status}`;
    await admin.from('agent_subscriptions').update({ status: 'failed', failure_reason: `STK request failed: ${reason}`.slice(0, 300), initiation_payload: push.data }).eq('id', row.id);
    console.error('STK push failed', JSON.stringify(push.data));
    return json({ error: 'M-Pesa could not send the prompt. Check the number and try again.', detail: isSandbox() ? reason : undefined }, 502);
  }
  await admin.from('agent_subscriptions').update({
    status: 'pending', mpesa_checkout_request_id: checkoutId,
    mpesa_merchant_request_id: push.data?.MerchantRequestID ?? null, initiation_payload: push.data,
  }).eq('id', row.id);
  return json({ ok: true, checkoutRequestId: checkoutId, message: push.data?.CustomerMessage || 'Check your phone and enter your M-Pesa PIN.' });
}

async function latestSubscription(userId: string) {
  const { data } = await admin.from('agent_subscriptions').select('*').eq('agent_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle();
  return data;
}

async function handleStatus(userId: string) {
  let sub: any = await latestSubscription(userId);
  if (sub && sub.status === 'initiated' && !sub.mpesa_checkout_request_id
      && Date.now() - new Date(sub.created_at).getTime() > 3 * 60_000) {
    // The request never reached Safaricom (for example the function was interrupted). Close it so it cannot linger.
    await admin.from('agent_subscriptions')
      .update({ status: 'failed', failure_reason: 'The payment request was not completed.' })
      .eq('id', sub.id).eq('status', 'initiated');
    sub = await latestSubscription(userId);
  }
  if (sub && ['initiated', 'pending'].includes(sub.status) && sub.mpesa_checkout_request_id) {
    sub = await reconcile(sub, userId);
  }
  if (!sub) return json({ subscription: null });
  const out: Record<string, unknown> = {};
  for (const k of SUB_PUBLIC.split(',').map((s) => s.trim())) out[k] = sub[k];
  return json({ subscription: out });
}

// Ask Safaricom directly when the callback is late or missing.
async function reconcile(sub: any, userId: string) {
  const ageMs = Date.now() - new Date(sub.created_at).getTime();
  if (ageMs < 20_000) return sub; // give the callback a head start
  if (sub.last_queried_at && Date.now() - new Date(sub.last_queried_at).getTime() < 8_000) return sub;
  try {
    const outcome = await stkQuery(sub.mpesa_checkout_request_id);
    await admin.from('agent_subscriptions').update({
      last_queried_at: new Date().toISOString(), query_attempts: (sub.query_attempts || 0) + 1, last_query_payload: outcome.raw,
    }).eq('id', sub.id);
    if (outcome.state === 'pending') return sub;
    if (outcome.state === 'success') {
      const saved = sub.callback_payload ? readCallback(sub.callback_payload) : null;
      if (!saved?.receipt && ageMs < 90_000) return sub; // the real receipt is probably seconds away
      await activate(sub.mpesa_checkout_request_id, {
        code: 0, desc: outcome.desc,
        receipt: saved?.receipt ?? `QUERY-${sub.mpesa_checkout_request_id}`,
        amount: saved?.amount ?? sub.amount_kes,
        phone: isSandbox() ? sub.phone : (saved?.phone ?? sub.phone),
        raw: saved ? sub.callback_payload : outcome.raw,
      });
    } else {
      await activate(sub.mpesa_checkout_request_id, { code: outcome.code ?? 1, desc: outcome.desc, receipt: null, amount: null, phone: null, raw: outcome.raw });
    }
  } catch (e) {
    console.error('reconcile failed', e);
    return sub;
  }
  return await latestSubscription(userId);
}

// Constant-time string comparison, so the secret cannot be guessed from response timing.
function safeEqual(a: string, b: string) {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

async function handleCallback(req: Request) {
  const secret = Deno.env.get('MPESA_CALLBACK_SECRET');
  if (!secret && !isSandbox()) {
    console.error('Refusing callback: MPESA_CALLBACK_SECRET is not set while MPESA_ENV=production');
    return json({ error: 'forbidden' }, 403);
  }
  if (secret && !safeEqual(new URL(req.url).searchParams.get('s') ?? '', secret)) return json({ error: 'forbidden' }, 403);
  const payload = await req.json().catch(() => null);
  const cb = readCallback(payload);
  if (!cb.checkout) return json({ ResultCode: 1, ResultDesc: 'Malformed callback' }, 400);

  const { data: sub } = await admin.from('agent_subscriptions').select('*').eq('mpesa_checkout_request_id', cb.checkout).maybeSingle();
  if (!sub) { console.warn('Callback for unknown checkout', cb.checkout); return ack(); }
  if (sub.status === 'paid') return ack();

  // A failed or cancelled payment grants nothing, so it is recorded as reported.
  if (cb.code !== 0) {
    await activate(cb.checkout, { code: Number.isFinite(cb.code) ? cb.code : 1, desc: cb.desc, receipt: null, amount: null, phone: null, raw: payload });
    return ack();
  }

  // The callback claims success. Keep it on file, then confirm with Safaricom before granting anything.
  await admin.from('agent_subscriptions').update({
    callback_payload: payload, callback_received_at: new Date().toISOString(), callback_amount: cb.amount, callback_phone: cb.phone,
  }).eq('id', sub.id);

  let outcome: Outcome | null = null;
  try { outcome = await stkQuery(cb.checkout); } catch (e) { console.error('STK query failed', e); }

  if (outcome && (outcome.state === 'failed' || outcome.state === 'cancelled')) {
    await activate(cb.checkout, { code: outcome.code ?? 1, desc: outcome.desc, receipt: null, amount: null, phone: null, raw: outcome.raw });
    return ack();
  }
  const confirmed = outcome?.state === 'success' || (isSandbox() && (!outcome || outcome.state === 'pending'));
  if (!confirmed) {
    // Could not confirm right now. The agent's status polling will reconcile using the saved callback.
    console.warn('Callback saved but not yet confirmed by STK Query', cb.checkout);
    return ack();
  }
  await activate(cb.checkout, {
    code: 0, desc: cb.desc || 'Payment received', receipt: cb.receipt,
    amount: cb.amount ?? (isSandbox() ? sub.amount_kes : null),
    // The sandbox always reports Safaricom's shared test number, so the phone check is relaxed there only.
    phone: sub.phone,
    raw: payload,
  });
  return ack();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const path = new URL(req.url).pathname.replace(/\/+$/, '');
  try {
    if (path.endsWith('/callback')) return await handleCallback(req);
    const user = await authUser(req);
    if (!user) return json({ error: 'Please sign in again.' }, 401);
    const body = await req.json().catch(() => ({}));
    if (body.action === 'status') return await handleStatus(user.id);
    if (body.action === undefined || body.action === 'start') return await handleStart(user.id, body);
    return json({ error: 'Unknown action.' }, 400);
  } catch (e) {
    console.error(e);
    if (e instanceof ConfigError) return json({ error: 'Payments are not available right now. Please try again shortly.' }, 503);
    return json({ error: 'Something went wrong while processing the payment. Please try again.' }, 500);
  }
});
