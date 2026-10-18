-- ⚠️  SUPERSEDED. Do NOT run this on a project that already has Nestify data.
-- The live database is maintained through the files in supabase/migrations/ (apply them in order).
-- This file is kept only as a historical v2 draft for a brand-new, empty project, and it
-- does not include the open-review, privacy and payment changes in
-- supabase/migrations/20261016000000_open_reviews_privacy_payments.sql.
-- ═══════════════════════════════════════════════════════════════════════════
-- Nestify · Supabase schema v2
--
-- Run the whole file once in Supabase → SQL Editor. It is safe to run again:
-- it only touches Nestify's own tables, and it upgrades a v1 install in place.
--
-- What changed from v1
--  • Reviews are open to everyone (no invitation tokens). Inserts go through the
--    submit-review Edge Function, which adds spam protection.
--  • Enquiries and booking requests carry the customer's preferred contact method
--    so agents can reply on WhatsApp, e-mail or phone outside the app.
--  • The agent a request belongs to is set by the database, never by the browser.
--  • Booking requests are validated in the database (dates, guests, availability,
--    price) and cannot overlap blocked or accepted dates.
--  • The listing limit of a plan is enforced for inserts AND updates.
--  • Column-level privileges keep agents from verifying themselves, editing other
--    people's contact details or reading private columns.
--  • Subscription payments are activated only by activate_subscription_payment(),
--    which the Daraja Edge Function calls with the service role.
--  • Listings of an agent whose subscription has lapsed are hidden automatically
--    and reappear on renewal.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- Keep this value in step with AGREEMENT_VERSION in agent.js and
-- supabase/functions/daraja/index.ts.
create or replace function public.current_agreement_version() returns text
language sql immutable as $$ select '2026-10-15'::text $$;

-- ── Types ──────────────────────────────────────────────────────────────────
do $$ begin create type public.user_role         as enum ('agent','admin');                                   exception when duplicate_object then null; end $$;
do $$ begin create type public.account_state     as enum ('active','suspended');                              exception when duplicate_object then null; end $$;
do $$ begin create type public.verification_state as enum ('pending','verified','rejected');                  exception when duplicate_object then null; end $$;
do $$ begin create type public.property_status   as enum ('draft','pending','published','rejected','archived'); exception when duplicate_object then null; end $$;
do $$ begin create type public.listing_kind      as enum ('rent','stay');                                     exception when duplicate_object then null; end $$;
do $$ begin create type public.request_status    as enum ('new','accepted','declined','closed');              exception when duplicate_object then null; end $$;
do $$ begin create type public.media_kind        as enum ('image','video');                                   exception when duplicate_object then null; end $$;
do $$ begin create type public.subscription_plan as enum ('starter','growth','elite');                        exception when duplicate_object then null; end $$;
do $$ begin create type public.payment_state     as enum ('initiated','pending','paid','failed','cancelled'); exception when duplicate_object then null; end $$;

-- ── Tables ─────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  phone text not null default '',
  agency_name text,
  license_number text,
  role public.user_role not null default 'agent',
  verification_status public.verification_state not null default 'pending',
  account_status public.account_state not null default 'active',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles add column if not exists account_status public.account_state not null default 'active';

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.profiles(id) on delete cascade,
  kind public.listing_kind not null default 'rent',
  status public.property_status not null default 'draft',
  title text not null check (char_length(title) between 5 and 120),
  description text not null check (char_length(description) between 40 and 5000),
  property_type text not null,
  county text not null,
  locality text not null,
  address_text text not null,
  latitude numeric(9,6) not null check (latitude between -5 and 5.5),
  longitude numeric(9,6) not null check (longitude between 33.5 and 42.5),
  bedrooms smallint not null default 1 check (bedrooms between 0 and 50),
  bathrooms smallint not null default 1 check (bathrooms between 1 and 50),
  size_sqm integer check (size_sqm between 1 and 100000),
  monthly_price numeric(12,2) check (monthly_price > 0),
  nightly_price numeric(12,2) check (nightly_price > 0),
  max_guests smallint check (max_guests between 1 and 100),
  min_nights smallint check (min_nights between 1 and 365),
  furnished boolean not null default false,
  parking boolean not null default false,
  pet_friendly boolean not null default false,
  pool boolean not null default false,
  wifi boolean not null default false,
  security boolean not null default false,
  amenities text[] not null default '{}',
  rejection_reason text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint correct_price check (
    (kind='rent' and monthly_price is not null) or
    (kind='stay' and nightly_price is not null and max_guests is not null)
  )
);

