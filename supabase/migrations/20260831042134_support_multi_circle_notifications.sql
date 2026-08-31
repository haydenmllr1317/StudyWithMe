-- Restore the normalized multi-Circle destination model without removing the
-- legacy study_sessions.activity_circle_id compatibility projection.
drop trigger if exists study_sessions_sync_activity_destination on public.study_sessions;
drop function if exists private.sync_session_activity_destination();
drop index if exists public.session_circle_shares_one_destination_idx;

insert into public.session_circle_shares(session_id, group_id)
select id, activity_circle_id
from public.study_sessions
where activity_circle_id is not null
on conflict do nothing;

grant select on public.session_circle_shares to authenticated;
create policy "Authors can read their Circle shares"
on public.session_circle_shares for select to authenticated
using (exists (
  select 1 from public.study_sessions s
  where s.id = session_id and s.user_id = (select auth.uid())
));

create or replace function private.can_view_activity_session(target_session_id uuid, viewer_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.study_sessions s
    where s.id = target_session_id
      and s.ended_at is not null
      and s.duration_seconds > 0
      and (
        s.user_id = viewer_id
        or exists (
          select 1
          from public.session_circle_shares scs
          where scs.session_id = s.id
            and exists (
              select 1 from public.group_members author_membership
              where author_membership.group_id = scs.group_id
                and author_membership.user_id = s.user_id
            )
            and exists (
              select 1 from public.group_members viewer_membership
              where viewer_membership.group_id = scs.group_id
                and viewer_membership.user_id = viewer_id
            )
        )
      )
  );
$$;

create function public.update_study_session_reflection(
  p_session_id uuid,
  p_notes text,
  p_rating smallint,
  p_reflection_photo_path text,
  p_activity_circle_ids uuid[]
) returns public.study_sessions
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := (select auth.uid());
  ids uuid[] := coalesce(p_activity_circle_ids, '{}'::uuid[]);
  s public.study_sessions;
begin
  if u is null then raise exception using errcode='42501', message='Authentication required'; end if;
  if p_notes is not null and char_length(p_notes) > 5000 then raise exception using errcode='22001', message='Notes must be 5000 characters or fewer'; end if;
  if p_rating is not null and p_rating not between 1 and 5 then raise exception using errcode='22023', message='Rating must be between 1 and 5'; end if;
  if cardinality(ids) <> cardinality(array(select distinct x from unnest(ids) x)) then raise exception using errcode='22023', message='Choose each Circle once'; end if;
  if exists(select 1 from unnest(ids) x where not exists(select 1 from public.group_members gm where gm.group_id=x and gm.user_id=u)) then
    raise exception using errcode='42501', message='You can only share to Circles you belong to';
  end if;
  if p_reflection_photo_path is not null and (
    split_part(p_reflection_photo_path,'/',1) <> u::text
    or split_part(p_reflection_photo_path,'/',2) <> p_session_id::text
  ) then raise exception using errcode='42501', message='Reflection photo path is not owned by this session'; end if;

  update public.study_sessions
  set notes = nullif(btrim(p_notes), ''), rating = p_rating,
      reflection_photo_path = p_reflection_photo_path,
      activity_circle_id = ids[1], share_notes = cardinality(ids) > 0
  where id = p_session_id and user_id = u and ended_at is not null
  returning * into s;
  if not found then raise exception using errcode='P0002', message='Completed study session not found'; end if;

  delete from public.session_circle_shares where session_id = p_session_id;
  insert into public.session_circle_shares(session_id, group_id)
  select p_session_id, x from unnest(ids) x;
  return s;
end;
$$;
revoke all on function public.update_study_session_reflection(uuid,text,smallint,text,uuid[]) from public, anon;
grant execute on function public.update_study_session_reflection(uuid,text,smallint,text,uuid[]) to authenticated;

create function public.create_manual_study_session(
  p_local_date date,
  p_local_time time,
  p_duration_minutes integer,
  p_goal_id uuid,
  p_rating smallint,
  p_notes text,
  p_activity_circle_ids uuid[]
) returns public.study_sessions
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := (select auth.uid());
  ids uuid[] := coalesce(p_activity_circle_ids, '{}'::uuid[]);
  tz text;
  start_at timestamptz;
  finish_at timestamptz;
  s public.study_sessions;
