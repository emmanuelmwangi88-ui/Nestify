-- Nestify: finish the previous migration (parts of it did not apply) and add the admin console.
-- Runs as ONE transaction: it either applies completely or not at all. Safe to run twice.
begin;

-- ============================================================================
-- A. Re-apply what the previous migration missed
-- ============================================================================

-- A1. my_profile(): the old version returned the whole row, including private admin notes.
drop function if exists public.my_profile();
create function public.my_profile()
returns table(id uuid, email text, full_name text, phone text, agency_name text, license_number text,
              role public.user_role, verification_status public.verification_state,
              account_status text, avatar_url text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.email, p.full_name, p.phone, p.agency_name, p.license_number,
         p.role, p.verification_status, p.account_status, p.avatar_url, p.created_at
    from public.profiles p where p.id = auth.uid();
$$;
revoke execute on function public.my_profile() from public, anon;
grant execute on function public.my_profile() to authenticated;

-- A2. Enquiries and booking requests: anyone may send one; only the owning agent reads it and changes its status.
revoke all on public.enquiries, public.booking_requests from public, anon, authenticated;
grant insert on public.enquiries, public.booking_requests to anon, authenticated;
grant select on public.enquiries, public.booking_requests to authenticated;
grant update (status) on public.enquiries, public.booking_requests to authenticated;

-- A3. New request notifications tell the agent how the customer wants to be reached.
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

-- A4. Payment activation: amount and receipt must match; payer phone is recorded but never blocks;
--     late success callbacks are honoured; months stack.
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

-- A5. Trigger functions are never callable from the API.
revoke execute on function public.review_guard(), public.notify_review(), public.guard_blocked_dates(), public.stamp_agreement()
  from public, anon, authenticated;

-- ============================================================================
-- B. Admin console. Every function checks is_admin(auth.uid()) itself.
-- ============================================================================

create or replace function public.admin_assert() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_admin(auth.uid()) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
end $$;
revoke execute on function public.admin_assert() from public, anon;
grant execute on function public.admin_assert() to authenticated;

create or replace function public.admin_log(p_action text, p_type text, p_id text, p_before jsonb, p_after jsonb, p_reason text)
returns void language sql security definer set search_path = public as $$
  insert into public.admin_audit_logs(admin_id, action, entity_type, entity_id, before_data, after_data, reason)
  values (auth.uid(), p_action, p_type, p_id, p_before, p_after, nullif(btrim(p_reason), ''));
$$;
revoke execute on function public.admin_log(text, text, text, jsonb, jsonb, text) from public, anon, authenticated;

-- Overview numbers
create or replace function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  perform public.admin_assert();
  select jsonb_build_object(
    'agents_total',        (select count(*) from profiles where role = 'agent'),
    'agents_pending',      (select count(*) from profiles where role = 'agent' and verification_status = 'pending'),
    'agents_verified',     (select count(*) from profiles where role = 'agent' and verification_status = 'verified'),
    'agents_suspended',    (select count(*) from profiles where account_status = 'suspended'),
    'properties_live',     (select count(*) from properties where status = 'published'),
    'properties_total',    (select count(*) from properties),
    'active_subscriptions',(select count(distinct agent_id) from agent_subscriptions where status = 'paid' and starts_at <= now() and ends_at > now()),
    'revenue_30d',         (select coalesce(sum(amount_kes), 0) from agent_subscriptions where status = 'paid' and mpesa_receipt_number not like 'ADMIN-GRANT%' and starts_at > now() - interval '30 days'),
    'revenue_total',       (select coalesce(sum(amount_kes), 0) from agent_subscriptions where status = 'paid' and mpesa_receipt_number not like 'ADMIN-GRANT%'),
    'reports_open',        (select count(*) from content_reports where status in ('open', 'investigating')),
    'enquiries_7d',        (select count(*) from enquiries where created_at > now() - interval '7 days'),
    'bookings_7d',         (select count(*) from booking_requests where created_at > now() - interval '7 days'),
    'reviews_total',       (select count(*) from property_reviews)
  ) into r;
  return r;
end $$;

-- Agents
create or replace function public.admin_list_agents()
returns table(id uuid, email text, full_name text, phone text, agency_name text, license_number text, role public.user_role,
              verification_status public.verification_state, account_status text, admin_notes text, created_at timestamptz,
              properties_count bigint, live_count bigint, plan text, plan_ends_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_assert();
  return query
  select p.id, p.email, p.full_name, p.phone, p.agency_name, p.license_number, p.role, p.verification_status, p.account_status, p.admin_notes, p.created_at,
         (select count(*) from properties x where x.agent_id = p.id),
         (select count(*) from properties x where x.agent_id = p.id and x.status = 'published'),
         (select s.plan::text from agent_subscriptions s where s.agent_id = p.id and s.status = 'paid' and s.starts_at <= now() and s.ends_at > now() order by s.ends_at desc limit 1),
         (select s.ends_at from agent_subscriptions s where s.agent_id = p.id and s.status = 'paid' and s.starts_at <= now() and s.ends_at > now() order by s.ends_at desc limit 1)
    from profiles p order by p.created_at desc;
end $$;

create or replace function public.admin_set_agent(p_agent uuid, p_verification text default null, p_account text default null,
                                                   p_notes text default null, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare before_row profiles;
begin
  perform public.admin_assert();
  select * into before_row from profiles where id = p_agent;
  if before_row.id is null then raise exception 'Agent not found.'; end if;
  if p_agent = auth.uid() and p_account = 'suspended' then raise exception 'You cannot suspend your own account.'; end if;
  if p_verification is not null and p_verification not in ('pending', 'verified', 'rejected') then raise exception 'Invalid verification status.'; end if;
  if p_account is not null and p_account not in ('active', 'suspended') then raise exception 'Invalid account status.'; end if;
  update profiles set
    verification_status = coalesce(p_verification::public.verification_state, verification_status),
    account_status = coalesce(p_account, account_status),
    admin_notes = case when p_notes is null then admin_notes else nullif(btrim(p_notes), '') end
   where id = p_agent;
  perform public.admin_log('agent.update', 'profile', p_agent::text,
    jsonb_build_object('verification', before_row.verification_status, 'account', before_row.account_status),
    jsonb_build_object('verification', coalesce(p_verification, before_row.verification_status::text), 'account', coalesce(p_account, before_row.account_status)),
    p_reason);
  if p_account is distinct from null and p_account <> before_row.account_status then
    insert into notifications(user_id, title, body, type, entity_id)
    values (p_agent, case when p_account = 'suspended' then 'Account suspended' else 'Account reactivated' end,
            case when p_account = 'suspended' then 'Your account was suspended and your listings are hidden. ' || coalesce(nullif(btrim(p_reason), ''), 'Contact Nestify support for details.')
                 else 'Your account is active again.' end, 'approval', p_agent);
  end if;
  if p_verification is distinct from null and p_verification <> before_row.verification_status::text then
    insert into notifications(user_id, title, body, type, entity_id)
    values (p_agent, 'Verification update',
            'Your agent verification is now: ' || p_verification || '. ' || coalesce(nullif(btrim(p_reason), ''), ''), 'approval', p_agent);
  end if;
end $$;

create or replace function public.admin_set_role(p_agent uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
declare old_role public.user_role;
begin
  perform public.admin_assert();
  if p_role not in ('agent', 'admin') then raise exception 'Invalid role.'; end if;
  if p_agent = auth.uid() then raise exception 'You cannot change your own role.'; end if;
  select role into old_role from profiles where id = p_agent;
  if old_role is null then raise exception 'User not found.'; end if;
  update profiles set role = p_role::public.user_role where id = p_agent;
  perform public.admin_log('role.change', 'profile', p_agent::text, jsonb_build_object('role', old_role), jsonb_build_object('role', p_role), null);
end $$;

-- Manually grant (or extend) a plan, for example after an offline payment or as a courtesy.
create or replace function public.admin_grant_subscription(p_agent uuid, p_plan text, p_months int default 1, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare amt int; lim int; base timestamptz; ph text; sid uuid := gen_random_uuid();
begin
  perform public.admin_assert();
  if p_months < 1 or p_months > 12 then raise exception 'Choose 1 to 12 months.'; end if;
  select case p_plan when 'starter' then 2500 when 'growth' then 6500 when 'elite' then 15000 end,
         case p_plan when 'starter' then 3 when 'growth' then 12 when 'elite' then 40 end into amt, lim;
  if amt is null then raise exception 'Invalid plan.'; end if;
  select phone into ph from profiles where id = p_agent;
  if not found then raise exception 'Agent not found.'; end if;
  select greatest(now(), coalesce(max(ends_at), now())) into base
    from agent_subscriptions where agent_id = p_agent and status = 'paid' and ends_at > now();
  update agent_subscriptions set status = 'expired' where agent_id = p_agent and status = 'paid';
  insert into agent_subscriptions(id, agent_id, plan, status, amount_kes, listing_limit, phone, starts_at, ends_at,
                                  mpesa_receipt_number, mpesa_result_code, mpesa_result_description)
  values (sid, p_agent, p_plan::public.subscription_plan, 'paid', amt, lim, coalesce(ph, 'admin'), now(),
          base + (p_months || ' months')::interval, 'ADMIN-GRANT-' || left(sid::text, 8), 0, 'Granted by admin');
  perform public.admin_log('subscription.grant', 'subscription', sid::text, null, jsonb_build_object('agent', p_agent, 'plan', p_plan, 'months', p_months), p_reason);
  insert into notifications(user_id, title, body, type, entity_id)
  values (p_agent, 'Plan activated', 'Nestify activated your ' || p_plan || ' plan for ' || p_months || ' month(s).', 'billing', sid);
end $$;

create or replace function public.admin_end_subscription(p_agent uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_assert();
  update agent_subscriptions set status = 'expired', ends_at = now() where agent_id = p_agent and status = 'paid' and ends_at > now();
  perform public.admin_log('subscription.end', 'profile', p_agent::text, null, null, p_reason);
end $$;

-- Properties
create or replace function public.admin_list_properties(p_status text default null)
returns table(id uuid, title text, kind public.listing_kind, status public.property_status, county text, locality text, price numeric,
              agent_id uuid, agent_name text, agency_name text, suspended_at timestamptz, suspended_reason text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_assert();
  return query
  select p.id, p.title, p.kind, p.status, p.county, p.locality,
         case when p.kind = 'stay' then p.nightly_price::numeric else p.monthly_price::numeric end,
         p.agent_id, p.agent_name, p.agency_name, p.suspended_at, p.suspended_reason, p.created_at
    from properties p
   where p_status is null or p.status::text = p_status
   order by p.created_at desc limit 500;
end $$;

create or replace function public.admin_set_property(p_id uuid, p_action text, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare old_status public.property_status; aid uuid; t text;
begin
  perform public.admin_assert();
  select status, agent_id, title into old_status, aid, t from properties where id = p_id;
  if aid is null then raise exception 'Listing not found.'; end if;
  if p_action = 'suspend' then
    update properties set status = 'archived', suspended_at = now(), suspended_reason = coalesce(nullif(btrim(p_reason), ''), 'Removed by Nestify') where id = p_id;
  elsif p_action = 'unsuspend' then
    update properties set suspended_at = null, suspended_reason = null where id = p_id;
  elsif p_action = 'reject' then
    update properties set status = 'rejected', rejection_reason = coalesce(nullif(btrim(p_reason), ''), 'Please review this listing and resubmit.') where id = p_id;
  elsif p_action = 'archive' then
    update properties set status = 'archived' where id = p_id;
  elsif p_action = 'delete' then
    delete from properties where id = p_id;
  else raise exception 'Unknown action.';
  end if;
  perform public.admin_log('property.' || p_action, 'property', p_id::text, jsonb_build_object('status', old_status, 'title', t), null, p_reason);
  if p_action in ('suspend', 'reject') then
    insert into notifications(user_id, title, body, type, entity_id)
    values (aid, case when p_action = 'suspend' then 'Listing removed' else 'Listing needs changes' end,
            '"' || t || '": ' || coalesce(nullif(btrim(p_reason), ''), 'See your listing for details.'), 'rejection', p_id);
  end if;
end $$;

-- Reports
create or replace function public.admin_list_reports(p_status text default null)
returns table(id uuid, property_id uuid, property_title text, agent_id uuid, agent_name text, reporter_name text, reporter_email text,
              category text, details text, status text, admin_resolution text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_assert();
  return query
  select r.id, r.property_id, p.title, r.agent_id, p.agent_name, r.reporter_name, r.reporter_email, r.category::text, r.details, r.status::text, r.admin_resolution, r.created_at
    from content_reports r left join properties p on p.id = r.property_id
   where p_status is null or r.status::text = p_status
   order by (r.status = 'open') desc, r.created_at desc limit 300;
end $$;

create or replace function public.admin_resolve_report(p_id uuid, p_status text, p_resolution text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_assert();
  if p_status not in ('open', 'investigating', 'resolved', 'dismissed') then raise exception 'Invalid status.'; end if;
  update content_reports set status = p_status::public.report_status, admin_resolution = nullif(btrim(p_resolution), ''),
         resolved_by = case when p_status in ('resolved', 'dismissed') then auth.uid() end,
         resolved_at = case when p_status in ('resolved', 'dismissed') then now() end
   where id = p_id;
  perform public.admin_log('report.' || p_status, 'report', p_id::text, null, null, p_resolution);
end $$;

-- Reviews
create or replace function public.admin_list_reviews(p_hidden boolean default null)
returns table(id uuid, property_id uuid, property_title text, reviewer_name text, rating int, title text, body text,
              owner_response text, is_hidden boolean, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_assert();
  return query
  select r.id, r.property_id, p.title, r.reviewer_name, r.rating::int, r.title, r.body, r.owner_response, r.is_hidden, r.created_at
    from property_reviews r left join properties p on p.id = r.property_id
   where p_hidden is null or r.is_hidden = p_hidden
   order by r.created_at desc limit 300;
end $$;

create or replace function public.admin_hide_review(p_id uuid, p_hidden boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_assert();
  update property_reviews set is_hidden = p_hidden where id = p_id;
  perform public.admin_log(case when p_hidden then 'review.hide' else 'review.show' end, 'review', p_id::text, null, null, p_reason);
end $$;

-- Payments
create or replace function public.admin_list_payments()
returns table(id uuid, agent_id uuid, agent_name text, agent_email text, plan text, status text, amount_kes int, mpesa_receipt_number text,
              phone text, failure_reason text, starts_at timestamptz, ends_at timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_assert();
  return query
  select s.id, s.agent_id, p.full_name, p.email, s.plan::text, s.status::text, s.amount_kes, s.mpesa_receipt_number, s.phone, s.failure_reason, s.starts_at, s.ends_at, s.created_at
    from agent_subscriptions s left join profiles p on p.id = s.agent_id
   order by s.created_at desc limit 300;
end $$;

-- Audit log
create or replace function public.admin_list_audit()
returns table(id bigint, admin_name text, action text, entity_type text, entity_id text, reason text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.admin_assert();
  return query
  select a.id, p.full_name, a.action, a.entity_type, a.entity_id, a.reason, a.created_at
    from admin_audit_logs a left join profiles p on p.id = a.admin_id order by a.created_at desc limit 200;
end $$;

-- Only signed-in users may even try; each function re-checks that the caller is an admin.
revoke execute on function
  public.admin_overview(), public.admin_list_agents(), public.admin_set_agent(uuid, text, text, text, text), public.admin_set_role(uuid, text),
  public.admin_grant_subscription(uuid, text, int, text), public.admin_end_subscription(uuid, text),
  public.admin_list_properties(text), public.admin_set_property(uuid, text, text),
  public.admin_list_reports(text), public.admin_resolve_report(uuid, text, text),
  public.admin_list_reviews(boolean), public.admin_hide_review(uuid, boolean, text),
  public.admin_list_payments(), public.admin_list_audit()
  from public, anon;
grant execute on function
  public.admin_overview(), public.admin_list_agents(), public.admin_set_agent(uuid, text, text, text, text), public.admin_set_role(uuid, text),
  public.admin_grant_subscription(uuid, text, int, text), public.admin_end_subscription(uuid, text),
  public.admin_list_properties(text), public.admin_set_property(uuid, text, text),
  public.admin_list_reports(text), public.admin_resolve_report(uuid, text, text),
  public.admin_list_reviews(boolean), public.admin_hide_review(uuid, boolean, text),
  public.admin_list_payments(), public.admin_list_audit()
  to authenticated;

commit;
