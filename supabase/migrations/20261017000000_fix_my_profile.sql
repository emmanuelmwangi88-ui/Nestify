drop function if exists public.my_profile();

create or replace function public.my_profile() returns public.profiles
language sql stable security definer set search_path = public as $$
  select * from public.profiles where id = auth.uid();
$$;

revoke execute on function public.my_profile() from public, anon;
grant  execute on function public.my_profile() to authenticated;