create table if not exists public.property_media (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  agent_id uuid not null references public.profiles(id) on delete cascade,
  kind public.media_kind not null,
  storage_path text not null,
  public_url text not null,
  alt_text text not null default '',
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  agent_id uuid not null references public.profiles(id) on delete cascade,
  sender_name text not null check (char_length(btrim(sender_name)) between 2 and 80),
  sender_email text not null check (sender_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(sender_email) <= 254),
  sender_phone text not null check (char_length(regexp_replace(sender_phone,'\D','','g')) between 9 and 15),
  preferred_contact text not null default 'whatsapp' check (preferred_contact in ('whatsapp','email','phone')),
  message text not null check (char_length(btrim(message)) between 1 and 2000),
  status public.request_status not null default 'new',
  contacted_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.enquiries add column if not exists preferred_contact text not null default 'whatsapp';
alter table public.enquiries add column if not exists contacted_at timestamptz;

create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  agent_id uuid not null references public.profiles(id) on delete cascade,
  guest_name text not null check (char_length(btrim(guest_name)) between 2 and 80),
  guest_email text not null check (guest_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(guest_email) <= 254),
  guest_phone text not null check (char_length(regexp_replace(guest_phone,'\D','','g')) between 9 and 15),
  preferred_contact text not null default 'whatsapp' check (preferred_contact in ('whatsapp','email','phone')),
  check_in date not null,
  check_out date not null,
  guests smallint not null check (guests > 0),
  message text check (message is null or char_length(message) <= 2000),
  total_quote numeric(12,2) not null default 0 check (total_quote >= 0),
  status public.request_status not null default 'new',
  contacted_at timestamptz,
  created_at timestamptz not null default now(),
  check (check_out > check_in)
);
alter table public.booking_requests add column if not exists preferred_contact text not null default 'whatsapp';
alter table public.booking_requests add column if not exists contacted_at timestamptz;
alter table public.booking_requests alter column total_quote set default 0;

