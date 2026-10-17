-- Nestify: open reviews, private contact data, one agreement version, safer payment activation.
-- Built on top of the live project (it does not recreate tables). Safe to run twice.

-- ============================================================================
-- 1. Reviews are open to everyone: the invitation / token system is removed.
-- ============================================================================
alter table public.property_reviews drop column if exists invitation_id cascade;
drop table if exists public.review_invitations cascade;
alter table public.property_reviews add column if not exists is_hidden boolean not null default false;

-- Agents may only reply to a review; admins may also hide one. Nobody edits the review itself.
create or replace function public.review_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin(auth.uid()) then
    new.id := old.id;
    new.property_id := old.property_id;
    new.reviewer_name := old.reviewer_name;
    new.rating := old.rating;
    new.title := old.title;
    new.body := old.body;
    new.reviewer_email_hash := old.reviewer_email_hash;
    new.ip_hash := old.ip_hash;
    new.review_source := old.review_source;
    new.is_hidden := old.is_hidden;
    new.created_at := old.created_at;
  end if;
  if new.owner_response is distinct from old.owner_response then
    new.owner_response := nullif(btrim(new.owner_response), '');
    new.owner_responded_at := case when new.owner_response is null then null else now() end;
  end if;
  return new;
end $$;
drop trigger if exists review_guard on public.property_reviews;
create trigger review_guard before update on public.property_reviews
  for each row execute function public.review_guard();

create or replace function public.notify_review() returns trigger
language plpgsql security definer set search_path = public as $$
declare owner uuid; ptitle text;
begin
  select p.agent_id, p.title into owner, ptitle from public.properties p where p.id = new.property_id;
  if owner is not null then
    insert into public.notifications(user_id, title, body, type, entity_id)
    values (owner, 'New review', new.rating || ' star review on ' || ptitle || ' from ' || new.reviewer_name || '.', 'review', new.id);
  end if;
  return new;
end $$;
drop trigger if exists review_notification on public.property_reviews;
create trigger review_notification after insert on public.property_reviews
  for each row execute function public.notify_review();

drop policy if exists "public reads property reviews" on public.property_reviews;
drop policy if exists "public reads visible reviews" on public.property_reviews;
create policy "public reads visible reviews" on public.property_reviews for select
  using (not is_hidden and exists (select 1 from public.properties p where p.id = property_reviews.property_id and p.status = 'published'));
drop policy if exists "admins moderate reviews" on public.property_reviews;
create policy "admins moderate reviews" on public.property_reviews for update to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
-- Review inserts have no policy on purpose: they happen only in the submit-review Edge Function.

-- The e-mail and network hashes are never readable through the API.
revoke all on public.property_reviews from anon, authenticated;
grant select (id, property_id, reviewer_name, rating, title, body, owner_response, owner_responded_at, created_at, is_hidden)
  on public.property_reviews to anon, authenticated;
grant update (owner_response, is_hidden) on public.property_reviews to authenticated;

