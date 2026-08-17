-- Group data is accessed through narrow authenticated RPCs. This keeps invite
-- tokens owner-only and prevents callers from selecting membership rows directly.
revoke select, insert, update, delete on public.groups, public.group_members from authenticated;

update public.groups set invite_code = encode(extensions.gen_random_bytes(24), 'hex');
alter table public.groups alter column invite_code set default encode(extensions.gen_random_bytes(24), 'hex');
alter table public.groups drop constraint if exists groups_invite_code_length_check;
alter table public.groups add constraint groups_invite_code_length_check check (invite_code ~ '^[0-9a-f]{48}$');
create unique index groups_owner_normalized_name_idx on public.groups (owner_id, lower(btrim(name)));

create function public.create_study_group(p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare u uuid := (select auth.uid()); gid uuid;
begin
  if u is null then raise exception using errcode='42501',message='Authentication required'; end if;
  p_name := btrim(p_name);
  if p_name is null or char_length(p_name) not between 1 and 100 then raise exception using errcode='22023',message='Group name must be between 1 and 100 characters'; end if;
  insert into public.groups(name,owner_id) values(p_name,u) returning id into gid;
  return gid;
exception when unique_violation then raise exception using errcode='23505',message='You already have a group with this name';
end $$;

create function public.get_my_study_groups() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare u uuid := (select auth.uid()); result jsonb;
begin
  if u is null then raise exception using errcode='42501',message='Authentication required'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',g.id,'name',g.name,'role',m.role,'memberCount',(select count(*) from public.group_members x where x.group_id=g.id)) order by g.name),'[]'::jsonb) into result
  from public.group_members m join public.groups g on g.id=m.group_id where m.user_id=u;
  return result;
end $$;

create function public.preview_group_invite(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare u uuid := (select auth.uid()); result jsonb;
begin
  if u is null then raise exception using errcode='42501',message='Authentication required'; end if;
  if p_token is null or p_token !~ '^[0-9a-f]{48}$' then return null; end if;
  select jsonb_build_object('name',g.name,'memberCount',(select count(*) from public.group_members m where m.group_id=g.id),'isMember',exists(select 1 from public.group_members m where m.group_id=g.id and m.user_id=u)) into result
  from public.groups g where g.invite_code=p_token;
  return result;
end $$;

create function public.join_study_group(p_token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare u uuid := (select auth.uid()); gid uuid;
begin
  if u is null then raise exception using errcode='42501',message='Authentication required'; end if;
  if p_token is null or p_token !~ '^[0-9a-f]{48}$' then raise exception using errcode='P0002',message='Invite not found'; end if;
  select id into gid from public.groups where invite_code=p_token for key share;
  if gid is null then raise exception using errcode='P0002',message='Invite not found'; end if;
  insert into public.group_members(group_id,user_id,role) values(gid,u,'member') on conflict(group_id,user_id) do nothing;
  return gid;
end $$;

create function public.get_study_group(p_group_id uuid,p_period text default 'week',p_limit integer default 50) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare u uuid := (select auth.uid()); tz text; today date; boundary timestamptz; result jsonb; user_role public.group_role;
begin
  if u is null then raise exception using errcode='42501',message='Authentication required'; end if;
  if p_group_id is null then raise exception using errcode='22023',message='Group is required'; end if;
  p_period:=lower(btrim(p_period));
  if p_period is null or p_period not in('today','week','month','all') then raise exception using errcode='22023',message='Unsupported leaderboard period'; end if;
  if p_limit is null or p_limit not between 1 and 100 then raise exception using errcode='22023',message='Leaderboard limit must be between 1 and 100'; end if;
  select role into user_role from public.group_members where group_id=p_group_id and user_id=u;
  if user_role is null then raise exception using errcode='42501',message='Group membership required'; end if;
  select timezone into tz from public.profiles where id=u; tz:=coalesce(tz,'UTC'); today:=(clock_timestamp() at time zone tz)::date;
  boundary:=case p_period when'today'then today::timestamp at time zone tz when'week'then(today-(extract(isodow from today)::int-1))::timestamp at time zone tz when'month'then date_trunc('month',today::timestamp)::timestamp at time zone tz else null end;
  with members as (
    select m.user_id,m.role,p.display_name,p.username::text username from public.group_members m join public.profiles p on p.id=m.user_id where m.group_id=p_group_id
  ), totals as (
    select m.user_id,coalesce(sum(s.duration_seconds) filter(where s.ended_at is not null and s.duration_seconds>0 and(boundary is null or s.started_at>=boundary)),0)::bigint seconds
    from members m left join public.study_sessions s on s.user_id=m.user_id group by m.user_id
  ), ranked as (
    select m.*,t.seconds,case when t.seconds>0 then dense_rank() over(order by case when t.seconds>0 then t.seconds end desc nulls last)::bigint end rank
    from members m join totals t using(user_id)
  ), visible as (
    select * from ranked order by (rank is null),rank,lower(username),user_id limit p_limit
  )
  select jsonb_build_object(
    'id',g.id,'name',g.name,'role',user_role,'inviteToken',case when user_role='owner' then g.invite_code end,
    'memberCount',(select count(*) from members),'period',p_period,'timezone',tz,
    'members',(select jsonb_agg(jsonb_build_object('displayName',m.display_name,'username',m.username,'role',m.role) order by (m.role='owner') desc,lower(m.username)) from members m),
    'leaderboard',(select jsonb_agg(jsonb_build_object('displayName',v.display_name,'username',v.username,'durationSeconds',v.seconds,'rank',v.rank,'isCurrentUser',v.user_id=u) order by (v.rank is null),v.rank,lower(v.username)) from visible v)
  ) into result from public.groups g where g.id=p_group_id;
  return result;
end $$;

create function public.rename_study_group(p_group_id uuid,p_name text) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=(select auth.uid()); begin if u is null then raise exception using errcode='42501',message='Authentication required'; end if; p_name:=btrim(p_name); if p_name is null or char_length(p_name) not between 1 and 100 then raise exception using errcode='22023',message='Group name must be between 1 and 100 characters'; end if; update public.groups set name=p_name where id=p_group_id and owner_id=u; if not found then raise exception using errcode='42501',message='Group owner access required'; end if; exception when unique_violation then raise exception using errcode='23505',message='You already have a group with this name'; end $$;
create function public.regenerate_group_invite(p_group_id uuid) returns text language plpgsql security definer set search_path='' as $$ declare u uuid:=(select auth.uid()); token text; begin if u is null then raise exception using errcode='42501',message='Authentication required'; end if; update public.groups set invite_code=encode(extensions.gen_random_bytes(24),'hex') where id=p_group_id and owner_id=u returning invite_code into token; if token is null then raise exception using errcode='42501',message='Group owner access required'; end if; return token; end $$;
create function public.remove_study_group_member(p_group_id uuid,p_username text) returns void language plpgsql security definer set search_path='' as $$ declare u uuid:=(select auth.uid()); begin if u is null then raise exception using errcode='42501',message='Authentication required'; end if; if not exists(select 1 from public.groups where id=p_group_id and owner_id=u) then raise exception using errcode='42501',message='Group owner access required'; end if; delete from public.group_members m using public.profiles p where m.group_id=p_group_id and m.user_id=p.id and p.username=lower(btrim(p_username)) and m.role='member'; if not found then raise exception using errcode='P0002',message='Member not found'; end if; end $$;
create function public.leave_study_group(p_group_id uuid) returns void language plpgsql security definer set search_path='' as $$ declare u uuid:=(select auth.uid()); begin if u is null then raise exception using errcode='42501',message='Authentication required'; end if; delete from public.group_members where group_id=p_group_id and user_id=u and role='member'; if not found then raise exception using errcode='42501',message='Owners must delete the group instead of leaving'; end if; end $$;
create function public.delete_study_group(p_group_id uuid) returns void language plpgsql security definer set search_path='' as $$ declare u uuid:=(select auth.uid()); begin if u is null then raise exception using errcode='42501',message='Authentication required'; end if; delete from public.groups where id=p_group_id and owner_id=u; if not found then raise exception using errcode='42501',message='Group owner access required'; end if; end $$;

revoke all on function public.create_study_group(text),public.get_my_study_groups(),public.preview_group_invite(text),public.join_study_group(text),public.get_study_group(uuid,text,integer),public.rename_study_group(uuid,text),public.regenerate_group_invite(uuid),public.remove_study_group_member(uuid,text),public.leave_study_group(uuid),public.delete_study_group(uuid) from public,anon;
grant execute on function public.create_study_group(text),public.get_my_study_groups(),public.preview_group_invite(text),public.join_study_group(text),public.get_study_group(uuid,text,integer),public.rename_study_group(uuid,text),public.regenerate_group_invite(uuid),public.remove_study_group_member(uuid,text),public.leave_study_group(uuid),public.delete_study_group(uuid) to authenticated;