create table if not exists public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  agent_id uuid not null references public.profiles(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  type text not null default 'system',
  entity_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_agreements (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.profiles(id) on delete cascade,
  agreement_version text not null,
  legal_name text not null,
  accepted_terms boolean not null,
  accepted_content_rules boolean not null,
  accepted_payment_terms boolean not null,
  ip_address inet,
  user_agent text,
  accepted_at timestamptz not null default now(),
  unique(agent_id, agreement_version)
);

create table if not exists public.agent_subscriptions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.profiles(id) on delete cascade,
  plan public.subscription_plan not null,
  status public.payment_state not null default 'initiated',
  amount_kes integer not null check (amount_kes > 0),
  listing_limit integer not null check (listing_limit > 0),
  phone text not null,
  mpesa_checkout_request_id text unique,
  mpesa_merchant_request_id text,
  mpesa_receipt_number text,
  starts_at timestamptz,
  ends_at timestamptz,
  idempotency_key uuid,
  failure_reason text,
  result_code integer,
  result_description text,
  result_payload jsonb,
  initiation_payload jsonb,
  callback_payload jsonb,
  callback_received_at timestamptz,
  callback_amount numeric,
  callback_phone text,
  last_queried_at timestamptz,
  query_attempts integer not null default 0,
  last_query_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.agent_subscriptions add column if not exists mpesa_merchant_request_id text;
alter table public.agent_subscriptions add column if not exists idempotency_key uuid;
alter table public.agent_subscriptions add column if not exists failure_reason text;
alter table public.agent_subscriptions add column if not exists result_code integer;
alter table public.agent_subscriptions add column if not exists result_description text;
alter table public.agent_subscriptions add column if not exists result_payload jsonb;
alter table public.agent_subscriptions add column if not exists initiation_payload jsonb;
alter table public.agent_subscriptions add column if not exists callback_payload jsonb;
alter table public.agent_subscriptions add column if not exists callback_received_at timestamptz;
alter table public.agent_subscriptions add column if not exists callback_amount numeric;
alter table public.agent_subscriptions add column if not exists callback_phone text;
alter table public.agent_subscriptions add column if not exists last_queried_at timestamptz;
alter table public.agent_subscriptions add column if not exists query_attempts integer not null default 0;
alter table public.agent_subscriptions add column if not exists last_query_payload jsonb;

-- Reviews: open to everyone. The public never sees the e-mail or network hashes.
create table if not exists public.property_reviews (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  reviewer_name text not null check (char_length(btrim(reviewer_name)) between 2 and 60),
  rating smallint not null check (rating between 1 and 5),
  title text check (title is null or char_length(title) <= 100),
  body text not null check (char_length(body) between 20 and 1500),
  owner_response text check (owner_response is null or char_length(owner_response) <= 1000),
  owner_responded_at timestamptz,
  reviewer_email_hash text,
  ip_hash text,
  review_source text not null default 'public',
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.property_reviews add column if not exists reviewer_email_hash text;
alter table public.property_reviews add column if not exists ip_hash text;
alter table public.property_reviews add column if not exists review_source text not null default 'public';
alter table public.property_reviews add column if not exists is_hidden boolean not null default false;
-- v1 required an invitation for every review. Both are gone.
alter table public.property_reviews drop column if exists invitation_id cascade;
drop table if exists public.review_invitations cascade;

-- "Private brief" requests from the concierge form.
create table if not exists public.concierge_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  phone text not null check (char_length(regexp_replace(phone,'\D','','g')) between 9 and 15),
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  preferred_contact text not null default 'whatsapp' check (preferred_contact in ('whatsapp','email','phone')),
  county text not null,
  category text not null,
  min_budget numeric(14,2) not null check (min_budget >= 0),
  max_budget numeric(14,2) not null check (max_budget >= min_budget),
  requirements text not null check (char_length(requirements) between 20 and 3000),
  consent boolean not null check (consent),
  status public.request_status not null default 'new',
  created_at timestamptz not null default now()
);

-- ── Indexes ────────────────────────────────────────────────────────────────
create index if not exists properties_public_idx on public.properties(status, kind, county, created_at desc);
create index if not exists properties_agent_idx on public.properties(agent_id, updated_at desc);
create index if not exists media_property_idx on public.property_media(property_id, sort_order);
create index if not exists enquiries_agent_idx on public.enquiries(agent_id, status, created_at desc);
create index if not exists enquiries_email_idx on public.enquiries(lower(sender_email), created_at desc);
create index if not exists bookings_agent_idx on public.booking_requests(agent_id, status, created_at desc);
create index if not exists bookings_email_idx on public.booking_requests(lower(guest_email), created_at desc);
create index if not exists bookings_property_dates_idx on public.booking_requests(property_id, status, check_in, check_out);
create index if not exists blocked_property_idx on public.blocked_dates(property_id, start_date, end_date);
create index if not exists notifications_user_idx on public.notifications(user_id, is_read, created_at desc);
create index if not exists subscriptions_agent_idx on public.agent_subscriptions(agent_id, status, starts_at, ends_at desc);
create unique index if not exists subscriptions_receipt_uidx on public.agent_subscriptions(mpesa_receipt_number) where mpesa_receipt_number is not null;
create unique index if not exists subscriptions_idem_uidx on public.agent_subscriptions(agent_id, idempotency_key) where idempotency_key is not null;
create index if not exists reviews_property_idx on public.property_reviews(property_id, created_at desc);
create unique index if not exists reviews_one_per_email_uidx on public.property_reviews(property_id, reviewer_email_hash) where reviewer_email_hash is not null;
create index if not exists reviews_ip_idx on public.property_reviews(ip_hash, created_at desc);
create index if not exists concierge_phone_idx on public.concierge_requests(phone, created_at desc);

-- ── Helper functions ───────────────────────────────────────────────────────
create or replace function public.nairobi_today() returns date
language sql stable as $$ select (now() at time zone 'Africa/Nairobi')::date $$;

-- Caller's network address / user agent as seen by the API gateway (null if unavailable).
create or replace function public.request_header(name text) returns text
language plpgsql stable as $$
begin
  return nullif(current_setting('request.headers', true), '')::json ->> lower(name);
exception when others then
  return null;
end $$;

create or replace function public.request_ip() returns inet
language plpgsql stable as $$
declare raw text := split_part(coalesce(public.request_header('x-forwarded-for'), ''), ',', 1);
begin
  return nullif(btrim(raw), '')::inet;
exception when others then
  return null;
end $$;

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- True while the agent has a paid, unexpired subscription, has accepted the current
-- agreement and the account is active. Used by row-level security, so it runs as owner.
create or replace function public.has_active_subscription(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.agent_subscriptions s
    where s.agent_id = uid and s.status = 'paid' and s.starts_at <= now() and s.ends_at > now()
  ) and exists(
    select 1 from public.agent_agreements a
    where a.agent_id = uid and a.agreement_version = public.current_agreement_version()
  ) and exists(
    select 1 from public.profiles p where p.id = uid and p.account_status = 'active'
  );
$$;

-- True while the agent still has room under the plan's active-listing allowance.
create or replace function public.can_publish_new_listing(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_active_subscription(uid) and (
    select count(*) from public.properties p where p.agent_id = uid and p.status = 'published'
  ) < coalesce((
    select s.listing_limit from public.agent_subscriptions s
    where s.agent_id = uid and s.status = 'paid' and s.starts_at <= now() and s.ends_at > now()
    order by s.ends_at desc limit 1
  ), 0);
$$;

-- The signed-in agent's own full profile (the table itself hides e-mail and phone from the API).
create or replace function public.my_profile() returns public.profiles
language sql stable security definer set search_path = public as $$
  select * from public.profiles where id = auth.uid();
$$;

-- ── Availability of short stays ────────────────────────────────────────────
create or replace function public.stay_is_available(pid uuid, ci date, co date, ignore_booking uuid default null)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (
    select 1 from public.blocked_dates b
    where b.property_id = pid and daterange(b.start_date, b.end_date, '[]') && daterange(ci, co, '[)')
  ) and not exists (
    select 1 from public.booking_requests r
    where r.property_id = pid and r.status = 'accepted'
      and r.id is distinct from ignore_booking
      and daterange(r.check_in, r.check_out, '[)') && daterange(ci, co, '[)')
  );
$$;

-- Upcoming unavailable nights of one live stay (no personal data), for the booking calendar.
-- end_date is the last unavailable night, inclusive.
create or replace function public.stay_unavailable(pid uuid)
returns table(start_date date, end_date date)
language sql stable security definer set search_path = public as $$
  select b.start_date, b.end_date from public.blocked_dates b
   where b.property_id = pid and b.end_date >= public.nairobi_today()
     and exists (select 1 from public.properties p where p.id = pid and p.status = 'published')
  union all
  select r.check_in, r.check_out - 1 from public.booking_requests r
   where r.property_id = pid and r.status = 'accepted' and r.check_out > public.nairobi_today()
     and exists (select 1 from public.properties p where p.id = pid and p.status = 'published')
  order by 1;
$$;

-- Stays that cannot host the whole of [ci, co): used by the date search.
create or replace function public.unavailable_stay_ids(ci date, co date)
returns setof uuid language sql stable security definer set search_path = public as $$
  select b.property_id from public.blocked_dates b
   where daterange(b.start_date, b.end_date, '[]') && daterange(ci, co, '[)')
  union
  select r.property_id from public.booking_requests r
   where r.status = 'accepted' and daterange(r.check_in, r.check_out, '[)') && daterange(ci, co, '[)');
$$;

-- ── Triggers ───────────────────────────────────────────────────────────────
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, email, full_name, phone, agency_name, license_number)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name', ''),
          coalesce(new.raw_user_meta_data->>'phone', ''),
          new.raw_user_meta_data->>'agency_name',
          new.raw_user_meta_data->>'license_number')
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
drop trigger if exists properties_touch on public.properties;
create trigger properties_touch before update on public.properties for each row execute function public.touch_updated_at();
drop trigger if exists subscriptions_touch on public.agent_subscriptions;
create trigger subscriptions_touch before update on public.agent_subscriptions for each row execute function public.touch_updated_at();