begin
  if u is null then raise exception using errcode='42501', message='Authentication required'; end if;
  if p_duration_minutes is null or p_duration_minutes not between 1 and 1440 then raise exception using errcode='22023', message='Duration must be between 1 and 1440 minutes'; end if;
  if p_notes is not null and char_length(p_notes) > 5000 then raise exception using errcode='22001', message='Notes must be 5000 characters or fewer'; end if;
  if p_rating is not null and p_rating not between 1 and 5 then raise exception using errcode='22023', message='Rating must be between 1 and 5'; end if;
  if not exists(select 1 from public.study_goals g where g.id=p_goal_id and g.user_id=u and not g.is_archived) then raise exception using errcode='42501', message='Choose an active goal you own'; end if;
  if cardinality(ids) <> cardinality(array(select distinct x from unnest(ids) x)) then raise exception using errcode='22023', message='Choose each Circle once'; end if;
  if exists(select 1 from unnest(ids) x where not exists(select 1 from public.group_members gm where gm.group_id=x and gm.user_id=u)) then
    raise exception using errcode='42501', message='You can only share to Circles you belong to';
  end if;
  select coalesce(p.timezone,'UTC') into tz from public.profiles p where p.id=u;
  start_at := (p_local_date + p_local_time) at time zone tz;
  finish_at := start_at + make_interval(mins => p_duration_minutes);
  if finish_at > clock_timestamp() then raise exception using errcode='22023', message='Past sessions must finish before now'; end if;

  insert into public.study_sessions(
    user_id,goal_id,started_at,ended_at,duration_seconds,session_type,notes,rating,
    activity_circle_id,share_notes,source,paused_seconds
  ) values (
    u,p_goal_id,start_at,finish_at,p_duration_minutes*60,'normal',nullif(btrim(p_notes),''),p_rating,
    ids[1],cardinality(ids)>0,'manual',0
  ) returning * into s;
  insert into public.session_circle_shares(session_id, group_id)
  select s.id, x from unnest(ids) x;
  return s;
end;
$$;
revoke all on function public.create_manual_study_session(date,time,integer,uuid,smallint,text,uuid[]) from public, anon;
grant execute on function public.create_manual_study_session(date,time,integer,uuid,smallint,text,uuid[]) to authenticated;

-- Notifications were introduced in 20260818021321 and intentionally removed
-- by 20260818024550. Recreate them before restoring notification-aware loves.
-- IF NOT EXISTS keeps this migration safe for an environment where the table
-- was restored manually, without replacing or clearing any existing rows.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null references public.study_sessions(id) on delete cascade,
  kind text not null check (kind = 'session_love'),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (recipient_id, actor_id, session_id, kind),
  check (recipient_id <> actor_id)
);
create index if not exists notifications_recipient_created_idx
  on public.notifications(recipient_id, created_at desc);
alter table public.notifications enable row level security;
revoke all on public.notifications from public, anon, authenticated;

create or replace function public.toggle_session_love(p_session_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare u uuid := (select auth.uid()); author_id uuid; affected integer;
begin
  if u is null then raise exception using errcode='42501', message='Authentication required'; end if;
  select s.user_id into author_id from public.study_sessions s
  where s.id=p_session_id and s.user_id<>u and (select private.can_view_activity_session(s.id,u));
  if author_id is null then raise exception using errcode='42501', message='Session is not available to love'; end if;
  delete from public.session_loves where session_id=p_session_id and user_id=u;
  if found then return false; end if;
  insert into public.session_loves(session_id,user_id) values(p_session_id,u) on conflict do nothing;
  get diagnostics affected = row_count;
  if affected=1 then
    insert into public.notifications(recipient_id,actor_id,session_id,kind)
    values(author_id,u,p_session_id,'session_love') on conflict do nothing;
  end if;
  return affected=1;
end;
$$;

create function public.get_unread_notification_count()
returns integer language sql stable security definer set search_path = '' as $$
  select case when (select auth.uid()) is null then 0 else count(*)::integer end
  from public.notifications
  where recipient_id=(select auth.uid()) and read_at is null;
$$;
revoke all on function public.get_unread_notification_count() from public, anon;
grant execute on function public.get_unread_notification_count() to authenticated;

create or replace function public.get_notifications(p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare u uuid := (select auth.uid()); result jsonb;
begin
  if u is null then raise exception using errcode='42501', message='Authentication required'; end if;
  if p_limit is null or p_limit not between 1 and 100 then raise exception using errcode='22023', message='Notification limit must be between 1 and 100'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',n.id,'sessionId',n.session_id,'kind',n.kind,
    'actorDisplayName',p.display_name,'actorUsername',p.username::text,
    'createdAt',n.created_at,'read',n.read_at is not null
  ) order by n.created_at desc),'[]'::jsonb) into result
  from (
    select * from public.notifications
    where recipient_id=u order by created_at desc limit p_limit
  ) n
  join public.profiles p on p.id=n.actor_id;
  return result;
end;
$$;

