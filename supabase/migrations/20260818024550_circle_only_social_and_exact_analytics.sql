-- A completed session is private when activity_circle_id is null, otherwise it
-- is visible to exactly one Circle. Former global posts become private; former
-- multi-Circle posts retain one deterministic Circle.
alter table public.study_sessions
  add column activity_circle_id uuid references public.groups(id) on delete set null;

update public.study_sessions s
set activity_circle_id = chosen.group_id
from (
  select distinct on (sag.session_id) sag.session_id, sag.group_id
  from public.session_audience_groups sag
  join public.group_members gm
    on gm.group_id = sag.group_id
  join public.study_sessions owned
    on owned.id = sag.session_id and owned.user_id = gm.user_id
  order by sag.session_id, sag.created_at, sag.group_id
) chosen
where s.id = chosen.session_id and s.activity_audience = 'circles';

update public.study_sessions
set share_notes = activity_circle_id is not null;

create index study_sessions_activity_circle_ended_idx
  on public.study_sessions(activity_circle_id, ended_at desc)
  where activity_circle_id is not null and ended_at is not null;

drop table public.session_audience_groups;
alter table public.study_sessions drop column activity_audience;

drop function if exists public.get_notifications(integer);
drop function if exists public.mark_notifications_read(uuid);
drop table public.notifications;

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
        or (
          s.activity_circle_id is not null
          and exists (
            select 1 from public.group_members gm
            where gm.group_id = s.activity_circle_id and gm.user_id = viewer_id
          )
        )
      )
  );
$$;

drop function if exists public.update_study_session_reflection(uuid,text,smallint,boolean,text,text,uuid[]);

create function public.update_study_session_reflection(
  p_session_id uuid,
  p_notes text,
  p_rating smallint,
  p_reflection_photo_path text,
  p_activity_circle_id uuid default null
)
returns public.study_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := (select auth.uid());
  s public.study_sessions;
begin
  if u is null then raise exception using errcode='42501', message='Authentication required'; end if;
  if p_notes is not null and char_length(p_notes) > 5000 then raise exception using errcode='22001', message='Notes must be 5000 characters or fewer'; end if;
  if p_rating is not null and p_rating not between 1 and 5 then raise exception using errcode='22023', message='Rating must be between 1 and 5'; end if;
  if p_activity_circle_id is not null and not exists (
    select 1 from public.group_members gm
    where gm.group_id = p_activity_circle_id and gm.user_id = u
  ) then raise exception using errcode='42501', message='You can only share to a Circle you belong to'; end if;
  if p_reflection_photo_path is not null and (
    split_part(p_reflection_photo_path,'/',1) <> u::text
    or split_part(p_reflection_photo_path,'/',2) <> p_session_id::text
  ) then raise exception using errcode='42501', message='Reflection photo path is not owned by this session'; end if;

  update public.study_sessions
  set notes = nullif(btrim(p_notes), ''),
      rating = p_rating,
      reflection_photo_path = p_reflection_photo_path,
      activity_circle_id = p_activity_circle_id,
      share_notes = p_activity_circle_id is not null
  where id = p_session_id and user_id = u and ended_at is not null
  returning * into s;
  if not found then raise exception using errcode='P0002', message='Completed study session not found'; end if;
  return s;
end;
$$;
revoke all on function public.update_study_session_reflection(uuid,text,smallint,text,uuid) from public, anon;
grant execute on function public.update_study_session_reflection(uuid,text,smallint,text,uuid) to authenticated;

-- Compatibility for reflection edits from History: changing reflection content
-- does not silently change its existing audience.
create or replace function public.update_study_session_reflection(
  p_session_id uuid, p_notes text, p_rating smallint,
  p_share_notes boolean, p_reflection_photo_path text
)
returns public.study_sessions
language plpgsql security definer set search_path=''
as $$
declare u uuid := (select auth.uid()); s public.study_sessions;
begin
  if u is null then raise exception using errcode='42501',message='Authentication required'; end if;
  if p_notes is not null and char_length(p_notes)>5000 then raise exception using errcode='22001',message='Notes must be 5000 characters or fewer'; end if;
  if p_rating is not null and p_rating not between 1 and 5 then raise exception using errcode='22023',message='Rating must be between 1 and 5'; end if;
  update public.study_sessions set notes=nullif(btrim(p_notes),''),rating=p_rating,
    reflection_photo_path=p_reflection_photo_path,share_notes=activity_circle_id is not null
  where id=p_session_id and user_id=u and ended_at is not null returning * into s;
  if not found then raise exception using errcode='P0002',message='Completed study session not found'; end if;
  return s;