-- Publishing rules, enforced for inserts and updates made by signed-in users.
-- (The SQL editor and Edge Functions have no auth.uid(), so admin work is not blocked.)
create or replace function public.guard_property_publish() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    new.verified_at := null;
    new.rejection_reason := null;
  end if;
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    if not public.has_active_subscription(new.agent_id) then
      raise exception 'Activate a subscription before publishing.';
    end if;
    if not public.can_publish_new_listing(new.agent_id) then
      raise exception 'Your plan''s active-listing limit is full. Archive a listing or upgrade your plan.';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists properties_publish_guard on public.properties;
create trigger properties_publish_guard before insert or update on public.properties
  for each row execute function public.guard_property_publish();

-- Enquiry: the database decides which agent owns it and rejects spam bursts.
create or replace function public.prepare_enquiry() returns trigger
language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
  select p.agent_id into owner from public.properties p
   where p.id = new.property_id and p.status = 'published' and public.has_active_subscription(p.agent_id);
  if owner is null then
    raise exception 'This property is not accepting enquiries right now.';
  end if;
  if (select count(*) from public.enquiries e
       where lower(e.sender_email) = lower(new.sender_email) and e.created_at > now() - interval '1 hour') >= 5 then
    raise exception 'You have sent several enquiries recently. Please try again later.';
  end if;
  new.agent_id := owner;
  new.sender_email := lower(btrim(new.sender_email));
  new.sender_name := btrim(new.sender_name);
  new.status := 'new';
  new.contacted_at := null;
  return new;
end $$;
drop trigger if exists enquiries_prepare on public.enquiries;
create trigger enquiries_prepare before insert on public.enquiries for each row execute function public.prepare_enquiry();

-- Booking request: validated and priced by the database.
create or replace function public.prepare_booking() returns trigger
language plpgsql security definer set search_path = public as $$
declare pr public.properties; nights integer;
begin
  select * into pr from public.properties p
   where p.id = new.property_id and p.status = 'published' and public.has_active_subscription(p.agent_id);
  if not found then
    raise exception 'This stay is not accepting requests right now.';
  end if;
  if pr.kind <> 'stay' then
    raise exception 'This property is not a short stay.';
  end if;
  nights := new.check_out - new.check_in;
  if new.check_in < public.nairobi_today() then
    raise exception 'Check-in cannot be in the past.';
  end if;
  if nights < coalesce(pr.min_nights, 1) then
    raise exception 'The minimum stay is % night(s).', coalesce(pr.min_nights, 1);
  end if;
  if nights > 365 then
    raise exception 'Please request 365 nights or fewer.';
  end if;
  if new.guests > coalesce(pr.max_guests, 1) then
    raise exception 'This stay sleeps at most % guest(s).', coalesce(pr.max_guests, 1);
  end if;
  if not public.stay_is_available(pr.id, new.check_in, new.check_out) then
    raise exception 'Those dates are not available. Please choose different dates.';
  end if;
  if (select count(*) from public.booking_requests r
       where lower(r.guest_email) = lower(new.guest_email) and r.created_at > now() - interval '1 hour') >= 5 then
    raise exception 'You have sent several requests recently. Please try again later.';
  end if;
  new.agent_id := pr.agent_id;
  new.guest_email := lower(btrim(new.guest_email));
  new.guest_name := btrim(new.guest_name);
  new.total_quote := nights * pr.nightly_price;
  new.status := 'new';
  new.contacted_at := null;
  return new;
