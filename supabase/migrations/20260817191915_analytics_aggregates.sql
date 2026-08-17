create or replace function public.get_study_analytics(
  p_scope text default 'mine',
  p_group_id uuid default null,
  p_range text default '30d',
  p_limit integer default 50
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_timezone text;
  v_today date;
  v_start_date date;
  v_start_at timestamptz;
  v_end_at timestamptz;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  p_scope := lower(btrim(p_scope));
  p_range := lower(btrim(p_range));
  if p_scope not in ('mine', 'everyone', 'circle') then
    raise exception using errcode = '22023', message = 'Unsupported analytics scope';
  end if;
  if p_range not in ('7d', '30d', '3m', '6m', '1y', 'all') then
    raise exception using errcode = '22023', message = 'Unsupported analytics timeframe';
  end if;
  if p_limit is null or p_limit not between 1 and 100 then
    raise exception using errcode = '22023', message = 'Leaderboard limit must be between 1 and 100';
  end if;
  if p_scope = 'circle' and (
    p_group_id is null or not exists (
      select 1 from public.group_members m
      where m.group_id = p_group_id and m.user_id = v_user_id
    )
  ) then
    raise exception using errcode = '42501', message = 'Circle membership required';
  end if;

  select coalesce(p.timezone, 'UTC') into v_timezone
  from public.profiles p where p.id = v_user_id;
  v_timezone := coalesce(v_timezone, 'UTC');
  v_today := (clock_timestamp() at time zone v_timezone)::date;
  v_start_date := case p_range
    when '7d' then v_today - 6
    when '30d' then v_today - 29
    when '3m' then (v_today - interval '3 months')::date + 1
    when '6m' then (v_today - interval '6 months')::date + 1
    when '1y' then (v_today - interval '1 year')::date + 1
    else null
  end;
  v_start_at := case when v_start_date is null then '-infinity'::timestamptz else v_start_date::timestamp at time zone v_timezone end;
  v_end_at := (v_today + 1)::timestamp at time zone v_timezone;

  with population as materialized (
    select p.id as user_id, p.display_name, p.username::text as username
    from public.profiles p
    where (p_scope = 'mine' and p.id = v_user_id)
       or (p_scope = 'everyone')
       or (p_scope = 'circle' and exists (
         select 1 from public.group_members m where m.group_id = p_group_id and m.user_id = p.id
       ))
  ), completed as materialized (
    select s.user_id, s.goal_id, s.started_at, s.ended_at, s.duration_seconds
    from public.study_sessions s
    join population p on p.user_id = s.user_id
    where s.ended_at is not null and s.duration_seconds > 0
      and s.started_at < v_end_at and s.ended_at > v_start_at
  ), first_day as (
    select coalesce(v_start_date, least(v_today, min((c.started_at at time zone v_timezone)::date)), v_today) as d
    from completed c
  ), days as (
    select generate_series((select d from first_day), v_today, interval '1 day')::date as d
  ), daily as (
    select d.d,
      coalesce(sum(round(c.duration_seconds * greatest(0, extract(epoch from (
        least(c.ended_at, (d.d + 1)::timestamp at time zone v_timezone)
        - greatest(c.started_at, d.d::timestamp at time zone v_timezone)
      ))) / greatest(1, extract(epoch from (c.ended_at - c.started_at))))), 0)::bigint as seconds
    from days d
    left join completed c
      on c.started_at < (d.d + 1)::timestamp at time zone v_timezone
     and c.ended_at > d.d::timestamp at time zone v_timezone
    group by d.d
  ), named_goals as (
    select c.user_id, coalesce(g.name, 'General study') as name,
      round(c.duration_seconds * greatest(0, extract(epoch from (least(c.ended_at, v_end_at) - greatest(c.started_at, v_start_at))))
        / greatest(1, extract(epoch from (c.ended_at - c.started_at))))::bigint as seconds
    from completed c
    left join public.study_goals g on g.id = c.goal_id and g.user_id = c.user_id
  ), goal_groups as (
    select name, sum(seconds)::bigint as seconds, count(distinct user_id)::integer as contributors
    from named_goals group by name
  ), safe_goals as (
    select case when p_scope = 'mine' or contributors >= 2 then name else 'Other study' end as name,
      sum(seconds)::bigint as seconds
    from goal_groups
    group by case when p_scope = 'mine' or contributors >= 2 then name else 'Other study' end
  ), totals as (
    select p.user_id, p.display_name, p.username,
      coalesce(sum(round(c.duration_seconds * greatest(0, extract(epoch from (
        least(c.ended_at, v_end_at) - greatest(c.started_at, v_start_at)
      ))) / greatest(1, extract(epoch from (c.ended_at - c.started_at))))), 0)::bigint as seconds
    from population p left join completed c on c.user_id = p.user_id
    group by p.user_id, p.display_name, p.username
  ), ranked as (
    select t.*, case when t.seconds > 0 then dense_rank() over (order by t.seconds desc)::bigint end as rank
    from totals t
  ), visible as (
    select * from ranked order by (rank is null), rank, lower(username), user_id limit p_limit
  )
  select jsonb_build_object(
    'scope', p_scope,
    'range', p_range,
    'timezone', v_timezone,
    'totalSeconds', (select coalesce(sum(seconds), 0)::bigint from safe_goals),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('date', d, 'seconds', seconds) order by d), '[]'::jsonb) from daily),
    'goals', (select coalesce(jsonb_agg(jsonb_build_object('name', name, 'seconds', seconds) order by seconds desc, name), '[]'::jsonb) from safe_goals where seconds > 0),
    'leaderboard', case
      when p_scope = 'mine' then '[]'::jsonb
      else (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'displayName', display_name,
              'username', username,
              'durationSeconds', seconds,
              'rank', rank,
              'isCurrentUser', user_id = v_user_id
            ) order by (rank is null), rank, lower(username)
          ),
          '[]'::jsonb
        )
        from visible
      )
    end
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_study_analytics(text, uuid, text, integer) from public, anon;
grant execute on function public.get_study_analytics(text, uuid, text, integer) to authenticated;

comment on function public.get_study_analytics(text, uuid, text, integer) is
'Returns timezone-aware daily and goal aggregates. Social goal labels require at least two contributors; suppressed labels are rolled into Other study. No raw sessions or timestamps are returned.';
