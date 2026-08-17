create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate text;
  candidate_timezone text;
begin
  candidate := lower(btrim(coalesce(new.raw_user_meta_data ->> 'username', '')));

  if candidate !~ '^[a-z0-9][a-z0-9_]{2,29}$' then
    raise exception using
      errcode = '23514',
      message = 'invalid signup username';
  end if;

  candidate_timezone := coalesce(new.raw_user_meta_data ->> 'timezone', 'UTC');
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = candidate_timezone) then
    candidate_timezone := 'UTC';
  end if;

  insert into public.profiles (id, username, display_name, timezone)
  values (
    new.id,
    candidate,
    left(
      coalesce(
        nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
        split_part(coalesce(new.email, 'Learner'), '@', 1)
      ),
      80
    ),
    candidate_timezone
  );

  return new;
exception
  when unique_violation then
    raise exception using
      errcode = '23505',
      message = 'signup username already exists';
end;
$$;

create or replace function public.is_username_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    lower(btrim(candidate)) ~ '^[a-z0-9][a-z0-9_]{2,29}$'
    and not exists (
      select 1
      from public.profiles
      where username = lower(btrim(candidate))
    );
$$;

revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated;

comment on function public.is_username_available(text) is
  'Returns username availability without exposing profile rows. Uniqueness remains enforced by the profiles constraint.';
