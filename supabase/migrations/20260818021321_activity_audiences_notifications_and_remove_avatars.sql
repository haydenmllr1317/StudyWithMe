alter table public.study_sessions
  add column activity_audience text not null default 'only_me'
  check (activity_audience in ('only_me', 'circles', 'everyone'));

update public.study_sessions
set activity_audience = case when share_notes then 'everyone' else 'only_me' end;

create table public.session_audience_groups (
  session_id uuid not null references public.study_sessions(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (session_id, group_id)
);
create index session_audience_groups_group_session_idx
  on public.session_audience_groups(group_id, session_id);
alter table public.session_audience_groups enable row level security;
revoke all on public.session_audience_groups from public, anon, authenticated;
grant select on public.session_audience_groups to authenticated;
create policy "Authors can read their session audiences"
on public.session_audience_groups for select to authenticated
using (exists (
  select 1 from public.study_sessions s
  where s.id=session_id and s.user_id=(select auth.uid())
));

create table public.notifications (
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
create index notifications_recipient_created_idx
  on public.notifications(recipient_id, created_at desc);
alter table public.notifications enable row level security;
revoke all on public.notifications from public, anon, authenticated;

create or replace function private.can_view_activity_session(target_session_id uuid, viewer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.study_sessions s
    where s.id = target_session_id
      and s.ended_at is not null
      and s.duration_seconds > 0
      and (
        s.user_id = viewer_id
        or s.activity_audience = 'everyone'
        or (
          s.activity_audience = 'circles'
          and exists (
            select 1
            from public.session_audience_groups sag
            join public.group_members gm on gm.group_id = sag.group_id
            where sag.session_id = s.id and gm.user_id = viewer_id
          )
        )
      )
  );
$$;
revoke all on function private.can_view_activity_session(uuid, uuid) from public, anon;
grant execute on function private.can_view_activity_session(uuid, uuid) to authenticated;

create or replace function public.update_study_session_reflection(
  p_session_id uuid,
  p_notes text,
  p_rating smallint,
  p_share_notes boolean,
  p_reflection_photo_path text,
  p_activity_audience text,
  p_group_ids uuid[] default '{}'::uuid[]
)
returns public.study_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := (select auth.uid());
  s public.study_sessions;
  requested_groups uuid[] := coalesce(p_group_ids, '{}'::uuid[]);
begin
  if u is null then raise exception using errcode='42501', message='Authentication required'; end if;
  if p_notes is not null and char_length(p_notes) > 5000 then raise exception using errcode='22001', message='Notes must be 5000 characters or fewer'; end if;
  if p_rating is not null and p_rating not between 1 and 5 then raise exception using errcode='22023', message='Rating must be between 1 and 5'; end if;
  if p_activity_audience not in ('only_me', 'circles', 'everyone') then raise exception using errcode='22023', message='Choose a valid activity audience'; end if;
  if p_activity_audience = 'circles' and cardinality(requested_groups) = 0 then raise exception using errcode='22023', message='Choose at least one Circle'; end if;
  if p_activity_audience <> 'circles' and cardinality(requested_groups) > 0 then raise exception using errcode='22023', message='Circle selections require the Circles audience'; end if;
  if exists (
    select 1 from unnest(requested_groups) requested(group_id)
    where not exists (
      select 1 from public.group_members gm
      where gm.group_id = requested.group_id and gm.user_id = u
    )
  ) then raise exception using errcode='42501', message='You can only share to Circles you belong to'; end if;
  if p_reflection_photo_path is not null and (
    split_part(p_reflection_photo_path,'/',1) <> u::text
    or split_part(p_reflection_photo_path,'/',2) <> p_session_id::text
  ) then raise exception using errcode='42501', message='Reflection photo path is not owned by this session'; end if;

  update public.study_sessions
  set notes = nullif(btrim(p_notes), ''), rating = p_rating,
      share_notes = p_activity_audience <> 'only_me',
      reflection_photo_path = p_reflection_photo_path,
      activity_audience = p_activity_audience
  where id = p_session_id and user_id = u and ended_at is not null
  returning * into s;
  if not found then raise exception using errcode='P0002', message='Completed study session not found'; end if;

  delete from public.session_audience_groups where session_id = p_session_id;
  if p_activity_audience = 'circles' then
    insert into public.session_audience_groups(session_id, group_id)
    select p_session_id, group_id from unnest(requested_groups) group_id
    on conflict do nothing;
  end if;
  return s;
end;
$$;
revoke all on function public.update_study_session_reflection(uuid,text,smallint,boolean,text,text,uuid[]) from public, anon;
grant execute on function public.update_study_session_reflection(uuid,text,smallint,boolean,text,text,uuid[]) to authenticated;

create or replace function public.get_activity_feed(
  p_scope text default 'everyone', p_group_id uuid default null,
  p_before_ended_at timestamptz default null, p_before_id uuid default null, p_limit integer default 20
)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid := (select auth.uid()); scope text := lower(btrim(p_scope)); tz text; result jsonb;
begin
 if u is null then raise exception using errcode='42501',message='Authentication required'; end if;
 if scope is null or scope not in('mine','everyone','circle') then raise exception using errcode='22023',message='Unsupported activity scope'; end if;
 if p_limit is null or p_limit not between 1 and 50 then raise exception using errcode='22023',message='Activity limit must be between 1 and 50'; end if;
 if (p_before_ended_at is null) <> (p_before_id is null) then raise exception using errcode='22023',message='Activity cursor is incomplete'; end if;
 if scope='circle' and (p_group_id is null or not exists(select 1 from public.group_members where group_id=p_group_id and user_id=u)) then raise exception using errcode='42501',message='Circle membership required'; end if;
 select timezone into tz from public.profiles where id=u; tz := coalesce(tz,'UTC');
 with candidates as materialized (
  select s.id,s.user_id,s.ended_at,s.duration_seconds,s.rating,s.notes,s.reflection_photo_path,s.activity_audience,
   p.display_name,p.username::text username,coalesce(g.name,'Study session') goal_name,
   (select count(*)::int from public.session_loves l where l.session_id=s.id) love_count,
   exists(select 1 from public.session_loves l where l.session_id=s.id and l.user_id=u) is_loved,
   (select count(*)::int from public.session_audience_groups ag where ag.session_id=s.id) audience_group_count
  from public.study_sessions s
  join public.profiles p on p.id=s.user_id
  left join public.study_goals g on g.id=s.goal_id and g.user_id=s.user_id
  where s.ended_at is not null and s.duration_seconds>0
    and (p_before_ended_at is null or (s.ended_at,s.id)<(p_before_ended_at,p_before_id))
    and (select private.can_view_activity_session(s.id,u))
    and (
      (scope='mine' and s.user_id=u)
      or (scope='everyone')
      or (scope='circle' and (
        (s.activity_audience='everyone' and exists(select 1 from public.group_members author_member where author_member.group_id=p_group_id and author_member.user_id=s.user_id))
        or exists(select 1 from public.session_audience_groups ag where ag.session_id=s.id and ag.group_id=p_group_id)
      ))
    )
  order by s.ended_at desc,s.id desc limit p_limit+1
 ), visible as (select * from candidates order by ended_at desc,id desc limit p_limit),
 cursor_row as (select ended_at,id from visible order by ended_at,id limit 1)
 select jsonb_build_object('timezone',tz,'items',coalesce((select jsonb_agg(jsonb_build_object(
  'id',v.id,'displayName',v.display_name,'username',v.username,'goalName',v.goal_name,
  'durationSeconds',v.duration_seconds,'completedAt',date_trunc('minute',v.ended_at),'rating',v.rating,
  'sharedNotes',v.notes,'reflectionPhotoPath',v.reflection_photo_path,
  'audience',v.activity_audience,'audienceGroupCount',v.audience_group_count,
  'loveCount',v.love_count,'isLoved',v.is_loved,'canLove',v.user_id<>u,'isCurrentUser',v.user_id=u
 ) order by v.ended_at desc,v.id desc) from visible v),'[]'::jsonb),
 'nextCursor',case when(select count(*) from candidates)>p_limit then(select jsonb_build_object('endedAt',c.ended_at,'id',c.id)from cursor_row c)end) into result;
 return result;
end;
$$;
revoke all on function public.get_activity_feed(text,uuid,timestamptz,uuid,integer) from public,anon;
grant execute on function public.get_activity_feed(text,uuid,timestamptz,uuid,integer) to authenticated;

create or replace function private.can_read_reflection_photo(object_name text)
returns boolean language sql stable security definer set search_path='' as $$
  select exists (
    select 1 from public.study_sessions s
    where s.reflection_photo_path=object_name
      and (select private.can_view_activity_session(s.id,(select auth.uid())))
  );
$$;

create or replace function public.get_visible_reflection_photo(p_session_id uuid)
returns text language sql stable security definer set search_path='' as $$
  select s.reflection_photo_path from public.study_sessions s
  where s.id=p_session_id and s.reflection_photo_path is not null
    and (select private.can_view_activity_session(s.id,(select auth.uid())));
$$;

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

create function public.get_session_likers(p_session_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
  select case when (select private.can_view_activity_session(p_session_id,(select auth.uid()))) then
    coalesce((select jsonb_agg(jsonb_build_object('displayName',p.display_name,'username',p.username::text) order by l.created_at desc)
      from public.session_loves l join public.profiles p on p.id=l.user_id where l.session_id=p_session_id),'[]'::jsonb)
  else '[]'::jsonb end;
$$;

create function public.get_notifications(p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid := (select auth.uid()); result jsonb;
begin
 if u is null then raise exception using errcode='42501',message='Authentication required'; end if;
 if p_limit not between 1 and 100 then raise exception using errcode='22023',message='Notification limit must be between 1 and 100'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',n.id,'sessionId',n.session_id,'kind',n.kind,
   'actorDisplayName',p.display_name,'actorUsername',p.username::text,'createdAt',n.created_at,'read',n.read_at is not null)
   order by n.created_at desc),'[]'::jsonb) into result
 from (select * from public.notifications where recipient_id=u order by created_at desc limit p_limit) n
 join public.profiles p on p.id=n.actor_id;
 return result;
end;
$$;

create function public.mark_notifications_read(p_notification_id uuid default null)
returns integer language plpgsql security definer set search_path='' as $$
declare u uuid := (select auth.uid()); affected integer;
begin
 if u is null then raise exception using errcode='42501',message='Authentication required'; end if;
 update public.notifications set read_at=coalesce(read_at,clock_timestamp())
 where recipient_id=u and read_at is null and (p_notification_id is null or id=p_notification_id);
 get diagnostics affected=row_count; return affected;
end;
$$;

revoke all on function public.get_session_likers(uuid), public.get_notifications(integer), public.mark_notifications_read(uuid) from public,anon;
grant execute on function public.get_session_likers(uuid), public.get_notifications(integer), public.mark_notifications_read(uuid) to authenticated;

-- Retire avatar writes and public delivery. Existing object bytes must be
-- emptied with the Storage API before the bucket itself can be deleted.
drop policy if exists "Users can upload their own avatar" on storage.objects;
drop policy if exists "Users can update their own avatar" on storage.objects;
drop policy if exists "Users can delete their own avatar" on storage.objects;
drop trigger if exists profiles_enforce_owned_avatar_path on public.profiles;
drop function if exists public.enforce_owned_avatar_path();
update public.profiles set avatar_url=null where avatar_url is not null;
update storage.buckets set public=false where id='avatars';

comment on table public.session_audience_groups is 'Normalized Circle audience for one activity session; a session is never duplicated for multi-Circle sharing.';
comment on table public.notifications is 'Durable, de-duplicated account notifications generated by activity interactions.';
