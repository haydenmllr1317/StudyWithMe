alter table public.study_sessions
  add column source text not null default 'timer'
  check (source in ('timer', 'manual'));

create function public.create_manual_study_session(
  p_local_date date,
  p_local_time time,
  p_duration_minutes integer,
  p_goal_id uuid default null,
  p_rating smallint default null,
  p_notes text default null,
  p_activity_circle_id uuid default null
)
returns public.study_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  u uuid := (select auth.uid());
  tz text;
  start_at timestamptz;
  finish_at timestamptz;
  result public.study_sessions;
begin
  if u is null then raise exception using errcode='42501', message='Authentication required'; end if;
  if p_local_date is null or p_local_time is null then raise exception using errcode='22023', message='Choose a valid date and start time'; end if;
  if p_duration_minutes is null or p_duration_minutes < 1 or p_duration_minutes > 1440 then
    raise exception using errcode='22023', message='Duration must be between 1 minute and 24 hours';
  end if;
  if p_rating is not null and p_rating not between 1 and 5 then raise exception using errcode='22023', message='Rating must be between 1 and 5'; end if;
  if p_notes is not null and char_length(p_notes) > 5000 then raise exception using errcode='22001', message='Notes must be 5000 characters or fewer'; end if;
  if p_goal_id is not null and not exists(select 1 from public.study_goals g where g.id=p_goal_id and g.user_id=u) then
    raise exception using errcode='42501', message='You can only use one of your own goals';
  end if;
  if p_activity_circle_id is not null and not exists(select 1 from public.group_members gm where gm.group_id=p_activity_circle_id and gm.user_id=u) then
    raise exception using errcode='42501', message='You can only share to a Circle you belong to';
  end if;
  select coalesce(p.timezone,'UTC') into tz from public.profiles p where p.id=u;
  start_at := (p_local_date + p_local_time) at time zone tz;
  finish_at := start_at + make_interval(mins => p_duration_minutes);
  if start_at > clock_timestamp() then raise exception using errcode='22023', message='A past session cannot start in the future'; end if;
  if finish_at > clock_timestamp() + interval '1 minute' then raise exception using errcode='22023', message='A past session cannot end in the future'; end if;

  insert into public.study_sessions(
    user_id,goal_id,started_at,ended_at,duration_seconds,session_type,notes,rating,
    activity_circle_id,share_notes,source,paused_seconds
  ) values (
    u,p_goal_id,start_at,finish_at,p_duration_minutes*60,'normal',nullif(btrim(p_notes),''),p_rating,
    p_activity_circle_id,p_activity_circle_id is not null,'manual',0
  ) returning * into result;
  return result;
end;
$$;
revoke all on function public.create_manual_study_session(date,time,integer,uuid,smallint,text,uuid) from public,anon;
grant execute on function public.create_manual_study_session(date,time,integer,uuid,smallint,text,uuid) to authenticated;