end $$;
drop trigger if exists bookings_prepare on public.booking_requests;
create trigger bookings_prepare before insert on public.booking_requests for each row execute function public.prepare_booking();

-- Two accepted bookings (or an accepted booking and a blocked period) can never overlap.
create or replace function public.guard_booking_accept() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    if not public.stay_is_available(new.property_id, new.check_in, new.check_out, new.id) then
      raise exception 'Those dates overlap another accepted booking or a blocked period.';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists bookings_accept_guard on public.booking_requests;
create trigger bookings_accept_guard before update of status on public.booking_requests
  for each row execute function public.guard_booking_accept();

-- An agent can only add blocked dates to their own property (checked here, not trusted from the browser).
create or replace function public.guard_blocked_dates() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not exists (
    select 1 from public.properties p where p.id = new.property_id and p.agent_id = auth.uid() and p.kind = 'stay'
  ) then
    raise exception 'You can only block dates on your own short-stay listings.';
  end if;
  if auth.uid() is not null then new.agent_id := auth.uid(); end if;
  return new;
end $$;
drop trigger if exists blocked_dates_guard on public.blocked_dates;
create trigger blocked_dates_guard before insert or update on public.blocked_dates
  for each row execute function public.guard_blocked_dates();

-- Same ownership rule for media rows.
create or replace function public.guard_media_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    if not exists (select 1 from public.properties p where p.id = new.property_id and p.agent_id = auth.uid()) then
      raise exception 'You can only add media to your own listings.';
    end if;
    new.agent_id := auth.uid();
  end if;
  return new;
end $$;
drop trigger if exists property_media_guard on public.property_media;
create trigger property_media_guard before insert on public.property_media
  for each row execute function public.guard_media_owner();

-- Concierge briefs: at most 3 per phone number per day.
create or replace function public.prepare_concierge() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.concierge_requests c
       where c.phone = new.phone and c.created_at > now() - interval '1 day') >= 3 then
    raise exception 'You have already sent several briefs today. An agent will be in touch.';
  end if;
  new.status := 'new';
  return new;
end $$;
drop trigger if exists concierge_prepare on public.concierge_requests;
create trigger concierge_prepare before insert on public.concierge_requests
  for each row execute function public.prepare_concierge();

-- Record who accepted the agreement, from the request itself rather than from the browser.
create or replace function public.stamp_agreement() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.ip_address := public.request_ip();
  new.user_agent := left(coalesce(public.request_header('user-agent'), new.user_agent), 400);
  new.accepted_at := now();
  return new;
end $$;
drop trigger if exists agreements_stamp on public.agent_agreements;
create trigger agreements_stamp before insert on public.agent_agreements
  for each row execute function public.stamp_agreement();

-- An agent's reply to a review is stamped by the database.
create or replace function public.stamp_review_reply() returns trigger
language plpgsql as $$
begin
  if new.owner_response is distinct from old.owner_response then
    new.owner_responded_at := case when nullif(btrim(new.owner_response), '') is null then null else now() end;
    new.owner_response := nullif(btrim(new.owner_response), '');
  end if;
  return new;
end $$;
drop trigger if exists reviews_reply_stamp on public.property_reviews;
create trigger reviews_reply_stamp before update on public.property_reviews
  for each row execute function public.stamp_review_reply();

-- Notifications ---------------------------------------------------------------
create or replace function public.notify_enquiry() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications(user_id, title, body, type, entity_id)
  values (new.agent_id, 'New property enquiry',
          new.sender_name || ' sent an enquiry. Reply on ' || new.preferred_contact || '.', 'enquiry', new.id);
  return new;
end $$;
drop trigger if exists enquiry_notification on public.enquiries;
create trigger enquiry_notification after insert on public.enquiries for each row execute function public.notify_enquiry();

create or replace function public.notify_booking() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications(user_id, title, body, type, entity_id)
  values (new.agent_id, 'New booking request',
          new.guest_name || ' asked for ' || (new.check_out - new.check_in) || ' night(s). Reply on ' || new.preferred_contact || '.',
          'booking', new.id);
  return new;
end $$;
drop trigger if exists booking_notification on public.booking_requests;
create trigger booking_notification after insert on public.booking_requests for each row execute function public.notify_booking();

create or replace function public.notify_review() returns trigger
language plpgsql security definer set search_path = public as $$
declare owner uuid; ptitle text;
begin
  select p.agent_id, p.title into owner, ptitle from public.properties p where p.id = new.property_id;
  if owner is not null then
    insert into public.notifications(user_id, title, body, type, entity_id)
    values (owner, 'New guest review', new.rating || '★ review on ' || ptitle || ' from ' || new.reviewer_name || '.', 'review', new.id);
  end if;
  return new;