end;
$$;

create or replace function public.get_activity_feed(
  p_scope text default 'all_circles', p_group_id uuid default null,
  p_before_ended_at timestamptz default null, p_before_id uuid default null, p_limit integer default 20
)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid := (select auth.uid()); scope text := lower(btrim(p_scope)); tz text; result jsonb;
begin
 if u is null then raise exception using errcode='42501',message='Authentication required'; end if;
 if scope is null or scope not in('mine','all_circles','circle') then raise exception using errcode='22023',message='Unsupported activity scope'; end if;
 if p_limit is null or p_limit not between 1 and 50 then raise exception using errcode='22023',message='Activity limit must be between 1 and 50'; end if;
 if (p_before_ended_at is null) <> (p_before_id is null) then raise exception using errcode='22023',message='Activity cursor is incomplete'; end if;
 if scope='circle' and (p_group_id is null or not exists(select 1 from public.group_members where group_id=p_group_id and user_id=u)) then raise exception using errcode='42501',message='Circle membership required'; end if;
 select timezone into tz from public.profiles where id=u; tz := coalesce(tz,'UTC');
 with candidates as materialized (
  select s.id,s.user_id,s.ended_at,s.duration_seconds,s.rating,s.notes,s.reflection_photo_path,s.activity_circle_id,
   p.display_name,p.username::text username,coalesce(goal.name,'Study session') goal_name,
   circle.name circle_name,
   (select count(*)::int from public.session_loves l where l.session_id=s.id) love_count,
   exists(select 1 from public.session_loves l where l.session_id=s.id and l.user_id=u) is_loved
  from public.study_sessions s
  join public.profiles p on p.id=s.user_id
  left join public.study_goals goal on goal.id=s.goal_id and goal.user_id=s.user_id
  left join public.groups circle on circle.id=s.activity_circle_id
  where s.ended_at is not null and s.duration_seconds>0
    and (p_before_ended_at is null or (s.ended_at,s.id)<(p_before_ended_at,p_before_id))
    and (select private.can_view_activity_session(s.id,u))
    and (
      (scope='mine' and s.user_id=u)
      or (scope='all_circles' and s.activity_circle_id is not null)
      or (scope='circle' and s.activity_circle_id=p_group_id)
    )
  order by s.ended_at desc,s.id desc limit p_limit+1
 ), visible as (select * from candidates order by ended_at desc,id desc limit p_limit),
 cursor_row as (select ended_at,id from visible order by ended_at,id limit 1)
 select jsonb_build_object('timezone',tz,'items',coalesce((select jsonb_agg(jsonb_build_object(
  'id',v.id,'displayName',v.display_name,'username',v.username,'goalName',v.goal_name,
  'durationSeconds',v.duration_seconds,'completedAt',date_trunc('minute',v.ended_at),'rating',v.rating,
  'sharedNotes',v.notes,'reflectionPhotoPath',v.reflection_photo_path,
  'circleId',v.activity_circle_id,'circleName',v.circle_name,
  'loveCount',v.love_count,'isLoved',v.is_loved,'canLove',v.user_id<>u,'isCurrentUser',v.user_id=u
 ) order by v.ended_at desc,v.id desc) from visible v),'[]'::jsonb),
 'nextCursor',case when(select count(*) from candidates)>p_limit then(select jsonb_build_object('endedAt',c.ended_at,'id',c.id)from cursor_row c)end) into result;
 return result;
end;
$$;

