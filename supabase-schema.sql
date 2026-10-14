-- Nestify production schema (Supabase / PostgreSQL)
-- Run once in the Supabase SQL Editor.

create extension if not exists pgcrypto;

create type public.user_role as enum ('agent','admin');
create type public.verification_state as enum ('pending','verified','rejected');
create type public.property_status as enum ('draft','pending','published','rejected','archived');
create type public.listing_kind as enum ('rent','stay');
create type public.request_status as enum ('new','accepted','declined','closed');
create type public.media_kind as enum ('image','video');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  phone text not null default '',
  agency_name text,
  license_number text,
  role public.user_role not null default 'agent',
  verification_status public.verification_state not null default 'pending',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.properties (
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

create table public.property_media (
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

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  agent_id uuid not null references public.profiles(id) on delete cascade,
  sender_name text not null,
  sender_email text not null,
  sender_phone text not null,
  message text not null,
  status public.request_status not null default 'new',
  created_at timestamptz not null default now()
);

create table public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  agent_id uuid not null references public.profiles(id) on delete cascade,
  guest_name text not null,
  guest_email text not null,
  guest_phone text not null,
  check_in date not null,
  check_out date not null,
  guests smallint not null check (guests > 0),
  message text,
  total_quote numeric(12,2) not null check (total_quote >= 0),
  status public.request_status not null default 'new',
  created_at timestamptz not null default now(),
  check (check_out > check_in)
);

create table public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  agent_id uuid not null references public.profiles(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  type text not null default 'system',
  entity_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index properties_public_idx on public.properties(status,kind,county,created_at desc);
create index properties_agent_idx on public.properties(agent_id,updated_at desc);
create index media_property_idx on public.property_media(property_id,sort_order);
create index enquiries_agent_idx on public.enquiries(agent_id,status,created_at desc);
create index bookings_agent_idx on public.booking_requests(agent_id,status,created_at desc);
create index notifications_user_idx on public.notifications(user_id,is_read,created_at desc);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,email,full_name,phone,agency_name,license_number)
  values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name',''),coalesce(new.raw_user_meta_data->>'phone',''),new.raw_user_meta_data->>'agency_name',new.raw_user_meta_data->>'license_number');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger properties_touch before update on public.properties for each row execute function public.touch_updated_at();

create or replace function public.notify_agent_request() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.notifications(user_id,title,body,type,entity_id)
  values(new.agent_id,
    case when tg_table_name='booking_requests' then 'New booking request' else 'New property enquiry' end,
    case when tg_table_name='booking_requests' then new.guest_name||' requested a stay.' else new.sender_name||' sent an enquiry.' end,
    case when tg_table_name='booking_requests' then 'booking' else 'enquiry' end,new.id);
  return new;
end $$;
create trigger booking_notification after insert on public.booking_requests for each row execute function public.notify_agent_request();
create trigger enquiry_notification after insert on public.enquiries for each row execute function public.notify_agent_request();

create or replace function public.notify_property_status() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if old.status is distinct from new.status and new.status in ('published','rejected') then
    insert into public.notifications(user_id,title,body,type,entity_id)
    values(new.agent_id,
      case when new.status='published' then 'Listing approved' else 'Listing needs changes' end,
      case when new.status='published' then new.title||' is now live on Nestify.' else new.title||' was not approved. Review the feedback before resubmitting.' end,
      case when new.status='published' then 'approval' else 'rejection' end,new.id);
  end if;
  return new;
end $$;
create trigger property_status_notification after update of status on public.properties for each row execute function public.notify_property_status();

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.property_media enable row level security;
alter table public.enquiries enable row level security;
alter table public.booking_requests enable row level security;
alter table public.blocked_dates enable row level security;
alter table public.notifications enable row level security;

create policy "public verified agent profiles" on public.profiles for select using (verification_status='verified' or auth.uid()=id);
create policy "users update own profile" on public.profiles for update using (auth.uid()=id) with check (auth.uid()=id and role='agent');

