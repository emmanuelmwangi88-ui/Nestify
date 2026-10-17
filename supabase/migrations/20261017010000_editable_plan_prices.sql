-- Nestify: the super admin can change subscription prices and listing limits.
-- Prices live in platform_settings (key 'plans'). Agents see them, the M-Pesa function charges them,
-- and a payment always records the price at the moment it was started. Safe to run twice.
begin;

insert into public.platform_settings(key, value, description)
values ('plans',
        '{"starter":{"amount":2500,"limit":3},"growth":{"amount":6500,"limit":12},"elite":{"amount":15000,"limit":40}}'::jsonb,
        'Monthly subscription price in KES and active-listing limit for each plan')
on conflict (key) do nothing;

create or replace function public.admin_set_plans(p_plans jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare k text; amt text; lim text; old jsonb;
begin
  perform public.admin_assert();
  foreach k in array array['starter', 'growth', 'elite'] loop
    amt := p_plans -> k ->> 'amount';
    lim := p_plans -> k ->> 'limit';
    if amt is null or amt !~ '^[0-9]{1,7}$' or amt::int < 1 or amt::int > 1000000 then
      raise exception 'The % price must be a whole number of shillings from 1 to 1,000,000.', k;
    end if;
    if lim is null or lim !~ '^[0-9]{1,4}$' or lim::int < 1 or lim::int > 1000 then
      raise exception 'The % listing limit must be a whole number from 1 to 1000.', k;
    end if;
  end loop;
  select value into old from public.platform_settings where key = 'plans';
  insert into public.platform_settings(key, value, description, updated_by, updated_at)
  values ('plans',
          jsonb_build_object(
            'starter', jsonb_build_object('amount', (p_plans -> 'starter' ->> 'amount')::int, 'limit', (p_plans -> 'starter' ->> 'limit')::int),
            'growth',  jsonb_build_object('amount', (p_plans -> 'growth'  ->> 'amount')::int, 'limit', (p_plans -> 'growth'  ->> 'limit')::int),
            'elite',   jsonb_build_object('amount', (p_plans -> 'elite'   ->> 'amount')::int, 'limit', (p_plans -> 'elite'   ->> 'limit')::int)),
          'Monthly subscription price in KES and active-listing limit for each plan', auth.uid(), now())
  on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at;
  perform public.admin_log('plans.update', 'setting', 'plans', old, p_plans, null);
end $$;
revoke execute on function public.admin_set_plans(jsonb) from public, anon;
grant execute on function public.admin_set_plans(jsonb) to authenticated;

-- Manual grants now use the configured limit (the price is only a record, so a grant never counts as revenue).
create or replace function public.admin_grant_subscription(p_agent uuid, p_plan text, p_months int default 1, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare amt int; lim int; base timestamptz; ph text; sid uuid := gen_random_uuid(); cfg jsonb;
begin
  perform public.admin_assert();
  if p_months < 1 or p_months > 12 then raise exception 'Choose 1 to 12 months.'; end if;
  if p_plan not in ('starter', 'growth', 'elite') then raise exception 'Invalid plan.'; end if;
  select value into cfg from public.platform_settings where key = 'plans';
  amt := coalesce((cfg -> p_plan ->> 'amount')::int, case p_plan when 'starter' then 2500 when 'growth' then 6500 else 15000 end);
  lim := coalesce((cfg -> p_plan ->> 'limit')::int,  case p_plan when 'starter' then 3 when 'growth' then 12 else 40 end);
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

commit;