end $$;
drop trigger if exists review_notification on public.property_reviews;
create trigger review_notification after insert on public.property_reviews for each row execute function public.notify_review();

create or replace function public.notify_property_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.status is distinct from new.status and new.status in ('published', 'rejected') then
    insert into public.notifications(user_id, title, body, type, entity_id)
    values (new.agent_id,
      case when new.status = 'published' then 'Listing is live' else 'Listing needs changes' end,
      case when new.status = 'published' then new.title || ' is now live on Nestify.'
           else new.title || ' was not approved. Review the feedback before resubmitting.' end,
      case when new.status = 'published' then 'approval' else 'rejection' end, new.id);
  end if;
  return new;
end $$;
drop trigger if exists property_status_notification on public.properties;
create trigger property_status_notification after update of status on public.properties
  for each row execute function public.notify_property_status();

-- ── Payment activation (called only by the Daraja Edge Function) ───────────
-- Idempotent. Verifies the amount, payer phone and receipt before granting access.
create or replace function public.activate_subscription_payment(
  checkout_id text,
  result_code integer,
  result_description text,
  receipt text,
  paid_amount numeric,
  paid_phone text,
  raw_payload jsonb
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s public.agent_subscriptions;
  active_end timestamptz;
  active_rank integer;
  new_rank integer;
  start_at timestamptz;
  end_at timestamptz;
  next_status public.payment_state;
  digits text;
begin
  select * into s from public.agent_subscriptions where mpesa_checkout_request_id = checkout_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'unknown_checkout');
  end if;

  -- Failure or cancellation: record it unless the payment is already settled.
  if result_code <> 0 then
    if s.status in ('paid', 'failed', 'cancelled') then
      return jsonb_build_object('ok', true, 'status', s.status, 'note', 'already_final');
    end if;
    next_status := case when result_code = 1032 then 'cancelled' else 'failed' end;
    update public.agent_subscriptions
       set status = next_status, result_code = activate_subscription_payment.result_code,
           result_description = left(activate_subscription_payment.result_description, 300),
           failure_reason = left(activate_subscription_payment.result_description, 300),
           result_payload = raw_payload
     where id = s.id;
    insert into public.notifications(user_id, title, body, type, entity_id)
    values (s.agent_id,
            case when next_status = 'cancelled' then 'Payment cancelled' else 'Payment not completed' end,
            'Your ' || s.plan || ' plan payment did not go through. No money was taken. You can try again from Subscription.',
            'billing', s.id);
    return jsonb_build_object('ok', true, 'status', next_status);
  end if;

  -- Success.
  if s.status = 'paid' then
    return jsonb_build_object('ok', true, 'status', 'paid', 'note', 'already_paid');
  end if;
  if receipt is null or btrim(receipt) = '' then
    return jsonb_build_object('ok', false, 'reason', 'missing_receipt');
  end if;
  if paid_amount is null or paid_amount <> s.amount_kes then
    -- Never activate on a wrong amount; keep the evidence on the row for review.
    update public.agent_subscriptions
       set failure_reason = left('Amount mismatch: expected ' || s.amount_kes || ', received ' || coalesce(paid_amount::text, 'none'), 300),
           result_payload = raw_payload
     where id = s.id;
    return jsonb_build_object('ok', false, 'reason', 'amount_mismatch', 'expected', s.amount_kes, 'received', paid_amount);
  end if;
  if paid_phone is not null then
    digits := regexp_replace(paid_phone, '\D', '', 'g');
    if digits <> '' and digits <> regexp_replace(s.phone, '\D', '', 'g') then
      return jsonb_build_object('ok', false, 'reason', 'phone_mismatch');
    end if;
  end if;

  -- Period: renewals queue after the current plan; upgrades start now and keep the days left.
  select max(x.ends_at) into active_end from public.agent_subscriptions x
   where x.agent_id = s.agent_id and x.status = 'paid' and x.ends_at > now();
  select case x.plan when 'starter' then 1 when 'growth' then 2 else 3 end into active_rank
    from public.agent_subscriptions x
   where x.agent_id = s.agent_id and x.status = 'paid' and x.starts_at <= now() and x.ends_at > now()
   order by x.ends_at desc limit 1;
  new_rank := case s.plan when 'starter' then 1 when 'growth' then 2 else 3 end;

  if active_end is null then
    start_at := now();
    end_at := start_at + interval '1 month';
  elsif active_rank is not null and new_rank > active_rank then
    start_at := now();
    end_at := now() + interval '1 month' + (active_end - now());
  else
    start_at := active_end;
    end_at := active_end + interval '1 month';
  end if;

  begin
    update public.agent_subscriptions
       set status = 'paid', mpesa_receipt_number = receipt,
           starts_at = start_at, ends_at = end_at,
           result_code = 0, result_description = left(activate_subscription_payment.result_description, 300),
           failure_reason = null, result_payload = raw_payload
     where id = s.id;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'duplicate_receipt');
  end;

  insert into public.notifications(user_id, title, body, type, entity_id)
  values (s.agent_id, 'Subscription activated',
          initcap(s.plan::text) || ' plan is active until ' || to_char(end_at at time zone 'Africa/Nairobi', 'DD Mon YYYY') || '. You can publish now.',
          'billing', s.id);
  return jsonb_build_object('ok', true, 'status', 'paid', 'starts_at', start_at, 'ends_at', end_at);