create policy "public sees published properties" on public.properties for select using (status='published' or auth.uid()=agent_id);
create policy "agents insert own listings" on public.properties for insert to authenticated with check (auth.uid()=agent_id and status in ('draft','pending'));
create policy "agents update own unapproved listings" on public.properties for update to authenticated using (auth.uid()=agent_id) with check (auth.uid()=agent_id and status in ('draft','pending','archived'));
create policy "agents delete own drafts" on public.properties for delete to authenticated using (auth.uid()=agent_id and status in ('draft','rejected','archived'));

create policy "public sees published media" on public.property_media for select using (exists(select 1 from public.properties p where p.id=property_id and (p.status='published' or p.agent_id=auth.uid())));
create policy "agents add own media" on public.property_media for insert to authenticated with check (auth.uid()=agent_id and exists(select 1 from public.properties p where p.id=property_id and p.agent_id=auth.uid()));
create policy "agents delete own media" on public.property_media for delete to authenticated using (auth.uid()=agent_id);

create policy "anyone creates enquiries" on public.enquiries for insert with check (exists(select 1 from public.properties p where p.id=property_id and p.status='published' and p.agent_id=agent_id));
create policy "agents see own enquiries" on public.enquiries for select to authenticated using (auth.uid()=agent_id);
create policy "agents update own enquiries" on public.enquiries for update to authenticated using (auth.uid()=agent_id) with check (auth.uid()=agent_id);

create policy "anyone creates bookings" on public.booking_requests for insert with check (exists(select 1 from public.properties p where p.id=property_id and p.status='published' and p.kind='stay' and p.agent_id=agent_id));
create policy "agents see own bookings" on public.booking_requests for select to authenticated using (auth.uid()=agent_id);
create policy "agents update own bookings" on public.booking_requests for update to authenticated using (auth.uid()=agent_id) with check (auth.uid()=agent_id);

create policy "public sees blocked dates" on public.blocked_dates for select using (true);
create policy "agents manage own dates" on public.blocked_dates for all to authenticated using (auth.uid()=agent_id) with check (auth.uid()=agent_id);
create policy "users see own notifications" on public.notifications for select to authenticated using (auth.uid()=user_id);
create policy "users update own notifications" on public.notifications for update to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('property-media','property-media',true,83886080,array['image/jpeg','image/png','image/webp','video/mp4','video/webm'])
on conflict(id) do nothing;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('agent-documents','agent-documents',false,10485760,array['image/jpeg','image/png','application/pdf'])
on conflict(id) do nothing;