-- ============================================================================
-- 2. Private contact data. The public API can no longer read agents' e-mail, phone or admin notes.
-- ============================================================================
revoke all on public.profiles from anon, authenticated;
grant select (id, full_name, agency_name, verification_status, avatar_url) on public.profiles to anon, authenticated;
grant update (full_name, phone, agency_name, license_number, avatar_url) on public.profiles to authenticated;

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- The signed-in agent's own profile (never includes admin notes).
create or replace function public.my_profile()
returns table(id uuid, email text, full_name text, phone text, agency_name text, license_number text,
              role public.user_role, verification_status public.verification_state,
              account_status public.account_state, avatar_url text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.email, p.full_name, p.phone, p.agency_name, p.license_number,
         p.role, p.verification_status, p.account_status, p.avatar_url, p.created_at
    from public.profiles p where p.id = auth.uid();
$$;
revoke execute on function public.my_profile() from public, anon;
grant execute on function public.my_profile() to authenticated;

-- Enquiries and booking requests: anyone may send one; only the owning agent reads it and changes its status.
revoke all on public.enquiries, public.booking_requests from anon, authenticated;
grant insert on public.enquiries, public.booking_requests to anon, authenticated;
grant select on public.enquiries, public.booking_requests to authenticated;
grant update (status) on public.enquiries, public.booking_requests to authenticated;

revoke update on public.notifications from anon, authenticated;
grant update (is_read) on public.notifications to authenticated;
revoke all on public.agent_subscriptions from anon;

-- Blocked dates are private. The public sees only the ranges, through unavailable_ranges().
drop policy if exists "public sees blocked dates" on public.blocked_dates;

create or replace function public.guard_blocked_dates() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    if not exists (select 1 from public.properties p where p.id = new.property_id and p.agent_id = auth.uid() and p.kind = 'stay') then
      raise exception 'You can only block dates on your own short-stay listings.' using errcode = 'P0001';
    end if;
    new.agent_id := auth.uid();
  end if;
  return new;
end $$;
drop trigger if exists blocked_dates_guard on public.blocked_dates;
create trigger blocked_dates_guard before insert or update on public.blocked_dates
  for each row execute function public.guard_blocked_dates();
revoke execute on function public.review_guard(), public.notify_review(), public.guard_blocked_dates() from public, anon, authenticated;

-- New request notifications tell the agent how the customer wants to be reached.
create or replace function public.notify_agent_request() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'booking_requests' then
    insert into public.notifications(user_id, title, body, type, entity_id)
    values (new.agent_id, 'New booking request',
            new.guest_name || ' asked for ' || (new.check_out - new.check_in) || ' night(s). Reply on ' || new.preferred_contact || '.',
            'booking', new.id);
  else
    insert into public.notifications(user_id, title, body, type, entity_id)
    values (new.agent_id, 'New property enquiry',
            new.sender_name || ' sent an enquiry. Reply on ' || new.preferred_contact || '.', 'enquiry', new.id);
  end if;
  return new;
end $$;
revoke execute on function public.notify_agent_request() from public, anon, authenticated;

-- ============================================================================
-- 3. One agreement version everywhere (database, Daraja function and the portal).
-- ============================================================================
create or replace function public.current_agreement_version() returns text
language sql immutable as $$ select '2026-10-15'::text $$;

create or replace function public.has_active_subscription(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.agent_subscriptions s
     where s.agent_id = uid and s.status = 'paid' and s.starts_at <= now() and s.ends_at > now()
  ) and exists (
    select 1 from public.agent_agreements a
     where a.agent_id = uid and a.agreement_version = public.current_agreement_version()
  ) and exists (
    select 1 from public.profiles p where p.id = uid and p.account_status = 'active'
  );
$$;

drop policy if exists "agents accept agreement" on public.agent_agreements;
create policy "agents accept agreement" on public.agent_agreements for insert to authenticated
  with check (auth.uid() = agent_id and accepted_terms and accepted_content_rules and accepted_payment_terms
              and agreement_version = public.current_agreement_version());

-- Record who accepted from the request itself, not from the browser.
create or replace function public.request_header(name text) returns text
language plpgsql stable as $$
begin
  return nullif(current_setting('request.headers', true), '')::json ->> lower(name);
exception when others then
  return null;
end $$;

create or replace function public.stamp_agreement() returns trigger
language plpgsql security definer set search_path = public as $$
declare ip inet;
begin
  begin
    ip := nullif(btrim(split_part(coalesce(public.request_header('x-forwarded-for'), ''), ',', 1)), '')::inet;
  exception when others then
    ip := null;
  end;
  new.ip_address := ip;
  new.user_agent := left(coalesce(public.request_header('user-agent'), new.user_agent), 400);
  new.accepted_at := now();
  return new;
end $$;
drop trigger if exists agreements_stamp on public.agent_agreements;
create trigger agreements_stamp before insert on public.agent_agreements
  for each row execute function public.stamp_agreement();
revoke execute on function public.stamp_agreement() from public, anon, authenticated;

-- ============================================================================
-- 4. Payment activation. The amount and receipt must match; the payer phone is recorded but no
--    longer blocks activation (the prompt only ever goes to the agent's own number, and Safaricom
--    can report the number in a different format). Late success callbacks are still honoured.
-- ============================================================================
create or replace function public.activate_subscription_payment(
  checkout_id text, result_code integer, result_description text, receipt text,
  paid_amount numeric, paid_phone text, raw_payload jsonb
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  sub public.agent_subscriptions;
  new_end timestamptz;
begin
  select * into sub from public.agent_subscriptions
   where mpesa_checkout_request_id = checkout_id for update;
  if sub.id is null then
    return jsonb_build_object('ok', false, 'reason', 'unknown_checkout');
  end if;
  if sub.status = 'paid' then
    return jsonb_build_object('ok', true, 'reason', 'already_processed', 'subscription_id', sub.id);
  end if;

  if result_code <> 0 then
    update public.agent_subscriptions set
      status = case when result_code = 1032 then 'cancelled'::public.payment_state else 'failed'::public.payment_state end,
      mpesa_result_code = result_code, mpesa_result_description = left(result_description, 300),
      failure_reason = left(result_description, 300), callback_payload = raw_payload, callback_received_at = now()
     where id = sub.id;
    return jsonb_build_object('ok', true, 'reason', 'failure_recorded', 'subscription_id', sub.id);
  end if;

  if receipt is null or btrim(receipt) = '' or paid_amount is null or paid_amount <> sub.amount_kes then
    update public.agent_subscriptions set
      status = 'failed', mpesa_result_code = result_code, mpesa_result_description = 'Callback validation failed',
      failure_reason = left('Receipt or amount mismatch: expected ' || sub.amount_kes || ', received ' || coalesce(paid_amount::text, 'none'), 300),
      callback_amount = paid_amount, callback_phone = paid_phone, callback_payload = raw_payload, callback_received_at = now()
     where id = sub.id;
    return jsonb_build_object('ok', false, 'reason', 'amount_or_receipt_mismatch', 'subscription_id', sub.id);
  end if;

  perform pg_advisory_xact_lock(hashtextextended(sub.agent_id::text, 0));
  select greatest(now(), coalesce(max(ends_at), now())) + interval '1 month' into new_end
    from public.agent_subscriptions where agent_id = sub.agent_id and status = 'paid' and ends_at > now();
  update public.agent_subscriptions set status = 'expired'
   where agent_id = sub.agent_id and status = 'paid' and id <> sub.id;
  update public.agent_subscriptions set
    status = 'paid', mpesa_receipt_number = receipt, mpesa_result_code = 0,
    mpesa_result_description = left(result_description, 300), callback_amount = paid_amount,
    callback_phone = paid_phone, callback_payload = raw_payload, callback_received_at = now(),
    starts_at = now(), ends_at = new_end, failure_reason = null
   where id = sub.id;
  insert into public.notifications(user_id, title, body, type, entity_id)
  values (sub.agent_id, 'Payment confirmed',
          'Your ' || sub.plan || ' subscription is active until ' || to_char(new_end at time zone 'Africa/Nairobi', 'DD Mon YYYY') || '.',
          'billing', sub.id);
  return jsonb_build_object('ok', true, 'reason', 'activated', 'subscription_id', sub.id, 'ends_at', new_end);
exception when unique_violation then
  update public.agent_subscriptions set status = 'failed', failure_reason = 'Duplicate M-Pesa receipt',
         callback_payload = raw_payload, callback_received_at = now() where id = sub.id;
  return jsonb_build_object('ok', false, 'reason', 'duplicate_receipt', 'subscription_id', sub.id);
end $$;
revoke execute on function public.activate_subscription_payment(text, integer, text, text, numeric, text, jsonb) from public, anon, authenticated;
grant execute on function public.activate_subscription_payment(text, integer, text, text, numeric, text, jsonb) to service_role;