create or replace function public.toggle_session_love(p_session_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare u uuid := (select auth.uid()); affected integer;
begin
  if u is null then raise exception using errcode='42501', message='Authentication required'; end if;
  if not exists(select 1 from public.study_sessions s where s.id=p_session_id and s.user_id<>u and (select private.can_view_activity_session(s.id,u))) then
    raise exception using errcode='42501', message='Session is not available to love';
  end if;
  delete from public.session_loves where session_id=p_session_id and user_id=u;
  if found then return false; end if;
  insert into public.session_loves(session_id,user_id) values(p_session_id,u) on conflict do nothing;
  get diagnostics affected = row_count;
  return affected=1;
end;
$$;

-- Range membership is based on completion time in the viewer's timezone. Every
-- aggregate uses the stored duration_seconds unchanged, so daily, goal, total,
-- and leaderboard values cannot drift from one another.
create or replace function public.get_study_analytics(p_scope text default 'mine',p_group_id uuid default null,p_range text default '30d',p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=(select auth.uid()); tz text; today date; start_date date; start_at timestamptz; end_at timestamptz; result jsonb;
begin
 if u is null then raise exception using errcode='42501',message='Authentication required'; end if;
 p_scope:=lower(btrim(p_scope)); p_range:=lower(btrim(p_range));
 if p_scope not in('mine','circle') then raise exception using errcode='22023',message='Unsupported analytics scope'; end if;
 if p_range not in('7d','30d','3m','6m','1y','all') then raise exception using errcode='22023',message='Unsupported analytics timeframe'; end if;
 if p_limit is null or p_limit not between 1 and 100 then raise exception using errcode='22023',message='Leaderboard limit must be between 1 and 100'; end if;
 if p_scope='circle' and(p_group_id is null or not exists(select 1 from public.group_members m where m.group_id=p_group_id and m.user_id=u)) then raise exception using errcode='42501',message='Circle membership required'; end if;
 select coalesce(p.timezone,'UTC') into tz from public.profiles p where p.id=u; tz:=coalesce(tz,'UTC'); today:=(clock_timestamp() at time zone tz)::date;
 start_date:=case p_range when'7d'then today-6 when'30d'then today-29 when'3m'then(today-interval'3 months')::date+1 when'6m'then(today-interval'6 months')::date+1 when'1y'then(today-interval'1 year')::date+1 else null end;
 start_at:=case when start_date is null then'-infinity'::timestamptz else start_date::timestamp at time zone tz end; end_at:=(today+1)::timestamp at time zone tz;
 with population as materialized (
  select p.id user_id,p.display_name,p.username::text username,p.avatar_url from public.profiles p
  where (p_scope='mine'and p.id=u) or (p_scope='circle'and exists(select 1 from public.group_members m where m.group_id=p_group_id and m.user_id=p.id))
 ), completed as materialized (
  select s.id,s.user_id,s.goal_id,s.ended_at,s.duration_seconds from public.study_sessions s join population p on p.user_id=s.user_id
  where s.ended_at is not null and s.duration_seconds>0 and s.ended_at>=start_at and s.ended_at<end_at
 ), first_day as (select coalesce(start_date,least(today,min((c.ended_at at time zone tz)::date)),today)d from completed c),
 days as(select generate_series((select d from first_day),today,interval'1 day')::date d),
 daily as (select d.d,coalesce(sum(c.duration_seconds),0)::bigint seconds from days d left join completed c on (c.ended_at at time zone tz)::date=d.d group by d.d),
 named_goals as(select c.user_id,coalesce(g.name,'General study')name,c.duration_seconds::bigint seconds from completed c left join public.study_goals g on g.id=c.goal_id and g.user_id=c.user_id),
 goal_groups as(select name,sum(seconds)::bigint seconds,count(distinct user_id)::int contributors from named_goals group by name),
 safe_goals as(select case when p_scope='mine'or contributors>=2 then name else'Other study'end name,sum(seconds)::bigint seconds from goal_groups group by case when p_scope='mine'or contributors>=2 then name else'Other study'end),
 totals as(select p.user_id,p.display_name,p.username,p.avatar_url,coalesce(sum(c.duration_seconds),0)::bigint seconds from population p left join completed c on c.user_id=p.user_id group by p.user_id,p.display_name,p.username,p.avatar_url),
 ranked as(select t.*,case when t.seconds>0 then dense_rank()over(order by t.seconds desc)::bigint end rank from totals t),
 visible as(select*from ranked order by(rank is null),rank,lower(username),user_id limit p_limit)
 select jsonb_build_object('scope',p_scope,'range',p_range,'timezone',tz,'totalSeconds',(select coalesce(sum(duration_seconds),0)::bigint from completed),
  'daily',(select coalesce(jsonb_agg(jsonb_build_object('date',d,'seconds',seconds)order by d),'[]'::jsonb)from daily),
  'goals',(select coalesce(jsonb_agg(jsonb_build_object('name',name,'seconds',seconds)order by seconds desc,name),'[]'::jsonb)from safe_goals where seconds>0),
  'leaderboard',case when p_scope='mine'then'[]'::jsonb else(select coalesce(jsonb_agg(jsonb_build_object('displayName',display_name,'username',username,'avatarPath',avatar_url,'durationSeconds',seconds,'rank',rank,'isCurrentUser',user_id=u)order by(rank is null),rank,lower(username)),'[]'::jsonb)from visible)end
 ) into result;
 return result;
end;
$$;

drop function if exists public.get_application_leaderboard(text,integer);

comment on column public.study_sessions.activity_circle_id is
  'The single Circle allowed to view this completed activity; null means Only Me.';
