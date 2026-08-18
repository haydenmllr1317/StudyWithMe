create or replace function public.get_circle_member_analytics(
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
    where s.activity_circle_id=p_group_id and s.ended_at is not null and s.duration_seconds>0
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
