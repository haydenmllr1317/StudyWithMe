create extension if not exists citext with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.session_type as enum ('normal', 'pomodoro');
create type public.group_role as enum ('owner', 'member');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username extensions.citext not null unique,
  display_name text not null check (char_length(display_name) between 1 and 80),
  avatar_url text,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username::text ~ '^[a-z0-9][a-z0-9_]{2,29}$')
);

create table public.study_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  description text check (description is null or char_length(description) <= 1000),
  daily_target_minutes integer check (daily_target_minutes is null or daily_target_minutes between 1 and 1440),
  weekly_target_minutes integer check (weekly_target_minutes is null or weekly_target_minutes between 1 and 10080),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal_id uuid,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds integer,
  session_type public.session_type not null default 'normal',
  notes text check (notes is null or char_length(notes) <= 5000),
  rating smallint check (rating is null or rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_sessions_goal_owner_fk foreign key (goal_id, user_id)
    references public.study_goals(id, user_id) on delete set null (goal_id),
  constraint study_sessions_timing_check check (
    (ended_at is null and duration_seconds is null)
    or
    (ended_at is not null and ended_at >= started_at and duration_seconds = floor(extract(epoch from (ended_at - started_at)))::integer)
  )
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  invite_code text not null unique default substring(replace(gen_random_uuid()::text, '-', '') from 1 for 12),
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  role public.group_role not null default 'member',
  primary key (group_id, user_id)
);

create index study_goals_user_id_idx on public.study_goals (user_id);
create index study_sessions_user_started_at_idx on public.study_sessions (user_id, started_at desc);
create index study_sessions_goal_started_at_idx on public.study_sessions (goal_id, started_at desc) where goal_id is not null;
create index study_sessions_completed_interval_idx on public.study_sessions (started_at, user_id) include (duration_seconds) where ended_at is not null;
create unique index study_sessions_one_active_per_user_idx on public.study_sessions (user_id) where ended_at is null;
create index groups_owner_id_idx on public.groups (owner_id);
create index group_members_user_group_idx on public.group_members (user_id, group_id);

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function private.set_updated_at();
create trigger study_goals_set_updated_at before update on public.study_goals
for each row execute function private.set_updated_at();
create trigger study_sessions_set_updated_at before update on public.study_sessions
for each row execute function private.set_updated_at();

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate text;
  candidate_timezone text;
begin
  candidate := lower(regexp_replace(coalesce(new.raw_user_meta_data ->> 'username', split_part(coalesce(new.email, 'learner'), '@', 1)), '[^a-zA-Z0-9_]', '', 'g'));
  candidate := regexp_replace(candidate, '^[^a-z0-9]+', '', 'g');
  candidate := left(coalesce(nullif(candidate, ''), 'learner'), 20);
  if char_length(candidate) < 3 then candidate := 'learner'; end if;
  candidate := candidate || '_' || left(replace(new.id::text, '-', ''), 8);

  candidate_timezone := coalesce(new.raw_user_meta_data ->> 'timezone', 'UTC');
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = candidate_timezone) then
    candidate_timezone := 'UTC';
  end if;

  insert into public.profiles (id, username, display_name, timezone)
  values (
    new.id,
    candidate,
    left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(coalesce(new.email, 'Learner'), '@', 1)), 80),
    candidate_timezone
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

create function private.add_group_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.group_members (group_id, user_id, role) values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

create trigger on_group_created
after insert on public.groups
for each row execute function private.add_group_owner_membership();

create function private.is_group_member(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
    where group_id = target_group_id and user_id = (select auth.uid())
  );
$$;

create function private.is_group_owner(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.groups
    where id = target_group_id and owner_id = (select auth.uid())
  );
$$;

grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.study_goals, public.study_sessions to authenticated;
grant select, insert, update, delete on public.groups, public.group_members to authenticated;
grant usage on type public.session_type, public.group_role to authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_group_member(uuid), private.is_group_owner(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.study_goals enable row level security;
alter table public.study_sessions enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;

create policy "Authenticated users can read profiles"
on public.profiles for select to authenticated using (true);
create policy "Users can insert their own profile"
on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "Users can update their own profile"
on public.profiles for update to authenticated
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Users can read their own goals"
on public.study_goals for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create their own goals"
on public.study_goals for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their own goals"
on public.study_goals for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own goals"
on public.study_goals for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users can read their own sessions"
on public.study_sessions for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create their own sessions"
on public.study_sessions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their own sessions"
on public.study_sessions for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own sessions"
on public.study_sessions for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Members can read their groups"
on public.groups for select to authenticated using ((select private.is_group_member(id)));
create policy "Users can create groups they own"
on public.groups for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Owners can update their groups"
on public.groups for update to authenticated
using ((select private.is_group_owner(id))) with check ((select auth.uid()) = owner_id);
create policy "Owners can delete their groups"
on public.groups for delete to authenticated using ((select private.is_group_owner(id)));

create policy "Members can read memberships in their groups"
on public.group_members for select to authenticated using ((select private.is_group_member(group_id)));
create policy "Owners can add group members"
on public.group_members for insert to authenticated
with check ((select private.is_group_owner(group_id)) and role = 'member');
create policy "Owners can update group members"
on public.group_members for update to authenticated
using ((select private.is_group_owner(group_id)) and role <> 'owner')
with check ((select private.is_group_owner(group_id)) and role = 'member');
create policy "Members can leave and owners can remove members"
on public.group_members for delete to authenticated
using (role <> 'owner' and ((select auth.uid()) = user_id or (select private.is_group_owner(group_id))));

comment on table public.study_sessions is 'Source-of-truth study intervals. Totals, streaks, and leaderboard positions are derived.';
comment on column public.profiles.timezone is 'IANA timezone name used to derive the user local day and week boundaries.';