create or replace function public.mark_notifications_read(p_notification_id uuid default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare u uuid := (select auth.uid()); affected integer;
begin
  if u is null then raise exception using errcode='42501', message='Authentication required'; end if;
  update public.notifications set read_at=coalesce(read_at,clock_timestamp())
  where recipient_id=u and read_at is null
    and (p_notification_id is null or id=p_notification_id);
  get diagnostics affected=row_count;
  return affected;
end;
$$;
revoke all on function public.get_notifications(integer), public.mark_notifications_read(uuid) from public, anon;
grant execute on function public.get_notifications(integer), public.mark_notifications_read(uuid) to authenticated;

create or replace function public.get_activity_feed(
  p_scope text default 'all_circles', p_group_id uuid default null,
  p_before_ended_at timestamptz default null, p_before_id uuid default null, p_limit integer default 20
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare u uuid := (select auth.uid()); scope text := lower(btrim(p_scope)); tz text; result jsonb;
begin
  if u is null then raise exception using errcode='42501', message='Authentication required'; end if;
  if scope is null or scope not in('mine','all_circles','circle') then raise exception using errcode='22023', message='Unsupported activity scope'; end if;
  if p_limit is null or p_limit not between 1 and 50 then raise exception using errcode='22023', message='Activity limit must be between 1 and 50'; end if;
  if (p_before_ended_at is null) <> (p_before_id is null) then raise exception using errcode='22023', message='Activity cursor is incomplete'; end if;
  if scope='circle' and (p_group_id is null or not exists(select 1 from public.group_members where group_id=p_group_id and user_id=u)) then raise exception using errcode='42501', message='Circle membership required'; end if;
  select timezone into tz from public.profiles where id=u; tz := coalesce(tz,'UTC');
  with candidates as materialized (
    select s.id,s.user_id,s.ended_at,s.duration_seconds,s.rating,s.notes,s.reflection_photo_path,
      p.display_name,p.username::text username,coalesce(goal.name,'Study session') goal_name,
      coalesce(shared.circles,'[]'::jsonb) circles,
      (select count(*)::int from public.session_loves l where l.session_id=s.id) love_count,
      exists(select 1 from public.session_loves l where l.session_id=s.id and l.user_id=u) is_loved
    from public.study_sessions s
    join public.profiles p on p.id=s.user_id
    left join public.study_goals goal on goal.id=s.goal_id and goal.user_id=s.user_id
    left join lateral (
      select jsonb_agg(jsonb_build_object('id',g.id,'name',g.name) order by g.name) circles
      from public.session_circle_shares scs join public.groups g on g.id=scs.group_id
      where scs.session_id=s.id
    ) shared on true
    where s.ended_at is not null and s.duration_seconds>0
      and (p_before_ended_at is null or (s.ended_at,s.id)<(p_before_ended_at,p_before_id))
      and (select private.can_view_activity_session(s.id,u))
      and ((scope='mine' and s.user_id=u)
        or (scope='all_circles' and exists(select 1 from public.session_circle_shares scs where scs.session_id=s.id))
        or (scope='circle' and exists(select 1 from public.session_circle_shares scs where scs.session_id=s.id and scs.group_id=p_group_id)))
    order by s.ended_at desc,s.id desc limit p_limit+1
  ), visible as (select * from candidates order by ended_at desc,id desc limit p_limit),
  cursor_row as (select ended_at,id from visible order by ended_at,id limit 1)
  select jsonb_build_object('timezone',tz,'items',coalesce((select jsonb_agg(jsonb_build_object(
    'id',v.id,'displayName',v.display_name,'username',v.username,'goalName',v.goal_name,
    'durationSeconds',v.duration_seconds,'completedAt',date_trunc('minute',v.ended_at),'rating',v.rating,
    'sharedNotes',v.notes,'reflectionPhotoPath',v.reflection_photo_path,'circles',v.circles,
    'loveCount',v.love_count,'isLoved',v.is_loved,'canLove',v.user_id<>u,'isCurrentUser',v.user_id=u
  ) order by v.ended_at desc,v.id desc) from visible v),'[]'::jsonb),
  'nextCursor',case when(select count(*) from candidates)>p_limit then(select jsonb_build_object('endedAt',c.ended_at,'id',c.id)from cursor_row c)end) into result;
  return result;
end;
$$;

comment on column public.study_sessions.activity_circle_id is
  'Compatibility pointer to the first shared Circle; session_circle_shares is authoritative.';
comment on table public.session_circle_shares is
  'Authoritative many-to-many visibility relationship between one study session and its selected Circles.';
comment on table public.notifications is
  'Durable, de-duplicated account notifications generated by activity interactions.';