end $$;

-- ── Row-level security ─────────────────────────────────────────────────────
alter table public.profiles            enable row level security;
alter table public.properties          enable row level security;
alter table public.property_media      enable row level security;
alter table public.enquiries           enable row level security;
alter table public.booking_requests    enable row level security;
alter table public.blocked_dates       enable row level security;
alter table public.notifications       enable row level security;
alter table public.agent_agreements    enable row level security;
alter table public.agent_subscriptions enable row level security;
alter table public.property_reviews    enable row level security;
alter table public.concierge_requests  enable row level security;

-- Start from a clean slate for Nestify's own tables only (re-runs and v1 upgrades).
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname from pg_policies
     where schemaname = 'public'
       and tablename in ('profiles','properties','property_media','enquiries','booking_requests','blocked_dates',
                         'notifications','agent_agreements','agent_subscriptions','property_reviews','concierge_requests')
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- profiles: names and agency are public for agents with live listings; contact details stay private.
create policy "profiles readable" on public.profiles for select
  using (
    auth.uid() = id
    or verification_status = 'verified'
    or exists (select 1 from public.properties p where p.agent_id = profiles.id and p.status = 'published')
  );
create policy "users update own profile" on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- properties
create policy "live listings are public" on public.properties for select
  using ((status = 'published' and public.has_active_subscription(agent_id)) or auth.uid() = agent_id);
create policy "agents add own listings" on public.properties for insert to authenticated
  with check (auth.uid() = agent_id and (status = 'draft' or (status = 'published' and public.has_active_subscription(auth.uid()))));
create policy "agents edit own listings" on public.properties for update to authenticated
  using (auth.uid() = agent_id)
  with check (auth.uid() = agent_id and (status in ('draft','archived') or (status = 'published' and public.has_active_subscription(auth.uid()))));
create policy "agents delete own unpublished listings" on public.properties for delete to authenticated
  using (auth.uid() = agent_id and status in ('draft','rejected','archived'));

-- property_media follows the visibility of its property
create policy "media follows listing" on public.property_media for select
  using (exists (select 1 from public.properties p where p.id = property_media.property_id));
create policy "agents add own media" on public.property_media for insert to authenticated
  with check (auth.uid() = agent_id);
create policy "agents delete own media" on public.property_media for delete to authenticated
  using (auth.uid() = agent_id);

-- enquiries and booking requests: anyone may send one, only the owning agent may read it
create policy "anyone sends enquiries" on public.enquiries for insert to anon, authenticated
  with check (status = 'new');
create policy "agents read own enquiries" on public.enquiries for select to authenticated
  using (auth.uid() = agent_id);
create policy "agents update own enquiries" on public.enquiries for update to authenticated
  using (auth.uid() = agent_id) with check (auth.uid() = agent_id);

create policy "anyone sends booking requests" on public.booking_requests for insert to anon, authenticated
  with check (status = 'new');
create policy "agents read own bookings" on public.booking_requests for select to authenticated
  using (auth.uid() = agent_id);
create policy "agents update own bookings" on public.booking_requests for update to authenticated
  using (auth.uid() = agent_id) with check (auth.uid() = agent_id);

-- blocked dates are private to the agent; the public sees only the ranges via stay_unavailable()
create policy "agents manage own blocked dates" on public.blocked_dates for all to authenticated
  using (auth.uid() = agent_id) with check (auth.uid() = agent_id);

create policy "users read own notifications" on public.notifications for select to authenticated
  using (auth.uid() = user_id);
create policy "users update own notifications" on public.notifications for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "agents read own agreements" on public.agent_agreements for select to authenticated
  using (auth.uid() = agent_id);
create policy "agents accept agreement" on public.agent_agreements for insert to authenticated
  with check (auth.uid() = agent_id and accepted_terms and accepted_content_rules and accepted_payment_terms
              and agreement_version = public.current_agreement_version());

create policy "agents read own subscriptions" on public.agent_subscriptions for select to authenticated
  using (auth.uid() = agent_id);
-- No insert/update policy on purpose: only the Daraja Edge Function (service role) writes subscriptions.

-- reviews: visible whenever the listing is visible; agents may reply to reviews of their own listings
create policy "reviews follow listing" on public.property_reviews for select
  using (not is_hidden and exists (select 1 from public.properties p where p.id = property_reviews.property_id));
create policy "agents reply to own reviews" on public.property_reviews for update to authenticated
  using (exists (select 1 from public.properties p where p.id = property_reviews.property_id and p.agent_id = auth.uid()))
  with check (exists (select 1 from public.properties p where p.id = property_reviews.property_id and p.agent_id = auth.uid()));