create policy "public reads property media" on storage.objects for select using (bucket_id='property-media');
create policy "agents upload own property media" on storage.objects for insert to authenticated with check (bucket_id='property-media' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "agents update own property media" on storage.objects for update to authenticated using (bucket_id='property-media' and owner_id=auth.uid()::text);
create policy "agents delete own property media" on storage.objects for delete to authenticated using (bucket_id='property-media' and owner_id=auth.uid()::text);
create policy "agents manage own documents" on storage.objects for all to authenticated using (bucket_id='agent-documents' and (storage.foldername(name))[1]=auth.uid()::text) with check (bucket_id='agent-documents' and (storage.foldername(name))[1]=auth.uid()::text);

-- ─────────────────────────────────────────────────────────────
-- LUXURY SUBSCRIPTIONS, CLICKWRAP AGREEMENTS & VERIFIED REVIEWS
-- Added for automatic publishing after confirmed M-Pesa payment.
-- ─────────────────────────────────────────────────────────────
create type public.subscription_plan as enum ('starter','growth','elite');
create type public.payment_state as enum ('initiated','pending','paid','failed','cancelled');

create table public.agent_agreements (
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
  unique(agent_id,agreement_version)
);

create table public.agent_subscriptions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.profiles(id) on delete cascade,
  plan public.subscription_plan not null,
  status public.payment_state not null default 'initiated',
  amount_kes integer not null check (amount_kes > 0),
  listing_limit integer not null check (listing_limit > 0),
  mpesa_checkout_request_id text unique,
  mpesa_receipt_number text,
  phone text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index subscriptions_agent_idx on public.agent_subscriptions(agent_id,status,ends_at desc);

create table public.review_invitations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  agent_id uuid not null references public.profiles(id) on delete cascade,
  customer_email text not null,
  customer_name text,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.property_reviews (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  invitation_id uuid not null unique references public.review_invitations(id) on delete restrict,
  reviewer_name text not null,
  rating smallint not null check (rating between 1 and 5),
  title text,
  body text not null check (char_length(body) between 20 and 1500),
  owner_response text,
  owner_responded_at timestamptz,
  created_at timestamptz not null default now()
);
create index reviews_property_idx on public.property_reviews(property_id,created_at desc);

create or replace function public.has_active_subscription(uid uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.agent_subscriptions s
    where s.agent_id=uid and s.status='paid' and s.starts_at<=now() and s.ends_at>now()
  ) and exists(
    select 1 from public.agent_agreements a where a.agent_id=uid and a.agreement_version='2026-10-09'
  );
$$;

alter table public.agent_agreements enable row level security;
alter table public.agent_subscriptions enable row level security;
alter table public.review_invitations enable row level security;
alter table public.property_reviews enable row level security;

create policy "agents read own agreements" on public.agent_agreements for select to authenticated using (auth.uid()=agent_id);
create policy "agents accept agreement" on public.agent_agreements for insert to authenticated with check (auth.uid()=agent_id and accepted_terms and accepted_content_rules and accepted_payment_terms);
create policy "agents read own subscriptions" on public.agent_subscriptions for select to authenticated using (auth.uid()=agent_id);
-- Subscription writes happen only in the M-Pesa Edge Function using the service role.
create policy "agents read own review invites" on public.review_invitations for select to authenticated using (auth.uid()=agent_id);
create policy "agents create review invites" on public.review_invitations for insert to authenticated with check (auth.uid()=agent_id and exists(select 1 from public.properties p where p.id=property_id and p.agent_id=auth.uid()));
create policy "public reads property reviews" on public.property_reviews for select using (exists(select 1 from public.properties p where p.id=property_id and p.status='published'));
create policy "agents respond to own reviews" on public.property_reviews for update to authenticated using (exists(select 1 from public.properties p where p.id=property_id and p.agent_id=auth.uid())) with check (exists(select 1 from public.properties p where p.id=property_id and p.agent_id=auth.uid()));
-- Review inserts happen only in submit-review Edge Function after token verification.

-- Replace the original listing policies with subscription-aware instant publishing.
drop policy if exists "agents insert own listings" on public.properties;
drop policy if exists "agents update own unapproved listings" on public.properties;
create policy "subscribed agents publish own listings" on public.properties for insert to authenticated
with check (
  auth.uid()=agent_id and (
    status='draft' or (status='published' and public.has_active_subscription(auth.uid()))
  )
);
create policy "subscribed agents update own listings" on public.properties for update to authenticated
using (auth.uid()=agent_id)
with check (
  auth.uid()=agent_id and (
    status in ('draft','archived') or (status='published' and public.has_active_subscription(auth.uid()))
  )
);

create trigger subscriptions_touch before update on public.agent_subscriptions for each row execute function public.touch_updated_at();

-- Enforce the paid plan's active-listing allowance on new publications.
create or replace function public.can_publish_new_listing(uid uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select public.has_active_subscription(uid) and (
    select count(*) from public.properties p where p.agent_id=uid and p.status='published'
  ) < coalesce((
    select s.listing_limit from public.agent_subscriptions s
    where s.agent_id=uid and s.status='paid' and s.starts_at<=now() and s.ends_at>now()
    order by s.ends_at desc limit 1
  ),0);
$$;
drop policy if exists "subscribed agents publish own listings" on public.properties;
create policy "subscribed agents publish own listings" on public.properties for insert to authenticated
with check (
  auth.uid()=agent_id and (
    status='draft' or (status='published' and public.can_publish_new_listing(auth.uid()))
  )
);