create function public.get_circle_member_analytics(
  p_group_id uuid,
  p_range text default '30d',
  p_limit integer default 50
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  u uuid := (select auth.uid());
  tz text;
  today date;
  start_date date;
  start_at timestamptz;
  end_at timestamptz;
  result jsonb;
begin
  if u is null then raise exception using errcode='42501',message='Authentication required'; end if;
  p_range := lower(btrim(p_range));
  if p_range not in('7d','30d','3m','6m','1y','all') then raise exception using errcode='22023',message='Unsupported analytics timeframe'; end if;
  if p_limit is null or p_limit not between 1 and 100 then raise exception using errcode='22023',message='Leaderboard limit must be between 1 and 100'; end if;
  if not exists(select 1 from public.group_members gm where gm.group_id=p_group_id and gm.user_id=u) then
    raise exception using errcode='42501',message='Circle membership required';
  end if;
  select coalesce(p.timezone,'UTC') into tz from public.profiles p where p.id=u;
  today := (clock_timestamp() at time zone tz)::date;
  start_date := case p_range
    when '7d' then today-6 when '30d' then today-29
    when '3m' then (today-interval '3 months')::date+1
    when '6m' then (today-interval '6 months')::date+1
    when '1y' then (today-interval '1 year')::date+1 else null end;
  start_at := case when start_date is null then '-infinity'::timestamptz else start_date::timestamp at time zone tz end;
  end_at := (today+1)::timestamp at time zone tz;

  with members as materialized (
    select p.id user_id,p.display_name,p.username::text username,p.avatar_url
    from public.group_members gm join public.profiles p on p.id=gm.user_id
    where gm.group_id=p_group_id
  ), completed as materialized (
    select s.id,s.user_id,s.ended_at,s.duration_seconds
    from public.study_sessions s join members m on m.user_id=s.user_id
    where s.ended_at is not null and s.duration_seconds>0
      and s.ended_at>=start_at and s.ended_at<end_at
  ), first_day as (
    select coalesce(start_date,least(today,min((c.ended_at at time zone tz)::date)),today) d from completed c
  ), days as (
    select generate_series((select d from first_day),today,interval '1 day')::date d
  ), member_days as (
    select m.user_id,d.d,coalesce(sum(c.duration_seconds),0)::bigint seconds
    from members m cross join days d
    left join completed c on c.user_id=m.user_id and (c.ended_at at time zone tz)::date=d.d
    group by m.user_id,d.d
  ), totals as (
    select m.user_id,m.display_name,m.username,m.avatar_url,coalesce(sum(c.duration_seconds),0)::bigint seconds
    from members m left join completed c on c.user_id=m.user_id
    group by m.user_id,m.display_name,m.username,m.avatar_url
  ), ranked as (
    select t.*,case when t.seconds>0 then dense_rank() over(order by t.seconds desc)::bigint end rank
    from totals t
  ), visible as (
    select * from ranked order by (rank is null),rank,lower(username),user_id limit p_limit
  )
  select jsonb_build_object(
    'scope','circle','range',p_range,'timezone',tz,
    'totalSeconds',(select coalesce(sum(duration_seconds),0)::bigint from completed),
    'daily',(select coalesce(jsonb_agg(jsonb_build_object('date',d.d,'seconds',
      (select coalesce(sum(md.seconds),0)::bigint from member_days md where md.d=d.d)) order by d.d),'[]'::jsonb) from days d),
    'goals','[]'::jsonb,
    'leaderboard',(select coalesce(jsonb_agg(jsonb_build_object(
      'userId',v.user_id,'displayName',v.display_name,'username',v.username,'avatarPath',v.avatar_url,
      'durationSeconds',v.seconds,'rank',v.rank,'isCurrentUser',v.user_id=u
    ) order by (v.rank is null),v.rank,lower(v.username)),'[]'::jsonb) from visible v),
    'members',(select coalesce(jsonb_agg(jsonb_build_object(
      'userId',v.user_id,'displayName',v.display_name,'username',v.username,
      'durationSeconds',v.seconds,'isCurrentUser',v.user_id=u,
      'daily',(select coalesce(jsonb_agg(jsonb_build_object('date',md.d,'seconds',md.seconds) order by md.d),'[]'::jsonb)
        from member_days md where md.user_id=v.user_id)
    ) order by (v.rank is null),v.rank,lower(v.username)),'[]'::jsonb) from visible v)
  ) into result;
  return result;
end;
$$;
revoke all on function public.get_circle_member_analytics(uuid,text,integer) from public,anon;
grant execute on function public.get_circle_member_analytics(uuid,text,integer) to authenticated;

comment on column public.study_sessions.source is 'How the canonical completed session was recorded: timer or manual.';
comment on function public.get_circle_member_analytics(uuid,text,integer) is 'Membership-authorized Circle totals, ranking, and zero-filled member daily series from one completed-session set.';
