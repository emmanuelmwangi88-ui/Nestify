// Nestify · open reviews. Anyone can review a published property, no token needed.
//
//   POST /functions/v1/submit-review
//   { property_id, reviewer_name, reviewer_email, rating, title?, body, website? }
//
// Protection against abuse (there is no invitation any more):
//  - email is required but never shown; only a salted hash is stored, one review per email per property
//  - a hidden "website" field catches simple bots
//  - at most 5 reviews per hour per network address (stored only as a salted hash)
//  - an agent cannot review their own listing
//  - the review table is read-only for the public; inserts happen only here, with the service role
//
// Optional secret: REVIEW_SALT (any long random string). Falls back to the project URL if unset.
// Deploy with JWT verification OFF so signed-out visitors can post.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const sha256 = async (v: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v))))
    .map((x) => x.toString(16).padStart(2, '0')).join('');

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const b = await req.json().catch(() => null);
    if (!b || typeof b !== 'object') return json({ error: 'Please complete the review form.' }, 400);
    if (b.website) return json({ ok: true }); // honeypot: pretend success

    const propertyId = String(b.property_id || '');
    const name = String(b.reviewer_name || '').trim();
    const email = String(b.reviewer_email || '').trim().toLowerCase();
    const rating = Number(b.rating);
    const title = String(b.title || '').trim();
    const body = String(b.body || '').trim();

    if (!/^[0-9a-f-]{36}$/i.test(propertyId)) return json({ error: 'That property could not be found.' }, 400);
    if (name.length < 2 || name.length > 60) return json({ error: 'Please enter your name (2 to 60 characters).' }, 400);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254) return json({ error: 'Please enter a valid email address.' }, 400);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return json({ error: 'Please choose a rating from 1 to 5.' }, 400);
    if (title.length > 100) return json({ error: 'The title is too long (100 characters maximum).' }, 400);
    if (body.length < 20 || body.length > 1500) return json({ error: 'Please write between 20 and 1500 characters about your experience.' }, 400);

    const { data: property } = await admin
      .from('properties').select('id, agent_id, status').eq('id', propertyId).maybeSingle();
    if (!property || property.status !== 'published') return json({ error: 'That property is not available for reviews.' }, 404);
    const { data: live } = await admin.rpc('has_active_subscription', { uid: property.agent_id });
    if (!live) return json({ error: 'That property is not available for reviews.' }, 404);

    const { data: agent } = await admin.from('profiles').select('email').eq('id', property.agent_id).maybeSingle();
    if (agent?.email && agent.email.toLowerCase() === email) return json({ error: 'You cannot review your own listing.' }, 403);

    const salt = Deno.env.get('REVIEW_SALT') || Deno.env.get('SUPABASE_URL') || 'nestify';
    const ip = (req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
    const ipHash = await sha256(`${salt}|ip|${ip}`);
    const emailHash = await sha256(`${salt}|email|${email}`);

    const { count } = await admin
      .from('property_reviews').select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash).gt('created_at', new Date(Date.now() - 3600_000).toISOString());
    if ((count ?? 0) >= 5) return json({ error: 'You have posted several reviews recently. Please try again later.' }, 429);

    const { error } = await admin.from('property_reviews').insert({
      property_id: propertyId,
      reviewer_name: name,
      rating,
      title: title || null,
      body,
      reviewer_email_hash: emailHash,
      ip_hash: ipHash,
      review_source: 'public',
    });
    if (error) {
      if ((error as { code?: string }).code === '23505') return json({ error: 'You have already reviewed this property.' }, 409);
      throw error;
    }
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: 'Your review could not be submitted. Please try again.' }, 500);
  }
});