-- Review inserts happen only in the submit-review Edge Function (service role).

-- concierge briefs: anyone may send one; subscribed agents may read them
create policy "anyone sends concierge briefs" on public.concierge_requests for insert to anon, authenticated
  with check (consent and status = 'new');
create policy "subscribed agents read briefs" on public.concierge_requests for select to authenticated
  using (public.has_active_subscription(auth.uid()));

-- ── Column-level privileges ────────────────────────────────────────────────
-- profiles: the public API can only see names and verification; agents can edit only their own details.
revoke all on public.profiles from anon, authenticated;
grant select (id, full_name, agency_name, verification_status) on public.profiles to anon, authenticated;
grant update (full_name, phone, agency_name, license_number) on public.profiles to authenticated;

-- properties: agents cannot touch verified_at / rejection_reason / agent_id after creation.
revoke update on public.properties from anon, authenticated;
grant update (kind, status, title, description, property_type, county, locality, address_text, latitude, longitude,
              bedrooms, bathrooms, size_sqm, monthly_price, nightly_price, max_guests, min_nights,
              furnished, parking, pet_friendly, pool, wifi, security, amenities)
  on public.properties to authenticated;

-- requests: agents may only change the workflow fields
revoke update on public.enquiries from anon, authenticated;
grant update (status, contacted_at) on public.enquiries to authenticated;
revoke update on public.booking_requests from anon, authenticated;
grant update (status, contacted_at) on public.booking_requests to authenticated;
revoke all on public.enquiries, public.booking_requests from anon;
grant insert on public.enquiries, public.booking_requests to anon;

revoke update on public.notifications from anon, authenticated;
grant update (is_read) on public.notifications to authenticated;

-- reviews: hashes are never exposed; the only edit an agent can make is the reply
revoke all on public.property_reviews from anon, authenticated;
grant select (id, property_id, reviewer_name, rating, title, body, owner_response, owner_responded_at, created_at)
  on public.property_reviews to anon, authenticated;
grant update (owner_response) on public.property_reviews to authenticated;

-- subscriptions are written only by the service role
revoke all on public.agent_subscriptions from anon, authenticated;
grant select on public.agent_subscriptions to authenticated;

revoke all on public.concierge_requests from anon, authenticated;
grant insert on public.concierge_requests to anon, authenticated;
grant select on public.concierge_requests to authenticated;

-- ── Function privileges ────────────────────────────────────────────────────
-- Trigger and internal helpers are not part of the public API.
revoke execute on function public.activate_subscription_payment(text, integer, text, text, numeric, text, jsonb) from public, anon, authenticated;
grant  execute on function public.activate_subscription_payment(text, integer, text, text, numeric, text, jsonb) to service_role;

revoke execute on function public.my_profile() from public, anon;
grant  execute on function public.my_profile() to authenticated;

revoke execute on function public.can_publish_new_listing(uuid) from public, anon;
grant  execute on function public.can_publish_new_listing(uuid) to authenticated;
revoke execute on function public.stay_is_available(uuid, date, date, uuid) from public, anon, authenticated;

revoke execute on function public.guard_property_publish(), public.prepare_enquiry(), public.prepare_booking(),
  public.guard_booking_accept(), public.guard_blocked_dates(), public.guard_media_owner(), public.prepare_concierge(),
  public.stamp_agreement(), public.stamp_review_reply(), public.notify_enquiry(), public.notify_booking(),
  public.notify_review(), public.notify_property_status(), public.handle_new_user(), public.touch_updated_at()
  from public, anon, authenticated;

grant execute on function public.has_active_subscription(uuid) to anon, authenticated;
grant execute on function public.stay_unavailable(uuid) to anon, authenticated;
grant execute on function public.unavailable_stay_ids(date, date) to anon, authenticated;
grant execute on function public.nairobi_today() to anon, authenticated;

-- ── Storage ────────────────────────────────────────────────────────────────
-- Free Supabase plans cap uploads at 50 MB per file. Raise the limit if you are on a paid plan.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('property-media', 'property-media', true, 52428800,
        array['image/jpeg','image/png','image/webp','video/mp4','video/webm'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public reads property media" on storage.objects;
drop policy if exists "agents upload own property media" on storage.objects;
drop policy if exists "agents update own property media" on storage.objects;
drop policy if exists "agents delete own property media" on storage.objects;
drop policy if exists "agents manage own documents" on storage.objects;

create policy "public reads property media" on storage.objects for select
  using (bucket_id = 'property-media');
create policy "agents upload own property media" on storage.objects for insert to authenticated
  with check (bucket_id = 'property-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "agents update own property media" on storage.objects for update to authenticated
  using (bucket_id = 'property-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "agents delete own property media" on storage.objects for delete to authenticated
  using (bucket_id = 'property-media' and (storage.foldername(name))[1] = auth.uid()::text);
